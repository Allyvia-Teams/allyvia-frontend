/**
 * Permission Icons Utility
 *
 * Provides icon mappings and helper functions for permission visualization
 */

import type { ComponentType } from 'react';
import type { Icon } from '@tabler/icons-react';
import {
  IconLayoutDashboard,
  IconHome,
  IconPlug,
  IconPlugConnected,
  IconCurrencyDollar,
  IconCalendar,
  IconFileText,
  IconUsers,
  IconUsersGroup,
  IconUserCheck,
  IconChartBar,
  IconSettings,
  IconFile,
  IconPackage,
  IconBrain,
  IconClock,
  IconEdit,
  IconReceipt,
  IconCreditCard,
  IconAddressBook,
  IconUserSearch,
  IconChecklist,
  IconNote,
  IconChartLine,
  IconUserCircle,
  IconChartPie,
  IconUser,
  IconBuilding,
  IconShieldCheck,
  IconLock,
  IconEye,
  IconCheck,
  IconDatabase,
  IconKey,
  IconFileDescription,
  IconSpeakerphone,
  IconObjectScan
} from '@tabler/icons-react';
import { routeConfigs, type RouteConfig } from 'menu-items/routes';

// Icon mapping for dynamic import
const iconMap: Record<string, typeof IconLayoutDashboard> = {
  IconLayoutDashboard,
  IconHome,
  IconPlug,
  IconPlugConnected,
  IconCurrencyDollar,
  IconCalendar,
  IconFileText,
  IconUsers,
  IconUsersGroup,
  IconUserCheck,
  IconChartBar,
  IconSettings,
  IconFile,
  IconPackage,
  IconBrain,
  IconClock,
  IconEdit,
  IconFileDescription,
  IconReceipt,
  IconCreditCard,
  IconAddressBook,
  IconUserSearch,
  IconHandshake: IconUsers, // Use Users as replacement
  IconChecklist,
  IconNote,
  IconChartLine,
  IconUserCircle,
  IconChartPie,
  IconUser,
  IconBuilding,
  IconShieldCheck,
  IconLock,
  IconEye,
  IconCheck,
  IconDatabase,
  IconKey,
  IconSpeakerphone,
  IconObjectScan
};

export type PermissionIconConfig = {
  icon: string;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'default';
  description?: string;
  category?: string;
  backgroundColor?: string;
  label?: string;
};

export type PermissionIconsConfig = {
  modules: Record<string, PermissionIconConfig>;
  pages: Record<string, PermissionIconConfig>;
  tabs: Record<string, PermissionIconConfig>;
  actions: Record<string, PermissionIconConfig>;
  permissionTypes: Record<string, PermissionIconConfig>;
  actionCategories: Record<string, PermissionIconConfig>;
};

const moduleColorOverrides: Record<string, PermissionIconConfig['color']> = {
  dashboard: 'primary',
  integrations: 'info',
  finance: 'success',
  calendar: 'primary',
  documents: 'info',
  crm: 'primary',
  employees: 'secondary',
  analytics: 'warning',
  settings: 'default',
  inventory: 'info',
  insights: 'primary'
};

const pageColorOverrides: Record<string, PermissionIconConfig['color']> = {
  'employees-mgmt': 'secondary',
  'employees-clock': 'info',
  'inventory-mgmt': 'info',
  'inventory-update': 'primary'
};

function getIconNameFromComponent(icon?: ComponentType<any>): string {
  const name = (icon as any)?.displayName || (icon as any)?.name;
  return name && iconMap[name] ? name : 'IconLayoutDashboard';
}

function collectRouteIconConfig(): Pick<PermissionIconsConfig, 'modules' | 'pages'> {
  const modules: Record<string, PermissionIconConfig> = {};
  const pages: Record<string, PermissionIconConfig> = {};

  const traverse = (routes: RouteConfig[], parentType?: 'group' | 'collapse') => {
    routes.forEach((route) => {
      if (route.hidden) return;

      const iconName = getIconNameFromComponent(route.icon);
      const entry: PermissionIconConfig = {
        icon: iconName,
        color: 'primary'
      };

      if (parentType === 'collapse') {
        pages[route.menuId] = {
          ...entry,
          color: pageColorOverrides[route.menuId] || entry.color
        };
      } else if (route.menuId) {
        const moduleKey = route.permission?.moduleKey || route.menuId;
        modules[moduleKey] = {
          ...entry,
          color: moduleColorOverrides[moduleKey] || entry.color
        };
      }

      if (route.children && route.children.length) {
        traverse(route.children, route.type === 'collapse' ? 'collapse' : parentType);
      }
    });
  };

  traverse(routeConfigs);

  return { modules, pages };
}

const dynamicRouteIcons = collectRouteIconConfig();

