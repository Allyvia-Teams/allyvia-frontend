import { describe, expect, it } from 'vitest';

import { computeAllowedPrefixes, matchesAny } from './moduleAccess';
import type { ModulePermissions } from 'types/settings';

const perms = (over: Partial<ModulePermissions> = {}): ModulePermissions => over as ModulePermissions;

const canReach = (pathname: string, permissions: ModulePermissions | undefined) =>
  matchesAny(pathname, computeAllowedPrefixes(permissions));

describe('member access to /refunds', () => {
  // The rule the Refunds screen depends on: it hangs off the `pos` module key
  // rather than a module of its own, because `pos.refund` is a dotted ACTION
  // key inside the pos module server-side, not a separate grantable module.
  it('lets a member with POS reach /refunds', () => {
    expect(canReach('/refunds', perms({ pos: true }))).toBe(true);
  });

  it('keeps a member WITHOUT POS out of /refunds', () => {
    expect(canReach('/refunds', perms({ pos: false }))).toBe(false);
  });

  it('keeps a member with no permissions at all out of /refunds', () => {
    expect(canReach('/refunds', undefined)).toBe(false);
  });

  it('does not let an unrelated module grant /refunds', () => {
    expect(canReach('/refunds', perms({ finance: true, crm: true }))).toBe(false);
  });

  it('still lets a member with POS reach /pos', () => {
    expect(canReach('/pos', perms({ pos: true }))).toBe(true);
  });

  it('grants /refunds and /pos together, from the one key', () => {
    const allowed = computeAllowedPrefixes(perms({ pos: true }));
    expect(allowed).toEqual(expect.arrayContaining(['/pos', '/refunds']));
  });

  it('leaves the baseline modules reachable without an explicit grant', () => {
    expect(canReach('/inventory', undefined)).toBe(true);
    expect(canReach('/employees/clock', undefined)).toBe(true);
  });
});

describe('storefront module', () => {
  it('grants all six storefront screens only to members with storefront access', () => {
    for (const screen of ['overview', 'builder', 'products', 'domains', 'orders', 'settings']) {
      expect(canReach(`/storefront/${screen}`, { storefront: true })).toBe(true);
      expect(canReach(`/storefront/${screen}`, { pos: true })).toBe(false);
      expect(canReach(`/storefront/${screen}`, { storefront: false })).toBe(false);
    }
  });
});

describe('dotted action keys in module_permissions', () => {
  // The brief's fourth case. 'pos.refund' is a legal grant that lives in the
  // same object as the module grants; it names an action, not a screen.
  it('grants exactly the same prefixes as without the dotted key', () => {
    const plain = computeAllowedPrefixes(perms({ pos: true }));
    const withActions = computeAllowedPrefixes(perms({ pos: true, 'pos.refund': true, 'pos.refund.approve': true }));
    expect(withActions).toEqual(plain);
  });

  it('does not let an action key alone open any screen', () => {
    // An orphan the server would refuse anyway — but if one is ever stored,
    // it must not widen access.
    expect(canReach('/pos', perms({ 'pos.refund': true }))).toBe(false);
    expect(canReach('/refunds', perms({ 'pos.refund': true }))).toBe(false);
  });

  it('does not crash on a key it has never heard of', () => {
    expect(() => computeAllowedPrefixes({ 'something.new': true } as ModulePermissions)).not.toThrow();
    expect(canReach('/refunds', { 'something.new': true } as ModulePermissions)).toBe(false);
  });
});
