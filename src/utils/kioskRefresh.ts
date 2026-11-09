/** At most one kiosk role refresh per this many ms. */
export const KIOSK_ROLE_REFRESH_MS = 60_000;

export const shouldRefreshKioskRole = (lastAt: number, now: number): boolean => now - lastAt >= KIOSK_ROLE_REFRESH_MS;
