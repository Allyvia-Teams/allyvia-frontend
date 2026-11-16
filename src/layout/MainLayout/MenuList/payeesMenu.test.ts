// Owner trust T5: the sidebar has no Vendors entry in any role's menu, and Finance & accounting stays the
// highlighted item on /finance/payees (Bills and payees, the moved payables page).

import { describe, expect, it } from 'vitest';

import menuItems from 'menu-items';
import { topLevelItems } from 'menu-items/pages';
import type { NavItemType } from 'types';
import type { ModulePermissions } from 'types/settings';

import { buildMenu } from './buildMenu';
import { isNavItemSelected } from './navMatch';

const flatten = (items: ReadonlyArray<NavItemType>): NavItemType[] => items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

const EVERY_MODULE = [
  'storefront',
  'inventory',
  'clock',
  'employees',
  'employees.manage',
  'employees.approve',
  'pos',
  'finance',
  'crm',
  'calendar',
  'documents',
  'analytics',
  'insights',
  'scheduling',
  'onboarding'
];
const everyGrant = Object.fromEntries(EVERY_MODULE.map((key) => [key, true])) as ModulePermissions;

describe('the sidebar after Vendors left it', () => {
  it('has no vendors item in the full menu', () => {
    const all = flatten(menuItems.items);
    expect(all.some((item) => item.id === 'vendors')).toBe(false);
    expect(all.some((item) => item.url === '/vendors')).toBe(false);
    expect(all.some((item) => String(item.title) === 'Vendors')).toBe(false);
  });

  it.each([
    ['owner', undefined],
    ['admin', undefined],
    ['member with every grant', everyGrant],
    ['member with no grants', {} as ModulePermissions],
    ['member with finance only', { finance: true } as ModulePermissions]
  ])('has no vendors item for %s', (label, modulePermissions) => {
    const roleType = label.startsWith('member') ? 'member' : label;
    const menu = buildMenu({ pathname: '/dashboard', roleType, modulePermissions, kioskActive: false });
    const all = flatten(menu.items);
    expect(all.some((item) => item.id === 'vendors' || item.url === '/vendors')).toBe(false);
  });

  it('keeps Finance & accounting in the full menu, pointing at /finance', () => {
    const finance = topLevelItems.find((item) => item.id === 'finance');
    expect(finance?.url).toBe('/finance');
  });

  it('keeps Finance highlighted on /finance/payees, and no other top-level item with it', () => {
    const selected = topLevelItems.filter((item) => isNavItemSelected(item, '/finance/payees')).map((item) => item.id);
    expect(selected).toEqual(['finance']);
  });
});
