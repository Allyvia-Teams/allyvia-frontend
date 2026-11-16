import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinanceExpenses } from 'api/financeSnapshot';

// Session 9, group C: one table for bank owners, the exact request every control sends, the
// rows on screen are the rows returned, ?bucket= in the URL, dates, and a correction refreshing
// every finance query. axios is mocked so the request is read, never sent.

const get = vi.fn();
const patch = vi.fn();
vi.mock('utils/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), patch: (...a: unknown[]) => patch(...a) } }));
vi.mock('store', () => ({ useSelector: () => null, useDispatch: () => () => undefined, store: {} }));
vi.mock('react-apexcharts', () => ({ default: () => null }));

import financeSnapshotApi from 'api/financeSnapshot';
import bankingApi from 'api/banking';
import { ExpensesBody } from './ExpensesDetail';
import { refreshAfterReview } from './BankReview';
import { bucketFromParams, EXPENSE_FILTERS, expensesQueryFromParams, expensesView, filterUpdate } from './detailView';
import type { Loadable } from './SnapshotSections';
import { tableDay } from './snapshotView';
import bankExpenses from './fixtures/bank-expenses.json';
import unreviewedExpenses from './fixtures/bank-expenses-unreviewed.json';
import qbExpenses from './fixtures/quickbooks-expenses.json';

const RANGE = { start: '2026-10-01', end: '2026-10-31' };
const loaded = <T,>(data: unknown): Loadable<T> => ({ data: data as T, isLoading: false, isError: false, refetch: () => {} });
const html = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
const text = (h: string) =>
  h
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');

/** What useFinanceRange's `update` does to the URL. */
const apply = (params: URLSearchParams, next: Record<string, string | null>) => {
  const p = new URLSearchParams(params);
  Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
  return p;
};

/** The request the page makes for a URL: the range, the store header and the filters. */
const requestFor = async (params: URLSearchParams) => {
  get.mockResolvedValue({ data: bankExpenses });
  await financeSnapshotApi.expenses(
    { start: params.get('start') as string, end: params.get('end') as string, locationId: params.get('location_id') },
    expensesQueryFromParams(params)
  );
  return get.mock.calls.at(-1);
};

const BASE = new URLSearchParams('start=2026-10-01&end=2026-10-31');

describe('the exact request each control sends', () => {
  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
  });

  it('no filter: range only, page 1, no store header', async () => {
    expect(await requestFor(BASE)).toEqual([
      '/analytics/finance/expenses/',
      { params: { start_date: '2026-10-01', end_date: '2026-10-31', bucket: undefined, category: undefined, currency: undefined, page: 1 } }
    ]);
  });

  it('a bucket chip sends bucket and resets category and page', async () => {
    const before = new URLSearchParams('start=2026-10-01&end=2026-10-31&category=Rent&page=3');
    const after = apply(before, filterUpdate.bucket('labour'));
    expect(after.toString()).toBe('start=2026-10-01&end=2026-10-31&bucket=labour');
    expect((await requestFor(after))?.[1].params).toEqual({
      start_date: '2026-10-01',
      end_date: '2026-10-31',
      bucket: 'labour',
      category: undefined,
      currency: undefined,
      page: 1
    });
  });

  it('"Not yet categorized" is the needs-review list: bucket=unreviewed (needs_review in a URL reads the same)', async () => {
    const chip = EXPENSE_FILTERS.find((f) => f.label === 'Not yet categorized');
    expect(chip?.bucket).toBe('unreviewed');
    expect((await requestFor(apply(BASE, filterUpdate.bucket('unreviewed'))))?.[1].params.bucket).toBe('unreviewed');
    expect((await requestFor(new URLSearchParams('start=2026-10-01&end=2026-10-31&bucket=needs_review')))?.[1].params.bucket).toBe(
      'unreviewed'
    );
  });

  it('"All" clears the bucket', async () => {
    const after = apply(new URLSearchParams('start=2026-10-01&end=2026-10-31&bucket=opex'), filterUpdate.bucket(null));
    expect((await requestFor(after))?.[1].params.bucket).toBeUndefined();
  });

  it('a category row sends the API label and keeps the bucket', async () => {
    const after = apply(
      new URLSearchParams('start=2026-10-01&end=2026-10-31&bucket=labour&page=2'),
      filterUpdate.category('Labour / payroll')
    );
    expect((await requestFor(after))?.[1].params).toMatchObject({ bucket: 'labour', category: 'Labour / payroll', page: 1 });
  });

  it('the currency picker sends currency and resets category and page', async () => {
    const after = apply(new URLSearchParams('start=2026-10-01&end=2026-10-31&category=Rent&page=2'), filterUpdate.currency('CAD'));
    expect((await requestFor(after))?.[1].params).toMatchObject({ currency: 'CAD', category: undefined, page: 1 });
  });

  it('paging sends the 1-based page the API expects', async () => {
    expect((await requestFor(apply(BASE, filterUpdate.page(2))))?.[1].params.page).toBe(3);
    expect(apply(new URLSearchParams('page=2'), filterUpdate.page(0)).has('page')).toBe(false);
  });

  it('the date range sends start_date and end_date; a store sends X-Location-Id', async () => {
    const call = await requestFor(new URLSearchParams('start=2025-12-15&end=2026-01-10&location_id=loc-9'));
    expect(call).toEqual([
      '/analytics/finance/expenses/',
      {
        params: { start_date: '2025-12-15', end_date: '2026-01-10', bucket: undefined, category: undefined, currency: undefined, page: 1 },
        headers: { 'X-Location-Id': 'loc-9' }
      }
    ]);
  });

  it('a category change on a bank row PATCHes that bank transaction', async () => {
    patch.mockResolvedValue({ data: { rule_created: false, rule_applied_count: 0, merchant_key: 'x' } });
    await bankingApi.review('2d71d76b-b121-4aa4-9314-9b9adb404ea6', 'opex');
    expect(patch).toHaveBeenCalledWith('/banking/transactions/2d71d76b-b121-4aa4-9314-9b9adb404ea6/', { category: 'opex' });
  });
});

