// api/inventoryStock.api.ts
//
// The stock-model endpoints added by the inventory initiative: styles and their
// variant matrix, per-location stock, manual adjustments, movement history, and
// location management.
//
// Kept separate from api/inventory.api.ts, which serves the pre-existing flat item
// catalogue and its QuickBooks sync. Same axios instance and the same implicit
// company scoping (the X-Role-ID header, attached by utils/axios) — a client that
// passed company_id explicitly would be re-introducing the IDOR class the
// finance-metrics work closed.

import axiosServices from 'utils/axios';

import { MovementFilters, buildMovementQuery } from './inventoryStock.query';

const BASE_URL = '/inventory';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Location {
  id: string;
  name: string;
  address: Record<string, unknown>;
  stripe_terminal_location_id: string | null;
  stripe_terminal_display_name: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  /** Only present on the DELETE (deactivate) response. */
  units_remaining?: number;
}

export interface StockLevel {
  location_id: string;
  location_name: string;
  is_default: boolean;
  quantity_on_hand: number;
}

export interface ItemStockResponse {
  inventory_item_id: number;
  sku: string | null;
  name: string;
  total: number;
  levels_total: number;
  levels: StockLevel[];
  in_transit: number;
  on_order: number;
}

export interface StockMovementRow {
  id: string;
  created_at: string;
  reason: string;
  reason_label: string;
  delta: number;
  quantity_after: number;
  unit_cost: string | null;
  location_id: string | null;
  location_name: string | null;
  sku_snapshot: string;
  note: string;
  performed_by_email: string;
  sale_id: string | null;
  sale_receipt_number: string | null;
}

