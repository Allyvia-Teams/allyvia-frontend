// api/inventoryTransfers.api.ts
//
// Stock transfers between locations, and stocktakes.
//
// Transport only — the logic lives in views/inventory/transfersLogic.ts and
// views/inventory/stockCounts.ts, which are importable without axios.
//
// Two things in here are shaped by traps rather than by taste, and the comments
// say which:
//   * `patchTransfer` will not send an empty `lines` array, because on PATCH that
//     means "delete every line" while on receive the same literal means "receive
//     everything". Clearing lines is a separate, explicit call.
//   * the count endpoints return the same object under three different envelopes,
//     so each function returns the raw body and stockCounts.ts normalises it.

import axiosServices from 'utils/axios';

const BASE_URL = '/inventory';

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------
export type TransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled';

export interface TransferLine {
  id: string;
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  qty: number;
  qty_dispatched: number;
  qty_received: number;
  /**
   * Derived (dispatched − received). On a RECEIVED transfer a non-zero value is
   * the shortfall: units that left the origin and arrived nowhere.
   */
  qty_in_transit: number;
  /**
   * Current units on the origin's shelf. Populated only on draft detail/create/
   * patch responses, and NOT capped by `qty` — so it can be lower than qty, which
   * is exactly the case worth warning about before dispatch.
   */
  available_at_origin: number | null;
}

export interface Transfer {
  id: string;
  reference: string;
  status: TransferStatus;
  status_label: string;
  from_location_id: string;
  from_location_name: string;
  to_location_id: string;
  to_location_name: string;
  notes: string;
  is_editable: boolean;
  dispatched_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  created_by_email: string;
  dispatched_by_email: string;
  received_by_email: string;
  qty_total: number;
  /** On a received transfer this is the total shortfall, not units still moving. */
  qty_in_transit_total: number;
  created_at: string;
  lines: TransferLine[];
}

export const listTransfers = async (query = ''): Promise<Transfer[]> => {
  const response = await axiosServices.get<Transfer[]>(`${BASE_URL}/transfers/${query ? `?${query}` : ''}`);
  return response.data;
};

export const getTransfer = async (transferId: string): Promise<Transfer> => {
  const response = await axiosServices.get<Transfer>(`${BASE_URL}/transfers/${transferId}/`);
  return response.data;
};

export const createTransfer = async (payload: unknown): Promise<Transfer> => {
  const response = await axiosServices.post<Transfer>(`${BASE_URL}/transfers/`, payload);
  return response.data;
};

/**
 * Patch a draft.
 *
 * Refuses to send `lines: []`. On this endpoint that DELETES every line and
 * answers 200 with an undispatchable zero-line draft; on the receive endpoint the
 * same literal means "receive everything". An empty-selection UI state must not be
 * able to post one and get the other. Use `clearTransferLines` to mean it.
 */
export const patchTransfer = async (transferId: string, payload: Record<string, unknown>): Promise<Transfer> => {
  if (Array.isArray(payload.lines) && payload.lines.length === 0) {
    throw new Error(
      'Refusing to PATCH lines: [] — that deletes every line on the transfer. Call clearTransferLines() if this is really the intent.'
    );
  }
  const response = await axiosServices.patch<Transfer>(`${BASE_URL}/transfers/${transferId}/`, payload);
  return response.data;
};

/** The one path allowed to empty a transfer's lines. Named so it reads as a decision. */
export const clearTransferLines = async (transferId: string): Promise<Transfer> => {
  const response = await axiosServices.patch<Transfer>(`${BASE_URL}/transfers/${transferId}/`, { lines: [] });
  return response.data;
};

/** No body is read. All-or-nothing: a 409 lists per-line insufficient_stock blockers. */
export const dispatchTransfer = async (transferId: string): Promise<Transfer> => {
  const response = await axiosServices.post<Transfer>(`${BASE_URL}/transfers/${transferId}/dispatch/`, {});
  return response.data;
};

/**
 * Receive a transfer. Quantities are ABSOLUTE (qty_received becomes exactly what
 * is sent) — POs accumulate instead.
 *
 * Omitting `lines` receives everything in transit. transfersLogic.ts builds the
 * payload and aggregates repeated line ids, because a repeated line_id here
 * silently keeps only the LAST entry and the difference is written off for good.
 */
export const receiveTransfer = async (transferId: string, payload: unknown = {}): Promise<Transfer> => {
  const response = await axiosServices.post<Transfer>(`${BASE_URL}/transfers/${transferId}/receive/`, payload);
  return response.data;
};

