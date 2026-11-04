import { bankMoney } from 'utils/bankMoney';

/**
 * The drawer's cash section: what the health bar's cash is, and what is already
 * owed against it. Read from `GET agent/health/?include=cash_context`.
 *
 * Context only. Nothing here is added together: scheduled payments are part of
 * the recorded bills, bank matches may already have paid some of them, and the
 * cash is a QuickBooks book balance, never verified spendable cash. Unknown
 * fields stay unknown; an unreadable amount is never printed as money.
 */
const BASIS = 'health_cash_context/1';

export interface CashContextPayload {
  basis?: string;
  scope?: string;
  status?: string;
  reason?: string | null;
  cash?: { amount?: string | null; currency?: string | null; unavailable_reason?: string | null; verified?: boolean } | null;
  payables?: Record<string, { recorded?: string; due_buckets?: Record<string, string> }> | null;
  payables_complete?: boolean | null;
  reservations?: {
    allocation_overlap?: string | null;
    not_submitted_by_currency?: Record<string, string> | null;
    possibly_committed_by_currency?: Record<string, string> | null;
  } | null;
  possibly_paid_by_bank?: { status?: string; corroborated_outstanding_by_currency?: Record<string, string> | null } | null;
}

// 'company' mirrors healthQueryKey: this lineage sends no store header. When a
// store header arrives, the store belongs in both keys.
export const cashContextQueryKey = (user: string, company: string, role: string) =>
  ['health-cash-context', user, company, role, 'company'] as const;

/** No key, so no request: the polled bar never asks, only the open drawer. */
export function cashContextKeyFor(enabled: boolean, user?: string | null, company?: string | null, role?: string | null) {
  return enabled && user && company && role ? cashContextQueryKey(user, company, role) : null;
}

/** The response must echo the requested company and role, as the health read does. */
export function cashContextFromResponse(payload: unknown, company: string, role: string): CashContextPayload {
  const data = payload as { company_id?: string; role_id?: string; cash_context?: CashContextPayload } | null;
  if (!data || typeof data !== 'object' || data.company_id !== company || data.role_id !== role) {
    throw new Error('Health response scope changed during request');
  }
  return data.cash_context ?? {};
}

const MESSAGES: Record<string, string> = {
  not_permitted: 'Cash and bills are shown to roles with finance access.',
  not_applicable: 'Cash and bills are company figures: a store has no cash of its own.',
  unavailable: 'Cash and bills could not be read right now.'
};

const CASH_REASONS: Record<string, string> = {
  no_bank_book_balance: 'No QuickBooks bank balance is recorded, and takings are not cash.',
  bank_book_balances_in_multiple_currencies: 'QuickBooks bank balances are in more than one currency and cannot be added.',
  bank_book_balances_all_zero: 'Every QuickBooks bank balance reads zero, which can mean the balance is missing.',
  quickbooks_not_selected: 'Cash is not read here while another financial source is selected.',
  book_source_changed_during_read: 'The books changed while they were read; try again shortly.'
};
const CASH_UNAVAILABLE = 'Cash balance is unavailable.';

/** Why there is no cash figure, in the owner's words; shared with the runway row. */
export function cashUnavailableText(reason: unknown): string {
  return (typeof reason === 'string' && CASH_REASONS[reason]) || CASH_UNAVAILABLE;
}

// Most urgent first.
const BUCKETS: [string, string][] = [
  ['overdue', 'Overdue'],
  ['today_through_7_days', 'Due within 7 days'],
  ['8_through_30_days', 'Due in 8 to 30 days'],
  ['after_30_days', 'Due after 30 days'],
  ['undated', 'No due date']
];

const FOOTNOTE = 'Context only: the score does not use these figures.';
const BALANCE_NOTE = ' The bank balance is as recorded in QuickBooks.';

function readable(amount: unknown): amount is string {
  return typeof amount === 'string' && amount.trim() !== '' && Number.isFinite(Number(amount));
}

function positive(amount: unknown): amount is string {
  return readable(amount) && Number(amount) > 0;
}

/** A currency the books did not record is said so, not printed as a code. */
function money(amount: string, currency: string) {
  if (currency !== 'unknown') return bankMoney(amount, currency);
  const plain = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount));
  return `${plain} (currency not recorded)`;
}

function byCurrency(amounts: Record<string, string> | null | undefined, words: (amount: string) => string) {
  return Object.entries(amounts ?? {})
    .filter(([, amount]) => positive(amount))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => words(money(amount, currency)));
}

export function buildCashContextView(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const context = payload as CashContextPayload;
  if (context.basis !== BASIS) return null;
  if (context.status !== 'observed') {
    const message = MESSAGES[context.status ?? ''];
    return message ? { message, cash: null, payables: [], notes: [], scheduled: [], possiblyPaid: [], footnote: FOOTNOTE } : null;
  }

  const cash = context.cash ?? {};
  const hasBalance = readable(cash.amount) && Boolean(cash.currency);
  const cashLine = hasBalance
    ? `${money(cash.amount!, cash.currency!)} in QuickBooks bank accounts, as recorded (not a verified balance)`
    : cashUnavailableText(cash.unavailable_reason);

  // The liquidity signal lists a currency for every bank or liability account
  // too; a currency with nothing owed is not a bill.
  const payables = Object.entries(context.payables ?? {})
    .filter(([, figures]) => !readable(figures?.recorded) || Number(figures.recorded) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, figures]) => ({
      currency,
      total: readable(figures?.recorded) ? `${money(figures.recorded!, currency)} in recorded bills` : 'Recorded bills: amount unavailable',
      buckets: BUCKETS.filter(([key]) => positive(figures?.due_buckets?.[key])).map(([key, label]) => ({
        label,
        amount: money(figures.due_buckets![key], currency)
      }))
    }));

  const notes: string[] = [];
  if (payables.length === 0) notes.push('No recorded bills are outstanding.');
  if (context.payables_complete !== true) notes.push('Recorded bills may be incomplete.');

  const reservations = context.reservations ?? {};
  // Only the server's own check may say the money is inside the bills shown.
  const placement =
    reservations.allocation_overlap === 'within_supplied_projection'
      ? '(already counted in the bills above)'
      : '(may not be part of the bills shown)';
  const scheduled = [
    ...byCurrency(reservations.not_submitted_by_currency, (amount) => `${amount} scheduled to pay bills but not yet sent ${placement}`),
    ...byCurrency(
      reservations.possibly_committed_by_currency,
      (amount) => `${amount} sent to the payment provider and may have left ${placement}`
    )
  ];

  const matches = context.possibly_paid_by_bank;
  const possiblyPaid =
    matches?.status === 'current'
      ? byCurrency(
          matches.corroborated_outstanding_by_currency,
          (amount) => `${amount} of these bills may already have been paid from the bank`
        )
      : [];

  // The balance note only belongs beside a balance.
  const footnote = hasBalance ? FOOTNOTE + BALANCE_NOTE : FOOTNOTE;
  return { message: null, cash: cashLine, payables, notes, scheduled, possiblyPaid, footnote };
}
export type CashContextView = NonNullable<ReturnType<typeof buildCashContextView>>;
