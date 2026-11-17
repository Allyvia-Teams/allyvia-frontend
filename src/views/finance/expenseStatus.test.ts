import { describe, expect, it } from 'vitest';
import { expenseStatusTag, expenseTileTag, expensesUnavailable, unreviewedNote } from './expenseStatus';

const PARTIAL = {
  expenses_status: 'partial' as const,
  expenses_reason: '2 bank transactions ($750.00) not sorted yet',
  unreviewed_outflow: '750.00'
};

describe('expense status keys on the older summaries', () => {
  it('partial and estimated tag with the reason; exact, unavailable and missing keys do not', () => {
    expect(expenseStatusTag(PARTIAL)).toEqual({ label: 'Partial', tooltip: PARTIAL.expenses_reason, tone: 'warning' });
    expect(expenseStatusTag({ expenses_status: 'estimated', expenses_reason: 'r' })).toEqual({
      label: 'Estimated',
      tooltip: 'r',
      tone: 'warning'
    });
    expect(expenseStatusTag({ expenses_status: 'exact', expenses_reason: '' })).toBeNull();
    expect(expenseStatusTag({ expenses_status: 'unavailable', expenses_reason: 'x' })).toBeNull();
    expect(expenseStatusTag({})).toBeNull();
    expect(expenseStatusTag(null)).toBeNull();
  });
  it('a running import outranks Partial', () => {
    const importing = { label: 'Still importing' as const, tooltip: 'i', tone: 'info' as const };
    expect(expenseTileTag(PARTIAL, importing)).toBe(importing);
    expect(expenseTileTag(PARTIAL, null)?.label).toBe('Partial');
  });
  it('unavailable is read from the status only', () => {
    expect(expensesUnavailable({ expenses_status: 'unavailable' })).toBe(true);
    expect(expensesUnavailable(PARTIAL)).toBe(false);
    expect(expensesUnavailable(undefined)).toBe(false);
  });
  it('"$X not sorted yet" only beside a partial figure with spending above 0', () => {
    expect(unreviewedNote(PARTIAL, 'USD')).toBe('$750.00 not sorted yet');
    expect(unreviewedNote({ ...PARTIAL, unreviewed_outflow: '0.00' }, 'USD')).toBeNull();
    expect(unreviewedNote({ ...PARTIAL, unreviewed_outflow: null }, 'USD')).toBeNull();
    expect(unreviewedNote({ ...PARTIAL, expenses_status: 'exact' }, 'USD')).toBeNull();
    expect(unreviewedNote({ ...PARTIAL, unreviewed_outflow: '1234.50' }, 'CAD')).toBe('CA$1,234.50 not sorted yet');
  });
});
