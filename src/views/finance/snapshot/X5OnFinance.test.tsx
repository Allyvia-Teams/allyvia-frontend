import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { UnsortedMoneyOut } from 'api/banking';
import type { FinanceExpenses } from 'api/financeSnapshot';

// Session 10, step 0: main's expense truth X5 (PR #201) edited the bank page this branch had
// deleted. Its pieces now live on the pages that hold the feature: "Not sorted yet (n)" with
// Sort under the Expenses page's Categories, Bills and payees on the snapshot header, and a sort
// or an upload refreshing the finance figures as well as the banking reads.

vi.mock('utils/axios', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('store', () => ({ useSelector: () => null, useDispatch: () => () => undefined, store: {} }));
vi.mock('react-apexcharts', () => ({ default: () => null }));

import { NotSortedLine } from './BankSorting';
import { ExpensesBody } from './ExpensesDetail';
import { refreshAfterReview } from './BankReview';
import { BUCKET_LABELS } from '../bucketLabels';
import { BUCKET_LABELS as X5, UNSORTED_LABEL, sortChoices } from '../expenseTruth';
import bankExpenses from './fixtures/bank-expenses.json';

const RANGE = { start: '2026-10-01', end: '2026-10-31' };
const text = (h: string) =>
  h
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
const UNSORTED: UnsortedMoneyOut = {
  merchants: [],
  totals: [
    { currency: 'USD', total: '750.00', count: 2, merchants: 2 },
    { currency: 'CAD', total: '0.00', count: 0, merchants: 0 }
  ]
};
const line = (u: Parameters<typeof NotSortedLine>[0]['unsorted'], currency = 'USD') =>
  text(renderToStaticMarkup(<NotSortedLine unsorted={u} currency={currency} onSort={() => {}} onRetry={() => {}} />));

describe('X5 on the Expenses page', () => {
  it('"Not sorted yet (n)" with Sort and the amount, above zero only', () => {
    expect(line({ status: 'success', data: UNSORTED })).toContain('Not sorted yet (2) Sort $750.00');
    expect(line({ status: 'success', data: UNSORTED }, 'CAD').trim()).toBe('');
    expect(line({ status: 'pending' }).trim()).toBe('');
  });

  it('a failed read says so instead of reading as nothing to sort', () => {
    expect(line({ status: 'error' })).toContain('Could not load what is not sorted yet. Retry');
  });

  it('sits inside the Categories panel', () => {
    const h = text(
      renderToStaticMarkup(
        <MemoryRouter>
          <ExpensesBody
            expenses={{ data: bankExpenses as FinanceExpenses, isLoading: false, isError: false, refetch: () => {} }}
            bucket={null}
            category={null}
            page={0}
            onFilter={() => {}}
            range={RANGE}
            categoriesFooter={
              <NotSortedLine unsorted={{ status: 'success', data: UNSORTED }} currency="USD" onSort={() => {}} onRetry={() => {}} />
            }
          />
        </MemoryRouter>
      )
    );
    expect(h.indexOf('Not sorted yet (2)')).toBeGreaterThan(h.indexOf('Categories'));
    expect(h.indexOf('Not sorted yet (2)')).toBeLessThan(h.indexOf('Date Payee Category Amount'));
  });
});

describe('one bucket map', () => {
  it('Finance names buckets in X5’s words, plus X5’s unsorted label', () => {
    expect(BUCKET_LABELS).toEqual({ ...X5, unreviewed: UNSORTED_LABEL });
    expect(UNSORTED_LABEL).toBe('Not sorted yet');
    expect(BUCKET_LABELS.capex).toBe('Big purchases');
  });

  it('the Sort drawer’s choices and the Finance select say the same bucket names', () => {
    const drawer = sortChoices()[0].options.map((o) => o.label);
    expect(drawer).toEqual(['inventory', 'labour', 'opex', 'capex', 'technology', 'marketing'].map((b) => BUCKET_LABELS[b as 'opex']));
  });
});

describe('a sort refreshes the finance figures too', () => {
  it('refreshAfterReview (now used by the Sort drawer and the history upload and removal) invalidates banking and finance', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['finance', 'snapshot', 'co', 'role', RANGE, null], { any: 1 });
    qc.setQueryData(['banking', 'unsorted', 'co', 'role', RANGE], { any: 1 });
    await refreshAfterReview(qc);
    expect(qc.getQueryState(['finance', 'snapshot', 'co', 'role', RANGE, null])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(['banking', 'unsorted', 'co', 'role', RANGE])?.isInvalidated).toBe(true);
  });
});
