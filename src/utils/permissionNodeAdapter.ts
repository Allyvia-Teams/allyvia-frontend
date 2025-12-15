/**
 * Permission Node Adapter
 *
 * Converts between the unified PermissionNode structure (used in UI)
 * and the Permission[] structure (used in API)
 */

import type { AvailableModule, PagePermission, TabPermission, ActionPermission, Permission, ManageValue } from 'types/role';
import { getPagePermissionDisplayName, getModuleDisplayName } from 'registry/builders';

// Helper to check if manage is supported (not "-")
function supportsManage(manage: ManageValue): boolean {
  return manage !== '-' && manage !== false && manage !== 'false';
}

// ===========================
// Types (matching the component)
// ===========================

export type Access = { view: boolean; manage: boolean };

export type Capabilities = {
  supportsView: boolean;
  supportsManage: boolean;
  isTab?: boolean;
};

export type NodeLevel = 'module' | 'page' | 'action';

export interface UIPermissionNode {
  key: string;
  label: string;
  level: NodeLevel;
  access: Access;
  capabilities: Capabilities;
  children?: UIPermissionNode[];
  _collapsedChildKey?: string; // Internal: track original child key if this was collapsed
}

// ===========================
// Convert AvailableModule[] to UIPermissionNode[]
// ===========================

export function availableModulesToUITree(modules: AvailableModule[]): UIPermissionNode[] {
  return modules.map((module) => {
    const node: UIPermissionNode = {
      key: module.key,
      label: module.moduleName || getModuleDisplayName(module.key),
      level: 'module',
      access: { view: false, manage: false },
      capabilities: {
        supportsView: module.view !== false,
        supportsManage: supportsManage(module.manage)
      }
    };

    const children: UIPermissionNode[] = [];

    // Process tabs (array format from API) - group under "Tabs" parent
    // Note: In new structure, tabs don't have view/manage - they inherit from parent module
    if (module.tabs && Array.isArray(module.tabs) && module.tabs.length > 0) {
      const tabsChildren: UIPermissionNode[] = module.tabs.map((tab: TabPermission) => {
        // Collect tab actions as child nodes
        const tabActionNodes: UIPermissionNode[] = [];
        if (tab.actions && Array.isArray(tab.actions)) {
          tab.actions.forEach((action: ActionPermission) => {
            tabActionNodes.push({
              key: action.key.toLowerCase(),
              label: action.displayName || getPagePermissionDisplayName(action.key.toLowerCase() as any),
              level: 'action',
              access: { view: false, manage: false },
              capabilities: {
                supportsView: false, // Actions don't have view
                supportsManage: action.value === true // Actions use value (boolean)
              }
            });
          });
        }

        return {
          key: tab.key.toLowerCase(),
          label: getPagePermissionDisplayName(tab.key.toLowerCase() as any),
          level: 'page', // Tabs are treated as pages in the UI
          access: { view: false, manage: false },
          capabilities: {
            supportsView: module.view !== false, // Tabs inherit view capability from parent module
            supportsManage: supportsManage(module.manage), // Tabs inherit manage capability from parent module
            isTab: true // Mark as tab
          },
          children: tabActionNodes.length > 0 ? tabActionNodes : undefined
        };
      });

      // Create a "Tabs" parent node
      const tabsGroupNode: UIPermissionNode = {
        key: `${module.key}-tabs`,
        label: 'Tabs',
        level: 'page', // Group node
        access: { view: false, manage: false },
        capabilities: {
          supportsView: true, // Tabs group can be viewed if any tab is viewable
          supportsManage: tabsChildren.some((t) => t.capabilities.supportsManage) // Tabs group can be managed if any tab is manageable
        },
        children: tabsChildren
      };

      children.push(tabsGroupNode);
    }

    // Process pages (array format from API) - process once only
    // Note: In new structure, pages don't have view/manage - they inherit from parent module
    if (module.pages && Array.isArray(module.pages) && module.pages.length > 0) {
      const pageNodes: UIPermissionNode[] = module.pages.map((page: PagePermission) => {
        // Collect page actions as child nodes
        const pageActionNodes: UIPermissionNode[] = [];
        if (page.actions && Array.isArray(page.actions)) {
          page.actions.forEach((action: ActionPermission) => {
            pageActionNodes.push({
              key: action.key.toLowerCase(),
              label: action.displayName || getPagePermissionDisplayName(action.key.toLowerCase() as any),
              level: 'action',
              access: { view: false, manage: false },
              capabilities: {
                supportsView: false, // Actions don't have view
                supportsManage: action.value === true // Actions use value (boolean)
              }
            });
          });
        }

        return {
          key: page.key.toLowerCase(),
          label: getPagePermissionDisplayName(page.key.toLowerCase() as any),
          level: 'page',
          access: { view: false, manage: false },
          capabilities: {
            supportsView: module.view !== false, // Pages inherit view capability from parent module
            supportsManage: supportsManage(module.manage), // Pages inherit manage capability from parent module
            isTab: false // Pages are not tabs
          },
          children: pageActionNodes.length > 0 ? pageActionNodes : undefined
        };
      });

      children.push(...pageNodes);
    }

    // Process module-level actions (array format from API in new structure)
    if (module.actions && Array.isArray(module.actions)) {
      const actionNodes: UIPermissionNode[] = module.actions.map((action: ActionPermission) => ({
        key: action.key.toLowerCase(),
        label: action.displayName || getPagePermissionDisplayName(action.key.toLowerCase() as any),
        level: 'action' as const,
        access: { view: false, manage: false },
        capabilities: {
          supportsView: false, // Actions don't have view
          supportsManage: action.value === true // Actions use value (boolean)
        }
      }));

      // Add actions directly to children (they will be displayed as a section in the UI)
      children.push(...actionNodes);
    } else if (module.actions && typeof module.actions === 'object' && !Array.isArray(module.actions)) {
      // Legacy format: object format from API: {"security-manage-pins": true}
      const actionNodes: UIPermissionNode[] = Object.entries(module.actions).map(([actionKey, actionValue]) => {
        // actionValue is boolean (true means manage is available)
        const manageAvailable = actionValue === true;
        return {
          key: actionKey.toLowerCase(),
          label: getPagePermissionDisplayName(actionKey.toLowerCase() as any),
          level: 'action' as const,
          access: { view: false, manage: false },
          capabilities: {
            supportsView: false, // Actions typically don't have view, only manage
            supportsManage: manageAvailable
          }
        };
      });

      // Add actions directly to children (they will be displayed as a section in the UI)
      children.push(...actionNodes);
    }

    if (children.length > 0) {
      node.children = children;
    }

    return node;
  });
}

