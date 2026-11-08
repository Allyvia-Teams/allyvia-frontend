// views/inventory/legacyRoutes.ts
//
// Decides where every old inventory route lands in the one-page workspace.
// Pure table + lookup: the router (LegacyInventoryRedirect) mounts it, this
// file only answers "is this pathname legacy, and what is its new URL?".
// Query keys the table does not consume are carried through unchanged, in
// their original order, after the table's own params. No React, no axios.

import { INSIGHTS_TAB_SLUGS, insightsTabFromParam } from './insights';
import { inventoryHref, withQuery } from './tabs';

type Target = (params: URLSearchParams) => { href: string; consumed?: string[] };

const fixed =
  (tab: Parameters<typeof inventoryHref>[0], view?: string, extra?: Record<string, string>): Target =>
  () => ({ href: inventoryHref(tab, view, extra) });

const insightsTarget: Target = (params) => {
  const raw = params.get('tab');
  const index = insightsTabFromParam(raw);
  const consumed = ['tab'];
  if (raw === null || raw === '' || index === null) {
    // Absent -> Recommendations (Today); unknown -> Reports default view.
    return { href: inventoryHref(raw === null || raw === '' ? 'today' : 'reports'), consumed };
  }
  const slug = INSIGHTS_TAB_SLUGS[index];
  return { href: slug === 'recommendations' ? inventoryHref('today') : inventoryHref('reports', slug), consumed };
};

const TABLE: ReadonlyArray<readonly [string, Target]> = [
  ['/inventory/styles', fixed('stock')],
  ['/inventory/reorder', fixed('today')],
  ['/inventory/insights', insightsTarget],
  ['/inventory/purchase-orders', fixed('buying')],
  ['/inventory/suppliers', fixed('buying', 'suppliers')],
  ['/inventory/transfers', fixed('counts', 'transfers')],
  ['/inventory/transfers/new', fixed('counts', 'transfers', { new: '1' })],
  ['/inventory/stock-counts', fixed('counts')],
  ['/inventory/stock-counts/new', fixed('counts', undefined, { new: '1' })],
  ['/inventory/quickbooks', fixed('reports', 'quickbooks')]
];

export const LEGACY_INVENTORY_PATHS: readonly string[] = TABLE.map(([from]) => from);

const ROWS = new Map(TABLE);

/** The new URL for a legacy inventory path, or null when the path is not legacy. */
export const legacyInventoryTarget = (pathname: string, search: string): string | null => {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const row = ROWS.get(path);
  if (!row) return null;

  const incoming = new URLSearchParams(search);
  const { href, consumed = [] } = row(incoming);
  const carried = new URLSearchParams();
  incoming.forEach((value, key) => {
    if (!consumed.includes(key)) carried.append(key, value);
  });
  return withQuery(href, carried);
};