const body = (data: unknown, extra: Partial<Parameters<typeof ExpensesBody>[0]> = {}) =>
  html(
    <ExpensesBody
      expenses={loaded<FinanceExpenses>(data)}
      bucket={null}
      category={null}
      page={0}
      onFilter={() => {}}
      range={RANGE}
      {...extra}
    />
  );
const bankReview = { canEdit: true, savingId: '', error: '', onChange: () => {} };

/** The rows of the Expenses table, as cell texts. */
const tableRows = (h: string) => {
  const table = h.match(/<table[^>]*aria-label="Expenses"[\s\S]*?<\/table>/)?.[0] ?? '';
  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .slice(1)
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]).trim()));
};

describe('the rows on screen are the rows returned', () => {
  it('"Not yet categorized" selected: exactly the two rows the API returned', () => {
    const h = body(unreviewedExpenses, { bucket: 'unreviewed', review: bankReview });
    const rows = tableRows(h);
    expect(rows.map((r) => [r[0], r[1], r[3]])).toEqual([
      ['Oct 21', 'Square Deposit Hold', '$375.00'],
      ['Oct 14', 'Card 4821 Misc', '$375.00']
    ]);
    expect(h).toMatch(/aria-pressed="true"[^>]*>[\s\S]{0,400}?Not yet categorized/);
    expect(text(h)).toContain('1–2 of 2');
  });

  it('All: every row returned, in order, with the bucket names from the map', () => {
    const rows = tableRows(body(bankExpenses, { review: { ...bankReview, canEdit: false } }));
    const api = (bankExpenses as unknown as FinanceExpenses).results;
    expect(rows.map((r) => r[1])).toEqual(api.map((r) => r.payee));
    expect(rows.map((r) => r[2])).toEqual([
      'Payroll',
      'Rent and running costs',
      'Software',
      'Marketing',
      'Rent and running costs',
      'Equipment',
      'Inventory bought'
    ]);
  });
});

