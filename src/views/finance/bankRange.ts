/**
 * The date range Finance opens on for bank activity.
 *
 * Plaid (or no provider info): the current month to date, as always.
 * Stripe: the same, unless the newest transaction is older than this month;
 * then the 30 days ending on that transaction, so the page opens on real
 * activity instead of an empty month. Dates are YYYY-MM-DD strings.
 */
export function defaultBankRange(
  today: string,
  latestActivity: string | null | undefined,
  provider: string | undefined
): { start: string; end: string } {
  const monthStart = `${today.slice(0, 7)}-01`;
  if (provider !== 'stripe' || !latestActivity || latestActivity >= monthStart) {
    return { start: monthStart, end: today };
  }
  const end = latestActivity;
  const d = new Date(`${end}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 29);
  return { start: d.toISOString().slice(0, 10), end };
}
