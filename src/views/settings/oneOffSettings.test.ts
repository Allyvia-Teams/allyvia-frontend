// Owner trust T9: the one-off row on Settings > Store rules, the reorder list's line and the style chip.
import { describe, expect, it } from 'vitest';

import {
  CORE_ITEM_LABEL,
  ONE_OFF_BLURB,
  ONE_OFF_TITLE,
  heldNote,
  oneOffError,
  oneOffForm,
  oneOffLine,
  oneOffPayload,
  oneOffValue,
  readOneOffCount,
  stockClassChip,
  unitsWords
} from './oneOffSettings';

describe('oneOffForm', () => {
  it('0, a missing value or rubbish is off, showing 3', () => {
    for (const stored of [0, undefined, null, '', 'x', -2, 2.5]) {
      expect(oneOffForm(stored)).toEqual({ on: false, units: '3' });
    }
  });

  it('a stored number is on at that number', () => {
    expect(oneOffForm(3)).toEqual({ on: true, units: '3' });
    expect(oneOffForm('5')).toEqual({ on: true, units: '5' });
    expect(oneOffForm(20)).toEqual({ on: true, units: '20' });
  });
});

describe('oneOffPayload', () => {
  it('off sends 0', () => {
    expect(oneOffPayload({ on: false, units: '3' }, 3)).toEqual({ one_off_max_units: 0 });
    expect(oneOffPayload({ on: false, units: 'nonsense' }, 5)).toEqual({ one_off_max_units: 0 });
  });

  it('on sends the number', () => {
    expect(oneOffPayload({ on: true, units: '3' }, 0)).toEqual({ one_off_max_units: 3 });
    expect(oneOffPayload({ on: true, units: ' 7 ' }, 3)).toEqual({ one_off_max_units: 7 });
    expect(oneOffPayload({ on: true, units: '1' }, 0)).toEqual({ one_off_max_units: 1 });
    expect(oneOffPayload({ on: true, units: '20' }, 0)).toEqual({ one_off_max_units: 20 });
  });

  it('nothing to save when nothing changed', () => {
    expect(oneOffPayload({ on: true, units: '3' }, 3)).toBeNull();
    expect(oneOffPayload({ on: false, units: '9' }, 0)).toBeNull();
    expect(oneOffPayload(oneOffForm(undefined), undefined)).toBeNull();
  });

  it('a number outside 1 to 20 is never sent', () => {
    for (const units of ['0', '21', '', 'three', '2.5', '-1']) {
      expect(oneOffPayload({ on: true, units }, 3)).toBeNull();
      expect(oneOffValue({ on: true, units })).toBeNull();
      expect(oneOffError({ on: true, units })).toBe('Enter a whole number from 1 to 20.');
    }
  });

  it('the bounds themselves are fine, and off is never an error', () => {
    expect(oneOffError({ on: true, units: '1' })).toBeNull();
    expect(oneOffError({ on: true, units: '20' })).toBeNull();
    expect(oneOffError({ on: false, units: '99' })).toBeNull();
  });
});

describe('wording', () => {
  it('the row says what the owner asked for, with no dash', () => {
    expect(ONE_OFF_TITLE).toBe('Treat new items that arrive in small quantities as one-offs');
    expect(ONE_OFF_BLURB).toBe(
      'One-offs get no reorder suggestions and are not used to size future orders. We still remember how fast that kind of item sold.'
    );
    expect(CORE_ITEM_LABEL).toBe('Core item: always learn from this, even in small quantities');
    expect(`${ONE_OFF_TITLE} ${ONE_OFF_BLURB} ${CORE_ITEM_LABEL}`).not.toMatch(/—|_/);
  });

  it('"unit or fewer" for one, "units or fewer" otherwise', () => {
    expect(unitsWords('1')).toBe('unit or fewer');
    expect(unitsWords('3')).toBe('units or fewer');
    expect(unitsWords('')).toBe('units or fewer');
  });

  it('the reorder line for none, one and several', () => {
    expect(oneOffLine(0)).toBeNull();
    expect(oneOffLine(undefined)).toBeNull();
    expect(oneOffLine(1)).toBe('1 one-off item is left out of reorder suggestions.');
    expect(oneOffLine(4)).toBe('4 one-off items are left out of reorder suggestions.');
  });

  it('the count is read without trusting it', () => {
    expect(readOneOffCount(2)).toBe(2);
    expect(readOneOffCount('2')).toBe(2);
    for (const value of [undefined, null, -1, 1.5, 'two', {}, []]) expect(readOneOffCount(value)).toBe(0);
  });

  it('the quiet line joins her rules and the one-offs, whichever exist', () => {
    const rules = 'Not suggesting reorders for Jewelry (a store rule).';
    expect(heldNote(null, 0)).toBeNull();
    expect(heldNote(rules, 0)).toBe(rules);
    expect(heldNote(null, 2)).toBe('2 one-off items are left out of reorder suggestions.');
    expect(heldNote(rules, 1)).toBe(`${rules} 1 one-off item is left out of reorder suggestions.`);
  });

  it('the chip shows for a one-off only, and goes once Core is ticked', () => {
    expect(stockClassChip('one_off')).toBe('One-off');
    expect(stockClassChip('one_off', true)).toBeNull();
    expect(stockClassChip('core')).toBeNull();
    expect(stockClassChip('')).toBeNull();
    expect(stockClassChip(undefined)).toBeNull();
  });
});