// ===========================
// Convert Permission[] to UIPermissionNode[] (NEW STRUCTURE - for editing)
// ===========================

/**
 * Convert new Permission[] structure to UI tree
 * This is the new API format with pages, tabs, and actions as arrays
 */
export function permissionsToUITree(permissions: Permission[]): UIPermissionNode[] {
  return permissions.map((perm) => {
    const node: UIPermissionNode = {
      key: perm.key,
      label: getModuleDisplayName(perm.key),
      level: 'module',
      access: { view: perm.view, manage: perm.manage },
      capabilities: {
        supportsView: true,
        supportsManage: perm.manage !== undefined && perm.manage !== false
      }
    };

    const pageNodes: UIPermissionNode[] = [];
    const tabNodes: UIPermissionNode[] = [];
    const actionNodes: UIPermissionNode[] = [];

    // Process pages (array format from API)
    if (perm.pages && Array.isArray(perm.pages)) {
      perm.pages.forEach((page: PagePermission) => {
        // Convert page actions to action nodes
        const pageActionNodes: UIPermissionNode[] = [];
        if (page.actions && Array.isArray(page.actions)) {
          page.actions.forEach((action: ActionPermission) => {
            pageActionNodes.push({
              key: action.key,
              label: action.displayName || getPagePermissionDisplayName(action.key as any),
              level: 'action',
              access: { view: false, manage: action.value },
              capabilities: {
                supportsView: false,
                supportsManage: action.value === true
              }
            });
          });
        }

        // Create page node (pages don't have view/manage in new structure, they're included if parent has view)
        const pageNode: UIPermissionNode = {
          key: page.key,
          label: page.displayName || getPagePermissionDisplayName(page.key as any),
          level: 'page',
          access: { view: perm.view, manage: perm.manage }, // Pages inherit from parent module
          capabilities: {
            supportsView: true,
            supportsManage: perm.manage === true,
            isTab: false
          },
          children: pageActionNodes.length > 0 ? pageActionNodes : undefined
        };

        pageNodes.push(pageNode);
      });
    }

    // Process tabs (array format from API)
    if (perm.tabs && Array.isArray(perm.tabs)) {
      perm.tabs.forEach((tab: TabPermission) => {
        // Convert tab actions to action nodes
        const tabActionNodes: UIPermissionNode[] = [];
        if (tab.actions && Array.isArray(tab.actions)) {
          tab.actions.forEach((action: ActionPermission) => {
            tabActionNodes.push({
              key: action.key,
              label: action.displayName || getPagePermissionDisplayName(action.key as any),
              level: 'action',
              access: { view: false, manage: action.value },
              capabilities: {
                supportsView: false,
                supportsManage: action.value === true
              }
            });
          });
        }

        // Create tab node
        const tabNode: UIPermissionNode = {
          key: tab.key,
          label: tab.displayName || getPagePermissionDisplayName(tab.key as any),
          level: 'page',
          access: { view: perm.view, manage: perm.manage }, // Tabs inherit from parent module
          capabilities: {
            supportsView: true,
            supportsManage: perm.manage === true,
            isTab: true
          },
          children: tabActionNodes.length > 0 ? tabActionNodes : undefined
        };

        tabNodes.push(tabNode);
      });
    }

    // Process module-level actions (array format from API)
    if (perm.actions && Array.isArray(perm.actions)) {
      perm.actions.forEach((action: ActionPermission) => {
        actionNodes.push({
          key: action.key,
          label: action.displayName || getPagePermissionDisplayName(action.key as any),
          level: 'action',
          access: { view: false, manage: action.value },
          capabilities: {
            supportsView: false,
            supportsManage: action.value === true
          }
        });
      });
    }

    const children: UIPermissionNode[] = [];

    // Group tabs under "Tabs" parent if they exist
    if (tabNodes.length > 0) {
      const tabsGroupNode: UIPermissionNode = {
        key: `${perm.key}-tabs`,
        label: 'Tabs',
        level: 'page',
        access: { view: false, manage: false },
        capabilities: {
          supportsView: tabNodes.some((t) => t.capabilities.supportsView),
          supportsManage: tabNodes.some((t) => t.capabilities.supportsManage)
        },
        children: tabNodes
      };
      children.push(tabsGroupNode);
    }

    // Add pages directly
    children.push(...pageNodes);

    // Add module-level actions directly to children
    if (actionNodes.length > 0) {
      children.push(...actionNodes);
    }

    // Don't collapse if there are group nodes (Tabs) or actions or multiple children
    // Only collapse single view-only pages that are not tabs and not group nodes
    const hasActions = children.some((c) => c.level === 'action');
    if (
      children.length === 1 &&
      children[0].level === 'page' &&
      !children[0].capabilities.supportsManage &&
      !children[0].key.endsWith('-tabs') &&
      !children[0].capabilities.isTab &&
      !node.capabilities.supportsManage &&
      !hasActions
    ) {
      const onlyChild = children[0];
      // Merge child capabilities into parent
      node.capabilities = {
        ...node.capabilities,
        supportsView: onlyChild.capabilities.supportsView,
        supportsManage: onlyChild.capabilities.supportsManage,
        isTab: onlyChild.capabilities.isTab
      };
      // Merge access state (child state becomes parent state)
      node.access = { ...onlyChild.access };
      // Store the original child key so we can reconstruct it when converting to API format
      node._collapsedChildKey = onlyChild.key;
      // Don't add children - the parent represents the single child
      return node;
    }

    if (children.length > 0) {
      node.children = children;
    }

    return node;
  });
}

