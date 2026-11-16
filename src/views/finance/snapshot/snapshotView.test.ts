import { describe, expect, it } from 'vitest';
import type { CurrencyBlock, FinanceSales, FinanceSnapshot } from 'api/financeSnapshot';
import {
  CLASSIC_HREF,
  basisLine,
  cashRows,
  channelRows,
  chartPoints,
  expenseCard,
  extrasRow,
  figureBadge,
  figureText,
  hasUnreviewed,
  isConflict,
  lastSyncedText,
  NEXT_SESSION_HREFS,
  positionRows,
  quickBooksLinks,
  rangeFromParams,
  snapshotBlocks,
  sparseDayLabels,
  tiles,
  unreviewedLine
} from './snapshotView';
import quickbooks from './fixtures/quickbooks-snapshot.json';
import bank from './fixtures/bank-snapshot.json';
import estimated from './fixtures/estimated-snapshot.json';
import partial from './fixtures/partial-snapshot.json';
import unavailable from './fixtures/unavailable-snapshot.json';
import twoCurrency from './fixtures/two-currency-snapshot.json';
import qbSales from './fixtures/quickbooks-sales.json';
import twoSales from './fixtures/two-currency-sales.json';

const snap = (json: unknown) => json as FinanceSnapshot;
const first = (json: unknown): CurrencyBlock => snap(json).currencies[0];
const RANGE = { start: '2026-10-01', end: '2026-10-31' };

describe('figureText', () => {
  it('formats an exact amount alone', () => {
    expect(figureText(first(quickbooks).net_sales, 'USD')).toBe('$14,495.67');
  });
  it('renders an unavailable figure as "Not available", never 0 or a dash', () => {
    const f = first(unavailable).operating_expenses;
    expect(f.value).toBeNull();
    expect(figureText(f, 'USD')).toBe('Not available');
  });
  it('keeps the currency of the block', () => {
    expect(figureText(snap(twoCurrency).currencies[1].net_sales, 'CAD')).toBe('CA$3,120.40');
  });
});

describe('figureBadge', () => {
  it('exact has no badge', () => {
    expect(figureBadge(first(quickbooks).net_sales)).toEqual({ label: null, tooltip: '' });
  });
  it('estimated shows "Estimated" with the reason', () => {
    expect(figureBadge(first(estimated).net_sales)).toEqual({ label: 'Estimated', tooltip: 'Some imported sales may include tax' });
  });
  it('partial shows "Partial" with the reason', () => {
    expect(figureBadge(first(partial).operating_expenses)).toEqual({
      label: 'Partial',
      tooltip: '2 bank transactions ($750.00) not yet categorized'
    });
  });
  it('unavailable has no badge; its reason is secondary text instead', () => {
    expect(figureBadge(first(unavailable).operating_expenses)).toEqual({ label: null, tooltip: '' });
    const expenses = tiles(first(unavailable)).find((t) => t.key === 'expenses');
    expect(expenses?.secondary).toBe('Connect a bank to see expenses');
  });
});

describe('tiles', () => {
  it('returns the five tiles in the fixed order with their titles', () => {
    const t = tiles(first(quickbooks));
    expect(t.map((x) => x.key)).toEqual(['net_sales', 'gross_profit', 'expenses', 'net_profit', 'cash']);
    expect(t.map((x) => x.title)).toEqual(['Net sales', 'Gross profit', 'Expenses', 'Net profit', 'Cash']);
  });
  it('reads each tile from its own API figure', () => {
    const b = first(quickbooks);
    expect(tiles(b).map((x) => x.figure)).toEqual([b.net_sales, b.gross_profit, b.operating_expenses, b.net_profit, b.cash.balance]);
  });
  it('points at the classic page this session, and records the routes the next session swaps in', () => {
    expect(tiles(first(quickbooks)).every((x) => x.href === CLASSIC_HREF)).toBe(true);
    expect(tiles(first(quickbooks)).map((x) => NEXT_SESSION_HREFS[x.key])).toEqual([
      '/finance/sales',
      '/finance/profit',
      '/finance/expenses',
      '/finance/profit',
      '/finance/cash'
    ]);
  });
  it('gives gross profit its margin from the API, as text', () => {
    expect(tiles(first(quickbooks))[1].secondary).toBe('59.78% margin');
  });
  it('says there is no margin without sales instead of inventing one', () => {
    const b = first(quickbooks);
    const noSales: CurrencyBlock = { ...b, gross_margin_pct: { value: null, status: 'exact', reason: '' } };
    expect(tiles(noSales)[1].secondary).toBe('No margin without sales');
  });
  it('a two-currency snapshot yields two tile rows, never a summed one', () => {
    const blocks = snapshotBlocks(snap(twoCurrency));
    expect(blocks.map((b) => b.heading)).toEqual(['USD', 'CAD']);
    expect(blocks.map((b) => tiles(b.block)[0].text)).toEqual(['$14,495.67', 'CA$3,120.40']);
  });
  it('a single currency needs no heading', () => {
    expect(snapshotBlocks(snap(quickbooks)).map((b) => b.heading)).toEqual([null]);
  });
});

