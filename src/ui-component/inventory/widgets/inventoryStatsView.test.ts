import { describe, expect, it } from 'vitest';

import type { InventorySummary } from 'types/inventory';
import { buildInventoryStatsView, type StatsItem } from './inventoryStatsView';

function makeItem(overrides: Partial<StatsItem> = {}): StatsItem {
  return { quantity_on_hand: 5, unit_price: 10, reorder_point: null, item_type: 'Inventory', ...overrides };
}

const summary: InventorySummary = {
  total_items: 120,
  unique_items: 120,
  total_quantity_on_hand: 900,
  low_stock: 7,
  out_of_stock: 3,
  inventory_value: '48250.00'
};

const ok = { summaryLoading: false, summaryError: null };

function tile(view: ReturnType<typeof buildInventoryStatsView>, title: string) {
  const found = view.tiles.find((t) => t.title.startsWith(title));
  if (!found) throw new Error(`no tile titled ${title}`);
  return found;
}

describe('buildInventoryStatsView', () => {
  it('renders the server summary when it loaded', () => {
    const view = buildInventoryStatsView({ ...ok, summary, items: [] });

    expect(view.status).toBe('ready');
    expect(tile(view, 'Unique Items').value).toBe('120 / 900');
    expect(tile(view, 'Low Stock').value).toBe(7);
    expect(tile(view, 'Out of Stock').value).toBe(3);
    expect(tile(view, 'Inventory Value').value).toBe('$48,250.00');
  });

  it('shows an em-dash instead of a locally-computed number when the summary fails', () => {
    // THE bug: the tiles silently switched to client-computed figures with no
    // sign anything had failed. A precise wrong number outranks a visible gap
    // in how much damage it does, so refuse to substitute one.
    const items = [makeItem(), makeItem(), makeItem()];
    const view = buildInventoryStatsView({ summary: null, items, summaryLoading: false, summaryError: 'Network Error' });

    expect(view.status).toBe('error');
    expect(view.tiles.map((t) => t.value)).toEqual(['—', '—', '—', '—']);
    expect(view.tiles.every((t) => t.theme === 'default')).toBe(true);
    expect(view.errorLabel).toBe("Couldn't load inventory summary");
  });

  it('refuses stale server data too once the refresh has failed', () => {
    // A summary from before the blip is not evidence about now.
    const view = buildInventoryStatsView({ summary, items: [], summaryLoading: false, summaryError: 'Network Error' });

    expect(view.status).toBe('error');
    expect(tile(view, 'Inventory Value').value).toBe('—');
  });

  it('is loading while the summary is still in flight', () => {
    const view = buildInventoryStatsView({ summary: null, items: [makeItem()], summaryLoading: true, summaryError: null });

    expect(view.status).toBe('loading');
  });

  it('counts a fully out-of-stock item as low stock, matching the server', () => {
    // Server: reorder_point IS NOT NULL AND qoh <= reorder_point — qoh 0
    // included. The old client formula required qoh > 0, so the items most
    // urgently needing a reorder were the ones it dropped.
    const items = [makeItem({ quantity_on_hand: 0, reorder_point: 4 }), makeItem({ quantity_on_hand: 2, reorder_point: 4 })];
    const view = buildInventoryStatsView({ ...ok, summary: { ...summary, low_stock: undefined as never }, items });

    expect(tile(view, 'Low Stock').value).toBe(2);
  });

  it('does not treat a missing reorder point as a reorder point of zero', () => {
    const items = [makeItem({ quantity_on_hand: 0, reorder_point: null })];
    const view = buildInventoryStatsView({ ...ok, summary: { ...summary, low_stock: undefined as never }, items });

    expect(tile(view, 'Low Stock').value).toBe(0);
  });

  it('counts on-hand units over stocked item types only, matching the server', () => {
    const items = [makeItem({ quantity_on_hand: 10 }), makeItem({ quantity_on_hand: 99, item_type: 'Service' })];
    const view = buildInventoryStatsView({
      ...ok,
      summary: {
        ...summary,
        total_quantity_on_hand: undefined as never,
        unique_items: undefined as never,
        total_items: undefined as never
      },
      items
    });

    expect(tile(view, 'Unique Items').value).toBe('2 / 10');
  });

  it('renders a genuine zero valuation rather than falling through to the items list', () => {
    // `summary?.inventory_value ? … : fallback` was a truthiness check, so a
    // real 0 would have been replaced by a computed figure.
    const view = buildInventoryStatsView({ ...ok, summary: { ...summary, inventory_value: 0 }, items: [makeItem()] });

    expect(tile(view, 'Inventory Value').value).toBe('$0.00');
  });
});
