// utils/route-guard/subscriptionBypass.ts
//
// A LOCAL-ONLY escape hatch for the subscription gate.
//
// Why it exists: `GET /subscription/status/` reads the status LIVE from Stripe on
// every protected route, so a dead or missing Stripe test key makes the app
// unreachable — the check throws, AuthGuard sends you to /paymentplan, and the
// "Start free trial" button calls Stripe with the same dead key. There is no way
// through the front door, and no database edit helps: the subscription_* columns
// on User are written BY Stripe webhooks and never read by the gate.
//
// This is a developer convenience, not a feature. It is deliberately governed by
// THREE independent conditions, so no single mistake can turn it on anywhere that
// matters:
//
//   1. `import.meta.env.DEV` — true only under `vite dev`. A production BUILD can
//      never satisfy this, whatever the environment says, because Vite inlines it
//      as a literal `false` at build time and the branch is then dead code that
//      minification drops entirely.
//   2. The page must be served from localhost / 127.0.0.1 / ::1.
//   3. `VITE_BYPASS_SUBSCRIPTION` must be exactly the string 'true'.
//
// Requiring all three means a leaked .env alone does nothing, and a bundle built
// with the flag set does nothing either.

/** Hostnames that count as "this developer's machine". */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '']);

export interface BypassInputs {
  /** import.meta.env.DEV — the Vite dev server, not a production build. */
  isDev: boolean;
  /** window.location.hostname. */
  hostname: string;
  /** The raw VITE_BYPASS_SUBSCRIPTION value, whatever type it arrives as. */
  flag: unknown;
}

export const isLocalHostname = (hostname: string): boolean => {
  const host = (hostname || '').trim().toLowerCase();
  if (LOCAL_HOSTS.has(host)) return true;
  // A bracketed IPv6 loopback, as window.location.hostname can report it.
  if (host === '[::1]') return true;
  // *.localhost is reserved for loopback (RFC 6761), which some dev setups use.
  return host.endsWith('.localhost');
};

/**
 * Whether the subscription gate should be skipped.
 *
 * Pure and exported so the three-condition rule is testable — a guard nobody can
 * falsify is one refactor away from being "simplified" into a single flag check.
 */
export const shouldBypassSubscriptionGate = ({ isDev, hostname, flag }: BypassInputs): boolean => {
  if (!isDev) return false;
  if (!isLocalHostname(hostname)) return false;
  // Exact string match: 'false', '0', '' and any accidental truthy object must
  // all read as OFF. Only the literal 'true' enables it.
  return flag === 'true';
};

/** The live reading, for the guard to call. Kept separate so the logic above stays pure. */
export const subscriptionGateBypassed = (): boolean =>
  shouldBypassSubscriptionGate({
    isDev: import.meta.env.DEV,
    hostname: typeof window === 'undefined' ? '' : window.location.hostname,
    flag: import.meta.env.VITE_BYPASS_SUBSCRIPTION
  });

/** Shown in the console when the bypass is active, so it can never be silently on. */
export const BYPASS_NOTICE =
  '[dev] Subscription gate bypassed via VITE_BYPASS_SUBSCRIPTION. ' +
  'This is local-only (vite dev + localhost) and has no effect in a production build.';
