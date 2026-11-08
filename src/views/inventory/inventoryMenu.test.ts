import { describe, expect, it } from 'vitest';

import { menuGroups } from 'menu-items/pages';
import type { NavItemType } from 'types';

const walk = (items: NavItemType[] | undefined, out: NavItemType[] = []): NavItemType[] => {
  (items ?? []).forEach((item) => {
    out.push(item);
    walk(item.children, out);
  });
  return out;
};

describe('the sidebar carries Inventory as two entries', () => {
  const operate = menuGroups.find((g) => g.id === 'operate');
  const ids = (operate?.children ?? []).map((c) => c.id);
  const inventory = operate?.children?.find((c) => c.id === 'inventory');
  const find = operate?.children?.find((c) => c.id === 'inventory-find');

  it('lists inventory then inventory-find, adjacent', () => {
    expect(ids.indexOf('inventory-find')).toBe(ids.indexOf('inventory') + 1);
    expect(ids.indexOf('inventory')).toBeGreaterThanOrEqual(0);
  });

  it('makes the workspace a leaf that matches exactly and stays lit under its tabs', () => {
    expect(inventory?.children).toBeUndefined();
    expect(inventory?.exact).toBe(true);
    expect(inventory?.also).toContain('/inventory/plan');
    expect(inventory?.also).toContain('/inventory/purchase-orders');
  });

  it('has no other inventory ids anywhere', () => {
    const all = walk(menuGroups)
      .map((i) => String(i.id))
      .filter((id) => id.startsWith('inventory'));
    expect(all.sort()).toEqual(['inventory', 'inventory-find']);
  });

  it('points Find a size at /inventory/find', () => {
    expect(find?.url).toBe('/inventory/find');
  });
});
