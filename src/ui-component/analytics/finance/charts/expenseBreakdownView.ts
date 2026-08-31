export interface ExpenseBreakdownItem {
  category?: string;
  category_name?: string;
  amount?: number | string;
  total?: number | string;
  count?: number;
  percentage?: number;
}

export function formatExpenseBreakdown(breakdownData: ExpenseBreakdownItem[] | null | undefined): {
  labels: string[];
  series: number[];
} {
  const items = Array.isArray(breakdownData)
    ? breakdownData
    : (breakdownData as any)?.by_category || [];

  const labels = items.map((c: any) => c.category || c.category_name || 'Unknown');
  const series = items.map((c: any) => Number(c.amount ?? c.total ?? 0));

  if (!labels.length || !series.some((v: number) => v > 0)) {
    return { labels: [], series: [] };
  }

  return { labels, series };
}
