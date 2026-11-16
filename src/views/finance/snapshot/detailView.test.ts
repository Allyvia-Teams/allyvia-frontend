import { describe, expect, it } from 'vitest';
import type { FinanceCash, FinanceExpenses, FinanceProfit, FinanceSales, FinanceSnapshot } from 'api/financeSnapshot';
import {
  cashView,
  expensesView,
  gapView,
  orderSearchParams,
  pageFromParams,
  paymentMethodLabel,
  positionView,
  profitView,
  quickBooksExtrasAllowed,
  salesView
} from './detailView';
import qbSales from './fixtures/quickbooks-sales.json';
import qbProfit from './fixtures/quickbooks-profit.json';
import gapProfit from './fixtures/quickbooks-gap-profit.json';
import qbExpenses from './fixtures/quickbooks-expenses.json';
import bankExpenses from './fixtures/bank-expenses.json';
import qbCash from './fixtures/quickbooks-cash.json';
import bankCash from './fixtures/bank-cash.json';
import qbSnapshot from './fixtures/quickbooks-snapshot.json';
import bankSnapshot from './fixtures/bank-snapshot.json';

const RANGE = { start: '2026-10-01', end: '2026-10-31' };
const as = <T>(json: unknown) => json as T;

describe('salesView', () => {
  const view = salesView(as<FinanceSales>(qbSales).currencies[0]);
  it('shows the API figures as text', () => {
    expect(view.netSales.text).toBe('$14,495.67');
    expect(view.salesTax).toBe('$1,195.90');
    expect(view.refunds).toBe('$0.00');
  });
  it('lists every day the API gave, with its count', () => {
    expect(view.days).toEqual([
      { date: 'Oct 2', amount: '$1,250.00', count: '1 sale' },
      { date: 'Oct 9', amount: '$899.99', count: '1 sale' },
      { date: 'Oct 18', amount: '$12,345.67', count: '1 sale' },
      { date: 'Oct 30', amount: '$0.01', count: '1 sale' }
    ]);
  });
  it('labels payment methods and keeps money collected tax-inclusive, as sent', () => {
    expect(view.methods).toEqual([{ label: 'Card', amount: '$15,691.57' }]);
    expect(paymentMethodLabel('quickbooks_invoices')).toBe('QuickBooks invoices (billed)');
    expect(paymentMethodLabel('unknown')).toBe('Other');
  });
});

describe('orderSearchParams', () => {
  it('sends the page range and store to the order search', () => {
    expect(orderSearchParams(RANGE, 'loc-1', 2)).toEqual({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      locationId: 'loc-1',
      limit: 25,
      offset: 50
    });
    expect(orderSearchParams(RANGE, null, 0)).toEqual({ dateFrom: '2026-10-01', dateTo: '2026-10-31', limit: 25, offset: 0 });
  });
});

describe('pageFromParams', () => {
  it('reads a page index and ignores anything else', () => {
    expect(pageFromParams(new URLSearchParams('page=3'))).toBe(3);
    expect(pageFromParams(new URLSearchParams('page=-1'))).toBe(0);
    expect(pageFromParams(new URLSearchParams('page=abc'))).toBe(0);
    expect(pageFromParams(new URLSearchParams(''))).toBe(0);
  });
});

const RANGE_FOR_LINKS = { start: '2026-10-01', end: '2026-10-31' };

describe('profitView', () => {
  const view = profitView(as<FinanceProfit>(qbProfit).currencies[0]);
  it('is the statement in section 4 order, from the API lines', () => {
    expect(view.statement.map((l) => [l.label, l.text])).toEqual([
      ['Net sales', '$14,495.67'],
      ['Cost of goods sold', '$5,830.62'],
      ['Gross profit', '$8,665.05'],
      ['Operating expenses', '$8,269.00'],
      ['Net profit', '$396.05']
    ]);
  });
  it('puts the gross margin on the Gross profit line, from the API string', () => {
    expect(view.statement.map((l) => l.note ?? null)).toEqual([null, null, '59.78% margin', null, null]);
    const block = as<FinanceProfit>(qbProfit).currencies[0];
    const noSales = profitView({
      ...block,
      lines: block.lines.map((l) => (l.key === 'gross_margin_pct' ? { ...l, value: null } : l))
    });
    expect(noSales.statement[2].note).toBe('No margin without sales');
  });
  it('"Also this period" is sales tax, inventory bought and equipment; the margin is not there', () => {
    expect(view.also.map((l) => [l.label, l.text])).toEqual([
      ['Sales tax collected', '$1,195.90'],
      ['Inventory bought', '$900.00'],
      ['Equipment', '$2,750.00']
    ]);
  });
  it('lists operating expenses by bucket, each linking to its expenses with the range and store', () => {
    const linked = profitView(as<FinanceProfit>(qbProfit).currencies[0], { source: 'quickbooks', locationId: 'loc-1' }, RANGE_FOR_LINKS);
    expect(linked.buckets.map((b) => [b.label, b.amount, b.href])).toEqual([
      ['Payroll', '$4,200.00', '/finance/expenses?bucket=labour&start=2026-10-01&end=2026-10-31&location_id=loc-1'],
      ['Rent and running costs', '$2,818.64', '/finance/expenses?bucket=opex&start=2026-10-01&end=2026-10-31&location_id=loc-1'],
      ['Software', '$149.99', '/finance/expenses?bucket=technology&start=2026-10-01&end=2026-10-31&location_id=loc-1'],
      ['Marketing', '$1,100.37', '/finance/expenses?bucket=marketing&start=2026-10-01&end=2026-10-31&location_id=loc-1']
    ]);
  });
  it('says nothing about cost quality when every cost was recorded at sale', () => {
    expect(view.costNotes).toEqual([]);
  });
  it('calls out estimated and uncosted amounts from cogs_quality', () => {
    const block = as<FinanceProfit>(qbProfit).currencies[0];
    const notes = profitView({
      ...block,
      cogs_quality: { at_sale: '5000.00', estimated: '830.62', uncosted_lines: 2, uncosted_sales: '120.00' }
    }).costNotes;
    expect(notes).toEqual([
      "$830.62 of cost of goods is estimated from an item's cost after the sale",
      '2 sold lines ($120.00 of sales) have no cost recorded'
    ]);
  });
});

