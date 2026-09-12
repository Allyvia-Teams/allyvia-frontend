// Pure chart builders for the Dashboard's Analytics panel. No React, no store:
// every input is the already-fetched payload, so the shape decisions can be
// asserted under vitest's node environment.

import { getBucketValueByLabel } from './analyticsBuckets';

export interface ChartData {
  name: string;
  data: number[];
  secondarySeries?: number[];
  /** Names for the primary and secondary series in the legend/tooltip. */
  seriesNames: [string, string?];
  xAxis: string[];
  chartType: 'bar' | 'line';
  /** One clause under the headline: what the figure is. */
  description: string;
  /** Headline figure for the panel (total, ratio, or rate), already formatted. */
  headline: string;
}

export interface ChartInputs {
  invoiceAging?: { aging_summary?: { current?: number; days_31_60?: number; days_61_90?: number; over_90?: number } } | null;
  payablesByDueDate?: Array<{ label: string; amount: number }> | null;
  budgetsByCategory?: Array<{ category: string; amount: number }> | null;
  expenseBreakdown?: { by_category?: Array<{ category_name?: string; total?: string | number }> } | null;
  analyticsSummary?: Record<string, unknown> | null;
  revenueSeries?: Array<{ date: string; amount: string | number }> | null;
  inventorySummary?: Record<string, unknown> | null;
  employeeAnalytics?: { daily_breakdown?: Array<{ employees?: Array<{ hours?: string | number }> }> } | null;
}

const num = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const readSummaryNumber = (summary: Record<string, unknown> | null | undefined, snakeKey: string, camelKey: string): number =>
  num(summary?.[snakeKey] ?? summary?.[camelKey]);

const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

