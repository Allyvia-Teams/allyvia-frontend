import { isModuleGranted } from 'routes/guards/moduleAccess';
import { employeePermissions } from 'utils/employeePermissions';
import type { ModuleKey, ModulePermissions } from 'types/settings';

/**
 * Whether a widget with an optional module gate should appear in the picker.
 * Admins/managers see the full catalog (same as the unrestricted sidebar menu).
 * Members are filtered by module_permissions, matching Settings → Team grants.
 */
export function canOfferWidgetModule(
  module: ModuleKey | undefined,
  roleType: string | undefined,
  permissions: ModulePermissions | undefined
): boolean {
  if (!module) {
    return true;
  }
  if ((roleType || '').toLowerCase() !== 'member') {
    return true;
  }
  // Employee analytics needs roster access (employees OR employees.manage), not clock alone.
  if (module === 'employees') {
    return employeePermissions(roleType, permissions).roster;
  }
  return isModuleGranted(module, permissions);
}
