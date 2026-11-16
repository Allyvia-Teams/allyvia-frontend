import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Figure, FinanceCash, FinanceExpenses, FinanceProfit, FinanceSales, FinanceSnapshot } from 'api/financeSnapshot';
import type { SalesSearchResponse } from 'features/pos/api/posApi';

// Every detail page held to the snapshot page's standard (session 9): against every relevant
// fixture variant (QuickBooks, bank, estimated, partial, unavailable, two currencies, a store
// selected), each amount shows its text, its badge, or "Not available" with the reason; nothing
// reads NaN, undefined or null; an unavailable figure never reads as $0.00. Plus the gap panel's
// four states and the range and store carried by every link, both ways.

vi.mock('utils/axios', () => ({ default: {} }));
vi.mock('store', () => ({ useSelector: () => null, useDispatch: () => () => undefined, store: {} }));
vi.mock('react-apexcharts', () => ({ default: () => null }));

import type { Loadable } from './SnapshotSections';
import SnapshotBody from './SnapshotSections';
import { SalesBody } from './SalesDetail';
import { ProfitBody } from './ProfitDetail';
import { ExpensesBody } from './ExpensesDetail';
import { CashBody } from './CashDetail';
import { PositionBody } from './PositionDetail';
import { cashView, positionView, profitView, salesView } from './detailView';
import qbSales from './fixtures/quickbooks-sales.json';
import bankSales from './fixtures/bank-sales.json';
import twoSales from './fixtures/two-currency-sales.json';
import qbProfit from './fixtures/quickbooks-profit.json';
import bankProfit from './fixtures/bank-profit.json';
import gapProfit from './fixtures/quickbooks-gap-profit.json';
import qbExpenses from './fixtures/quickbooks-expenses.json';
import bankExpenses from './fixtures/bank-expenses.json';
import qbCash from './fixtures/quickbooks-cash.json';
import bankCash from './fixtures/bank-cash.json';
import qbSnapshot from './fixtures/quickbooks-snapshot.json';

const RANGE = { start: '2026-10-01', end: '2026-10-31' };
const STORE = 'loc-7';
const loaded = <T,>(data: unknown): Loadable<T> => ({ data: data as T, isLoading: false, isError: false, refetch: () => {} });
const html = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
const text = (h: string) =>
  h
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
const clone = <T,>(x: unknown): T => structuredClone(x) as T;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const UNAVAILABLE = (reason: string): Figure => ({ value: null, status: 'unavailable', reason });
const STORE_CASH = 'Cash is tracked for the whole business, not per store';
const STORE_EXP = 'Expenses are tracked for the whole business, not per store';

/** A figure row on screen: label, then badge or not, then text; the reason when unavailable. */
function expectFigure(h: string, label: string, f: Figure, shown: string, oneCurrency = true) {
  const visible = text(h);
  if (f.value === null || f.status === 'unavailable') {
    expect(shown, label).toBe('Not available');
    expect(visible, label).toMatch(new RegExp(`${esc(label)} Not available${f.reason ? ` ${esc(f.reason)}` : ''}`));
    // With one currency the label appears once, so it must not also read $0.00.
    if (oneCurrency) expect(visible, label).not.toMatch(new RegExp(`${esc(label)} \\$0\\.00`));
    return;
  }
  const badge = f.status === 'estimated' ? 'Estimated' : f.status === 'partial' ? 'Partial' : null;
  if (badge) {
    expect(visible, label).toMatch(new RegExp(`${esc(label)} ${badge} ${esc(shown)}`));
    expect(h, label).toContain(`aria-label="${badge}: ${f.reason.replace(/'/g, '&#x27;')}"`);
  } else {
    expect(visible, label).toMatch(new RegExp(`${esc(label)} ${esc(shown)}`));
  }
}
const clean = (h: string) => {
  expect(text(h)).not.toMatch(/NaN|undefined|\bnull\b/);
  expect(h).not.toMatch(/NaN|undefined/);
};

