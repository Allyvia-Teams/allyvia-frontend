import { describe, expect, it } from 'vitest';

import {
  GeneratedVariant,
  cellKey,
  generateMatrix,
  normalizeAxis,
  parseAxisInput,
  skuToken,
  suggestSku,
  toCreatePayload,
  toGrid,
  validateMatrix
} from './matrix';

describe('skuToken', () => {
  it('upper-cases and strips punctuation so SKUs are typeable and scannable', () => {
    expect(skuToken('Ivory')).toBe('IVORY');
    expect(skuToken('off-white')).toBe('OFFWHITE');
    expect(skuToken(' XS / S ')).toBe('XSS');
    expect(skuToken('')).toBe('');
  });
});

describe('suggestSku', () => {
  it('follows STYLE-COLOUR-SIZE', () => {
    expect(suggestSku('LS-100', 'Ivory', 'M')).toBe('LS100-IVORY-M');
  });

  it('omits empty axes rather than leaving dangling separators', () => {
    // The backfilled majority are single-variant products; "LS100--" would look
    // mangled on every one of them.
    expect(suggestSku('LS-100', '', '')).toBe('LS100');
    expect(suggestSku('LS-100', 'Ivory', '')).toBe('LS100-IVORY');
    expect(suggestSku('LS-100', '', 'M')).toBe('LS100-M');
  });
});

describe('normalizeAxis', () => {
  it('trims, drops blanks, and de-duplicates case-insensitively', () => {
    expect(normalizeAxis([' S ', 'M', '', 's', 'L', 'M'])).toEqual(['S', 'M', 'L']);
  });

  it('preserves entry order, because a size run is not alphabetical', () => {
    // XS,S,M,L,XL sorted alphabetically is L,M,S,XL,XS — useless on a size curve.
    expect(normalizeAxis(['XS', 'S', 'M', 'L', 'XL'])).toEqual(['XS', 'S', 'M', 'L', 'XL']);
  });
});

describe('parseAxisInput', () => {
  it('accepts commas and newlines', () => {
    expect(parseAxisInput('S, M\nL')).toEqual(['S', 'M', 'L']);
    expect(parseAxisInput('')).toEqual([]);
    expect(parseAxisInput(' , , ')).toEqual([]);
  });
});

describe('generateMatrix', () => {
  it('produces the full cartesian product, colour-major', () => {
    const variants = generateMatrix('LS-100', { sizes: ['S', 'M'], colors: ['Ivory', 'Slate'] });

    expect(variants).toHaveLength(4);
    // Colour-major: all the ivory, then all the slate — how a rail is merchandised.
    expect(variants.map((v) => `${v.color}/${v.size}`)).toEqual(['Ivory/S', 'Ivory/M', 'Slate/S', 'Slate/M']);
    expect(variants.map((v) => v.sku)).toEqual(['LS100-IVORY-S', 'LS100-IVORY-M', 'LS100-SLATE-S', 'LS100-SLATE-M']);
  });

  it('treats no axes as a single-variant product, not an empty grid', () => {
    const variants = generateMatrix('LS-100', { sizes: [], colors: [] });
    expect(variants).toHaveLength(1);
    expect(variants[0].sku).toBe('LS100');
    expect(variants[0].size).toBe('');
    expect(variants[0].color).toBe('');
  });

  it('handles one axis only', () => {
    const sizesOnly = generateMatrix('LS-100', { sizes: ['S', 'M', 'L'], colors: [] });
    expect(sizesOnly.map((v) => v.sku)).toEqual(['LS100-S', 'LS100-M', 'LS100-L']);

    const colorsOnly = generateMatrix('LS-100', { sizes: [], colors: ['Ivory', 'Slate'] });
    expect(colorsOnly.map((v) => v.sku)).toEqual(['LS100-IVORY', 'LS100-SLATE']);
  });

  it('applies defaults to every cell', () => {
    const variants = generateMatrix(
      'LS-100',
      { sizes: ['S'], colors: ['Ivory'] },
      { unitPrice: '120.00', costPrice: '48.00', openingQty: 3 }
    );
    expect(variants[0]).toMatchObject({ unitPrice: '120.00', costPrice: '48.00', openingQty: 3 });
  });

  it('preserves cells a human has already filled in when the grid grows', () => {
    // Adding a size must not wipe the prices typed into the existing cells.
    const first = generateMatrix('LS-100', { sizes: ['S'], colors: ['Ivory'] });
    const edited: GeneratedVariant[] = [{ ...first[0], unitPrice: '99.00', openingQty: 7 }];

    const grown = generateMatrix('LS-100', { sizes: ['S', 'M'], colors: ['Ivory'] }, {}, edited);

    expect(grown).toHaveLength(2);
    const kept = grown.find((v) => v.key === cellKey('Ivory', 'S'));
    expect(kept).toMatchObject({ unitPrice: '99.00', openingQty: 7 });
  });

  it('renumbers untouched SKUs when the style code changes, but keeps edited ones', () => {
    const initial = generateMatrix('LS-100', { sizes: ['S', 'M'], colors: ['Ivory'] });
    const withEdit: GeneratedVariant[] = [{ ...initial[0], sku: 'SUPPLIER-OWN-CODE', skuEdited: true }, initial[1]];

    const renamed = generateMatrix('WC-200', { sizes: ['S', 'M'], colors: ['Ivory'] }, {}, withEdit);

    // A supplier's own code survives; ours follows the style.
    expect(renamed[0].sku).toBe('SUPPLIER-OWN-CODE');
    expect(renamed[1].sku).toBe('WC200-IVORY-M');
  });
});

