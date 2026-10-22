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
 * "Valid until Oct 30, 2026, 12:00 AM" — the code's expiring INSTANT, with its
 * time, in the reader's zone (review round 2, C10/S2). A day alone was wrong
 * both ways: an event promo's code expires at the store's midnight after its
 * last day, so its own date names a day it does not work; and an ordinary code
 * expires at whatever time it was minted, so "through" that day over-claims.
 * The instant with its time is true for both, in any zone.
 */
export function codeExpiryLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `Valid until ${day}, ${time}`;
}
