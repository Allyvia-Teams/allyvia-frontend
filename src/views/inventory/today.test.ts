// Today's rules: which band an agent row sits in (joined to the reorder inbox by
// suggestion id), the supplier bundle line under Order now, the card's primary
// action override, the five health tiles and the arriving-this-week count.

import { describe, expect, it, vi } from 'vitest';

import type { OnOrderResponse, PurchaseOrder } from 'api/inventoryPurchasing.api';
import type { InventorySummary } from 'types/analytics';
import { pendingRec } from 'ui-component/agent/recommendationFixtures';

import { describeCreatedOrders, type ReorderSuggestion } from './reorder';
import {
  arrivingThisWeek,
  BAND_LABELS,
  bandFor,
  bandRows,
  bundleLine,
  draftPurchaseOrder,
  healthTiles,
  primaryActionFor,
  supplierBundles,
  todayRefreshedAt
} from './today';

const S_CRIT = '11111111-1111-4111-8111-111111111111';
const S_WARN = '22222222-2222-4222-8222-222222222222';
const S_NOSUP = '33333333-3333-4333-8333-333333333333';
const PLAN = '44444444-4444-4444-8444-444444444444';

const reorderSignal = (suggestionId: string) => ({ origin: 'inventory_reorder', category: 'restock', suggestion_id: suggestionId });

const rows = {
  critical: pendingRec({ id: 'r-crit', rec_type: 'reorder', signal_sources: reorderSignal(S_CRIT), generated_at: '2026-11-07T07:02:00Z' }),
  warning: pendingRec({ id: 'r-warn', rec_type: 'reorder', signal_sources: reorderSignal(S_WARN), generated_at: '2026-11-07T06:00:00Z' }),
  noSupplier: pendingRec({ id: 'r-nosup', rec_type: 'reorder', signal_sources: reorderSignal(S_NOSUP) }),
  transfer: pendingRec({ id: 'r-xfer', rec_type: 'stock_transfer', signal_sources: {} }),
  markdown: pendingRec({ id: 'r-mark', rec_type: 'overstock_markdown', signal_sources: {} }),
  plan: pendingRec({ id: 'r-plan', rec_type: null, signal_sources: { origin: 'buying', kind: 'buy_plan_ready', plan_id: PLAN } })
};

const suggestion = (overrides: Partial<ReorderSuggestion>): ReorderSuggestion => ({
  id: S_CRIT,
  status: 'suggested',
  name: 'Linen dress',
  location_id: 'loc',
  location_name: 'Downtown',
  supplier_id: 's1',
  supplier_name: 'Northwind',
  forecast_stockout_date: '2026-11-09',
  days_until_stockout: 2,
  lead_time_days: 7,
  suggested_qty: 12,
  ...overrides
});

const inbox: ReorderSuggestion[] = [
  suggestion({ id: S_CRIT }),
  suggestion({ id: S_WARN, name: 'Cami', days_until_stockout: 10, lead_time_days: 7 }),
  suggestion({ id: S_NOSUP, name: 'Belt', supplier_id: null, supplier_name: null, days_until_stockout: 1, lead_time_days: 5 })
];

describe('bandFor', () => {
  it('puts a reorder row whose live suggestion is critical under Order now', () => {
    expect(bandFor(rows.critical, inbox)).toBe('order_now');
    expect(bandFor(rows.noSupplier, inbox)).toBe('order_now');
  });

  it('puts every other reorder row under This week, including one whose suggestion was dismissed or not found', () => {
    expect(bandFor(rows.warning, inbox)).toBe('this_week');
    const dismissed = inbox.map((s) => (s.id === S_CRIT ? { ...s, status: 'dismissed' } : s));
    expect(bandFor(rows.critical, dismissed)).toBe('this_week');
    expect(bandFor(rows.critical, [])).toBe('this_week');
  });

  it('puts transfers and rows without a signal under This week', () => {
    expect(bandFor(rows.transfer, inbox)).toBe('this_week');
    expect(bandFor(pendingRec({ id: 'bare', rec_type: null, signal_sources: {} }), inbox)).toBe('this_week');
  });

  it('puts markdowns and frozen buy plans under Watch', () => {
    expect(bandFor(rows.markdown, inbox)).toBe('watch');
    expect(bandFor(rows.plan, inbox)).toBe('watch');
  });

  it('puts every row under This week until the inbox has arrived', () => {
    expect(bandFor(rows.critical, null)).toBe('this_week');
    expect(bandFor(rows.markdown, null)).toBe('this_week');
  });
});

