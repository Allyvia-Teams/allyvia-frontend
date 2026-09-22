import { describe, expect, it } from 'vitest';

import {
  INVENTORY_MARGIN_TITLE,
  inventoryMarginCaveat,
  inventoryMarginDisplay,
  inventoryTotalValue,
  turnoverRateDisplay
} from './inventoryKpis';

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

describe('inventoryMarginCaveat currency', () => {
  const partial = {
    average_profit_margin: 66.78,
    average_profit_margin_estimated: true,
    margin_uncosted_value: 4820.5
  };

  it('names the excluded stock in the currency the tile is using', () => {
    // The summary payload has no currency; the treemap is the only source that
    // carries one, and the caller threads it in. Without this the chip read
    // "$4,820.50" beside a tile formatted "£66,812.00".
    expect(inventoryMarginCaveat(partial, 'GBP')?.tooltip).toContain('£4,820.50');
  });

  it('degrades to dollars rather than throwing on a malformed currency', () => {
    // Intl.NumberFormat throws RangeError on anything that is not a 3-letter
    // code. This runs inside render, so an unguarded throw blanks the whole
    // Inventory card over a settings typo.
    expect(inventoryMarginCaveat(partial, 'US')?.tooltip).toBe(
      '$4,820.50 of stock at retail has no recorded cost. This margin measures only the stock that has one.'
    );
  });

  it('degrades to dollars when no currency reaches it', () => {
    expect(inventoryMarginCaveat(partial, '')?.tooltip).toContain('$4,820.50');
    expect(inventoryMarginCaveat(partial)?.tooltip).toContain('$4,820.50');
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

describe('inventoryMarginCaveat', () => {
  // The margin can only measure stock whose cost is known, so a shelf that is
  // half uncosted reports the margin of the half we can price. These are the
  // cases where the tile has to say so rather than present a subset as the shop.
  const summary = (over: Partial<Parameters<typeof inventoryMarginCaveat>[0]> = {}) => ({
    average_profit_margin: 66.78,
    average_profit_margin_estimated: false,
    margin_uncosted_value: 0,
    ...over
  });

  it('is silent when every item on the shelf is costed', () => {
    // No caveat means no chip. A complete figure must not be decorated with
    // doubt, or the affordance stops meaning anything.
    expect(inventoryMarginCaveat(summary())).toBeNull();
  });

  it('is silent before the summary has loaded', () => {
    expect(inventoryMarginCaveat(null)).toBeNull();
    expect(inventoryMarginCaveat(undefined)).toBeNull();
  });

  it('names the excluded stock at retail when the margin covers only part of the shelf', () => {
    const caveat = inventoryMarginCaveat(summary({ average_profit_margin_estimated: true, margin_uncosted_value: 4820.5 }));

    expect(caveat?.label).toBe('Estimated');
    expect(caveat?.tooltip).toBe('$4,820.50 of stock at retail has no recorded cost. This margin measures only the stock that has one.');
  });

  it('never prints a zero amount as the thing that is missing', () => {
    // THE HONESTY CASE. `margin_uncosted_value` sums unit_price * qty over the
    // EXCLUDED items, and an item is excluded for having no price just as much
    // as for having no cost — so a true `estimated` flag routinely arrives with
    // a value of 0. "$0.00 of stock has no recorded cost" reads as "nothing is
    // missing", contradicting the very chip it appears in.
    const caveat = inventoryMarginCaveat(summary({ average_profit_margin_estimated: true, margin_uncosted_value: 0 }));

    expect(caveat?.label).toBe('Estimated');
    expect(caveat?.tooltip).toBe('Some stock has no recorded cost. This margin measures only the stock that has one.');
    expect(caveat?.tooltip).not.toContain('0.00');
  });

  it('explains an absent margin rather than calling it an estimate', () => {
    // margin null + estimated true is the newly-onboarded shop: a catalogue
    // imported with prices but no costs. The tile reads "—", and "ESTIMATED"
    // beside it would be incoherent — nothing was estimated, the figure is
    // absent. Say why it is blank and what would fill it.
    const caveat = inventoryMarginCaveat(
      summary({ average_profit_margin: null, average_profit_margin_estimated: true, margin_uncosted_value: 52000 })
    );

    expect(caveat?.label).toBe('No cost data');
    expect(caveat?.tooltip).toBe('$52,000.00 of stock at retail has no recorded cost, so no margin can be calculated.');
  });

  it('explains an absent margin with no amount to name', () => {
    const caveat = inventoryMarginCaveat(
      summary({ average_profit_margin: null, average_profit_margin_estimated: true, margin_uncosted_value: 0 })
    );

    expect(caveat?.label).toBe('No cost data');
    expect(caveat?.tooltip).toBe('No stock on hand has both a recorded cost and a price, so no margin can be calculated.');
  });

  // The no-argument default. The shop's own currency is threaded in from the
  // treemap by the caller and is covered by the `inventoryMarginCaveat
  // currency` block above; this pins what the chip says when the treemap has
  // not loaded and nothing was passed. It must never come from the summary --
  // that payload carries no `currency`, and reading one back is now a compile
  // error rather than a test.
  it('reports the excluded stock in dollars when no currency reaches it', () => {
    const caveat = inventoryMarginCaveat(summary({ average_profit_margin_estimated: true, margin_uncosted_value: 4820.5 }));

    expect(caveat?.tooltip).toBe('$4,820.50 of stock at retail has no recorded cost. This margin measures only the stock that has one.');
  });

  it('treats a missing estimated flag as complete coverage', () => {
    // Matches the finance chip's `=== true` strictness: an older payload
    // without the key must not start asserting doubt.
    expect(inventoryMarginCaveat({ ...summary(), average_profit_margin_estimated: undefined as unknown as boolean })).toBeNull();
  });
});

describe('turnoverRateDisplay', () => {
  it('renders a rate with the "x" suffix', () => {
    expect(turnoverRateDisplay(4.25, 2)).toBe('4.25x');
    expect(turnoverRateDisplay(4.25, 1)).toBe('4.3x');
  });

  it('renders null as a bare em dash, never "—x" and never "0.00x"', () => {
    // THE CRASH THIS GUARDS. The backend returns turnover_rate: null with
    // status "no_data" for a shop that has never recorded a sale, or that
    // carried no stock across the window -- deliberately null rather than 0,
    // which would read as a real standstill. Both dashboard render sites did
    // `inventoryEfficiency.turnover_rate.toFixed(n)` unguarded, so the whole
    // /dashboard route died with "Cannot read properties of null (reading
    // 'toFixed')" for every such company.
    expect(turnoverRateDisplay(null, 1)).toBe('—');
    expect(turnoverRateDisplay(undefined, 2)).toBe('—');
  });

  it('renders a genuine zero rate as 0.0x, not an em dash', () => {
    // A shop with sales history and a quiet window genuinely turns over zero
    // and must be told so. Only an *undefined* rate is an em dash.
    expect(turnoverRateDisplay(0, 1)).toBe('0.0x');
  });

  it('renders a non-finite rate as an em dash rather than "NaNx"', () => {
    expect(turnoverRateDisplay(Number.NaN, 1)).toBe('—');
    expect(turnoverRateDisplay(Number.POSITIVE_INFINITY, 1)).toBe('—');
  });
});
