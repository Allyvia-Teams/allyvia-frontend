import { describe, expect, it } from 'vitest';
import { isSubscriptionDeadEnd } from './subscriptionDeadEnd';

describe('isSubscriptionDeadEnd', () => {
  it('is a dead end when the subscription gate sent us to /paymentplan and the member guard refuses it', () => {
    expect(isSubscriptionDeadEnd({ pathname: '/paymentplan', redirect: '/kiosk/login', fromSubscriptionGate: true })).toBe(true);
    expect(isSubscriptionDeadEnd({ pathname: '/paymentplan', redirect: '/kiosk/clock', fromSubscriptionGate: true })).toBe(true);
  });

  it('redirects normally when /paymentplan was typed, not reached through the gate', () => {
    // The PIN screen is then reachable: the subscription is active.
    expect(isSubscriptionDeadEnd({ pathname: '/paymentplan', redirect: '/kiosk/login', fromSubscriptionGate: false })).toBe(false);
  });

  it('is never a dead end when the member guard lets the page through', () => {
    expect(isSubscriptionDeadEnd({ pathname: '/paymentplan', redirect: null, fromSubscriptionGate: true })).toBe(false);
  });

  it('only applies to /paymentplan', () => {
    expect(isSubscriptionDeadEnd({ pathname: '/checkout/success', redirect: '/kiosk/login', fromSubscriptionGate: true })).toBe(false);
  });
});
