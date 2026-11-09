import { describe, expect, it } from 'vitest';
import type { ExpenseReport } from 'types/expenseCatalogue';
import { billBalances, categoryTotal, recentExpenses } from './expensesView';

const line = (over: Partial<ExpenseReport['records'][number]>): ExpenseReport['records'][number] => ({
  source_id: 'qb_bill:b1:0',
  category: 'Unclassified QuickBooks',
  payee: 'Landlord LLC',
  treatment: 'operating_expense',
  amount: '100.00',
  currency: 'USD',
  recognized_date: '2026-11-04',
  recognized_expense: '100.00',
  cash_paid: '100.00',
  outstanding: '0.00',
  ...over
});

describe('recentExpenses', () => {
  it('makes one row per bill from its lines', () => {
    expect(
      recentExpenses([line({ source_id: 'qb_bill:b1:0', amount: '1800.00' }), line({ source_id: 'qb_bill:b1:1', amount: '212.40' })])
    ).toEqual([{ key: 'qb_bill:b1', date: '2026-11-04', payee: 'Landlord LLC', amount: 2012.4, unpaid: false }]);
  });

  it('groups a hand-entered expense by its entry id', () => {
    const rows = recentExpenses([
      line({ source_id: 'manual:x', entry_id: 'e1', amount: '30' }),
      line({ source_id: 'manual:x', entry_id: 'e1', amount: '20' })
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(50);
  });

  it('marks an expense unpaid only when something is still owed', () => {
    const rows = recentExpenses([
      line({ source_id: 'qb_bill:b1:0', outstanding: '0.00' }),
      line({ source_id: 'qb_bill:b2:0', outstanding: '40.00', recognized_date: '2026-11-05' })
    ]);
    expect(rows.map((r) => [r.key, r.unpaid])).toEqual([
      ['qb_bill:b2', true],
      ['qb_bill:b1', false]
    ]);
  });

  it('marks a QuickBooks bill unpaid from its balance', () => {
    const rows = recentExpenses(
      [line({ source_id: 'qb_bill:b1:0' }), line({ source_id: 'qb_bill:b2:0', recognized_date: '2026-11-03' })],
      10,
      new Map([
        ['b1', 500],
        ['b2', 0]
      ])
    );
    expect(rows.map((r) => [r.key, r.unpaid])).toEqual([
      ['qb_bill:b1', true],
      ['qb_bill:b2', false]
    ]);
  });

  it('puts the newest first and caps the list', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      line({ source_id: `qb_bill:b${i}:0`, recognized_date: `2026-11-${String(i + 1).padStart(2, '0')}` })
    );
    const rows = recentExpenses(many, 10);
    expect(rows).toHaveLength(10);
    expect(rows[0].date).toBe('2026-11-15');
  });

  it('names a blank payee and drops a line with no number', () => {
    expect(recentExpenses([line({ payee: '', amount: 'abc' }), line({ source_id: 'qb_bill:b9:0', payee: ' ' })])).toEqual([
      { key: 'qb_bill:b9', date: '2026-11-04', payee: 'No payee', amount: 100, unpaid: false }
    ]);
  });

  it('returns nothing for a missing report', () => {
    expect(recentExpenses(undefined)).toEqual([]);
  });
});

describe('categoryTotal', () => {
  it('adds the rows shown, credits included', () => {
    expect(
      categoryTotal([
        { label: 'Rent', amount: 1800 },
        { label: 'Vendor credits', amount: -25 }
      ])
    ).toBe(1775);
  });

  it('is zero with no rows', () => {
    expect(categoryTotal([])).toBe(0);
  });
});

describe('billBalances', () => {
  it('reads each bill id and its balance', () => {
    expect(
      billBalances({
        items: [
          { id: 'b1', balance: '500.00' },
          { id: 'b2', balance: '0.00' }
        ]
      })
    ).toEqual(
      new Map([
        ['b1', 500],
        ['b2', 0]
      ])
    );
  });

  it('skips junk and a missing payload', () => {
    expect(billBalances({ items: [{ id: 'b1', balance: 'x' }, { balance: '5' }] })).toEqual(new Map());
    expect(billBalances(null)).toEqual(new Map());
  });
});
