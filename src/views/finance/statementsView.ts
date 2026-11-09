// Pure helpers for the Financial Statements tab. Rendered components cannot be
// tested in this repo's node-only vitest, so every decision the tab makes lives here.

export interface ExpenseCategoryInput {
  category?: string | null;
  amount?: number | string | null;
}

export interface ExpenseCategoryRow {
  label: string;
  amount: number;
}

/** One row per QuickBooks account, largest first. "Utilities:Electric" reads "Utilities › Electric". */
export function expenseCategoryRows(items: ReadonlyArray<ExpenseCategoryInput> | null | undefined): ExpenseCategoryRow[] {
  return (items ?? [])
    .map((item) => {
      const amount =
        typeof item.amount === 'number' ? item.amount : typeof item.amount === 'string' && item.amount.trim() ? Number(item.amount) : NaN;
      const name = (item.category ?? '').trim();
      return {
        label: name
          ? name
              .split(':')
              .map((part) => part.trim())
              .join(' › ')
          : 'Uncategorized',
        amount
      };
    })
    .filter((row) => Number.isFinite(row.amount))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

const SOURCE_NAMES: Record<string, string> = {
  payroll: 'payroll',
  processing_fees: 'card fees',
  bank_card_feeds: 'bank feeds',
  vendor_bills: 'vendor bills',
  manual_csv: 'manual entries',
  quickbooks: 'QuickBooks',
  xero: 'Xero'
};

export interface ExpenseCoverageNote {
  /** A quiet note on what the expense figures leave out, e.g. "Doesn't include payroll or card fees." */
  note: string | null;
  /** QuickBooks and Xero are both connected, so the owner must choose one. */
  conflict: boolean;
}

/**
 * What the expense figures leave out. Payroll, card fees and bank feeds have no
 * adapter yet, so they are always listed; that is a fact about the numbers, not
 * something the owner can connect, so it carries no call to action.
 */
export function expenseCoverageNote(
  coverage: ReadonlyArray<{ source: string; available: boolean }> | null | undefined
): ExpenseCoverageNote {
  const missing = (coverage ?? []).filter((entry) => !entry.available);
  const conflict = missing.some((entry) => entry.source === 'accounting_conflict');
  const names = missing
    .filter((entry) => entry.source !== 'accounting_conflict')
    .map((entry) => SOURCE_NAMES[entry.source] ?? entry.source.replaceAll('_', ' '));
  if (names.length === 0) return { note: null, conflict };
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
  return { note: `Doesn't include ${list}.`, conflict };
}

/** How far assets are from liabilities + equity, when that is more than 20 cents; otherwise null. */
export function balanceGap(assets: number, liabilities: number, equity: number): number | null {
  const gap = Math.abs(assets - (liabilities + equity));
  if (!Number.isFinite(gap)) return null;
  const cents = Math.round(gap * 100) / 100;
  return cents > 0.2 ? cents : null;
}
