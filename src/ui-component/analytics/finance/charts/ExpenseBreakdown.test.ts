import { describe, expect, it } from 'vitest';
import { formatExpenseBreakdown } from './expenseBreakdownView';

describe('ExpenseBreakdown (ALL-141 FIX 1)', () => {
  it('correctly extracts labels and series from flat array using category and amount fields', () => {
    const data = [{ category: 'Bills', amount: 500 }];
    const result = formatExpenseBreakdown(data);

    expect(result.labels).toEqual(['Bills']);
    expect(result.series).toEqual([500]);
  });

  it('handles multiple categories with numerical and string amounts', () => {
    const data = [
      { category: 'Bills', amount: 500 },
      { category: 'Payroll', amount: 1200 },
      { category: 'Office Supplies', amount: '350.50' }
    ];
    const result = formatExpenseBreakdown(data);

    expect(result.labels).toEqual(['Bills', 'Payroll', 'Office Supplies']);
    expect(result.series).toEqual([500, 1200, 350.5]);
  });

  it('returns empty labels and series when data is empty or all amounts are 0', () => {
    expect(formatExpenseBreakdown([])).toEqual({ labels: [], series: [] });
    expect(formatExpenseBreakdown([{ category: 'Bills', amount: 0 }])).toEqual({ labels: [], series: [] });
    expect(formatExpenseBreakdown(null)).toEqual({ labels: [], series: [] });
  });
});