// ------------------------------- Profit ------------------------------- //

const profitVariants = (): Record<string, { data: FinanceProfit; locationId?: string }> => {
  const est = clone<FinanceProfit>(qbProfit);
  const setLine = (p: FinanceProfit, key: string, f: Figure, i = 0) => Object.assign(p.currencies[i].lines.find((l) => l.key === key)!, f);
  setLine(est, 'cogs', { value: '5830.62', status: 'estimated', reason: '3 sold lines have no cost recorded' });
  setLine(est, 'gross_profit', { value: '8665.05', status: 'estimated', reason: '3 sold lines have no cost recorded' });
  const partial = clone<FinanceProfit>(bankProfit);
  const pr = '2 bank transactions ($750.00) not yet categorized';
  for (const k of ['operating_expenses', 'net_profit', 'inventory_bought', 'equipment'])
    setLine(partial, k, { ...partial.currencies[0].lines.find((l) => l.key === k)!, status: 'partial', reason: pr });
  const unavailable = clone<FinanceProfit>(bankProfit);
  for (const k of ['operating_expenses', 'net_profit', 'inventory_bought', 'equipment'])
    setLine(unavailable, k, UNAVAILABLE('Connect a bank to see expenses'));
  unavailable.currencies[0].operating_expenses_by_bucket = [];
  const two = clone<FinanceProfit>(qbProfit);
  const cad = clone<FinanceProfit['currencies'][number]>(two.currencies[0]);
  cad.currency = 'CAD';
  cad.lines = cad.lines.map((l) =>
    ['net_sales', 'cogs', 'gross_profit'].includes(l.key)
      ? { ...l, value: l.key === 'net_sales' ? '3120.40' : l.key === 'cogs' ? '1000.00' : '2120.40' }
      : l.key === 'gross_margin_pct'
        ? { ...l, value: '67.95' }
        : l.key === 'sales_tax'
          ? { ...l, value: '405.65' }
          : { ...l, ...UNAVAILABLE('No CAD expenses are recorded') }
  );
  cad.operating_expenses_by_bucket = [];
  two.currencies.push(cad);
  const store = clone<FinanceProfit>(qbProfit);
  for (const k of ['operating_expenses', 'net_profit', 'inventory_bought', 'equipment']) setLine(store, k, UNAVAILABLE(STORE_EXP));
  store.currencies[0].operating_expenses_by_bucket = [];
  store.quickbooks_gap_status = 'not_applicable';
  return {
    quickbooks: { data: clone(qbProfit) },
    bank: { data: clone(bankProfit) },
    estimated: { data: est },
    partial: { data: partial },
    unavailable: { data: unavailable },
    'two-currency': { data: two },
    store: { data: store, locationId: STORE }
  };
};

describe.each(Object.entries(profitVariants()))('Profit page: %s', (_name, { data, locationId }) => {
  const h = html(<ProfitBody profit={loaded(data)} range={RANGE} locationId={locationId} />);
  it('every statement and "Also this period" line shows its text, badge or Not available', () => {
    for (const block of data.currencies) {
      const v = profitView(block, { source: data.expense_source, locationId });
      for (const line of [...v.statement, ...v.also]) expectFigure(h, line.label, line.figure, line.text, data.currencies.length === 1);
    }
  });
  it('no NaN, undefined or null', () => clean(h));
  it('one labelled group per currency only when there are two', () => {
    expect(h.includes('aria-label="Figures in CAD"')).toBe(data.currencies.length > 1);
  });
  it('back link carries the range and store', () => {
    expect(h).toContain(`href="/finance?start=2026-10-01&amp;end=2026-10-31${locationId ? `&amp;location_id=${locationId}` : ''}"`);
  });
});

