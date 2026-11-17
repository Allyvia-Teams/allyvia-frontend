// The link from the Import data screen to the Finance expense import, and how Finance reads it.

export const FINANCE_EXPENSE_IMPORT_HREF = '/finance/expenses?tool=import';

/** Where each old Finance tab now lives (finance tab Task 8). */
const LEGACY_TABS: Record<string, string> = {
  expenses: '/finance/expenses',
  statements: '/finance/profit',
  invoices: '/finance/quickbooks?view=invoices',
  payments: '/finance/quickbooks?view=payments',
  pos: '/finance/sales',
  sales: '/finance/sales'
};

/**
 * An old `/finance?tab=...` link's new home, keeping its other params (`tool=import`), or null when
 * the URL names no tab. An unknown tab opens the snapshot.
 */
export function legacyFinanceRedirect(search: string): string | null {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  if (tab === null) return null;
  params.delete('tab');
  const [path, own = ''] = (LEGACY_TABS[tab] ?? '/finance').split('?');
  const merged = new URLSearchParams(own);
  params.forEach((value, key) => merged.set(key, value));
  const query = merged.toString();
  return query ? `${path}?${query}` : path;
}

/** The Expenses tab's own tools: `import` opens the one that holds Import CSV. */
export const expenseToolFor = (tool: string | null): 'manage' | null => (tool === 'import' ? 'manage' : null);

/**
 * The sentence the Import data screen gets back for an expense list. The server words it
 * (integrations/front_door.py IMPORTS_ELSEWHERE); this is the one place that reads it.
 */
const EXPENSE_REFUSAL = 'Finance > Expenses > Import CSV';

export const refusedAsExpenseList = (reason: string | null | undefined): boolean => !!reason && reason.includes(EXPENSE_REFUSAL);
