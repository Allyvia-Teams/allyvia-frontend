import { BANK_CATEGORIES, CATEGORY_GROUPS, type BankCategory, type CategorySource } from 'api/banking';

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
