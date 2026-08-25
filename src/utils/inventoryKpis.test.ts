import { describe, expect, it } from 'vitest';

import { INVENTORY_MARGIN_TITLE, inventoryMarginDisplay } from './inventoryKpis';

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
