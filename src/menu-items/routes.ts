/**
 * Route Configurations
 *
 * This file contains all route definitions with their associated:
 * - React components
 * - Menu metadata (icon, title, id)
 * - Permission checks (menuId)
 * - Navigation structure
 *
 * This is the single source of truth for all application routes.
 */

import { lazy, ComponentType } from 'react';
import Loadable from 'ui-component/Loadable';
import UnderConstruction from 'views/pages/maintenance/UnderConstruction';
import InventoryPage from 'views/inventory/index';
import UpdateInventoryPage from 'views/inventory/UpdateInventory';
import { EmployeeManagementPage, ClockInOutPage } from 'views/employees';
import MyProfile from 'views/MyProfile';

// Icons
import {
  IconHome,
  IconLifebuoy,
  IconReportMoney,
  IconBuildingCommunity,
  IconChartBar,
  IconFile,
  IconSpeakerphone,
  IconObjectScan,
  IconUsersGroup,
  IconCalendar,
  IconPlugConnected,
  IconClock,
  IconScan,
  IconList,
  IconSettings,
  IconBrain
} from '@tabler/icons-react';

// Lazy loaded components
const DashboardPage = Loadable(lazy(() => import('views/dashboard')));
const CRMPage = Loadable(lazy(() => import('views/crm')));
const DocumentsPage = Loadable(lazy(() => import('views/documents')));
const AnalyticsPage = Loadable(lazy(() => import('views/analytics')));
const CalendarPage = Loadable(lazy(() => import('views/calendar')));
const FinancePage = Loadable(lazy(() => import('views/finance')));
const PlaygroundPage = Loadable(lazy(() => import('views/playground')));
const ExpensePage = Loadable(lazy(() => import('views/expense')));
const RBACDemo = Loadable(lazy(() => import('views/demo/RBACDemo')));
const IntegrationsPage = Loadable(lazy(() => import('views/integrations')));
const QuickBooksPage = Loadable(lazy(() => import('views/integrations/QuickBooks')));
const SettingsPage = Loadable(lazy(() => import('views/settings')));
const GoogleDriveCallback = Loadable(lazy(() => import('views/auth/GoogleDriveCallback')));

/**
 * Route Configuration Type
 *
 * Defines a complete route with all its metadata
 */
export interface PermissionActionMeta {
  id: string;
  title: string;
  description?: string;
}

export interface PermissionPageMeta {
  id: string;
  title: string;
  description?: string;
  requiresManage?: boolean;
  actions?: PermissionActionMeta[];
}

export interface PermissionMeta {
  moduleKey?: string;
  supportsView?: boolean;
  supportsManage?: boolean;
  description?: string;
  pages?: PermissionPageMeta[];
  tabs?: PermissionPageMeta[];
  actions?: PermissionActionMeta[];
}

export interface RouteConfig {
  // Route definition
  path: string;
  component: ComponentType<any>;

  // Menu metadata
  menuId: string;
  title: string;
  icon?: ComponentType<any>; // Icon component directly
  type?: 'item' | 'collapse';

  // Permission & access control
  requiresAuth?: boolean; // Default: true
  requiresPermission?: boolean; // Default: true (wraps with ProtectedRoute)
  menuIdForPermission?: string; // If different from menuId

  // Menu structure
  parentId?: string; // For nested items
  children?: RouteConfig[]; // For collapse items

  // Additional metadata
  description?: string;
  permissionKey?: string; // Backend permission key (if different from menuId)
  hidden?: boolean; // Hide from menu but keep route accessible
  devOnly?: boolean; // Only available in development
  permission?: PermissionMeta;
}

/**
 * Main Application Routes Configuration
 *
 * All routes, menu items, and permissions defined in one place.
 * This array is used to generate both React Router routes and menu items.
 */
