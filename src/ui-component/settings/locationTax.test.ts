import { describe, expect, it } from 'vitest';

import { checkTaxPercent, editStartPercent, isManualRate, taxNoticeLine, taxRateLabel, taxSourceLabel } from './locationTax';

describe('a store sales tax source, in words', () => {
  it('names a hand-set rate, a copied or state rate, and a looked-up rate', () => {
    expect(taxSourceLabel({ sales_tax_rate: '0.0725', tax_rate_source: 'manual' })).toBe('Set by you');
    expect(taxSourceLabel({ sales_tax_rate: '0.0700', tax_rate_source: 'seeded_from_company' })).toBe('State base rate');
    expect(taxSourceLabel({ sales_tax_rate: '0.0700', tax_rate_source: '' })).toBe('State base rate');
    expect(taxSourceLabel({ sales_tax_rate: '0.1025', tax_rate_source: 'stripe_tax' })).toBe('Automatic');
    expect(taxSourceLabel({ sales_tax_rate: null, tax_rate_source: '' })).toBe('Not set');
  });

  it('shows the rate as a percent', () => {
    expect(taxRateLabel({ sales_tax_rate: '0.0725' })).toBe('7.25%');
    expect(taxRateLabel({ sales_tax_rate: '0.0000' })).toBe('0%');
    expect(taxRateLabel({ sales_tax_rate: null })).toBe('Not set');
  });
});

describe('where editing starts', () => {
  it('starts a non-manual rate from the state base rate', () => {
    expect(editStartPercent({ sales_tax_rate: '0.0700', tax_rate_source: 'seeded_from_company', state_base_rate: '0.0625' })).toBe('6.25');
    // No base rate known: fall back to the current rate.
    expect(editStartPercent({ sales_tax_rate: '0.0700', tax_rate_source: 'stripe_tax', state_base_rate: null })).toBe('7');
  });

  it('starts a hand-set rate from itself', () => {
    expect(editStartPercent({ sales_tax_rate: '0.1025', tax_rate_source: 'manual', state_base_rate: '0.0625' })).toBe('10.25');
    expect(isManualRate({ tax_rate_source: 'manual' })).toBe(true);
    expect(isManualRate({ tax_rate_source: 'stripe_tax' })).toBe(false);
  });
});

describe('checking a typed rate', () => {
  it('converts a percent to the fraction the PATCH takes', () => {
    expect(checkTaxPercent('7.25')).toEqual({ fraction: '0.0725', error: null });
    expect(checkTaxPercent(' 10.25 ')).toEqual({ fraction: '0.1025', error: null });
    expect(checkTaxPercent('0')).toEqual({ fraction: '0.0000', error: null });
    expect(checkTaxPercent('25')).toEqual({ fraction: '0.2500', error: null });
  });

  it('refuses empty, junk, out of range and a third decimal place', () => {
    expect(checkTaxPercent('').error).toBe('Enter a rate.');
    expect(checkTaxPercent('seven').error).toBe('Enter a number, like 7.25.');
    expect(checkTaxPercent('-1').error).toBe('Use a rate from 0 to 25%.');
    expect(checkTaxPercent('25.01').error).toBe('Use a rate from 0 to 25%.');
    // 8.875% would need five decimals of the fraction; the column keeps four.
    expect(checkTaxPercent('8.875').error).toBe('Use at most two decimal places.');
  });
});

describe('the notice line at the top of Settings', () => {
  it('is null when no active store has a notice', () => {
    expect(taxNoticeLine([])).toBeNull();
    expect(taxNoticeLine([{ tax_rate_notice: '', is_active: true }])).toBeNull();
    expect(taxNoticeLine([{ tax_rate_notice: 'Closed store needs a rate.', is_active: false }])).toBeNull();
  });

  it('shows one notice as it is, and the first plus a count for several', () => {
    const one = 'Bloomington charges only the state base rate.';
    expect(taxNoticeLine([{ tax_rate_notice: one, is_active: true }])).toBe(one);
    expect(
      taxNoticeLine([
        { tax_rate_notice: one, is_active: true },
        { tax_rate_notice: 'Uptown charges only the state base rate.', is_active: true },
        { tax_rate_notice: 'Downtown charges only the state base rate.', is_active: true }
      ])
    ).toBe('Bloomington charges only the state base rate (and 2 more stores).');
    expect(
      taxNoticeLine([
        { tax_rate_notice: one, is_active: true },
        { tax_rate_notice: 'Uptown.', is_active: true }
      ])
    ).toBe('Bloomington charges only the state base rate (and 1 more store).');
  });
});
