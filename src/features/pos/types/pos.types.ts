export type POSPaymentMethod = 'card' | 'cash' | 'split';

export interface ContactSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface NewContactInfo {
  name: string;
  email?: string;
  phone?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string; // POSCategory id
  price: number;
  stock: number;
  imageUrl?: string;
  taxRate: number; // e.g. 0.08
}

export interface CartItem {
  product: Product;
  quantity: number;
  /**
   * Discount allocated to this cart line (total for the line, not per-unit).
   * Used for strikethrough/display purposes.
   */
  discountAmount: number;
}

export interface Payment {
  method: 'card' | 'cash';
  amount: number;
  stripePaymentIntentId?: string;
}

export type POSOrderStatus = 'draft' | 'completed' | 'voided';

export interface Order {
  id: string;
  receiptNumber?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: POSPaymentMethod;
  payments: Payment[];
  status: POSOrderStatus;
  createdAt: string; // ISO — row insert time
  transactionDate?: string; // ISO — business date of the sale (falls back to createdAt)
  employeeId: string;
  discountCode?: string;
  customerId?: string;
  newContact?: NewContactInfo;
  /**
   * Which stock location the sale decremented. Derived server-side from the
   * paying Stripe reader, never chosen at the till. Empty on sales recorded
   * before locations existed and on imported rows of unknown origin — display
   * nothing rather than implying the default.
   */
  locationId?: string;
  locationName?: string;
}

export interface CheckoutResult {
  orderId: string;
  receiptNumber: string;
  changeOwed?: number;
  locationId?: string;
  locationName?: string;
  /**
   * 'completed' for cash sales (settled at the register). 'draft' for card and
   * split sales — the sale finalizes only when the terminal charge succeeds.
   */
  status?: 'draft' | 'completed';
  /**
   * Amount the register must collect on the terminal (server-computed): the
   * full total for a card sale, total minus the cash leg for a split sale.
   * Present only while status is 'draft'.
   */
  cardAmount?: string | number;
}

export interface POSCategory {
  id: string;
  name: string;
  icon?: string; // optional icon key (UI currently uses fallback)
}
