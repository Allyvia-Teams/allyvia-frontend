import { describe, expect, it } from 'vitest';

import { rowMatchesSearch } from 'ui-component/common/tableSearch';

import { garmentAttributeChips, garmentDetailRows, garmentRowFields, styleLink, withGarmentFields } from './garmentFields';

const shirt = {
  id: '1',
  name: 'Linen Camp Shirt',
  sku: 'LIN-IVO-M',
  quantity_on_hand: 4,
  unit_price: 128,
  value: 512,
  size: 'M',
  color: 'Ivory',
  product: { id: 'style-7', name: 'Camp Shirt', style_code: 'EVER-CAMP', brand: 'Everlane', season: 'SS26' }
};

/** A row off the QuickBooks-backed list: the serializer omits a key it has no
 * value for, so none of the garment fields are even present. */
const legacyRow = { id: '2', name: 'Gift Card', quantity_on_hand: 0, unit_price: 25, value: 0 };

describe('garmentRowFields', () => {
  it('flattens the style, size and colour onto the row', () => {
    expect(garmentRowFields(shirt)).toEqual({
      style_name: 'Camp Shirt',
      style_code: 'EVER-CAMP',
      size: 'M',
      color: 'Ivory'
    });
  });

  it('leaves the style blank when the style was deleted', () => {
    // InventoryItem.product is SET_NULL: the row is still a real garment the
    // table must render, it just has no style to name.
    expect(garmentRowFields({ ...shirt, product: null })).toMatchObject({ style_name: '', style_code: '', size: 'M' });
  });

  it('gives blanks, not undefined, for a payload that carries none of the fields', () => {
    // undefined would sort and search inconsistently against real values, and
    // the DataGrid would render "undefined".
    expect(garmentRowFields(legacyRow)).toEqual({ style_name: '', style_code: '', size: '', color: '' });
  });
});

describe('withGarmentFields', () => {
  it('keeps every original field and adds the flattened four', () => {
    const [row] = withGarmentFields([shirt]);

    expect(row.name).toBe('Linen Camp Shirt');
    expect(row.style_name).toBe('Camp Shirt');
    expect(row.size).toBe('M');
  });

  it('projects the garment fields as top-level strings, which is what makes them searchable', () => {
    // AllyviaPaginatedTable searches Object.values(row): a nested `product`
    // object stringifies to "[object Object]" and matches nothing, which is
    // why the flattening exists rather than a valueGetter.
    const [row] = withGarmentFields([shirt]);

    expect(Object.values(row)).toContain('Camp Shirt');
    expect(Object.values(row)).toContain('EVER-CAMP');
  });
});

describe('search over the projected rows', () => {
  const rows = withGarmentFields([shirt, legacyRow]);

  it('hits the style name', () => {
    expect(rows.filter((row) => rowMatchesSearch(row, 'camp shirt'))).toHaveLength(1);
  });

  it('hits the style code', () => {
    expect(rows.filter((row) => rowMatchesSearch(row, 'ever-camp'))).toHaveLength(1);
  });

  it('hits the size', () => {
    expect(rows.filter((row) => rowMatchesSearch(row, 'Ivory'))).toHaveLength(1);
  });

  it('hits the colour', () => {
    expect(rows.filter((row) => rowMatchesSearch(row, 'ivory'))).toHaveLength(1);
  });

  it('does not match a row that has no garment fields at all', () => {
    expect(rowMatchesSearch(legacyRow, 'ivory')).toBe(false);
  });
});

describe('styleLink', () => {
  it('points at the catalogue row for the style', () => {
    expect(styleLink('style-7')).toBe('/inventory/styles?styleId=style-7');
  });
});

describe('garmentDetailRows', () => {
  const product = {
    brand: 'Everlane',
    season: 'SS26',
    composition: '100% linen',
    care: 'Cold wash, line dry',
    origin: 'Portugal',
    fit_notes: 'Boxy through the body',
    attributes: { material: 'linen', fit: 'relaxed' }
  };

  it('lists size, colour and the style description in reading order', () => {
    const rows = garmentDetailRows(shirt, product);

    expect(rows.map((row) => row.label)).toEqual(['Size', 'Color', 'Brand', 'Season', 'Composition', 'Care', 'Origin', 'Fit notes']);
  });

  it('hides a row that was never entered', () => {
    // NULL on Product means never entered, and the app hides the row — "" would
    // be indistinguishable from "entered and blank".
    const rows = garmentDetailRows(shirt, { ...product, care: null, origin: null, fit_notes: null });

    expect(rows.map((row) => row.label)).toEqual(['Size', 'Color', 'Brand', 'Season', 'Composition']);
  });

  it('returns nothing at all for an item with no garment data', () => {
    // The whole Garment section is then hidden rather than rendered empty.
    expect(garmentDetailRows(legacyRow, null)).toEqual([]);
  });

  it('falls back to the brand and season on the item row when the full style has not loaded', () => {
    const rows = garmentDetailRows(shirt, null);

    expect(rows).toEqual([
      { label: 'Size', value: 'M' },
      { label: 'Color', value: 'Ivory' },
      { label: 'Brand', value: 'Everlane' },
      { label: 'Season', value: 'SS26' }
    ]);
  });
});

describe('garmentAttributeChips', () => {
  it('is one chip per entered attribute, in the governed key order', () => {
    const chips = garmentAttributeChips({ attributes: { fit: 'relaxed', material: 'linen' } });

    expect(chips).toEqual([
      { key: 'material', label: 'Material', value: 'linen' },
      { key: 'fit', label: 'Fit', value: 'relaxed' }
    ]);
  });

  it('is empty when the style has no descriptors', () => {
    expect(garmentAttributeChips({ attributes: {} })).toEqual([]);
    expect(garmentAttributeChips(null)).toEqual([]);
  });

  it('ignores a key the vocabulary does not govern', () => {
    expect(garmentAttributeChips({ attributes: { mood: 'breezy' } as Record<string, string> })).toEqual([]);
  });
});
