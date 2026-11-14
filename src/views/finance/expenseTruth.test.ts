import { describe, expect, it } from 'vitest';
import type { BankReport, ExpenseCoverageWindow, HistoryPreview, HistoryUpload, UnsortedMoneyOut } from 'api/banking';
import {
  BUCKET_LABELS,
  REFUSAL_SENTENCES,
  bucketLabel,
  coverageLine,
  dayLabel,
  groupKnownPoints,
  historyRefusal,
  knownExpenseDays,
  localDay,
  moneySourceCard,
  nudgeVisible,
  previewCounts,
  sampleDirection,
  signReadingLabel,
  sortChoices,
  unsortedRow,
  uploadLine,
  uploadResultSentence,
  withoutPlaidTile
} from './expenseTruth';

const TODAY = '2026-11-13';
/** Local noon of a day, so the viewer's day is that day in every timezone. */
const localNoon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();

const coverage = (over: Partial<ExpenseCoverageWindow> = {}): ExpenseCoverageWindow => ({
  currency: 'USD',
  source: 'bank',
  covered_from: '2026-05-14',
  covered_to: TODAY,
  feed_from: '2026-05-14',
  history_from: null,
  ...over
});

const report = (over: Partial<BankReport> = {}): BankReport => ({
  source: 'bank',
  connected: true,
  history_complete: true,
  last_synced_at: '2026-11-13T15:00:00Z',
  institution_updated_at: localNoon(2026, 11, 13),
  stale: false,
  error_code: '',
  transaction_count: 3,
  needs_review_count: 1,
  currencies: [],
  accounts: [
    { id: 'c1', name: 'Card', mask: '9999', type: 'credit', currency: 'USD', current_balance: '10.00', available_balance: null },
    { id: 'a1', name: 'Chase', mask: '4821', type: 'depository', currency: 'USD', current_balance: '10.00', available_balance: null }
  ],
  categories: [],
  ...over
});

describe('bucket labels', () => {
  it('names the six buckets in the owner’s words', () => {
    expect(BUCKET_LABELS).toEqual({
      inventory: 'Inventory',
      labour: 'Payroll',
      opex: 'Running costs',
      capex: 'Big purchases',
      technology: 'Software',
      marketing: 'Marketing'
    });
    expect(bucketLabel('labour')).toBe('Payroll');
  });

  it('offers the six buckets first in the sort picker, then what is not an expense', () => {
    const groups = sortChoices();
    expect(groups.map((g) => g.label)).toEqual(['Money out', 'Not an expense']);
    expect(groups[0].options.map((o) => o.label)).toEqual([
      'Inventory',
      'Payroll',
      'Running costs',
      'Big purchases',
      'Software',
      'Marketing'
    ]);
    expect(groups[1].options.map((o) => o.value)).toEqual(['transfer', 'financing', 'personal', 'income', 'tax']);
    expect(groups.flatMap((g) => g.options.map((o) => o.value))).not.toContain('needs_review');
  });
});

describe('the unsorted row', () => {
  const data = (total: string, merchants: number): UnsortedMoneyOut => ({
    merchants: [],
    totals: [{ currency: 'USD', total, count: merchants * 2, merchants }]
  });

  it('is hidden at zero, while loading and when nothing is unsorted in this currency', () => {
    expect(unsortedRow({ status: 'success', data: { merchants: [], totals: [] } }, 'USD')).toEqual({ kind: 'hidden' });
    expect(unsortedRow({ status: 'success', data: data('0.00', 0) }, 'USD')).toEqual({ kind: 'hidden' });
    expect(unsortedRow({ status: 'pending' }, 'USD')).toEqual({ kind: 'hidden' });
    expect(unsortedRow({ status: 'success', data: data('50.00', 2) }, 'EUR')).toEqual({ kind: 'hidden' });
  });

  it('counts the merchants left to sort and shows their amount', () => {
    expect(unsortedRow({ status: 'success', data: data('1700.00', 14) }, 'USD')).toEqual({
      kind: 'row',
      label: 'Not sorted yet (14)',
      amount: '$1,700.00'
    });
  });

  it('says it could not load rather than reading as nothing to sort', () => {
    expect(unsortedRow({ status: 'error' }, 'USD')).toEqual({ kind: 'error' });
  });
});