describe('the QuickBooks gap panel: four states', () => {
  const base = gapProfit as unknown as FinanceProfit;
  const render = (status: FinanceProfit['quickbooks_gap_status'], gap = status === 'shown' ? base.quickbooks_gap : null) =>
    text(html(<ProfitBody profit={loaded({ ...base, quickbooks_gap_status: status, quickbooks_gap: gap })} range={RANGE} />));
  it('shown: heading, the gap, QuickBooks net income and the three reasons in order', () => {
    expect(render('shown')).toMatch(
      /Why this differs from QuickBooks Difference from QuickBooks \$4,150\.00 QuickBooks' net income -\$3,753\.95 POS sales not in QuickBooks \$14,495\.67 Cost of goods sold instead of purchases -\$4,930\.62 Other -\$5,415\.05/
    );
  });
  it('unavailable: one quiet line and nothing else', () => {
    const v = render('unavailable');
    expect(v).toContain('QuickBooks could not be reached, so the comparison is not shown');
    expect(v).not.toContain('Why this differs');
  });
  it.each(['below_threshold', 'not_applicable'] as const)('%s: nothing', (status) => {
    const v = render(status);
    expect(v).not.toContain('Why this differs');
    expect(v).not.toContain('could not be reached');
  });
});

// -------------------------------- Sales ------------------------------- //

const ORDERS: SalesSearchResponse = {
  count: 1,
  items: [
    {
      id: 'o-1',
      receiptNumber: 'R-1',
      total: 1353.13,
      paymentMethod: 'card',
      status: 'completed',
      createdAt: '2026-10-02T15:00:00Z'
    } as never
  ]
};
const salesVariants = (): Record<string, { data: FinanceSales; locationId?: string }> => {
  const est = clone<FinanceSales>(qbSales);
  est.currencies[0].net_sales = { ...est.currencies[0].net_sales, status: 'estimated', reason: 'Some imported sales may include tax' };
  return {
    quickbooks: { data: clone(qbSales) },
    bank: { data: clone(bankSales) },
    estimated: { data: est },
    'two-currency': { data: clone(twoSales) },
    store: { data: clone(qbSales), locationId: STORE }
  };
};

describe.each(Object.entries(salesVariants()))('Sales page: %s', (_name, { data, locationId }) => {
  const h = html(
    <SalesBody sales={loaded(data)} orders={loaded(ORDERS)} page={0} onPage={() => {}} range={RANGE} locationId={locationId} />
  );
  const visible = text(h);
  it('net sales headline, refunds, tax, channels, methods and days as the API sent them', () => {
    for (const block of data.currencies) {
      const v = salesView(block, RANGE);
      expect(visible).toContain(v.netSales.text);
      if (v.netSales.badge.label) expect(visible).toContain(v.netSales.badge.label);
      expect(visible).toContain(`Refunds (sales value) ${v.refunds}`);
      expect(visible).toContain(`Sales tax collected ${v.salesTax}`);
      for (const r of [...v.channels, ...v.methods]) expect(visible).toContain(`${r.label} ${r.amount}`);
      for (const d of v.days) expect(visible).toContain(`${d.date} · ${d.count} ${d.amount}`);
    }
  });
  it('no NaN, undefined or null', () => clean(h));
  it('back link carries the range and store', () => {
    expect(h).toContain(`href="/finance?start=2026-10-01&amp;end=2026-10-31${locationId ? `&amp;location_id=${locationId}` : ''}"`);
  });
});

// ---------------------------- Cash and position ---------------------------- //

