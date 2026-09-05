import { describe, it, expect } from 'vitest';

import { refundEligibility, refundResultCopy, refundErrorCopy } from './refundView';
import type { Order } from '../types/pos.types';

const order = (over: Partial<Order> = {}): Order =>
  ({
    id: 'o1',
    items: [],
    subtotal: 50,
    tax: 4,
    discount: 0,
    total: 54,
    paymentMethod: 'card',
    payments: [],
    status: 'completed',
    createdAt: new Date().toISOString(),
    employeeId: 'e1',
    ...over
  }) as Order;

describe('refundEligibility', () => {
  it('allows a completed card sale', () => {
    const r = refundEligibility(order());
    expect(r.canRefund).toBe(true);
    expect(r.reason).toBe('');
  });

  it('refuses an already-refunded sale', () => {
    const r = refundEligibility(order({ status: 'refunded' }));
    expect(r.canRefund).toBe(false);
    expect(r.reason).toMatch(/already/i);
  });

  it('refuses a voided sale', () => {
    expect(refundEligibility(order({ status: 'voided' })).canRefund).toBe(false);
  });

  it('refuses a draft sale', () => {
    expect(refundEligibility(order({ status: 'draft' })).canRefund).toBe(false);
  });

  it('still allows a partially refunded sale, for the rest of it', () => {
    expect(refundEligibility(order({ status: 'partially_refunded' })).canRefund).toBe(true);
  });

  it('gives every refusal a reason a clerk can read aloud', () => {
    (['refunded', 'voided', 'draft'] as const).forEach((status) => {
      const r = refundEligibility(order({ status }));
      expect(r.canRefund).toBe(false);
      expect(r.reason.length).toBeGreaterThan(0);
    });
  });
});

describe('refundResultCopy — optimistic but honest', () => {
  it('never says refunded while the money is still in flight', () => {
    const copy = refundResultCopy({ state: 'pending_settlement', method: 'card', amount: 5400 });
    expect(copy).toMatch(/initiated/i);
    expect(copy).toMatch(/5–10 business days|5-10 business days/);
    expect(copy.toLowerCase()).not.toMatch(/\brefunded\b/);
  });

  it('says store credit was issued, because it settled outright', () => {
    const copy = refundResultCopy({ state: 'settled', method: 'store_credit', amount: 5400 });
    expect(copy).toMatch(/store credit/i);
    expect(copy).not.toMatch(/business days/);
  });

  it('says cash was returned from the drawer', () => {
    const copy = refundResultCopy({ state: 'settled', method: 'cash', amount: 5400 });
    expect(copy).toMatch(/cash/i);
  });

  it('reports a settled card refund as complete', () => {
    const copy = refundResultCopy({ state: 'settled', method: 'card', amount: 5400 });
    expect(copy).toMatch(/refunded/i);
  });

  it('does not promise anything for a refund awaiting approval', () => {
    const copy = refundResultCopy({ state: 'pending_approval', method: 'card', amount: 5400 });
    expect(copy).toMatch(/approval/i);
    expect(copy).not.toMatch(/business days/);
  });
});

describe('refundErrorCopy', () => {
  it('explains a dispute block instead of showing a 409', () => {
    const copy = refundErrorCopy({ response: { status: 409, data: { detail: 'under an open dispute' } } });
    expect(copy).toMatch(/dispute/i);
  });

  it('passes the server detail through for a 400, which is written for clerks', () => {
    const copy = refundErrorCopy({
      response: { status: 400, data: { detail: 'has no settled card payment, so it cannot be refunded to a card.' } }
    });
    expect(copy).toMatch(/no settled card payment/);
  });

  it('explains a permission failure', () => {
    const copy = refundErrorCopy({ response: { status: 403, data: {} } });
    expect(copy).toMatch(/permission|manager/i);
  });

  it('never blames the clerk for a network failure, and never implies the refund failed', () => {
    const copy = refundErrorCopy(new Error('Network Error'));
    expect(copy).toMatch(/could not|couldn't/i);
    expect(copy).toMatch(/check/i);
  });
});
