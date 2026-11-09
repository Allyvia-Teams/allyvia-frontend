import type { Role } from 'store/slices/auth';
import type { ModulePermissions } from 'types/settings';

/**
 * The Role the app acts as.
 *
 * On a store kiosk the owner's web session stays signed in, so
 * `auth.currentRole` is the OWNER. While an employee has the kiosk unlocked,
 * every access or visibility decision must use the employee's own Role
 * instead -- the same Role the backend judges the request by (K2). Read
 * `auth.currentRole` directly only for things about the signed-in account
 * itself (company switcher, profile, billing).
 *
 * Typed structurally so pure helpers and tests can use it without the store.
 */
export type EffectiveRoleState = {
  auth: { currentRole: Role | null };
  kiosk: { isAuthenticated: boolean; role: Role | null };
};

export const isKioskSessionActive = (state: EffectiveRoleState): boolean => !!(state.kiosk?.isAuthenticated && state.kiosk.role);

export const selectEffectiveRole = (state: EffectiveRoleState): Role | null =>
  isKioskSessionActive(state) ? state.kiosk.role : (state.auth?.currentRole ?? null);

export const selectEffectiveRoleType = (state: EffectiveRoleState): Role['role_type'] | undefined => selectEffectiveRole(state)?.role_type;

export const selectEffectiveModulePermissions = (state: EffectiveRoleState): ModulePermissions | undefined =>
  selectEffectiveRole(state)?.module_permissions as ModulePermissions | undefined;