const cashVariants = (): Record<string, { data: FinanceCash; locationId?: string }> => {
  const unavailable = clone<FinanceCash>(bankCash);
  const u = UNAVAILABLE('Connect a bank to see cash');
  Object.assign(unavailable.currencies[0].cash, { balance: u, money_in: u, money_out: u, accounts: [] });
  unavailable.currencies[0].position.cash = u;
  const two = clone<FinanceCash>(bankCash);
  const cad = clone<FinanceCash['currencies'][number]>(two.currencies[0]);
  cad.currency = 'CAD';
  cad.cash.balance = { value: '2500.00', status: 'exact', reason: '' };
  cad.cash.accounts = [{ name: 'CAD Chequing', mask: '0042', balance: '2500.00' }];
  cad.position = {
    cash: { value: '2500.00', status: 'exact', reason: '' },
    inventory_at_cost: UNAVAILABLE('Inventory costs carry no currency; they are shown in USD'),
    items_missing_cost: null,
    unpaid_bills: { value: '0.00', status: 'exact', reason: '' }
  };
  two.currencies.push(cad);
  const store = clone<FinanceCash>(bankCash);
  const s = UNAVAILABLE(STORE_CASH);
  Object.assign(store.currencies[0].cash, { balance: s, money_in: s, money_out: s, accounts: [] });
  store.currencies[0].position = { cash: s, inventory_at_cost: s, items_missing_cost: null, unpaid_bills: s };
  const partial = clone<FinanceCash>(bankCash);
  partial.currencies[0].cash.money_out = { value: '11919.00', status: 'partial', reason: 'Bank history starts on 2026-10-05' };
  return {
    quickbooks: { data: clone(qbCash) },
    bank: { data: clone(bankCash) },
    partial: { data: partial },
    unavailable: { data: unavailable },
    'two-currency': { data: two },
    store: { data: store, locationId: STORE }
  };
};

describe.each(Object.entries(cashVariants()))('Cash and position pages: %s', (_name, { data, locationId }) => {
  const cashHtml = html(<CashBody cash={loaded(data)} range={RANGE} locationId={locationId} />);
  const posHtml = html(<PositionBody cash={loaded(data)} range={RANGE} locationId={locationId} />);
  it('every cash figure shows its text, badge or Not available, and the one note when there is one', () => {
    for (const block of data.currencies) {
      const v = cashView(block, { source: data.expense_source, locationId });
      for (const f of v.figures) expectFigure(cashHtml, f.label, f.figure, f.text, data.currencies.length === 1);
      if (v.note) expect(text(cashHtml).match(new RegExp(esc(v.note), 'g'))).toHaveLength(data.currencies.length);
      for (const a of v.accounts) expect(text(cashHtml)).toContain(`${a.label} ${a.amount}`);
    }
  });
  it('every position figure shows its text, badge or Not available', () => {
    for (const block of data.currencies) {
      const v = positionView(block, { source: data.expense_source, locationId });
      for (const f of v.figures) expectFigure(posHtml, f.label, f.figure, f.text, data.currencies.length === 1);
    }
  });
  it('no NaN, undefined or null on either page', () => {
    clean(cashHtml);
    clean(posHtml);
  });
  it('back links carry the range and store', () => {
    const back = `href="/finance?start=2026-10-01&amp;end=2026-10-31${locationId ? `&amp;location_id=${locationId}` : ''}"`;
    expect(cashHtml).toContain(back);
    expect(posHtml).toContain(back);
  });
  it('the bank link appears only for a bank owner with no bank, on the whole business', () => {
    expect(cashHtml.includes('href="/integrations/bank"')).toBe(_name === 'unavailable');
  });
});

// ------------------------------- Expenses ------------------------------ //

const expenseVariants = (): Record<string, { data: FinanceExpenses; locationId?: string }> => {
  const partial = clone<FinanceExpenses>(bankExpenses);
  Object.assign(partial, { status: 'partial', reason: '2 bank transactions ($750.00) not yet categorized' });
  const unavailable = clone<FinanceExpenses>(bankExpenses);
  Object.assign(unavailable, { status: 'unavailable', reason: 'Connect a bank to see expenses', categories: [], results: [], count: 0 });
  const two = clone<FinanceExpenses>(qbExpenses);
  two.currencies = ['USD', 'CAD'];
  const store = clone<FinanceExpenses>(qbExpenses);
  Object.assign(store, { status: 'unavailable', reason: STORE_EXP, categories: [], results: [], count: 0 });
  const estimated = clone<FinanceExpenses>(qbExpenses);
  Object.assign(estimated, { status: 'estimated', reason: 'Some bills are estimated' });
  return {
    quickbooks: { data: clone(qbExpenses) },
    bank: { data: clone(bankExpenses) },
    estimated: { data: estimated },
    partial: { data: partial },
    unavailable: { data: unavailable },
    'two-currency': { data: two },
    store: { data: store, locationId: STORE }
  };
};

