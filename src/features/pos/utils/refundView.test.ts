import { describe, it, expect } from 'vitest';

import {
  refundEligibility,
  refundResultCopy,
  refundErrorCopy,
  restockingFeeLine,
  refundStateChip,
  isSameIdentityError
} from './refundView';
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

describe('refundErrorCopy — policy denial (422)', () => {
  // The server writes `detail` for the clerk to read to the customer. Rendering
  // it verbatim is the point: paraphrasing puts two different sentences about
  // the same rule in front of the clerk and the person they are refusing.
  it('renders the policy detail verbatim for a final-sale denial', () => {
    const detail = 'This item was sold as a final sale and cannot be returned.';
    expect(refundErrorCopy({ response: { status: 422, data: { detail, code: 'final_sale' } } })).toBe(detail);
  });

  it('renders the policy detail verbatim for a closed window', () => {
    const detail = 'The return window for this item has closed.';
    expect(refundErrorCopy({ response: { status: 422, data: { detail, code: 'outside_window' } } })).toBe(detail);
  });

  it('does not paraphrase or decorate the server copy', () => {
    const detail = 'This item must be returned to the location that sold it.';
    const copy = refundErrorCopy({ response: { status: 422, data: { detail, code: 'cross_location' } } });
    expect(copy).not.toMatch(/policy does not allow/i);
    expect(copy).toBe(detail);
  });

  it('still says something useful if a 422 arrives with no detail', () => {
    const copy = refundErrorCopy({ response: { status: 422, data: { code: 'receipt_required' } } });
    expect(copy).toMatch(/return policy/i);
  });
});

describe('refundErrorCopy — same_identity (403)', () => {
  // Not a permissions problem, and must not read as one: this manager MAY
  // approve refunds, just not the one they rang themselves. Telling them to
  // "ask a manager" when they are the manager sends them hunting for a
  // permission that is already granted.
  it('names the actual rule instead of blaming permissions', () => {
    const copy = refundErrorCopy({
      response: { status: 403, data: { code: 'same_identity', detail: 'The same user may not both initiate and approve a refund.' } }
    });
    expect(copy).toBe('A different manager has to approve this refund.');
  });

  it('does not tell a manager to ask a manager', () => {
    const copy = refundErrorCopy({ response: { status: 403, data: { code: 'same_identity' } } });
    expect(copy).not.toMatch(/do not have permission/i);
  });

  it('keeps the plain permission copy for a 403 without that code', () => {
    expect(refundErrorCopy({ response: { status: 403, data: {} } })).toMatch(/do not have permission/i);
  });
});

describe('restockingFeeLine', () => {
  it('states the fee as its own line when one was withheld', () => {
    const line = restockingFeeLine({ state: 'settled', method: 'card', amount: 4500, restocking_fee_minor: 500 });
    expect(line).toMatch(/\$5\.00/);
    expect(line).toMatch(/restocking fee/i);
  });

  it('is absent when no fee was charged', () => {
    expect(restockingFeeLine({ state: 'settled', method: 'card', amount: 5000, restocking_fee_minor: 0 })).toBeNull();
  });

  it('is absent when the server did not send the field at all', () => {
    expect(restockingFeeLine({ state: 'settled', method: 'card', amount: 5000 })).toBeNull();
  });

  it('does not subtract the fee from the refunded amount, which is already net of it', () => {
    const outcome = { state: 'settled' as const, method: 'card', amount: 4500, restocking_fee_minor: 500 };
    expect(refundResultCopy(outcome)).toMatch(/\$45\.00/);
    expect(refundResultCopy(outcome)).not.toMatch(/\$40\.00/);
  });
});

describe('refundStateChip', () => {
  it('does not call an unsettled refund "Refunded"', () => {
    expect(refundStateChip('pending_settlement').label).toBe('Sent');
    expect(refundStateChip('pending_settlement').label).not.toMatch(/refunded/i);
  });

  it('reserves "Refunded" for the settled state', () => {
    expect(refundStateChip('settled').label).toBe('Refunded');
    expect(refundStateChip('settled').color).toBe('success');
  });

  it('flags a parked refund as awaiting approval', () => {
    expect(refundStateChip('pending_approval')).toEqual({ label: 'Awaiting approval', color: 'warning' });
  });

  it('shows a failure as an error, not a neutral state', () => {
    expect(refundStateChip('refund_failed').color).toBe('error');
  });

  it('shows an unknown state verbatim rather than guessing', () => {
    expect(refundStateChip('some_new_state').label).toBe('some_new_state');
  });
});

describe('isSameIdentityError', () => {
  it('recognises the two-person refusal', () => {
    expect(isSameIdentityError({ response: { status: 403, data: { code: 'same_identity' } } })).toBe(true);
  });

  it('is false for a plain permission failure', () => {
    expect(isSameIdentityError({ response: { status: 403, data: {} } })).toBe(false);
  });

  it('is false for the same code on a different status', () => {
    expect(isSameIdentityError({ response: { status: 409, data: { code: 'same_identity' } } })).toBe(false);
  });

  it('is false for a network failure with no response', () => {
    expect(isSameIdentityError(new Error('Network Error'))).toBe(false);
  });

  // The point of checking `code` and not the copy: rewording refundErrorCopy
  // must not change how the failure is presented.
  it('does not depend on the wording of refundErrorCopy', () => {
    const err = { response: { status: 403, data: { code: 'same_identity' } } };
    expect(isSameIdentityError(err)).toBe(true);
    expect(refundErrorCopy(err)).toBe('A different manager has to approve this refund.');
  });
});
