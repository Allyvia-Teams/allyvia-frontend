import { beforeEach, describe, expect, it, vi } from 'vitest';

// utils/axios cannot load under vitest's node environment (see auth.logout.test.ts).
const get = vi.fn();
vi.mock('utils/axios', () => ({
  default: { get: (...args: unknown[]) => get(...args), post: vi.fn(), defaults: { headers: { common: {} } } }
}));
vi.mock('utils/authStorage', () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
  clearAllAuthStorage: vi.fn(),
  setRoleId: vi.fn(),
  clearRoleId: vi.fn()
}));

import reducer, { refreshRoles, type Role } from './auth';

const role = (id: string, module_permissions: Record<string, boolean>): Role =>
  ({ id, company_id: 'c1', company_name: 'Shop', role_type: 'member', role_display: 'Member', module_permissions }) as Role;

type AuthState = ReturnType<typeof reducer>;
const signedIn = (currentRole: Role, roles: Role[]): AuthState =>
  ({ ...reducer(undefined, { type: 'init' }), isLoggedIn: true, isLoading: false, error: null, currentRole, roles }) as AuthState;

beforeEach(() => get.mockReset());

describe('refreshRoles.fulfilled', () => {
  it('replaces auth.roles and re-points currentRole at the refreshed object with the same id', () => {
    const stale = role('r1', { crm: false });
    const fresh = role('r1', { crm: true });
    const other = role('r2', {});

    const next = reducer(signedIn(stale, [stale]), refreshRoles.fulfilled([other, fresh], 'req'));

    expect(next.roles).toEqual([other, fresh]);
    expect(next.currentRole).toEqual(fresh);
    expect(next.currentRole?.module_permissions).toEqual({ crm: true });
  });

  it('leaves isLoading and error alone: it runs in the background on window focus', () => {
    const r = role('r1', {});
    const start = signedIn(r, [r]);
    const pending = reducer(start, refreshRoles.pending('req'));
    expect(pending.isLoading).toBe(false);
    const rejected = reducer(start, refreshRoles.rejected(new Error('offline'), 'req', undefined, 'offline'));
    expect(rejected.error).toBeNull();
    expect(rejected.currentRole).toBe(start.currentRole);
  });
});

describe('refreshRoles thunk', () => {
  it('fetches /role/ when no kiosk token is on the device', async () => {
    get.mockResolvedValue({ data: [role('r1', {})] });
    const dispatch = vi.fn();
    await refreshRoles()(dispatch, () => ({ kiosk: { token: null } }), undefined);
    expect(get).toHaveBeenCalledWith('/role/');
  });

  it('does not run while a kiosk token is on the device (the backend would answer as the kiosk employee)', async () => {
    const dispatch = vi.fn();
    await refreshRoles()(dispatch, () => ({ kiosk: { token: 'kiosk-token' } }), undefined);
    expect(get).not.toHaveBeenCalled();
  });
});
