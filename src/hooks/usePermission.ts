import { useSelector } from 'store';
import { hasPermission, canPerformAction, RoleType } from 'utils/role';

export function useRole() {
  const { currentRole } = useSelector((state) => state.auth);
  return currentRole;
}

export function useHasPermission(requiredRole: RoleType): boolean {
  const currentRole = useRole();
  if (!currentRole) return false;
  return hasPermission(currentRole.role_type, requiredRole);
}

export function useCanPerform(action: 'read' | 'write' | 'delete' | 'admin'): boolean {
  const currentRole = useRole();
  if (!currentRole) return false;
  return canPerformAction(currentRole.role_type, action);
}

export function useIsAdmin(): boolean {
  return useHasPermission(RoleType.ADMIN);
}

export function useIsManager(): boolean {
  return useHasPermission(RoleType.MANAGER);
}

export function useIsMember(): boolean {
  return useHasPermission(RoleType.MEMBER);
}

export function useIsViewer(): boolean {
  return useHasPermission(RoleType.VIEWER);
}

export function useRoleGuard(allowedRoles: RoleType[]): {
  hasAccess: boolean;
  currentRole: ReturnType<typeof useRole>;
  isLoading: boolean;
} {
  const { isInitialized } = useSelector((state) => state.auth);
  const currentRole = useRole();

  const hasAccess = currentRole ? allowedRoles.some((role) => hasPermission(currentRole.role_type, role)) : false;

  return {
    hasAccess,
    currentRole,
    isLoading: !isInitialized
  };
}
