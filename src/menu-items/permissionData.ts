import { routeConfigs, type PermissionMeta, type PermissionPageMeta } from './routes';

export type ModuleKey = string;

export type PagePermissionKey = string;

export interface PagePermission {
  key: PagePermissionKey;
  moduleKey: ModuleKey;
  displayName: string;
  description?: string;
  requiresManage?: boolean;
  isAction?: boolean;
  isTab?: boolean;
}

interface ModuleDefinition {
  moduleKey: ModuleKey;
  menuId: string;
  title: string;
  permission: PermissionMeta;
}

const moduleDefinitions = new Map<ModuleKey, ModuleDefinition>();

function mergePageCollections(target: PermissionPageMeta[] = [], incoming: PermissionPageMeta[] = []): PermissionPageMeta[] {
  const map = new Map<string, PermissionPageMeta>();
  target.forEach((page) => map.set(page.id, page));
  incoming.forEach((page) => {
    const existing = map.get(page.id);
    if (existing) {
      map.set(page.id, {
        ...existing,
        ...page,
        actions: mergeActions(existing.actions, page.actions)
      });
    } else {
      map.set(page.id, {
        ...page,
        actions: mergeActions([], page.actions)
      });
    }
  });
  return Array.from(map.values());
}

function mergeActions(target: PermissionMeta['actions'] = [], incoming: PermissionMeta['actions'] = []): PermissionMeta['actions'] {
  if (!incoming || incoming.length === 0) return target;
  const map = new Map<string, { id: string; title: string; description?: string }>();
  target?.forEach((action) => map.set(action.id, action));
  incoming?.forEach((action) => {
    if (!map.has(action.id)) {
      map.set(action.id, action);
    }
  });
  return Array.from(map.values() || []);
}

function mergePermissionMeta(existing: PermissionMeta = {}, incoming: PermissionMeta = {}): PermissionMeta {
  return {
    moduleKey: incoming.moduleKey ?? existing.moduleKey,
    supportsView: incoming.supportsView ?? existing.supportsView ?? true,
    supportsManage: incoming.supportsManage ?? existing.supportsManage ?? false,
    description: incoming.description ?? existing.description,
    pages: mergePageCollections(existing.pages, incoming.pages),
    tabs: mergePageCollections(existing.tabs, incoming.tabs),
    actions: mergeActions(existing.actions, incoming.actions)
  };
}

function registerModule(menuId: string, title: string, permission?: PermissionMeta) {
  if (!permission || !permission.moduleKey) return;
  const moduleKey = permission.moduleKey;
  const existing = moduleDefinitions.get(moduleKey);
  if (existing) {
    moduleDefinitions.set(moduleKey, {
      ...existing,
      title: existing.title || title,
      permission: mergePermissionMeta(existing.permission, permission)
    });
  } else {
    moduleDefinitions.set(moduleKey, {
      moduleKey,
      menuId,
      title,
      permission: mergePermissionMeta({ moduleKey }, permission)
    });
  }
}

function traverseRoutes(routes: typeof routeConfigs): void {
  routes.forEach((route) => {
    registerModule(route.menuId, route.title, route.permission);
    if (route.children && route.children.length > 0) {
      traverseRoutes(route.children);
    }
  });
}

traverseRoutes(routeConfigs);

export const MODULE_DISPLAY_NAMES: Record<ModuleKey, string> = Object.fromEntries(
  Array.from(moduleDefinitions.values()).map((module) => [module.moduleKey, module.title])
);

export const ALL_MODULE_KEYS: ModuleKey[] = Object.keys(MODULE_DISPLAY_NAMES);

export const MODULES_WITH_MANAGE: ModuleKey[] = Array.from(moduleDefinitions.values())
  .filter((module) => module.permission.supportsManage)
  .map((module) => module.moduleKey);

export const VIEW_ONLY_MODULES: ModuleKey[] = Array.from(moduleDefinitions.values())
  .filter((module) => !module.permission.supportsManage)
  .map((module) => module.moduleKey);

export function hasManageCapability(moduleKey: string): boolean {
  return MODULES_WITH_MANAGE.includes(moduleKey);
}

export function getModuleDisplayName(moduleKey: string): string {
  return MODULE_DISPLAY_NAMES[moduleKey] || moduleKey;
}

