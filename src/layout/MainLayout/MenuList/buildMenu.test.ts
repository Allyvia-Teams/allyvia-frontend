import { describe, expect, it } from 'vitest';
import menuItems from 'menu-items';
import type { NavItemType } from 'types';
import { buildMenu } from './buildMenu';

const ids = (menu: { items: NavItemType[] }) => menu.items.flatMap((group) => (group.children || []).map((c) => c.id));
const urlOf = (menu: { items: NavItemType[] }, id: string) =>
  menu.items.flatMap((group) => group.children || []).find((c) => c.id === id)?.url;

// Owner signed in on the shared device; a member with CRM has the kiosk unlocked.
const memberKiosk = (pathname: string) => buildMenu({ pathname, roleType: 'member', modulePermissions: { crm: true }, kioskActive: true });

describe('buildMenu — member kiosk session over an owner login', () => {
  const PATHS = ['/kiosk/clock', '/kiosk/inventory', '/', '/dashboard', '/crm', '/finance', '/settings', '/inventory'];

  it('is the limited menu on every pathname, never the full one', () => {
    for (const pathname of PATHS) {
      const menu = memberKiosk(pathname);
      expect(menu.items).not.toBe(menuItems.items);
      expect(menu.items).toHaveLength(1);
      expect(ids(menu)).not.toContain('finance');
    }
  });

  it('shows Clock and Find a Size at the kiosk URLs, and Inner Circle for the CRM grant', () => {
    const menu = memberKiosk('/crm');
    // CRM has no top-level menu item of its own on main; its grant surfaces as Inner Circle.
    expect(ids(menu)).toEqual(['employees-clock', 'inventory-find', 'inner-circle']);
    expect(urlOf(menu, 'employees-clock')).toBe('/kiosk/clock');
    expect(urlOf(menu, 'inventory-find')).toBe('/kiosk/inventory');
  });

  it("follows the kiosk role's grants, not the owner's", () => {
    const menu = buildMenu({ pathname: '/', roleType: 'member', modulePermissions: {}, kioskActive: true });
    expect(ids(menu)).not.toContain('crm');
    expect(ids(menu)).not.toContain('inner-circle');
  });
});

describe('buildMenu — admin and owner', () => {
  it('gives an admin kiosk session the full menu', () => {
    expect(buildMenu({ pathname: '/kiosk/clock', roleType: 'admin', kioskActive: true }).items).toBe(menuItems.items);
  });

  it('treats owner as above admin', () => {
    expect(buildMenu({ pathname: '/', roleType: 'owner', kioskActive: false }).items).toBe(menuItems.items);
  });

  it('no longer limits an admin web session just for being on a /kiosk URL', () => {
    expect(buildMenu({ pathname: '/kiosk/clock', roleType: 'admin', kioskActive: false }).items).toBe(menuItems.items);
  });
});

describe('buildMenu — member web login and the PIN screen', () => {
  it('limits a member web login with the regular URLs', () => {
    const menu = buildMenu({ pathname: '/', roleType: 'member', modulePermissions: {}, kioskActive: false });
    expect(urlOf(menu, 'employees-clock')).not.toBe('/kiosk/clock');
    expect(ids(menu)).toContain('inventory');
  });

  it('hides the sidebar on the PIN screen', () => {
    expect(buildMenu({ pathname: '/kiosk/login', roleType: 'owner', kioskActive: false }).items).toEqual([]);
  });
});

describe('buildMenu — CRM grant', () => {
  it('shows Inner Circle exactly once for a member with CRM', () => {
    const menu = buildMenu({ pathname: '/inner-circle', roleType: 'member', modulePermissions: { crm: true }, kioskActive: false });
    expect(ids(menu).filter((id) => id === 'inner-circle')).toHaveLength(1);
    expect(urlOf(menu, 'inner-circle')).toBe('/inner-circle');
  });
});

describe('buildMenu — Refunds follows pos + pos.refund', () => {
  const member = (modulePermissions: Record<string, boolean>) =>
    ids(buildMenu({ pathname: '/', roleType: 'member', modulePermissions, kioskActive: false }));

  it('shows Refunds when POS and the pos.refund action are both granted', () => {
    expect(member({ pos: true, 'pos.refund': true })).toEqual(expect.arrayContaining(['pos', 'refunds']));
  });

  it('hides Refunds with POS alone', () => {
    const menu = member({ pos: true });
    expect(menu).toContain('pos');
    expect(menu).not.toContain('refunds');
  });

  it('hides Refunds with pos.refund but no POS (a dead grant)', () => {
    expect(member({ 'pos.refund': true })).not.toContain('refunds');
  });

  it('hides Refunds when pos.refund is explicitly false', () => {
    expect(member({ pos: true, 'pos.refund': false })).not.toContain('refunds');
  });
});