const tabIconOverrides: Record<string, PermissionIconConfig> = {
  'finance-financial-statements': { icon: 'IconFileDescription', color: 'success' },
  'finance-invoices': { icon: 'IconReceipt', color: 'primary' },
  'finance-expenses': { icon: 'IconCurrencyDollar', color: 'error' },
  'finance-payments': { icon: 'IconCreditCard', color: 'success' },
  'crm-contacts': { icon: 'IconAddressBook', color: 'primary' },
  'crm-leads': { icon: 'IconUserSearch', color: 'info' },
  'crm-deals': { icon: 'IconUsers', color: 'success' },
  'crm-tasks': { icon: 'IconChecklist', color: 'warning' },
  'crm-notes': { icon: 'IconNote', color: 'default' },
  'analytics-financial': { icon: 'IconChartLine', color: 'success' },
  'analytics-crm': { icon: 'IconChartBar', color: 'primary' },
  'analytics-employee': { icon: 'IconUserCircle', color: 'secondary' },
  'analytics-inventory': { icon: 'IconChartPie', color: 'info' },
  'settings-account': { icon: 'IconUser', color: 'primary' },
  'settings-company-info': { icon: 'IconBuilding', color: 'info' },
  'settings-billing': { icon: 'IconCreditCard', color: 'success' },
  'settings-user-role-mgmt': { icon: 'IconShieldCheck', color: 'warning' }
};

const actionIconOverrides: Record<string, PermissionIconConfig> = {
  'security-manage-pins': {
    icon: 'IconLock',
    color: 'warning',
    description: 'Manage employee PINs for secure access',
    category: 'security'
  },
  'settings-invite-user': { icon: 'IconUser', color: 'primary' },
  'settings-edit-user': { icon: 'IconEdit', color: 'warning' },
  'settings-delete-user': { icon: 'IconChecklist', color: 'error' },
  'settings-change-role': { icon: 'IconShieldCheck', color: 'primary' },
  'settings-update-billing': { icon: 'IconCreditCard', color: 'success' },
  'settings-cancel-subscription': { icon: 'IconCreditCard', color: 'warning' },
  'settings-edit-company': { icon: 'IconBuilding', color: 'info' },
  'finance-create-invoice': { icon: 'IconReceipt', color: 'primary' },
  'finance-edit-invoice': { icon: 'IconEdit', color: 'primary' },
  'finance-delete-invoice': { icon: 'IconChecklist', color: 'error' },
  'finance-create-expense': { icon: 'IconCurrencyDollar', color: 'primary' },
  'finance-edit-expense': { icon: 'IconEdit', color: 'primary' },
  'finance-delete-expense': { icon: 'IconChecklist', color: 'error' },
  'finance-create-payment': { icon: 'IconCreditCard', color: 'primary' },
  'finance-edit-payment': { icon: 'IconEdit', color: 'primary' },
  'finance-delete-payment': { icon: 'IconChecklist', color: 'error' },
  'crm-create-contact': { icon: 'IconAddressBook', color: 'primary' },
  'crm-edit-contact': { icon: 'IconEdit', color: 'primary' },
  'crm-delete-contact': { icon: 'IconChecklist', color: 'error' },
  'crm-create-lead': { icon: 'IconUserSearch', color: 'primary' },
  'crm-edit-lead': { icon: 'IconEdit', color: 'primary' },
  'crm-delete-lead': { icon: 'IconChecklist', color: 'error' },
  'crm-create-deal': { icon: 'IconUsers', color: 'success' },
  'crm-edit-deal': { icon: 'IconEdit', color: 'primary' },
  'crm-delete-deal': { icon: 'IconChecklist', color: 'error' },
  'crm-create-task': { icon: 'IconChecklist', color: 'primary' },
  'crm-edit-task': { icon: 'IconEdit', color: 'primary' },
  'crm-delete-task': { icon: 'IconChecklist', color: 'error' },
  'crm-create-note': { icon: 'IconNote', color: 'primary' },
  'crm-edit-note': { icon: 'IconEdit', color: 'primary' },
  'crm-delete-note': { icon: 'IconChecklist', color: 'error' },
  'employees-add-employee': { icon: 'IconUsers', color: 'primary' },
  'employees-edit-employee': { icon: 'IconEdit', color: 'primary' },
  'employees-delete-employee': { icon: 'IconChecklist', color: 'error' },
  'inventory-add-item': { icon: 'IconPackage', color: 'primary' },
  'inventory-edit-item': { icon: 'IconEdit', color: 'primary' },
  'inventory-delete-item': { icon: 'IconChecklist', color: 'error' }
};

