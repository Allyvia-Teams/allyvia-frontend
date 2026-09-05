import axiosServices from 'utils/axios';

import type { CheckoutResult, ContactSearchResult, Order, Product, POSCategory } from '../types/pos.types';

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

export interface DiscountCodeResult {
  code: string;
  type: 'percent';
  amount: string;
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

  async submitOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<CheckoutResult> {
    // TODO: replace with real DRF endpoint: POST /api/orders/
    const res = await axiosServices.post('/pos/orders/', order);
    return res.data as CheckoutResult;
  },

  async fetchRecentOrders(): Promise<RecentOrdersResponse> {
    // TODO: replace with real DRF endpoint: GET /api/pos/recent-orders/
    const res = await axiosServices.get('/pos/recent-orders/');
    return res.data as RecentOrdersResponse;
  },

  /**
   * ALL-106. The till used to know the codes — `SAVE10`/`TAKE5`/`OFF20` were a
   * table in OrderCart.tsx, and the rejection named two of them. It knows none
   * now: it asks, and the server answers with what the code is worth or with
   * one flat refusal that is identical for a bogus code, an expired one, a
   * spent one and another store's.
   *
   * This is a convenience, not the gate. `checkout_sale` re-resolves and locks
   * the code when the sale is rung, so a client that skips this call gains
   * nothing by it.
   */
  async validateDiscountCode(code: string): Promise<DiscountCodeResult> {
    const res = await axiosServices.post('/pos/discount-code/', { code });
    return res.data as DiscountCodeResult;
  },

  async searchContacts(q: string): Promise<ContactSearchResult[]> {
    if (!q || q.trim().length < 2) return [];
    const res = await axiosServices.get('/pos/contacts/search/', { params: { q: q.trim() } });
    return res.data as ContactSearchResult[];
  }
};

export default posApi;
