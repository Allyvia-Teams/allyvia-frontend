import { describe, expect, it } from 'vitest';

import { INVENTORY_MARGIN_TITLE, inventoryMarginDisplay, inventoryTotalValue } from './inventoryKpis';

describe('inventoryMarginDisplay', () => {
  it('renders a margin to one decimal place', () => {
    expect(inventoryMarginDisplay({ average_profit_margin: 55 })).toBe('55.0%');
    expect(inventoryMarginDisplay({ average_profit_margin: 66.7844 })).toBe('66.8%');
  });

  it('renders null as an em dash, never 0%', () => {
    // null means "no priced, cost-known stock on hand" — an absent margin, not
    // a margin of nothing. The old tile printed 0% for this.
    expect(inventoryMarginDisplay({ average_profit_margin: null })).toBe('—');
  });

  it('renders a genuine zero margin as 0.0%, not an em dash', () => {
    // THE REGRESSION THIS GUARDS. The tile used to read
    // a bare `||` fallback on the margin, which cannot tell a real 0% (selling
    // at cost) from null. Routing through formatPercent keeps them distinct,
    // and this is the case a careless `||` reintroduces.
    expect(inventoryMarginDisplay({ average_profit_margin: 0 })).toBe('0.0%');
  });

  it('renders a negative margin rather than clamping it', () => {
    // Selling below cost is real; hiding it at 0 would flatter the shop.
    expect(inventoryMarginDisplay({ average_profit_margin: -33.3 })).toBe('-33.3%');
  });

  it('renders an em dash before the summary has loaded', () => {
    expect(inventoryMarginDisplay(null)).toBe('—');
    expect(inventoryMarginDisplay(undefined)).toBe('—');
  });

  it('is titled for the shelf, not for a per-item average', () => {
    // The value is the on-hand-value-weighted margin of the whole shelf, not a
    // per-item average, so the old label described arithmetic we no longer do.
    expect(INVENTORY_MARGIN_TITLE).toBe('Inventory Margin');
  });
});

describe('inventoryTotalValue', () => {
  const treemap = { totals: { categories: { quantity: 0, value: 99999 } } } as never;

  it('prefers the summary over the treemap total', () => {
    // They are NOT the same measurement: the summary counts active items only,
    // the treemap counts every item the company has. Whenever the summary has
    // loaded it is the one that matches the tile's label.
    expect(inventoryTotalValue({ total_value: 66812 }, treemap)).toBe(66812);
  });

  it('respects a real zero instead of falling through to the treemap', () => {
    // `??` not `||`. A shop with no stock on hand is worth 0, and must not be
    // shown the treemap's number instead.
    expect(inventoryTotalValue({ total_value: 0 }, treemap)).toBe(0);
  });

  it('falls back to the treemap only while the summary is absent', () => {
    expect(inventoryTotalValue(null, treemap)).toBe(99999);
    expect(inventoryTotalValue(undefined, treemap)).toBe(99999);
  });

  it('is 0 when neither source has loaded', () => {
    expect(inventoryTotalValue(null, null)).toBe(0);
    expect(inventoryTotalValue(undefined, undefined)).toBe(0);
  });

  it('ignores total_inventory_value, which this payload never carries', () => {
    // THE DEFECT. The analytics tab read `total_inventory_value` — a real key,
    // but on the inventory app's efficiency payload, not on this one. The
    // branch was therefore always undefined and the tile silently rendered the
    // treemap's differently-scoped total instead.
    const wrongShape = { total_inventory_value: 12345 } as never;
    expect(inventoryTotalValue(wrongShape, treemap)).toBe(99999);
    expect(inventoryTotalValue(wrongShape, null)).toBe(0);
  });
});
