/**
 * Expense truth X5: everything the bank-mode Finance page and the analytics money
 * chart say about expenses, as pure functions. The components only render these.
 *
 * Rules (design section 10): category and amount first, few words, neutral colour,
 * no formulas or accounting words, and a figure nobody knows is never a zero.
 */
import {
  BANK_CATEGORIES,
  EXPENSE_BUCKETS,
  type BankCategory,
  type BankReport,
  type ExpenseBucket,
  type ExpenseCoverageWindow,
  type HistoryPreview,
  type HistoryUpload,
  type SignReading,
  type UnsortedMoneyOut
} from 'api/banking';
import { bankMoney } from 'utils/bankMoney';

// --------------------------------------------------------------------------
// Words
// --------------------------------------------------------------------------

/** The six expense buckets as the owner reads them (same words as the analytics page's bank breakdown). */
export const BUCKET_LABELS: Record<ExpenseBucket, string> = {
  inventory: 'Inventory',
  labour: 'Payroll',
  opex: 'Running costs',
  capex: 'Big purchases',
  technology: 'Software',
  marketing: 'Marketing'
};

export function bucketLabel(bucket: ExpenseBucket): string {
  return BUCKET_LABELS[bucket];
}

const NOT_AN_EXPENSE: BankCategory[] = ['transfer', 'financing', 'personal', 'income', 'tax'];

/** The Sort drawer's picker: the six buckets, then what is not an expense. Never "needs review". */
export function sortChoices(): { label: string; options: { value: BankCategory; label: string }[] }[] {
  return [
    { label: 'Money out', options: EXPENSE_BUCKETS.map((b) => ({ value: b, label: BUCKET_LABELS[b] })) },
    { label: 'Not an expense', options: NOT_AN_EXPENSE.map((c) => ({ value: c, label: BANK_CATEGORIES[c] })) }
  ];
}

const isoToUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "May 14, 2026" for a YYYY-MM-DD day. */
export function dayLabel(iso: string): string {
  return isoToUtc(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** The viewer's own calendar day of an instant, as YYYY-MM-DD. */
export function localDay(instant: string): string {
  const d = new Date(instant);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, days: number): string {
  const d = isoToUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

// --------------------------------------------------------------------------
// Query state, as the components hand it over
// --------------------------------------------------------------------------

export type Loaded<T> = { status: 'pending' } | { status: 'error' } | { status: 'success'; data: T };

// --------------------------------------------------------------------------
// "Not sorted yet (n)"
// --------------------------------------------------------------------------

export type UnsortedRowView = { kind: 'hidden' } | { kind: 'error' } | { kind: 'row'; label: string; amount: string };

/** Shown only above zero; a failed read says so instead of reading as nothing to sort. */
export function unsortedRow(unsorted: Loaded<UnsortedMoneyOut>, currency: string): UnsortedRowView {
  if (unsorted.status === 'error') return { kind: 'error' };
  if (unsorted.status !== 'success') return { kind: 'hidden' };
  const total = unsorted.data.totals.find((t) => t.currency === currency);
  if (!total || !(Number(total.total) > 0)) return { kind: 'hidden' };
  return { kind: 'row', label: `Not sorted yet (${total.merchants})`, amount: bankMoney(total.total, currency) };
}

// --------------------------------------------------------------------------
// Coverage
// --------------------------------------------------------------------------

/** The coverage row the bank feeds (a CSV extends it); an accounting row is not the bank's. */
export function bankCoverage(rows: ExpenseCoverageWindow[] | undefined): ExpenseCoverageWindow | null {
  return rows?.find((r) => r.source === 'bank' || r.source === 'csv') ?? null;
}

function accountName(report: BankReport): string {
  const account = report.accounts.find((a) => a.type === 'depository') ?? report.accounts[0];
  if (!account) return 'Your bank';
  return [account.name, account.mask].filter(Boolean).join(' ');
}

/**
 * One sentence: since when expenses are known, which account, how fresh.
 * "Expenses since May 14, 2026. Chase 4821, updated today." A stale feed names its
 * date; a feed that stopped asks to be reconnected. Nothing is said without a
 * coverage answer, so a failed read never prints a date.
 */
export function coverageLine(input: {
  coverage: Loaded<ExpenseCoverageWindow[]>;
  report: BankReport;
  today: string;
}): { text: string; reconnect: boolean } | null {
  const { coverage, report, today } = input;
  if (!report.connected || coverage.status !== 'success') return null;
  const window = bankCoverage(coverage.data);
  if (!window) return { text: 'Expenses appear after your bank’s first update.', reconnect: false };
  const since = `Expenses since ${dayLabel(window.covered_from)}.`;
  const account = accountName(report);
  if (report.error_code) return { text: `${since} ${account} needs to be reconnected to stay current.`, reconnect: true };
  const updated = report.institution_updated_at ? localDay(report.institution_updated_at) : null;
  const fresh = updated === null ? 'not updated yet' : updated === today ? 'updated today' : `last updated ${dayLabel(updated)}`;
  return { text: `${since} ${account}, ${fresh}.`, reconnect: false };
}

/**
 * "Add older bank history to see full seasons." Bank mode with a Stripe feed only
 * (the CSV lane lives on it), for someone who may add, while covered history is
 * under a year and the owner has not dismissed it.
 */
export function nudgeVisible(input: {
  bankMode: boolean;
  stripe: boolean;
  canAdd: boolean;
  dismissed: boolean;
  coverage: ExpenseCoverageWindow[] | undefined;
  today: string;
}): boolean {
  if (!input.bankMode || !input.stripe || !input.canAdd || input.dismissed) return false;
  const window = bankCoverage(input.coverage);
  if (!window) return false;
  return window.covered_from > addDays(input.today, -365);
}

// --------------------------------------------------------------------------
// The series: a gap, never a zero
// --------------------------------------------------------------------------

export interface KnownPoint {
  date: string;
  /** null = nobody knows (outside coverage); 0 = a covered day with no spend. */
  amount: number | null;
}

/** Every day in [start, end]: inside coverage its amount (0 when nothing went out), outside it unknown. */
export function knownExpenseDays(
  points: { date: string; amount: number }[],
  start: string,
  end: string,
  window: ExpenseCoverageWindow | null
): KnownPoint[] {
  const byDay = new Map<string, number>();
  for (const p of points) byDay.set(p.date, (byDay.get(p.date) ?? 0) + p.amount);
  const out: KnownPoint[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const known = !!window && d >= window.covered_from && d <= window.covered_to;
    out.push({ date: d, amount: known ? (byDay.get(d) ?? 0) : null });
  }
  return out;
}

function weekStart(iso: string): string {
  const dow = isoToUtc(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7)); // Monday
}

/** Sum into day, week (Monday) or month buckets; a bucket holding any unknown day is a gap. */
export function groupKnownPoints(points: KnownPoint[], by: 'day' | 'week' | 'month'): KnownPoint[] {
  const buckets = new Map<string, number | null>();
  for (const p of points) {
    const key = by === 'day' ? p.date : by === 'week' ? weekStart(p.date) : `${p.date.slice(0, 7)}-01`;
    const prior = buckets.has(key) ? buckets.get(key)! : 0;
    buckets.set(key, prior === null || p.amount === null ? null : prior + p.amount);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, amount]) => ({ date, amount }));
}

