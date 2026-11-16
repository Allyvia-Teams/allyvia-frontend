import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Navigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { FinanceCash, FinanceExpenses, FinanceProfit, FinanceSnapshot } from 'api/financeSnapshot';
import type { SalesSearchResponse } from 'features/pos/api/posApi';

// The api clients and the store load browser-only modules at import; these tests render the
// props-only bodies, so neither is reached.
vi.mock('utils/axios', () => ({ default: {} }));
vi.mock('store', () => ({ useSelector: () => null, useDispatch: () => () => undefined, store: {} }));
vi.mock('react-apexcharts', () => ({ default: () => null }));
// The moved QuickBooks tabs pull in MUI's data grid CSS, which vitest cannot load; the gate test
// only needs to know whether they would render.
vi.mock('../tabs/Invoices', () => ({ default: () => null }));
vi.mock('../tabs/Payments', () => ({ default: () => null }));
vi.mock('../tabs/BalanceSheetSection', () => ({ default: () => null }));

import type { Loadable } from './SnapshotSections';
import { SalesBody } from './SalesDetail';
import { ProfitBody } from './ProfitDetail';
import { ExpensesBody } from './ExpensesDetail';
import { CashBody } from './CashDetail';
import { PositionBody } from './PositionDetail';
import { QuickBooksGate, extrasView } from './QuickBooksExtras';
import { QuickBooksPaymentsBody } from './QuickBooksPayments';
import { quickBooksPaymentsRows } from './detailView';
import qbSales from './fixtures/quickbooks-sales.json';
import twoSales from './fixtures/two-currency-sales.json';
import qbProfit from './fixtures/quickbooks-profit.json';
import gapProfit from './fixtures/quickbooks-gap-profit.json';
import qbExpenses from './fixtures/quickbooks-expenses.json';
import bankExpenses from './fixtures/bank-expenses.json';
import qbCash from './fixtures/quickbooks-cash.json';
import bankCash from './fixtures/bank-cash.json';
import qbSnapshot from './fixtures/quickbooks-snapshot.json';
import bankSnapshot from './fixtures/bank-snapshot.json';

const RANGE = { start: '2026-10-01', end: '2026-10-31' };
const loaded = <T,>(data: unknown): Loadable<T> => ({ data: data as T, isLoading: false, isError: false, refetch: () => {} });
const pending: Loadable<never> = { isLoading: true, isError: false, refetch: () => {} };
const failed: Loadable<never> = { isLoading: false, isError: true, refetch: () => {} };
const html = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
const text = (h: string) =>
  h
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');
const clean = (visible: string) => expect(visible).not.toMatch(/NaN|undefined|\bnull\b/);

const ORDERS: SalesSearchResponse = {
  count: 1,
  items: [
    {
      id: 'order-1',
      receiptNumber: 'R-1001',
      total: 1353.13,
      paymentMethod: 'card',
      status: 'completed',
      createdAt: '2026-10-02T15:00:00Z'
    } as never
  ]
};
const sales = (s: unknown, orders: Loadable<SalesSearchResponse> = loaded(ORDERS)) => (
  <SalesBody sales={loaded(s)} orders={orders} page={0} onPage={() => {}} range={RANGE} />
);

describe('Sales', () => {
  const page = html(sales(qbSales));
  const visible = text(page);
  it('links back to the snapshot with the range', () => {
    expect(page).toContain('href="/finance?start=2026-10-01&amp;end=2026-10-31"');
    expect(visible).toContain('Finance & accounting');
  });
  it('shows net sales, refunds, tax, channel, payment method and days from the API', () => {
    for (const s of [
      '$14,495.67',
      'Refunds (sales value)',
      '$0.00',
      '$1,195.90',
      'Allyvia POS',
      'Card',
      '$15,691.57',
      'Oct 18 · 1 sale',
      '$12,345.67'
    ])
      expect(visible).toContain(s);
    clean(visible);
  });
  it('lists the orders', () => {
    expect(visible).toContain('R-1001');
    expect(visible).toContain('$1,353.13');
  });
  it('two currencies are two labelled groups', () => {
    expect(html(sales(twoSales))).toContain('aria-label="Figures in CAD"');
  });
  it('loading is skeletons; errors are inline with Retry per section', () => {
    expect(html(<SalesBody sales={pending} orders={pending} page={0} onPage={() => {}} range={RANGE} />)).toContain('MuiSkeleton');
    const v = text(html(sales(qbSales, failed)));
    expect(v).toContain("Couldn't load the orders.");
    expect(v).toContain('Retry');
    expect(v).toContain('$14,495.67');
  });
});

