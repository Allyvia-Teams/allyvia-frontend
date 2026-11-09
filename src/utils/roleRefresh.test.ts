import { describe, expect, it } from 'vitest';
import { ROLE_REFRESH_MS, shouldRefreshRoles } from './roleRefresh';

const base = { lastAt: 0, now: 1_000_000, isLoggedIn: true, kioskToken: null };

describe('shouldRefreshRoles', () => {
  it('refreshes a signed-in account on the first focus', () => {
    expect(shouldRefreshRoles(base)).toBe(true);
  });

  it('runs at most once per 60 s', () => {
    expect(ROLE_REFRESH_MS).toBe(60_000);
    expect(shouldRefreshRoles({ ...base, lastAt: base.now - 59_999 })).toBe(false);
    expect(shouldRefreshRoles({ ...base, lastAt: base.now - 60_000 })).toBe(true);
  });

  it('does nothing when signed out', () => {
    expect(shouldRefreshRoles({ ...base, isLoggedIn: false })).toBe(false);
  });

  it('does nothing while a kiosk token is on the device', () => {
    expect(shouldRefreshRoles({ ...base, kioskToken: 'kiosk-token' })).toBe(false);
  });
});