describe('one table for bank owners', () => {
  it('bank owner (admin): one Expenses table with a category select per row, no second bank table', () => {
    const h = body(bankExpenses, { review: bankReview });
    expect(h.match(/<table/g)).toHaveLength(1);
    expect(text(h)).not.toContain('Bank transactions');
    expect((h.match(/aria-label="Category for /g) ?? []).length).toBe(7);
    expect(h).toContain('aria-label="Category for payroll on Oct 1"');
  });

  it('the select shows the row bucket by the map; unreviewed rows show "Not yet categorized"', () => {
    const v = expensesView(unreviewedExpenses as unknown as FinanceExpenses);
    expect(v.rows.map((r) => r.bankCategory)).toEqual(['needs_review', 'needs_review']);
    expect(text(body(unreviewedExpenses, { bucket: 'unreviewed', review: bankReview }))).toContain('Not yet categorized');
  });

  it('a bank owner who cannot edit sees the category as text', () => {
    const h = body(bankExpenses, { review: { ...bankReview, canEdit: false } });
    expect(h).not.toContain('aria-label="Category for ');
  });

  it('QuickBooks owner: read-only rows with the account names', () => {
    const h = body(qbExpenses);
    expect(h).not.toContain('aria-label="Category for ');
    expect(tableRows(h)[0]).toEqual(['Oct 1', 'payroll', 'Wages', '$4,200.00']);
  });

  it('a save error shows above the rows', () => {
    expect(text(body(bankExpenses, { review: { ...bankReview, error: 'Could not save the category. Please retry.' } }))).toContain(
      'Could not save the category. Please retry.'
    );
  });
});

describe('?bucket= from the URL', () => {
  it('/finance/expenses?bucket=unreviewed opens with that chip selected', () => {
    const bucket = bucketFromParams(new URLSearchParams('bucket=unreviewed'));
    expect(bucket).toBe('unreviewed');
    const h = body(unreviewedExpenses, { bucket });
    const pressed = [...h.matchAll(/aria-pressed="true"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => text(m[1]).trim());
    expect(pressed).toEqual(['Not yet categorized']);
  });

  it('the chips are named by the bucket map', () => {
    expect(EXPENSE_FILTERS.map((f) => f.label)).toEqual([
      'All',
      'Payroll',
      'Rent and running costs',
      'Software',
      'Marketing',
      'Inventory bought',
      'Equipment',
      'Not yet categorized'
    ]);
  });

  it('a selected category row titles the table with its mapped name', () => {
    const h = body(bankExpenses, { bucket: 'labour', category: 'Labour / payroll' });
    expect(text(h)).toMatch(/Payroll Date Payee Category Amount/);
    expect(h).toMatch(/aria-pressed="true"[^>]*>[\s\S]{0,300}?Payroll/);
  });
});

describe('dates read the same in every table', () => {
  it('"Oct 1" within one year; with the year when the range spans years', () => {
    expect(tableDay('2026-10-01', RANGE)).toBe('Oct 1');
    expect(tableDay('2026-10-01T15:00:00Z', RANGE)).toBe('Oct 1');
    expect(tableDay('2025-12-30', { start: '2025-12-15', end: '2026-01-10' })).toBe('Dec 30, 2025');
    const spanning = { ...(bankExpenses as unknown as FinanceExpenses), period: { start: '2025-12-15', end: '2026-10-31' } };
    expect(expensesView(spanning).rows[0].date).toBe('Oct 1, 2026');
  });

  it('the bank rows never show ISO dates', () => {
    expect(text(body(bankExpenses, { review: bankReview }))).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('a correction refreshes every finance query', () => {
  it('invalidates the banking queries and the snapshot, expenses, profit, cash and sales queries', async () => {
    const qc = new QueryClient();
    const keys = [
      ['finance', 'snapshot', 'co', 'role', RANGE, null],
      ['finance', 'expenses', 'co', 'role', RANGE, null, { bucket: 'unreviewed', page: 1 }],
      ['finance', 'expenses', 'co', 'role', RANGE, null, { page: 1 }],
      ['finance', 'profit', 'co', 'role', RANGE, null],
      ['finance', 'cash', 'co', 'role', RANGE, null],
      ['finance', 'snapshot-sales', 'co', 'role', RANGE, null],
      ['banking', 'report', 'co', 'role', {}]
    ];
    keys.forEach((k) => qc.setQueryData(k, { any: 1 }));
    qc.setQueryData(['inventory', 'items'], { any: 1 });
    await refreshAfterReview(qc);
    for (const k of keys) expect(qc.getQueryState(k)?.isInvalidated, JSON.stringify(k)).toBe(true);
    expect(qc.getQueryState(['inventory', 'items'])?.isInvalidated).toBe(false);
  });
});
