import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { FinanceSales, FinanceSnapshot } from 'api/financeSnapshot';

// The chart library touches `window` at import; the chart is not what these tests check.
vi.mock('react-apexcharts', () => ({ default: () => null }));

import SnapshotBody, { type Loadable } from './SnapshotSections';
import { tiles } from './snapshotView';
import quickbooks from './fixtures/quickbooks-snapshot.json';
import bank from './fixtures/bank-snapshot.json';
import estimated from './fixtures/estimated-snapshot.json';
import partial from './fixtures/partial-snapshot.json';
import unavailable from './fixtures/unavailable-snapshot.json';
import twoCurrency from './fixtures/two-currency-snapshot.json';
import qbSales from './fixtures/quickbooks-sales.json';
import bankSales from './fixtures/bank-sales.json';
import twoSales from './fixtures/two-currency-sales.json';
import large from './fixtures/large-snapshot.json';
import { tileValueFontSize } from './FigureTile';

const RANGE = { start: '2026-10-01', end: '2026-10-31' };
const loaded = <T,>(data: unknown): Loadable<T> => ({ data: data as T, isLoading: false, isError: false, refetch: () => {} });

const VARIANTS: Record<string, { snapshot: unknown; sales: unknown }> = {
  quickbooks: { snapshot: quickbooks, sales: qbSales },
  bank: { snapshot: bank, sales: bankSales },
  estimated: { snapshot: estimated, sales: qbSales },
  partial: { snapshot: partial, sales: bankSales },
  unavailable: { snapshot: unavailable, sales: bankSales },
  'two-currency': { snapshot: twoCurrency, sales: twoSales }
};

const render = (snapshot: Loadable<FinanceSnapshot>, sales: Loadable<FinanceSales>) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <SnapshotBody snapshot={snapshot} sales={sales} range={RANGE} />
    </MemoryRouter>
  );

/** Visible text only, so attribute values (aria-labels, hrefs) do not satisfy a text assertion. */
const text = (html: string) =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');

describe.each(Object.entries(VARIANTS))('snapshot page: %s', (_name, fixture) => {
  const snapshot = fixture.snapshot as FinanceSnapshot;
  const html = render(loaded(snapshot), loaded(fixture.sales));
  const visible = text(html);

  it('renders every tile with its text, badge or "Not available"', () => {
    for (const block of snapshot.currencies) {
      for (const tile of tiles(block)) {
        expect(visible).toContain(tile.title);
        expect(visible).toContain(tile.text);
        if (tile.badge.label) {
          expect(visible).toContain(tile.badge.label);
          expect(html).toContain(`aria-label="${tile.badge.label}: ${tile.badge.tooltip.replace(/'/g, '&#x27;')}"`);
        }
        if (tile.figure.value === null) expect(visible).toContain(tile.figure.reason);
      }
    }
  });

  it('never shows NaN, undefined or null', () => {
    expect(visible).not.toMatch(/NaN|undefined|\bnull\b/);
    expect(html).not.toMatch(/NaN|undefined/);
  });

  it('never shows $0.00 for an unavailable figure', () => {
    for (const block of snapshot.currencies) {
      for (const tile of tiles(block)) {
        if (tile.figure.value === null) expect(tile.text).toBe('Not available');
      }
    }
  });

  it('links to Invoices and Balance sheet only for QuickBooks owners', () => {
    const qb = snapshot.expense_source === 'quickbooks';
    expect(visible.includes('Invoices')).toBe(qb);
    expect(visible.includes('Balance sheet')).toBe(qb);
  });

  it('never calls the have-and-owe card a balance sheet', () => {
    expect(visible).toContain('What you have and owe');
  });

  it('links each tile to its detail page with the range', () => {
    expect(html).toContain('href="/finance/sales?start=2026-10-01&amp;end=2026-10-31"');
    expect(html).toContain('href="/finance/position?start=2026-10-01&amp;end=2026-10-31"');
    expect(visible).not.toContain('Previous view');
  });
});