describe('the coverage line', () => {
  it('reads the covered start, the account and today', () => {
    expect(coverageLine({ coverage: { status: 'success', data: [coverage()] }, report: report(), today: TODAY })).toEqual({
      text: 'Expenses since May 14, 2026. Chase 4821, updated today.',
      reconnect: false
    });
  });

  it('a stale feed names its date', () => {
    const line = coverageLine({
      coverage: { status: 'success', data: [coverage()] },
      report: report({ stale: true, institution_updated_at: localNoon(2026, 11, 2) }),
      today: TODAY
    });
    expect(line?.text).toBe('Expenses since May 14, 2026. Chase 4821, last updated November 2, 2026.');
  });

  it('reconnect-needed is one line with the action', () => {
    const line = coverageLine({
      coverage: { status: 'success', data: [coverage()] },
      report: report({ error_code: 'STRIPE_ACCOUNT_INACTIVE', stale: true }),
      today: TODAY
    });
    expect(line).toEqual({ text: 'Expenses since May 14, 2026. Chase 4821 needs to be reconnected to stay current.', reconnect: true });
  });

  it('starts at older history when a CSV reaches back further', () => {
    const line = coverageLine({
      coverage: { status: 'success', data: [coverage({ covered_from: '2025-12-01', history_from: '2025-12-01' })] },
      report: report(),
      today: TODAY
    });
    expect(line?.text.startsWith('Expenses since December 1, 2025.')).toBe(true);
  });

  it('never invents a date: no coverage yet, or a failed fetch', () => {
    expect(coverageLine({ coverage: { status: 'success', data: [] }, report: report(), today: TODAY })?.text).toBe(
      'Expenses appear after your bank’s first update.'
    );
    expect(coverageLine({ coverage: { status: 'error' }, report: report(), today: TODAY })).toBeNull();
    expect(coverageLine({ coverage: { status: 'pending' }, report: report(), today: TODAY })).toBeNull();
    expect(
      coverageLine({ coverage: { status: 'success', data: [coverage()] }, report: report({ connected: false }), today: TODAY })
    ).toBeNull();
  });

  it('says not updated yet rather than a date nobody gave', () => {
    const line = coverageLine({
      coverage: { status: 'success', data: [coverage()] },
      report: report({ institution_updated_at: null }),
      today: TODAY
    });
    expect(line?.text).toBe('Expenses since May 14, 2026. Chase 4821, not updated yet.');
  });

  it('ignores an accounting coverage row', () => {
    expect(
      coverageLine({ coverage: { status: 'success', data: [coverage({ source: 'accounting' })] }, report: report(), today: TODAY })?.text
    ).toBe('Expenses appear after your bank’s first update.');
  });
});

describe('the older-history nudge', () => {
  const base = { bankMode: true, stripe: true, dismissed: false, canAdd: true, today: TODAY };

  it('shows while covered history is under a year', () => {
    expect(nudgeVisible({ ...base, coverage: [coverage({ covered_from: '2026-05-14' })] })).toBe(true);
    expect(nudgeVisible({ ...base, coverage: [coverage({ covered_from: '2025-11-15' })] })).toBe(true);
  });

  it('hides at a year, after dismiss, outside bank mode, without a Stripe feed, for a non-admin, or with no coverage', () => {
    expect(nudgeVisible({ ...base, coverage: [coverage({ covered_from: '2025-11-13' })] })).toBe(false);
    expect(nudgeVisible({ ...base, coverage: [coverage({ covered_from: '2024-01-01' })] })).toBe(false);
    expect(nudgeVisible({ ...base, dismissed: true, coverage: [coverage()] })).toBe(false);
    expect(nudgeVisible({ ...base, bankMode: false, coverage: [coverage()] })).toBe(false);
    expect(nudgeVisible({ ...base, stripe: false, coverage: [coverage()] })).toBe(false);
    expect(nudgeVisible({ ...base, canAdd: false, coverage: [coverage()] })).toBe(false);
    expect(nudgeVisible({ ...base, coverage: [] })).toBe(false);
    expect(nudgeVisible({ ...base, coverage: undefined })).toBe(false);
  });
});

