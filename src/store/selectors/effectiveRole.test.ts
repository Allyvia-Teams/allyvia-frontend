import { describe, expect, it } from 'vitest';
import type { Role } from 'store/slices/auth';
import { isKioskSessionActive, selectEffectiveModulePermissions, selectEffectiveRole, selectEffectiveRoleType } from './effectiveRole';

const owner: Role = { id: 'r-owner', company_id: 'c1', company_name: 'Shop', role_type: 'owner', role_display: 'Owner' };
const member: Role = {
  id: 'r-member',
  company_id: 'c1',
  company_name: 'Shop',
  role_type: 'member',
  role_display: 'Member',
  module_permissions: { crm: true },
  location_access: ['loc-a']
};

const state = (kiosk: { isAuthenticated: boolean; role: Role | null }, currentRole: Role | null = owner) => ({
  auth: { currentRole },
  kiosk
});

describe('selectEffectiveRole', () => {
  it('is the kiosk role while a kiosk session is active', () => {
    const s = state({ isAuthenticated: true, role: member });
    expect(isKioskSessionActive(s)).toBe(true);
    expect(selectEffectiveRole(s)).toBe(member);
    expect(selectEffectiveRoleType(s)).toBe('member');
    expect(selectEffectiveModulePermissions(s)).toEqual({ crm: true });
  });

  it('is the signed-in role when no kiosk session is active', () => {
    const s = state({ isAuthenticated: false, role: null });
    expect(isKioskSessionActive(s)).toBe(false);
    expect(selectEffectiveRole(s)).toBe(owner);
    expect(selectEffectiveRoleType(s)).toBe('owner');
    expect(selectEffectiveModulePermissions(s)).toBeUndefined();
  });

  it('never uses a kiosk role that is not authenticated', () => {
    expect(selectEffectiveRole(state({ isAuthenticated: false, role: member }))).toBe(owner);
  });

  it('falls back to the signed-in role when an authenticated kiosk has no role', () => {
    expect(selectEffectiveRole(state({ isAuthenticated: true, role: null }))).toBe(owner);
  });

  it('is null with nobody signed in', () => {
    expect(selectEffectiveRole(state({ isAuthenticated: false, role: null }, null))).toBeNull();
  });
});
