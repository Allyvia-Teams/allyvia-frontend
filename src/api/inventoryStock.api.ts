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
