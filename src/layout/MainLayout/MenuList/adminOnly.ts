// Menu items whose pages answer only for an admin (or the owner above one), left out of the limited menu a
// member gets. Inventory › Buying › Plan (buy planner B9): every plan route is `AdminRoleRequiredMixin` on the
// backend, so a member would only ever meet a 403 there.

import type { NavItemType } from 'types';

export const ADMIN_ONLY_MENU_IDS: ReadonlySet<string> = new Set(['inventory-plan']);

/** A copy of the item with every admin-only descendant removed. */
export const withoutAdminOnly = (item: NavItemType): NavItemType =>
  item.children
    ? { ...item, children: item.children.filter((child) => !ADMIN_ONLY_MENU_IDS.has(String(child.id))).map(withoutAdminOnly) }
    : item;
