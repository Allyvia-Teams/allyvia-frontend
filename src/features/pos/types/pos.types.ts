export type POSPaymentMethod = 'card' | 'cash' | 'split';

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
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: POSPaymentMethod;
  payments: Payment[];
  status: POSOrderStatus;
  createdAt: string; // ISO
  employeeId: string;
}

export interface CheckoutResult {
  orderId: string;
  receiptNumber: string;
  changeOwed?: number;
}

export interface POSCategory {
  id: string;
  name: string;
  icon?: string; // optional icon key (UI currently uses fallback)
}
