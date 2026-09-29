import { describe, expect, it } from 'vitest';
import { pendingPaymentStore } from './vendorBillPending';

describe('unresolved vendor allocations', () => {
  it('recovers the exact key and payload after closing and recreating the dialog', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      }
    };
    const pending = {
      action: 'record-payment' as const,
      body: { amount: '200.00', paid_date: '2026-09-01', reference: 'BANK', idempotency_key: 'stable' }
    };
    pendingPaymentStore(storage).save('company-a', 'bill-a', pending);
    const reopened = pendingPaymentStore(storage);
    expect(reopened.read('company-a', 'bill-a')).toEqual(pending);
    expect(reopened.read('company-b', 'bill-a')).toBeNull();
    reopened.clear('company-a', 'bill-a');
    expect(reopened.read('company-a', 'bill-a')).toBeNull();
  });
});
