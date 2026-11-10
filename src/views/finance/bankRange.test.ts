import { describe, expect, it } from 'vitest';

import { defaultBankRange } from './bankRange';

describe('defaultBankRange', () => {
  it('keeps month-to-date for Plaid and older servers', () => {
    expect(defaultBankRange('2026-11-10', '2026-09-01', 'plaid')).toEqual({ start: '2026-11-01', end: '2026-11-10' });
    expect(defaultBankRange('2026-11-10', '2026-09-01', undefined)).toEqual({ start: '2026-11-01', end: '2026-11-10' });
  });

  it('keeps month-to-date when Stripe activity is already this month', () => {
    expect(defaultBankRange('2026-11-10', '2026-11-08', 'stripe')).toEqual({ start: '2026-11-01', end: '2026-11-10' });
  });

  it('opens on the 30 days ending at the newest Stripe activity otherwise', () => {
    expect(defaultBankRange('2026-11-10', '2026-10-20', 'stripe')).toEqual({ start: '2026-09-21', end: '2026-10-20' });
  });

  it('falls back to month-to-date with no Stripe activity yet', () => {
    expect(defaultBankRange('2026-11-10', null, 'stripe')).toEqual({ start: '2026-11-01', end: '2026-11-10' });
  });
});
