import type { ModulePermissions } from 'types/settings';
import { isAdminOrAbove } from 'utils/role';

export function employeePermissions(roleType: string | undefined, grants: ModulePermissions | undefined) {
  const admin = isAdminOrAbove(roleType);
  const manage = admin || grants?.['employees.manage'] === true;
  return {
    roster: manage || grants?.employees === true,
    manage,
    approve: admin || grants?.['employees.approve'] === true,
    delete: manage && (admin || grants?.['employees.delete'] === true)
  };
}