function buildTabAndActionIcons(): Pick<PermissionIconsConfig, 'tabs' | 'actions'> {
  const tabs: Record<string, PermissionIconConfig> = { ...tabIconOverrides };
  const actions: Record<string, PermissionIconConfig> = { ...actionIconOverrides };

  const traverse = (routes: RouteConfig[]) => {
    routes.forEach((route) => {
      const moduleIcon = getIconNameFromComponent(route.icon);
      const moduleColor = moduleColorOverrides[route.permission?.moduleKey || route.menuId] || 'primary';

      route.permission?.tabs?.forEach((tab) => {
        if (!tabs[tab.id]) {
          tabs[tab.id] = {
            icon: moduleIcon,
            color: moduleColor
          };
        }

        tab.actions?.forEach((action) => {
          if (!actions[action.id]) {
            actions[action.id] = {
              icon: moduleIcon,
              color: moduleColor
            };
          }
        });
      });

      route.permission?.actions?.forEach((action) => {
        if (!actions[action.id]) {
          actions[action.id] = {
            icon: moduleIcon,
            color: moduleColor
          };
        }
      });

      if (route.children && route.children.length > 0) {
        traverse(route.children);
      }
    });
  };

  traverse(routeConfigs);

  return { tabs, actions };
}

const dynamicTabActionIcons = buildTabAndActionIcons();

const permissionIconsConfig: PermissionIconsConfig = {
  modules: dynamicRouteIcons.modules,
  pages: dynamicRouteIcons.pages,
  tabs: dynamicTabActionIcons.tabs,
  actions: dynamicTabActionIcons.actions,
  permissionTypes: {
    view: { icon: 'IconEye', color: 'info', label: 'View' },
    manage: { icon: 'IconSettings', color: 'primary', label: 'Manage' },
    viewOnly: { icon: 'IconEye', color: 'info', label: 'View Only' },
    manageOnly: { icon: 'IconEdit', color: 'warning', label: 'Manage Only' },
    viewAndManage: { icon: 'IconCheck', color: 'success', label: 'View & Manage' }
  },
  actionCategories: {
    security: { icon: 'IconShieldCheck', color: 'warning', backgroundColor: 'warning.lighter' },
    management: { icon: 'IconSettings', color: 'primary', backgroundColor: 'primary.lighter' },
    data: { icon: 'IconDatabase', color: 'info', backgroundColor: 'info.lighter' },
    access: { icon: 'IconKey', color: 'secondary', backgroundColor: 'secondary.lighter' }
  }
};

/**
 * Get icon component by icon name
 */
export function getIconComponent(iconName: string): typeof IconLayoutDashboard | null {
  return iconMap[iconName] || null;
}

/**
 * Get icon configuration for a module
 */
export function getModuleIcon(key: string): PermissionIconConfig | null {
  const config = permissionIconsConfig as PermissionIconsConfig;
  return config.modules[key] || null;
}

/**
 * Get icon configuration for a page
 */
export function getPageIcon(key: string): PermissionIconConfig | null {
  const config = permissionIconsConfig as PermissionIconsConfig;
  return config.pages[key] || null;
}

/**
 * Get icon configuration for a tab
 */
export function getTabIcon(key: string): PermissionIconConfig | null {
  const config = permissionIconsConfig as PermissionIconsConfig;
  return config.tabs[key] || null;
}

/**
 * Get icon configuration for an action
 */
export function getActionIcon(key: string): PermissionIconConfig | null {
  const config = permissionIconsConfig as PermissionIconsConfig;
  return config.actions[key] || null;
}

/**
 * Get icon configuration for a permission type (view, manage, etc.)
 */
export function getPermissionTypeIcon(type: 'view' | 'manage' | 'viewOnly' | 'manageOnly' | 'viewAndManage'): PermissionIconConfig | null {
  const config = permissionIconsConfig as PermissionIconsConfig;
  return config.permissionTypes[type] || null;
}

/**
 * Get icon configuration for an action category
 */
export function getActionCategoryIcon(category: string): PermissionIconConfig | null {
  const config = permissionIconsConfig as PermissionIconsConfig;
  return config.actionCategories?.[category] || null;
}

/**
 * Get icon for any permission key (module, page, tab, or action)
 */
export function getPermissionIcon(key: string, type: 'module' | 'page' | 'tab' | 'action' = 'module'): PermissionIconConfig | null {
  switch (type) {
    case 'module':
      return getModuleIcon(key);
    case 'page':
      return getPageIcon(key);
    case 'tab':
      return getTabIcon(key);
    case 'action':
      return getActionIcon(key);
    default:
      return null;
  }
}

/**
 * Get icon component and config for a permission key
 */
export function getPermissionIconWithComponent(
  key: string,
  type: 'module' | 'page' | 'tab' | 'action' = 'module'
): { IconComponent: typeof IconLayoutDashboard | null; config: PermissionIconConfig | null } {
  const config = getPermissionIcon(key, type);
  const iconName = config?.icon;
  const IconComponent = iconName ? getIconComponent(iconName) : null;
  return { IconComponent, config };
}
