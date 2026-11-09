// Pure helpers for the Finance Expenses tab (node-only vitest cannot render).
import type { ExpenseReport } from 'types/expenseCatalogue';
import type { ExpenseCategoryRow } from './statementsView';

type ReportRecord = ExpenseReport['records'][number];

export interface RecentExpense {
  key: string;
  date: string;
  payee: string;
  amount: number;
  /** Something on this expense is still owed. */
  unpaid: boolean;
}

const toNumber = (value: unknown): number => (typeof value === 'string' && value.trim() ? Number(value) : NaN);

/**
 * One row per expense (a bill, a card purchase, a hand-entered expense), newest
 * first. The report lists lines, so lines of one expense are summed: a line's
 * source id is "<system>:<record>:<line>", and a hand-entered one carries its
 * entry id.
 */
export function recentExpenses(records: ReadonlyArray<ReportRecord> | null | undefined, limit = 10): RecentExpense[] {
  const byKey = new Map<string, RecentExpense>();
  for (const record of records ?? []) {
    const amount = toNumber(record.amount);
    if (!Number.isFinite(amount)) continue;
    const key = record.entry_id || record.source_id.replace(/:\d+$/, '');
    const owed = toNumber(record.outstanding);
    const existing = byKey.get(key);
    if (existing) {
      existing.amount += amount;
      existing.unpaid = existing.unpaid || owed > 0;
    } else {
      byKey.set(key, {
        key,
        date: record.recognized_date,
        payee: record.payee?.trim() || 'No payee',
        amount,
        unpaid: owed > 0
      });
    }
  }
  return [...byKey.values()]
    .map((row) => ({ ...row, amount: Math.round(row.amount * 100) / 100 }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** The total of the category rows shown, so the card adds up. */
export function categoryTotal(rows: ReadonlyArray<ExpenseCategoryRow>): number {
  return Math.round(rows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
}
