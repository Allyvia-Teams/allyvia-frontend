import { describe, expect, it } from 'vitest';
import type { Role } from 'store/slices/auth';
import { grantedLocationIds, isKioskSessionExpiredError, kioskRoleIdHeader, scopeLocationForRole, storesForRole } from './kioskRequest';

const owner: Role = { id: 'r-owner', company_id: 'c1', company_name: 'Shop', role_type: 'owner', role_display: 'Owner' };
const member: Role = { ...owner, id: 'r-member', role_type: 'member', role_display: 'Member', location_access: ['loc-a', 'loc-b'] };

describe('kioskRoleIdHeader', () => {
  it('is the kiosk role id while unlocked, never the owner', () => {
    expect(kioskRoleIdHeader({ auth: { currentRole: owner }, kiosk: { isAuthenticated: true, role: member } })).toBe('r-member');
  });
  it('is null when no kiosk session is active', () => {
    expect(kioskRoleIdHeader({ auth: { currentRole: owner }, kiosk: { isAuthenticated: false, role: null } })).toBeNull();
  });
});

describe('isKioskSessionExpiredError', () => {
  it('matches the K2 401 only', () => {
    expect(isKioskSessionExpiredError({ response: { status: 401, data: { code: 'kiosk_session_expired' } } })).toBe(true);
    expect(isKioskSessionExpiredError({ response: { status: 401, data: { detail: 'Token expired' } } })).toBe(false);
    expect(isKioskSessionExpiredError({ response: { status: 403, data: { code: 'kiosk_session_expired' } } })).toBe(false);
    expect(isKioskSessionExpiredError(new Error('network'))).toBe(false);
  });
});

describe('store scope for a kiosk role', () => {
  it('reads "all" and missing grants as every store', () => {
    expect(grantedLocationIds({ location_access: 'all' })).toBeNull();
    expect(grantedLocationIds({})).toBeNull();
    expect(grantedLocationIds({ location_access: ['x'] })).toEqual(['x']);
  });

  it('keeps a granted selection', () => {
    expect(scopeLocationForRole('loc-b', member)).toBe('loc-b');
  });

  it('moves the owner\'s "All" or an ungranted store to the first granted store', () => {
    expect(scopeLocationForRole(null, member)).toBe('loc-a');
    expect(scopeLocationForRole('loc-z', member)).toBe('loc-a');
  });

  it('leaves the selection alone for an "all" grant', () => {
    expect(scopeLocationForRole(null, owner)).toBeNull();
    expect(scopeLocationForRole('loc-z', { location_access: 'all' })).toBe('loc-z');
  });

  it('lists only granted stores', () => {
    const stores = [{ id: 'loc-a' }, { id: 'loc-b' }, { id: 'loc-z' }];
    expect(storesForRole(stores, member).map((s) => s.id)).toEqual(['loc-a', 'loc-b']);
    expect(storesForRole(stores, owner)).toHaveLength(3);
  });
});
