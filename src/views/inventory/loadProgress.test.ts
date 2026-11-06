import { describe, expect, it } from 'vitest';
import { inventoryLoadLabel } from './loadProgress';

describe('inventoryLoadLabel', () => {
  it('says only "loading" before the first page tells it the total', () => {
    expect(inventoryLoadLabel({ loaded: 0, total: null })).toBe('Loading inventory…');
  });

  it('counts arrived items against the total, with thousands separators', () => {
    expect(inventoryLoadLabel({ loaded: 2300, total: 6482 })).toBe('Loading inventory… 2,300 of 6,482 items');
  });

  it('never claims more than the total if the catalogue grew mid-load', () => {
    expect(inventoryLoadLabel({ loaded: 6500, total: 6482 })).toBe('Loading inventory… 6,482 of 6,482 items');
  });
});
