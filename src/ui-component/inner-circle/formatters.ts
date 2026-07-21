// Shared display formatters for Inner Circle components.

export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

/** "10.00" -> "10%", "12.50" -> "12.5%" */
export function formatPct(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return '—';
  return `${Number.isInteger(num) ? num : parseFloat(num.toFixed(2))}%`;
}