/** Legal from draft only — a dispatched transfer can only be received. */
export const cancelTransfer = async (transferId: string): Promise<Transfer> => {
  const response = await axiosServices.post<Transfer>(`${BASE_URL}/transfers/${transferId}/cancel/`, {});
  return response.data;
};

// ---------------------------------------------------------------------------
// Stock counts
// ---------------------------------------------------------------------------
export type StockCountStatus = 'open' | 'review' | 'applied' | 'cancelled';

export interface StockCountSummary {
  total_lines: number;
  counted_lines: number;
  uncounted_lines: number;
  /** Excludes both uncounted (null) and matched (0) lines. */
  lines_with_variance: number;
  net_variance_units: number;
  shrinkage_units: number;
  overage_units: number;
  /** STRING 4dp. Silently omits lines whose item has no cost on record. */
  net_cost_impact: string;
}

export interface StockCountObject {
  id: string;
  reference: string;
  status: StockCountStatus;
  status_label: string;
  location_id: string;
  location_name: string;
  scope: 'all' | 'category' | 'filter';
  scope_filter: Record<string, unknown>;
  notes: string;
  is_mutable: boolean;
  created_by_email: string;
  applied_by_email: string;
  applied_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  summary: StockCountSummary;
}

export interface StockCountLine {
  line_id: string;
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  /** A SNAPSHOT from line creation. It does not track live stock, by design. */
  expected_qty: number;
  /** Null means nobody looked — which is not the same as "it matched". */
  counted_qty: number | null;
  variance: number | null;
  /** Null when the item's cost_price was 0 at snapshot time. */
  unit_cost: string | null;
  cost_impact: string | null;
  note: string;
  counted_at: string | null;
  counted_by_email: string;
}

export interface StockCountDetailBody {
  count: StockCountObject;
  summary: StockCountSummary;
  lines: StockCountLine[];
}

export interface StockCountApplyBody {
  count: StockCountObject;
  adjustments: Array<{ inventory_item_id: number; sku: string; delta: number; quantity_after: number }>;
}

export interface StockCountEntriesBody {
  /** Entries PROCESSED, not distinct lines touched. */
  recorded: number;
  summary: StockCountSummary;
}

/** `query` must come from stockCounts.ts — a malformed location_id here is a 500. */
export const listStockCounts = async (query = ''): Promise<StockCountObject[]> => {
  const response = await axiosServices.get<StockCountObject[]>(`${BASE_URL}/stock-counts/${query ? `?${query}` : ''}`);
  return response.data;
};

/** Returns the count WITHOUT lines — fetch the detail to populate the grid. */
export const createStockCount = async (payload: unknown): Promise<StockCountObject> => {
  const response = await axiosServices.post<StockCountObject>(`${BASE_URL}/stock-counts/`, payload);
  return response.data;
};

/** The only source of per-line variance. Available at every status. */
export const getStockCount = async (stockCountId: string): Promise<StockCountDetailBody> => {
  const response = await axiosServices.get<StockCountDetailBody>(`${BASE_URL}/stock-counts/${stockCountId}/`);
  return response.data;
};

/** All-or-nothing: one unmatched scan rejects the whole batch and records nothing. */
export const submitStockCountEntries = async (stockCountId: string, payload: unknown): Promise<StockCountEntriesBody> => {
  const response = await axiosServices.post<StockCountEntriesBody>(`${BASE_URL}/stock-counts/${stockCountId}/entries/`, payload);
  return response.data;
};

/** The open → review gate. Apply 409s until this has been called. Returns a BARE count. */
export const reviewStockCount = async (stockCountId: string): Promise<StockCountObject> => {
  const response = await axiosServices.post<StockCountObject>(`${BASE_URL}/stock-counts/${stockCountId}/review/`, {});
  return response.data;
};

export const applyStockCount = async (stockCountId: string): Promise<StockCountApplyBody> => {
  const response = await axiosServices.post<StockCountApplyBody>(`${BASE_URL}/stock-counts/${stockCountId}/apply/`, {});
  return response.data;
};

/** Returns a BARE count. Counted quantities are preserved, not deleted. */
export const cancelStockCount = async (stockCountId: string): Promise<StockCountObject> => {
  const response = await axiosServices.post<StockCountObject>(`${BASE_URL}/stock-counts/${stockCountId}/cancel/`, {});
  return response.data;
};
