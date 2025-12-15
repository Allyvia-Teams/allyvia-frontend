/**
 * Subscription Menu Utilities
 *
 * This file provides utilities to filter menu items based on subscription data from the backend.
 * The available modules come from the backend subscription table, not frontend configuration.
 */

import { buildMenuRoot, requiresPermissionCheck } from 'registry/builders';
import type { NavItemType } from 'types';
import type { SubscriptionStatusResponse } from 'types/subscription';
import type { AvailableModule } from 'types/role';

// Get pages from unified route configuration
const pages = buildMenuRoot();

/**
 * Filter menu items based on available modules from backend subscription data
 *
 * Handles both old format (string[]) and new format (AvailableModule[])
 */
export function getMenuItemsFromSubscription(subscription: SubscriptionStatusResponse | null): NavItemType {
  if (!subscription || !subscription.available_modules || subscription.available_modules.length === 0) {
    // If no subscription or no available modules, return empty menu
    return {
      id: 'root',
      title: '',
      type: 'group',
      children: []
    };
  }

  // Handle both string[] (legacy) and AvailableModule[] (new) formats
  const availableModules = new Set<string>();
  if (subscription.available_modules.length > 0) {
    const firstItem = subscription.available_modules[0];
    if (typeof firstItem === 'string') {
      // Legacy format: string[]
      (subscription.available_modules as string[]).forEach((m: string) => {
        availableModules.add(m.toLowerCase());
      });
    } else {
      // New format: AvailableModule[]
      (subscription.available_modules as AvailableModule[]).forEach((m: AvailableModule) => {
        if (m.key) {
          availableModules.add(m.key.toLowerCase());
        }
      });
    }
  }

  // Build a map of module keys to their page/tab keys from available_modules
  // This allows us to check if a page belongs to an available module
  const moduleToPagesMap = new Map<string, Set<string>>();
  if (subscription.available_modules.length > 0) {
    const firstItem = subscription.available_modules[0];
    if (typeof firstItem !== 'string') {
      // New format: AvailableModule[] - extract pages and tabs for each module
      (subscription.available_modules as AvailableModule[]).forEach((module: AvailableModule) => {
        if (module.key) {
          const moduleKey = module.key.toLowerCase();
          const pageKeys = new Set<string>();

          // Add module key itself
          pageKeys.add(moduleKey);

          // Add all page keys from this module
          if (module.pages && Array.isArray(module.pages)) {
            module.pages.forEach((page) => {
              if (page.key) {
                pageKeys.add(page.key.toLowerCase());
              }
            });
          }

          // Add all tab keys from this module
          if (module.tabs && Array.isArray(module.tabs)) {
            module.tabs.forEach((tab) => {
              if (tab.key) {
                pageKeys.add(tab.key.toLowerCase());
              }
            });
          }

          moduleToPagesMap.set(moduleKey, pageKeys);
        }
      });
    }
  }

  // Helper function to check if a menu ID is available in subscription
  // This checks both direct module keys and page/tab keys within modules
  // Items with requiresPermission: false are always available
  const isMenuIdAvailable = (menuId: string): boolean => {
    if (!menuId) return false;

    // Always show items that don't require permission (e.g., Dashboard)
    if (!requiresPermissionCheck(menuId)) {
      return true;
    }

    const menuIdLower = menuId.toLowerCase();

    // Direct check: is this menu ID in available_modules?
    if (availableModules.has(menuIdLower)) {
      return true;
    }

    // Check if this menu ID is a page/tab within an available module
    // For example: employees-home should be available if employees module is available
    for (const [, pageKeys] of moduleToPagesMap.entries()) {
      if (pageKeys.has(menuIdLower)) {
        return true;
      }
    }

    // Check if this is a child page that maps to a parent module
    // For example: employees-home might map to employees module
    // Check common patterns: employees-home -> employees, inventory-mgmt -> inventory
    if (menuIdLower.startsWith('employees-')) {
      return availableModules.has('employees');
    }
    if (menuIdLower.startsWith('inventory-')) {
      return availableModules.has('inventory');
    }

    return false;
  };

  // Helper function to filter menu items recursively
  const filterMenuItems = (items: NavItemType[]): NavItemType[] => {
    return items
      .map((item) => {
        if (item.type === 'collapse' && item.children) {
          // Normalize keys for comparison (case-insensitive)
          const parentKey = item.id ? item.id.toLowerCase() : null;

          // Check if parent doesn't require permission (always show)
          const parentNoPermissionRequired = item.id ? !requiresPermissionCheck(item.id) : false;

          // Check if parent module is directly in available_modules
          const parentKeyInModules = parentKey ? availableModules.has(parentKey) : false;

          // Also check if parent is available via moduleToPagesMap (for new structure)
          const parentInModuleMap = parentKey ? moduleToPagesMap.has(parentKey) : false;

          const parentIsAvailable = parentKeyInModules || parentInModuleMap;

          // If parent module is available or doesn't require permission, include ALL children
          // This is the key fix: when a module is available, all its pages are available
          let childrenToShow: NavItemType[] = [];

          if (parentNoPermissionRequired || parentIsAvailable) {
            // Parent module is available or doesn't require permission - show ALL children
            // Pages/tabs are included when the parent module is available
            childrenToShow = item.children;
          } else {
            // Parent module not available - check each child individually
            childrenToShow = item.children.filter((child) => {
              if (!child.id) return false;
              return isMenuIdAvailable(child.id);
            });
          }

          // Include the collapse item if:
          // 1. The parent doesn't require permission, OR
          // 2. The parent key itself is in available_modules, OR
          // 3. At least one child is in available_modules
          if (parentNoPermissionRequired || parentIsAvailable || childrenToShow.length > 0) {
            return {
              ...item,
              children: childrenToShow
            };
          }
          return null;
        } else if (item.type === 'item' && item.id) {
          // For regular items, check if the module key is available (case-insensitive)
          // Items that don't require permission are always available
          const isAvailable = isMenuIdAvailable(item.id);
          if (isAvailable) {
            return item;
          }
          return null;
        }
        return null;
      })
      .filter((item): item is NavItemType => item !== null);
  };

  // Filter the root children
  const filteredChildren = pages.children ? filterMenuItems(pages.children) : [];

  return {
    ...pages,
    children: filteredChildren
  };
}

/**
 * Check if a menu item is available in the subscription
 * Handles both string[] (legacy) and AvailableModule[] (new) formats
 */
export function isMenuItemAvailable(menuItemId: string, subscription: SubscriptionStatusResponse | null): boolean {
  if (!subscription || !subscription.available_modules || subscription.available_modules.length === 0) return false;

  const firstItem = subscription.available_modules[0];
  if (typeof firstItem === 'string') {
    // Legacy format: string[]
    return (subscription.available_modules as string[]).includes(menuItemId);
  } else {
    // New format: AvailableModule[]
    return (subscription.available_modules as AvailableModule[]).some((m: AvailableModule) => m.key === menuItemId);
  }
}

/**
 * Get all available menu item IDs from subscription
 * Handles both string[] (legacy) and AvailableModule[] (new) formats
 */
export function getAvailableMenuItemIds(subscription: SubscriptionStatusResponse | null): string[] {
  if (!subscription || !subscription.available_modules) return [];

  const firstItem = subscription.available_modules[0];
  if (typeof firstItem === 'string') {
    // Legacy format: string[]
    return subscription.available_modules as string[];
  } else {
    // New format: AvailableModule[]
    return (subscription.available_modules as AvailableModule[]).map((m: AvailableModule) => m.key);
  }
}