describe('validateMatrix', () => {
  const variant = (over: Partial<GeneratedVariant> = {}): GeneratedVariant => ({
    key: over.key ?? cellKey(over.color ?? 'Ivory', over.size ?? 'S'),
    size: over.size ?? 'S',
    color: over.color ?? 'Ivory',
    sku: over.sku ?? 'LS100-IVORY-S',
    barcode: over.barcode ?? '',
    unitPrice: over.unitPrice ?? '',
    costPrice: over.costPrice ?? '',
    openingQty: over.openingQty ?? 0,
    skuEdited: over.skuEdited ?? false
  });

  it('accepts a well-formed grid', () => {
    const result = validateMatrix([variant(), variant({ size: 'M', sku: 'LS100-IVORY-M' })]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('names duplicate SKUs, because the API rejects the whole grid', () => {
    const result = validateMatrix([variant(), variant({ size: 'M', sku: 'LS100-IVORY-S' })]);
    expect(result.valid).toBe(false);
    expect(result.duplicateSkus).toEqual(['LS100-IVORY-S']);
    expect(result.errors.join(' ')).toContain('Duplicate SKU');
  });

  it('rejects blank SKUs', () => {
    const result = validateMatrix([variant({ sku: '   ' })]);
    expect(result.valid).toBe(false);
    expect(result.blankSkus).toHaveLength(1);
  });

  it('rejects an empty grid with a message that says what to do', () => {
    const result = validateMatrix([]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('at least one size or colour');
  });

  it('rejects a negative opening quantity', () => {
    const result = validateMatrix([variant({ openingQty: -1 })]);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('cannot be negative');
  });
});

describe('toCreatePayload', () => {
  it('maps to the API shape and coerces blank prices to 0 rather than sending ""', () => {
    const variants = generateMatrix('LS-100', { sizes: ['S'], colors: ['Ivory'] }, { openingQty: 4 });
    const payload = toCreatePayload(
      { name: ' Linen Shirt ', styleCode: ' LS-100 ', category: 'Tops', brand: 'Nord', season: 'SS26' },
      variants
    );

    expect(payload.name).toBe('Linen Shirt');
    expect(payload.style_code).toBe('LS-100');
    expect(payload.variants).toEqual([
      {
        sku: 'LS100-IVORY-S',
        size: 'S',
        color: 'Ivory',
        barcode: '',
        // '' would be a 400 from a DecimalField.
        unit_price: 0,
        cost_price: 0,
        opening_qty: 4
      }
    ]);
  });

  it('passes numeric prices through', () => {
    const variants = generateMatrix('LS-100', { sizes: ['S'], colors: [] }, { unitPrice: '120.50', costPrice: '48' });
    const payload = toCreatePayload({ name: 'Shirt', styleCode: 'LS-100' }, variants);
    expect(payload.variants[0].unit_price).toBe(120.5);
    expect(payload.variants[0].cost_price).toBe(48);
  });
});

describe('toGrid', () => {
  it('exposes axes and cell lookup for rendering an existing style', () => {
    const grid = toGrid([
      { size: 'S', color: 'Ivory', sku: 'A' },
      { size: 'M', color: 'Ivory', sku: 'B' },
      { size: 'M', color: 'Slate', sku: 'C' }
    ]);

    expect(grid.sizes).toEqual(['S', 'M']);
    expect(grid.colors).toEqual(['Ivory', 'Slate']);
    expect(grid.cell('Ivory', 'M')).toMatchObject({ sku: 'B' });
    // A gap in the matrix is a real thing — that size/colour was never bought.
    expect(grid.cell('Slate', 'S')).toBeUndefined();
    expect(grid.isGrid).toBe(true);
  });

  it('reports isGrid false for a single-variant style so it renders as a form', () => {
    const grid = toGrid([{ size: '', color: '', sku: 'ONLY' }]);
    expect(grid.isGrid).toBe(false);
    expect(grid.sizes).toEqual([]);
    expect(grid.colors).toEqual([]);
  });
});
