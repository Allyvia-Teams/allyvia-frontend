/** At most one refresh of the signed-in account's roles per this many ms. */
export const ROLE_REFRESH_MS = 60_000;

/**
 * Whether GET /role/ may run now: only for a signed-in account, at most once a
 * minute, and never while a kiosk token is on the device. Every request then
 * carries X-Kiosk-Token, which the backend judges as the kiosk EMPLOYEE (K2),
 * so /role/ would answer with the employee's roles and the reducer would
 * replace the owner's with them. The kiosk role has its own refresh
 * (useKioskRoleRefresh).
 */
export const shouldRefreshRoles = (input: { lastAt: number; now: number; isLoggedIn: boolean; kioskToken: string | null | undefined }) =>
  input.isLoggedIn && !input.kioskToken && input.now - input.lastAt >= ROLE_REFRESH_MS;
