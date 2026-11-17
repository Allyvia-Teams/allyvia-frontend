import type { FigureStatus } from 'api/financeSnapshot';
import { formatAmount } from './snapshot/snapshotFormat';

// The expense status keys the older summaries carry beside their Expenses and Net income
// figures (docs/finance-tab-plan.md, session 6 note): `expenses_status`, `expenses_reason`,
// `unreviewed_outflow`. They sit at the top level of /analytics/summary/ and
// /analytics/finance/summary/, inside `dailyProfit` on /dashboard/summary/, and in both
// `summary` and `kpis` of /analytics/finance/kpis/. Read as sent; no arithmetic on them.

export interface ExpenseStatusFields {
  expenses_status?: FigureStatus | null;
  expenses_reason?: string | null;
  /** 2dp string; null when unavailable. */
  unreviewed_outflow?: string | null;
}

export interface ExpenseTag {
  label: 'Partial' | 'Estimated' | 'Still importing';
  tooltip: string;
  tone: 'warning' | 'info';
}

/** "Partial" or "Estimated" with the reason; nothing for exact, unavailable or a server without the keys. */
export function expenseStatusTag(f: ExpenseStatusFields | null | undefined): ExpenseTag | null {
  const reason = f?.expenses_reason ?? '';
  if (f?.expenses_status === 'partial') return { label: 'Partial', tooltip: reason, tone: 'warning' };
  if (f?.expenses_status === 'estimated') return { label: 'Estimated', tooltip: reason, tone: 'warning' };
  return null;
}

/** The tag a tile shows: a running import outranks Partial and Estimated. */
export function expenseTileTag(f: ExpenseStatusFields | null | undefined, importing: ExpenseTag | null = null): ExpenseTag | null {
  return importing ?? expenseStatusTag(f);
}

/** True when the figure must read "Not available" in place of an amount. */
export const expensesUnavailable = (f: ExpenseStatusFields | null | undefined): boolean => f?.expenses_status === 'unavailable';

/** "$X not sorted yet" beside a partial figure, when the API reports spending above 0. Read from the string. */
export function unreviewedNote(f: ExpenseStatusFields | null | undefined, currency: string): string | null {
  const v = f?.unreviewed_outflow;
  if (f?.expenses_status !== 'partial' || !v || v.startsWith('-') || !/[1-9]/.test(v)) return null;
  return `${formatAmount(v, currency)} not sorted yet`;
}
