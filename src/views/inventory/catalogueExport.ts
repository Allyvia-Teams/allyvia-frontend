// views/inventory/catalogueExport.ts
//
// Pure logic behind the style catalogue's CSV/PDF export toolbar (Part 3 of the
// size-scales spec: the catalogue absorbed the flat table's exporters). Axios-free
// by house rule — a test importing api/*.api.ts fails collection — so the types
// here are structural mirrors of api/inventoryStock.api.ts's Product/ProductVariant
// rather than imports of them.
//
// What exports is THE CATALOGUE'S CURRENT FILTERED VIEW: the styles matching the
// search box, flattened to one row per variant. `filterStyles` mirrors the
// backend's search fields exactly (product_views.py: name / style_code / category
// / brand, icontains) so the exported set is the displayed set — description is
// deliberately NOT searched, because the server does not search it either.
//
// MONEY IS NEVER ARITHMETIC'D AS A FLOAT. Prices arrive as decimal strings
// ("12.50"); they are parsed to integer cents, summed as integers, and only
// rendered to dollars at the display boundary. The classic trap this avoids:
// 3 × $0.10 must be "$0.30", not 0.30000000000000004.

import { stockSeverity } from './stockFormat';

// ---------------------------------------------------------------------------
// Structural types (compatible with Product / ProductVariant from the API)
// ---------------------------------------------------------------------------

export interface CatalogueVariantLike {
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  barcode: string | null;
  /** Decimal string from the API, e.g. "12.50". */
  unit_price: string;
  cost_price: string;
  quantity_on_hand: number;
  reorder_point: number | null;
  is_active: boolean;
}

export interface CatalogueStyleLike {
  id: string;
  name: string;
  style_code: string;
  category: string;
  brand: string;
  season: string;
  status: string;
  variants: CatalogueVariantLike[];
}

// ---------------------------------------------------------------------------
// Money: integer cents in, integer cents through, string out
// ---------------------------------------------------------------------------

/**
 * Parse a decimal money string to integer cents, rounding half-up on the third
 * fractional digit (the backend's money convention). Returns null for anything
 * unparseable — an unknown price must not silently become $0.00 arithmetic, so
 * callers decide what null means (the value KPI counts it as contributing 0 and
 * that choice is written there, not hidden here).
 */
export const parseMoneyCents = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  // Number input takes the shortest-round-trip string road so no float
  // arithmetic ever happens on it.
  const raw = typeof value === 'number' ? String(value) : value.trim();
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(raw);
  if (!match) return null;
  const [, sign, whole, frac = ''] = match;
  const centsPart = Number(frac.padEnd(2, '0').slice(0, 2));
  let cents = Number(whole) * 100 + centsPart;
  // Half-up on the digit after the cents place: "12.505" is 1251, not 1250.
  if (frac.length > 2 && Number(frac[2]) >= 5) cents += 1;
  return sign === '-' ? -cents : cents;
};

