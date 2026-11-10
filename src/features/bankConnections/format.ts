import { bankMoney } from 'utils/bankMoney';

/** Stripe reports minor units; every currency this feature allows (US only) has two decimals. */
export function minorToMoney(minor: number | null | undefined, currency: string): string {
  if (minor === null || minor === undefined) return '—';
  return bankMoney(minor / 100, (currency || 'usd').toUpperCase());
}

export function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return yyyyMm;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function accountLabel(c: { display_name: string; subcategory: string; last4: string }): string {
  const name = c.display_name || c.subcategory || 'Account';
  return c.last4 ? `${name} ••${c.last4}` : name;
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export function dateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}
