// views/inventory/itemForm.ts
//
// The Add/Edit Item form's rules, as pure functions.
//
// The form is the primary door onto a garment: a boutique owner adding a linen
// shirt has to say which style it belongs to, which size off that style's run,
// and which colour. Deciding WHICH endpoint that becomes — a new style, or one
// more variant on an existing one — and what the body looks like is the whole
// of the interesting logic, so it lives here, free of React, and is tested
// directly. That is the house convention in this folder: every test beside it
// is a pure `.test.ts`, not a render test (see matrix.ts's header).
//
// The types come from api/inventoryStock.api as `import type`, which TypeScript
// erases: this module stays importable without dragging in axios (and, through
// it, sessionStorage), exactly as inventoryStock.query.ts is.

import type { AttributeKey, CreateVariantPayload, GarmentAttributes, ResolvedSizeScale } from 'api/inventoryStock.api';

import { skuToken } from './matrix';

/** Shown when a category has no scale bound — the operator types the size and
 * is told where to bind a run so the next item comes off a list. */
export const NO_SCALE_HELPER = 'No size scale bound to this category — set one under Inventory › Size Scales';

/**
 * The seven governed garment-descriptor keys, in the order the form renders
 * one autocomplete per key. Mirrors backend `inventory/attributes.py`: the KEYS
 * are closed and an eighth is a 400 naming the allowed set, so the form never
 * offers one. The VALUES are free text — `getAttributeVocabulary` returns
 * suggestions, not an enum.
 *
 * Typed as `readonly AttributeKey[]`, so a key added to the shared type
 * without being added here (or vice versa) fails the build rather than
 * quietly rendering six controls.
 */
export const ATTRIBUTE_KEYS: readonly AttributeKey[] = ['material', 'fit', 'pattern', 'length', 'sleeve', 'neckline', 'occasion'] as const;

/** The server's per-value ceiling (`validate_attributes`). */
const ATTRIBUTE_VALUE_MAX = 50;

/**
 * The `{key: value}` object to send, from whatever the controls currently hold.
 *
 * Mirrors the server's `validate_attributes` so the operator never collects a
 * 400 for something the form could see: unknown keys and blank values are
 * dropped, values are trimmed, and a pasted essay is clamped to the length the
 * server accepts. Always an object — `{}` is how the form says "no
 * descriptors", and is what the API returns for the same.
 */
export const sanitizeAttributes = (raw: Record<string, string> | undefined | null): GarmentAttributes => {
  const out: GarmentAttributes = {};
  if (!raw) return out;

  ATTRIBUTE_KEYS.forEach((key) => {
    const value = (raw[key] || '').trim().slice(0, ATTRIBUTE_VALUE_MAX);
    if (value) out[key] = value;
  });

  return out;
};

/** The server's `style_code` ceiling (`ProductCreateSerializer`). */
const STYLE_CODE_MAX = 100;

/**
 * A style code for "New style from this item".
 *
 * `POST /inventory/products/` REQUIRES `style_code` and answers 400 on a
 * collision — the backend's own `mint_style_code` docstring is explicit that
 * the merchant API takes the code from the client and that the register is the
 * only door that mints one. So the form mints, in the shape that minter
 * produces: `VEN-NAME`, from the brand (4) and the name (6), upper-cased and
 * stripped to `[A-Z0-9]`, uniqueness-suffixed.
 *
 * `taken` is the codes already on the company's styles — the form has them
 * from the products list it loads for the Style autocomplete, so the common
 * collision is stepped around before the request rather than after a 400.
 * The server is still the authority: a code minted against a stale list can
 * come back 400, and the caller retries.
 */
export const mintStyleCode = ({ brand, name, taken }: { brand?: string; name: string; taken: string[] }): string => {
  const vendorPart = skuToken(brand || '').slice(0, 4);
  const namePart = skuToken(name || '').slice(0, 6) || 'ITEM';
  const base = [vendorPart, namePart].filter(Boolean).join('-').slice(0, STYLE_CODE_MAX);

  const used = new Set((taken || []).map((code) => (code || '').trim().toUpperCase()));
  if (!used.has(base)) return base;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, STYLE_CODE_MAX - tail.length)}${tail}`;
    if (!used.has(candidate)) return candidate;
  }

  // 998 styles sharing one brand+name prefix is not a real boutique. Fall back
  // to something unique rather than looping — the server will still refuse a
  // genuine collision, and the operator can type their own code.
  return `${base.slice(0, STYLE_CODE_MAX - 14)}-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Every colour the company already uses, for the Color autocomplete.
 *
 * Derived from the products list the form already loads for the Style picker —
 * ALL-189 is explicit that this needs no new endpoint. Free-solo on top of it:
 * a colour the merchant has never used is still a colour.
 *
 * Deduped case-insensitively, keeping the first spelling seen: "ivory" and
 * "Ivory" are one colour to a merchant, and offering both invites two
 * spellings of the same rail.
 */
