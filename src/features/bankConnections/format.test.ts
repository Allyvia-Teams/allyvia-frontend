import { describe, expect, it } from 'vitest';

import { accountLabel, minorToMoney, monthLabel } from './format';
import { publishableKey } from './stripeJs';

describe('bank connection formatting', () => {
  it('converts Stripe minor units, keeping the sign', () => {
    expect(minorToMoney(-1250, 'usd')).toBe('-$12.50');
    expect(minorToMoney(125000, 'usd')).toBe('$1,250.00');
    expect(minorToMoney(null, 'usd')).toBe('—');
  });

  it('labels months and accounts', () => {
    expect(monthLabel('2026-10')).toBe('Oct 2026');
    expect(accountLabel({ display_name: 'Checking', subcategory: 'checking', last4: '6789' })).toBe('Checking ••6789');
    expect(accountLabel({ display_name: '', subcategory: 'credit_card', last4: '' })).toBe('credit_card');
  });

  it('reads the publishable key from the env', () => {
    expect(publishableKey({ VITE_STRIPE_PUBLISHABLE_KEY: ' pk_test_x ' } as any)).toBe('pk_test_x');
    expect(publishableKey({} as any)).toBe('');
  });
});
