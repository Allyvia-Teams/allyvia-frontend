import React from 'react';
import type { ReactElement } from 'react';
import type { NavItemType } from 'types';
import type { RegistryNode } from 'types/registry';
import ProtectedRoute from 'routes/guards/ProtectedRoute';
import { APP_REGISTRY } from './index';

type RouteDescriptor = {
  path: string;
  element: ReactElement;
};

type ModuleDefinition = {
  key: string;
  title: string;
  supportsView: boolean;
  supportsManage: boolean;
};

type PermissionDisplay = {
  key: string;
  title: string;
  moduleKey: string;
  isAction?: boolean;
};

const moduleDefinitions = new Map<string, ModuleDefinition>();
const permissionDisplays = new Map<string, PermissionDisplay>();

const addDisplay = (key: string | undefined, title: string, moduleKey: string, isAction = false) => {
  if (!key) return;
  permissionDisplays.set(key.toLowerCase(), { key: key.toLowerCase(), title, moduleKey, isAction });
};

const addModule = (key: string, title: string, node: RegistryNode) => {
  const normalizedKey = key.toLowerCase();
  if (!moduleDefinitions.has(normalizedKey)) {
    moduleDefinitions.set(normalizedKey, {
      key: normalizedKey,
      title,
      supportsView: node.supportsView ?? true,
      supportsManage: node.supportsManage ?? false
    });
  }
};

function hydrateMetadata() {
  const traverse = (nodes: RegistryNode[], currentModuleKey?: string, currentModuleTitle?: string) => {
    nodes.forEach((node) => {
      const effectiveModuleKey = node.moduleKey ?? currentModuleKey ?? node.menuId;
      if (node.type === 'module') {
        const moduleKey = node.moduleKey ?? node.menuId;
        addModule(moduleKey, node.title, node);
        traverse(node.children ?? [], moduleKey, node.title);
        return;
      }

      if (node.moduleKey) {
        addModule(node.moduleKey, currentModuleTitle ?? node.title, node);
      } else if (effectiveModuleKey) {
        addModule(effectiveModuleKey, currentModuleTitle ?? node.title, node);
      }

      const moduleKeyForDisplay = (node.moduleKey ?? currentModuleKey ?? node.menuId).toLowerCase();
      addDisplay(node.menuId, node.title, moduleKeyForDisplay);

      if (node.permissionKey && node.permissionKey !== node.menuId) {
        addDisplay(node.permissionKey, node.title, moduleKeyForDisplay);
      }

      node.tabs?.forEach((tab) => {
        addDisplay(tab.key, tab.title ?? tab.key, moduleKeyForDisplay);
        tab.actions?.forEach((action) => {
          addDisplay(action.key, action.title ?? action.key, moduleKeyForDisplay, true);
        });
      });

      node.actions?.forEach((action) => {
        addDisplay(action.key, action.title ?? action.key, moduleKeyForDisplay, true);
      });
    });
  };

  traverse(APP_REGISTRY);
}

hydrateMetadata();

const addMapping = (map: Record<string, string[]>, key: string | undefined, menuId: string) => {
  if (!key) return;
  const normalizedKey = key.toLowerCase();
  if (!map[normalizedKey]) {
    map[normalizedKey] = [];
  }
  if (!map[normalizedKey].includes(menuId)) {
    map[normalizedKey].push(menuId);
  }
};

function buildPermissionMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  const walk = (nodes: RegistryNode[]) => {
    nodes.forEach((node) => {
      if (node.type === 'module') {
        addMapping(map, node.moduleKey ?? node.menuId, node.menuId);
        walk(node.children ?? []);
        return;
      }

      addMapping(map, node.menuId, node.menuId);
      addMapping(map, node.permissionKey, node.menuId);
    });
  };

  walk(APP_REGISTRY);

  return map;
}

export const permissionKeyToMenuIdMap = buildPermissionMap();

function createRouteElement(node: RegistryNode): ReactElement {
  if (!node.component) {
    throw new Error(`Route node "${node.menuId}" is missing a component.`);
  }

  const Component = node.component;

  if (node.requiresPermission === false) {
    return React.createElement(Component);
  }

  const guardMenuId = node.permissionKey ?? node.menuId;
  return React.createElement(ProtectedRoute, {
    menuId: guardMenuId,
    children: React.createElement(Component)
  });
}

export function buildRoutes(): RouteDescriptor[] {
  const routes: RouteDescriptor[] = [];

  const collect = (nodes: RegistryNode[]) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0 && node.type === 'module') {
        collect(node.children);
      }

      if (node.type === 'page' && node.path && node.component) {
        routes.push({
          path: node.path,
          element: createRouteElement(node)
        });
      }
    });
  };

  collect(APP_REGISTRY);

  return routes;
}

function nodeToMenuItem(node: RegistryNode): NavItemType | null {
  if (node.hidden || (node.devOnly && import.meta.env.PROD)) {
    return null;
  }

  if (node.type === 'module') {
    const children = (node.children ?? []).map(nodeToMenuItem).filter(Boolean) as NavItemType[];
    if (!children.length) {
      return null;
    }
    return {
      id: node.menuId,
      title: node.title,
      type: 'collapse',
      icon: node.icon,
      children
    };
  }

  if (!node.path) {
    return null;
  }

  return {
    id: node.menuId,
    title: node.title,
    type: 'item',
    url: node.path,
    icon: node.icon
  };
}

export function buildMenuRoot(): NavItemType {
  const children = APP_REGISTRY.map(nodeToMenuItem).filter(Boolean) as NavItemType[];
  return {
    id: 'root',
    title: '',
    type: 'group',
    children
  };
}

export function buildMenuItems(): NavItemType[] {
  return buildMenuRoot().children ?? [];
}

export type ModuleKey = string;

export const MODULE_DISPLAY_NAMES: Record<ModuleKey, string> = Array.from(moduleDefinitions.values()).reduce(
  (acc, module) => {
    acc[module.key] = module.title;
    return acc;
  },
  {} as Record<string, string>
);

export function getModuleDisplayName(moduleKey: string): string {
  return MODULE_DISPLAY_NAMES[moduleKey.toLowerCase()] || moduleKey;
}

export function getPagePermissionDisplayName(key: string): string {
  const normalized = key?.toLowerCase();
  return permissionDisplays.get(normalized)?.title || key;
}

// Map of menuId to requiresPermission flag
const requiresPermissionMap = new Map<string, boolean>();

function buildRequiresPermissionMap() {
  const traverse = (nodes: RegistryNode[]) => {
    nodes.forEach((node) => {
      requiresPermissionMap.set(node.menuId.toLowerCase(), node.requiresPermission !== false);
      if (node.children) {
        traverse(node.children);
      }
    });
  };
  traverse(APP_REGISTRY);
}

// Initialize the map
buildRequiresPermissionMap();

/**
 * Check if a menu item requires permission check
 * Returns false if the item has requiresPermission: false in the registry
 */
export function requiresPermissionCheck(menuId: string): boolean {
  if (!menuId) return true; // Default to requiring permission if no menuId
  return requiresPermissionMap.get(menuId.toLowerCase()) ?? true; // Default to true if not found
}
