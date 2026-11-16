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
vi.mock('../tabs/CashFlowSection', () => ({ default: () => null }));

import type { Loadable } from './SnapshotSections';
import { SalesBody } from './SalesDetail';
import { ProfitBody } from './ProfitDetail';
import { ExpensesBody } from './ExpensesDetail';
import { CashBody } from './CashDetail';
import { PositionBody } from './PositionDetail';
import { QuickBooksGate, extrasView } from './QuickBooksExtras';
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
      'Refunds (net of tax)',
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
      '59.78%',
      'Equipment and build-out'
    ])
      expect(visible).toContain(s);
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
  it('cash shows in, out, balance and accounts; QuickBooks flows say why they are missing', () => {
    const visible = text(html(<CashBody cash={loaded<FinanceCash>(qbCash)} range={RANGE} />));
    expect(visible).toContain('Not available');
    expect(visible).toMatch(/QuickBooks gives account balances/);
    expect(visible).toContain('Checking ••0001');
    clean(visible);
    expect(text(html(<CashBody cash={loaded<FinanceCash>(bankCash)} range={RANGE} />))).toContain('$11,919.00');
  });
  it('position is never called a balance sheet', () => {
    const visible = text(html(<PositionBody cash={loaded<FinanceCash>(qbCash)} range={RANGE} />));
    expect(visible).toContain('What you have and owe');
    expect(visible).toContain('Inventory at cost');
    expect(visible).toContain('Unpaid bills');
    expect(visible.toLowerCase()).not.toContain('balance sheet');
    clean(visible);
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
