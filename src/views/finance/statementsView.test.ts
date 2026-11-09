import { describe, expect, it } from 'vitest';
import { balanceGap, expenseCategoryRows, expenseCoverageNote } from './statementsView';

describe('expenseCategoryRows', () => {
  it('shows a QuickBooks sub-account path with a chevron', () => {
    expect(expenseCategoryRows([{ category: 'Utilities:Electric', amount: 60 }])).toEqual([{ label: 'Utilities › Electric', amount: 60 }]);
  });

  it('sorts largest first and keeps a negative credit row last', () => {
    const rows = expenseCategoryRows([
      { category: 'Vendor credits', amount: -15 },
      { category: 'Rent', amount: 1200 },
      { category: 'Shipping', amount: 80 }
    ]);
    expect(rows.map((r) => r.label)).toEqual(['Rent', 'Shipping', 'Vendor credits']);
  });

  it('reads string amounts and drops amounts that are not numbers', () => {
    expect(
      expenseCategoryRows([
        { category: 'Rent', amount: '1200.50' },
        { category: 'Broken', amount: 'abc' },
        { category: 'Missing', amount: null },
        { category: 'Blank', amount: '' }
      ])
    ).toEqual([{ label: 'Rent', amount: 1200.5 }]);
  });

  it('names a blank category Uncategorized', () => {
    expect(expenseCategoryRows([{ category: '  ', amount: 4 }])).toEqual([{ label: 'Uncategorized', amount: 4 }]);
  });

  it('returns nothing for a missing payload', () => {
    expect(expenseCategoryRows(null)).toEqual([]);
    expect(expenseCategoryRows(undefined)).toEqual([]);
  });
});

describe('expenseCoverageNote', () => {
  it('lists what the figures leave out, with no call to action', () => {
    expect(
      expenseCoverageNote([
        { source: 'payroll', available: false },
        { source: 'processing_fees', available: false },
        { source: 'bank_card_feeds', available: false },
        { source: 'quickbooks', available: true }
      ])
    ).toEqual({ note: "Doesn't include payroll, card fees or bank feeds.", conflict: false });
  });

  it('uses "or" between two and nothing for one', () => {
    expect(expenseCoverageNote([{ source: 'payroll', available: false }]).note).toBe("Doesn't include payroll.");
    expect(
      expenseCoverageNote([
        { source: 'payroll', available: false },
        { source: 'processing_fees', available: false }
      ]).note
    ).toBe("Doesn't include payroll or card fees.");
  });

  it('spells an unknown source in plain words', () => {
    expect(expenseCoverageNote([{ source: 'shopify_payouts', available: false }]).note).toBe("Doesn't include shopify payouts.");
  });

  it('names Xero with its capital', () => {
    expect(expenseCoverageNote([{ source: 'xero', available: false }]).note).toBe("Doesn't include Xero.");
  });

  it('reports an accounting conflict as a conflict, not as a missing source', () => {
    expect(
      expenseCoverageNote([
        { source: 'accounting_conflict', available: false },
        { source: 'payroll', available: false }
      ])
    ).toEqual({ note: "Doesn't include payroll.", conflict: true });
  });

  it('says nothing when every source is in or there is no list', () => {
    expect(expenseCoverageNote([{ source: 'payroll', available: true }])).toEqual({ note: null, conflict: false });
    expect(expenseCoverageNote([])).toEqual({ note: null, conflict: false });
    expect(expenseCoverageNote(undefined)).toEqual({ note: null, conflict: false });
  });
});

describe('balanceGap', () => {
  it('is null when the sheet balances within 20 cents', () => {
    expect(balanceGap(100, 60, 40)).toBeNull();
    expect(balanceGap(100, 60, 39.81)).toBeNull();
  });

  it('is the size of the gap when it does not', () => {
    expect(balanceGap(100, 60, 30)).toBe(10);
    expect(balanceGap(100, 70, 40)).toBe(10);
  });

  it('is null when a figure is not a number', () => {
    expect(balanceGap(Number.NaN, 60, 40)).toBeNull();
  });
});
