import type { ModulePermissions } from 'types/settings';

export function employeePermissions(roleType: string | undefined, grants: ModulePermissions | undefined) {
  const admin = roleType?.toLowerCase() === 'admin';
  const manage = admin || grants?.['employees.manage'] === true;
  return {
    roster: manage || grants?.employees === true,
    manage,
    approve: admin || grants?.['employees.approve'] === true,
    delete: manage && (admin || grants?.['employees.delete'] === true)
  };
}
