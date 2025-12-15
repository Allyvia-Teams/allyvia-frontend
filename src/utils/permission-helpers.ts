/**
 * Permission Helpers
 *
 * Utility functions for working with permissions and menu access.
 * Provides normalized, validated helpers for permission checking.
 * Updated to work with new API structure: Permission[] with pages/tabs/actions arrays
 */

import type { Permission } from 'types/role';

/**
 * Build allowed keys from permissions (new structure)
 *
 * Normalizes and flattens permission structure:
 * - Lowercases all keys
 * - Extracts parent keys where view: true
 * - Extracts child keys from pages/tabs arrays (if parent has view: true)
 * - Returns a Set of allowed permission keys
 */
export function buildAllowedKeys(permissions: Permission[]): Set<string> {
  const allowedKeys = new Set<string>();

  if (!permissions || !Array.isArray(permissions)) {
    return allowedKeys;
  }

  for (const perm of permissions) {
    if (!perm || typeof perm !== 'object') continue;

    // Only process if module has view: true
    if (perm.view !== true || !perm.key || typeof perm.key !== 'string') {
      continue;
    }

    const normalizedKey = perm.key.toLowerCase();
    allowedKeys.add(normalizedKey);

    // Extract page keys from pages array (pages are included if parent module has view: true)
    if (perm.pages && Array.isArray(perm.pages)) {
      perm.pages.forEach((page) => {
        if (page && page.key && typeof page.key === 'string') {
          allowedKeys.add(page.key.toLowerCase());
        }
      });
    }

    // Extract tab keys from tabs array (tabs are included if parent module has view: true)
    if (perm.tabs && Array.isArray(perm.tabs)) {
      perm.tabs.forEach((tab) => {
        if (tab && tab.key && typeof tab.key === 'string') {
          allowedKeys.add(tab.key.toLowerCase());
        }
      });
    }
  }

  return allowedKeys;
}

/**
 * Make menu permission checker with warnings
 *
 * Creates a function that checks if a menu ID has permission.
 * Includes warnings for unmapped keys in development mode.
 *
 * @param allowedKeys - Set of allowed permission keys (normalized, lowercase)
 * @param keyToMenuIdMap - Mapping from permission keys to menu IDs
 * @returns Function that checks if a menu ID has permission
 */
export function makeMenuChecker(allowedKeys: Set<string>, keyToMenuIdMap: Record<string, string[]>): (menuId: string) => boolean {
  // Normalize mapping to lowercase for consistent comparison
  const normalizedMap: Record<string, string[]> = {};
  for (const [permKey, menuIds] of Object.entries(keyToMenuIdMap)) {
    normalizedMap[permKey.toLowerCase()] = menuIds.map((mid) => mid.toLowerCase());
  }

  // Track unmapped keys for warnings
  const checkedKeys = new Set<string>();

  return (menuId: string): boolean => {
    if (!menuId || typeof menuId !== 'string') {
      return false;
    }

    const menuIdLower = menuId.toLowerCase();

    // Direct match (case-insensitive)
    if (allowedKeys.has(menuIdLower)) {
      return true;
    }

    // Check mapping (reverse lookup: check if any permission key maps to this menu ID)
    for (const [permKey, menuIds] of Object.entries(normalizedMap)) {
      if (allowedKeys.has(permKey) && menuIds.includes(menuIdLower)) {
        return true;
      }
    }

    // Development mode: warn about unmapped keys
    if (process.env.NODE_ENV === 'development' && !checkedKeys.has(menuIdLower)) {
      checkedKeys.add(menuIdLower);
      // Only warn if this menuId was checked but not found in allowedKeys or mapping
      // This helps identify missing mappings
      const hasDirectMatch = allowedKeys.has(menuIdLower);
      const hasMappedMatch = Object.entries(normalizedMap).some(
        ([permKey, menuIds]) => allowedKeys.has(permKey) && menuIds.includes(menuIdLower)
      );
      if (!hasDirectMatch && !hasMappedMatch && allowedKeys.size > 0) {
        console.warn(
          `[PermissionHelper] Menu ID "${menuId}" not found in allowedKeys or registry mapping. ` +
            `Allowed keys: ${Array.from(allowedKeys).join(', ')}.`
        );
      }
    }

    return false;
  };
}

