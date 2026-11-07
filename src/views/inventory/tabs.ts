// views/inventory/tabs.ts
//
// The Inventory workspace is one page at /inventory whose state is the URL:
//   ?tab=<today|stock|buying|counts|reports>&view=<sub-view>&new=1&q=<search>
// This seam decides what those params mean, so the tab row, the redirects and
// every deep link in the app agree. It also owns the one-line subtitle under
// each tab and the count rule for the Buying badge. No React, no axios.

import { INSIGHTS_TAB_SLUGS } from './insights';

export const INVENTORY_PATH = '/inventory';

export const INVENTORY_TABS = ['today', 'stock', 'buying', 'counts', 'reports'] as const;
export type InventoryTab = (typeof INVENTORY_TABS)[number];

export const TAB_LABELS: Record<InventoryTab, string> = {
  today: 'Today',
  stock: 'Stock',
  buying: 'Buying',
  counts: 'Counts & transfers',
  reports: 'Reports'
};

/** Reports views: every insights slug except Recommendations (that is Today), plus QuickBooks. */
export const REPORT_VIEWS = [...INSIGHTS_TAB_SLUGS.filter((slug) => slug !== 'recommendations'), 'quickbooks'] as const;

export const VIEWS_BY_TAB: Record<InventoryTab, readonly string[]> = {
  today: [],
  stock: ['styles', 'items'],
  buying: ['orders', 'plan', 'suppliers'],
  counts: ['counts', 'transfers'],
  reports: REPORT_VIEWS
};

export const DEFAULT_VIEW: Record<InventoryTab, string | null> = {
  today: null,
  stock: 'styles',
  buying: 'orders',
  counts: 'counts',
  reports: 'sell-through'
};

export interface WorkspaceParams {
  tab: InventoryTab;
  view: string | null;
  creating: boolean;
  query: string;
}

const asTab = (raw: string | null): InventoryTab | null => {
  const t = (raw ?? '').trim().toLowerCase();
  return (INVENTORY_TABS as readonly string[]).includes(t) ? (t as InventoryTab) : null;
};

export const readWorkspaceParams = (search: URLSearchParams): WorkspaceParams => {
  const rawTab = search.get('tab');
  // A bare global-search link (?itemId=12) carries no tab: it means Stock items.
  const bareItem = (rawTab === null || rawTab === '') && !!search.get('itemId');
  const tab: InventoryTab = bareItem ? 'stock' : (asTab(rawTab) ?? 'today');

  const wanted = (search.get('view') ?? '').trim().toLowerCase();
  const allowed = VIEWS_BY_TAB[tab];
  let view: string | null = allowed.includes(wanted) ? wanted : DEFAULT_VIEW[tab];
  if (bareItem && !allowed.includes(wanted)) view = 'items';

  return {
    tab,
    view,
    creating: search.get('new') === '1',
    query: (search.get('q') ?? '').trim()
  };
};

export const inventoryHref = (tab: InventoryTab, view?: string | null, extra?: Record<string, string>): string => {
  const p = new URLSearchParams();
  p.set('tab', tab);
  if (view) p.set('view', view);
  for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
  return `${INVENTORY_PATH}?${p.toString()}`;
};

export const withQuery = (base: string, params: URLSearchParams | Record<string, string>): string => {
  const qs = (params instanceof URLSearchParams ? params : new URLSearchParams(params)).toString();
  if (!qs) return base;
  return `${base}${base.includes('?') ? '&' : '?'}${qs}`;
};

const PLAIN_SUBTITLE: Record<Exclude<InventoryTab, 'today'>, string> = {
  stock: 'Every style and item, as of now',
  buying: 'Orders, season plans and suppliers',
  counts: 'Stock counts and moves between stores',
  reports: 'How stock is selling, ageing and moving'
};

export const tabSubtitle = (tab: InventoryTab, counts: { today?: number | null; refreshedAt?: string | null }): string => {
  if (tab !== 'today') return PLAIN_SUBTITLE[tab];
  const clauses: string[] = [];
  if (counts.today !== null && counts.today !== undefined) {
    clauses.push(counts.today === 1 ? '1 thing to do' : `${counts.today} things to do`);
  }
  if (counts.refreshedAt) clauses.push(`suggestions refreshed today at ${counts.refreshedAt}`);
  return clauses.join(' · ');
};

export const buyingAttentionCount = (orders: ReadonlyArray<{ status: string }>): number =>
  orders.filter((o) => o.status === 'submitted' || o.status === 'partially_received').length;
