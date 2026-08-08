// api/inventoryPurchasing.api.ts
//
// Suppliers, purchase orders and the on-order rollup.
//
// Transport only. Every piece of logic worth testing — money reading, status
// gating, landed-cost preview, receive-payload building, UUID validation of query
// params — lives in views/inventory/purchasing.ts, which is importable without
// axios. See the note in inventoryStock.query.ts for why that separation is not
// optional here.
//
// Company scoping is implicit via the X-Role-ID header attached by utils/axios.

import axiosServices from 'utils/axios';

const BASE_URL = '/inventory';

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
export interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: Record<string, unknown>;
  default_lead_time_days: number;
  payment_terms: string;
  notes: string;
  qb_vendor_id: string | null;
  qb_vendor_name: string | null;
  square_vendor_id: string | null;
  is_active: boolean;
  /**
   * NULL on every response except the list. A detail fetch does not know the
   * count — rendering it as 0 would claim a supplier has no open orders when the
   * truth is that nobody asked.
   */
  open_po_count: number | null;
  created_at: string;
}

export interface CatalogImportResult {
  products_created: number;
  variants_created: number;
  variants_updated: number;
  /** Non-blank rows PARSED, not rows imported. */
  rows: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

/** `query` comes from purchasing.ts::supplierListQuery — it enforces the include_inactive rule. */
export const listSuppliers = async (query = ''): Promise<Supplier[]> => {
  const response = await axiosServices.get<Supplier[]>(`${BASE_URL}/suppliers/${query ? `?${query}` : ''}`);
  return response.data;
};

export const getSupplier = async (supplierId: string): Promise<Supplier> => {
  const response = await axiosServices.get<Supplier>(`${BASE_URL}/suppliers/${supplierId}/`);
  return response.data;
};

export const createSupplier = async (payload: unknown): Promise<Supplier> => {
  const response = await axiosServices.post<Supplier>(`${BASE_URL}/suppliers/`, payload);
  return response.data;
};

export const updateSupplier = async (supplierId: string, payload: unknown): Promise<Supplier> => {
  const response = await axiosServices.patch<Supplier>(`${BASE_URL}/suppliers/${supplierId}/`, payload);
  return response.data;
};

/** Soft deactivate. Answers 200 with the updated object, not 204 — there is no hard delete. */
export const deactivateSupplier = async (supplierId: string): Promise<Supplier> => {
  const response = await axiosServices.delete<Supplier>(`${BASE_URL}/suppliers/${supplierId}/`);
  return response.data;
};

export const importSupplierCatalog = async (supplierId: string, file: File): Promise<CatalogImportResult> => {
  const form = new FormData();
  // The view reads request.FILES.get("file") and nothing else.
  form.append('file', file);
  const response = await axiosServices.post<CatalogImportResult>(`${BASE_URL}/suppliers/${supplierId}/catalog/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/** The CSV template. Returns raw text, not JSON. */
export const getSupplierCatalogTemplate = async (supplierId: string): Promise<string> => {
  const response = await axiosServices.get<string>(`${BASE_URL}/suppliers/${supplierId}/catalog/`, { responseType: 'text' });
  return response.data;
};

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------
export type PurchaseOrderStatus = 'draft' | 'submitted' | 'partially_received' | 'received' | 'cancelled';

/**
 * Money on these objects is a STRING (2dp on the pools, 4dp on values) —
 * EXCEPT on the receive response, which bypasses the serializer and emits JSON
 * numbers for the identical keys. Hence `string | number` everywhere: use
 * purchasing.ts::readMoney rather than touching these directly.
 */
export type Money = string | number;

export interface PurchaseOrderLine {
  id: string;
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: Money;
  /** Null until something is received. Not a zero. */
  landed_unit_cost: Money | null;
  /** Populated on a draft: what the landed cost WOULD be, pool distributed over ordered value. */
  projected_landed_unit_cost: Money;
  line_value: Money;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  status_label: string;
  supplier_id: string;
  supplier_name: string;
  destination_id: string;
  destination_name: string;
  /** "YYYY-MM-DD" — a date, not a datetime. Sending a datetime 400s. */
  expected_at: string | null;
  submitted_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  shipping: Money;
  duty: Money;
  other_fees: Money;
  /** Derived server-side = shipping + duty + other_fees. Read-only. */
  landed_cost_pool: Money;
  goods_value: Money;
  total_value: Money;
  notes: string;
  is_editable: boolean;
  lines: PurchaseOrderLine[];
}

/** The receive response is a PO plus the movements this call booked. */
export interface PurchaseOrderReceiveResult extends PurchaseOrder {
  received_now: Array<{
    line_id: string;
    delta: number;
    /** On-hand at the PO destination afterwards — per-location, not company-wide. */
    quantity_after: number;
    /** The LANDED unit cost stamped on the movement, not the supplier price. */
    unit_cost: Money;
  }>;
}

/** `query` comes from purchasing.ts::purchaseOrderListQuery, which drops non-UUID filters (they 500). */
export const listPurchaseOrders = async (query = ''): Promise<PurchaseOrder[]> => {
  const response = await axiosServices.get<PurchaseOrder[]>(`${BASE_URL}/purchase-orders/${query ? `?${query}` : ''}`);
  return response.data;
};

export const getPurchaseOrder = async (purchaseOrderId: string): Promise<PurchaseOrder> => {
  const response = await axiosServices.get<PurchaseOrder>(`${BASE_URL}/purchase-orders/${purchaseOrderId}/`);
  return response.data;
};

export const createPurchaseOrder = async (payload: unknown): Promise<PurchaseOrder> => {
  const response = await axiosServices.post<PurchaseOrder>(`${BASE_URL}/purchase-orders/`, payload);
  return response.data;
};

/** Sending `lines` REPLACES the whole set and every line UUID changes. Omit it to leave lines alone. */
export const updatePurchaseOrder = async (purchaseOrderId: string, payload: unknown): Promise<PurchaseOrder> => {
  const response = await axiosServices.patch<PurchaseOrder>(`${BASE_URL}/purchase-orders/${purchaseOrderId}/`, payload);
  return response.data;
};

export const submitPurchaseOrder = async (purchaseOrderId: string): Promise<PurchaseOrder> => {
  const response = await axiosServices.post<PurchaseOrder>(`${BASE_URL}/purchase-orders/${purchaseOrderId}/submit/`, {});
  return response.data;
};

export const cancelPurchaseOrder = async (purchaseOrderId: string): Promise<PurchaseOrder> => {
  const response = await axiosServices.post<PurchaseOrder>(`${BASE_URL}/purchase-orders/${purchaseOrderId}/cancel/`, {});
  return response.data;
};

/**
 * Receive against a PO. `lines` is REQUIRED and non-empty, each qty >= 1, and the
 * quantities ACCUMULATE onto qty_received across calls.
 *
 * Transfers receive absolutely instead — do not route both through one helper.
 */
export const receivePurchaseOrder = async (purchaseOrderId: string, payload: unknown): Promise<PurchaseOrderReceiveResult> => {
  const response = await axiosServices.post<PurchaseOrderReceiveResult>(`${BASE_URL}/purchase-orders/${purchaseOrderId}/receive/`, payload);
  return response.data;
};

export interface OnOrderResponse {
  items: Array<{
    inventory_item_id: number;
    sku: string | null;
    location_id: string | null;
    location_name: string | null;
    qty_on_order: number;
  }>;
  total_units: number;
}

/** `query` must come from purchasing.ts::onOrderQuery — a non-UUID location_id here is a 500. */
export const getOnOrder = async (query = ''): Promise<OnOrderResponse> => {
  const response = await axiosServices.get<OnOrderResponse>(`${BASE_URL}/on-order/${query ? `?${query}` : ''}`);
  return response.data;
};