export const distinctColors = (products: { colors?: string[] }[]): string[] => {
  const seen = new Map<string, string>();

  (products || []).forEach((product) => {
    (product?.colors || []).forEach((raw) => {
      const color = (raw || '').trim();
      if (!color) return;
      const key = color.toLowerCase();
      if (!seen.has(key)) seen.set(key, color);
    });
  });

  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
};

/**
 * The name the server will give the variant: `_create_variant` builds it as
 * the style name, the colour and the size joined by spaces, ignoring whatever
 * the client sent.
 *
 * The form shows this rather than letting the operator type a name that gets
 * silently replaced — on an existing style, the Product Name field has no say.
 */
export const derivedVariantName = (styleName: string, color: string, size: string): string =>
  [styleName, color, size]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');

/** The size/colour half of the edit form. */
export interface GarmentEditState {
  size: string;
  sizeValues: string[];
  color: string;
}

/**
 * The body `PATCH /inventory/items/{id}/` gets from the edit form.
 *
 * `quantity_on_hand` is stripped UNCONDITIONALLY — not only under
 * `metadataOnly`. Two things ride on that: ALL-81, where this path PATCHing the
 * quantity loaded when the modal opened pushed a company-wide total onto the
 * default location; and BarcodeScannerModal, which opens this modal in edit
 * mode WITHOUT `metadataOnly` and so kept that write alive through a second
 * door. Stock moves through "Adjust stock", which records a ledger movement
 * with a reason.
 *
 * `product` is never sent either: the serializer refuses it, and moving a
 * variant between styles is out of scope for v1.
 */
export const buildItemUpdatePayload = (
  form: Record<string, unknown> & { name?: string },
  garment: GarmentEditState
): Record<string, unknown> => {
  const { quantity_on_hand: _neverWritten, product: _notWritable, ...metadata } = form;

  const picked = (garment.sizeValues || []).map((value) => (value || '').trim()).filter(Boolean);

  return {
    ...metadata,
    // '' is accepted and means "no colour"; omitting the key would silently
    // keep whatever was there before.
    color: (garment.color || '').trim(),
    ...(picked.length > 0 ? { size_values: picked } : { size: (garment.size || '').trim() })
  };
};

/** One pickable axis: a label for the control and the values, in scale order. */
export interface SizeAxis {
  label: string;
  values: string[];
}

/**
 * What control the Size field should be, given the scale the server resolved.
 *
 * `select` for a one-axis scale, `composite` for two (Waist × Inseam), `text`
 * when nothing governs the category. The caller renders; this decides.
 */
export type SizeControl =
  | { kind: 'select'; axes: [SizeAxis] }
  | { kind: 'composite'; axes: [SizeAxis, SizeAxis] }
  | { kind: 'text'; helper: string };

/** What the Garment section holds, independent of the flat fields around it. */
export interface GarmentFormState {
  /** The chosen existing style, or null for "New style from this item". */
  styleId: string | null;
  brand: string;
  season: string;
  composition: string;
  care: string;
  origin: string;
  fitNotes: string;
  attributes: Record<string, string>;
  /** Free text, used when no scale governs the category. */
  size: string;
  /** One value per axis, picked off the resolved scale. Wins over `size`. */
  sizeValues: string[];
  color: string;
  /** Style codes already on the company's styles, for minting around. */
  takenStyleCodes: string[];
}

/** The flat fields the form shares with the legacy shape, as far as the two
 * new doors care about them. `quantity_on_hand` is deliberately absent: the
 * opening count travels as `opening_qty` and lands as a ledger movement. */
export interface ItemFormFields {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: string;
  unit_price?: number;
  cost_price?: number;
  opening_qty?: number;
}

