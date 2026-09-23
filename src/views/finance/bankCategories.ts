import {
  BANK_CATEGORIES,
  CATEGORY_GROUPS,
  EXPENSE_BUCKETS,
  type BankCategory,
  type BankCurrency,
  type CategorySource,
  type ExpenseBucket
} from 'api/banking';
import { bankMoney } from 'utils/bankMoney';

/** Category picker options, grouped so expenses read as a set rather than a flat list. */
export function groupedCategories(): { label: string; options: { value: BankCategory; label: string }[] }[] {
  return CATEGORY_GROUPS.map((g) => ({ label: g.label, options: g.categories.map((c) => ({ value: c, label: BANK_CATEGORIES[c] })) }));
}

/** Who decided this row's category. Pending outranks every source: nothing is settled yet. */
export function sourceChipLabel(source: CategorySource, pending: boolean, category: BankCategory): string {
  if (pending) return 'Pending';
  if (source === 'owner') return 'You';
  if (source === 'rule') return 'Rule';
  if (category === 'needs_review') return 'Needs review';
  return 'Suggested';
}

/** Only a rule that moved other rows is worth reporting; a lone correction just saves. */
export function reviewSnackbarText(ruleCreated: boolean, applied: number, merchant: string): string {
  if (!ruleCreated || applied === 0) return 'Saved.';
  return `Saved. Applied to ${applied} other ${applied === 1 ? 'transaction' : 'transactions'} from "${merchant}".`;
}

export function coverageLabel(coverage: string | null): string {
  if (coverage === null) return 'No outflow in range';
  return `Coverage ${Math.round(Number(coverage) * 100)}%`;
}

/**
 * What the "Expenses by category" card can honestly show for one currency.
 * Until the backend categorizes bank transactions the report carries none of
 * these fields, and a total nobody computed must not read as $0.00.
 */
export type ExpenseCardView =
  | { state: 'unavailable' }
  | { state: 'empty' }
  | {
      state: 'table';
      rows: { bucket: ExpenseBucket; label: string; amount: string }[];
      total: string;
      unclassified: string;
      coverage: string;
    };

export function expenseCardView(currency: BankCurrency): ExpenseCardView {
  const { expenses_by_bucket: buckets, expenses_total: total, unclassified_outflow: unclassified, coverage } = currency;
  if (!buckets || typeof total !== 'string' || typeof unclassified !== 'string' || coverage === undefined) {
    return { state: 'unavailable' };
  }
  if (total === '0.00' && coverage === null) return { state: 'empty' };
  return {
    state: 'table',
    rows: EXPENSE_BUCKETS.map((bucket) => ({
      bucket,
      label: BANK_CATEGORIES[bucket],
      amount: bankMoney(buckets[bucket], currency.currency)
    })),
    total: bankMoney(total, currency.currency),
    unclassified: bankMoney(unclassified, currency.currency),
    coverage: coverageLabel(coverage)
  };
}

/** A 404 here means this backend has no /banking/rules/ route yet, so there is nothing to manage. */
const rulesNotDeployed = (error: unknown) => (error as { response?: { status?: number } } | null)?.response?.status === 404;

/** The Merchant rules panel shows once rules load; any failure other than a missing route is reported. */
export function merchantRulesPanel(status: 'pending' | 'error' | 'success', error: unknown): 'hidden' | 'error' | 'ready' {
  if (status === 'success') return 'ready';
  if (status === 'pending' || rulesNotDeployed(error)) return 'hidden';
  return 'error';
}

/** A missing route is final; anything else keeps React Query's default three retries. */
export function retryMerchantRules(failureCount: number, error: unknown): boolean {
  return !rulesNotDeployed(error) && failureCount < 3;
}
