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
 * "Valid until Oct 30, 2026, 3:42 PM" — the code's expiring INSTANT, with its
 * time, in the reader's zone (review round 2, C10/S2): an ordinary code
 * expires at whatever time it was minted, so a day alone ("through Oct 30")
 * over-claims. A LOCAL midnight reads "Valid through" the day before (review
 * round 3): an event promo's code expires at the store's midnight after its
 * last day, and "until Oct 30, 12:00 AM" led with a day it does not work.
 */
export function codeExpiryLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  // A LOCAL midnight is the end of the day before (review round 3, S1-S3): an
  // event code expires at the store's midnight after its last day, and
  // "until Oct 30, 12:00 AM" leads with a day it does not work.
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0) {
    return `Valid through ${fmt(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1))}`;
  }
  const day = fmt(date);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `Valid until ${day}, ${time}`;
}
