import type { Role } from 'store/slices/auth';
import { isKioskSessionActive, type EffectiveRoleState } from 'store/selectors/effectiveRole';

/**
 * Request-side kiosk rules, kept free of axios so they can be unit-tested.
 * utils/axios.ts applies them in its interceptors.
 */

/** The X-Role-ID to send while a kiosk session is active (the kiosk employee's own role), else null. */
export function kioskRoleIdHeader(state: EffectiveRoleState): string | null {
  return isKioskSessionActive(state) ? state.kiosk.role!.id : null;
}

/** A 401 the backend sends when X-Kiosk-Token no longer resolves (K2). Never an owner-session problem. */
export function isKioskSessionExpiredError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { code?: unknown } } })?.response;
  return response?.status === 401 && response?.data?.code === 'kiosk_session_expired';
}

/** The stores a role is granted: null for "all", else the list of Location id strings. */
export function grantedLocationIds(role: Pick<Role, 'location_access'> | null | undefined): string[] | null {
  const access = role?.location_access;
  if (access === undefined || access === null || access === 'all') return null;
  return Array.isArray(access) ? access.map(String) : [];
}

/**
 * The store a kiosk request may scope to. With K2 the backend judges
 * X-Location-Id against the kiosk role's grant and answers 404 for any other
 * store, so a selection the owner made ("All", or a store this employee is
 * not granted) is moved to the first granted store. "all" grants keep the
 * selection as it is.
 */
export function scopeLocationForRole(
  selected: string | null | undefined,
  role: Pick<Role, 'location_access'> | null | undefined
): string | null {
  const granted = grantedLocationIds(role);
  if (granted === null) return selected ?? null;
  if (selected && granted.includes(String(selected))) return String(selected);
  return granted[0] ?? null;
}

/** Filter a store list down to the ones a role may pick. */
export function storesForRole<T extends { id: string | number }>(stores: T[], role: Pick<Role, 'location_access'> | null | undefined): T[] {
  const granted = grantedLocationIds(role);
  return granted === null ? stores : stores.filter((s) => granted.includes(String(s.id)));
}
