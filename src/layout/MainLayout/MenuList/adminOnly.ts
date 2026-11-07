// Menu items whose pages answer only for an admin (or the owner above one), left out of the limited menu a
// member gets. Empty today: Plan's gate is `canOpenPlan` on the Inventory Buying tab, not a sidebar entry.
// The seam stays so a later admin-only item has a home.

import type { NavItemType } from 'types';

export const ADMIN_ONLY_MENU_IDS: ReadonlySet<string> = new Set<string>();

/** A copy of the item with every descendant whose id is in `ids` removed. */
export const withoutIds = (item: NavItemType, ids: ReadonlySet<string>): NavItemType =>
  item.children ? { ...item, children: item.children.filter((child) => !ids.has(String(child.id))).map((c) => withoutIds(c, ids)) } : item;

/** A copy of the item with every admin-only descendant removed. */
export const withoutAdminOnly = (item: NavItemType): NavItemType => withoutIds(item, ADMIN_ONLY_MENU_IDS);