describe('snapshot page: variant specifics', () => {
  it('estimated shows the Estimated badge on net sales only', () => {
    const visible = text(render(loaded(estimated), loaded(qbSales)));
    expect(visible.match(/Estimated/g)).toHaveLength(1);
    expect(visible).not.toContain('Partial');
  });

  it('partial shows the not-sorted-yet line linking to the expenses', () => {
    const html = render(loaded(partial), loaded(bankSales));
    expect(text(html)).toContain('$750.00 not sorted yet');
    expect(html).toContain('href="/finance/expenses?bucket=unreviewed&amp;start=2026-10-01&amp;end=2026-10-31"');
  });

  it('unavailable shows the reasons and no amount for expenses, net profit and cash', () => {
    const visible = text(render(loaded(unavailable), loaded(bankSales)));
    expect(visible).toContain('Connect a bank to see expenses');
    expect(visible).toContain('Connect a bank to see cash');
    expect(visible).not.toContain('not sorted yet');
    // Inventory at cost and unpaid bills really are 0.00 here; the unavailable tiles are not.
    expect(visible).toMatch(/EXPENSES Not available|Expenses Not available/i);
    expect(visible).toMatch(/Net profit Not available/i);
    expect(visible).toMatch(/Cash Not available/i);
  });

  it('two currencies get two labelled blocks', () => {
    const html = render(loaded(twoCurrency), loaded(twoSales));
    expect(html).toContain('aria-label="Figures in USD"');
    expect(html).toContain('aria-label="Figures in CAD"');
    expect(text(html)).toContain('CA$3,120.40');
  });

  it('a single currency is not labelled', () => {
    expect(render(loaded(quickbooks), loaded(qbSales))).not.toContain('Figures in');
  });

  it('header carries the basis and last synced', () => {
    expect(text(render(loaded(quickbooks), loaded(qbSales)))).toMatch(/Expenses: billed, from QuickBooks · Last synced /);
    expect(text(render(loaded(bank), loaded(bankSales)))).toContain('Expenses: paid, from your bank · Not synced yet');
  });

  it('a store view shows the API reasons for cash, expenses and net profit', () => {
    const s = structuredClone(quickbooks) as FinanceSnapshot;
    const b = s.currencies[0];
    const store = { value: null, status: 'unavailable' as const, reason: 'Cash is tracked for the whole business, not per store' };
    const exp = { value: null, status: 'unavailable' as const, reason: 'Expenses are tracked for the whole business, not per store' };
    Object.assign(b, { operating_expenses: exp, net_profit: exp, inventory_bought: exp, equipment: exp, unreviewed_outflow: exp });
    b.expenses_by_bucket = [];
    b.cash = { balance: store, money_in: store, money_out: store, accounts: [] };
    b.position = { cash: store, inventory_at_cost: store, items_missing_cost: null, unpaid_bills: store };
    const visible = text(render(loaded(s), loaded(qbSales)));
    expect(visible).toContain('Expenses are tracked for the whole business, not per store');
    expect(visible).toContain('Cash is tracked for the whole business, not per store');
    expect(visible).not.toMatch(/NaN|undefined|\bnull\b/);
  });

  it('a QuickBooks and Xero conflict points to Settings', () => {
    const s = { ...(quickbooks as unknown as FinanceSnapshot), expense_source: 'accounting_conflict' as const };
    const html = render(loaded(s), loaded(qbSales));
    expect(html).toContain('href="/settings?tab=integrations"');
  });
});

