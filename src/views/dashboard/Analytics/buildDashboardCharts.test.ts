import { describe, expect, it } from 'vitest';
import { buildDashboardCharts, pickChart } from './buildDashboardCharts';

describe('buildDashboardCharts', () => {
  it('leads with revenue vs expenses as a daily line when a series exists', () => {
    const charts = buildDashboardCharts({
      revenueSeries: [
        { date: '2026-09-01', amount: '100' },
        { date: '2026-09-02', amount: '300' }
      ],
      expenseBreakdown: { by_category: [{ category_name: 'Rent', total: '100' }] }
    });
    expect(charts[0].name).toBe('Revenue vs expenses');
    expect(charts[0].chartType).toBe('line');
    expect(charts[0].data).toEqual([100, 300]);
    expect(charts[0].secondarySeries).toEqual([50, 50]);
    expect(charts[0].headline).toBe('$400');
    expect(charts[0].description).toContain('$300 net');
  });

  it('falls back to period totals when only the summary is available', () => {
    const charts = buildDashboardCharts({ analyticsSummary: { total_revenue: '1200', expenses: 200 } });
    expect(charts[0].chartType).toBe('bar');
    expect(charts[0].data).toEqual([1200]);
    expect(charts[0].secondarySeries).toEqual([200]);
  });

  it('reads payables due this week by label, never by position (ALL-58)', () => {
    const charts = buildDashboardCharts({
      payablesByDueDate: [
        { label: 'Overdue', amount: 800 },
        { label: 'Due This Week', amount: 500 }
      ]
    });
    expect(charts[0].description).toBe('$500 due this week of $1,300 owed');
  });

  it('builds nothing from nothing', () => {
    expect(buildDashboardCharts({})).toEqual([]);
    expect(pickChart([], 'anything')).toBeNull();
  });

  it('keeps the selected chart while it exists and otherwise falls back to the first', () => {
    const charts = buildDashboardCharts({
      analyticsSummary: { total_revenue: 10 },
      invoiceAging: { aging_summary: { current: 1, over_90: 2 } }
    });
    expect(pickChart(charts, 'Receivables by age')?.name).toBe('Receivables by age');
    expect(pickChart(charts, 'Gone')?.name).toBe('Revenue vs expenses');
  });
});