describe.each(Object.entries(expenseVariants()))('Expenses page: %s', (name, { data, locationId }) => {
  const h = html(
    <ExpensesBody
      expenses={loaded(data)}
      bucket={null}
      category={null}
      page={0}
      onFilter={() => {}}
      range={RANGE}
      locationId={locationId}
    />
  );
  const visible = text(h);
  it('categories and rows show their amounts; an unavailable list says why and shows no amount', () => {
    if (data.status === 'unavailable') {
      expect(visible).toMatch(new RegExp(`Not available ${esc(data.reason)}`));
      expect(visible).not.toContain('$0.00');
      expect(h.includes('href="/integrations/bank"')).toBe(name === 'unavailable');
      return;
    }
    for (const r of data.results) expect(visible).toContain(r.payee);
    expect(h.match(/<tbody[\s\S]*?<\/tbody>/)?.[0].match(/<tr/g)).toHaveLength(data.results.length);
  });
  it('a partial or estimated list carries its badge with the reason', () => {
    if (data.status === 'partial' || data.status === 'estimated') {
      const label = data.status === 'partial' ? 'Partial' : 'Estimated';
      expect(h).toContain(`aria-label="${label}: ${data.reason.replace(/'/g, '&#x27;')}"`);
    } else {
      expect(visible).not.toMatch(/\bPartial\b|\bEstimated\b/);
    }
  });
  it('the currency picker appears only for two currencies', () => {
    expect(h.includes('Currency')).toBe(data.currencies.length > 1);
  });
  it('no NaN, undefined or null', () => clean(h));
  it('back link carries the range and store', () => {
    expect(h).toContain(`href="/finance?start=2026-10-01&amp;end=2026-10-31${locationId ? `&amp;location_id=${locationId}` : ''}"`);
  });
});

// --------------------------- Links, both directions --------------------------- //

describe('the range and store carry across every link', () => {
  it('snapshot to every detail page, with the store', () => {
    const h = html(
      <SnapshotBody snapshot={loaded<FinanceSnapshot>(qbSnapshot)} sales={loaded<FinanceSales>(qbSales)} range={RANGE} locationId={STORE} />
    );
    const hrefs = [...h.matchAll(/href="(\/finance[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    const detail = hrefs.filter((x) => x.startsWith('/finance/'));
    expect(new Set(detail.map((x) => x.split('?')[0]))).toEqual(
      new Set(['/finance/sales', '/finance/profit', '/finance/expenses', '/finance/cash', '/finance/position', '/finance/quickbooks'])
    );
    for (const x of detail) {
      const q = new URLSearchParams(x.split('?')[1]);
      expect([q.get('start'), q.get('end'), q.get('location_id')], x).toEqual(['2026-10-01', '2026-10-31', STORE]);
    }
  });
  it('detail to detail: Profit bucket links keep the range and store', () => {
    const h = html(<ProfitBody profit={loaded(qbProfit)} range={RANGE} locationId={STORE} />);
    const links = [...h.matchAll(/href="(\/finance\/expenses[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    expect(links).toHaveLength(4);
    for (const x of links) expect(x).toMatch(/^\/finance\/expenses\?bucket=\w+&start=2026-10-01&end=2026-10-31&location_id=loc-7$/);
  });
  it('detail to detail: Cash "Review bank transactions" keeps the range', () => {
    expect(html(<CashBody cash={loaded(bankCash)} range={RANGE} />)).toContain(
      'href="/finance/expenses?start=2026-10-01&amp;end=2026-10-31"'
    );
  });
});
