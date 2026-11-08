import { describe, expect, it } from 'vitest';
import { LEGACY_INVENTORY_PATHS, legacyInventoryTarget } from './legacyRoutes';

const TABLE: Array<[string, string]> = [
  ['/inventory/styles', '/inventory?tab=stock'],
  ['/inventory/reorder', '/inventory?tab=today'],
  ['/inventory/insights', '/inventory?tab=today'],
  ['/inventory/purchase-orders', '/inventory?tab=buying'],
  ['/inventory/suppliers', '/inventory?tab=buying&view=suppliers'],
  ['/inventory/transfers', '/inventory?tab=counts&view=transfers'],
  ['/inventory/transfers/new', '/inventory?tab=counts&view=transfers&new=1'],
  ['/inventory/stock-counts', '/inventory?tab=counts'],
  ['/inventory/stock-counts/new', '/inventory?tab=counts&new=1'],
  ['/inventory/quickbooks', '/inventory?tab=reports&view=quickbooks']
];

describe('legacyInventoryTarget', () => {
  it.each(TABLE)('%s -> %s', (from, to) => {
    expect(legacyInventoryTarget(from, '')).toBe(to);
  });

  it('maps insights tabs', () => {
    expect(legacyInventoryTarget('/inventory/insights', '?tab=sell-through')).toBe('/inventory?tab=reports&view=sell-through');
    expect(legacyInventoryTarget('/inventory/insights', '?tab=recommendations')).toBe('/inventory?tab=today');
    expect(legacyInventoryTarget('/inventory/insights', '?tab=garbage')).toBe('/inventory?tab=reports');
    expect(legacyInventoryTarget('/inventory/insights', '?tab=sell-through&location_id=x')).toBe(
      '/inventory?tab=reports&view=sell-through&location_id=x'
    );
  });

  it('carries unrecognised query keys', () => {
    expect(legacyInventoryTarget('/inventory/reorder', '?suggestion=abc&location_id=def')).toBe(
      '/inventory?tab=today&suggestion=abc&location_id=def'
    );
    expect(legacyInventoryTarget('/inventory/styles', 'q=shirt')).toBe('/inventory?tab=stock&q=shirt');
  });

  it('returns null for non-legacy paths', () => {
    expect(legacyInventoryTarget('/inventory/find', '')).toBeNull();
    expect(legacyInventoryTarget('/inventory/locations', '')).toBeNull();
    expect(legacyInventoryTarget('/inventory/transfers/abc', '')).toBeNull();
  });

  it('tolerates one trailing slash', () => {
    expect(legacyInventoryTarget('/inventory/styles/', '')).toBe('/inventory?tab=stock');
  });

  it('lists exactly the ten legacy paths', () => {
    expect([...LEGACY_INVENTORY_PATHS]).toEqual(TABLE.map(([from]) => from));
  });
});
