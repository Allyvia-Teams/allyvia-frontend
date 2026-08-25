// When a click outside the checkout dialog, or Escape, may dismiss it.
//
// MUI's default `onClose` fires for both gestures, and the handler only closed
// the dialog — it did not clear the cart, which only "New Order" does. So a
// clerk who tapped outside after a completed sale was left with the previous
// customer's six items and "Charge $184.00" on screen; the next customer's
// item went on top and they were charged for both (ALL-102). Mid-submit the
// same dismissal hid an in-flight order: the clerk sees nothing, assumes it
// failed, and charges again.
//
// Extracted as a pure function so the rule is testable — this repo's suite is
// logic-level and carries no DOM environment.

/** The `reason` values MUI passes to a Dialog's `onClose`. */
export type DialogCloseReason = 'backdropClick' | 'escapeKeyDown' | 'closeButton' | string;

/** Step index of the post-payment success screen. */
export const CHECKOUT_SUCCESS_STEP = 2;

export type CheckoutDismissalState = {
  /** A checkout request is in flight. */
  isPending: boolean;
  /** Current stepper index. */
  step: number;
};

/**
 * True when a casual dismissal (backdrop / Escape) must be ignored.
 *
 * Explicit exits — the Cancel button, "New Order" — pass a different reason
 * (or call onClose directly) and are never blocked, so the dialog can always
 * be left deliberately.
 */
export function shouldBlockDismissal(reason: DialogCloseReason, state: CheckoutDismissalState): boolean {
  const isCasual = reason === 'backdropClick' || reason === 'escapeKeyDown';
  if (!isCasual) return false;
  return state.isPending || state.step === CHECKOUT_SUCCESS_STEP;
}
