import { describe, expect, it } from 'vitest';

import { buildRefundHistoryView, buildSalesSearchView } from './refundSearchView';
import type { Order } from '../types/pos.types';
import type { PosRefundListItem } from 'api/stripe.api';

const order = (id = 's1'): Order =>
  ({
    id,
    items: [],
    subtotal: 10,
    tax: 0,
    discount: 0,
    total: 10,
    paymentMethod: 'card',
    payments: [],
    status: 'completed',
    createdAt: '2026-09-14T10:00:00Z',
    employeeId: 'e1'
  }) as Order;

const refund = (id = 'r1'): PosRefundListItem => ({
  id,
  refund_id: 're_1',
  state: 'settled',
  method: 'card',
  status: 'succeeded',
  amount: 1000,
  currency: 'usd',
  sale_id: 's1',
  sale_receipt_number: 'R-001',
  initiated_by_id: 'u1',
  initiated_by_email: 'clerk@store.test',
  line_items: [],
  created_at: '2026-09-14T10:00:00Z',
  updated_at: '2026-09-14T10:00:00Z'
});

describe('buildSalesSearchView', () => {
  it('is idle before the clerk has searched', () => {
    const view = buildSalesSearchView({ items: [], isLoading: false, isError: false, hasQuery: false });
    expect(view.status).toBe('idle');
  });

  it('is loading on a first fetch with nothing on screen', () => {
    const view = buildSalesSearchView({ items: [], isLoading: true, isError: false });
    expect(view.status).toBe('loading');
  });

  // The ALL-103 rule. This is the test that matters: a failed search rendering
  // as "no sales match" sends a customer away with goods they are owed for.
  it('renders a failed search as an error, NEVER as empty', () => {
    const view = buildSalesSearchView({ items: [], isLoading: false, isError: true });
    expect(view.status).toBe('error');
    expect(view.status).not.toBe('empty');
  });

  it('is empty only when the fetch actually succeeded', () => {
    const view = buildSalesSearchView({ items: [], isLoading: false, isError: false, hasQuery: true });
    expect(view.status).toBe('empty');
  });

  it('keeps rows on screen when a refresh fails, and marks them stale', () => {
    const view = buildSalesSearchView({ items: [order()], isLoading: false, isError: true });
    expect(view.status).toBe('list');
    expect(view.sales).toHaveLength(1);
    expect(view.isStale).toBe(true);
  });

  it('is not stale on a healthy list', () => {
    expect(buildSalesSearchView({ items: [order()], isLoading: false, isError: false }).isStale).toBe(false);
  });

  it('does not assert the sale is absent in its empty copy', () => {
    const view = buildSalesSearchView({ items: [], isLoading: false, isError: false });
    expect(view.emptyLabel).toMatch(/date range|refundable/i);
  });

  it('tells the clerk an error is not proof the sale is missing', () => {
    const view = buildSalesSearchView({ items: [], isLoading: false, isError: true });
    expect(view.errorLabel).toMatch(/does not mean/i);
  });
});

describe('buildRefundHistoryView', () => {
  it('renders a failed load as an error, NEVER as empty', () => {
    const view = buildRefundHistoryView({ items: [], isLoading: false, isError: true });
    expect(view.status).toBe('error');
  });

  it('is empty on a successful load with no refunds', () => {
    const view = buildRefundHistoryView({ items: [], isLoading: false, isError: false });
    expect(view.status).toBe('empty');
  });

  it('says something different when filtered to awaiting approval', () => {
    const pending = buildRefundHistoryView({ items: [], isLoading: false, isError: false, pendingOnly: true });
    const all = buildRefundHistoryView({ items: [], isLoading: false, isError: false });
    expect(pending.emptyLabel).toMatch(/waiting for approval/i);
    expect(pending.emptyLabel).not.toBe(all.emptyLabel);
  });

  it('warns that an error is not proof nothing was refunded', () => {
    const view = buildRefundHistoryView({ items: [], isLoading: false, isError: true });
    expect(view.errorLabel).toMatch(/does not mean/i);
  });

  it('keeps loaded refunds on screen when a refresh fails', () => {
    const view = buildRefundHistoryView({ items: [refund()], isLoading: false, isError: true });
    expect(view.status).toBe('list');
    expect(view.isStale).toBe(true);
  });
});
