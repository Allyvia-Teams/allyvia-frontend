import { describe, expect, it } from 'vitest';
import { accessForRole, subscriptionGateView } from './subscriptionGate';

const allowedFor = (roleKey: string) => ({ roleKey, allowed: true });

describe('subscriptionGateView', () => {
  it('shows the Loader while nothing is known yet (first load)', () => {
    expect(subscriptionGateView({ isSubscriptionRoute: false, remembered: null, roleKey: 'r1' })).toBe('loader');
  });

  // The U10 defect: a re-check after navigation must NOT tear the app down.
  // The guard no longer even tells the seam that a check is running, so a
  // known-allowed role renders its children whatever the check is doing.
  it('keeps the app mounted while a known-allowed role is re-checked', () => {
    expect(subscriptionGateView({ isSubscriptionRoute: false, remembered: allowedFor('r1'), roleKey: 'r1' })).toBe('children');
  });

  it('redirects to the payment plan once the role is known not to be allowed', () => {
    expect(subscriptionGateView({ isSubscriptionRoute: false, remembered: { roleKey: 'r1', allowed: false }, roleKey: 'r1' })).toBe(
      'paymentplan'
    );
  });

  it('never carries an "allowed" over to a different role (another company)', () => {
    expect(subscriptionGateView({ isSubscriptionRoute: false, remembered: allowedFor('r1'), roleKey: 'r2' })).toBe('loader');
  });

  it('does not carry a refusal over to a different role either', () => {
    expect(subscriptionGateView({ isSubscriptionRoute: false, remembered: { roleKey: 'r1', allowed: false }, roleKey: 'r2' })).toBe(
      'loader'
    );
  });

  it('never gates the subscription routes themselves', () => {
    expect(subscriptionGateView({ isSubscriptionRoute: true, remembered: null, roleKey: 'r1' })).toBe('children');
    expect(subscriptionGateView({ isSubscriptionRoute: true, remembered: { roleKey: 'r1', allowed: false }, roleKey: 'r1' })).toBe(
      'children'
    );
  });
});

describe('accessForRole', () => {
  it('is unknown with no answer, the answer for the same role, unknown for another', () => {
    expect(accessForRole(null, 'r1')).toBeNull();
    expect(accessForRole(allowedFor('r1'), 'r1')).toBe(true);
    expect(accessForRole(allowedFor('r1'), 'r2')).toBeNull();
  });
});