/** Render integer cents as USD without ever dividing into a float. */
export const formatCentsUSD = (cents: number): string => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100); // exact: both operands are integers
  const rem = abs % 100;
  return `${sign}$${dollars.toLocaleString('en-US')}.${String(rem).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// The filter (client mirror of the server's search)
// ---------------------------------------------------------------------------

/**
 * Case-insensitive substring match over exactly the fields the backend searches:
 * name, style_code, category, brand. An empty/blank search keeps everything.
 */
export const filterStyles = <T extends Pick<CatalogueStyleLike, 'name' | 'style_code' | 'category' | 'brand'>>(
  styles: T[],
  search: string
): T[] => {
  const needle = (search ?? '').trim().toLowerCase();
  if (!needle) return styles;
  return styles.filter((style) =>
    [style.name, style.style_code, style.category, style.brand].some((field) => (field ?? '').toLowerCase().includes(needle))
  );
};

// ---------------------------------------------------------------------------
// CSV rows
// ---------------------------------------------------------------------------

/**
 * One row per variant. Key names line up with exportInventoryCsv.ts's preferred
 * ordering (sku, name, barcode, category, quantity_on_hand, reorder_point,
 * unit_price, cost_price, status) so the reused exporter columns them exactly as
 * it always has; the style-grain fields ride along as extra columns.
 */
export interface CatalogueExportRow {
  sku: string | null;
  name: string;
  barcode: string | null;
  category: string;
  quantity_on_hand: number;
  reorder_point: number | null;
  unit_price: string;
  cost_price: string;
  status: string;
  style: string;
  style_code: string;
  brand: string;
  season: string;
  size: string;
  color: string;
}

/**
 * The exact header list downloadInventoryTableCsv derives from these rows
 * (preferred-order intersection first, remaining keys alphabetically). Exported
 * so an empty filtered view can still download a header row instead of nothing.
 */
export const CATALOGUE_EXPORT_HEADERS: readonly string[] = [
  'sku',
  'name',
  'barcode',
  'category',
  'quantity_on_hand',
  'reorder_point',
  'unit_price',
  'cost_price',
  'status',
  'brand',
  'color',
  'season',
  'size',
  'style',
  'style_code'
];

export const flattenStylesToExportRows = (styles: CatalogueStyleLike[]): CatalogueExportRow[] =>
  styles.flatMap((style) =>
    style.variants.map((variant) => ({
      sku: variant.sku,
      name: variant.name,
      barcode: variant.barcode,
      category: style.category,
      quantity_on_hand: variant.quantity_on_hand,
      reorder_point: variant.reorder_point,
      unit_price: variant.unit_price,
      cost_price: variant.cost_price,
      status: variant.is_active ? 'active' : 'inactive',
      style: style.name,
      style_code: style.style_code,
      brand: style.brand,
      season: style.season,
      size: variant.size,
      color: variant.color
    }))
  );

// ---------------------------------------------------------------------------
// PDF report data (the shape downloadInventoryPdf expects)
// ---------------------------------------------------------------------------

export interface CataloguePdfKpi {
  label: string;
  value: string | number;
}

export interface CataloguePdfCategoryRow {
  category: string;
  total_quantity: number;
  /** Dollars for display; derived from an integer-cents sum, never float math. */
  total_value: number;
  percentage: number;
}

export interface CataloguePdfAlertRow {
  name: string;
  sku: string;
  qty: number;
  reorder_point?: number;
}

export interface CataloguePdfData {
  kpis: CataloguePdfKpi[];
  categories: CataloguePdfCategoryRow[];
  alerts: CataloguePdfAlertRow[];
}

const UNCATEGORISED = 'Uncategorised';

/** Integer cents → dollars NUMBER for the PDF exporter's numeric fields. The
 * arithmetic all happened in integer cents; this single conversion is display
 * only, and cents/100 round-trips exactly through JS's shortest-repr printing. */
const centsToDisplayDollars = (cents: number): number => cents / 100;

export const buildCataloguePdfData = (styles: CatalogueStyleLike[]): CataloguePdfData => {
  const variants = styles.flatMap((style) => style.variants.map((variant) => ({ style, variant })));

  let totalOnHand = 0;
  let totalValueCents = 0;
  let lowStock = 0;
  let outOfStock = 0;
  const alerts: CataloguePdfAlertRow[] = [];
  const categoryMap = new Map<string, { total_quantity: number; cents: number }>();

  for (const { style, variant } of variants) {
    const qty = variant.quantity_on_hand || 0;
    totalOnHand += qty;

    // An unparseable price contributes 0 to value — the honest alternative would
    // be a poisoned NaN total, which helps nobody reading a printed report.
    const unitCents = parseMoneyCents(variant.unit_price) ?? 0;
    const valueCents = unitCents * qty;
    totalValueCents += valueCents;

    const severity = stockSeverity(qty, variant.reorder_point);
    if (severity === 'out') outOfStock += 1;
    if (severity === 'low') lowStock += 1;
    if (severity !== 'ok') {
      alerts.push({
        name: variant.name,
        sku: variant.sku ?? '',
        qty,
        reorder_point: variant.reorder_point ?? undefined
      });
    }

    const category = style.category || UNCATEGORISED;
    const bucket = categoryMap.get(category) ?? { total_quantity: 0, cents: 0 };
    bucket.total_quantity += qty;
    bucket.cents += valueCents;
    categoryMap.set(category, bucket);
  }

  const categories: CataloguePdfCategoryRow[] = Array.from(categoryMap.entries()).map(([category, bucket]) => ({
    category,
    total_quantity: bucket.total_quantity,
    total_value: centsToDisplayDollars(bucket.cents),
    // A ratio, not money — float division is fine here.
    percentage: totalValueCents > 0 ? (bucket.cents / totalValueCents) * 100 : 0
  }));

  return {
    kpis: [
      { label: 'Styles', value: styles.length },
      { label: 'Variants', value: variants.length },
      { label: 'Total On Hand', value: totalOnHand },
      { label: 'Out of Stock', value: outOfStock },
      { label: 'Low Stock', value: lowStock },
      { label: 'Inventory Value', value: formatCentsUSD(totalValueCents) }
    ],
    categories,
    alerts
  };
};
