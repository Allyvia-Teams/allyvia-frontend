import { describe, expect, it } from 'vitest';

import type { NavItemType } from 'types';

import { ADMIN_ONLY_MENU_IDS, withoutAdminOnly } from './adminOnly';

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

describe('the limited menu leaves out what the server answers only for an admin', () => {
  it('drops Plan from the Buying group, wherever it sits, and keeps everything else', () => {
    expect(ADMIN_ONLY_MENU_IDS.has('inventory-plan')).toBe(true);
    const out = withoutAdminOnly(inventory);
    const buying = out.children?.find((c) => c.id === 'inventory-buying');
    expect(buying?.children?.map((c) => c.id)).toEqual(['inventory-reorder']);
    expect(out.children?.map((c) => c.id)).toEqual(['inventory-styles', 'inventory-buying']);
  });

  it('leaves the original menu alone', () => {
    withoutAdminOnly(inventory);
    expect(inventory.children?.[1].children?.map((c) => c.id)).toEqual(['inventory-plan', 'inventory-reorder']);
  });
});
