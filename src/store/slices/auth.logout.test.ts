import { beforeEach, describe, expect, it, vi } from 'vitest';

// utils/axios pulls in utils/mockApi.ts, which reads localStorage at module
// load, so it cannot be imported under vitest's node environment. Same factory
// mock as api/agent.api.test.ts — it is what lets the transport call itself be
// asserted rather than only the surrounding reducer.
const post = vi.fn();

vi.mock('utils/axios', () => ({
  default: {
    post: (...args: unknown[]) => post(...args),
    defaults: { headers: { common: {} } }
  }
}));

const getRefreshToken = vi.fn();
const clearAllAuthStorage = vi.fn();

vi.mock('utils/authStorage', () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: () => getRefreshToken(),
  setTokens: vi.fn(),
  clearAllAuthStorage: () => clearAllAuthStorage(),
  setRoleId: vi.fn(),
  clearRoleId: vi.fn()
}));

import { clearKioskSession } from 'store/kioskSlice';
import { logoutAsync } from './auth';

beforeEach(() => {
  post.mockReset();
  getRefreshToken.mockReset();
  clearAllAuthStorage.mockReset();
  post.mockResolvedValue({ status: 204 });
});

/**
 * ALL-37. The backend blacklists the refresh token on logout, taking it from
 * the request body or a `refresh` cookie. This client keeps both tokens in
 * localStorage, so there is no cookie — posting an empty body meant logout
 * revoked nothing and the refresh token stayed valid for its full lifetime.
 */
describe('logoutAsync', () => {
  it('sends the refresh token so the server can revoke it', async () => {
    getRefreshToken.mockReturnValue('the-refresh-token');

    await logoutAsync()(vi.fn(), vi.fn(), undefined);

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/auth/logout/');
    expect(body).toEqual({ refresh: 'the-refresh-token' });
  });

  it('still posts when there is no stored token', async () => {
    getRefreshToken.mockReturnValue(null);

    await logoutAsync()(vi.fn(), vi.fn(), undefined);

    expect(post.mock.calls[0][0]).toBe('/auth/logout/');
    expect(post.mock.calls[0][1]).toEqual({});
  });

  it('clears local state even when the revocation call fails', async () => {
    getRefreshToken.mockReturnValue('the-refresh-token');
    post.mockRejectedValue(new Error('offline'));

    await logoutAsync()(vi.fn(), vi.fn(), undefined);

    expect(clearAllAuthStorage).toHaveBeenCalled();
  });
});

/**
 * Logout must end an unlocked kiosk session too: the session lives in Redux
 * and in localStorage, and either one surviving lets the next person on this
 * browser skip the PIN.
 */
describe('logoutAsync ends the kiosk session', () => {
  it('dispatches clearKioskSession', async () => {
    getRefreshToken.mockReturnValue(null);
    const dispatch = vi.fn();

    await logoutAsync()(dispatch, vi.fn(), undefined);

    expect(dispatch).toHaveBeenCalledWith(clearKioskSession());
  });

  it('dispatches clearKioskSession even when the revocation call fails', async () => {
    post.mockRejectedValue(new Error('offline'));
    const dispatch = vi.fn();

    await logoutAsync()(dispatch, vi.fn(), undefined);

    expect(dispatch).toHaveBeenCalledWith(clearKioskSession());
  });

  it('clearAllAuthStorage removes the stored kiosk session and kiosk device flag', async () => {
    const data = new Map<string, string>([
      ['access', 'a'],
      ['kioskSession', JSON.stringify({ token: 't', role: { id: 'r', role_type: 'member' } })],
      ['kioskDevice', '1'],
      ['kioskNameOverrides', '{}']
    ]);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k)
    });
    try {
      const actual = await vi.importActual<typeof import('utils/authStorage')>('utils/authStorage');
      actual.clearAllAuthStorage();
      expect(data.has('kioskSession')).toBe(false);
      expect(data.has('kioskDevice')).toBe(false);
      expect(data.has('access')).toBe(false);
      // Display-name overrides are not a session; they stay.
      expect(data.has('kioskNameOverrides')).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
