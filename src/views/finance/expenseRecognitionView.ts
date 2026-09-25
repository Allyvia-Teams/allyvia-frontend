import type { ExpenseTotals } from 'types/expenseCatalogue';

export function formatRecognitionMoney(value: unknown, currency: string): string {
  if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value)) return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 100))) return '—';
  if (!/^[A-Z]{3}$/.test(currency)) return `${value} ${currency}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function expenseRecognitionRows(currencies?: Record<string, ExpenseTotals>) {
  return Object.entries(currencies ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, totals]) => ({
      currency,
      recognized: formatRecognitionMoney(totals.recognized_expenses, currency),
      paid: formatRecognitionMoney(totals.cash_paid, currency),
      outstanding: formatRecognitionMoney(totals.outstanding, currency),
      unclassified: formatRecognitionMoney(totals.unclassified, currency)
    }));
}
