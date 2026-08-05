import { describe, expect, it } from 'vitest';

import { buildExpenseCategoryRows } from './exportFinanceReport';

describe('buildExpenseCategoryRows', () => {
  it('aggregates count, totals, average and share per category', () => {
    const rows = buildExpenseCategoryRows([
      { category: 'Rent', amount: 900 },
      { category: 'Supplies', amount: '150.00' },
      { category: 'Supplies', amount: 50 }
    ]);
    expect(rows).toEqual([
      { category: 'Rent', count: 1, total_amount: '$900.00', avg_amount: '$900.00', percentage: '81.82%' },
      { category: 'Supplies', count: 2, total_amount: '$200.00', avg_amount: '$100.00', percentage: '18.18%' }
    ]);
  });

  it('renders an em dash — never NaN% — when the expense total is zero', () => {
    const rows = buildExpenseCategoryRows([{ category: 'Rent', amount: 0 }]);
    expect(rows[0].percentage).toBe('—');
    expect(rows[0].avg_amount).toBe('$0.00');
  });

  it('falls back to Unknown for uncategorised rows', () => {
    const rows = buildExpenseCategoryRows([{ amount: 25 }]);
    expect(rows[0].category).toBe('Unknown');
  });
});
