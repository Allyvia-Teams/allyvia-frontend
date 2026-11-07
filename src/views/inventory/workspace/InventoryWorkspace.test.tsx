// The Inventory workspace, rendered statically: the URL picks the tab body,
// the pill row marks the selected tab and carries Today's and Buying's counts,
// and the header's buttons follow the tab (and the role, for Plan).
//
// Tab bodies are stubbed: each mounts a whole old page, which is not what this
// test is about. Buying's count is seeded into the query cache under the
// workspace's key, because effects (and so fetches) never run under SSR.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('utils/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const role = vi.hoisted(() => ({ type: 'admin' as string | undefined }));
vi.mock('store', () => ({
  useSelector: (select: (state: unknown) => unknown) => select({ auth: { currentRole: { role_type: role.type } } })
}));

vi.mock('ui-component/agent/useSectorRecommendations', () => ({
  useSectorRecommendations: () => ({
    recommendations: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    ongoing: [],
    isLoading: false,
    isError: false
  })
}));

const orders = [
  { id: 'p1', status: 'submitted' },
  { id: 'p2', status: 'submitted' },
  { id: 'p3', status: 'draft' }
];
vi.mock('api/inventoryPurchasing.api', () => ({ listPurchaseOrders: vi.fn(async () => orders) }));

vi.mock('./TodayTab', () => ({ default: () => <div data-tab="today" /> }));
vi.mock('./StockTab', () => ({ default: () => <div data-tab="stock" /> }));
vi.mock('./BuyingTab', () => ({ default: () => <div data-tab="buying" /> }));
vi.mock('./CountsTab', () => ({ default: () => <div data-tab="counts" /> }));
vi.mock('./ReportsTab', () => ({ default: () => <div data-tab="reports" /> }));
vi.mock('views/inventory/NewStyleDialog', () => ({ default: () => null }));

import InventoryWorkspace from './InventoryWorkspace';

const render = (url: string) => {
  const client = new QueryClient();
  client.setQueryData(['inventory-workspace', 'po-attention'], orders);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <InventoryWorkspace />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/** Visible text: tags and SSR-inlined emotion <style> blocks removed. */
const text = (html: string): string => html.replace(/<style[^>]*>[^<]*<\/style>/g, '').replace(/<[^>]+>/g, '');

/** The <a> pill whose text starts with the label, as one string. */
const pill = (html: string, label: string): string => {
  const pills = html.match(/<a[^>]*>(?:(?!<\/a>).)*<\/a>/g) ?? [];
  return pills.find((a) => text(a).startsWith(label)) ?? '';
};

beforeEach(() => {
  role.type = 'admin';
});

describe('InventoryWorkspace', () => {
  it('opens on Today: the Today body, its pill current, with the count 3', () => {
    const html = render('/inventory');
    expect(html).toContain('data-tab="today"');
    expect(html).toContain('aria-label="Inventory sections"');
    const today = pill(html, 'Today');
    expect(today).toContain('aria-current="page"');
    expect(text(today)).toBe('Today3');
    expect(pill(html, 'Buying')).not.toContain('aria-current');
  });

  it('?tab=buying&view=suppliers renders Buying, and the pill reads Buying 2', () => {
    const html = render('/inventory?tab=buying&view=suppliers');
    expect(html).toContain('data-tab="buying"');
    expect(html).not.toContain('data-tab="today"');
    const buying = pill(html, 'Buying');
    expect(buying).toContain('aria-current="page"');
    expect(text(buying)).toBe('Buying2');
  });

  it('an unknown tab falls back to Today', () => {
    const html = render('/inventory?tab=nope');
    expect(html).toContain('data-tab="today"');
    expect(pill(html, 'Today')).toContain('aria-current="page"');
  });

  it('the header buttons follow the tab', () => {
    const today = render('/inventory');
    expect(today).toContain('Receive delivery');
    expect(today).toContain('New style');
    expect(today).toContain('placeholder="Scan a tag or type a style, SKU or barcode"');

    const counts = render('/inventory?tab=counts');
    expect(counts).toContain('Start a count');
    expect(counts).toContain('New transfer');
    expect(counts).not.toContain('Receive delivery');
  });

  it('shows New plan from a line sheet to an admin, never to a member', () => {
    expect(render('/inventory?tab=buying')).toContain('New plan from a line sheet');
    role.type = 'member';
    const html = render('/inventory?tab=buying');
    expect(html).toContain('New purchase order');
    expect(html).not.toContain('New plan from a line sheet');
  });
});
