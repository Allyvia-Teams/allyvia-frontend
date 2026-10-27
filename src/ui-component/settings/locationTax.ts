/**
 * Per-store sales tax: what the editor shows and sends. Pure, so it is tested
 * without a DOM. Percent on screen, fraction on the wire (see taxRate.ts).
 *
 * Only `import type` from the API module: importing it for real pulls in
 * utils/axios, which cannot load under vitest.
 */

import type { Location } from 'api/inventoryStock.api';

import { fractionToPercent, percentToFraction } from './taxRate';

/** The PATCH accepts 0 to 0.25: a 25% sales tax is past any real US rate. */
export const MAX_TAX_PERCENT = 25;

export const isManualRate = (location: Pick<Location, 'tax_rate_source'>): boolean => location.tax_rate_source === 'manual';

/** Where the rate came from, in the merchant's words. */
export const taxSourceLabel = (location: Pick<Location, 'tax_rate_source' | 'sales_tax_rate'>): string => {
  const source = location.tax_rate_source ?? '';
  if (location.sales_tax_rate == null || location.sales_tax_rate === '') return 'Not set';
  if (source === 'manual') return 'Set by you';
  // Copied from the company (seeded from its state), or the state base table.
  if (!source || source.startsWith('seeded') || source.startsWith('state')) return 'State base rate';
  // A tax provider looked the address up (stripe_tax and any later provider).
  return 'Automatic';
};

/** "7%", or "Not set" when the store has no rate. */
export const taxRateLabel = (location: Pick<Location, 'sales_tax_rate'>): string => {
  const percent = fractionToPercent(location.sales_tax_rate);
  return percent === '' ? 'Not set' : `${percent}%`;
};

/**
 * What the field holds when editing starts. A hand-set rate starts from
 * itself; anything else starts from the state base rate, since the usual
 * reason to edit is adding the local surtax on top of it.
 */
export const editStartPercent = (location: Pick<Location, 'tax_rate_source' | 'sales_tax_rate' | 'state_base_rate'>): string => {
  if (isManualRate(location)) return fractionToPercent(location.sales_tax_rate);
  return fractionToPercent(location.state_base_rate ?? location.sales_tax_rate);
};

export type TaxPercentCheck = { fraction: string; error: null } | { fraction: null; error: string };

/** The fraction to send for what was typed, or why it cannot be sent. */
export const checkTaxPercent = (input: string): TaxPercentCheck => {
  const trimmed = input.trim();
  if (trimmed === '') return { fraction: null, error: 'Enter a rate.' };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { fraction: null, error: 'Enter a number, like 7.25.' };
  if (value < 0 || value > MAX_TAX_PERCENT) return { fraction: null, error: `Use a rate from 0 to ${MAX_TAX_PERCENT}%.` };
  // The column keeps four decimals of the fraction, so two of the percent.
  // Refuse a third rather than round what the store collects.
  const decimals = trimmed.includes('.') ? trimmed.split('.')[1].length : 0;
  if (decimals > 2) return { fraction: null, error: 'Use at most two decimal places.' };
  return { fraction: percentToFraction(trimmed), error: null };
};

/**
 * One line for the top of Settings when any store's rate needs attention: the
 * first store's notice, plus how many more have one. Null when none do.
 */
export const taxNoticeLine = (locations: Pick<Location, 'tax_rate_notice' | 'is_active'>[]): string | null => {
  const notices = locations
    .filter((location) => location.is_active !== false)
    .map((location) => (location.tax_rate_notice ?? '').trim())
    .filter(Boolean);
  if (!notices.length) return null;
  if (notices.length === 1) return notices[0];
  const more = notices.length - 1;
  return `${notices[0].replace(/\.+$/, '')} (and ${more} more ${more === 1 ? 'store' : 'stores'}).`;
};
