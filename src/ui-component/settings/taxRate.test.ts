import { describe, expect, it } from 'vitest';

import { fractionToPercent, percentToFraction } from './taxRate';

describe('sales tax rate conversion (ALL-96)', () => {
  it('shows Indiana 7% as "7"', () => {
    expect(fractionToPercent('0.0700')).toBe('7');
  });

  it('shows the legacy 8% as "8"', () => {
    expect(fractionToPercent('0.0800')).toBe('8');
  });

  it('keeps a quarter-point surtax rate intact in both directions', () => {
    // California's 7.25% is the case that a two-decimal column would round to
    // 7% and quietly under-collect.
    expect(fractionToPercent('0.0725')).toBe('7.25');
    expect(percentToFraction('7.25')).toBe('0.0725');
  });

  it('sends 7 as the fraction the checkout multiplies by', () => {
    expect(percentToFraction('7')).toBe('0.0700');
  });

  it('round-trips without drift', () => {
    ['0.0000', '0.0450', '0.0700', '0.0725', '0.1025'].forEach((fraction) => {
      expect(percentToFraction(fractionToPercent(fraction))).toBe(fraction);
    });
  });

  it('treats a zero rate as a real rate, not as absent', () => {
    // Five states levy no sales tax; "0" must survive the trip.
    expect(fractionToPercent('0.0000')).toBe('0');
    expect(percentToFraction('0')).toBe('0.0000');
  });

  it('returns empty rather than NaN for junk, so the form sends nothing', () => {
    expect(percentToFraction('seven')).toBe('');
    expect(percentToFraction('')).toBe('');
    expect(fractionToPercent(null)).toBe('');
    expect(fractionToPercent(undefined)).toBe('');
    expect(fractionToPercent('')).toBe('');
  });
});
