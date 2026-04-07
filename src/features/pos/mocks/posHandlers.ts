import type { AxiosRequestConfig } from 'axios';

import { POS_CATEGORIES, POS_PRODUCTS } from './posData';
import type { CartItem, CheckoutResult, Order, Payment, Product } from '../types/pos.types';

export type POSOrderPayload = Omit<Order, 'id' | 'createdAt'>;

type POSMockResult = { status: number; data: any };

let productsStore: Product[] | null = null;
let ordersStore: Order[] = [];
let transactionsStore: Array<{
  id: string;
  type: 'sale';
  amount: number;
  paymentMethod: Order['paymentMethod'];
  timestamp: string;
  orderId: string;
  items: CartItem[];
}> = [];
let receiptCounter = Number(sessionStorage.getItem('allyvia_pos_receipt_counter') || '1000');

function ensureInit() {
  if (!productsStore) {
    productsStore = POS_PRODUCTS.map((p) => ({ ...p })); // deep-ish copy; stock must be mutable
  }
}

function persistReceiptCounter() {
  sessionStorage.setItem('allyvia_pos_receipt_counter', String(receiptCounter));
}

function getNextReceiptNumber() {
  receiptCounter += 1;
  persistReceiptCounter();
  return String(receiptCounter);
}

function matchProductSearch(product: Product, search?: string) {
  const q = (search || '').trim().toLowerCase();
  if (!q) return true;
  return product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q) || product.id.toLowerCase().includes(q);
}

function getPaymentTotals(payments: Payment[]) {
  return payments.reduce(
    (acc, p) => {
      if (p.method === 'cash') acc.cash += p.amount;
      if (p.method === 'card') acc.card += p.amount;
      return acc;
    },
    { cash: 0, card: 0 }
  );
}

function clampStock(next: number) {
  return Math.max(0, next);
}

function allocateDiscountsBySubtotal(items: CartItem[], discountTotal: number) {
  const subtotal = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
  if (!discountTotal || subtotal <= 0) {
    return items.map((it) => ({ ...it, discountAmount: 0 }));
  }

  // Proportional allocation to keep math consistent across line items.
  const centsTotal = Math.round(discountTotal * 100);
  const itemSubtotalsCents = items.map((it) => Math.round(it.product.price * it.quantity * 100));

  let allocatedCents = 0;
  const allocatedPerItem = itemSubtotalsCents.map((itemCents, idx) => {
    if (idx === itemSubtotalsCents.length - 1) {
      return centsTotal - allocatedCents; // remainder to last item to avoid drift
    }
    const share = itemCents / subtotal;
    const cents = Math.round(centsTotal * share);
    allocatedCents += cents;
    return cents;
  });

  return items.map((it, idx) => ({
    ...it,
    discountAmount: allocatedPerItem[idx] / 100
  }));
}

export function handlePOSRequest(config: AxiosRequestConfig & { url: string; method?: string }): POSMockResult | null {
  ensureInit();

  const url = config.url || '';
  const method = (config.method || 'GET').toUpperCase();
  const params = (config.params || {}) as Record<string, any>;
  const body = config.data as any;

  // ============================
  // GET /pos/categories
  // ============================
  if (method === 'GET' && url.includes('/pos/categories')) {
    return {
      status: 200,
      data: POS_CATEGORIES
    };
  }

  // ============================
  // GET /pos/products
  // ============================
  if (method === 'GET' && url.includes('/pos/products')) {
    const categoryId = (params.category as string | undefined) || undefined;
    const search = (params.search as string | undefined) || undefined;
    const page = Number(params.page || 1);
    const pageSize = Number(params.page_size || params.pageSize || 24);

    let list = productsStore!;

    if (categoryId && categoryId !== 'all') {
      list = list.filter((p) => p.category === categoryId);
    }

    list = list.filter((p) => matchProductSearch(p, search));

    const totalItems = list.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;

    return {
      status: 200,
      data: {
        items: list.slice(start, end),
        pagination: {
          current_page: safePage,
          page_size: pageSize,
          total_pages: totalPages,
          total_items: totalItems,
          has_next: safePage < totalPages,
          has_previous: safePage > 1
        }
      }
    };
  }

  // ============================
  // GET /pos/recent-orders
  // ============================
  if (method === 'GET' && url.includes('/pos/recent-orders')) {
    return {
      status: 200,
      data: {
        items: ordersStore
          .slice()
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .slice(0, 10)
      }
    };
  }

  // ============================
  // POST /pos/orders
  // ============================
  if (method === 'POST' && url.includes('/pos/orders')) {
    // TODO: This should call DRF endpoint POST /api/orders/ and trigger inventory + transaction services.

    const payload = body as POSOrderPayload;
    if (!payload?.items || !Array.isArray(payload.items) || !payload.employeeId) {
      return {
        status: 400,
        data: { error: 'Invalid order payload' }
      };
    }

    // Simulate stock decrement + simple completion.
    const nextItems: CartItem[] = payload.items.map((it) => ({ ...it }));

    // Allocate any provided discount number across line items for display purposes.
    const discountTotal = Number(payload.discount || 0);
    const withDiscountAllocation = allocateDiscountsBySubtotal(nextItems, discountTotal);

    for (const it of withDiscountAllocation) {
      const product = productsStore!.find((p) => p.id === it.product.id);
      if (!product) continue;
      // Guard against negative stock.
      product.stock = clampStock(product.stock - it.quantity);
    }

    const orderId = `pos_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const receiptNumber = getNextReceiptNumber();

    const orderPayments = payload.payments || [];
    const { cash } = getPaymentTotals(orderPayments);
    const changeOwed = payload.paymentMethod === 'cash' ? clampStock(cash - Number(payload.total || 0)) : 0;

    const order: Order = {
      ...payload,
      id: orderId,
      createdAt,
      items: withDiscountAllocation,
      status: 'completed'
    };

    ordersStore = [order, ...ordersStore].slice(0, 50);

    const transactionId = `txn_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const newTransaction: (typeof transactionsStore)[number] = {
      id: transactionId,
      type: 'sale' as const,
      amount: Number(payload.total || 0),
      paymentMethod: payload.paymentMethod,
      timestamp: createdAt,
      orderId,
      items: withDiscountAllocation
    };

    transactionsStore = [newTransaction, ...transactionsStore].slice(0, 200);

    const checkoutResult: CheckoutResult = {
      orderId,
      receiptNumber,
      ...(payload.paymentMethod === 'cash' ? { changeOwed } : {})
    };

    return {
      status: 200,
      data: checkoutResult
    };
  }

  return null;
}