export const routeConfigs: RouteConfig[] = [
  // Dashboard (always accessible, no permission check)
  {
    path: '/dashboard',
    component: DashboardPage,
    menuId: 'dashboard',
    title: 'Dashboard',
    icon: IconHome,
    type: 'item',
    requiresPermission: false, // Dashboard is always accessible
    permission: {
      moduleKey: 'dashboard',
      supportsView: true,
      supportsManage: false
    }
  },

  // Integrations
  {
    path: '/integrations',
    component: IntegrationsPage,
    menuId: 'integrations',
    title: 'Integrations',
    icon: IconPlugConnected,
    type: 'item',
    permission: {
      moduleKey: 'integrations',
      supportsView: true,
      supportsManage: false
    }
  },
  {
    path: '/integrations/quickbooks',
    component: QuickBooksPage,
    menuId: 'integrations', // Same menuId as parent
    title: 'QuickBooks',
    hidden: true // Hidden from menu, accessible via direct URL
  },

  // Finance
  {
    path: '/finance',
    component: FinancePage,
    menuId: 'finance',
    title: 'Finance & Accounting',
    icon: IconReportMoney,
    type: 'item',
    permission: {
      moduleKey: 'finance',
      supportsView: true,
      supportsManage: false,
      tabs: [
        {
          id: 'finance-financial-statements',
          title: 'Financial Statements'
        },
        {
          id: 'finance-invoices',
          title: 'Invoices',
          actions: [
            { id: 'finance-create-invoice', title: 'Create Invoice' },
            { id: 'finance-edit-invoice', title: 'Edit Invoice' },
            { id: 'finance-delete-invoice', title: 'Delete Invoice' }
          ]
        },
        {
          id: 'finance-expenses',
          title: 'Expenses',
          actions: [
            { id: 'finance-create-expense', title: 'Create Expense' },
            { id: 'finance-edit-expense', title: 'Edit Expense' },
            { id: 'finance-delete-expense', title: 'Delete Expense' }
          ]
        },
        {
          id: 'finance-payments',
          title: 'Payments',
          actions: [
            { id: 'finance-create-payment', title: 'Create Payment' },
            { id: 'finance-edit-payment', title: 'Edit Payment' },
            { id: 'finance-delete-payment', title: 'Delete Payment' }
          ]
        }
      ]
    }
  },
  {
    path: '/expense/bills',
    component: ExpensePage,
    menuId: 'finance', // Same menuId as finance
    title: 'Expense Bills',
    hidden: true
  },

  // Employees (collapse with children)
  {
    path: '/employees',
    component: EmployeeManagementPage,
    menuId: 'employees-home',
    title: 'Employees & Payroll',
    icon: IconUsersGroup,
    type: 'collapse',
    parentId: 'employees',
    permission: {
      moduleKey: 'employees',
      supportsView: true,
      supportsManage: true,
      pages: [
        {
          id: 'employees-mgmt',
          title: 'Employee Management',
          requiresManage: true,
          actions: [
            { id: 'employees-add-employee', title: 'Add Employee' },
            { id: 'employees-edit-employee', title: 'Edit Employee' },
            { id: 'employees-delete-employee', title: 'Delete Employee' }
          ]
        },
        {
          id: 'employees-clock',
          title: 'Clock In/Out'
        }
      ],
      actions: [{ id: 'security-manage-pins', title: 'Manage PINs' }]
    },
    children: [
      {
        path: '/employees',
        component: EmployeeManagementPage,
        menuId: 'employees-home',
        title: 'Directory',
        icon: IconList,
        type: 'item',
        parentId: 'employees'
      },
      {
        path: '/employees/clock',
        component: ClockInOutPage,
        menuId: 'employees-clock',
        title: 'Clock In / Out',
        icon: IconClock,
        type: 'item',
        parentId: 'employees'
      }
    ]
  },

  // CRM
  {
    path: '/crm',
    component: CRMPage,
    menuId: 'crm',
    title: 'CRM',
    icon: IconLifebuoy,
    type: 'item',
    permission: {
      moduleKey: 'crm',
      supportsView: true,
      supportsManage: true,
      tabs: [
        {
          id: 'crm-contacts',
          title: 'Contacts',
          actions: [
            { id: 'crm-create-contact', title: 'Create Contact' },
            { id: 'crm-edit-contact', title: 'Edit Contact' },
            { id: 'crm-delete-contact', title: 'Delete Contact' }
          ]
        },
        {
          id: 'crm-leads',
          title: 'Leads',
          actions: [
            { id: 'crm-create-lead', title: 'Create Lead' },
            { id: 'crm-edit-lead', title: 'Edit Lead' },
            { id: 'crm-delete-lead', title: 'Delete Lead' }
          ]
        },
        {
          id: 'crm-deals',
          title: 'Deals',
          actions: [
            { id: 'crm-create-deal', title: 'Create Deal' },
            { id: 'crm-edit-deal', title: 'Edit Deal' },
            { id: 'crm-delete-deal', title: 'Delete Deal' }
          ]
        },
        {
          id: 'crm-tasks',
          title: 'Tasks',
          actions: [
            { id: 'crm-create-task', title: 'Create Task' },
            { id: 'crm-edit-task', title: 'Edit Task' },
            { id: 'crm-delete-task', title: 'Delete Task' }
          ]
        },
        {
          id: 'crm-notes',
          title: 'Notes',
          actions: [
            { id: 'crm-create-note', title: 'Create Note' },
            { id: 'crm-edit-note', title: 'Edit Note' },
            { id: 'crm-delete-note', title: 'Delete Note' }
          ]
        }
      ]
    }
  },

  // Community
  {
    path: '/community',
    component: UnderConstruction,
    menuId: 'community',
    title: 'Community Networking',
    icon: IconBuildingCommunity,
    type: 'item',
    permission: {
      moduleKey: 'community',
      supportsView: true,
      supportsManage: false
    }
  },

  // Inventory (collapse with children)
  {
    path: '/inventory',
    component: InventoryPage,
    menuId: 'inventory-mgmt',
    title: 'Inventory',
    icon: IconObjectScan,
    type: 'collapse',
    parentId: 'inventory',
    permission: {
      moduleKey: 'inventory',
      supportsView: true,
      supportsManage: true,
      pages: [
        {
          id: 'inventory-mgmt',
          title: 'Inventory Management',
          requiresManage: true,
          actions: [
            { id: 'inventory-add-item', title: 'Add Item' },
            { id: 'inventory-edit-item', title: 'Edit Item' },
            { id: 'inventory-delete-item', title: 'Delete Item' }
          ]
        },
        {
          id: 'inventory-update',
          title: 'Update Inventory'
        }
      ]
    },
    children: [
      {
        path: '/inventory',
        component: InventoryPage,
        menuId: 'inventory-mgmt',
        title: 'Inventory',
        icon: IconObjectScan,
        type: 'item',
        parentId: 'inventory'
      },
      {
        path: '/inventory/update',
        component: UpdateInventoryPage,
        menuId: 'inventory-update',
        title: 'Update Inventory',
        icon: IconScan,
        type: 'item',
        parentId: 'inventory'
      }
    ]
  },

  // Documents
  {
    path: '/documents',
    component: DocumentsPage,
    menuId: 'documents',
    title: 'Documents',
    icon: IconFile,
    type: 'item',
    permission: {
      moduleKey: 'documents',
      supportsView: true,
      supportsManage: true
    }
  },

  // Settings
  {
    path: '/settings',
    component: SettingsPage,
    menuId: 'settings',
    title: 'Settings',
    icon: IconSettings,
    type: 'item',
    permission: {
      moduleKey: 'settings',
      supportsView: true,
      supportsManage: true,
      tabs: [
        { id: 'settings-account', title: 'Account' },
        {
          id: 'settings-company-info',
          title: 'Company Info',
          actions: [{ id: 'settings-edit-company', title: 'Edit Company' }]
        },
        {
          id: 'settings-billing',
          title: 'Billing',
          actions: [
            { id: 'settings-update-billing', title: 'Update Billing' },
            { id: 'settings-cancel-subscription', title: 'Cancel Subscription' }
          ]
        },
        {
          id: 'settings-user-role-mgmt',
          title: 'User & Role Management',
          actions: [
            { id: 'settings-invite-user', title: 'Invite User' },
            { id: 'settings-edit-user', title: 'Edit User' },
            { id: 'settings-delete-user', title: 'Delete User' },
            { id: 'settings-change-role', title: 'Change Role' }
          ]
        }
      ]
    }
  },

  // Analytics
  {
    path: '/analytics',
    component: AnalyticsPage,
    menuId: 'analytics',
    title: 'Analytics',
    icon: IconChartBar,
    type: 'item',
    permission: {
      moduleKey: 'analytics',
      supportsView: true,
      supportsManage: false,
      tabs: [
        { id: 'analytics-financial', title: 'Financial Analytics' },
        { id: 'analytics-crm', title: 'CRM Analytics' },
        { id: 'analytics-employee', title: 'Employee Analytics' },
        { id: 'analytics-inventory', title: 'Inventory Analytics' }
      ]
    }
  },

  // Calendar
  {
    path: '/calendar',
    component: CalendarPage,
    menuId: 'calendar',
    title: 'Calendar',
    icon: IconCalendar,
    type: 'item',
    permission: {
      moduleKey: 'calendar',
      supportsView: true,
      supportsManage: true,
      pages: [
        { id: 'calendar-view', title: 'View Calendar' },
        { id: 'calendar-manage', title: 'Manage Calendar', requiresManage: true }
      ]
    }
  },

  // AI Insights
  {
    path: '/insights',
    component: UnderConstruction,
    menuId: 'insights',
    title: 'AI Insights',
    icon: IconBrain,
    type: 'item',
    permission: {
      moduleKey: 'insights',
      supportsView: true,
      supportsManage: false
    }
  },

  // Marketing
  {
    path: '/marketing',
    component: UnderConstruction,
    menuId: 'marketing',
    title: 'Marketing Tools',
    icon: IconSpeakerphone,
    type: 'item',
    permission: {
      moduleKey: 'marketing',
      supportsView: true,
      supportsManage: false
    }
  },

  // Profile (always accessible, hidden from main menu)
  {
    path: '/me',
    component: MyProfile,
    menuId: 'profile',
    title: 'My Profile',
    requiresPermission: false,
    hidden: true
  },

  // Auth callbacks (no auth required)
  {
    path: '/auth/google-drive/callback',
    component: GoogleDriveCallback,
    menuId: 'google-drive-callback',
    title: 'Google Drive Callback',
    requiresAuth: false,
    requiresPermission: false,
    hidden: true
  },

  // Development/Playground routes
  {
    path: '/demo',
    component: RBACDemo,
    menuId: 'demo',
    title: 'RBAC Demo',
    requiresPermission: false,
    devOnly: true,
    hidden: true
  },
  {
    path: '/playground',
    component: PlaygroundPage,
    menuId: 'playground',
    title: 'Playground',
    requiresPermission: false,
    devOnly: true,
    hidden: true
  }
];