/** The body `POST /inventory/products/` expects (`ProductCreateSerializer`).
 * `matrix.toCreatePayload` builds the same thing for a whole grid; this is the
 * one-variant case, plus the style-level description ALL-188 made writable. */
export interface CreateStylePayload {
  name: string;
  style_code: string;
  category: string;
  description: string;
  brand: string;
  season: string;
  composition?: string;
  care?: string;
  origin?: string;
  fit_notes?: string;
  attributes: GarmentAttributes;
  variants: CreateVariantPayload[];
}

/**
 * Which of the two doors this submission goes through, and the body it carries.
 *
 * There are exactly two, and neither is the legacy item-create endpoint: that
 * one knows nothing about styles and writes its opening quantity straight onto
 * the column, skipping the stock ledger (ALL-81).
 */
export type ItemSubmission =
  | { door: 'create_style'; payload: CreateStylePayload }
  | { door: 'add_variant'; productId: string; payload: CreateVariantPayload };

/** The size half of a variant body: `size_values` when the operator picked off
 * a scale, free-text `size` otherwise — never both. Sending a plain string for
 * a scaled style is the silent drift the Unmatched panel exists to report. */
const sizeFieldsFor = (garment: GarmentFormState): Pick<CreateVariantPayload, 'size' | 'size_values'> => {
  const picked = (garment.sizeValues || []).map((value) => (value || '').trim()).filter(Boolean);
  if (picked.length > 0) return { size_values: picked };

  const typed = (garment.size || '').trim();
  return typed ? { size: typed } : {};
};

const variantFor = (form: ItemFormFields, garment: GarmentFormState): CreateVariantPayload => ({
  sku: (form.sku || '').trim(),
  color: (garment.color || '').trim(),
  ...sizeFieldsFor(garment),
  barcode: (form.barcode || '').trim(),
  // Blank price fields mean "not set", which the API reads as 0 — sending ''
  // as a number would be a 400 (matrix.toCreatePayload does the same).
  unit_price: form.unit_price || 0,
  cost_price: form.cost_price || 0,
  opening_qty: form.opening_qty || 0
  // `location` is deliberately absent. AddVariantSerializer.location is a
  // Location UUID; the form's "Location" is the legacy free-text column
  // ("Warehouse A"), and sending it would be a 400. Omitted means the company
  // default, which stock.set_on_hand resolves itself — one place that knows
  // what the default is, which is the serializer's own reasoning.
});

export const planItemSubmission = (form: ItemFormFields, garment: GarmentFormState): ItemSubmission => {
  const variant = variantFor(form, garment);

  if (garment.styleId) {
    // An existing style owns its own description: the Garment details block is
    // read-only against one, and the catalogue is where it is edited. The
    // add-variant body has nowhere to put those fields anyway.
    return { door: 'add_variant', productId: garment.styleId, payload: variant };
  }

  return {
    door: 'create_style',
    payload: {
      name: (form.name || '').trim(),
      style_code: mintStyleCode({ brand: garment.brand, name: form.name, taken: garment.takenStyleCodes }),
      category: (form.category || '').trim(),
      description: (form.description || '').trim(),
      brand: (garment.brand || '').trim(),
      season: (garment.season || '').trim(),
      composition: (garment.composition || '').trim(),
      care: (garment.care || '').trim(),
      origin: (garment.origin || '').trim(),
      fit_notes: (garment.fitNotes || '').trim(),
      attributes: sanitizeAttributes(garment.attributes),
      variants: [variant]
    }
  };
};

const axisAt = (scale: ResolvedSizeScale, index: number): SizeAxis => ({
  label: scale.axis_labels[index] || (index === 0 ? 'Size' : `Axis ${index + 1}`),
  values: scale.values[index] || []
});

export const sizeControlFor = (scale: ResolvedSizeScale | null | undefined): SizeControl => {
  if (!scale) return { kind: 'text', helper: NO_SCALE_HELPER };

  const first = axisAt(scale, 0);
  // A scale every value of which has been deactivated resolves to empty axes.
  // An empty Select is a dead end, so fall through to the text box.
  if (first.values.length === 0) return { kind: 'text', helper: NO_SCALE_HELPER };

  if (scale.axes === 2) {
    const second = axisAt(scale, 1);
    if (second.values.length > 0) return { kind: 'composite', axes: [first, second] };
    return { kind: 'text', helper: NO_SCALE_HELPER };
  }

  return { kind: 'select', axes: [first] };
};
