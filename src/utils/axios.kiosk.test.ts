import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';

// utils/axios pulls in the store (and through it every slice); replace the
// collaborators so the real interceptors run against a plain state object.
const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  dispatch: vi.fn(),
  logoutAsync: vi.fn(() => ({ type: 'auth/logout' })),
  clearTokens: vi.fn(),
  navigate: vi.fn()
}));

vi.mock('store', () => ({ store: { getState: () => mocks.state, dispatch: mocks.dispatch } }));
vi.mock('store/slices/auth', () => ({ logoutAsync: mocks.logoutAsync }));
vi.mock('store/slices/integrations', () => ({ fetchQBConnectionStatus: vi.fn() }));
vi.mock('utils/authStorage', () => ({
  getAccessToken: () => 'owner-jwt',
  getRefreshToken: () => 'owner-refresh',
  clearTokens: mocks.clearTokens,
  setTokens: vi.fn(),
  getRoleId: () => 'r-owner'
}));
vi.mock('routes', () => ({ default: { navigate: mocks.navigate } }));

import axios from 'axios';
import axiosServices from './axios';
import { clearKioskSession } from 'store/kioskSlice';

const owner = { id: 'r-owner', company_id: 'c1', company_name: 'Shop', role_type: 'owner', role_display: 'Owner' };
const member = { ...owner, id: 'r-member', role_type: 'member', role_display: 'Member', location_access: ['loc-a'] };

let seen: InternalAxiosRequestConfig | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  seen = null;
  mocks.state = {
    auth: { currentRole: owner },
    kiosk: { isAuthenticated: true, role: member, token: 'kiosk_tok' },
    integrations: {}
  };
});

afterEach(() => {
  axiosServices.defaults.adapter = undefined;
});

describe('axios while a kiosk session is active', () => {
  it('sends the kiosk role as X-Role-ID, the kiosk token, and a granted store', async () => {
    axiosServices.defaults.adapter = async (config) => {
      seen = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    await axiosServices.get('/buy/plans/', { headers: { 'X-Location-Id': 'loc-z' } });
    expect(seen!.headers['X-Role-ID']).toBe('r-member');
    expect(seen!.headers['X-Kiosk-Token']).toBe('kiosk_tok');
    expect(seen!.headers['X-Location-Id']).toBe('loc-a');
  });

  it('locks the kiosk on 401 kiosk_session_expired and never logs the owner out', async () => {
    const post = vi.spyOn(axios, 'post');
    axiosServices.defaults.adapter = async (config) => {
      const error = Object.assign(new Error('401'), {
        config,
        response: { status: 401, data: { detail: 'Kiosk session expired.', code: 'kiosk_session_expired' }, config, headers: {} }
      });
      throw error;
    };

    await expect(axiosServices.get('/finance/summary/')).rejects.toBeTruthy();

    expect(mocks.dispatch).toHaveBeenCalledWith(clearKioskSession());
    expect(mocks.logoutAsync).not.toHaveBeenCalled();
    expect(mocks.clearTokens).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled(); // no JWT refresh attempt
  });
});

describe('axios without a kiosk session', () => {
  it('sends the signed-in role and no kiosk token', async () => {
    mocks.state = { auth: { currentRole: owner }, kiosk: { isAuthenticated: false, role: null, token: null }, integrations: {} };
    axiosServices.defaults.adapter = async (config) => {
      seen = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    await axiosServices.get('/buy/plans/', { headers: { 'X-Location-Id': 'loc-z' } });
    expect(seen!.headers['X-Role-ID']).toBe('r-owner');
    expect(seen!.headers['X-Kiosk-Token']).toBeUndefined();
    expect(seen!.headers['X-Location-Id']).toBe('loc-z');
  });
});
