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
      const amount = typeof item.amount === 'number' ? item.amount : typeof item.amount === 'string' ? Number(item.amount) : NaN;
      const name = (item.category ?? '').trim();
      return {
        label: name ? name.split(':').map((part) => part.trim()).join(' › ') : 'Uncategorized',
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
  quickbooks: 'QuickBooks'
};

/** One sentence naming the expense sources that are not connected, or null when none are missing. */
export function missingExpenseSourcesLine(coverage: ReadonlyArray<{ source: string; available: boolean }> | null | undefined): string | null {
  const names = (coverage ?? [])
    .filter((entry) => !entry.available)
    .map((entry) => SOURCE_NAMES[entry.source] ?? entry.source.replaceAll('_', ' '));
  if (names.length === 0) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const sentence = `${list} ${names.length === 1 ? "isn't" : "aren't"} connected, so expenses may be low.`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** How far assets are from liabilities + equity, when that is more than 20 cents; otherwise null. */
export function balanceGap(assets: number, liabilities: number, equity: number): number | null {
  const gap = Math.abs(assets - (liabilities + equity));
  if (!Number.isFinite(gap)) return null;
  const cents = Math.round(gap * 100) / 100;
  return cents > 0.2 ? cents : null;
}
