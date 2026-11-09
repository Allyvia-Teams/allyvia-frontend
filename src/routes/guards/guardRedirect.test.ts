import { describe, expect, it } from 'vitest';
import { guardRedirect, type GuardInput } from './moduleAccess';

const base: GuardInput = { pathname: '/', effectiveRoleType: 'owner', kioskActive: false, kioskDevice: false };

// Owner signed in on the shared device; a member has unlocked the kiosk. The
// effective role is the member's kiosk role.
const memberKiosk = (pathname: string, extra: Partial<GuardInput> = {}) =>
  guardRedirect({
    ...base,
    pathname,
    effectiveRoleType: 'member',
    modulePermissions: { crm: true },
    kioskActive: true,
    kioskDevice: true,
    ...extra
  });

describe('guardRedirect — member kiosk session over an owner login', () => {
  it('redirects owner-only screens to the kiosk clock', () => {
    expect(memberKiosk('/finance')).toBe('/kiosk/clock');
    expect(memberKiosk('/settings')).toBe('/kiosk/clock');
    expect(memberKiosk('/')).toBe('/kiosk/clock');
  });

  it('allows baseline, granted and kiosk screens', () => {
    expect(memberKiosk('/inventory/find')).toBeNull();
    expect(memberKiosk('/crm')).toBeNull();
    expect(memberKiosk('/kiosk/clock')).toBeNull();
    expect(memberKiosk('/kiosk/inventory')).toBeNull();
    expect(memberKiosk('/employees/clock')).toBeNull();
  });

  it('lets the CRM grant reach Inner Circle, where /crm redirects', () => {
    // memberGuard passes location.pathname, so the query never reaches the rule.
    const { pathname } = new URL('/inner-circle?tab=customers', 'http://localhost');
    expect(memberKiosk(pathname)).toBeNull();
    expect(memberKiosk(pathname, { modulePermissions: {} })).toBe('/kiosk/clock');
    expect(
      guardRedirect({ ...base, pathname: '/inner-circle', effectiveRoleType: 'manager', modulePermissions: { crm: true } })
    ).toBeNull();
    expect(guardRedirect({ ...base, pathname: '/inner-circle', effectiveRoleType: 'manager', modulePermissions: {} })).toBe(
      '/employees/clock'
    );
  });

  it('does not allow a module the member was not granted', () => {
    expect(memberKiosk('/pos')).toBe('/kiosk/clock');
  });
});

describe('guardRedirect — locked kiosk device', () => {
  it('sends every route to the PIN screen, whoever is signed in', () => {
    for (const pathname of ['/', '/dashboard', '/finance', '/settings', '/kiosk/clock', '/inventory/find']) {
      expect(guardRedirect({ ...base, pathname, kioskDevice: true })).toBe('/kiosk/login');
    }
  });

  it('always lets the PIN screen itself through', () => {
    expect(guardRedirect({ ...base, pathname: '/kiosk/login', kioskDevice: true })).toBeNull();
  });
});

describe('guardRedirect — admin-or-above', () => {
  it('lets an admin kiosk session reach admin screens', () => {
    expect(guardRedirect({ ...base, pathname: '/finance', effectiveRoleType: 'admin', kioskActive: true, kioskDevice: true })).toBeNull();
  });

  it('treats owner as above admin', () => {
    expect(guardRedirect({ ...base, pathname: '/settings', effectiveRoleType: 'owner', kioskActive: true, kioskDevice: true })).toBeNull();
  });

  it('leaves the owner alone on a browser that is not a kiosk', () => {
    expect(guardRedirect({ ...base, pathname: '/finance' })).toBeNull();
  });
});

describe('guardRedirect — no kiosk session', () => {
  it('needs an unlocked session for kiosk URLs', () => {
    expect(guardRedirect({ ...base, pathname: '/kiosk/clock' })).toBe('/kiosk/login');
  });

  it('sends a member web login to the PIN screen with their email', () => {
    expect(guardRedirect({ ...base, pathname: '/inventory', effectiveRoleType: 'member', userEmail: 'mo@shop.test' })).toBe(
      '/kiosk/login?identifier=mo%40shop.test'
    );
  });

  it('does not confine before a role has loaded', () => {
    expect(guardRedirect({ ...base, pathname: '/onboarding', effectiveRoleType: undefined })).toBeNull();
  });
});

describe('kioskLandingPath', () => {
  it('lands a member on the kiosk clock and admin-or-above on the dashboard', async () => {
    const { kioskLandingPath } = await import('./moduleAccess');
    expect(kioskLandingPath('member')).toBe('/kiosk/clock');
    expect(kioskLandingPath('admin')).toBe('/dashboard');
    expect(kioskLandingPath('owner')).toBe('/dashboard');
  });
});

describe('guardRedirect — subscription pages (/paymentplan, /checkout/success, /onboarding/branding)', () => {
  const SUBSCRIPTION_PATHS = ['/paymentplan', '/checkout/success', '/onboarding/branding'];

  it('sends a locked kiosk device to the PIN screen, even with the owner signed in underneath', () => {
    for (const pathname of SUBSCRIPTION_PATHS) {
      expect(guardRedirect({ ...base, pathname, effectiveRoleType: 'owner', kioskActive: false, kioskDevice: true })).toBe('/kiosk/login');
    }
  });

  it("lets the owner through on a browser that isn't a kiosk", () => {
    for (const pathname of SUBSCRIPTION_PATHS) {
      expect(guardRedirect({ ...base, pathname, effectiveRoleType: 'owner', kioskActive: false, kioskDevice: false })).toBeNull();
    }
  });

  it('lets a brand-new account with no role yet through (the signup path)', () => {
    for (const pathname of SUBSCRIPTION_PATHS) {
      expect(
        guardRedirect({ ...base, pathname, effectiveRoleType: undefined, modulePermissions: undefined, kioskDevice: false })
      ).toBeNull();
      expect(guardRedirect({ ...base, pathname, effectiveRoleType: null, kioskDevice: false })).toBeNull();
    }
  });

  it("sends a member's own web login to the PIN screen, like any other route", () => {
    for (const pathname of SUBSCRIPTION_PATHS) {
      expect(
        guardRedirect({ ...base, pathname, effectiveRoleType: 'member', kioskActive: false, kioskDevice: false, userEmail: 'mo@shop.test' })
      ).toBe('/kiosk/login?identifier=mo%40shop.test');
    }
  });

  it('keeps an unlocked member kiosk session off them', () => {
    for (const pathname of SUBSCRIPTION_PATHS) expect(memberKiosk(pathname)).toBe('/kiosk/clock');
  });
});
