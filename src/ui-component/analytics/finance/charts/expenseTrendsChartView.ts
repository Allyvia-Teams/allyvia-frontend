export interface ExpenseTrendPoint {
  x: number;
  y: number;
}

export interface ExpenseTrendRow {
  month?: string;
  date?: string;
  total_amount?: number | string;
}

export function buildExpenseTrendSeries(
  expenseTrend: { monthly_expenses?: ExpenseTrendRow[] } | ExpenseTrendRow[] | null | undefined
): ExpenseTrendPoint[] {
  const trendData = Array.isArray(expenseTrend) ? expenseTrend : expenseTrend?.monthly_expenses || [];

  return trendData
    .filter((t) => Number(t.total_amount) > 0)
    .map((t) => ({
      x: new Date(t.month || t.date || '').getTime(),
      y: Number(t.total_amount)
    }))
    .filter((point) => Number.isFinite(point.x))
    .sort((a, b) => a.x - b.x);
}
