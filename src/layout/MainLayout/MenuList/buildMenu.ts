import { employeePermissions } from 'utils/employeePermissions';
import { isAdminOrAbove } from 'utils/role';
import menuItems from 'menu-items';
import { topLevelItems } from 'menu-items/pages';
import type { NavItemType } from 'types';
import { isModuleKey, type ModuleKey, type ModulePermissions } from 'types/settings';

import { withoutAdminOnly } from './adminOnly';

export type MenuInput = {
  pathname: string;
  /** role_type of the EFFECTIVE role (the kiosk role while a kiosk session is active). */
  roleType?: string | null;
  /** module_permissions of the effective role. */
  modulePermissions?: ModulePermissions;
  /** An employee has the kiosk unlocked: Clock and Find a Size point at the kiosk URLs. */
  kioskActive: boolean;
};

/**
 * The sidebar for a role. Admin-or-above (owner ranks above admin) gets the
 * full menu; any other role gets the limited menu built from its own grants.
 * Which one is decided by the role alone, never by the URL: a member kiosk
 * session that clicks out of /kiosk must not find the owner's sidebar.
 */
export function buildMenu({ pathname, roleType, modulePermissions, kioskActive }: MenuInput): { items: NavItemType[] } {
  // Hide sidebar only on the Kiosk login page
  if (pathname === '/kiosk/login') return { items: [] as NavItemType[] };

  // No role yet (first render after sign-in): the full menu, as before; the
  // member guard still confines the routes themselves.
  const showLimited = kioskActive ? !isAdminOrAbove(roleType) : !!roleType && !isAdminOrAbove(roleType);
  if (!showLimited) {
    return { items: menuItems.items };
  }

  // Limited menu: Inventory + Clock-in are baseline (always shown for
  // members); the rest follows currentRole.module_permissions, which the
  // admin manages from Settings → Team & Permissions.
  // The full menu is three captioned groups; the limited menu is one flat
  // group built from items looked up by id across all of them.
  const root: NavItemType = { id: 'root', title: '', type: 'group', children: [] };

  // Module key → menu item id (top-level) it should add to the limited menu.
  // 'clock' is special because it lives inside the Employees & Pay group.
  const MODULE_TO_MENU_ID: Record<
    Exclude<ModuleKey, 'clock' | 'scheduling' | 'employees' | 'employees.manage' | 'employees.approve' | 'employees.delete'>,
    string
  > = {
    inventory: 'inventory',
    pos: 'pos',
    finance: 'finance',
    crm: 'crm',
    calendar: 'calendar',
    documents: 'documents',
    analytics: 'analytics',
    insights: 'insights',
    storefront: 'storefront',
    onboarding: 'onboarding'
  };

  const granted: Set<ModuleKey> = new Set(['inventory', 'clock']); // baseline
  if (modulePermissions) {
    // Dotted action keys ('pos.refund') share this object; they name no
    // menu item, so they are filtered rather than cast (ALL-72).
    Object.keys(modulePermissions).forEach((k) => {
      if (isModuleKey(k) && modulePermissions[k]) granted.add(k);
    });
  }

  const filteredChildren: NavItemType[] = [];
  const childById = (id: string) => topLevelItems.find((c: NavItemType) => c.id === id);

  // Clock In/Out (always granted via baseline)
  if (granted.has('clock')) {
    const employees = childById('employees');
    const clock = (employees?.children || []).find((c: NavItemType) => c.id === 'employees-clock');
    if (clock) {
      const clockUrl = kioskActive ? '/kiosk/clock' : (clock as NavItemType).url || '/employees/clock';
      filteredChildren.push({ ...clock, url: clockUrl });
    }
  }

  const employeeAccess = employeePermissions(roleType ?? undefined, modulePermissions);
  const employeeChildren = childById('employees')?.children || [];
  for (const [allowed, id] of [
    [employeeAccess.roster, 'employees-home'],
    [employeeAccess.approve, 'employees-time-approval']
  ] as const) {
    const item = employeeChildren.find((child) => child.id === id);
    if (allowed && item) filteredChildren.push(item);
  }

  // Inventory (always granted via baseline): the workspace plus Find a size. A kiosk session sees only
  // Find a size, pointed at the kiosk's own inventory page.
  if (granted.has('inventory')) {
    const inv = childById('inventory');
    const find = childById('inventory-find');
    if (kioskActive) {
      if (find) filteredChildren.push({ ...find, url: '/kiosk/inventory' });
    } else {
      if (inv) filteredChildren.push({ ...withoutAdminOnly(inv), url: '/inventory' });
      if (find) filteredChildren.push(find);
    }
  }

  // Other granted modules — always shown when granted. Clicking one leaves
  // the kiosk URL space, which is fine: the kiosk session stays active and
  // still decides what the employee may see.
  (
    Object.keys(MODULE_TO_MENU_ID) as Array<
      Exclude<ModuleKey, 'clock' | 'scheduling' | 'employees' | 'employees.manage' | 'employees.approve' | 'employees.delete'>
    >
  ).forEach((mk) => {
    if (mk === 'inventory') return; // already added above
    if (!granted.has(mk)) return;
    const menuItem = childById(MODULE_TO_MENU_ID[mk]);
    if (menuItem) filteredChildren.push(menuItem);
  });

  // Auto-Scheduling lives inside the Employees & Payroll group like clock;
  // granting it pulls only that single item, never the whole group
  // (Directory / Time Approval follow their own grants)
  if (granted.has('scheduling')) {
    const employees = childById('employees');
    const scheduling = (employees?.children || []).find((c: NavItemType) => c.id === 'employees-scheduling');
    if (scheduling) filteredChildren.push(scheduling);
  }

  if (granted.has('crm')) {
    const innerCircle = childById('inner-circle');
    if (innerCircle) filteredChildren.push(innerCircle);
  }

  const filteredRoot: NavItemType = { ...root, children: filteredChildren };
  return { items: [filteredRoot] };
}
