/**
 * Route Mapping Configuration
 *
 * Maps permission keys and menu IDs to their corresponding routes.
 * This ensures consistency between the permission JSON structure,
 * menu items, and route definitions.
 */

export interface RouteMapping {
  path: string;
  permissionKey: string;
  menuId?: string;
  description?: string;
}

/**
 * Route mappings for all pages
 * Maps permission keys from the JSON structure to actual routes
 */
export const routeMappings: RouteMapping[] = [
  // Dashboard
  { path: '/dashboard', permissionKey: 'dashboard', menuId: 'dashboard', description: 'Dashboard' },

  // Integrations
  { path: '/integrations', permissionKey: 'integrations', menuId: 'integrations', description: 'Integrations' },
  { path: '/integrations/quickbooks', permissionKey: 'integrations', menuId: 'integrations', description: 'QuickBooks Integration' },

  // Finance
  { path: '/finance', permissionKey: 'finance', menuId: 'finance', description: 'Finance & Accounting' },
  { path: '/expense/bills', permissionKey: 'finance', menuId: 'finance', description: 'Expense Bills' },

  // Employees
  { path: '/employees', permissionKey: 'employees-home', menuId: 'employees-home', description: 'Employee Directory' },
  { path: '/employees/clock', permissionKey: 'employees-clock', menuId: 'employees-clock', description: 'Clock In/Out' },

  // CRM
  { path: '/crm', permissionKey: 'crm', menuId: 'crm', description: 'CRM' },

  // Community
  { path: '/community', permissionKey: 'community', menuId: 'community', description: 'Community Networking' },

  // Inventory
  // Note: JSON uses 'inventory-home' but menu uses 'inventory-mgmt' - both map to /inventory
  { path: '/inventory', permissionKey: 'inventory-home', menuId: 'inventory-mgmt', description: 'Inventory Management' },
  { path: '/inventory/update', permissionKey: 'inventory-update', menuId: 'inventory-update', description: 'Update Inventory' },

  // Documents
  { path: '/documents', permissionKey: 'documents', menuId: 'documents', description: 'Documents' },

  // Settings
  { path: '/settings', permissionKey: 'settings', menuId: 'settings', description: 'Settings' },

  // Analytics
  { path: '/analytics', permissionKey: 'analytics', menuId: 'analytics', description: 'Analytics' },

  // Calendar
  { path: '/calendar', permissionKey: 'calendar', menuId: 'calendar', description: 'Calendar' },

  // Insights
  { path: '/insights', permissionKey: 'insights', menuId: 'insights', description: 'AI Insights' },

  // Marketing
  { path: '/marketing', permissionKey: 'marketing', menuId: 'marketing', description: 'Marketing Tools' },

  // Profile
  { path: '/me', permissionKey: 'settings', menuId: 'settings', description: 'My Profile' },

  // Auth
  { path: '/auth/google-drive/callback', permissionKey: 'integrations', menuId: 'integrations', description: 'Google Drive Callback' }
];

/**
 * Get route path by permission key
 */
export function getRouteByPermissionKey(permissionKey: string): string | undefined {
  const mapping = routeMappings.find((m) => m.permissionKey === permissionKey);
  return mapping?.path;
}

/**
 * Get route path by menu ID
 */
export function getRouteByMenuId(menuId: string): string | undefined {
  const mapping = routeMappings.find((m) => m.menuId === menuId);
  return mapping?.path;
}

/**
 * Get permission key by route path
 */
export function getPermissionKeyByRoute(path: string): string | undefined {
  const mapping = routeMappings.find((m) => m.path === path);
  return mapping?.permissionKey;
}

/**
 * Get menu ID by route path
 */
export function getMenuIdByRoute(path: string): string | undefined {
  const mapping = routeMappings.find((m) => m.path === path);
  return mapping?.menuId;
}

/**
 * Permission key to menu ID mapping
 * Used for navigation filtering when permission keys don't match menu IDs
 *
 * This maps permission keys from the JSON structure to menu IDs from pages.ts
 */
export const permissionKeyToMenuIdMap: Record<string, string[]> = {
  // Employees mappings
  // Module key 'employees' maps to collapse menu item 'employees'
  employees: ['employees'], // Module key maps to collapse menu item
  'employees-mgmt': ['employees-home'], // employees-mgmt permission (from backend) -> employees-home menu (Directory)
  'employees-home': ['employees-home'], // Direct match
  'employees-clock': ['employees-clock'], // Direct match

  // Inventory mappings
  // Module key 'inventory' maps to collapse menu item 'inventory'
  inventory: ['inventory'], // Module key maps to collapse menu item
  // JSON uses 'inventory-home' but menu uses 'inventory-mgmt' - both refer to the same page
  'inventory-home': ['inventory-mgmt'], // inventory-home permission (from JSON) -> inventory-mgmt menu ID
  'inventory-mgmt': ['inventory-mgmt'], // Alternative key that might be used
  'inventory-update': ['inventory-update'] // Direct match
};
