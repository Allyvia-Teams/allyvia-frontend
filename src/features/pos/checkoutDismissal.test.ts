import { describe, it, expect } from 'vitest';
import { shouldBlockDismissal, CHECKOUT_SUCCESS_STEP } from './checkoutDismissal';

const summaryStep = { isPending: false, step: 0 };
const paymentStep = { isPending: false, step: 1 };
const successStep = { isPending: false, step: CHECKOUT_SUCCESS_STEP };
const submitting = { isPending: true, step: 1 };

describe('shouldBlockDismissal', () => {
  it('blocks backdrop and Escape on the success step', () => {
    // The bug: dismissing here left the completed sale's cart loaded, so the
    // next customer was charged for it too.
    expect(shouldBlockDismissal('backdropClick', successStep)).toBe(true);
    expect(shouldBlockDismissal('escapeKeyDown', successStep)).toBe(true);
  });

  it('blocks backdrop and Escape while a checkout is in flight', () => {
    expect(shouldBlockDismissal('backdropClick', submitting)).toBe(true);
    expect(shouldBlockDismissal('escapeKeyDown', submitting)).toBe(true);
  });

  it('allows dismissal before anything has been charged', () => {
    expect(shouldBlockDismissal('backdropClick', summaryStep)).toBe(false);
    expect(shouldBlockDismissal('escapeKeyDown', summaryStep)).toBe(false);
    expect(shouldBlockDismissal('backdropClick', paymentStep)).toBe(false);
  });

  it('never blocks an explicit exit, whatever the state', () => {
    // Cancel and "New Order" must always work — New Order is the only way off
    // the success step, and it clears the cart.
    for (const state of [summaryStep, paymentStep, successStep, submitting]) {
      expect(shouldBlockDismissal('closeButton', state)).toBe(false);
    }
  });

  it('blocks a pending submit even on the success step', () => {
    expect(shouldBlockDismissal('escapeKeyDown', { isPending: true, step: CHECKOUT_SUCCESS_STEP })).toBe(true);
  });
});
