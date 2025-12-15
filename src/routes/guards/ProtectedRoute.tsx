import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'store';
import { useMemo } from 'react';
import { buildAllowedKeys, makeMenuChecker } from 'utils/permission-helpers';
import { permissionKeyToMenuIdMap } from 'registry/builders';

interface ProtectedRouteProps {
  menuId: string;
  children: React.ReactElement;
  fallback?: React.ReactElement;
}

/**
 * ProtectedRoute Component
 *
 * Authorizes routes based on user permissions and subscription.
 * Blocks direct URL access if user doesn't have permission.
 *
 * Flow:
 * 1. Check if menuId is available in subscription
 * 2. Check if user has permission for menuId
 * 3. If both pass → render children
 * 4. If either fails → redirect to /403
 */
export default function ProtectedRoute({ menuId, children, fallback }: ProtectedRouteProps) {
  const location = useLocation();
  const subscription = useSelector((s) => s.subscription.status);
  const myPermissions = useSelector((s) => s.role.myPermissions);
  const myPermissionsLoading = useSelector((s) => s.role.myPermissionsLoading);
  const availableModules = useSelector((s) => s.role.availableModules);
  const availableModulesLoading = useSelector((s) => s.role.availableModulesLoading);
  const roleType = useSelector((s) => s.auth.currentRole?.role_type);

  // Get permissions from new structure (permissions at top level)
  const permissions = myPermissions?.permissions;

  // Get available_modules from separate endpoint (not in permissions response)
  // Use availableModules from Redux state (fetched separately via fetchAvailableModules)
  const availableModulesSource = availableModules?.available_modules;

  // Check subscription availability
  // Use availableModules from role slice (fetched via /api/v1/role/available-modules/)
  // Otherwise fallback to subscription.available_modules
  // Uses same logic as subscription-menu.ts to handle child pages (e.g., employees-home if employees module is available)
  const isAvailableInSubscription = useMemo(() => {
    const modulesForFiltering = availableModulesSource || subscription?.available_modules;
    if (!modulesForFiltering || modulesForFiltering.length === 0) {
      return false;
    }

    // Handle both string[] (legacy) and AvailableModule[] (new) formats
    const availableModulesSet = new Set<string>();
    const moduleToPagesMap = new Map<string, Set<string>>();

    const firstItem = modulesForFiltering[0];
    if (typeof firstItem === 'string') {
      // Legacy format: string[]
      (modulesForFiltering as string[]).forEach((m: string) => {
        availableModulesSet.add(m.toLowerCase());
      });
    } else {
      // New format: AvailableModule[] - extract pages and tabs for each module
      (modulesForFiltering as any[]).forEach((module: any) => {
        if (module.key) {
          const moduleKey = module.key.toLowerCase();
          availableModulesSet.add(moduleKey);
          const pageKeys = new Set<string>();

          // Add module key itself
          pageKeys.add(moduleKey);

          // Add all page keys from this module
          if (module.pages && Array.isArray(module.pages)) {
            module.pages.forEach((page: any) => {
              if (page.key) {
                pageKeys.add(page.key.toLowerCase());
              }
            });
          }

          // Add all tab keys from this module
          if (module.tabs && Array.isArray(module.tabs)) {
            module.tabs.forEach((tab: any) => {
              if (tab.key) {
                pageKeys.add(tab.key.toLowerCase());
              }
            });
          }

          moduleToPagesMap.set(moduleKey, pageKeys);
        }
      });
    }

    const menuIdLower = menuId.toLowerCase();

    // Direct check: is this menu ID in available_modules?
    if (availableModulesSet.has(menuIdLower)) {
      return true;
    }

    // Check if this menu ID is a page/tab within an available module
    for (const pageKeys of moduleToPagesMap.values()) {
      if (pageKeys.has(menuIdLower)) {
        return true;
      }
    }

    // Check if this is a child page that maps to a parent module
    // For example: employees-home should be available if employees module is available
    if (menuIdLower.startsWith('employees-')) {
      return availableModulesSet.has('employees');
    }
    if (menuIdLower.startsWith('inventory-')) {
      return availableModulesSet.has('inventory');
    }

    // Check if any mapped permission key is in available_modules
    for (const [permKey, menuIds] of Object.entries(permissionKeyToMenuIdMap)) {
      if (menuIds.some((mid) => mid.toLowerCase() === menuIdLower)) {
        if (availableModulesSet.has(permKey.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }, [availableModulesSource, subscription?.available_modules, menuId]);

  const allowedKeys = useMemo(() => {
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      return buildAllowedKeys(permissions);
    }
    return new Set<string>();
  }, [permissions]);

  const hasPermission = useMemo(() => {
    return makeMenuChecker(allowedKeys, permissionKeyToMenuIdMap);
  }, [allowedKeys]);

  const hasAccess = useMemo(() => {
    // Admin users bypass permission checks (they see all subscription modules)
    const isAdmin = roleType?.toLowerCase() === 'admin';
    if (isAdmin) {
      return isAvailableInSubscription;
    }

    // Non-admin users need both subscription availability and permission
    return isAvailableInSubscription && hasPermission(menuId);
  }, [isAvailableInSubscription, hasPermission, menuId, roleType]);

  if (myPermissionsLoading || availableModulesLoading) {
    return null;
  }

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    return <Navigate to="/403" state={{ from: location.pathname }} replace />;
  }

  // User has access, render children
  return children;
}