describe('Sales copy (session 9)', () => {
  it('refunds are the sales value, invoices are billed, receipts include tax', () => {
    const qb = structuredClone(qbSales) as { currencies: { by_payment_method: { method: string; collected: string }[] }[] };
    qb.currencies[0].by_payment_method.push({ method: 'quickbooks_invoices', collected: '200.00' });
    const visible = text(html(sales(qb)));
    expect(visible).toContain('Refunds (sales value)');
    expect(visible).not.toContain('net of tax)');
    expect(visible).toContain('QuickBooks invoices (billed) $200.00');
    expect(visible).toContain('Receipt totals include tax');
  });
});

describe('Position (session 9)', () => {
  it('a null items_missing_cost shows nothing; a count shows the note', () => {
    const c = structuredClone(qbCash) as unknown as FinanceCash;
    c.currencies[0].position.items_missing_cost = null;
    const none = text(html(<PositionBody cash={loaded<FinanceCash>(c)} range={RANGE} />));
    expect(none).not.toMatch(/no cost|null|undefined|NaN/);
    c.currencies[0].position.items_missing_cost = 3;
    expect(text(html(<PositionBody cash={loaded<FinanceCash>(c)} range={RANGE} />))).toContain(
      '3 items in stock have no cost, so they are not counted'
    );
  });
});

describe('Profit', () => {
  it('shows the statement and the lines beside it', () => {
    const visible = text(html(<ProfitBody profit={loaded(qbProfit)} range={RANGE} />));
    for (const s of [
      'Net sales',
      'Cost of goods sold',
      '$5,830.62',
      'Gross profit',
      'Operating expenses',
      'Net profit',
      '$396.05',
      '59.78% margin',
      'Also this period',
      'Not part of profit',
      'Equipment'
    ])
      expect(visible).toContain(s);
    expect(visible).not.toMatch(/Beside the statement|Not in profit|Gross margin|Equipment and build-out/);
    expect(visible).toMatch(/Gross profit \$8,665\.05 59\.78% margin Operating expenses/);
    clean(visible);
  });
  it('bucket rows link to the expenses for that bucket', () => {
    const page = html(<ProfitBody profit={loaded(qbProfit)} range={RANGE} />);
    expect(page).toMatch(/href="\/finance\/expenses\?bucket=labour&amp;start=2026-10-01&amp;end=2026-10-31"[^>]*>Payroll</);
    expect(page).toMatch(/href="\/finance\/expenses\?bucket=marketing&amp;start=2026-10-01&amp;end=2026-10-31"[^>]*>Marketing</);
  });
  it('Cost accuracy appears only when estimated cost or uncosted lines are above zero', () => {
    const p = qbProfit as unknown as FinanceProfit;
    expect(text(html(<ProfitBody profit={loaded(p)} range={RANGE} />))).not.toContain('Cost accuracy');
    const withQuality = (q: FinanceProfit['currencies'][number]['cogs_quality']) =>
      text(html(<ProfitBody profit={loaded({ ...p, currencies: [{ ...p.currencies[0], cogs_quality: q }] })} range={RANGE} />));
    expect(withQuality({ at_sale: '5000.00', estimated: '830.62', uncosted_lines: 0, uncosted_sales: '0.00' })).toContain('Cost accuracy');
    expect(withQuality({ at_sale: '5000.00', estimated: '0.00', uncosted_lines: 2, uncosted_sales: '120.00' })).toContain(
      '2 sold lines ($120.00 of sales) have no cost recorded'
    );
  });
  it('every statement line shows its badge or "Not available" as the tiles do', () => {
    const p = structuredClone(qbProfit) as unknown as FinanceProfit;
    const lines = p.currencies[0].lines;
    const set = (key: string, f: { value: string | null; status: 'exact' | 'estimated' | 'partial' | 'unavailable'; reason: string }) =>
      Object.assign(lines.find((l) => l.key === key)!, f);
    set('cogs', { value: '5830.62', status: 'estimated', reason: '1 sold lines have no cost recorded' });
    set('operating_expenses', { value: '8269.00', status: 'partial', reason: '2 bank transactions ($750.00) not yet categorized' });
    set('net_profit', { value: null, status: 'unavailable', reason: 'Connect a bank to see expenses' });
    const page = html(<ProfitBody profit={loaded(p)} range={RANGE} />);
    const visible = text(page);
    expect(visible).toMatch(/Cost of goods sold Estimated \$5,830\.62/);
    expect(visible).toMatch(/Operating expenses Partial \$8,269\.00/);
    expect(visible).toMatch(/Net profit Not available Connect a bank to see expenses/);
    expect(page).toContain('aria-label="Partial: 2 bank transactions ($750.00) not yet categorized"');
    clean(visible);
  });
  it('the gap panel is absent when quickbooks_gap is null', () => {
    const p = qbProfit as unknown as FinanceProfit;
    for (const status of ['below_threshold', 'not_applicable'] as const) {
      const visible = text(
        html(<ProfitBody profit={loaded({ ...p, quickbooks_gap: null, quickbooks_gap_status: status })} range={RANGE} />)
      );
      expect(visible).not.toContain('Why this differs from QuickBooks');
      expect(visible).not.toContain('could not be reached');
    }
  });
  it('QuickBooks unreachable is one quiet line and nothing else', () => {
    const visible = text(html(<ProfitBody profit={loaded(qbProfit)} range={RANGE} />));
    expect(visible).toContain('QuickBooks could not be reached, so the comparison is not shown');
    expect(visible).not.toContain('Why this differs from QuickBooks');
  });
  it('shows the gap with its three reasons when shown', () => {
    const visible = text(html(<ProfitBody profit={loaded(gapProfit)} range={RANGE} />));
    for (const s of [
      'Why this differs from QuickBooks',
      '$4,150.00',
      '-$3,753.95',
      'POS sales not in QuickBooks',
      'Cost of goods sold instead of purchases',
      '-$5,415.05'
    ])
      expect(visible).toContain(s);
  });
});

