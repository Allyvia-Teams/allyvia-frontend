import { describe, expect, it } from 'vitest';
import { buildExpenseTrendSeries } from './expenseTrendsChartView';

describe('ExpenseTrendsChart (ALL-141 FIX 5)', () => {
  it('builds a sorted expense trend series from API rows', () => {
    const data = buildExpenseTrendSeries({
      monthly_expenses: [
        { date: '2024-08-03', total_amount: 200 },
        { date: '2024-08-01', total_amount: 100 },
        { date: '2024-08-02', total_amount: 0 }
      ]
    });

    expect(data).toHaveLength(2);
    expect(data[0].y).toBe(100);
    expect(data[1].y).toBe(200);
    expect(data[0].x).toBeLessThan(data[1].x);
  });

  it('returns an empty array instead of synthetic mock points when API data is missing', () => {
    expect(buildExpenseTrendSeries(null)).toEqual([]);
    expect(buildExpenseTrendSeries({ monthly_expenses: [] })).toEqual([]);
    expect(buildExpenseTrendSeries([{ date: '2024-08-01', total_amount: 0 }])).toEqual([]);
  });
});
