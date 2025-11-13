/**
 * Route Utilities
 *
 * Utility functions for working with route configurations:
 * - Converting routes to React Router format
 * - Generating menu items from routes
 * - Finding routes by path or menuId
 */

import React, { ComponentType } from 'react';
import { NavItemType } from 'types';
import ProtectedRoute from 'routes/guards/ProtectedRoute';
import { routeConfigs, type RouteConfig } from './routes';

/**
 * Convert RouteConfig to React Router route element
 */
export function createRouteElement(config: RouteConfig): React.ReactElement {
  const { component: Component, requiresPermission = true, menuIdForPermission, menuId } = config;

  // If permission is required, wrap with ProtectedRoute
  if (requiresPermission) {
    const permissionMenuId = menuIdForPermission || menuId;
    const ComponentElement = React.createElement(Component);
    return React.createElement(ProtectedRoute, { menuId: permissionMenuId, children: ComponentElement });
  }

  // Otherwise, render component directly
  return React.createElement(Component);
}

/**
 * Convert RouteConfig to React Router route object
 */
export function createRouteObject(config: RouteConfig): any {
  const { path, children: childConfigs } = config;

  const route: any = {
    path,
    element: createRouteElement(config)
  };

  // Recursively process children
  if (childConfigs && childConfigs.length > 0) {
    route.children = childConfigs.map(createRouteObject);
  }

  return route;
}

/**
 * Convert RouteConfig to NavItemType for menu rendering
 */
export function createMenuItems(configs: RouteConfig[]): NavItemType[] {
  const menuItems: NavItemType[] = [];

  for (const config of configs) {
    // Skip hidden items and dev-only items in production
    if (config.hidden || (config.devOnly && import.meta.env.PROD)) {
      continue;
    }

    const { menuId, title, icon, type = 'item', path, children: childConfigs } = config;

    const menuItem: NavItemType = {
      id: menuId,
      title,
      url: path,
      type: type === 'collapse' ? 'collapse' : 'item',
      icon: icon || undefined
    };

    // Add children if this is a collapse item
    if (type === 'collapse' && childConfigs && childConfigs.length > 0) {
      menuItem.children = createMenuItems(childConfigs);
    }

    menuItems.push(menuItem);
  }

  return menuItems;
}

/**
 * Get route config by path
 */
export function getRouteConfigByPath(path: string): RouteConfig | undefined {
  function findInConfigs(configs: RouteConfig[]): RouteConfig | undefined {
    for (const config of configs) {
      if (config.path === path) {
        return config;
      }
      if (config.children) {
        const found = findInConfigs(config.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  return findInConfigs(routeConfigs);
}

/**
 * Get route config by menuId
 */
export function getRouteConfigByMenuId(menuId: string): RouteConfig | undefined {
  function findInConfigs(configs: RouteConfig[]): RouteConfig | undefined {
    for (const config of configs) {
      if (config.menuId === menuId) {
        return config;
      }
      if (config.children) {
        const found = findInConfigs(config.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  return findInConfigs(routeConfigs);
}

/**
 * Get all menu items (for pages.ts replacement)
 */
export function getMenuItems(): NavItemType {
  return {
    id: 'root',
    title: '',
    type: 'group',
    children: createMenuItems(routeConfigs)
  };
}

/**
 * Get permission key to menu ID mapping (for route-mapping.ts replacement)
 */
export function getPermissionKeyToMenuIdMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  function processConfig(config: RouteConfig) {
    const permissionKey = config.permissionKey || config.menuId;
    if (!map[permissionKey]) {
      map[permissionKey] = [];
    }
    if (!map[permissionKey].includes(config.menuId)) {
      map[permissionKey].push(config.menuId);
    }

    if (config.children) {
      config.children.forEach(processConfig);
    }
  }

  routeConfigs.forEach(processConfig);

  return map;
}
