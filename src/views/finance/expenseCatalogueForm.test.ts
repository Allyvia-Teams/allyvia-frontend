import { describe, it, expect } from 'vitest';
import { decimalCents, expensePayload } from './expenseCatalogueForm';

describe('expense capture', () => {
  it('preserves decimal strings without floating point roundoff', () => {
    expect(decimalCents('123456789.99')).toBe(12345678999n);
    expect(() => decimalCents('1.001')).toThrow();
    expect(() => decimalCents('-1.00')).toThrow();
  });
  it('validates split amounts exactly, including the one-cent mismatch', () => {
    const form = {
      amount: '0.30',
      date: '2026-09-01',
      recognized_date: '2026-09-01',
      currency: 'USD',
      payee: 'Shop',
      receipt_reference: '',
      lines: [
        { category_id: '1', treatment: 'operating_expense', amount: '0.10' },
        { category_id: '2', treatment: 'inventory', amount: '0.20' }
      ]
    };
    expect(expensePayload(form).amount).toBe('0.30');
    expect(() => expensePayload({ ...form, amount: '0.31' })).toThrow('Split amounts must equal the total');
  });
});

import { orderedExpenseGroups } from './expenseCatalogueForm';
it('orders inventory before labor, OpEx, CapEx, technology, marketing and miscellaneous', () => {
  const groups = orderedExpenseGroups([
    { group: 'misc', id: 'last' },
    { group: 'marketing', id: 'm' },
    { group: 'inventory', id: 'first' },
    { group: 'opex', id: 'rent' }
  ]);
  expect(groups.map((g) => g.key)).toEqual(['inventory', 'opex', 'marketing', 'misc']);
  expect(groups[0].rows[0].id).toBe('first');
});