/**
 * Check if user can perform an action (new structure)
 *
 * Fine-grained action gating based on permissions.
 *
 * @param permissions - User's permissions array (new structure)
 * @param moduleKey - Module key to check
 * @param pageKey - Optional page key to check
 * @param actionKey - Action key to check
 * @returns true if user can perform the action
 */
export function canPerformAction(
  permissions: Permission[] | undefined | null,
  moduleKey: string,
  pageKey: string | null,
  actionKey: string
): boolean {
  if (!permissions || !Array.isArray(permissions)) {
    return false;
  }

  const normalizedModuleKey = moduleKey.toLowerCase();
  const normalizedPageKey = pageKey ? pageKey.toLowerCase() : null;
  const normalizedActionKey = actionKey.toLowerCase();

  // Find module permission
  const modulePerm = permissions.find((p) => p.key.toLowerCase() === normalizedModuleKey);
  if (!modulePerm || !modulePerm.view) {
    return false;
  }

  // Check page-level actions
  if (normalizedPageKey && modulePerm.pages) {
    const page = modulePerm.pages.find((p) => p.key.toLowerCase() === normalizedPageKey);
    if (page && page.actions) {
      const action = page.actions.find((a) => a.key.toLowerCase() === normalizedActionKey);
      if (action) {
        return action.value === true;
      }
    }
  }

  // Check tab-level actions
  if (normalizedPageKey && modulePerm.tabs) {
    const tab = modulePerm.tabs.find((t) => t.key.toLowerCase() === normalizedPageKey);
    if (tab && tab.actions) {
      const action = tab.actions.find((a) => a.key.toLowerCase() === normalizedActionKey);
      if (action) {
        return action.value === true;
      }
    }
  }

  // Check module-level actions
  if (modulePerm.actions) {
    const action = modulePerm.actions.find((a) => a.key.toLowerCase() === normalizedActionKey);
    if (action) {
      return action.value === true;
    }
  }

  return false;
}

/**
 * Check if user can access a module or page (new structure)
 *
 * @param permissions - User's permissions array (new structure)
 * @param moduleKey - Module key to check
 * @param pageKey - Optional page key to check
 * @returns true if user can access the module/page
 */
export function canAccess(permissions: Permission[] | undefined | null, moduleKey: string, pageKey?: string): boolean {
  if (!permissions || !Array.isArray(permissions)) {
    return false;
  }

  const normalizedModuleKey = moduleKey.toLowerCase();
  const normalizedPageKey = pageKey ? pageKey.toLowerCase() : null;

  // Find module permission
  const modulePerm = permissions.find((p) => p.key.toLowerCase() === normalizedModuleKey);
  if (!modulePerm || !modulePerm.view) {
    return false;
  }

  // If no pageKey specified, module access is sufficient
  if (!normalizedPageKey) {
    return true;
  }

  // Check if page exists in pages array
  if (modulePerm.pages && Array.isArray(modulePerm.pages)) {
    const page = modulePerm.pages.find((p) => p.key.toLowerCase() === normalizedPageKey);
    if (page) {
      return true;
    }
  }

  // Check if page exists in tabs array
  if (modulePerm.tabs && Array.isArray(modulePerm.tabs)) {
    const tab = modulePerm.tabs.find((t) => t.key.toLowerCase() === normalizedPageKey);
    if (tab) {
      return true;
    }
  }

  return false;
}

/**
 * Get module permission (new structure)
 *
 * Returns the permission object for a given module key.
 *
 * @param permissions - User's permissions array (new structure)
 * @param moduleKey - Module key to check
 * @returns Permission object or null if not found
 */
export function getModulePermission(permissions: Permission[] | undefined | null, moduleKey: string): Permission | null {
  if (!permissions || !Array.isArray(permissions)) {
    return null;
  }

  const normalizedKey = moduleKey.toLowerCase();
  return permissions.find((p) => p.key.toLowerCase() === normalizedKey) || null;
}
