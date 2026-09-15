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

describe('independent employee routes', () => {
  it('grants roster access without granting approval', () => {
    for (const grants of [{ employees: true }, { 'employees.manage': true }]) {
      expect(canReach('/employees', grants)).toBe(true);
      expect(canReach('/employees/', grants)).toBe(true);
      expect(canReach('/employees/time-approval', grants)).toBe(false);
      expect(canReach('/employees/clock', grants)).toBe(true);
    }
  });

  it('grants approval without roster access', () => {
    const grants = { 'employees.approve': true };
    expect(canReach('/employees/time-approval', grants)).toBe(true);
    expect(canReach('/employees', grants)).toBe(false);
    expect(canReach('/employees/time-approval-extra', grants)).toBe(false);
  });

  it('requires explicit grants and respects route boundaries', () => {
    expect(canReach('/employees', undefined)).toBe(false);
    expect(canReach('/employees', { 'employees.delete': true })).toBe(false);
    expect(canReach('/employees/time-approval', { 'employees.approve': false })).toBe(false);
    expect(canReach('/employees/clockwise', undefined)).toBe(false);
    expect(canReach('/pos-other', { pos: true })).toBe(false);
  });
});
