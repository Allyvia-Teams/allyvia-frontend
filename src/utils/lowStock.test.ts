import { describe, expect, it } from 'vitest';
import { isLowStock, isOutOfStock, isStockAlertItem, isStockedItem } from './lowStock';

/**
 * ALL-98. These are the claims that used to be spread across the KPI tile's
 * fallback, the alerts panel, the CSV report and the PDF report — four
 * predicates, three of them wrong in a different way. They live here now
 * because there is one rule, and it has to match
 * `InventoryItem.low_stock_q()` on the server exactly.
 */
describe('isLowStock', () => {
  it('counts an item at or below its reorder point', () => {
    expect(isLowStock({ quantity_on_hand: 2, reorder_point: 4 })).toBe(true);
    expect(isLowStock({ quantity_on_hand: 4, reorder_point: 4 })).toBe(true);
    expect(isLowStock({ quantity_on_hand: 5, reorder_point: 4 })).toBe(false);
  });

  it('counts an empty shelf that has a reorder point', () => {
    // The `qty > 0` guard three of the four old formulas carried dropped
    // exactly the items most urgently needing a reorder.
    expect(isLowStock({ quantity_on_hand: 0, reorder_point: 4 })).toBe(true);
  });

  it('treats a reorder point of zero as a reorder point', () => {
    // "Tell me when it is gone" is a thing a merchant can mean. The server's
    // category breakdown used `if (reorder_point && ...)` and threw it away.
    expect(isLowStock({ quantity_on_hand: 0, reorder_point: 0 })).toBe(true);
  });

  it('does not treat a missing reorder point as a reorder point of zero', () => {
    // The mirror-image error, from `(i.reorder_point || 0)`: an item the
    // merchant never asked to be told about became an alert the moment its
    // shelf emptied.
    expect(isLowStock({ quantity_on_hand: 0, reorder_point: null })).toBe(false);
    expect(isLowStock({ quantity_on_hand: 0 })).toBe(false);
  });
});

describe('isStockAlertItem', () => {
  it('leaves out-of-stock items to the out-of-stock list', () => {
    // Not a different definition of low stock — one alert per item, the same
    // split the server's alerts endpoint makes.
    expect(isStockAlertItem({ quantity_on_hand: 0, reorder_point: 4 })).toBe(false);
    expect(isStockAlertItem({ quantity_on_hand: 2, reorder_point: 4 })).toBe(true);
  });
});

describe('isStockedItem', () => {
  it('excludes things that do not sit on a shelf', () => {
    expect(isStockedItem({ item_type: 'Inventory' })).toBe(true);
    expect(isStockedItem({ item_type: 'Service' })).toBe(false);
  });
});

describe('isOutOfStock', () => {
  it('is about the shelf, not the reorder point', () => {
    expect(isOutOfStock({ quantity_on_hand: 0, reorder_point: null })).toBe(true);
    expect(isOutOfStock({ quantity_on_hand: 1, reorder_point: 4 })).toBe(false);
  });
});
