/**
 * When the company's subscription is not active, AuthGuard sends every route
 * (the kiosk PIN screen included) to /paymentplan, marked fromSubscriptionGate.
 * If the member guard then refuses /paymentplan -- a locked kiosk, a member's
 * own web login, an unlocked member kiosk session -- every place it could
 * redirect to is gated again, and the two guards would bounce forever. That is
 * a dead end: show a notice instead of redirecting.
 */
export const PAYMENT_PLAN_PATH = '/paymentplan';

export function isSubscriptionDeadEnd(input: { pathname: string; redirect: string | null; fromSubscriptionGate: boolean }): boolean {
  return !!input.redirect && input.fromSubscriptionGate && input.pathname === PAYMENT_PLAN_PATH;
}
