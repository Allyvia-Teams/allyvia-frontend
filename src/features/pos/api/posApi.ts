import axiosServices from 'utils/axios';

import type { CheckoutResult, ContactSearchResult, MemberLookupResponse, Order, Product, POSCategory } from '../types/pos.types';

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

export interface RecentOrdersResponse {
  items: Order[];
}

export const posApi = {
  async fetchProducts(filters: { category?: string; search?: string; page?: number } = {}): Promise<ProductsResponse> {
    // TODO: replace with real DRF endpoint: GET /api/pos/products/
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