/** Every chart the fetched data can honestly support, most useful first. */
export function buildDashboardCharts(input: ChartInputs): ChartData[] {
  const charts: ChartData[] = [];
  const {
    invoiceAging,
    payablesByDueDate,
    budgetsByCategory,
    expenseBreakdown,
    analyticsSummary,
    revenueSeries,
    inventorySummary,
    employeeAnalytics
  } = input;

  // 1. Revenue vs expenses — the owner's first question, so the first option.
  if (revenueSeries && revenueSeries.length > 0 && expenseBreakdown) {
    const revenueData = revenueSeries.map((point) => num(point.amount));
    const dates = revenueSeries.map((point) => {
      const date = new Date(point.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    // Expenses arrive as a period total, not a daily series, so the line is the
    // period's average per day — the description says so.
    const totalExpenses = expenseBreakdown.by_category?.reduce((sum, cat) => sum + num(cat.total), 0) || 0;
    const avgDailyExpense = totalExpenses / (dates.length || 1);
    const totalRevenue = revenueData.reduce((sum, v) => sum + v, 0);
    charts.push({
      name: 'Revenue vs expenses',
      data: revenueData,
      secondarySeries: dates.map(() => avgDailyExpense),
      seriesNames: ['Revenue', 'Avg daily expenses'],
      xAxis: dates,
      chartType: 'line',
      description: `${money(totalRevenue - totalExpenses)} net · daily revenue against the period's average daily expenses`,
      headline: money(totalRevenue)
    });
  } else if (
    analyticsSummary &&
    (readSummaryNumber(analyticsSummary, 'total_revenue', 'totalRevenue') > 0 ||
      readSummaryNumber(analyticsSummary, 'expenses', 'expenses') > 0)
  ) {
    const revenue = readSummaryNumber(analyticsSummary, 'total_revenue', 'totalRevenue');
    const expenses = readSummaryNumber(analyticsSummary, 'expenses', 'expenses');
    charts.push({
      name: 'Revenue vs expenses',
      data: [revenue],
      secondarySeries: [expenses],
      seriesNames: ['Revenue', 'Expenses'],
      xAxis: ['Total'],
      chartType: 'bar',
      description: `${money(revenue - expenses)} net for the period`,
      headline: money(revenue)
    });
  }

  // 2. Accounts receivable aging
  if (invoiceAging && invoiceAging.aging_summary) {
    const summary = invoiceAging.aging_summary;
    const amounts = [num(summary.current), num(summary.days_31_60), num(summary.days_61_90), num(summary.over_90)];
    const total = amounts.reduce((s, v) => s + v, 0);
    const overdue = amounts.slice(1).reduce((s, v) => s + v, 0);
    charts.push({
      name: 'Receivables by age',
      data: amounts,
      seriesNames: ['Outstanding'],
      xAxis: ['Current', '31–60 days', '61–90 days', 'Over 90 days'],
      chartType: 'bar',
      description: `${money(overdue)} overdue of ${money(total)} outstanding`,
      headline: money(total)
    });
  }

  // 3. Accounts payable by due date
  if (payablesByDueDate && payablesByDueDate.length > 0) {
    const labels = payablesByDueDate.map((p) => p.label);
    const amounts = payablesByDueDate.map((p) => num(p.amount));
    const total = amounts.reduce((s, v) => s + v, 0);
    // ALL-58: read the bucket by label, never by array position.
    const dueThisWeek = getBucketValueByLabel(labels, amounts, 'Due This Week');
    charts.push({
      name: 'Payables by due date',
      data: amounts,
      seriesNames: ['Due'],
      xAxis: labels,
      chartType: 'bar',
      description: `${money(dueThisWeek)} due this week of ${money(total)} owed`,
      headline: money(total)
    });
  }

  // 4. Budget vs actual by category
  if (budgetsByCategory && budgetsByCategory.length > 0) {
    const categories = budgetsByCategory.map((cat) => cat.category);
    const budgetAmounts = budgetsByCategory.map((cat) => num(cat.amount));
    let actual: number[] | undefined;
    if (expenseBreakdown?.by_category && expenseBreakdown.by_category.length > 0) {
      actual = categories.map((category) => {
        const item = expenseBreakdown.by_category!.find((exp) => exp.category_name?.toLowerCase() === category.toLowerCase());
        return item ? num(item.total) : 0;
      });
    }
    const budgetTotal = budgetAmounts.reduce((s, v) => s + v, 0);
    const actualTotal = actual ? actual.reduce((s, v) => s + v, 0) : null;
    charts.push({
      name: 'Budget vs actual',
      data: budgetAmounts,
      secondarySeries: actual,
      seriesNames: ['Budget', 'Actual'],
      xAxis: categories,
      chartType: 'bar',
      description:
        actualTotal === null
          ? 'Planned budgets by category; no expense data for the period yet'
          : `${money(actualTotal)} spent against ${money(budgetTotal)} budgeted`,
      headline: money(budgetTotal)
    });
  }

  // 5. Inventory turnover (revenue ÷ current stock value; current value stands in for average)
  if (inventorySummary && analyticsSummary) {
    const revenue = readSummaryNumber(analyticsSummary, 'total_revenue', 'totalRevenue');
    if (revenue > 0) {
      const inventoryValue = num(
        inventorySummary.total_value ?? inventorySummary.inventory_value ?? inventorySummary.total_inventory_value
      );
      const turnover = inventoryValue > 0 ? revenue / inventoryValue : 0;
      charts.push({
        name: 'Inventory turnover',
        data: [turnover],
        seriesNames: ['Turnover'],
        xAxis: ['Turnover ratio'],
        chartType: 'bar',
        description: `${money(revenue)} revenue over ${money(inventoryValue)} of stock at retail`,
        headline: `${turnover.toFixed(2)}x`
      });
    }
  }

  // 6. Labor efficiency (revenue per labor hour)
  if (revenueSeries && employeeAnalytics?.daily_breakdown) {
    const totalRevenue = revenueSeries.reduce((sum, point) => sum + num(point.amount), 0);
    let totalHours = 0;
    employeeAnalytics.daily_breakdown.forEach((day) => {
      day.employees?.forEach((emp) => {
        totalHours += num(emp.hours);
      });
    });
    const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
    charts.push({
      name: 'Revenue per labor hour',
      data: [revenuePerHour],
      seriesNames: ['Revenue per hour'],
      xAxis: ['Revenue per hour'],
      chartType: 'bar',
      description: `${money(totalRevenue)} revenue over ${totalHours.toFixed(1)} labor hours`,
      headline: `$${revenuePerHour.toFixed(2)}`
    });
  }

  return charts;
}

/** Keep the owner's pick when it still exists; otherwise the first chart. */
export function pickChart(charts: ChartData[], selectedName: string | null): ChartData | null {
  if (charts.length === 0) return null;
  return charts.find((c) => c.name === selectedName) ?? charts[0];
}