describe('unreviewed outflow', () => {
  it('shows "$X not yet categorized" linking to the unreviewed expenses when above 0', () => {
    expect(hasUnreviewed(first(partial))).toBe(true);
    expect(unreviewedLine(first(partial), RANGE)).toEqual({
      text: '$750.00 not yet categorized',
      href: `${CLASSIC_HREF}?start=2026-10-01&end=2026-10-31`,
      nextHref: '/finance/expenses?bucket=unreviewed'
    });
  });
  it('says nothing at 0.00 or when unavailable', () => {
    expect(unreviewedLine(first(quickbooks), RANGE)).toBeNull();
    expect(unreviewedLine(first(unavailable), RANGE)).toBeNull();
  });
});

describe('header', () => {
  it('names the basis and the source', () => {
    expect(basisLine(snap(quickbooks))).toBe('Expenses: billed, from QuickBooks');
    expect(basisLine(snap(bank))).toBe('Expenses: paid, from your bank');
  });
  it('last synced', () => {
    expect(lastSyncedText(snap(quickbooks))).toMatch(/^Last synced Nov 16, /);
    expect(lastSyncedText(snap(bank))).toBe('Not synced yet');
  });
  it('flags the QuickBooks and Xero conflict', () => {
    expect(isConflict({ ...snap(quickbooks), expense_source: 'accounting_conflict' })).toBe(true);
    expect(isConflict(snap(quickbooks))).toBe(false);
  });
});

describe('cards', () => {
  it('sales by channel is text plus amount from the API', () => {
    expect(channelRows(first(quickbooks))).toEqual([{ label: 'Allyvia POS', amount: '$14,495.67' }]);
  });
  it('expenses by category lists the operating buckets', () => {
    expect(expenseCard(first(bank))).toEqual({
      unavailable: null,
      rows: [
        { label: 'Labour / payroll', amount: '$4,200.00' },
        { label: 'Operating expense', amount: '$2,818.64' },
        { label: 'Technology / software', amount: '$149.99' },
        { label: 'Marketing / advertising', amount: '$1,100.37' }
      ]
    });
  });
  it('expenses card says why when expenses are unavailable', () => {
    expect(expenseCard(first(unavailable))).toEqual({ unavailable: 'Connect a bank to see expenses', rows: [] });
  });
  it('cash card is in, out and balance, each its own figure', () => {
    const rows = cashRows(first(quickbooks));
    expect(rows.map((r) => [r.label, r.text])).toEqual([
      ['Money in', 'Not available'],
      ['Money out', 'Not available'],
      ['Balance', '$10,000.00']
    ]);
    expect(rows[0].secondary).toMatch(/^QuickBooks gives account balances/);
    expect(cashRows(first(bank)).map((r) => r.text)).toEqual(['$0.00', '$11,919.00', '$10,000.00']);
  });
  it('the extras line is inventory bought, equipment and sales tax', () => {
    expect(extrasRow(first(quickbooks)).map((r) => [r.label, r.text])).toEqual([
      ['Inventory bought', '$900.00'],
      ['Equipment', '$2,750.00'],
      ['Sales tax collected', '$1,195.90']
    ]);
  });
  it('what you have and owe is cash, inventory at cost and unpaid bills', () => {
    expect(positionRows(first(quickbooks)).map((r) => [r.label, r.text])).toEqual([
      ['Cash', '$10,000.00'],
      ['Inventory at cost', '$0.00'],
      ['Unpaid bills', '$0.00']
    ]);
    const cad = positionRows(snap(twoCurrency).currencies[1]);
    expect(cad[1].text).toBe('Not available');
    expect(cad[1].secondary).toBe('Inventory costs carry no currency; they are shown in USD');
  });
  it('counts items missing a cost only when the API gives a count', () => {
    const b = first(quickbooks);
    const missing = { ...b, position: { ...b.position, items_missing_cost: 3 } };
    expect(positionRows(missing)[1].note).toBe('3 items have no cost');
    expect(positionRows(b)[1].note).toBeNull();
  });
});

