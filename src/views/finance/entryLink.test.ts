import { describe, expect, it } from 'vitest';
import { expenseToolFor, FINANCE_EXPENSE_IMPORT_HREF, legacyFinanceRedirect, refusedAsExpenseList } from './entryLink';

// The server's sentence for a file that reads as an expense list (integrations/front_door.py).
const SERVER_SENTENCE =
  'reads as an expense list; expenses import from Finance > Expenses > Import CSV, not here. Leave it out, or say what else it holds';

describe('the link into the Finance expense import', () => {
  it('opens the Expenses page with its import tool', () => {
    const url = new URL(FINANCE_EXPENSE_IMPORT_HREF, 'http://x');
    expect(url.pathname).toBe('/finance/expenses');
    expect(expenseToolFor(url.searchParams.get('tool'))).toBe('manage');
  });
  it('leaves the tools closed without the link', () => {
    expect(expenseToolFor(null)).toBeNull();
    expect(expenseToolFor('other')).toBeNull();
  });
  it('sends an old ?tab= link to the page that now holds that tab, keeping its other params', () => {
    expect(legacyFinanceRedirect('?tab=expenses&tool=import')).toBe('/finance/expenses?tool=import');
    expect(legacyFinanceRedirect('?tab=invoices&start=2026-10-01')).toBe('/finance/quickbooks?view=invoices&start=2026-10-01');
    expect(legacyFinanceRedirect('?tab=nonsense')).toBe('/finance');
    expect(legacyFinanceRedirect('?start=2026-10-01')).toBeNull();
    expect(legacyFinanceRedirect('')).toBeNull();
  });
});

describe('a file refused as an expense list', () => {
  it("is recognised by the server's own sentence", () => {
    expect(refusedAsExpenseList(SERVER_SENTENCE)).toBe(true);
  });
  it('is not any other refusal', () => {
    expect(
      refusedAsExpenseList('reads as a vendor list; vendors import from Finance & accounting > Bills and payees > Import, not here.')
    ).toBe(false);
    expect(refusedAsExpenseList('left out of this import by the merchant')).toBe(false);
    expect(refusedAsExpenseList('')).toBe(false);
    expect(refusedAsExpenseList(null)).toBe(false);
  });
});
