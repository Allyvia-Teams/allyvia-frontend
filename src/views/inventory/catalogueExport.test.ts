import { describe, expect, it } from 'vitest';

import {
  CATALOGUE_EXPORT_HEADERS,
  CatalogueStyleLike,
  CatalogueVariantLike,
  buildCataloguePdfData,
  filterStyles,
  flattenStylesToExportRows,
  formatCentsUSD,
  parseMoneyCents
} from './catalogueExport';

const variant = (overrides: Partial<CatalogueVariantLike> = {}): CatalogueVariantLike => ({
  inventory_item_id: 1,
  sku: 'SKU-1',
  name: 'Linen Shirt - M / Blue',
  size: 'M',
  color: 'Blue',
  barcode: '123456789012',
  unit_price: '45.00',
  cost_price: '20.00',
  quantity_on_hand: 5,
  reorder_point: 2,
  is_active: true,
  ...overrides
});

const style = (overrides: Partial<CatalogueStyleLike> = {}): CatalogueStyleLike => ({
  id: 'style-1',
  name: 'Linen Shirt',
  style_code: 'LS-100',
  category: 'Shirts',
  brand: 'Acme',
  season: 'SS26',
  status: 'active',
  variants: [variant()],
  ...overrides
});

describe('parseMoneyCents', () => {
  it('parses decimal strings to integer cents without float arithmetic', () => {
    expect(parseMoneyCents('12.50')).toBe(1250);
    expect(parseMoneyCents('12.5')).toBe(1250);
    expect(parseMoneyCents('12')).toBe(1200);
    expect(parseMoneyCents('0.99')).toBe(99);
    expect(parseMoneyCents('12.5000')).toBe(1250);
    expect(parseMoneyCents('-3.25')).toBe(-325);
  });

  it('rounds half-up on the third fractional digit — 12.505 is 1251, and the truncation answer 1250 is WRONG', () => {
    expect(parseMoneyCents('12.505')).toBe(1251);
    expect(parseMoneyCents('12.505')).not.toBe(1250);
    // Below the half line stays down.
    expect(parseMoneyCents('12.5049')).toBe(1250);
  });

  it('half-up is decided on the STRING, not on a double — "8.995" is 900, and the float answer 899 is WRONG', () => {
    // Math.round(Number('8.995') * 100) === 899 because the double for 8.995 is
    // 8.99499999999999957… — the exact bug a float shortcut reintroduces.
    expect(parseMoneyCents('8.995')).toBe(900);
    expect(parseMoneyCents('0.615')).toBe(62);
    expect(parseMoneyCents('1.005')).toBe(101);
  });

  it('returns null for the unparseable rather than a confident zero', () => {
    expect(parseMoneyCents('')).toBeNull();
    expect(parseMoneyCents('  ')).toBeNull();
    expect(parseMoneyCents('abc')).toBeNull();
    expect(parseMoneyCents('1,234.50')).toBeNull();
    expect(parseMoneyCents(null)).toBeNull();
    expect(parseMoneyCents(undefined)).toBeNull();
  });

  it('takes number input through its string representation, never float math', () => {
    expect(parseMoneyCents(12.5)).toBe(1250);
    expect(parseMoneyCents(0)).toBe(0);
  });
});

describe('formatCentsUSD', () => {
  it('renders integer cents as dollars with grouping and always two decimals', () => {
    expect(formatCentsUSD(30)).toBe('$0.30');
    expect(formatCentsUSD(1250)).toBe('$12.50');
    expect(formatCentsUSD(123456789)).toBe('$1,234,567.89');
    expect(formatCentsUSD(0)).toBe('$0.00');
    expect(formatCentsUSD(-99)).toBe('-$0.99');
  });
});

describe('filterStyles', () => {
  const shirts = style({ id: 'a', name: 'Linen Shirt', style_code: 'LS-100', category: 'Shirts', brand: 'Acme' });
  const jeans = style({ id: 'b', name: 'Selvedge Jean', style_code: 'SJ-200', category: 'Denim', brand: 'Bravo' });

  it('matches case-insensitively across name, style_code, category and brand — the same four fields the server searches', () => {
    expect(filterStyles([shirts, jeans], 'linen').map((s) => s.id)).toEqual(['a']);
    expect(filterStyles([shirts, jeans], 'sj-2').map((s) => s.id)).toEqual(['b']);
    expect(filterStyles([shirts, jeans], 'DENIM').map((s) => s.id)).toEqual(['b']);
    expect(filterStyles([shirts, jeans], 'acme').map((s) => s.id)).toEqual(['a']);
  });

  it('keeps everything on a blank search', () => {
    expect(filterStyles([shirts, jeans], '')).toHaveLength(2);
    expect(filterStyles([shirts, jeans], '   ')).toHaveLength(2);
  });

  it('does NOT search fields the server does not — a description-only match would diverge export from display', () => {
    const withDescription = { ...shirts, description: 'gossamer weave' } as CatalogueStyleLike & { description: string };
    expect(filterStyles([withDescription], 'gossamer')).toHaveLength(0);
  });
});

