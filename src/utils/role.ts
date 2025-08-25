export enum RoleType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export const roleHierarchy: Record<RoleType, number> = {
  [RoleType.ADMIN]: 4,
  [RoleType.MANAGER]: 3,
  [RoleType.MEMBER]: 2,
  [RoleType.VIEWER]: 1
};

export function hasPermission(userRole: RoleType | string, requiredRole: RoleType | string): boolean {
  const userLevel = roleHierarchy[userRole as RoleType] || 0;
  const requiredLevel = roleHierarchy[requiredRole as RoleType] || 0;
  return userLevel >= requiredLevel;
}

export function canPerformAction(role: RoleType | string, action: 'read' | 'write' | 'delete' | 'admin'): boolean {
  const permissions: Record<string, string[]> = {
    [RoleType.ADMIN]: ['read', 'write', 'delete', 'admin'],
    [RoleType.MANAGER]: ['read', 'write', 'delete'],
    [RoleType.MEMBER]: ['read', 'write'],
    [RoleType.VIEWER]: ['read']
  };

  return permissions[role]?.includes(action) || false;
}

export function getRoleDisplayName(roleType: RoleType | string): string {
  const displayNames: Record<string, string> = {
    [RoleType.ADMIN]: 'Administrator',
    [RoleType.MANAGER]: 'Manager',
    [RoleType.MEMBER]: 'Member',
    [RoleType.VIEWER]: 'Viewer'
  };

  return displayNames[roleType] || roleType;
}

export function canAccessResource(role: RoleType | string, resource: string): boolean {
  const resourcePermissions: Record<string, RoleType[]> = {
    company_settings: [RoleType.ADMIN],
    user_management: [RoleType.ADMIN],
    financial_reports: [RoleType.ADMIN, RoleType.MANAGER, RoleType.MEMBER, RoleType.VIEWER],
    invoices_write: [RoleType.ADMIN, RoleType.MANAGER, RoleType.MEMBER],
    invoices_read: [RoleType.ADMIN, RoleType.MANAGER, RoleType.MEMBER, RoleType.VIEWER],
    expenses_write: [RoleType.ADMIN, RoleType.MANAGER],
    expenses_read: [RoleType.ADMIN, RoleType.MANAGER, RoleType.MEMBER, RoleType.VIEWER],
    quickbooks_sync: [RoleType.ADMIN, RoleType.MANAGER]
  };

  const allowedRoles = resourcePermissions[resource];
  if (!allowedRoles) return false;

  return allowedRoles.some((allowedRole) => hasPermission(role, allowedRole));
}
