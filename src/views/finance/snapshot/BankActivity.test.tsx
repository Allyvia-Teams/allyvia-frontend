import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BankReport, BankTransaction } from 'api/banking';
import type { FinanceCash, FinanceExpenses, FinanceSales, FinanceSnapshot } from 'api/financeSnapshot';

// Session 10. Part A: the complete bank transaction list is back on /finance/cash for bank
// owners (every movement, not only expenses), and a correction there reaches the Expenses page
// and the snapshot. Part B: one feed strip on /finance and /finance/cash, worst condition first,
// in the deleted bank page's words. axios is mocked so requests are read, never sent.

const get = vi.fn();
const patch = vi.fn();
vi.mock('utils/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), patch: (...a: unknown[]) => patch(...a) } }));
vi.mock('store', () => ({ useSelector: () => null, useDispatch: () => () => undefined, store: {} }));
vi.mock('react-apexcharts', () => ({ default: () => null }));

import bankingApi from 'api/banking';
import financeSnapshotApi from 'api/financeSnapshot';
import { refreshAfterReview } from './BankReview';
import { BankTransactionsBody } from './BankTransactionsPanel';
import { CashBody } from './CashDetail';
import { ExpensesBody } from './ExpensesDetail';
import SnapshotBody from './SnapshotSections';
import {
  ALL_BANK_CAPTION,
  ALL_BANK_TITLE,
  allBankTransactionsLink,
  bankTransactionRows,
  feedAlert,
  MISSING_SOMETHING
} from './bankActivity';
import type { Loadable } from './SnapshotSections';
import transactions from './fixtures/bank-transactions.json';
import bankExpenses from './fixtures/bank-expenses.json';
import bankSnapshot from './fixtures/bank-snapshot.json';
import bankSales from './fixtures/bank-sales.json';
import bankCash from './fixtures/bank-cash.json';
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

const rows = transactions.results as BankTransaction[];
const TRANSFER = rows[0];

const HEALTHY: BankReport = {
  source: 'bank',
  connected: true,
  history_complete: true,
  last_synced_at: '2026-10-31T12:00:00Z',
  institution_updated_at: '2026-10-31T11:00:00Z',
  stale: false,
  error_code: '',
  transaction_count: 5,
  needs_review_count: 1,
  currencies: [],
  accounts: [],
  categories: []
};

const body = (extra: Partial<Parameters<typeof BankTransactionsBody>[0]> = {}) =>
  html(
    <BankTransactionsBody
      rows={loaded(transactions)}
      range={RANGE}
      page={0}
      needsReview={false}
      needsReviewCount={3}
      onPage={() => {}}
      onNeedsReview={() => {}}
      review={{ canEdit: true, savingId: '', error: '', onChange: () => {} }}
      {...extra}
    />
  );

describe('Part A: all bank transactions on Cash', () => {
  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
  });

  it('is titled and captioned as the owner asked', () => {
    const t = text(body());
    expect(ALL_BANK_TITLE).toBe('All bank transactions');
    expect(ALL_BANK_CAPTION).toBe(
      'Money in, money out, transfers and pending. Change a category here if something landed in the wrong place.'
    );
    expect(t).toContain(ALL_BANK_TITLE);
    expect(t).toContain(ALL_BANK_CAPTION);
  });

  it('lists every movement: money in, transfers, personal, needs review and pending, each with date, description, account and amount', () => {
    const t = text(body());
    for (const s of [
      'Oct 5',
      'Harbor Supply Co',
      'transfer out',
      'Business Checking ••4821',
      '$640.00',
      'Stripe',
      '-$1,250.00',
      'City Water',
      'Canva',
      'Business Card ••1180',
      'Owner draw'
    ])
      expect(t).toContain(s);
    expect(body().match(/aria-label="Category for /g)).toHaveLength(5);
  });

  it('shows the status chip the old page did: Rule, Suggested, Needs review, Pending, You', () => {
    expect(bankTransactionRows(rows, RANGE).map((r) => [r.description, r.status])).toEqual([
      ['Harbor Supply Co', 'Suggested'],
      ['Stripe', 'Rule'],
      ['City Water', 'Needs review'],
      ['Canva', 'Pending'],
      ['Owner draw', 'You']
    ]);
    expect(bankTransactionRows(rows, RANGE).map((r) => r.needsReview)).toEqual([false, false, true, false, false]);
  });

  it('the category select is offered to admins and disabled for everyone else, as before', () => {
    const selects = (h: string) => h.match(/<div[^>]*role="combobox"[^>]*>/g) ?? [];
    const admin = selects(body());
    const viewer = selects(body({ review: { canEdit: false, savingId: '', error: '', onChange: () => {} } }));
    expect(admin).toHaveLength(5);
    expect(admin.every((t) => !t.includes('aria-disabled="true"'))).toBe(true);
    expect(viewer).toHaveLength(5);
    expect(viewer.every((t) => t.includes('aria-disabled="true"'))).toBe(true);
  });

  it('the Needs review toggle carries the count and its state', () => {
    expect(text(body())).toContain('Needs review (3)');
    expect(body({ needsReview: true })).toMatch(/Mui-checked/);
  });

  it('paginates 50 a page from the count', () => {
    expect(text(body({ rows: loaded({ count: 120, results: rows }) }))).toContain('1–50 of 120');
  });

  it('asks /banking/transactions/ for the page range, the page and the Needs review filter', async () => {
    get.mockResolvedValue({ data: transactions });
    await bankingApi.transactions({ start_date: RANGE.start, end_date: RANGE.end }, 2, true);
    expect(get).toHaveBeenLastCalledWith('/banking/transactions/', {
      params: { start_date: '2026-10-01', end_date: '2026-10-31', page: 2, needs_review: true }
    });
  });

  it('says so when there is nothing in the range, and offers a retry when the read fails', () => {
    expect(text(body({ rows: loaded({ count: 0, results: [] }) }))).toContain('No transactions for this date range and filter.');
    const failed = { data: undefined, isLoading: false, isError: true, refetch: () => {} };
    expect(text(body({ rows: failed }))).toContain('Could not load transactions.');
  });

  it('sits on the Cash page under the balance and accounts, for bank owners', () => {
    const h = html(<CashBody cash={loaded<FinanceCash>(bankCash)} range={RANGE} bankSection={body()} />);
    const t = text(h);
    expect(t.indexOf('Accounts')).toBeGreaterThan(-1);
    expect(t.indexOf(ALL_BANK_TITLE)).toBeGreaterThan(t.indexOf('Accounts'));
  });

  it('a row the bank put under transfer is on Cash and not on Expenses', () => {
    expect(text(body())).toContain(TRANSFER.merchant);
    const expenses = text(
      html(
        <ExpensesBody
          expenses={loaded<FinanceExpenses>(bankExpenses)}
          bucket={null}
          category={null}
          page={0}
          onFilter={() => {}}
          range={RANGE}
        />
      )
    );
    expect(expenses).not.toContain(TRANSFER.merchant);
    expect((bankExpenses as FinanceExpenses).results.map((r) => r.id)).not.toContain(TRANSFER.id);
  });

  it('recategorising it to opex PATCHes the row, refetches the snapshot, and the Expenses page then shows it', async () => {
    const withRow: FinanceExpenses = {
      ...(bankExpenses as FinanceExpenses),
      count: bankExpenses.count + 1,
      results: [
        ...(bankExpenses as FinanceExpenses).results,
        {
          id: TRANSFER.id,
          date: TRANSFER.date,
          payee: TRANSFER.merchant,
          category: 'Operating expense',
          bucket: 'opex',
          amount: '640.00',
          source: 'bank'
        }
      ]
    };
    let corrected = false;
    let snapshotFetches = 0;
    get.mockImplementation(async (url: string) => {
      if (url === '/analytics/finance/snapshot/') {
        snapshotFetches += 1;
        return { data: bankSnapshot };
      }
      if (url === '/analytics/finance/expenses/') return { data: corrected ? withRow : bankExpenses };
      return { data: transactions };
    });
    patch.mockImplementation(async () => {
      corrected = true;
      return { data: { ...TRANSFER, category: 'opex', rule_created: false, rule_applied_count: 0, merchant_key: TRANSFER.merchant_key } };
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const snapshot = new QueryObserver(qc, {
      queryKey: ['finance', 'snapshot', 'co', 'role', RANGE, null],
      queryFn: () => financeSnapshotApi.snapshot({ ...RANGE, locationId: null })
    });
    const expenses = new QueryObserver(qc, {
      queryKey: ['finance', 'expenses', 'co', 'role', RANGE, null, { page: 1 }],
      queryFn: () => financeSnapshotApi.expenses({ ...RANGE, locationId: null }, { page: 1 })
    });
    const unsubscribe = [snapshot.subscribe(() => {}), expenses.subscribe(() => {})];
    await vi.waitFor(() => expect(expenses.getCurrentResult().data).toBeTruthy());
    expect((expenses.getCurrentResult().data as FinanceExpenses).results.map((r) => r.id)).not.toContain(TRANSFER.id);
    const before = snapshotFetches;

    await bankingApi.review(TRANSFER.id, 'opex');
    expect(patch).toHaveBeenCalledWith(`/banking/transactions/${TRANSFER.id}/`, { category: 'opex' });
    await refreshAfterReview(qc);

    await vi.waitFor(() => expect((expenses.getCurrentResult().data as FinanceExpenses).results.map((r) => r.id)).toContain(TRANSFER.id));
    expect(snapshotFetches).toBe(before + 1);
    unsubscribe.forEach((u) => u());
  });
});

describe('Part A: the Expenses page points at the full list', () => {
  const expensesPage = (fixture: unknown, source: string) =>
    text(
      html(
        <ExpensesBody
          expenses={loaded<FinanceExpenses>(fixture)}
          bucket={null}
          category={null}
          page={0}
          onFilter={() => {}}
          range={RANGE}
          bankSection={source === 'bank' ? allBankTransactionsLink(RANGE, null) : null}
        />
      )
    );

  it('bank owners get one quiet line linking to /finance/cash with the range and store', () => {
    expect(MISSING_SOMETHING).toBe('Missing something? See all bank transactions');
    expect(expensesPage(bankExpenses, 'bank')).toContain(MISSING_SOMETHING);
    const link = html(<>{allBankTransactionsLink(RANGE, 'loc-1')}</>);
    expect(link).toContain('href="/finance/cash?start=2026-10-01&amp;end=2026-10-31&amp;location_id=loc-1"');
  });

  it('QuickBooks owners do not', () => {
    expect(expensesPage(qbExpenses, 'quickbooks')).not.toContain('Missing something');
  });
});

describe('Part B: the feed strip', () => {
  it('a healthy feed, or no report yet, says nothing', () => {
    expect(feedAlert(HEALTHY)).toBeNull();
    expect(feedAlert(null)).toBeNull();
    expect(feedAlert(undefined)).toBeNull();
  });

  it('not connected, in the bank page’s words', () => {
    expect(feedAlert({ ...HEALTHY, connected: false })).toEqual({
      condition: 'not_connected',
      title: 'Connect a bank to automatically populate this page.',
      body: '',
      action: { label: 'Manage bank', to: '/integrations/bank' }
    });
  });

  it('an error state, in the integrations page’s words', () => {
    expect(feedAlert({ ...HEALTHY, error_code: 'ITEM_LOGIN_REQUIRED' })).toEqual({
      condition: 'error',
      title: 'The bank connection needs attention.',
      body: 'Reconnect to restore updates.',
      action: { label: 'Reconnect', to: '/integrations/bank' }
    });
  });

  it('stale, in the bank page’s words', () => {
    expect(feedAlert({ ...HEALTHY, stale: true })).toEqual({
      condition: 'stale',
      title: 'Bank updates need attention.',
      body: 'These figures may be out of date.',
      action: { label: 'Manage bank', to: '/integrations/bank' }
    });
  });

  it('still importing history, in the bank page’s words', () => {
    expect(feedAlert({ ...HEALTHY, history_complete: false })).toEqual({
      condition: 'importing',
      title: 'Your bank history is still importing.',
      body: 'Totals may be incomplete.',
      action: null
    });
  });

  it('one strip: the most serious condition wins', () => {
    const all = { ...HEALTHY, history_complete: false, stale: true, error_code: 'X' };
    expect(feedAlert(all)?.condition).toBe('error');
    expect(feedAlert({ ...all, connected: false })?.condition).toBe('not_connected');
    expect(feedAlert({ ...HEALTHY, history_complete: false, stale: true })?.condition).toBe('stale');
  });

  it('the snapshot shows the strip at the top, and nothing for a healthy feed', () => {
    const page = (feed: ReturnType<typeof feedAlert>) =>
      html(
        <SnapshotBody snapshot={loaded<FinanceSnapshot>(bankSnapshot)} sales={loaded<FinanceSales>(bankSales)} range={RANGE} feed={feed} />
      );
    const stale = page(feedAlert({ ...HEALTHY, stale: true }));
    expect(text(stale)).toContain('Bank updates need attention. These figures may be out of date.');
    expect(text(stale).indexOf('Bank updates need attention')).toBeLessThan(text(stale).indexOf('Net sales'));
    expect(stale.match(/role="status"/g)).toHaveLength(1);
    expect(page(feedAlert(HEALTHY))).not.toContain('role="status"');
  });

  it('the Cash page shows the same strip, and nothing for a healthy feed', () => {
    const page = (feed: ReturnType<typeof feedAlert>) => html(<CashBody cash={loaded<FinanceCash>(bankCash)} range={RANGE} feed={feed} />);
    expect(text(page(feedAlert({ ...HEALTHY, history_complete: false })))).toContain(
      'Your bank history is still importing. Totals may be incomplete.'
    );
    expect(page(feedAlert(HEALTHY))).not.toContain('role="status"');
  });
});
