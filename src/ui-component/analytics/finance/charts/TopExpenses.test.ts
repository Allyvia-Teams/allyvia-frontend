import { describe, expect, it } from 'vitest';
import { getTopExpenseName } from './topExpensesView';

describe('TopExpenses (ALL-141 FIX 2)', () => {
  it('renders expense name from expense_name and ignores description if present', () => {
    const expense = {
      expense_name: 'AWS Cloud Services',
      description: 'Old Description Field',
      amount: 1500,
      category: 'Infrastructure'
    };

    expect(getTopExpenseName(expense, 0)).toBe('AWS Cloud Services');
  });

  it('renders category as secondary fallback if expense_name is missing', () => {
    const expense = {
      category: 'Utilities',
      amount: 250
    };

    expect(getTopExpenseName(expense, 1)).toBe('Utilities');
  });

  it('renders indexed fallback if both expense_name and category are absent', () => {
    const expense = {
      amount: 100
    };

    expect(getTopExpenseName(expense, 2)).toBe('Expense 3');
  });
});
