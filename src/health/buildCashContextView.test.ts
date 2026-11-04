import { describe, expect, it } from 'vitest';
import { buildCashContextView, cashContextKeyFor, cashContextQueryKey, cashContextFromResponse } from './buildCashContextView';

const observed = (over: Record<string, unknown> = {}) => ({
  basis: 'health_cash_context/1',
  scope: 'company',
  status: 'observed',
  reason: null,
  evaluated_at: '2026-11-04T15:00:00+00:00',
  business_date: '2026-11-04',
  cash: { amount: '3000.00', currency: 'USD', basis: 'quickbooks_bank_book_balance', unavailable_reason: null, verified: false },
  payables: {
    USD: {
      recorded: '580.00',
      due_buckets: { overdue: '80.00', today_through_7_days: '0.00', '8_through_30_days': '500.00', after_30_days: '0.00', undated: '0.00' }
    }
  },
  payables_complete: true,
  payables_confidence: 'high',
  reservations: {
    status: 'current',
    not_submitted_by_currency: { USD: '100.00' },
    possibly_committed_by_currency: {},
    allocation_overlap: 'within_supplied_projection'
  },
  possibly_paid_by_bank: { status: 'unavailable', reason: 'bank_not_selected', corroborated_outstanding_by_currency: null },
  complete: false,
  ...over
});

