import { useEffect, useMemo, useReducer } from 'react';

import type { CartItem, Product } from '../types/pos.types';

export type POSDiscountType = 'flat' | 'percent';

export interface POSOrderDiscount {
  code?: string;
  amount: number;
  type: POSDiscountType;
}

interface POSCartState {
  items: CartItem[];
  discount: POSOrderDiscount | null;
}

type Action =
  | { type: 'addItem'; product: Product }
  | { type: 'removeItem'; productId: string }
  | { type: 'updateQuantity'; productId: string; quantity: number }
  | { type: 'setItemUnitPrice'; productId: string; price: number }
  | { type: 'applyDiscount'; discount: POSOrderDiscount | null }
  | { type: 'clearCart' };

const STORAGE_KEY = 'allyvia_pos_cart_v1';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function safeNumber(n: unknown, fallback = 0) {
  const num = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(num) ? num : fallback;
}

function recalcDiscountAllocation(items: CartItem[], discount: POSOrderDiscount | null): CartItem[] {
  if (!discount || !discount.amount || discount.amount <= 0) {
    return items.map((it) => ({ ...it, discountAmount: 0 }));
  }

  const subtotal = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
  if (subtotal <= 0) return items.map((it) => ({ ...it, discountAmount: 0 }));

  let discountTotal = 0;
  if (discount.type === 'flat') {
    discountTotal = clamp(discount.amount, 0, subtotal);
  } else {
    discountTotal = clamp((subtotal * discount.amount) / 100, 0, subtotal);
  }

  const centsTotal = Math.round(discountTotal * 100);
  if (centsTotal <= 0) return items.map((it) => ({ ...it, discountAmount: 0 }));

  const itemSubtotalsCents = items.map((it) => Math.round(it.product.price * it.quantity * 100));
  const subtotalCents = itemSubtotalsCents.reduce((sum, cents) => sum + cents, 0);

  let allocated = 0;
  const allocatedPerItem = itemSubtotalsCents.map((itemCents, idx) => {
    if (idx === itemSubtotalsCents.length - 1) return centsTotal - allocated;
    const share = subtotalCents > 0 ? itemCents / subtotalCents : 0;
    const cents = Math.round(centsTotal * share);
    allocated += cents;
    return cents;
  });

  const nextItems = items.map((it, idx) => ({
    ...it,
    discountAmount: allocatedPerItem[idx] / 100
  }));

  return nextItems;
}

function loadInitialState(): POSCartState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], discount: null };
    const parsed = JSON.parse(raw) as POSCartState;
    if (!parsed || !Array.isArray(parsed.items)) return { items: [], discount: null };
    return {
      items: parsed.items,
      discount: parsed.discount || null
    };
  } catch {
    return { items: [], discount: null };
  }
}

function reducer(state: POSCartState, action: Action): POSCartState {
  switch (action.type) {
    case 'addItem': {
      const existing = state.items.find((it) => it.product.id === action.product.id);
      const nextItems: CartItem[] = existing
        ? state.items.map((it) =>
            it.product.id === action.product.id
              ? { ...it, quantity: it.quantity + 1 } // discounts recalculated below
              : it
          )
        : [...state.items, { product: action.product, quantity: 1, discountAmount: 0 }];

      const next = { ...state, items: nextItems };
      return { ...next, items: recalcDiscountAllocation(next.items, next.discount) };
    }
    case 'removeItem': {
      const nextItems = state.items.filter((it) => it.product.id !== action.productId);
      return { ...state, items: recalcDiscountAllocation(nextItems, state.discount) };
    }
    case 'updateQuantity': {
      const qty = Math.max(0, Math.floor(action.quantity));
      const nextItems = state.items
        .map((it) => (it.product.id === action.productId ? { ...it, quantity: qty } : it))
        .filter((it) => it.quantity > 0);
      return { ...state, items: recalcDiscountAllocation(nextItems, state.discount) };
    }
    case 'setItemUnitPrice': {
      const price = safeNumber(action.price);
      const nextItems = state.items.map((it) =>
        it.product.id === action.productId
          ? {
              ...it,
              product: { ...it.product, price }
            }
          : it
      );
      return { ...state, items: recalcDiscountAllocation(nextItems, state.discount) };
    }
    case 'applyDiscount': {
      const nextDiscount = action.discount;
      const nextItems = recalcDiscountAllocation(state.items, nextDiscount);
      return { ...state, discount: nextDiscount, items: nextItems };
    }
    case 'clearCart':
      return { items: [], discount: null };
    default:
      return state;
  }
}

export function usePOSCart() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const init = loadInitialState();
    return { ...init, items: recalcDiscountAllocation(init.items || [], init.discount) };
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const derived = useMemo(() => {
    const subtotal = state.items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
    const discount = state.items.reduce((sum, it) => sum + (it.discountAmount || 0), 0);
    const tax = state.items.reduce((sum, it) => {
      const discountedLine = it.product.price * it.quantity - (it.discountAmount || 0);
      const lineTax = discountedLine * (it.product.taxRate || 0);
      return sum + lineTax;
    }, 0);

    const total = subtotal - discount + tax;
    const itemCount = state.items.reduce((sum, it) => sum + it.quantity, 0);

    return {
      subtotal,
      discount,
      tax,
      total,
      itemCount
    };
  }, [state.items]);

  return {
    items: state.items,
    discount: state.discount,
    derived,
    addItem: (product: Product) => dispatch({ type: 'addItem', product }),
    removeItem: (productId: string) => dispatch({ type: 'removeItem', productId }),
    updateQuantity: (productId: string, quantity: number) => dispatch({ type: 'updateQuantity', productId, quantity }),
    setItemUnitPrice: (productId: string, price: number) => dispatch({ type: 'setItemUnitPrice', productId, price }),
    applyDiscount: (discount: POSOrderDiscount | null) => dispatch({ type: 'applyDiscount', discount }),
    clearCart: () => dispatch({ type: 'clearCart' })
  };
}