describe('Expenses', () => {
  const body = (data: unknown, bankSection?: ReactElement) =>
    html(
      <ExpensesBody
        expenses={loaded<FinanceExpenses>(data)}
        bucket={null}
        category={null}
        page={0}
        onFilter={() => {}}
        range={RANGE}
        bankSection={bankSection}
      />
    );
  it('QuickBooks owners see account categories and rows', () => {
    const visible = text(body(qbExpenses));
    for (const s of ['Billed, from QuickBooks', 'Wages', 'Cost of Goods Sold', '$900.00', 'payroll', 'Not yet categorized'])
      expect(visible).toContain(s);
    clean(visible);
  });
  it('bank owners see the bank section the page is given', () => {
    const visible = text(body(bankExpenses, <p>BANK REVIEW</p>));
    expect(visible).toContain('Paid, from your bank');
    expect(visible).toContain('BANK REVIEW');
  });
  it('unavailable says why and lists no rows', () => {
    const visible = text(
      body({
        ...(bankExpenses as object),
        status: 'unavailable',
        reason: 'Connect a bank to see expenses',
        categories: [],
        results: [],
        count: 0
      })
    );
    expect(visible).toContain('Connect a bank to see expenses');
    expect(visible).not.toContain('$0.00');
  });
  it('a QuickBooks and Xero conflict points to Settings', () => {
    const h = body({
      ...(qbExpenses as object),
      expense_source: 'accounting_conflict',
      status: 'unavailable',
      reason: 'QuickBooks and Xero are both connected; choose one to see expenses'
    });
    expect(h).toContain('href="/settings?tab=integrations"');
  });
});

describe('Cash and What you have and owe', () => {
  it('cash shows in, out, balance and accounts; QuickBooks says once that it gives balances only', () => {
    const visible = text(html(<CashBody cash={loaded<FinanceCash>(qbCash)} range={RANGE} />));
    expect(visible).not.toContain('Not available');
    expect(visible).not.toMatch(/connect a bank/i);
    expect(visible.match(/QuickBooks provides balances only, so money in and out are not shown\./g)).toHaveLength(1);
    expect(visible).toContain('Checking ••0001');
    clean(visible);
    expect(text(html(<CashBody cash={loaded<FinanceCash>(bankCash)} range={RANGE} />))).toContain('$11,919.00');
  });
  it('position is never called a balance sheet', () => {
    const visible = text(html(<PositionBody cash={loaded<FinanceCash>(qbCash)} range={RANGE} />));
    expect(visible).toContain('What you have and owe');
    expect(visible).toContain('Inventory at cost');
    expect(visible).toContain('Unpaid bills');
    expect(visible).toContain('A simple view of what the business holds and owes. This is not a balance sheet.');
    // The one mention is the sentence that says it is not one.
    expect(visible.toLowerCase().match(/balance sheet/g)).toHaveLength(1);
    clean(visible);
  });
});

