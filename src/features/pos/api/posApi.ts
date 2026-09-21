import axiosServices from 'utils/axios';

import type {
  CatalogStyle,
  CheckoutResult,
  ContactSearchResult,
  MemberLookupResponse,
  Order,
  Product,
  POSCategory
} from '../types/pos.types';

export interface ProductsResponse {
  items: Product[];
  pagination: {
    current_page: number;
    page_size: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface StylesResponse {
  styles: CatalogStyle[];
  pagination: {
    current_page: number;
    page_size: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface RecentOrdersResponse {
  items: Order[];
}

/**
 * Query for the returns lookup (`GET /pos/sales/`).
 *
 * `q` is matched server-side as: exact receipt number first, then partial
 * receipt number, then customer name — so a clerk who scanned a whole barcode
 * gets that one sale, not every receipt containing those digits.
 *
 * The dates are BUSINESS dates resolved against the company's own midnights,
 * not UTC: an 8PM sale files under the day it was rung, which is the day the
 * clerk will look for it.
 */
export interface SalesSearchParams {
  q?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  status?: string; // comma-separated POSSale statuses
  locationId?: string;
  /** Only sales with units left to hand back. Two conditions server-side, not one. */
  refundable?: boolean;
  limit?: number; // 1..100, server default 25
  offset?: number;
}

export interface SalesSearchResponse {
  items: Order[];
  count: number;
}

export const posApi = {
  async fetchProducts(filters: { category?: string; search?: string; page?: number } = {}): Promise<ProductsResponse> {
    const res = await axiosServices.get('/pos/products/', {
      params: {
        category: filters.category,
        search: filters.search,
        page: filters.page || 1,
        page_size: 24
      }
    });

    return res.data;
  },

  async fetchStyles(filters: { category?: string; search?: string; page?: number } = {}): Promise<StylesResponse> {
    const res = await axiosServices.get('/pos/styles/', {
      params: {
        category: filters.category,
        search: filters.search,
        page: filters.page || 1,
        page_size: 24
      }
    });
    return res.data;
  },

  /**
   * Scan-to-cart: exact barcode → one POS Product (variant), or null when unknown.
   * Prefer this over /api/items/lookup, which is not a registered merchant route.
   */
  async lookupBarcode(code: string): Promise<{ product: Product; retired: boolean } | null> {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const res = await axiosServices.get<ProductsResponse>('/pos/products/', {
      params: { barcode: trimmed, page_size: 1 }
    });
    const item = res.data.items?.[0];
    if (!item) return null;
    return {
      product: {
        ...item,
        price: Number(item.price),
        stock: Number(item.stock),
        taxRate: Number(item.taxRate ?? 0),
        size: item.size || '',
        color: item.color || ''
      },
      retired: false
    };
  },

  async fetchCategories(): Promise<POSCategory[]> {
    // TODO: replace with real DRF endpoint: GET /api/pos/categories/
    const res = await axiosServices.get('/pos/categories/');
    return res.data;
  },

  // ``idempotencyKey`` is minted once per checkout attempt by the modal, not
  // per submit, so a resubmit after a lost response returns the sale the first
  // submit rang instead of ringing a second one (ALL-83).
  async submitOrder(order: Omit<Order, 'id' | 'createdAt'>, idempotencyKey?: string): Promise<CheckoutResult> {
    const res = await axiosServices.post('/pos/orders/', order, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
    });
    return res.data as CheckoutResult;
  },

  async fetchRecentOrders(): Promise<RecentOrdersResponse> {
    // TODO: replace with real DRF endpoint: GET /api/pos/recent-orders/
    const res = await axiosServices.get('/pos/recent-orders/');
    return res.data as RecentOrdersResponse;
  },

  /**
   * Find the sale a customer is returning against (ALL-71).
   *
   * The sibling `fetchRecentOrders` is the drawer's ten rows with no search,
   * which is the wrong tool the moment the receipt in the customer's hand is
   * the eleventh. Same `Order` shape from the same server-side builder, so the
   * return dialog this opens is the same dialog the drawer opens.
   *
   * Empty/undefined filters are omitted rather than sent blank: the server
   * validates this query and answers 400 on a malformed date, which is better
   * than a silently empty result a clerk reads as "that receipt doesn't exist".
   */
  async searchSales(params: SalesSearchParams = {}): Promise<SalesSearchResponse> {
    const query: Record<string, unknown> = {};
    if (params.q?.trim()) query.q = params.q.trim();
    if (params.dateFrom) query.date_from = params.dateFrom;
    if (params.dateTo) query.date_to = params.dateTo;
    if (params.status) query.status = params.status;
    if (params.locationId) query.location_id = params.locationId;
    if (params.refundable) query.refundable = true;
    if (params.limit != null) query.limit = params.limit;
    if (params.offset != null) query.offset = params.offset;

    const res = await axiosServices.get('/pos/sales/', { params: query });
    return res.data as SalesSearchResponse;
  },

  /**
   * Ask whether this number belongs to an Inner Circle member, enrolling it
   * if not. Creates server state, so it is a POST and must never be fired
   * from a keystroke timer: the 10/hour throttle is keyed on the NUMBER and
   * shared across every till, so a half-typed prefix spends a stranger's
   * budget from your counter.
   */
  async memberLookup(phone: string): Promise<MemberLookupResponse> {
    const res = await axiosServices.post('/pos/member-lookup/', { phone: phone.trim() });
    return res.data as MemberLookupResponse;
  },

  async searchContacts(q: string): Promise<ContactSearchResult[]> {
    if (!q || q.trim().length < 2) return [];
    const res = await axiosServices.get('/pos/contacts/search/', { params: { q: q.trim() } });
    return res.data as ContactSearchResult[];
  }
};

export default posApi;