describe('gapView', () => {
  it('is absent when quickbooks_gap is null and the status says nothing to show', () => {
    const p = as<FinanceProfit>(qbProfit);
    expect(gapView({ ...p, quickbooks_gap_status: 'below_threshold' })).toBeNull();
    expect(gapView({ ...p, quickbooks_gap_status: 'not_applicable' })).toBeNull();
  });
  it('is one quiet line when QuickBooks could not be reached', () => {
    expect(gapView(as<FinanceProfit>(qbProfit))).toEqual({ quiet: 'QuickBooks could not be reached, so the comparison is not shown' });
  });
  it('shows the gap, QuickBooks net income and the three reasons in order when shown', () => {
    expect(gapView(as<FinanceProfit>(gapProfit))).toEqual({
      heading: 'Why this differs from QuickBooks',
      gap: '$4,150.00',
      quickbooksNetIncome: '-$3,753.95',
      reasons: [
        { label: 'POS sales not in QuickBooks', amount: '$14,495.67' },
        { label: 'Cost of goods sold instead of purchases', amount: '-$4,930.62' },
        { label: 'Other', amount: '-$5,415.05' }
      ]
    });
  });
});

describe('expensesView', () => {
  it('QuickBooks owners see account names under their bucket', () => {
    const view = expensesView(as<FinanceExpenses>(qbExpenses));
    expect(view.basis).toBe('Billed, from QuickBooks');
    expect(view.categories[0]).toEqual({
      bucket: 'inventory',
      value: 'Cost of Goods Sold',
      label: 'Cost of Goods Sold',
      amount: '$900.00'
    });
    expect(view.rows[0]).toEqual({
      id: expect.any(String),
      source: 'quickbooks',
      bankCategory: null,
      date: 'Oct 1',
      payee: 'payroll',
      category: 'Wages',
      amount: '$4,200.00'
    });
  });
  it('bank owners see bucket labels, paid basis', () => {
    const view = expensesView(as<FinanceExpenses>(bankExpenses));
    expect(view.basis).toBe('Paid, from your bank');
    expect(view.categories.map((c) => c.label)).toEqual([
      'Inventory bought',
      'Payroll',
      'Rent and running costs',
      'Equipment',
      'Software',
      'Marketing'
    ]);
    // The filter still sends the API's own label.
    expect(view.categories[1].value).toBe('Labour / payroll');
    expect(view.rows.map((r) => r.category)).toContain('Payroll');
    expect(view.rows.map((r) => r.category)).not.toContain('Labour / payroll');
  });
  it('an unavailable list says why instead of showing rows', () => {
    const view = expensesView({
      ...as<FinanceExpenses>(bankExpenses),
      status: 'unavailable',
      reason: 'Connect a bank to see expenses',
      results: [],
      count: 0
    });
    expect(view.unavailable).toBe('Connect a bank to see expenses');
  });
  it('a partial list carries its badge', () => {
    const view = expensesView({
      ...as<FinanceExpenses>(bankExpenses),
      status: 'partial',
      reason: '2 bank transactions ($750.00) not yet categorized'
    });
    expect(view.badge).toEqual({ label: 'Partial', tooltip: '2 bank transactions ($750.00) not yet categorized' });
  });
});

describe('cashView and positionView', () => {
  it('cash is balance, in, out and accounts per currency', () => {
    const view = cashView(as<FinanceCash>(bankCash).currencies[0]);
    expect(view.figures.map((r) => [r.label, r.text])).toEqual([
      ['Balance', '$10,000.00'],
      ['Money in', '$0.00'],
      ['Money out', '$11,919.00']
    ]);
    expect(view.accounts).toEqual([{ label: 'Checking ••0001', amount: '$10,000.00' }]);
    const qb = cashView(as<FinanceCash>(qbCash).currencies[0], { source: 'quickbooks' });
    expect(qb.figures.map((r) => [r.label, r.text])).toEqual([['Balance', '$10,000.00']]);
    expect(qb.note).toBe('QuickBooks provides balances only, so money in and out are not shown.');
  });
  it('position is cash by account, inventory at cost and unpaid bills', () => {
    const view = positionView(as<FinanceCash>(qbCash).currencies[0]);
    expect(view.figures.map((r) => r.label)).toEqual(['Cash', 'Inventory at cost', 'Unpaid bills']);
    expect(view.accounts).toEqual([{ label: 'Checking ••0001', amount: '$10,000.00' }]);
  });
});

describe('quickBooksExtrasAllowed', () => {
  it('only for QuickBooks owners', () => {
    expect(quickBooksExtrasAllowed(as<FinanceSnapshot>(qbSnapshot))).toBe(true);
    expect(quickBooksExtrasAllowed(as<FinanceSnapshot>(bankSnapshot))).toBe(false);
  });
});