describe('flattenStylesToExportRows', () => {
  it('respects the current filter: only the matching style’s variants export', () => {
    const kept = style({ id: 'a', name: 'Linen Shirt', variants: [variant({ sku: 'KEEP-1' }), variant({ sku: 'KEEP-2' })] });
    const dropped = style({
      id: 'b',
      name: 'Selvedge Jean',
      style_code: 'SJ',
      category: 'Denim',
      brand: 'B',
      variants: [variant({ sku: 'DROP-1' })]
    });

    const rows = flattenStylesToExportRows(filterStyles([kept, dropped], 'linen'));
    expect(rows.map((r) => r.sku)).toEqual(['KEEP-1', 'KEEP-2']);
  });

  it('carries the style-grain fields onto every variant row, alongside the keys the exporters expect', () => {
    const rows = flattenStylesToExportRows([style()]);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    // Style fields ride along on the variant row.
    expect(row.style).toBe('Linen Shirt');
    expect(row.style_code).toBe('LS-100');
    expect(row.category).toBe('Shirts');
    expect(row.brand).toBe('Acme');
    expect(row.season).toBe('SS26');
    // Exporter-facing keys, values from the variant.
    expect(row.name).toBe('Linen Shirt - M / Blue');
    expect(row.sku).toBe('SKU-1');
    expect(row.quantity_on_hand).toBe(5);
    expect(row.unit_price).toBe('45.00');
    expect(row.status).toBe('active');
  });

  it('marks inactive variants inactive rather than dropping them — the catalogue displays them, so the export must too', () => {
    const rows = flattenStylesToExportRows([style({ variants: [variant({ is_active: false })] })]);
    expect(rows[0].status).toBe('inactive');
  });

  it('every row carries exactly the documented header set, so the reused CSV exporter derives stable columns', () => {
    const rows = flattenStylesToExportRows([style()]);
    expect(Object.keys(rows[0]).sort()).toEqual([...CATALOGUE_EXPORT_HEADERS].sort());
  });

  it('an empty filter result yields zero rows and a non-empty header list — headers, not a crash', () => {
    expect(flattenStylesToExportRows([])).toEqual([]);
    expect(CATALOGUE_EXPORT_HEADERS.length).toBeGreaterThan(0);
  });
});

describe('buildCataloguePdfData', () => {
  it('sums inventory value in integer cents: 3 × $0.10 is exactly $0.30, not the float answer', () => {
    const data = buildCataloguePdfData([style({ variants: [variant({ unit_price: '0.10', quantity_on_hand: 3, reorder_point: null })] })]);
    const valueKpi = data.kpis.find((k) => k.label === 'Inventory Value');
    expect(valueKpi?.value).toBe('$0.30');
    // Pin the float trap this exists to avoid.
    expect(String(0.1 * 3)).toBe('0.30000000000000004');
  });

  it('classifies severity through stockSeverity: zero is out even with no reorder point, and no reorder point never means low', () => {
    const data = buildCataloguePdfData([
      style({
        variants: [
          variant({ sku: 'OUT', quantity_on_hand: 0, reorder_point: null }),
          variant({ sku: 'OK', quantity_on_hand: 5, reorder_point: null }),
          variant({ sku: 'LOW', quantity_on_hand: 2, reorder_point: 2 })
        ]
      })
    ]);
    expect(data.kpis.find((k) => k.label === 'Out of Stock')?.value).toBe(1);
    expect(data.kpis.find((k) => k.label === 'Low Stock')?.value).toBe(1);
    expect(data.alerts.map((a) => a.sku).sort()).toEqual(['LOW', 'OUT']);
    // The WRONG answer: inventing a reorder point of 0 for the OK variant and
    // calling it low. quantity 5 with no threshold is simply ok.
    expect(data.alerts.some((a) => a.sku === 'OK')).toBe(false);
  });

  it('groups category totals by the style’s category, bucketing blanks as Uncategorised, with percentages of total value', () => {
    const data = buildCataloguePdfData([
      style({ category: 'Shirts', variants: [variant({ unit_price: '10.00', quantity_on_hand: 3, reorder_point: null })] }),
      style({ id: 'x', category: '', variants: [variant({ unit_price: '10.00', quantity_on_hand: 1, reorder_point: null })] })
    ]);
    expect(data.categories).toHaveLength(2);
    const shirts = data.categories.find((c) => c.category === 'Shirts');
    const uncat = data.categories.find((c) => c.category === 'Uncategorised');
    expect(shirts).toMatchObject({ total_quantity: 3, total_value: 30 });
    expect(uncat).toMatchObject({ total_quantity: 1, total_value: 10 });
    expect(shirts?.percentage).toBe(75);
    expect(uncat?.percentage).toBe(25);
  });

  it('an unparseable price contributes zero to value instead of poisoning the total with NaN', () => {
    const data = buildCataloguePdfData([
      style({
        variants: [
          variant({ unit_price: 'not-a-price', quantity_on_hand: 2, reorder_point: null }),
          variant({ unit_price: '5.00', quantity_on_hand: 1, reorder_point: null })
        ]
      })
    ]);
    expect(data.kpis.find((k) => k.label === 'Inventory Value')?.value).toBe('$5.00');
  });

  it('an empty catalogue produces zeroed KPIs and empty tables — the PDF renders, it does not crash', () => {
    const data = buildCataloguePdfData([]);
    expect(data.kpis.find((k) => k.label === 'Styles')?.value).toBe(0);
    expect(data.kpis.find((k) => k.label === 'Inventory Value')?.value).toBe('$0.00');
    expect(data.categories).toEqual([]);
    expect(data.alerts).toEqual([]);
  });

  it('counts styles and variants at their own grains — 2 styles with 3 variants total is 2 and 3, not 3 and 3', () => {
    const data = buildCataloguePdfData([
      style({ variants: [variant(), variant({ sku: 'SKU-2' })] }),
      style({ id: 'y', variants: [variant({ sku: 'SKU-3' })] })
    ]);
    expect(data.kpis.find((k) => k.label === 'Styles')?.value).toBe(2);
    expect(data.kpis.find((k) => k.label === 'Variants')?.value).toBe(3);
  });
});
