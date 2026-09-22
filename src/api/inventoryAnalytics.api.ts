// api/inventoryAnalytics.api.ts
//
// The seven Session 4 ledger-analytics reads: sell-through, aging, low
// performers, per-location performance, the style matrix, shrinkage, and one
// variant's own figures.
//
// TRANSPORT ONLY. Every rule these responses need — the negative-safe
// formatters, the roll-ups, the null conditions and the caveats — lives in
// views/inventory/insights.ts, which is importable without axios so those rules
// are tested directly rather than through a rendered component.
//
// TWO THINGS THAT MUST NOT DRIFT INTO THIS FILE:
//
//   1. QUERY STRINGS ARE BUILT BY insights.ts, NEVER HERE AND NEVER BY AXIOS'S
//      `params`. A non-uuid `location_id` or `product_id`, and a `min_capital`
//      of NaN, are UNCAUGHT 500s whose body is Django's HTML error page —
//      `response.json()` throws before any error key can be read. `analyticsQuery`,
//      `lowPerformersQuery` and `matrixQuery` omit anything that would trigger
//      that, so the panel comes back unscoped instead of as a stack trace.
//   2. NO DEFAULTING. Callers pass a window; when they do not, the server picks
//      its own (end = today on the SERVER's date, start = end - 90 days) and the
//      screen reports it from the response envelope. Inventing a window here
//      would mean the caption and the figures could disagree.
//
// The types are imported from views/inventory/insights rather than re-declared,
// because there are ten of them and two copies of a wire shape drift. The import
// is type-only and erased at build time, so nothing in insights.ts's dependency
// graph — and therefore no test that imports it — ever reaches axios.

import axiosServices from 'utils/axios';

import type {
  AgingBucket,
  AgingRow,
  AnalyticsEnvelope,
  GmroiBlock,
  LocationRow,
  LowPerformerRow,
  MatrixCell,
  SellThroughAgg,
  SellThroughRow,
  ShrinkageBlock
} from 'views/inventory/insights';

const BASE_URL = '/inventory';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** `items` is the VARIANT grain; the four `by_*` arrays are its roll-ups. */
export interface SellThroughResponse extends AnalyticsEnvelope {
  items: SellThroughRow[];
  by_style: SellThroughAgg[];
  by_category: SellThroughAgg[];
  by_size: SellThroughAgg[];
  by_color: SellThroughAgg[];
  totals: GmroiBlock;
}

export interface AgingResponse extends AnalyticsEnvelope {
  /** One row per (item, location) — `inventory_item_id` repeats. */
  items: AgingRow[];
  buckets: AgingBucket[];
  /** The endpoint's own FIFO-approximation sentence. Render this, not a copy. */
  approximation: string;
}

export interface LowPerformersResponse extends AnalyticsEnvelope {
  items: LowPerformerRow[];
  /** Summed over the TRUNCATED list — never a company total. */
  total_capital_tied: string;
}

export interface LocationsResponse extends AnalyticsEnvelope {
  locations: LocationRow[];
  /** The only place `average_inventory_cost` and `stock_turn` exist per company. */
  company_totals: GmroiBlock;
}

export interface MatrixResponse extends AnalyticsEnvelope {
  /** Blanks are EXCLUDED from these axes but present in `cells` — see matrixAxes. */
  sizes: string[];
  colors: string[];
  /** A flat, SPARSE list sorted by (color, size). Not a 2-D array. */
  cells: MatrixCell[];
  by_style: SellThroughAgg[];
  by_category: SellThroughAgg[];
  by_size: SellThroughAgg[];
  by_color: SellThroughAgg[];
  product_id: string | null;
  category: string | null;
}

export interface ShrinkageResponse extends AnalyticsEnvelope {
  shrinkage: ShrinkageBlock;
}

export interface ItemAnalyticsResponse extends AnalyticsEnvelope {
  item: SellThroughRow | null;
  aging: AgingRow[];
  margin: GmroiBlock;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const get = async <T>(path: string, query: string): Promise<T> => {
  const response = await axiosServices.get<T>(`${BASE_URL}${path}${query ? `?${query}` : ''}`);
  return response.data;
};

/** `query` must come from insights.ts::analyticsQuery. */
export const getSellThrough = (query = ''): Promise<SellThroughResponse> => get<SellThroughResponse>('/analytics/sell-through/', query);

/**
 * Aging as of NOW over all history. `start`/`end` are accepted, echoed into the
 * envelope and folded into the cache key, and change not one number — so the
 * panel must not be captioned with the window.
 */
export const getStockAging = (query = ''): Promise<AgingResponse> => get<AgingResponse>('/analytics/aging/', query);

/** `query` must come from insights.ts::lowPerformersQuery — `min_capital=NaN` 500s. */
export const getLowPerformers = (query = ''): Promise<LowPerformersResponse> =>
  get<LowPerformersResponse>('/analytics/low-performers/', query);

/**
 * Every location, always. `location_id` is validated and echoed but has ZERO
 * effect on the payload here, so a caller must not present it as a filter.
 */
export const getLocationPerformance = (query = ''): Promise<LocationsResponse> => get<LocationsResponse>('/analytics/locations/', query);

/** `query` must come from insights.ts::matrixQuery — a non-uuid `product_id` 500s. */
export const getStyleMatrix = (query = ''): Promise<MatrixResponse> => get<MatrixResponse>('/analytics/matrix/', query);

export const getShrinkage = (query = ''): Promise<ShrinkageResponse> => get<ShrinkageResponse>('/analytics/shrinkage/', query);

/**
 * One variant's own figures.
 *
 * `itemId` is an INTEGER — InventoryItem's pk is an AutoField, unlike Location
 * and Product — and a non-integer segment misses Django's URL resolver entirely
 * for a 404 with an HTML body. Gate it with insights.ts::itemAnalyticsId.
 */
export const getItemAnalytics = (itemId: number, query = ''): Promise<ItemAnalyticsResponse> =>
  get<ItemAnalyticsResponse>(`/items/${itemId}/analytics/`, query);