// --------------------------------------------------------------------------
// Older history by CSV
// --------------------------------------------------------------------------

export function sampleDirection(direction: 'money_out' | 'money_in'): string {
  return direction === 'money_out' ? 'Money out' : 'Money in';
}

const SIGN_LABELS: Record<SignReading, string> = {
  negative_is_out: 'Money out shows as a negative amount',
  positive_is_out: 'Money out shows as a positive amount',
  debit_credit: 'Money out has its own column'
};

export function signReadingLabel(reading: SignReading): string {
  return SIGN_LABELS[reading];
}

export const DATE_ORDER_LABELS = { dmy: 'Day first (31/01/2026)', mdy: 'Month first (01/31/2026)' } as const;

/** "412 rows will be added, 38 already covered." Rows the feed or an earlier file holds count as covered. */
export function previewCounts(preview: HistoryPreview): string {
  const covered = preview.rows_already_covered + preview.rows_duplicate;
  if (preview.rows_kept === 0) return 'Nothing new to add: every row is already covered.';
  const added = `${plural(preview.rows_kept, 'row', 'rows')} will be added`;
  return covered > 0 ? `${added}, ${covered.toLocaleString('en-US')} already covered.` : `${added}.`;
}

function span(first: string | null, last: string | null): string {
  if (!first) return '';
  return !last || last === first ? dayLabel(first) : `${dayLabel(first)} to ${dayLabel(last)}`;
}

export function uploadResultSentence(upload: HistoryUpload): string {
  const range = span(upload.first_date, upload.last_date);
  const added = `Added ${plural(upload.rows_kept, 'row', 'rows')} from ${upload.filename}${range ? `, ${range}` : ''}.`;
  const skipped = upload.rows_skipped_covered + upload.rows_skipped_duplicate;
  return skipped > 0 ? `${added} ${skipped.toLocaleString('en-US')} were already covered.` : added;
}

/** One past upload in the list beside Remove; its count is live (the feed may have taken rows since). */
export function uploadLine(upload: HistoryUpload): string {
  const range = span(upload.first_date, upload.last_date);
  return `${upload.filename}: ${range ? `${range}, ` : ''}${plural(upload.rows_now, 'row', 'rows')}`;
}

/** X3's refusal codes, one plain sentence each. */
export const REFUSAL_SENTENCES: Record<string, string> = {
  FEED_NOT_LOADED: 'Wait for your bank’s first update, then add older history.',
  ALREADY_UPLOADED: 'This file was already added.',
  FILE_CHANGED: 'The file changed since the preview. Choose it again.',
  UNREADABLE: 'This file cannot be read as a bank statement.',
  BAD_SIGN_READING: 'That choice does not fit this file. Choose how money out is shown again.',
  NOTHING_TO_ADD: 'Everything in this file is already covered.',
  FILE_TOO_LARGE: 'This file is over 20 MB. Split it by year and add each part.',
  TOO_MANY_ROWS: 'This file has more than 100,000 rows. Split it and add each part.',
  ACCOUNTING_CONNECTED: 'QuickBooks is your source for expenses, so bank history is not used.'
};

export function historyRefusal(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { code?: string } } } | null)?.response;
  if (!response) return 'Could not reach Allyvia. Check your connection and try again.';
  const code = response.data?.code;
  if (code && REFUSAL_SENTENCES[code]) return REFUSAL_SENTENCES[code];
  if (response.status === 404) return 'That account is no longer connected.';
  return 'Could not add this file. Please try again.';
}

/** The problems an unreadable file came back with (the server's own sentences), if any. */
export function refusalProblems(error: unknown): string[] {
  const problems = (error as { response?: { data?: { problems?: unknown } } } | null)?.response?.data?.problems;
  return Array.isArray(problems) ? problems.filter((p): p is string => typeof p === 'string') : [];
}