describe('bandRows', () => {
  const all = [rows.markdown, rows.critical, rows.transfer, rows.noSupplier, rows.warning, rows.plan];
  const cards = all.map((row) => ({ id: row.id }));

  it('keeps the server order inside each band and lists the bands Order now, This week, Watch', () => {
    const banded = bandRows(cards, all, inbox);
    expect(banded.map((b) => b.band)).toEqual(['order_now', 'this_week', 'watch']);
    expect(banded[0].cards.map((c) => c.id)).toEqual(['r-crit', 'r-nosup']);
    expect(banded[1].cards.map((c) => c.id)).toEqual(['r-xfer', 'r-warn']);
    expect(banded[2].cards.map((c) => c.id)).toEqual(['r-mark', 'r-plan']);
  });

  it('omits an empty band', () => {
    const banded = bandRows([{ id: 'r-xfer' }], [rows.transfer], inbox);
    expect(banded.map((b) => b.band)).toEqual(['this_week']);
  });

  it('with no inbox yet, every card is in This week', () => {
    const banded = bandRows(cards, all, null);
    expect(banded.map((b) => b.band)).toEqual(['this_week']);
    expect(banded[0].cards.map((c) => c.id)).toEqual(all.map((r) => r.id));
  });

  it('a card whose row is unknown sits in This week', () => {
    const banded = bandRows([{ id: 'ghost' }], [], inbox);
    expect(banded).toEqual([{ band: 'this_week', cards: [{ id: 'ghost' }] }]);
  });

  it('labels the bands in plain words', () => {
    expect(BAND_LABELS).toEqual({ order_now: 'Order now', this_week: 'This week', watch: 'Watch' });
  });
});

describe('supplierBundles', () => {
  it('bundles two Order-now rows that share a supplier', () => {
    const bundles = supplierBundles([rows.critical, rows.warning, rows.noSupplier], inbox);
    expect(bundles).toEqual([
      { supplierId: 's1', supplierName: 'Northwind', locationId: 'loc', suggestionIds: [S_CRIT, S_WARN], covered: 2, total: 2 }
    ]);
  });

  it('offers nothing when only one row names a supplier', () => {
    expect(supplierBundles([rows.critical, rows.noSupplier], inbox)).toEqual([]);
    expect(supplierBundles([], inbox)).toEqual([]);
  });

  it('bundles per supplier AND location, because create-po/ drafts one order per (supplier, destination)', () => {
    const elsewhere = inbox.map((s) => (s.id === S_WARN ? { ...s, location_id: 'loc-2', location_name: 'Uptown' } : s));
    expect(supplierBundles([rows.critical, rows.warning], elsewhere)).toEqual([]);
    const third = pendingRec({ id: 'r-third', rec_type: 'reorder', signal_sources: reorderSignal(S_NOSUP) });
    const twoHere = elsewhere.map((s) => (s.id === S_NOSUP ? { ...s, supplier_id: 's1', supplier_name: 'Northwind' } : s));
    const [bundle] = supplierBundles([rows.critical, rows.warning, third], twoHere);
    expect(bundle).toMatchObject({ supplierId: 's1', locationId: 'loc', suggestionIds: [S_CRIT, S_NOSUP], covered: 2, total: 2 });
  });

  it('counts a suggestion once however many rows name it', () => {
    const twin = pendingRec({ id: 'r-twin', rec_type: 'reorder', signal_sources: reorderSignal(S_CRIT) });
    expect(supplierBundles([rows.critical, twin], inbox)).toEqual([]);
    const [bundle] = supplierBundles([rows.critical, twin, rows.warning], inbox);
    expect(bundle).toMatchObject({ suggestionIds: [S_CRIT, S_WARN], covered: 2, total: 2 });
  });

  it('counts a row whose suggestion is no longer live as named but not covered', () => {
    const stale = inbox.map((s) => (s.id === S_WARN ? { ...s, status: 'superseded' } : s));
    const [bundle] = supplierBundles([rows.critical, rows.warning], stale);
    expect(bundle.suggestionIds).toEqual([S_CRIT]);
    expect(bundle).toMatchObject({ covered: 1, total: 2 });
  });
});

const PO_ID = '55555555-5555-4555-8555-555555555555';
const PO_ID_2 = '66666666-6666-4666-8666-666666666666';