export interface Paginated<T> {
  items: T[];
  pagination: {
    current_page: number;
    page_size: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface ProductVariant {
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  barcode: string | null;
  unit_price: string;
  cost_price: string;
  quantity_on_hand: number;
  reorder_point: number | null;
  is_active: boolean;
}

/** The seven governed garment-descriptor keys (backend inventory/attributes.py).
 * The KEYS are closed; the VALUES are free text — `getAttributeVocabulary`
 * returns suggestions, not an enum, and a merchant's own word is valid. */
export type AttributeKey = 'material' | 'fit' | 'pattern' | 'length' | 'sleeve' | 'neckline' | 'occasion';

export type GarmentAttributes = Partial<Record<AttributeKey, string>>;

export interface Product {
  id: string;
  name: string;
  style_code: string;
  category: string;
  description: string;
  brand: string;
  season: string;
  status: string;
  variant_count: number;
  total_on_hand: number;
  sizes: string[];
  colors: string[];
  created_at: string;
  variants: ProductVariant[];
  // Style-level description. The first five have been returned since the
  // register's Details tab; ALL-188 adds `attributes` and makes all six
  // writable on create as well as PATCH.
  //
  // null means NEVER ENTERED and the app hides the row — "" would be
  // indistinguishable from "entered and blank". `attributes` is the
  // exception: it is always an object, {} when nothing is set.
  composition: string | null;
  care: string | null;
  origin: string | null;
  fit_notes: string | null;
  /** Per-size, e.g. {"S": {"chest": "48 cm"}}. */
  measurements: Record<string, Record<string, string>> | null;
  attributes: GarmentAttributes;
}

/** One variant to add to an existing style. Exactly one of `size` (free text)
 * or `size_values` (picked off the style's governing scale) — send
 * `size_values` whenever `resolveSizeScale` returned a scale, because those
 * bind to it and a plain string does not. */
export interface CreateVariantPayload {
  sku: string;
  color?: string;
  size?: string;
  size_values?: string[];
  barcode?: string;
  unit_price?: string | number;
  cost_price?: string | number;
  opening_qty?: number;
  /** Where the opening quantity lands. Omitted = the company default. */
  location?: string;
}

/** The scale governing a category or a style, narrowed for a PICKER: active
 * values only, plain strings, position order. The settings screen keeps using
 * `SizeScale` from views/inventory/sizeScales (which carries deactivated
 * values and their positions, because it has to show them to un-hide them). */
export interface ResolvedSizeScale {
  id: string;
  name: string;
  kind: 'alpha' | 'numeric' | 'composite';
  axes: 1 | 2;
  axis_labels: string[];
  /** One list PER AXIS: [["S","M","L"]], or [[waists], [inseams]]. */
  values: string[][];
}

// The filter shape and its query builder live in inventoryStock.query.ts so they
// are importable without dragging in axios (and, through it, sessionStorage).
export type { MovementFilters } from './inventoryStock.query';
export { buildMovementQuery } from './inventoryStock.query';

// ---------------------------------------------------------------------------
// Styles (products)
// ---------------------------------------------------------------------------
export const listProducts = async (params: { search?: string; category?: string } = {}): Promise<Product[]> => {
  const response = await axiosServices.get<Product[]>(`${BASE_URL}/products/`, { params });
  return response.data;
};

export const getProduct = async (productId: string): Promise<Product> => {
  const response = await axiosServices.get<Product>(`${BASE_URL}/products/${productId}/`);
  return response.data;
};

export const createProduct = async (payload: unknown): Promise<Product> => {
  const response = await axiosServices.post<Product>(`${BASE_URL}/products/`, payload);
  return response.data;
};

export const updateProduct = async (productId: string, payload: Partial<Product>): Promise<Product> => {
  const response = await axiosServices.patch<Product>(`${BASE_URL}/products/${productId}/`, payload);
  return response.data;
};

/**
 * The SECOND of the two doors that create a sellable unit (backend design §3):
 * this one adds a row to a style that already exists. `createProduct` is the
 * first (a new style plus its whole grid). There is no third — the legacy
 * item-create endpoint knows nothing about styles and its opening quantity
 * skips the stock ledger, so new work must not call it.
 *
 * Returns the WHOLE style, not just the new row: a new variant changes the
 * matrix's axes, counts and ordering.
 *
 * 409 when the (size, colour) pair is already on the style — the body carries
 * `detail.existing_sku` so the screen can point at the row it collided with.
 * 400 with `detail: [blockers]` when a `size_values` entry is not on the
 * style's scale (or has been deactivated).
 */
export const createVariant = async (productId: string, payload: CreateVariantPayload): Promise<Product> => {
  const response = await axiosServices.post<Product>(`${BASE_URL}/products/${productId}/variants/`, payload);
  return response.data;
};

/**
 * Which scale governs a category the operator is still typing, BEFORE any
 * style exists — resolution (style override, then category binding, then
 * none) is a server rule, and this is the server answering it. Pass
 * `product` instead to resolve for an existing style.
 *
 * `null` is a real answer: the category is free text, so offer a text box.
 */
export const resolveSizeScale = async (params: { category: string } | { product: string }): Promise<ResolvedSizeScale | null> => {
  const response = await axiosServices.get<{ scale: ResolvedSizeScale | null }>(`${BASE_URL}/size-scales/resolve/`, {
    params
  });
  return response.data.scale;
};

/**
 * Suggested values per garment attribute: the platform's seed list first,
 * then the words this company has already used. NOT an enum — the field is
 * free-solo, and a value the merchant types is as valid as a seed.
 */
export const getAttributeVocabulary = async (): Promise<Record<AttributeKey, string[]>> => {
  const response = await axiosServices.get<Record<AttributeKey, string[]>>(`${BASE_URL}/attributes/vocabulary/`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------
export const listLocations = async (): Promise<Location[]> => {
  const response = await axiosServices.get<Location[]>(`${BASE_URL}/locations/`);
  return response.data;
};

export const createLocation = async (payload: Partial<Location>): Promise<Location> => {
  const response = await axiosServices.post<Location>(`${BASE_URL}/locations/`, payload);
  return response.data;
};

export const updateLocation = async (locationId: string, payload: Partial<Location>): Promise<Location> => {
  const response = await axiosServices.patch<Location>(`${BASE_URL}/locations/${locationId}/`, payload);
  return response.data;
};

/** Deactivates rather than deletes — the response reports any stranded units. */
export const deactivateLocation = async (locationId: string): Promise<Location> => {
  const response = await axiosServices.delete<Location>(`${BASE_URL}/locations/${locationId}/`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------
export const getItemStock = async (itemId: number): Promise<ItemStockResponse> => {
  const response = await axiosServices.get<ItemStockResponse>(`${BASE_URL}/items/${itemId}/stock/`);
  return response.data;
};

export const adjustItemStock = async (itemId: number, payload: unknown): Promise<StockMovementRow> => {
  const response = await axiosServices.post<StockMovementRow>(`${BASE_URL}/items/${itemId}/stock/adjust/`, payload);
  return response.data;
};

export const getItemMovements = async (itemId: number, filters: MovementFilters = {}): Promise<Paginated<StockMovementRow>> => {
  const query = buildMovementQuery(filters);
  const response = await axiosServices.get<Paginated<StockMovementRow>>(
    `${BASE_URL}/items/${itemId}/movements/${query ? `?${query}` : ''}`
  );
  return response.data;
};