describe('gap, never zero', () => {
  const window = coverage({ covered_from: '2026-03-03', covered_to: '2026-03-05' });

  it('a day outside coverage is unknown; a covered day with no spend is zero', () => {
    const days = knownExpenseDays([{ date: '2026-03-04', amount: 12.5 }], '2026-03-02', '2026-03-06', window);
    expect(days).toEqual([
      { date: '2026-03-02', amount: null },
      { date: '2026-03-03', amount: 0 },
      { date: '2026-03-04', amount: 12.5 },
      { date: '2026-03-05', amount: 0 },
      { date: '2026-03-06', amount: null }
    ]);
  });

  it('no coverage at all is unknown everywhere', () => {
    expect(knownExpenseDays([{ date: '2026-03-04', amount: 12.5 }], '2026-03-03', '2026-03-04', null)).toEqual([
      { date: '2026-03-03', amount: null },
      { date: '2026-03-04', amount: null }
    ]);
  });

  it('a month holding any unknown day is a gap; a fully covered month sums', () => {
    const days = knownExpenseDays([{ date: '2026-03-04', amount: 10 }], '2026-02-27', '2026-03-31', {
      ...window,
      covered_from: '2026-03-01',
      covered_to: '2026-03-31'
    });
    expect(groupKnownPoints(days, 'month')).toEqual([
      { date: '2026-02-01', amount: null },
      { date: '2026-03-01', amount: 10 }
    ]);
  });

  it('groups by week from Monday like the sales series', () => {
    const days = knownExpenseDays([{ date: '2026-03-04', amount: 10 }], '2026-03-02', '2026-03-08', {
      ...window,
      covered_from: '2026-03-02',
      covered_to: '2026-03-08'
    });
    expect(groupKnownPoints(days, 'week')).toEqual([{ date: '2026-03-02', amount: 10 }]);
    expect(groupKnownPoints(days, 'day')).toHaveLength(7);
  });
});

describe('older history upload sentences', () => {
  const preview = (over: Partial<HistoryPreview> = {}): HistoryPreview => ({
    account: 'a1',
    filename: 'statement.csv',
    sha256: 'f'.repeat(64),
    columns: ['Date', 'Description', 'Amount'],
    problems: [],
    can_commit: true,
    needs_date_order: false,
    sign_reading: 'negative_is_out',
    sign_readings: ['negative_is_out'],
    date_range: { first: '2025-11-01', last: '2026-06-01' },
    rows_total: 455,
    rows_kept: 412,
    rows_already_covered: 30,
    rows_duplicate: 8,
    kept_range: { first: '2025-11-01', last: '2026-05-13' },
    samples: [],
    ...over
  });

  it('the preview counts read kept and already covered', () => {
    expect(previewCounts(preview())).toBe('412 rows will be added, 38 already covered.');
    expect(previewCounts(preview({ rows_kept: 1, rows_already_covered: 0, rows_duplicate: 0 }))).toBe('1 row will be added.');
    expect(previewCounts(preview({ rows_kept: 0 }))).toBe('Nothing new to add: every row is already covered.');
  });

  it('labels each sample row money out or money in, and each sign reading in plain words', () => {
    expect(sampleDirection('money_out')).toBe('Money out');
    expect(sampleDirection('money_in')).toBe('Money in');
    // The server labels samples by its own reading; the owner choosing the other one flips them.
    expect(sampleDirection('money_out', 'negative_is_out', 'positive_is_out')).toBe('Money in');
    expect(sampleDirection('money_in', 'negative_is_out', 'positive_is_out')).toBe('Money out');
    expect(sampleDirection('money_out', 'negative_is_out', 'negative_is_out')).toBe('Money out');
    expect(sampleDirection('money_out', 'negative_is_out', null)).toBe('Money out');
    expect(sampleDirection('money_out', 'debit_credit', 'debit_credit')).toBe('Money out');
    expect(signReadingLabel('negative_is_out')).toBe('Money out shows as a negative amount');
    expect(signReadingLabel('positive_is_out')).toBe('Money out shows as a positive amount');
    expect(signReadingLabel('debit_credit')).toBe('Money out has its own column');
  });

  const upload = (over: Partial<HistoryUpload> = {}): HistoryUpload => ({
    id: 'u1',
    account_id: 'a1',
    filename: 'statement.csv',
    sha256: 'f'.repeat(64),
    sign_reading: 'negative_is_out',
    rows_kept: 412,
    rows_now: 412,
    rows_skipped_covered: 30,
    rows_skipped_duplicate: 8,
    first_date: '2025-11-01',
    last_date: '2026-05-13',
    uploaded_by: 'owner@example.com',
    created_at: '2026-11-13T15:00:00Z',
    ...over
  });

  it('the result sentence says what was added and what was skipped', () => {
    expect(uploadResultSentence(upload())).toBe(
      'Added 412 rows from statement.csv, November 1, 2025 to May 13, 2026. 38 were already covered.'
    );
    expect(
      uploadResultSentence(upload({ rows_kept: 1, rows_skipped_covered: 0, rows_skipped_duplicate: 0, last_date: '2025-11-01' }))
    ).toBe('Added 1 row from statement.csv, November 1, 2025.');
  });

  it('a past upload reads its live row count', () => {
    expect(uploadLine(upload({ rows_now: 300 }))).toBe('statement.csv: November 1, 2025 to May 13, 2026, 300 rows');
  });
});