describe('QuickBooks links', () => {
  it('appear for QuickBooks owners only', () => {
    expect(quickBooksLinks(snap(quickbooks)).map((l) => l.label)).toEqual(['Invoices', 'Balance sheet']);
    expect(quickBooksLinks(snap(bank))).toEqual([]);
  });
});

describe('chartPoints', () => {
  it('lays the sparse days onto every day of the range, keeping the API strings', () => {
    const block = (qbSales as unknown as FinanceSales).currencies[0];
    const points = chartPoints(block, { start: '2026-10-01', end: '2026-10-05' });
    expect(points).toEqual([
      { date: '2026-10-01', amount: null },
      { date: '2026-10-02', amount: '1250.00' },
      { date: '2026-10-03', amount: null },
      { date: '2026-10-04', amount: null },
      { date: '2026-10-05', amount: null }
    ]);
  });
  it('one series per currency', () => {
    const cad = (twoSales as unknown as FinanceSales).currencies[1];
    expect(chartPoints(cad, RANGE).filter((p) => p.amount !== null)).toHaveLength(3);
  });
});

describe('sparseDayLabels', () => {
  it('names the first day and every seventh after it, blank between', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'];
    expect(sparseDayLabels(days)).toEqual(['Oct 1', '', '', '', '', '', '', 'Oct 8']);
  });
});

describe('rangeFromParams', () => {
  const today = { year: 2026, month: 11, day: 16 };
  it('reads a valid range from the URL', () => {
    expect(rangeFromParams(new URLSearchParams('start=2026-10-01&end=2026-10-31'), today)).toEqual(RANGE);
  });
  it('defaults to this month for missing, malformed or reversed ranges', () => {
    const mtd = { start: '2026-11-01', end: '2026-11-16' };
    expect(rangeFromParams(new URLSearchParams(''), today)).toEqual(mtd);
    expect(rangeFromParams(new URLSearchParams('start=10/01/2026&end=2026-10-31'), today)).toEqual(mtd);
    expect(rangeFromParams(new URLSearchParams('start=2026-10-31&end=2026-10-01'), today)).toEqual(mtd);
  });
});

describe('no arithmetic on money', () => {
  const VARIANTS = { quickbooks, bank, estimated, partial, unavailable, twoCurrency };
  // Walk every view value: it must be text (or null/boolean), never a number the browser made.
  const numbersIn = (value: unknown, path = ''): string[] => {
    if (typeof value === 'number') return [path];
    if (Array.isArray(value)) return value.flatMap((v, i) => numbersIn(v, `${path}[${i}]`));
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => numbersIn(v, `${path}.${k}`));
    return [];
  };
  for (const [name, json] of Object.entries(VARIANTS)) {
    it(`${name}: no view function returns a number`, () => {
      for (const block of snap(json).currencies) {
        const out = {
          tiles: tiles(block).map(({ figure: _figure, ...rest }) => rest),
          channels: channelRows(block),
          expenses: expenseCard(block),
          cash: cashRows(block),
          extras: extrasRow(block),
          position: positionRows(block),
          unreviewed: unreviewedLine(block, RANGE)
        };
        expect(numbersIn(out)).toEqual([]);
      }
    });
  }
});
