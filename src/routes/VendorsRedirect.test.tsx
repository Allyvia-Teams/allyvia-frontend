// /vendors hands <Navigate replace> the Bills and payees URL with the query string carried.
// <Navigate> navigates in an effect, which never runs under SSR, so it is stubbed to print its target.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => <div data-to={to} data-replace={String(Boolean(replace))} />
  };
});

import VendorsRedirect from './VendorsRedirect';

const land = (url: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/vendors" element={<VendorsRedirect />} />
      </Routes>
    </MemoryRouter>
  );

describe('VendorsRedirect', () => {
  it('lands /vendors on Bills and payees', () => {
    expect(land('/vendors')).toBe('<div data-to="/finance/payees" data-replace="true"></div>');
  });

  it('keeps the query string', () => {
    expect(land('/vendors?search=acme&page=2')).toBe('<div data-to="/finance/payees?search=acme&amp;page=2" data-replace="true"></div>');
  });

  // MainRoutes pulls in the whole app's eager imports (~2.5 s alone), hence the timeout.
  it('MainRoutes mounts the redirect on /vendors alone and a page on /finance/payees', { timeout: 30_000 }, async () => {
    const { default: MainRoutes } = await import('routes/MainRoutes');
    type RouteNode = { path?: string; element?: { type?: unknown }; children?: RouteNode[] };
    const walk = (nodes: RouteNode[] = []): RouteNode[] => nodes.flatMap((n) => [n, ...walk(n.children)]);
    const all = walk(MainRoutes.children as RouteNode[]);
    expect(all.filter((c) => c.element?.type === VendorsRedirect).map((c) => c.path)).toEqual(['/vendors']);
    const payees = all.filter((c) => c.path === '/finance/payees');
    expect(payees).toHaveLength(1);
    expect(payees[0].element?.type).not.toBe(VendorsRedirect);
  });
});