// The two places the seam's output is carried: the reorder list's summary and the style's PATCH.
import { readHeldSummary, normalizeReorderResponse, heldLine } from 'views/inventory/reorder';
import { styleDetailForm, styleDetailPayload } from 'views/inventory/styleDetail';
import type { Product } from 'api/inventoryStock.api';

describe('the reorder list carries the count', () => {
  it('reads one_offs beside the names, and leaves the key out when there are none', () => {
    expect(readHeldSummary({ vendors: [], categories: [], one_offs: 2 })).toEqual({ vendors: [], categories: [], oneOffs: 2 });
    expect(readHeldSummary({ vendors: ['Northwind'], categories: [], one_offs: 0 })).toEqual({ vendors: ['Northwind'], categories: [] });
    expect(readHeldSummary({ vendors: [], categories: [], one_offs: 'many' })).toEqual({ vendors: [], categories: [] });
  });

  it('the line under the list says both', () => {
    const held = normalizeReorderResponse({ items: [], held_summary: { vendors: ['Northwind'], categories: [], one_offs: 3 } }).held;
    expect(heldNote(heldLine(held), held?.oneOffs)).toBe(
      'Not suggesting reorders for Northwind (one order a season). 3 one-off items are left out of reorder suggestions.'
    );
    const none = normalizeReorderResponse({ items: [] }).held;
    expect(heldNote(heldLine(none), none?.oneOffs)).toBeNull();
  });
});

describe('the Core tick on a style', () => {
  const STYLE: Product = {
    id: '9f1c2f3a-0000-4000-8000-000000000001',
    name: 'Gum Sneaker',
    style_code: 'GUM',
    category: 'Shoes',
    description: '',
    brand: 'Golden Goose',
    season: '',
    status: 'active',
    variant_count: 1,
    total_on_hand: 1,
    sizes: [],
    colors: [],
    created_at: '2026-11-01T10:00:00Z',
    variants: [],
    attributes: {},
    composition: null,
    care: null,
    origin: null,
    fit_notes: null,
    measurements: null,
    primary_supplier_id: null,
    primary_supplier_name: null
  };

  it('loads ticked only for a core style', () => {
    expect(styleDetailForm({ ...STYLE, stock_class: 'core' }).isCore).toBe(true);
    expect(styleDetailForm({ ...STYLE, stock_class: 'one_off' }).isCore).toBe(false);
    expect(styleDetailForm({ ...STYLE, stock_class: '' }).isCore).toBe(false);
    expect(styleDetailForm(STYLE).isCore).toBe(false);
  });

  it('is sent only when this session changed it', () => {
    const loaded = styleDetailForm({ ...STYLE, stock_class: 'one_off' });
    expect(styleDetailPayload(loaded, loaded)).toEqual({});
    expect(styleDetailPayload({ ...loaded, isCore: true }, loaded)).toEqual({ is_core: true });
    const core = styleDetailForm({ ...STYLE, stock_class: 'core' });
    expect(styleDetailPayload({ ...core, isCore: false }, core)).toEqual({ is_core: false });
    expect(styleDetailPayload({ ...core, care: 'Wipe clean' }, core)).toEqual({ care: 'Wipe clean' });
  });
});
