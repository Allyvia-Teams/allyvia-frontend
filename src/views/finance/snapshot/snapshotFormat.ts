// The one place in src/views/finance/snapshot where a money string becomes a number,
// and only to display it: Intl formatting and the chart's y value. Nothing here adds,
// subtracts, sums or divides two figures. noMoneyMath.test.ts holds every other file in
// this folder to that.

const currencyCode = (currency: string) => (/^[A-Z]{3}$/.test(currency) ? currency : 'USD');

/** "14495.67" in USD -> "$14,495.67"; in CAD -> "CA$3,120.40". */
export function formatAmount(value: string, currency: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode(currency) }).format(n);
  } catch {
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${currency}`;
  }
}

/** A day's net sales as the chart's y value. Display only: the chart draws it, nothing sums it. */
export function chartAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** An ISO timestamp as the viewer's local "Nov 16, 3:11 PM". */
export function formatSyncedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