// ===========================
// Convert UIPermissionNode[] to Permission[] (for API)
// ===========================

/**
 * Convert UI tree to Permission[] structure
 * This is the API format with pages, tabs, and actions as arrays
 *
 * IMPORTANT: Pages/tabs are only included in the array if the parent module has view: true
 * AND the page/tab is explicitly enabled in the UI (access.view === true)
 * Actions are included if they have value: true (access.manage === true)
 */
export function uiTreeToPermissionsFormat(tree: UIPermissionNode[]): Permission[] {
  return tree
    .filter((node) => node.access.view || node.access.manage) // Only include modules with view or manage enabled
    .map((node) => {
      const permission: Permission = {
        key: node.key,
        view: node.access.view,
        manage: node.access.manage,
        pages: [],
        tabs: [],
        actions: []
      };

      // Helper to recursively collect pages, tabs, and actions
      // Only include pages/tabs if parent module has view: true AND page/tab is enabled
      const collectChildren = (
        children: UIPermissionNode[],
        pages: PagePermission[],
        tabs: TabPermission[],
        actions: ActionPermission[]
      ) => {
        children.forEach((child) => {
          // Skip tabs group node (it's just a container for tabs)
          if (child.key.endsWith('-tabs')) {
            // Process children of tabs group node (these are the actual tabs)
            if (child.children && child.children.length > 0) {
              collectChildren(child.children, pages, tabs, actions);
            }
            return;
          }

          // Determine if it's a page, tab, or action
          if (child.level === 'action' || child.key.includes('security-') || child.key.startsWith('manage-')) {
            // Actions: only include if enabled (value: true means access.manage === true)
            if (child.access.manage) {
              actions.push({
                key: child.key,
                value: true, // Actions use value (boolean) instead of view/manage
                displayName: getPagePermissionDisplayName(child.key as any)
              });
            }
          } else if (child.capabilities.isTab) {
            // Tabs: include if parent module has view (tabs inherit accessibility from parent)
            // In new structure, tabs are included in array if parent has view: true
            if (node.access.view && child.access.view) {
              const tabActions: ActionPermission[] = [];
              // Collect nested actions if any (only include enabled actions with value: true)
              if (child.children && child.children.length > 0) {
                child.children.forEach((actionChild) => {
                  if (actionChild.level === 'action' && actionChild.access.manage) {
                    tabActions.push({
                      key: actionChild.key,
                      value: true, // Actions use value: boolean
                      displayName: getPagePermissionDisplayName(actionChild.key as any)
                    });
                  }
                });
              }
              tabs.push({
                key: child.key,
                displayName: getPagePermissionDisplayName(child.key as any),
                actions: tabActions
              });
            }
          } else if (child.level === 'page') {
            // Pages: include if parent module has view (pages inherit accessibility from parent)
            // In new structure, pages are included in array if parent has view: true
            if (node.access.view && child.access.view) {
              const pageActions: ActionPermission[] = [];
              // Collect nested actions if any (only include enabled actions with value: true)
              if (child.children && child.children.length > 0) {
                child.children.forEach((actionChild) => {
                  if (actionChild.level === 'action' && actionChild.access.manage) {
                    pageActions.push({
                      key: actionChild.key,
                      value: true, // Actions use value: boolean
                      displayName: getPagePermissionDisplayName(actionChild.key as any)
                    });
                  }
                });
              }
              pages.push({
                key: child.key,
                displayName: getPagePermissionDisplayName(child.key as any),
                actions: pageActions
              });
            }
          }
        });
      };

      // Only collect children if parent module has view: true
      if (node.access.view && node.children && node.children.length > 0) {
        const pages: PagePermission[] = [];
        const tabs: TabPermission[] = [];
        const actions: ActionPermission[] = [];

        collectChildren(node.children, pages, tabs, actions);

        permission.pages = pages;
        permission.tabs = tabs;
        permission.actions = actions;
      } else if (!node.children && node._collapsedChildKey && node.access.view) {
        // If node has no children but has a collapsed child key, it was collapsed
        // Reconstruct the child page in the new format (only if parent has view)
        if (node.capabilities.isTab) {
          permission.tabs = [
            {
              key: node._collapsedChildKey,
              displayName: getPagePermissionDisplayName(node._collapsedChildKey as any),
              actions: []
            }
          ];
        } else {
          permission.pages = [
            {
              key: node._collapsedChildKey,
              displayName: getPagePermissionDisplayName(node._collapsedChildKey as any),
              actions: []
            }
          ];
        }
      }

      return permission;
    });
}
