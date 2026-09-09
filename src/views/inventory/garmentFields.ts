// views/inventory/garmentFields.ts
//
// The READ side of a garment: what the All Items table and the item detail
// modal show once an item knows its style, size and colour.
//
// Two rules run through the whole file:
//
//   * A missing value is BLANK, never undefined. The item serializer omits a
//     key it has no value for (the QuickBooks-backed rows carry none of these
//     fields), and `undefined` sorts and searches inconsistently against real
//     values while rendering as the word "undefined".
//   * On the style, NULL means NEVER ENTERED and the row is HIDDEN — "" would
//     be indistinguishable from "entered and blank". A boutique that has not
//     recorded a garment's origin should not be shown an empty Origin row.
//
// Pure, and free of axios: `import type` erases, so this stays testable in a
// bare node environment like every other module in this folder.

import type { GarmentAttributes } from 'api/inventoryStock.api';
import type { InventoryItem } from 'types/inventory';

import { ATTRIBUTE_KEYS } from './itemForm';

/** The garment axes and style identity, flattened onto a table row. */
export interface GarmentRowFields {
  style_name: string;
  style_code: string;
  size: string;
  color: string;
}

/** As much of a style as the read surfaces need. `null` for every text field
 * means never entered; `undefined` means the full style has not loaded yet. */
export interface StyleDescription {
  brand?: string | null;
  season?: string | null;
  composition?: string | null;
  care?: string | null;
  origin?: string | null;
  fit_notes?: string | null;
  attributes?: GarmentAttributes | Record<string, string>;
}

const text = (value: unknown): string => (value == null ? '' : String(value).trim());

/**
 * The four fields the table sorts and searches on.
 *
 * Flattened rather than read through a `valueGetter` because the table's
 * search walks the row's own top-level values (ui-component/common/
 * tableSearch.ts): a nested `product` stringifies to "[object Object]" and
 * would be invisible to the search box, and unsortable in the DataGrid.
 */
export const garmentRowFields = (item: Partial<InventoryItem>): GarmentRowFields => ({
  style_name: text(item?.product?.name),
  style_code: text(item?.product?.style_code),
  size: text(item?.size),
  color: text(item?.color)
});

/** Every row as it came, plus the flattened garment fields. */
export const withGarmentFields = <T extends Partial<InventoryItem>>(items: T[]): (T & GarmentRowFields)[] =>
  (items || []).map((item) => ({ ...item, ...garmentRowFields(item) }));

/** The catalogue row for a style. */
export const styleLink = (styleId: string): string => `/inventory/styles?styleId=${styleId}`;

/** One label/value pair in the detail modal's Garment section. */
export interface GarmentDetailRow {
  label: string;
  value: string;
}

/**
 * The Garment section's rows, in reading order, with every never-entered row
 * omitted. An empty array means the section itself should not be rendered.
 *
 * `style` is the full style when it has loaded. Brand and season fall back to
 * the summary the item row already carries, so the section is useful on first
 * paint instead of appearing a request later.
 */
export const garmentDetailRows = (item: Partial<InventoryItem>, style: StyleDescription | null | undefined): GarmentDetailRow[] => {
  const summary = item?.product;

  const candidates: GarmentDetailRow[] = [
    { label: 'Size', value: text(item?.size) },
    { label: 'Color', value: text(item?.color) },
    { label: 'Brand', value: text(style?.brand ?? summary?.brand) },
    { label: 'Season', value: text(style?.season ?? summary?.season) },
    { label: 'Composition', value: text(style?.composition) },
    { label: 'Care', value: text(style?.care) },
    { label: 'Origin', value: text(style?.origin) },
    { label: 'Fit notes', value: text(style?.fit_notes) }
  ];

  return candidates.filter((row) => row.value !== '');
};

/** One chip per entered attribute. */
export interface GarmentAttributeChip {
  key: string;
  label: string;
  value: string;
}

const titleCase = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

/**
 * The style's garment descriptors as chips, in the governed key order rather
 * than whatever order the JSON came back in — so the same style reads the same
 * way every time it is opened.
 *
 * A key outside the governed set is ignored: it cannot have been written
 * through any door this app offers, and the vocabulary has no label for it.
 */
export const garmentAttributeChips = (style: StyleDescription | null | undefined): GarmentAttributeChip[] => {
  const attributes = (style?.attributes || {}) as Record<string, string>;

  return ATTRIBUTE_KEYS.map((key) => ({ key, label: titleCase(key), value: text(attributes[key]) })).filter((chip) => chip.value !== '');
};
