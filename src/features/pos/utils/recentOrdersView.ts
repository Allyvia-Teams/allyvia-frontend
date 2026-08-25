import type { Order } from '../types/pos.types';

export type RecentOrderRow = Order & { itemCount: number };

/**
 * Everything the Recent Orders drawer renders.
 *
 * A failed fetch must never render as an empty session. The clerk opens this
 * drawer to check whether a sale went through after a dropped connection, so
 * "no orders" reads to them as "it didn't" and the customer gets charged
 * twice. Orders that already loaded stay on screen when a refresh fails.
 */
export function buildRecentOrdersView(input: { items: Order[]; isLoading: boolean; isError: boolean }): {
  status: 'loading' | 'error' | 'empty' | 'list';
  orders: RecentOrderRow[];
  emptyLabel: string;
  errorLabel: string;
} {
  const { items, isLoading, isError } = input;

  const orders = items.map((order) => ({
    ...order,
    itemCount: order.items.reduce((sum, line) => sum + line.quantity, 0)
  }));

  let status: 'loading' | 'error' | 'empty' | 'list';
  if (isLoading && orders.length === 0) {
    status = 'loading';
  } else if (isError && orders.length === 0) {
    status = 'error';
  } else if (orders.length === 0) {
    status = 'empty';
  } else {
    status = 'list';
  }

  return {
    status,
    orders,
    emptyLabel: 'No orders yet in this session.',
    errorLabel: "Couldn't load recent orders. This does not mean the sale failed — check before re-ringing it."
  };
}
