// Every old inventory list path, mounted on the redirect the router gives it,
// hands <Navigate replace> the workspace URL with the query carried through.
//
// <Navigate> navigates in an effect, which never runs under SSR, so it is
// stubbed to print where it was told to go. The route table itself is pinned
// by walking MainRoutes' children.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => <div data-to={to} data-replace={String(Boolean(replace))} />
  };
});

import { LEGACY_INVENTORY_PATHS } from '../legacyRoutes';
import LegacyInventoryRedirect from './LegacyInventoryRedirect';

const land = (url: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        {LEGACY_INVENTORY_PATHS.map((path) => (
          <Route key={path} path={path} element={<LegacyInventoryRedirect />} />
        ))}
      </Routes>
    </MemoryRouter>
  );

describe('LegacyInventoryRedirect', () => {
  it('lands /inventory/stock-counts/new?x=1 on the Counts tab with new=1 and the query carried', () => {
    expect(land('/inventory/stock-counts/new?x=1')).toBe(
      '<div data-to="/inventory?tab=counts&amp;new=1&amp;x=1" data-replace="true"></div>'
    );
  });

  it('lands every legacy path somewhere in the workspace', () => {
    LEGACY_INVENTORY_PATHS.forEach((path) => {
      expect(land(path)).toMatch(/^<div data-to="\/inventory\?tab=[a-z]+[^"]*" data-replace="true"><\/div>$/);
    });
  });

  // MainRoutes pulls in the whole app's eager imports (~2.5 s alone), hence the timeout.
  it('MainRoutes mounts this redirect on exactly the legacy paths', { timeout: 30_000 }, async () => {
    const { default: MainRoutes } = await import('routes/MainRoutes');
    type RouteNode = { path?: string; element?: { type?: unknown }; children?: RouteNode[] };
    const walk = (nodes: RouteNode[] = []): RouteNode[] => nodes.flatMap((n) => [n, ...walk(n.children)]);
    const redirected = walk(MainRoutes.children as RouteNode[])
      .filter((c) => c.element?.type === LegacyInventoryRedirect)
      .map((c) => c.path);
    expect(redirected).toEqual([...LEGACY_INVENTORY_PATHS]);
  });
});
