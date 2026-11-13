import { describe, expect, it } from 'vitest';
import { expenseToolFor, financeTabFor, FINANCE_EXPENSE_IMPORT_HREF, refusedAsExpenseList } from './entryLink';

// The server's sentence for a file that reads as an expense list (integrations/front_door.py).
const SERVER_SENTENCE =
  'reads as an expense list; expenses import from Finance > Expenses > Import CSV, not here. Leave it out, or say what else it holds';

describe('the link into the Finance expense import', () => {
  it('names the Expenses tab and its import tool, and Finance reads both back', () => {
    const url = new URL(FINANCE_EXPENSE_IMPORT_HREF, 'http://x');
    expect(url.pathname).toBe('/finance');
    expect(financeTabFor(url.searchParams.get('tab'))).toBe(2);
    expect(expenseToolFor(url.searchParams.get('tool'))).toBe('manage');
  });
  it('leaves Finance on its first tab and its tools closed without the link', () => {
    expect(financeTabFor(null)).toBe(0);
    expect(financeTabFor('statements')).toBe(0);
    expect(expenseToolFor(null)).toBeNull();
    expect(expenseToolFor('other')).toBeNull();
  });
});

describe('a file refused as an expense list', () => {
  it("is recognised by the server's own sentence", () => {
    expect(refusedAsExpenseList(SERVER_SENTENCE)).toBe(true);
  });
  it('is not any other refusal', () => {
    expect(refusedAsExpenseList('reads as a vendor list; vendors import from Vendors > Import, not here.')).toBe(false);
    expect(refusedAsExpenseList('left out of this import by the merchant')).toBe(false);
    expect(refusedAsExpenseList('')).toBe(false);
    expect(refusedAsExpenseList(null)).toBe(false);
  });
});
