import { describe, expect, it } from 'vitest';

import type { Order } from '../types/pos.types';
import { buildRecentOrdersView } from './recentOrdersView';

function makeOrder(id: string, quantities: number[]): Order {
  return {
    id,
    items: quantities.map((quantity, i) => ({
      product: { id: `p${i}`, name: `Item ${i}`, sku: `SKU-${i}`, category: 'Tops', price: 10, stock: 5, taxRate: 0.08 },
      quantity,
      discountAmount: 0
    })),
    subtotal: 100,
    tax: 8,
    discount: 0,
    total: 108,
    paymentMethod: 'card',
    payments: [],
    status: 'completed',
    createdAt: '2026-08-25T10:00:00Z',
    employeeId: 'e1'
  };
}

const idle = { isLoading: false, isError: false };

describe('buildRecentOrdersView', () => {
  it('never reports a failed fetch as an empty session', () => {
    // THE bug: a dropped connection rendered "No orders yet in this session."
    // The clerk opens this drawer precisely to check whether a sale went
    // through, reads that as "it didn't", and rings the customer twice.
    const view = buildRecentOrdersView({ items: [], isLoading: false, isError: true });

    expect(view.status).toBe('error');
    expect(view.emptyLabel).not.toBe(view.errorLabel);
  });

  it('warns against re-ringing rather than merely reporting the failure', () => {
    // Safety-critical copy: "couldn't load" alone still reads as "no sale".
    const view = buildRecentOrdersView({ items: [], isLoading: false, isError: true });

    expect(view.errorLabel).toContain('does not mean the sale failed');
  });

  it('reports a genuinely empty session as empty', () => {
    const view = buildRecentOrdersView({ ...idle, items: [] });

    expect(view.status).toBe('empty');
    expect(view.emptyLabel).toBe('No orders yet in this session.');
  });

  it('keeps showing orders that did load when a refresh fails', () => {
    const view = buildRecentOrdersView({ items: [makeOrder('A1', [2])], isLoading: false, isError: true });

    expect(view.status).toBe('list');
    expect(view.orders).toHaveLength(1);
  });

  it('totals units per order rather than counting lines', () => {
    const view = buildRecentOrdersView({ ...idle, items: [makeOrder('A1', [2, 3, 1])] });

    expect(view.status).toBe('list');
    expect(view.orders[0].itemCount).toBe(6);
    expect(view.orders[0].items).toHaveLength(3);
  });

  it('is loading until the first response arrives', () => {
    const view = buildRecentOrdersView({ items: [], isLoading: true, isError: false });

    expect(view.status).toBe('loading');
  });
});
