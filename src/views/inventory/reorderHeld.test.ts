// Owner trust T8: the one quiet line under the reorder list (the `heldLine` seam in reorder.ts).
import { describe, expect, it } from 'vitest';

import { heldLine, normalizeReorderResponse, readHeldSummary } from './reorder';

describe('heldLine', () => {
  it('says nothing when her rules hold nothing', () => {
    expect(heldLine({ vendors: [], categories: [] })).toBeNull();
    expect(heldLine(null)).toBeNull();
    expect(heldLine(undefined)).toBeNull();
  });

  it('one vendor', () => {
    expect(heldLine({ vendors: ['Northwind'], categories: [] })).toBe('Not suggesting reorders for Northwind (one order a season).');
  });

  it('two vendors', () => {
    expect(heldLine({ vendors: ['Northwind', 'Juniper Knits'], categories: [] })).toBe(
      'Not suggesting reorders for Northwind and Juniper Knits (one order a season).'
    );
  });

  it('three vendors are listed with commas and one "and"', () => {
    expect(heldLine({ vendors: ['Atelier Nine', 'Juniper Knits', 'Northwind'], categories: [] })).toBe(
      'Not suggesting reorders for Atelier Nine, Juniper Knits and Northwind (one order a season).'
    );
  });

  it('vendors and a category', () => {
    expect(heldLine({ vendors: ['Northwind', 'Juniper Knits'], categories: ['Jewelry'] })).toBe(
      'Not suggesting reorders for Northwind and Juniper Knits (one order a season) or for Jewelry (a store rule).'
    );
  });

  it('a category alone, and two categories', () => {
    expect(heldLine({ vendors: [], categories: ['Jewelry'] })).toBe('Not suggesting reorders for Jewelry (a store rule).');
    expect(heldLine({ vendors: [], categories: ['Candles', 'Jewelry'] })).toBe(
      'Not suggesting reorders for Candles and Jewelry (store rules).'
    );
  });

  it('a category held at one store only is said with its store, as the server names it', () => {
    expect(heldLine({ vendors: [], categories: ['Jewelry at Far'] })).toBe('Not suggesting reorders for Jewelry at Far (a store rule).');
  });

  it('never prints a key, a count or a dash', () => {
    const line = heldLine({ vendors: ['Northwind'], categories: ['Jewelry'] }) as string;
    expect(line).not.toMatch(/_|\d|—|vendor_no_reorders|store_rule/);
  });
});

describe('readHeldSummary', () => {
  it('reads two lists of names, trimmed, without repeats', () => {
    expect(readHeldSummary({ vendors: [' Northwind ', 'Northwind', 'Juniper Knits'], categories: ['Jewelry'] })).toEqual({
      vendors: ['Northwind', 'Juniper Knits'],
      categories: ['Jewelry']
    });
  });

  it('holds nothing for anything else', () => {
    for (const body of [undefined, null, 'x', 3, [], { vendors: 'Northwind' }, { vendors: [1, null, ''], categories: {} }]) {
      expect(readHeldSummary(body)).toEqual({ vendors: [], categories: [] });
    }
  });
});

describe('normalizeReorderResponse: held_summary', () => {
  it('carries the summary through, and holds nothing when the server sends none', () => {
    const body = { items: [], total_units_suggested: 0, held_summary: { vendors: ['Northwind'], categories: ['Jewelry'] } };
    expect(normalizeReorderResponse(body).held).toEqual({ vendors: ['Northwind'], categories: ['Jewelry'] });
    expect(heldLine(normalizeReorderResponse({ items: [] }).held)).toBeNull();
    expect(heldLine(normalizeReorderResponse([]).held)).toBeNull();
  });
});
