import { beforeAll, describe, expect, it } from 'vitest';
import type { InventorySummary } from 'types/analytics';
import { inventoryTotalValue } from 'utils/inventoryKpis';

// What analytics/inventory/overview/ and analytics/inventory/ actually put in
// their `summary` key, driven through the reducer that stores it.
//
// `total_inventory_value` was not the only name this interface had wrong -- it
// also declared active_items / inactive_items / taxable_items /
// non_taxable_items, which the server spells with a `_count` suffix, and a
// `currency` the endpoint has never sent. Those four had no readers, so
// nothing broke; `currency` did, and read undefined on every render.
//
// The slice's import chain reaches utils/axios, which touches web storage at
// module scope -- same dynamic-import convention as finance.test.ts.

let reducer: typeof import('./analytics').default;

function stubWebStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear()
  };
  (globalThis as any).sessionStorage = (globalThis as any).sessionStorage ?? storage;
  (globalThis as any).localStorage = (globalThis as any).localStorage ?? storage;
}

beforeAll(async () => {
  stubWebStorage();
  reducer = (await import('./analytics')).default;
});

// Verbatim from analytics.InventorySummarySerializer -- every field it
// declares, and nothing it does not. Annotated, so tsc fails the build if the
// interface and this list ever disagree again. Do not rename these to suit the
// client; the client is what has to match them.
const SERVER_SUMMARY: InventorySummary = {
  total_items: 56,
  total_value: 128450.75,
  total_cost_value: 42600.5,
  average_profit_margin: 66.78,
  average_profit_margin_estimated: false,
  margin_uncosted_value: 0,
  low_stock_count: 7,
  out_of_stock_count: 3,
  active_items_count: 52,
  inactive_items_count: 4,
  taxable_items_count: 50,
  non_taxable_items_count: 6
};

const TREEMAP = {
  currency: 'GBP',
  items: [],
  categories: [],
  locations: [],
  types: [],
  totals: {
    categories: { quantity: 300, value: 99999 },
    locations: { quantity: 300, value: 99999 },
    types: { quantity: 300, value: 99999 },
    products: { quantity: 300, value: 99999 }
  }
};

function stateFromOverview() {
  const withTreemap = reducer(undefined, { type: 'analytics/fetchInventoryItemsTreeMap/fulfilled', payload: TREEMAP });
  return reducer(withTreemap, {
    type: 'analytics/fetchInventoryOverview/fulfilled',
    payload: { summary: SERVER_SUMMARY, trends: null, alerts: null }
  });
}

describe('the analytics inventory summary payload', () => {
  it('stores the server payload under the names the server uses', () => {
    const summary = stateFromOverview().inventorySummary;

    expect(summary?.active_items_count).toBe(52);
    expect(summary?.inactive_items_count).toBe(4);
    expect(summary?.taxable_items_count).toBe(50);
    expect(summary?.non_taxable_items_count).toBe(6);
  });

  // The currency rung the tiles used to read first. It never resolved, so the
  // treemap has always been the real source; saying so is the fix.
  it('carries no currency of its own', () => {
    expect(stateFromOverview().inventorySummary).not.toHaveProperty('currency');
  });

  it('carries no total_inventory_value', () => {
    expect(stateFromOverview().inventorySummary).not.toHaveProperty('total_inventory_value');
  });

  it('still resolves the tile value from the summary, not the treemap', () => {
    const state = stateFromOverview();
    expect(inventoryTotalValue(state.inventorySummary, state.inventoryItemsTreeMap)).toBe(128450.75);
  });

  // Both routes that fill this state hand over the same serializer output.
  it('fills the same state from inventory/ as from inventory/overview/', () => {
    const state = reducer(undefined, {
      type: 'analytics/fetchInventoryAll/fulfilled',
      payload: { summary: SERVER_SUMMARY, low_stock: [], top_items: [], alerts: null }
    });

    expect(state.inventorySummary?.active_items_count).toBe(52);
    expect(inventoryTotalValue(state.inventorySummary, null)).toBe(128450.75);
  });
});
