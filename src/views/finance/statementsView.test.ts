import { describe, expect, it } from 'vitest';
import { balanceGap, expenseCategoryRows, missingExpenseSourcesLine } from './statementsView';

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
        { category: 'Missing', amount: null }
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

describe('missingExpenseSourcesLine', () => {
  it('names the missing sources in one sentence', () => {
    expect(
      missingExpenseSourcesLine([
        { source: 'payroll', available: false },
        { source: 'processing_fees', available: false },
        { source: 'quickbooks', available: true }
      ])
    ).toBe("Payroll and card fees aren't connected, so expenses may be low.");
  });

  it('uses the singular for one source and a list for three', () => {
    expect(missingExpenseSourcesLine([{ source: 'bank_card_feeds', available: false }])).toBe(
      "Bank feeds isn't connected, so expenses may be low."
    );
    expect(
      missingExpenseSourcesLine([
        { source: 'payroll', available: false },
        { source: 'processing_fees', available: false },
        { source: 'bank_card_feeds', available: false }
      ])
    ).toBe("Payroll, card fees and bank feeds aren't connected, so expenses may be low.");
  });

  it('spells an unknown source in plain words', () => {
    expect(missingExpenseSourcesLine([{ source: 'shopify_payouts', available: false }])).toBe(
      "Shopify payouts isn't connected, so expenses may be low."
    );
  });

  it('says nothing when every source is connected or there is no list', () => {
    expect(missingExpenseSourcesLine([{ source: 'payroll', available: true }])).toBeNull();
    expect(missingExpenseSourcesLine([])).toBeNull();
    expect(missingExpenseSourcesLine(undefined)).toBeNull();
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
