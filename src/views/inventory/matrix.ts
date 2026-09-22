// views/inventory/matrix.ts
//
// The size x colour matrix, as pure functions.
//
// A buyer creating a style thinks in a grid: these four sizes, these three
// colours, twelve variants. This module turns that grid into the variant list the
// API needs, and it is deliberately free of React so the generation rules can be
// tested directly — which is the house convention here (every existing test in
// this repo is a pure `.test.ts`, not a render test).
//
// SKU SUGGESTION, AND WHY IT IS ONLY A SUGGESTION
// The pattern is STYLE-COLOUR-SIZE, upper-cased and punctuation-stripped, because
// that is what a boutique's existing labels almost always look like. But every
// generated SKU stays EDITABLE: a supplier's own codes win over ours, and a shop
// that has been using "LS100/IVO/S" for ten years is not going to renumber its
// stockroom because our generator prefers hyphens.

export interface MatrixAxis {
  sizes: string[];
  colors: string[];
}

export interface GeneratedVariant {
  /** Stable key for React lists and for cell lookup. */
  key: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  unitPrice: string;
  costPrice: string;
  openingQty: number;
  /** True once a human has edited the SKU, so regeneration leaves it alone. */
  skuEdited: boolean;
}

export interface MatrixDefaults {
  unitPrice?: string;
  costPrice?: string;
  openingQty?: number;
}

/** Strip anything that would make a SKU awkward to type or scan. */
export const skuToken = (value: string): string =>
  (value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

/**
 * STYLE-COLOUR-SIZE, with empty axes simply omitted.
 *
 * A single-variant product (no sizes, no colours) gets the bare style code rather
 * than "LS100--", which is the common case for the backfilled majority and must
 * not look mangled.
 */
export const suggestSku = (styleCode: string, color: string, size: string): string =>
  [skuToken(styleCode), skuToken(color), skuToken(size)].filter(Boolean).join('-');

/** Trim, drop blanks, de-duplicate case-insensitively, preserve entry order. */
export const normalizeAxis = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  (values || []).forEach((raw) => {
    const value = (raw || '').trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(value);
  });
  return out;
};

/** Parse a comma/newline separated axis, as typed into a free-text field. */
export const parseAxisInput = (input: string): string[] => normalizeAxis((input || '').split(/[,\n]/));

export const cellKey = (color: string, size: string): string => `${color}::${size}`;

/**
 * The cartesian product, ordered colour-major.
 *
 * Colour-major because that is how a rail is merchandised and how a line sheet
 * reads: all the ivory, then all the slate. Size-major would scatter one colour
 * across the grid.
 *
 * `existing` preserves any cell a human has already touched — regenerating after
 * adding a fifth size must not wipe the prices typed into the first twelve cells.
 */
export const generateMatrix = (
  styleCode: string,
  axis: MatrixAxis,
  defaults: MatrixDefaults = {},
  existing: GeneratedVariant[] = []
): GeneratedVariant[] => {
  const sizes = normalizeAxis(axis.sizes);
  const colors = normalizeAxis(axis.colors);
  const previous = new Map(existing.map((variant) => [variant.key, variant]));

  // No axes at all is a single-variant product, not an empty grid.
  const effectiveColors = colors.length ? colors : [''];
  const effectiveSizes = sizes.length ? sizes : [''];

  const out: GeneratedVariant[] = [];
  effectiveColors.forEach((color) => {
    effectiveSizes.forEach((size) => {
      const key = cellKey(color, size);
      const kept = previous.get(key);
      out.push({
        key,
        size,
        color,
        // A hand-edited SKU survives regeneration; an untouched one follows the
        // style code, so renaming the style renumbers the grid.
        sku: kept?.skuEdited ? kept.sku : suggestSku(styleCode, color, size),
        skuEdited: kept?.skuEdited ?? false,
        barcode: kept?.barcode ?? '',
        unitPrice: kept?.unitPrice ?? defaults.unitPrice ?? '',
        costPrice: kept?.costPrice ?? defaults.costPrice ?? '',
        openingQty: kept?.openingQty ?? defaults.openingQty ?? 0
      });
    });
  });
  return out;
};

export interface MatrixValidation {
  valid: boolean;
  errors: string[];
  duplicateSkus: string[];
  blankSkus: string[];
}

/**
 * What must be true before the grid can be submitted.
 *
 * Duplicate SKUs are caught here rather than at the API, because the API rejects
 * the whole grid and a buyer who has filled in twenty cells deserves to be told
 * which two clash before losing the lot.
 */
export const validateMatrix = (variants: GeneratedVariant[]): MatrixValidation => {
  const errors: string[] = [];
  const skus = variants.map((variant) => variant.sku.trim());

  const blankSkus = variants.filter((variant) => !variant.sku.trim()).map((variant) => variant.key);
  if (blankSkus.length) {
    errors.push(`${blankSkus.length} variant(s) have no SKU.`);
  }

  const counts = new Map<string, number>();
  skus.filter(Boolean).forEach((sku) => counts.set(sku, (counts.get(sku) ?? 0) + 1));
  const duplicateSkus = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sku]) => sku)
    .sort();
  if (duplicateSkus.length) {
    errors.push(`Duplicate SKU(s): ${duplicateSkus.join(', ')}`);
  }

  if (!variants.length) {
    errors.push('Add at least one size or colour to generate variants.');
  }

  variants.forEach((variant) => {
    if (variant.openingQty < 0) {
      errors.push(`Opening quantity cannot be negative (${variant.sku || variant.key}).`);
    }
  });

  return { valid: errors.length === 0, errors, duplicateSkus, blankSkus };
};

/** The payload shape POST /inventory/products/ expects. */
export const toCreatePayload = (
  style: { name: string; styleCode: string; category?: string; brand?: string; season?: string; description?: string },
  variants: GeneratedVariant[]
) => ({
  name: style.name.trim(),
  style_code: style.styleCode.trim(),
  category: (style.category || '').trim(),
  brand: (style.brand || '').trim(),
  season: (style.season || '').trim(),
  description: (style.description || '').trim(),
  variants: variants.map((variant) => ({
    sku: variant.sku.trim(),
    size: variant.size,
    color: variant.color,
    barcode: variant.barcode.trim(),
    // Blank price fields mean "not set", which the API reads as 0 — sending '' as
    // a number would be a 400.
    unit_price: variant.unitPrice.trim() === '' ? 0 : Number(variant.unitPrice),
    cost_price: variant.costPrice.trim() === '' ? 0 : Number(variant.costPrice),
    opening_qty: variant.openingQty
  }))
});

/**
 * Group variants into grid rows for display: one row per colour, cells by size.
 *
 * Returns the axes it actually found rather than the ones requested, so a style
 * whose variants were created before the matrix existed still renders.
 */
export const toGrid = <T extends { size: string; color: string }>(variants: T[]) => {
  const sizes = normalizeAxis(variants.map((variant) => variant.size));
  const colors = normalizeAxis(variants.map((variant) => variant.color));
  const byCell = new Map<string, T>();
  variants.forEach((variant) => byCell.set(cellKey(variant.color, variant.size), variant));
  return {
    sizes,
    colors,
    cell: (color: string, size: string) => byCell.get(cellKey(color, size)),
    // A style with no size/colour axes is a list, not a grid; the caller renders
    // it as a simple form instead.
    isGrid: sizes.length > 0 && colors.length > 0
  };
};