describe('draftPurchaseOrder', () => {
  const deps = () => ({ create: vi.fn(), navigate: vi.fn(), notify: vi.fn() });

  it('opens the one order it created', async () => {
    const d = deps();
    d.create.mockResolvedValue({ purchase_orders: [{ id: PO_ID, po_number: 'PO-7' }] });
    await expect(draftPurchaseOrder([S_CRIT, S_WARN], d)).resolves.toBe('created');
    expect(d.create).toHaveBeenCalledWith({ suggestion_ids: [S_CRIT, S_WARN] });
    expect(d.navigate).toHaveBeenCalledWith(`/inventory/purchase-orders/${PO_ID}`);
    expect(d.notify).not.toHaveBeenCalled();
  });

  it('stays put and says so when more than one order was created', async () => {
    const d = deps();
    d.create.mockResolvedValue({ purchase_orders: [{ id: PO_ID }, { id: PO_ID_2 }] });
    await expect(draftPurchaseOrder([S_CRIT, S_WARN], d)).resolves.toBe('created');
    expect(d.navigate).not.toHaveBeenCalled();
    expect(d.notify).toHaveBeenCalledWith(expect.stringContaining('2 draft purchase orders created'), 'info');
  });

  it('says nothing was created, in the inbox’s words, and does not navigate', async () => {
    const d = deps();
    d.create.mockResolvedValue({ purchase_orders: [] });
    await expect(draftPurchaseOrder([S_CRIT], d)).resolves.toBe('none');
    expect(d.navigate).not.toHaveBeenCalled();
    expect(d.notify).toHaveBeenCalledWith(describeCreatedOrders([]), 'warning');
  });

  it('reports a failed call and never navigates', async () => {
    const d = deps();
    d.create.mockRejectedValue(new Error('500'));
    await expect(draftPurchaseOrder([S_CRIT], d)).resolves.toBe('failed');
    expect(d.navigate).not.toHaveBeenCalled();
    expect(d.notify).toHaveBeenCalledWith('Could not draft that purchase order.', 'error');
  });

  it('refuses an empty or unusable id list without calling the server', async () => {
    const d = deps();
    await expect(draftPurchaseOrder([], d)).resolves.toBe('none');
    await expect(draftPurchaseOrder(['not-a-uuid'], d)).resolves.toBe('none');
    expect(d.create).not.toHaveBeenCalled();
    expect(d.notify).toHaveBeenCalledTimes(2);
  });
});

describe('bundleLine', () => {
  it('says how many lines, for which supplier', () => {
    expect(
      bundleLine({ supplierId: 's1', supplierName: 'Northwind', locationId: 'loc', suggestionIds: ['a', 'b', 'c'], covered: 3, total: 3 })
    ).toBe('Draft the 3 Northwind lines as one purchase order');
  });

  it('says how many it covers when some rows have no usable suggestion', () => {
    expect(
      bundleLine({ supplierId: 's1', supplierName: 'Northwind', locationId: 'loc', suggestionIds: ['a', 'b'], covered: 2, total: 3 })
    ).toBe('Draft the 3 Northwind lines as one purchase order (2 of 3 have a suggestion)');
  });
});

describe('primaryActionFor', () => {
  it('drafts a purchase order for a reorder row whose live suggestion has a supplier', () => {
    expect(primaryActionFor(rows.critical, inbox)).toEqual({ kind: 'draft_po', suggestionId: S_CRIT });
    expect(primaryActionFor(rows.warning, inbox)).toEqual({ kind: 'draft_po', suggestionId: S_WARN });
  });

  it('falls back to the default flow without a supplier, a live suggestion, or an inbox', () => {
    expect(primaryActionFor(rows.noSupplier, inbox)).toEqual({ kind: 'default' });
    expect(primaryActionFor(rows.transfer, inbox)).toEqual({ kind: 'default' });
    expect(primaryActionFor(rows.critical, null)).toEqual({ kind: 'default' });
    const ordered = inbox.map((s) => (s.id === S_CRIT ? { ...s, status: 'ordered' } : s));
    expect(primaryActionFor(rows.critical, ordered)).toEqual({ kind: 'default' });
  });
});

const today = new Date(2026, 10, 7, 15, 30);
const po = (overrides: Partial<PurchaseOrder>): Pick<PurchaseOrder, 'status' | 'expected_at'> => ({
  status: 'submitted',
  expected_at: null,
  ...overrides
});