describe('refusals', () => {
  const codes = [
    'FEED_NOT_LOADED',
    'ALREADY_UPLOADED',
    'FILE_CHANGED',
    'UNREADABLE',
    'BAD_SIGN_READING',
    'NOTHING_TO_ADD',
    'FILE_TOO_LARGE',
    'TOO_MANY_ROWS',
    'ACCOUNTING_CONNECTED'
  ];

  it('every refusal code has one plain sentence with no em dash', () => {
    for (const code of codes) {
      const sentence = historyRefusal({ response: { status: 400, data: { code, detail: 'server words' } } });
      expect(sentence).toBe(REFUSAL_SENTENCES[code]);
      expect(sentence).toMatch(/\.$/);
      expect(sentence).not.toContain('—');
    }
    expect(Object.keys(REFUSAL_SENTENCES).sort()).toEqual([...codes].sort());
  });

  it('a gone account, a network failure and an unknown code each get a sentence, never a raw error', () => {
    expect(historyRefusal({ response: { status: 404, data: { detail: 'Not found.' } } })).toBe('That account is no longer connected.');
    expect(historyRefusal(new Error('Network Error'))).toBe('Could not reach Allyvia. Check your connection and try again.');
    expect(historyRefusal({ response: { status: 500, data: { code: 'NEW_THING' } } })).toBe('Could not add this file. Please try again.');
  });
});

describe('dates', () => {
  it('formats a day in words and finds the local day of an instant', () => {
    expect(dayLabel('2026-05-14')).toBe('May 14, 2026');
    expect(localDay(localNoon(2026, 11, 13))).toBe('2026-11-13');
  });
});

describe('settings', () => {
  it('with QuickBooks connected the bank card says so and offers no button', () => {
    expect(moneySourceCard(true)).toEqual({ line: 'QuickBooks is your source for expenses.', showButton: false, quickbooks: true });
    expect(moneySourceCard(false)).toEqual({ line: null, showButton: true, quickbooks: false });
    expect(moneySourceCard(undefined)).toEqual({ line: null, showButton: true, quickbooks: false });
  });

  it('hides the Plaid bank tile only when Stripe is the provider', () => {
    const items = [{ id: 'bank' }, { id: 'quickbooks' }];
    expect(withoutPlaidTile(items, 'stripe')).toEqual([{ id: 'quickbooks' }]);
    expect(withoutPlaidTile(items, 'plaid')).toEqual(items);
    expect(withoutPlaidTile(items, undefined)).toEqual(items);
  });
});
