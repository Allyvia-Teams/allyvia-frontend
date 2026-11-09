import { describe, expect, it } from 'vitest';

import type { NavItemType } from 'types';

import { topLevelItems } from 'menu-items/pages';

import { ADMIN_ONLY_MENU_IDS, withoutAdminOnly, withoutIds } from './adminOnly';

const inventory: NavItemType = {
  id: 'inventory',
  title: 'Inventory',
  type: 'collapse',
  children: [
    { id: 'inventory-styles', title: 'Style Catalogue', type: 'item', url: '/inventory/styles' },
    {
      id: 'inventory-buying',
      title: 'Buying',
      type: 'collapse',
      children: [
        { id: 'inventory-plan', title: 'Plan', type: 'item', url: '/inventory/plan' },
        { id: 'inventory-reorder', title: 'Reorder Inbox', type: 'item', url: '/inventory/reorder' }
      ]
    }
  ]
};

const PLAN_ONLY: ReadonlySet<string> = new Set(['inventory-plan']);

describe('the limited menu leaves out what the server answers only for an admin', () => {
  it('has no admin-only ids today (Plan is gated by canOpenPlan on the Buying tab)', () => {
    expect(ADMIN_ONLY_MENU_IDS.size).toBe(0);
  });

  it('drops a listed id wherever it sits, and keeps everything else', () => {
    const out = withoutIds(inventory, PLAN_ONLY);
    const buying = out.children?.find((c) => c.id === 'inventory-buying');
    expect(buying?.children?.map((c) => c.id)).toEqual(['inventory-reorder']);
    expect(out.children?.map((c) => c.id)).toEqual(['inventory-styles', 'inventory-buying']);
  });

  it('leaves the original menu alone', () => {
    withoutIds(inventory, PLAN_ONLY);
    expect(inventory.children?.[1].children?.map((c) => c.id)).toEqual(['inventory-plan', 'inventory-reorder']);
  });
});

// The former Inventory children, each checked against its backend read endpoints (2026-11-08). None of
// them refuses a member: their writes are admin-only, their reads are not. See adminOnly.ts.
const AUDITED_MEMBER_READABLE = [
  'inventory-quickbooks',
  'inventory-suppliers',
  'inventory-purchase-orders',
  'inventory-transfers',
  'inventory-stock-counts',
  'inventory-locations',
  'inventory-size-scales',
  'inventory-reorder',
  'inventory-insights',
  'inventory-styles',
  'inventory-add-stock',
  'inventory-home'
];

describe('the Inventory audit', () => {
  it('keeps every member-readable Inventory page out of the admin-only list', () => {
    for (const id of AUDITED_MEMBER_READABLE) expect(ADMIN_ONLY_MENU_IDS.has(id)).toBe(false);
  });

  it('leaves the Inventory sidebar entry whole for a member', () => {
    const inventoryItem = topLevelItems.find((item) => item.id === 'inventory');
    expect(inventoryItem).toBeDefined();
    expect(withoutAdminOnly(inventoryItem!)).toEqual(inventoryItem);
  });
});
