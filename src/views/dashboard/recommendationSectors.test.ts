import { describe, expect, it } from 'vitest';

import { INVENTORY_RECOMMENDATIONS_HREF, remainingSectorCaption, remainingSectorParts } from './recommendationSectors';

describe('remainingSectorParts', () => {
  it('says "more" once, on the first sector, and joins with a middle dot', () => {
    expect(remainingSectorCaption({ inventory: 3, staffing: 1 })).toBe('3 more in Inventory · 1 in Scheduling');
  });

  it('omits sectors with nothing left', () => {
    expect(remainingSectorCaption({ inventory: 0, staffing: 2, finance: 0 })).toBe('2 more in Scheduling');
  });

  it('takes the row on screen out of its own sector, since the backend counts it', () => {
    expect(remainingSectorCaption({ inventory: 4, finance: 1 }, 'inventory')).toBe('3 more in Inventory · 1 in Finance');
    // The shown row was the only finance row: finance drops out entirely.
    expect(remainingSectorCaption({ inventory: 2, finance: 1 }, 'finance')).toBe('2 more in Inventory');
  });

  it('never subtracts below zero', () => {
    expect(remainingSectorParts({ inventory: 0 }, 'inventory')).toEqual([]);
  });

  it('leaves general out: it has no page to link to', () => {
    expect(remainingSectorParts({ general: 5 })).toEqual([]);
    expect(remainingSectorCaption({ general: 5, finance: 1 })).toBe('1 more in Finance');
  });

  it('is empty against a backend that does not send the field', () => {
    expect(remainingSectorParts(undefined)).toEqual([]);
    expect(remainingSectorParts(null)).toEqual([]);
    expect(remainingSectorParts({})).toEqual([]);
    expect(remainingSectorCaption(undefined)).toBe('');
  });

  it('reads junk counts as zero rather than rendering them', () => {
    const junk = { inventory: Number.NaN, staffing: -2, finance: '3' } as unknown as Record<string, number>;
    expect(remainingSectorParts(junk)).toEqual([]);
    expect(remainingSectorCaption({ inventory: 2.7 })).toBe('2 more in Inventory');
  });

  it('keeps a fixed sector order whatever order the payload uses', () => {
    expect(remainingSectorParts({ finance: 1, staffing: 1, inventory: 1 }).map((part) => part.sector)).toEqual([
      'inventory',
      'staffing',
      'finance'
    ]);
  });

  it('links each sector to its page, inventory to the Recommendations tab', () => {
    const parts = remainingSectorParts({ inventory: 1, staffing: 1, finance: 1 });
    expect(parts.map((part) => part.href)).toEqual([INVENTORY_RECOMMENDATIONS_HREF, '/scheduling', '/finance']);
    expect(INVENTORY_RECOMMENDATIONS_HREF).toBe('/inventory/insights?tab=recommendations');
  });
});