describe('Cash page (session 9)', () => {
  it('QuickBooks owner: balance, the one line, accounts; no cash flow statement', () => {
    const visible = text(html(<CashBody cash={loaded<FinanceCash>(qbCash)} range={RANGE} />));
    expect(visible).toMatch(
      /Cash Balance \$10,000\.00 QuickBooks provides balances only, so money in and out are not shown\. Accounts Checking ••0001 \$10,000\.00/
    );
    expect(visible).not.toMatch(/Total cash in|Cash Flow Statement|Operating Activities|Investing|Financing|Net flow/i);
    expect(visible).not.toContain('Review bank transactions');
    clean(visible);
  });
  it('bank owner: balance, money in, money out, accounts, last synced and the review link', () => {
    const page = html(<CashBody cash={loaded<FinanceCash>(bankCash)} range={RANGE} />);
    const visible = text(page);
    expect(visible).toMatch(
      /Not synced yet .*Cash Balance \$10,000\.00 Money in \$0\.00 Money out \$11,919\.00 Accounts Checking ••0001 \$10,000\.00/
    );
    expect(page).toMatch(/<a [^>]*href="\/finance\/expenses\?start=2026-10-01&amp;end=2026-10-31"[^>]*>Review bank transactions<\/a>/);
    expect(visible).not.toContain('QuickBooks provides balances only');
    clean(visible);
  });
  it('a store view has no review link', () => {
    expect(text(html(<CashBody cash={loaded<FinanceCash>(bankCash)} range={RANGE} locationId="loc-1" />))).not.toContain(
      'Review bank transactions'
    );
  });
});

describe('QuickBooks payments recorded', () => {
  const FLOW = {
    period: { from: '2026-10-01', to: '2026-10-31' },
    currency: 'USD',
    cash_flow: {
      operating_activities: {
        cash_in: { customer_payments: 1200.5, total_operating_in: 1200.5 },
        cash_out: { vendor_payments: 300, operating_expenses: 45.25, total_operating_out: 345.25 },
        net_operating: 855.25
      },
      investing_activities: { cash_in: 0, cash_out: 0, net_investing: 0 },
      financing_activities: { cash_in: 0, cash_out: 0, net_financing: 0 },
      summary: { net_cash_flow: 855.25, cash_in_total: 1200.5, cash_out_total: 345.25 }
    }
  };
  it('plain rows from the endpoint, investing and financing left out', () => {
    expect(quickBooksPaymentsRows(FLOW)).toEqual([
      { label: 'Invoice payments received', amount: '$1,200.50' },
      { label: 'Bills paid', amount: '$300.00' },
      { label: 'Other purchases paid', amount: '$45.25' },
      { label: 'Received less paid', amount: '$855.25' }
    ]);
    expect(quickBooksPaymentsRows(null)).toBeNull();
  });
  it('a missing amount reads Not available, never $0.00', () => {
    const partialFlow = structuredClone(FLOW) as unknown as Parameters<typeof quickBooksPaymentsRows>[0] & object;
    delete (partialFlow!.cash_flow.operating_activities.cash_out as { vendor_payments?: number }).vendor_payments;
    expect(quickBooksPaymentsRows(partialFlow)?.[1]).toEqual({ label: 'Bills paid', amount: 'Not available' });
  });
  it('is titled, explains itself, and has no tiles or green and red amounts', () => {
    const page = html(<QuickBooksPaymentsBody rows={quickBooksPaymentsRows(FLOW)} loading={false} error={null} />);
    const visible = text(page);
    expect(visible).toContain('QuickBooks payments recorded');
    expect(visible).toContain('Invoice payments received and bills paid, as recorded in QuickBooks. Register sales are not included.');
    expect(visible).toContain('Received less paid $855.25');
    expect(page).not.toMatch(/MuiCard|AllyviaStats|#2e7d32|#d32f2f|success\.main|error\.main/i);
    expect(visible).not.toMatch(/Total cash in|Net cash flow/i);
  });
  it('loading and failure', () => {
    expect(html(<QuickBooksPaymentsBody rows={null} loading error={null} />)).toContain('MuiSkeleton');
    expect(text(html(<QuickBooksPaymentsBody rows={null} loading={false} error="boom" />))).toContain(
      "Couldn't load the payments QuickBooks recorded."
    );
  });
});

describe('QuickBooks extras', () => {
  const gate = (snapshot: unknown) =>
    QuickBooksGate({ snapshot: loaded<FinanceSnapshot>(snapshot), range: RANGE, children: <p>EXTRAS</p> });
  it('a bank-source owner is redirected to /finance with the range', () => {
    const el = gate(bankSnapshot);
    expect(isValidElement(el) && el.type).toBe(Navigate);
    expect(isValidElement(el) && (el.props as { to: string }).to).toBe('/finance?start=2026-10-01&end=2026-10-31');
  });
  it('a QuickBooks owner sees the page', () => {
    expect(text(html(gate(qbSnapshot) as ReactElement))).toContain('EXTRAS');
  });
  it('reads ?view= and defaults to invoices', () => {
    expect(extrasView('balance-sheet')).toBe('balance-sheet');
    expect(extrasView('nonsense')).toBe('invoices');
    expect(extrasView(null)).toBe('invoices');
  });
});
