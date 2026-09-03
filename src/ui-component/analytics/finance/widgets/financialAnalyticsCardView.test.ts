import { describe, expect, it } from 'vitest';
import {
  donutRows,
  emptyDonutMessage,
  expenseDonutRows,
  invoiceDonutRows,
  normalizeExpenseBreakdown,
  paymentDonutRows
} from './financialAnalyticsCardView';

describe('expense donut (ALL-140 H2/M2)', () => {
  // The regression: /expense/breakdown/ returns a flat array, and the card
  // read `.by_category`, so this exact payload produced an empty donut.
  it('reads the flat array the breakdown endpoint actually returns', () => {
    const rows = expenseDonutRows([
      { category: 'Utilities', amount: 500 },
      { category: 'Rent', amount: '1200.50' }
    ]);

    expect(rows.map((r) => r.label)).toEqual(['Utilities', 'Rent']);
    expect(rows.map((r) => r.value)).toEqual([500, 1200.5]);
  });

  // M2: the tooltip read `item.total`, a field the endpoint does not send, so
  // every slice reported $0 regardless of its amount.
  it('formats the tooltip from amount, not the absent total field', () => {
    expect(expenseDonutRows([{ category: 'Utilities', amount: 500 }])[0].tooltip).toBe('$500.00');
    expect(expenseDonutRows([{ category: 'Rent', total: 900 }])[0].tooltip).toBe('$900.00');
  });

  it('still accepts the by_category shape if that view is ever routed', () => {
    const rows = normalizeExpenseBreakdown({ by_category: [{ category_name: 'Payroll', total: 42 }] });

    expect(rows).toEqual([{ category: 'Payroll', amount: 42 }]);
  });

  it('drops zero-amount categories and survives a null payload', () => {
    expect(expenseDonutRows([{ category: 'Utilities', amount: 0 }])).toEqual([]);
    expect(expenseDonutRows(null)).toEqual([]);
    expect(expenseDonutRows(undefined)).toEqual([]);
  });

  it('keeps negative categories such as vendor credits', () => {
    const rows = expenseDonutRows([{ category: 'Vendor Credits (−)', amount: -75 }]);

    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(-75);
  });
});

describe('invoice donut', () => {
  it('counts each status and omits empty ones', () => {
    const rows = invoiceDonutRows({ paid_count: 3, unpaid_count: 0, overdue_count: 1 });

    expect(rows.map((r) => r.label)).toEqual(['Paid', 'Overdue']);
    expect(rows.map((r) => r.tooltip)).toEqual(['3 invoices', '1 invoice']);
  });
});

describe('payment donut', () => {
  it('reads provider and the decimal-string amount', () => {
    const rows = paymentDonutRows([{ provider: 'Cash', amount: '250.00', count: 2 }]);

    expect(rows[0].label).toBe('Cash');
    expect(rows[0].value).toBe(250);
    expect(rows[0].tooltip).toBe('$250.00 (2 payments)');
  });

  it('accepts the payment_methods wrapper shape', () => {
    expect(paymentDonutRows({ payment_methods: [{ provider: 'Card', amount: '10', count: 1 }] })[0].label).toBe('Card');
  });
});

describe('empty states (ALL-140 M1)', () => {
  // The card previously fell back to `series=[100]`, drawing a full donut
  // labelled "No Payment Data Available" in *every* mode. An empty payload
  // must produce no slices at all, so the chart's own empty state renders.
  it('produces no slices rather than a fake full slice', () => {
    expect(donutRows('expense', { expenseBreakdown: [] })).toEqual([]);
    expect(donutRows('invoice', { invoiceStatistics: {} })).toEqual([]);
    expect(donutRows('payment', { paymentSplit: [] })).toEqual([]);
  });

  it('names the missing data per mode instead of always saying payment', () => {
    expect(emptyDonutMessage('expense')).toMatch(/expense/i);
    expect(emptyDonutMessage('invoice')).toMatch(/invoice/i);
    expect(emptyDonutMessage('payment')).toMatch(/payment/i);
    expect(emptyDonutMessage('expense')).not.toMatch(/payment/i);
  });
});
