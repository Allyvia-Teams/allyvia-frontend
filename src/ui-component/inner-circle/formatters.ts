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

/**
 * The last instant a code works, from its `expires_at` — for a "Valid through"
 * line. An event promo's code expires at the store-local midnight AFTER its
 * last day (an exclusive end), so formatting `expires_at` itself names a day
 * the code does not work. One millisecond earlier is the last day; an ordinary
 * code (issued + N days, at whatever time it was issued) keeps its own day.
 */
export function lastValidMoment(expiresAt: string | null | undefined): Date | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt);
  return Number.isNaN(ms) ? null : new Date(ms - 1);
}
