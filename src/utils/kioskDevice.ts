/**
 * Kiosk device mode.
 *
 * Entering any /kiosk route marks this browser as the store's shared kiosk.
 * While marked, a locked kiosk (no session) sends every route to the PIN
 * screen, so typing /dashboard cannot reach the owner's signed-in session.
 * Only an admin-or-above unlock can leave the mode (Header → Exit kiosk mode),
 * or a full logout.
 */
export const KIOSK_DEVICE_KEY = 'kioskDevice';

export function isKioskDevice(): boolean {
  try {
    return localStorage.getItem(KIOSK_DEVICE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markKioskDevice(): void {
  try {
    localStorage.setItem(KIOSK_DEVICE_KEY, '1');
  } catch {}
}

export function clearKioskDevice(): void {
  try {
    localStorage.removeItem(KIOSK_DEVICE_KEY);
  } catch {}
}