function buildPagePermissions(): Record<PagePermissionKey, PagePermission> {
  const permissions: Record<PagePermissionKey, PagePermission> = {};

  moduleDefinitions.forEach((module) => {
    const moduleKey = module.moduleKey;
    const displayName = module.title;

    permissions[`${moduleKey}-view`] = {
      key: `${moduleKey}-view`,
      moduleKey,
      displayName,
      description: module.permission.description,
      requiresManage: false
    };

    module.permission.pages?.forEach((page) => {
      permissions[page.id] = {
        key: page.id,
        moduleKey,
        displayName: page.title,
        description: page.description,
        requiresManage: page.requiresManage
      };
    });

    module.permission.tabs?.forEach((tab) => {
      permissions[tab.id] = {
        key: tab.id,
        moduleKey,
        displayName: tab.title,
        description: tab.description,
        isTab: true
      };

      tab.actions?.forEach((action) => {
        permissions[action.id] = {
          key: action.id,
          moduleKey,
          displayName: action.title,
          description: action.description,
          isAction: true
        };
      });
    });

    module.permission.actions?.forEach((action) => {
      permissions[action.id] = {
        key: action.id,
        moduleKey,
        displayName: action.title,
        description: action.description,
        isAction: true,
        requiresManage: true
      };
    });
  });

  return permissions;
}

export const PAGE_PERMISSIONS: Record<PagePermissionKey, PagePermission> = buildPagePermissions();

export function getPagePermissionsForModule(moduleKey: ModuleKey): PagePermission[] {
  return Object.values(PAGE_PERMISSIONS).filter((perm) => perm.moduleKey === moduleKey);
}

export function getAllPagePermissions(): PagePermission[] {
  return Object.values(PAGE_PERMISSIONS);
}

export const MODULE_TO_PAGES: Record<ModuleKey, PagePermissionKey[]> = Array.from(moduleDefinitions.values()).reduce(
  (acc, module) => {
    const keys: PagePermissionKey[] = [`${module.moduleKey}-view`];

    module.permission.pages?.forEach((page) => {
      keys.push(page.id);
      page.actions?.forEach((action) => keys.push(action.id));
    });

    module.permission.tabs?.forEach((tab) => {
      keys.push(tab.id);
      tab.actions?.forEach((action) => keys.push(action.id));
    });

    module.permission.actions?.forEach((action) => keys.push(action.id));

    acc[module.moduleKey] = keys;
    return acc;
  },
  {} as Record<ModuleKey, PagePermissionKey[]>
);

export function requiresManagePermission(pageKey: PagePermissionKey): boolean {
  return PAGE_PERMISSIONS[pageKey]?.requiresManage || false;
}

export function isActionPermission(pageKey: PagePermissionKey): boolean {
  return PAGE_PERMISSIONS[pageKey]?.isAction || false;
}

export function getPagePermissionDisplayName(pageKey: PagePermissionKey): string {
  return PAGE_PERMISSIONS[pageKey]?.displayName || pageKey;
}

export function convertToModuleStructure(
  permissions: Array<{ key: string; view: boolean; manage: boolean; pages?: Record<string, boolean>; actions?: Record<string, boolean> }>
): Record<string, { view: boolean; manage: boolean; pages?: Record<string, boolean>; actions?: Record<string, boolean> }> {
  const result: Record<string, { view: boolean; manage: boolean; pages?: Record<string, boolean>; actions?: Record<string, boolean> }> = {};

  permissions.forEach((perm) => {
    result[perm.key] = {
      view: perm.view,
      manage: perm.manage,
      ...(perm.pages && { pages: perm.pages }),
      ...(perm.actions && { actions: perm.actions })
    };
  });

  return result;
}

export function convertFromModuleStructure(
  structure: Record<string, { view: boolean; manage: boolean; pages?: Record<string, boolean>; actions?: Record<string, boolean> }>
): Array<{ key: string; view: boolean; manage: boolean; pages?: Record<string, boolean>; actions?: Record<string, boolean> }> {
  return Object.entries(structure).map(([key, value]) => ({
    key,
    view: value.view,
    manage: value.manage,
    ...(value.pages && { pages: value.pages }),
    ...(value.actions && { actions: value.actions })
  }));
}
