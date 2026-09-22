// Pure view-model helpers for FinancialAnalyticsCard's donut.
//
// The card switches between three unrelated payload shapes, and each one had
// its own field mismatch (ALL-140 H2/M1/M2). Keeping the shape handling here
// means the mapping is unit-testable without mounting the chart.

export type AnalyticsType = 'expense' | 'invoice' | 'payment';

export type DonutRow = { label: string; value: number; tooltip: string };

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const num = (v: unknown): number => {
  const parsed = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
};

// `/expense/breakdown/` returns a flat `[{category, amount}]` list. The card
// used to read `.by_category`, which belongs to ExpenseDetailedBreakdownView —
// a view that is defined but never routed — so the donut was always empty.
// Both shapes are accepted so a future re-route does not silently break it.
export function normalizeExpenseBreakdown(raw: any): Array<{ category: string; amount: number }> {
  const rows = Array.isArray(raw) ? raw : (raw?.by_category ?? []);
  if (!Array.isArray(rows)) return [];
  return rows.map((r: any) => ({
    category: r?.category ?? r?.category_name ?? 'Unknown',
    amount: num(r?.amount ?? r?.total)
  }));
}

export function expenseDonutRows(raw: any): DonutRow[] {
  return normalizeExpenseBreakdown(raw)
    .filter((r) => r.amount !== 0)
    .map((r) => ({ label: r.category, value: r.amount, tooltip: money(r.amount) }));
}

export function invoiceDonutRows(stats: any): DonutRow[] {
  return [
    { status: 'Paid', count: num(stats?.paid_count) },
    { status: 'Pending', count: num(stats?.unpaid_count) },
    { status: 'Overdue', count: num(stats?.overdue_count) }
  ]
    .filter((r) => r.count > 0)
    .map((r) => ({
      label: r.status,
      value: r.count,
      tooltip: `${r.count} ${r.count === 1 ? 'invoice' : 'invoices'}`
    }));
}

// `/payment/split/` returns `[{provider, amount, count}]`; `amount` is a
// decimal string.
export function paymentDonutRows(raw: any): DonutRow[] {
  const rows = Array.isArray(raw) ? raw : (raw?.payment_methods ?? []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: any) => ({ label: r?.provider ?? 'Unknown', value: num(r?.amount), count: num(r?.count) }))
    .filter((r) => r.value !== 0)
    .map((r) => ({
      label: r.label,
      value: r.value,
      tooltip: `${money(r.value)} (${r.count} ${r.count === 1 ? 'payment' : 'payments'})`
    }));
}

export function donutRows(
  type: AnalyticsType,
  sources: { expenseBreakdown?: any; invoiceStatistics?: any; paymentSplit?: any }
): DonutRow[] {
  switch (type) {
    case 'expense':
      return expenseDonutRows(sources.expenseBreakdown);
    case 'invoice':
      return invoiceDonutRows(sources.invoiceStatistics);
    case 'payment':
      return paymentDonutRows(sources.paymentSplit);
    default:
      return [];
  }
}

// Named per mode. The old fallback label said "No Payment Data Available"
// regardless of mode, so the Expense and Invoice views announced missing
// *payment* data.
export function emptyDonutMessage(type: AnalyticsType): string {
  switch (type) {
    case 'expense':
      return 'No expense breakdown for the selected period';
    case 'invoice':
      return 'No invoices for the selected period';
    case 'payment':
      return 'No payments for the selected period';
    default:
      return 'No data for the selected period';
  }
}
