// api/inventoryReorder.api.ts
//
// The reorder inbox: what to buy, how many, and why.
//
// Transport only — the arithmetic rendering, sorting and payload building live in
// views/inventory/reorder.ts, which is importable without axios.
//
// `rationale` is the reason this feature is trustworthy rather than magic: it
// carries every input to the suggested quantity, so a buyer can check the number
// before spending money on it. It is deliberately typed loosely here and read
// through reorder.ts, which knows which keys the engine actually writes and
// degrades honestly when one is missing.

import axiosServices from 'utils/axios';

const BASE_URL = '/inventory';

export type ReorderStatus = 'suggested' | 'dismissed' | 'ordered' | 'superseded';

export interface ReorderSuggestion {
  id: string;
  status: ReorderStatus;
  status_label: string;
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  location_id: string;
  location_name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  /** STRING, 4dp — units per day. */
  velocity_daily: string;
  /** STRING, 2dp, or null when velocity is zero (never "0 days of cover"). */
  days_of_cover: string | null;
  /** "YYYY-MM-DD", or null when nothing is selling and so nothing runs out. */
  forecast_stockout_date: string | null;
  days_until_stockout: number | null;
  on_hand: number;
  on_order: number;
  lead_time_days: number;
  suggested_qty: number;
  suggested_reorder_point: number;
  /** Null when the item has no reorder point set — not zero. */
  current_reorder_point: number | null;
  /** Every input to the arithmetic. Read it via reorder.ts::readRationale. */
  rationale: Record<string, unknown>;
  purchase_order_id: string | null;
  purchase_order_number: string | null;
  dismissal_reason: string;
  generated_at: string;
}

/** `query` must come from reorder.ts — a malformed uuid filter would 500. */
export const listReorderSuggestions = async (query = ''): Promise<unknown> => {
  const response = await axiosServices.get(`${BASE_URL}/reorder-suggestions/${query ? `?${query}` : ''}`);
  return response.data;
};

export const dismissReorderSuggestions = async (payload: unknown): Promise<unknown> => {
  const response = await axiosServices.post(`${BASE_URL}/reorder-suggestions/dismiss/`, payload);
  return response.data;
};

/**
 * Turn suggestions into draft purchase orders, grouped server-side by
 * (supplier, destination). The response carries the created orders so the inbox
 * can deep-link into the PO editor.
 */
export const createPurchaseOrdersFromSuggestions = async (payload: unknown): Promise<unknown> => {
  const response = await axiosServices.post(`${BASE_URL}/reorder-suggestions/create-po/`, payload);
  return response.data;
};

/** Writes each suggestion's suggested_reorder_point onto its item. */
export const applySuggestedReorderPoints = async (payload: unknown): Promise<unknown> => {
  const response = await axiosServices.post(`${BASE_URL}/reorder-suggestions/apply-reorder-point/`, payload);
  return response.data;
};

/**
 * Recompute the inbox now rather than waiting for the nightly run.
 *
 * Regenerating SUPERSEDES the previous live suggestions, so the inbox is current
 * state and not a log — but a DISMISSED suggestion is not superseded, which is
 * what makes dismissing one mean something.
 */
export const regenerateReorderSuggestions = async (): Promise<unknown> => {
  const response = await axiosServices.post(`${BASE_URL}/reorder-suggestions/regenerate/`, {});
  return response.data;
};
