export type POSPaymentMethod = 'card' | 'cash' | 'split';

export interface ContactSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

/** The three things the till is told, and the only three. */
export type MemberLookupStatus = 'created' | 'linked_new' | 'linked';

/**
 * The whole 200 body. The backend asserts exact key-set equality on this —
 * no name, no tier, no contact id ever reaches the till, because confirming
 * who a number belongs to happens on the customer's own device.
 */
export interface MemberLookupResponse {
  status: MemberLookupStatus;
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
   * Attach this sale to an Inner Circle member by phone.
   *
   * Server precedence is customerId > memberPhone > newContact. A number the
   * backend has never seen completes the sale UNATTACHED and silently —
   * checkout deliberately does not create members, which is why the till
   * calls POST /pos/member-lookup/ first. Sending `newContact` INSTEAD of
   * this field is the duplicate-contact bug it exists to prevent: that path
   * matches on email only, so a phone-only walk-in gets a fresh placeholder
   * contact on every visit and their spend never accumulates.
   */
  memberPhone?: string;
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
}

export interface POSCategory {
  id: string;
  name: string;
  icon?: string; // optional icon key (UI currently uses fallback)
}