describe('snapshot page: session 9 fixes', () => {
  it('QuickBooks cash card: the balance and one quiet line, never "connect a bank"', () => {
    for (const fixture of [quickbooks, estimated]) {
      const visible = text(render(loaded(fixture), loaded(qbSales)));
      expect(visible.match(/QuickBooks provides balances only, so money in and out are not shown\./g)).toHaveLength(1);
      expect(visible).not.toMatch(/connect a bank/i);
      expect(visible).not.toContain('Money in');
      expect(visible).not.toContain('Money out');
    }
  });

  it('bank cash card keeps balance, money in and money out', () => {
    const visible = text(render(loaded(bank), loaded(bankSales)));
    expect(visible).toMatch(/Balance \$10,000\.00 Money in \$0\.00 Money out \$11,919\.00/);
    expect(visible).not.toContain('QuickBooks provides balances only');
  });

  it('a bank owner with no bank: each reason links to the bank connection page', () => {
    const html = render(loaded(unavailable), loaded(bankSales));
    expect(html).toContain('href="/integrations/bank"');
    const links = [...html.matchAll(/href="\/integrations\/bank"[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(links).toEqual(expect.arrayContaining(['Connect a bank to see expenses', 'Connect a bank to see cash']));
  });

  it('no bank link for a QuickBooks owner or a store view', () => {
    const qbNoCash = structuredClone(unavailable) as FinanceSnapshot;
    qbNoCash.expense_source = 'quickbooks';
    expect(render(loaded(qbNoCash), loaded(bankSales))).not.toContain('/integrations/bank');
    const storeHtml = renderToStaticMarkup(
      <MemoryRouter>
        <SnapshotBody snapshot={loaded(unavailable)} sales={loaded(bankSales)} range={RANGE} locationId="loc-1" />
      </MemoryRouter>
    );
    expect(storeHtml).not.toContain('/integrations/bank');
  });

  it('bucket names come from the Finance map', () => {
    const visible = text(render(loaded(bank), loaded(bankSales)));
    for (const label of ['Payroll', 'Running costs', 'Software', 'Marketing']) expect(visible).toContain(label);
    expect(visible).not.toMatch(/Labour \/ payroll|Operating expense|Technology \/ software|Marketing \/ advertising/);
  });

  it('phone layout: two tiles a row under 600px with net sales across the top', () => {
    const html = render(loaded(quickbooks), loaded(qbSales));
    expect(html).toMatch(/@media \(max-width:599\.95px\)\{[^}]*grid-template-columns:repeat\(2, minmax\(0, 1fr\)\)/);
    expect(html).toMatch(/>:first-of-type\{grid-column:1\/-1;\}\}/);
  });

  it('a seven-figure amount shrinks its type to fit rather than clipping', () => {
    const html = render(loaded(large), loaded(qbSales));
    expect(text(html)).toContain('$1,234,567.89');
    expect(tileValueFontSize('$1,234,567.89')).toBe('min(1.75rem, calc((100cqi - 30px) / 8.06))');
    expect(html).toContain('container-type:inline-size');
    // 390px phone: half-width tile is ~171px; at the computed size the text is narrower than the tile.
    const tile = (390 - 32 - 12) / 2;
    const size = Math.min(28, (tile - 30) / 8.06);
    expect(size * 0.62 * '$1,234,567.89'.length).toBeLessThanOrEqual(tile - 30);
  });
});

describe('snapshot page: loading and errors', () => {
  const pending: Loadable<never> = { isLoading: true, isError: false, refetch: () => {} };
  const failed: Loadable<never> = { isLoading: false, isError: true, refetch: () => {} };

  it('loading shows skeleton tiles and cards, not a spinner', () => {
    const html = render(pending, pending);
    expect(html).toContain('MuiSkeleton');
    expect(html).not.toContain('MuiCircularProgress');
    expect(text(html)).toContain('Net sales');
  });

  it('a failed snapshot is an inline message with Retry', () => {
    const visible = text(render(failed, loaded(qbSales)));
    expect(visible).toContain("Couldn't load your finance figures.");
    expect(visible).toContain('Retry');
  });

  it('a failed chart has its own Retry while the figures still show', () => {
    const visible = text(render(loaded(quickbooks), failed));
    expect(visible).toContain("Couldn't load sales by day.");
    expect(visible).toContain('$14,495.67');
  });
});