describe('buildCashContextView', () => {
  it('shows nothing for a missing, unknown or not-requested payload', () => {
    expect(buildCashContextView(null)).toBeNull();
    expect(buildCashContextView({ basis: 'something_else/9', status: 'observed' })).toBeNull();
    expect(buildCashContextView({ basis: 'health_cash_context/1', status: 'not_requested' })).toBeNull();
    expect(buildCashContextView({ basis: 'health_cash_context/1', status: 'surprise' })).toBeNull();
  });

  it('explains each state that has no figures in plain words', () => {
    expect(buildCashContextView({ basis: 'health_cash_context/1', status: 'not_permitted' })?.message).toBe(
      'Cash and bills are shown to roles with finance access.'
    );
    expect(buildCashContextView({ basis: 'health_cash_context/1', status: 'not_applicable' })?.message).toBe(
      'Cash and bills are company figures: a store has no cash of its own.'
    );
    const failed = buildCashContextView({ ...observed(), status: 'unavailable', reason: 'cash_context_unavailable' });
    expect(failed?.message).toBe('Cash and bills could not be read right now.');
    expect(failed?.cash).toBeNull();
    expect(failed?.payables).toEqual([]);
  });

  it('calls the book balance what it is, never verified cash', () => {
    const view = buildCashContextView(observed());
    expect(view?.message).toBeNull();
    expect(view?.cash).toBe('$3,000.00 in QuickBooks bank accounts, as recorded (not a verified balance)');
  });

  it('says why cash is missing and never prints a zero for it', () => {
    const reasons: Record<string, string> = {
      no_bank_book_balance: 'No QuickBooks bank balance is recorded, and takings are not cash.',
      bank_book_balances_in_multiple_currencies: 'QuickBooks bank balances are in more than one currency and cannot be added.',
      bank_book_balances_all_zero: 'Every QuickBooks bank balance reads zero, which can mean the balance is missing.',
      quickbooks_not_selected: 'Cash is not read here while another financial source is selected.',
      book_source_changed_during_read: 'The books changed while they were read; try again shortly.',
      something_new: 'Cash balance is unavailable.'
    };
    for (const [reason, words] of Object.entries(reasons)) {
      const view = buildCashContextView(
        observed({
          cash: { amount: null, currency: null, basis: 'quickbooks_bank_book_balance', unavailable_reason: reason, verified: false }
        })
      );
      expect(view?.cash).toBe(words);
      expect(view?.cash).not.toContain('$0.00 in');
    }
  });

  it('lists bills by currency with only the buckets that hold money', () => {
    const [usd] = buildCashContextView(observed())?.payables ?? [];
    expect(usd.total).toBe('$580.00 in recorded bills');
    expect(usd.buckets).toEqual([
      { label: 'Overdue', amount: '$80.00' },
      { label: 'Due in 8 to 30 days', amount: '$500.00' }
    ]);
  });

  it('keeps currencies apart and orders buckets by urgency', () => {
    const view = buildCashContextView(
      observed({
        payables: {
          USD: { recorded: '10.00', due_buckets: { undated: '10.00' } },
          CAD: {
            recorded: '30.00',
            due_buckets: { after_30_days: '10.00', today_through_7_days: '20.00' }
          }
        }
      })
    );
    expect(view?.payables.map((p) => p.currency)).toEqual(['CAD', 'USD']);
    expect(view?.payables[0].buckets.map((b) => b.label)).toEqual(['Due within 7 days', 'Due after 30 days']);
    expect(view?.payables[0].total).toBe('CA$30.00 in recorded bills');
    expect(view?.payables[1].buckets).toEqual([{ label: 'No due date', amount: '$10.00' }]);
  });

  it('says when there are no recorded bills, and when the record may be incomplete', () => {
    // The real shape: the liquidity signal lists a currency for every bank or card account too.
    const zeros = { overdue: '0.00', today_through_7_days: '0.00', '8_through_30_days': '0.00', after_30_days: '0.00', undated: '0.00' };
    const none = buildCashContextView(
      observed({ payables: { USD: { recorded: '0.00', due_buckets: zeros }, CAD: { recorded: '0.00', due_buckets: zeros } } })
    );
    expect(none?.payables).toEqual([]);
    expect(none?.notes).toContain('No recorded bills are outstanding.');
    expect(buildCashContextView(observed({ payables: {} }))?.notes).toContain('No recorded bills are outstanding.');
    const mixed = buildCashContextView(observed({ payables: { USD: { recorded: '5.00', due_buckets: {} }, CAD: { recorded: '0.00' } } }));
    expect(mixed?.payables.map((p) => p.currency)).toEqual(['USD']);
    const partial = buildCashContextView(observed({ payables_complete: false }));
    expect(partial?.notes).toContain('Recorded bills may be incomplete.');
    expect(buildCashContextView(observed())?.notes).not.toContain('Recorded bills may be incomplete.');
  });

  it('says scheduled payments are inside the bills only when the server checked that they are', () => {
    const view = buildCashContextView(observed());
    expect(view?.scheduled).toEqual(['$100.00 scheduled to pay bills but not yet sent (already counted in the bills above)']);
    for (const overlap of ['not_contained_in_supplied_projection', 'unverified', undefined]) {
      const other = buildCashContextView(
        observed({
          reservations: { allocation_overlap: overlap, not_submitted_by_currency: {}, possibly_committed_by_currency: { USD: '40.00' } }
        })
      );
      expect(other?.scheduled).toEqual(['$40.00 sent to the payment provider and may have left (may not be part of the bills shown)']);
    }
  });

  it('says when the books did not record a currency', () => {
    const view = buildCashContextView(
      observed({ cash: { amount: '3000.00', currency: 'unknown', unavailable_reason: null, verified: false } })
    );
    expect(view?.cash).toBe('3,000.00 (currency not recorded) in QuickBooks bank accounts, as recorded (not a verified balance)');
  });

  it('mentions bank payments that may already have paid bills only when there are some', () => {
    expect(buildCashContextView(observed())?.possiblyPaid).toEqual([]);
    const withheld = buildCashContextView(
      observed({ possibly_paid_by_bank: { status: 'unavailable', corroborated_outstanding_by_currency: { USD: '500.00' } } })
    );
    expect(withheld?.possiblyPaid).toEqual([]);
    const view = buildCashContextView(
      observed({ possibly_paid_by_bank: { status: 'current', corroborated_outstanding_by_currency: { USD: '500.00' } } })
    );
    expect(view?.possiblyPaid).toEqual(['$500.00 of these bills may already have been paid from the bank']);
  });

  it('never formats an unreadable amount as money', () => {
    const view = buildCashContextView(
      observed({
        cash: { amount: 'abc', currency: 'USD', unavailable_reason: null, verified: false },
        payables: { USD: { recorded: 'NaN', due_buckets: { overdue: 'x' } } }
      })
    );
    expect(view?.cash).toBe('Cash balance is unavailable.');
    expect(view?.payables[0].total).toBe('Recorded bills: amount unavailable');
    expect(view?.payables[0].buckets).toEqual([]);
  });

  it('closes with the rule that this is context, not the score', () => {
    expect(buildCashContextView(observed())?.footnote).toBe(
      'Context only: the score does not use these figures. The bank balance is as recorded in QuickBooks.'
    );
  });

  it('mentions QuickBooks in the footnote only beside a balance', () => {
    const none = buildCashContextView(
      observed({ cash: { amount: null, currency: null, unavailable_reason: 'quickbooks_not_selected', verified: false } })
    );
    expect(none?.footnote).toBe('Context only: the score does not use these figures.');
  });
});

describe('cash context request', () => {
  it('is keyed by user, company and role', () => {
    expect(cashContextQueryKey('u', 'c', 'r')).toEqual(['health-cash-context', 'u', 'c', 'r', 'company']);
  });

  it('has no key, so makes no request, unless the drawer asks and the identity is complete', () => {
    expect(cashContextKeyFor(false, 'u', 'c', 'r')).toBeNull();
    expect(cashContextKeyFor(true, 'u', 'c', undefined)).toBeNull();
    expect(cashContextKeyFor(true, null, 'c', 'r')).toBeNull();
    expect(cashContextKeyFor(true, 'u', 'c', 'r')).toEqual(cashContextQueryKey('u', 'c', 'r'));
  });

  it('accepts only a response for the requested company and role', () => {
    const response = { company_id: 'c', role_id: 'r', cash_context: observed() };
    expect(cashContextFromResponse(response, 'c', 'r')).toEqual(observed());
    expect(() => cashContextFromResponse(response, 'other', 'r')).toThrow();
    expect(() => cashContextFromResponse(null, 'c', 'r')).toThrow();
  });
});
