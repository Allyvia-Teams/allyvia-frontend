// The Buying tab's view toggle: the owner reads "Vendors", the URL value stays "suppliers"
// (owner trust T5: labels change, ?view=suppliers and its legacy redirect do not).

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('store', () => ({
  useSelector: (select: (state: unknown) => unknown) => select({ auth: { currentRole: { role_type: 'admin' } } })
}));

import BuyingTab from './BuyingTab';

const render = (view: string | null) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <BuyingTab view={view} />
    </MemoryRouter>
  );

const text = (html: string): string => html.replace(/<style[^>]*>[^<]*<\/style>/g, '').replace(/<[^>]+>/g, '');

describe('BuyingTab view toggle', () => {
  it('labels the vendors view "Vendors" and links it by the unchanged value', () => {
    const html = render('suppliers');
    const links = html.match(/<a[^>]*>(?:(?!<\/a>).)*<\/a>/g) ?? [];
    const vendors = links.find((a) => /view=suppliers/.test(a));
    expect(vendors).toBeDefined();
    expect(text(vendors as string)).toBe('Vendors');
    expect(html).not.toContain('>Suppliers<');
  });

  it('selects the Vendors link for ?view=suppliers', () => {
    const links = render('suppliers').match(/<a[^>]*>(?:(?!<\/a>).)*<\/a>/g) ?? [];
    const pressed = links.filter((a) => a.includes('aria-pressed="true"'));
    expect(pressed.map(text)).toEqual(['Vendors']);
  });
});
