// The link from the Import data screen to the Finance expense import, and how Finance reads it.
// Finance keeps its tab in component state, so the link names it in the URL once, on arrival.

export const FINANCE_EXPENSE_IMPORT_HREF = '/finance?tab=expenses&tool=import';

/** Finance's tab order: Statements 0, Invoices 1, Expenses 2. Anything else opens the first. */
const EXPENSES_TAB = 2;

export const financeTabFor = (tab: string | null): number => (tab === 'expenses' ? EXPENSES_TAB : 0);

/** The Expenses tab's own tools: `import` opens the one that holds Import CSV. */
export const expenseToolFor = (tool: string | null): 'manage' | null => (tool === 'import' ? 'manage' : null);

/**
 * The sentence the Import data screen gets back for an expense list. The server words it
 * (integrations/front_door.py IMPORTS_ELSEWHERE); this is the one place that reads it.
 */
const EXPENSE_REFUSAL = 'Finance > Expenses > Import CSV';

export const refusedAsExpenseList = (reason: string | null | undefined): boolean => !!reason && reason.includes(EXPENSE_REFUSAL);