describe('arrivingThisWeek', () => {
  it('counts open orders expected in the next 7 days and reports undated ones separately', () => {
    const orders = [
      po({ expected_at: '2026-11-10' }),
      po({ expected_at: '2026-11-16' }),
      po({ expected_at: null }),
      po({ status: 'received', expected_at: '2026-11-08' })
    ];
    expect(arrivingThisWeek(orders, today)).toEqual({ count: 1, undated: 1 });
  });

  it('includes today and excludes today + 7', () => {
    expect(arrivingThisWeek([po({ expected_at: '2026-11-07' })], today)).toEqual({ count: 1, undated: 0 });
    expect(arrivingThisWeek([po({ expected_at: '2026-11-14' })], today)).toEqual({ count: 0, undated: 0 });
    expect(arrivingThisWeek([po({ expected_at: '2026-11-06' })], today)).toEqual({ count: 0, undated: 0 });
  });
});

const overview: InventorySummary = {
  total_items: 120,
  total_value: 158400,
  total_cost_value: 66812.5,
  average_profit_margin: 58,
  average_profit_margin_estimated: false,
  margin_uncosted_value: 0,
  low_stock_count: 6,
  out_of_stock_count: 2,
  active_items_count: 118,
  inactive_items_count: 2,
  taxable_items_count: 120,
  non_taxable_items_count: 0
};

const onOrder: OnOrderResponse = { items: [], total_units: 84 };

describe('healthTiles', () => {
  it('gives five tiles, every value null, when nothing has loaded', () => {
    const tiles = healthTiles(null, null, null, today);
    expect(tiles.map((t) => t.key)).toEqual(['low', 'out', 'on_order', 'arriving', 'value']);
    expect(tiles.every((t) => t.value === null)).toBe(true);
    expect(tiles.map((t) => t.label)).toEqual(['Low stock', 'Out of stock', 'On order', 'Arriving this week', 'Value at cost']);
  });

  it('reads the counts off the overview, warning on low and error on out', () => {
    const [low, out] = healthTiles(overview, null, null, today);
    expect(low).toMatchObject({ value: '6', tone: 'warning' });
    expect(out).toMatchObject({ value: '2', tone: 'error' });
    const calm = healthTiles({ ...overview, low_stock_count: 0, out_of_stock_count: 0 }, null, null, today);
    expect(calm[0].tone).toBe('default');
    expect(calm[1].tone).toBe('default');
  });

  it('reads on-order units with the open purchase order count as its basis', () => {
    const orders = [po({ expected_at: '2026-11-10' }), po({ expected_at: null }), po({ status: 'draft' })];
    const tile = healthTiles(null, onOrder, orders, today)[2];
    expect(tile).toMatchObject({ value: '84', basis: '2 purchase orders' });
    expect(healthTiles(null, onOrder, null, today)[2].basis).toBe('units on open orders');
  });

  it('reads arriving this week from the open orders and names the undated ones', () => {
    const orders = [po({ expected_at: '2026-11-10' }), po({ expected_at: null })];
    const tile = healthTiles(null, null, orders, today)[3];
    expect(tile.value).toBe('1');
    expect(tile.basis).toContain('1 with no date');
    expect(healthTiles(null, null, [po({ expected_at: '2026-11-10' })], today)[3].basis).toBe('next 7 days');
  });

  it('formats value at cost as money with retail as its basis', () => {
    const tile = healthTiles(overview, null, null, today)[4];
    expect(tile.value).toBe('$66,812.50');
    expect(tile.basis).toBe('$158,400.00 at retail');
  });

  it('keeps a failed source at null without touching the others', () => {
    const tiles = healthTiles(overview, null, null, today);
    expect(tiles[2].value).toBeNull();
    expect(tiles[3].value).toBeNull();
    expect(tiles[4].value).not.toBeNull();
  });
});

describe('todayRefreshedAt', () => {
  const now = new Date('2026-11-07T20:00:00Z');

  it('is the clock time of the latest row generated today', () => {
    const at = todayRefreshedAt([rows.warning, rows.critical], now);
    expect(at).toBe(new Date('2026-11-07T07:02:00Z').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
  });

  it('is null with no rows, or when the latest row is from another day', () => {
    expect(todayRefreshedAt([], now)).toBeNull();
    expect(todayRefreshedAt([rows.transfer], now)).toBeNull();
  });
});
