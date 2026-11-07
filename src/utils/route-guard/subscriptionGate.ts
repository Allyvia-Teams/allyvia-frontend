/**
 * What the AuthGuard renders while it knows (or does not know) whether the
 * current role may use the app.
 *
 * The guard re-checks the subscription on every navigation. It used to render
 * the full-screen Loader for the length of EVERY re-check, which unmounted the
 * whole shell (sidebar, header, page) and mounted it again when the answer came
 * back — so every tab change rendered the page twice and every on-mount fetch
 * fired twice (measured in U10: Dashboard 34 requests, each one doubled; the
 * sidebar <nav> removed and re-added on a single click).
 *
 * The rule now: the Loader shows only while access for the CURRENT role is
 * unknown (first load, after logout, after switching role). A re-check of a
 * role already known to be allowed runs in the background with the app still
 * mounted; if it comes back "not allowed" the guard still redirects to the
 * payment plan, so the gate itself is unchanged.
 *
 * The answer is remembered per role because the backend resolves the
 * subscription through the role's company: a role switch must never inherit
 * the previous company's "allowed".
 */

export interface RememberedAccess {
  /** The role the answer was given for. */
  roleKey: string;
  allowed: boolean;
}

export type GateView = 'children' | 'loader' | 'paymentplan';

/** The remembered answer if it belongs to this role, else unknown (null). */
export function accessForRole(remembered: RememberedAccess | null, roleKey: string): boolean | null {
  if (!remembered || remembered.roleKey !== roleKey) return null;
  return remembered.allowed;
}

export function subscriptionGateView(input: {
  isSubscriptionRoute: boolean;
  remembered: RememberedAccess | null;
  roleKey: string;
}): GateView {
  if (input.isSubscriptionRoute) return 'children';
  const allowed = accessForRole(input.remembered, input.roleKey);
  if (allowed === null) return 'loader';
  return allowed ? 'children' : 'paymentplan';
}
