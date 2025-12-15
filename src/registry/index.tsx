/**
 * Application Registry
 *
 * Central source of truth for every navigable surface in Allyvia:
 * - React Router path + component
 * - Menu metadata (id, icon, title, dev/hidden flags)
 * - RBAC metadata (permission keys, module ownership, tabs/actions)
 *
 * All builders (routes, menus, role tree, permission mappings) derive from this registry.
 */

import { lazy } from 'react';
import Loadable from 'ui-component/Loadable';
import UnderConstruction from 'views/pages/maintenance/UnderConstruction';
import InventoryPage from 'views/inventory/index';
import UpdateInventoryPage from 'views/inventory/UpdateInventory';
import { EmployeeManagementPage, ClockInOutPage } from 'views/employees';
import MyProfile from 'views/MyProfile';
import type { RegistryNode } from 'types/registry';

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

export const APP_REGISTRY: RegistryNode[] = [
  {
    menuId: 'dashboard',
    type: 'page',
    title: 'Dashboard',
    path: '/dashboard',
    component: DashboardPage,
    icon: IconHome,
    requiresPermission: false,
    moduleKey: 'dashboard',
    supportsView: true,
    supportsManage: false
  },
  {
    menuId: 'integrations',
    type: 'page',
    title: 'Integrations',
    path: '/integrations',
    component: IntegrationsPage,
    icon: IconPlugConnected,
    moduleKey: 'integrations',
    supportsView: true,
    supportsManage: false
  },
  {
    menuId: 'integrations-quickbooks',
    type: 'page',
    title: 'QuickBooks',
    path: '/integrations/quickbooks',
    component: QuickBooksPage,
    moduleKey: 'integrations',
    permissionKey: 'integrations',
    hidden: true
  },
  {
    menuId: 'finance',
    type: 'page',
    title: 'Finance & Accounting',
    path: '/finance',
    component: FinancePage,
    icon: IconReportMoney,
    moduleKey: 'finance',
    supportsView: true,
    supportsManage: true,
    tabs: [
      { key: 'finance-financial-statements', title: 'Financial Statements' },
      {
        key: 'finance-invoices',
        title: 'Invoices',
        actions: [
          { key: 'finance-create-invoice', title: 'Create Invoice' },
          { key: 'finance-edit-invoice', title: 'Edit Invoice' },
          { key: 'finance-delete-invoice', title: 'Delete Invoice' }
        ]
      },
      {
        key: 'finance-expenses',
        title: 'Expenses',
        actions: [
          { key: 'finance-create-expense', title: 'Create Expense' },
          { key: 'finance-edit-expense', title: 'Edit Expense' },
          { key: 'finance-delete-expense', title: 'Delete Expense' }
        ]
      },
      {
        key: 'finance-payments',
        title: 'Payments',
        actions: [
          { key: 'finance-create-payment', title: 'Create Payment' },
          { key: 'finance-edit-payment', title: 'Edit Payment' },
          { key: 'finance-delete-payment', title: 'Delete Payment' }
        ]
      }
    ]
  },
  {
    menuId: 'finance-expense-bills',
    type: 'page',
    title: 'Expense Bills',
    path: '/expense/bills',
    component: ExpensePage,
    moduleKey: 'finance',
    permissionKey: 'finance',
    hidden: true
  },
  {
    menuId: 'employees',
    type: 'module',
    title: 'Employees & Payroll',
    icon: IconUsersGroup,
    moduleKey: 'employees',
    supportsView: true,
    supportsManage: true,
    actions: [{ key: 'security-manage-pins', title: 'Manage PINs' }],
    children: [
      {
        menuId: 'employees-home',
        type: 'page',
        title: 'Directory',
        path: '/employees',
        component: EmployeeManagementPage,
        icon: IconList,
        moduleKey: 'employees',
        permissionKey: 'employees-mgmt',
        actions: [
          { key: 'employees-add-employee', title: 'Add Employee' },
          { key: 'employees-edit-employee', title: 'Edit Employee' },
          { key: 'employees-delete-employee', title: 'Delete Employee' }
        ]
      },
      {
        menuId: 'employees-clock',
        type: 'page',
        title: 'Clock In / Out',
        path: '/employees/clock',
        component: ClockInOutPage,
        icon: IconClock,
        moduleKey: 'employees'
      }
    ]
  },
  {
    menuId: 'crm',
    type: 'page',
    title: 'CRM',
    path: '/crm',
    component: CRMPage,
    icon: IconLifebuoy,
    moduleKey: 'crm',
    supportsView: true,
    supportsManage: true,
    tabs: [
      {
        key: 'crm-contacts',
        title: 'Contacts',
        actions: [
          { key: 'crm-create-contact', title: 'Create Contact' },
          { key: 'crm-edit-contact', title: 'Edit Contact' },
          { key: 'crm-delete-contact', title: 'Delete Contact' }
        ]
      },
      {
        key: 'crm-leads',
        title: 'Leads',
        actions: [
          { key: 'crm-create-lead', title: 'Create Lead' },
          { key: 'crm-edit-lead', title: 'Edit Lead' },
          { key: 'crm-delete-lead', title: 'Delete Lead' }
        ]
      },
      {
        key: 'crm-deals',
        title: 'Deals',
        actions: [
          { key: 'crm-create-deal', title: 'Create Deal' },
          { key: 'crm-edit-deal', title: 'Edit Deal' },
          { key: 'crm-delete-deal', title: 'Delete Deal' }
        ]
      },
      {
        key: 'crm-tasks',
        title: 'Tasks',
        actions: [
          { key: 'crm-create-task', title: 'Create Task' },
          { key: 'crm-edit-task', title: 'Edit Task' },
          { key: 'crm-delete-task', title: 'Delete Task' }
        ]
      },
      {
        key: 'crm-notes',
        title: 'Notes',
        actions: [
          { key: 'crm-create-note', title: 'Create Note' },
          { key: 'crm-edit-note', title: 'Edit Note' },
          { key: 'crm-delete-note', title: 'Delete Note' }
        ]
      }
    ]
  },
  {
    menuId: 'community',
    type: 'page',
    title: 'Community Networking',
    path: '/community',
    component: UnderConstruction,
    icon: IconBuildingCommunity,
    moduleKey: 'community',
    supportsView: true,
    supportsManage: false
  },
  {
    menuId: 'inventory',
    type: 'module',
    title: 'Inventory',
    icon: IconObjectScan,
    moduleKey: 'inventory',
    supportsView: true,
    supportsManage: true,
    children: [
      {
        menuId: 'inventory-mgmt',
        type: 'page',
        title: 'Inventory',
        path: '/inventory',
        component: InventoryPage,
        icon: IconObjectScan,
        moduleKey: 'inventory',
        permissionKey: 'inventory-home',
        actions: [
          { key: 'inventory-add-item', title: 'Add Item' },
          { key: 'inventory-edit-item', title: 'Edit Item' },
          { key: 'inventory-delete-item', title: 'Delete Item' }
        ]
      },
      {
        menuId: 'inventory-update',
        type: 'page',
        title: 'Update Inventory',
        path: '/inventory/update',
        component: UpdateInventoryPage,
        icon: IconScan,
        moduleKey: 'inventory'
      }
    ]
  },
  {
    menuId: 'documents',
    type: 'page',
    title: 'Documents',
    path: '/documents',
    component: DocumentsPage,
    icon: IconFile,
    moduleKey: 'documents',
    supportsView: true,
    supportsManage: true
  },
  {
    menuId: 'settings',
    type: 'page',
    title: 'Settings',
    path: '/settings',
    component: SettingsPage,
    icon: IconSettings,
    moduleKey: 'settings',
    supportsView: true,
    supportsManage: true,
    tabs: [
      { key: 'settings-account', title: 'Account' },
      {
        key: 'settings-company-info',
        title: 'Company Info',
        actions: [{ key: 'settings-edit-company', title: 'Edit Company' }]
      },
      {
        key: 'settings-billing',
        title: 'Billing',
        actions: [
          { key: 'settings-update-billing', title: 'Update Billing' },
          { key: 'settings-cancel-subscription', title: 'Cancel Subscription' }
        ]
      },
      {
        key: 'settings-user-role-mgmt',
        title: 'User & Role Management',
        actions: [
          { key: 'settings-invite-user', title: 'Invite User' },
          { key: 'settings-edit-user', title: 'Edit User' },
          { key: 'settings-delete-user', title: 'Delete User' },
          { key: 'settings-change-role', title: 'Change Role' }
        ]
      }
    ]
  },
  {
    menuId: 'analytics',
    type: 'page',
    title: 'Analytics',
    path: '/analytics',
    component: AnalyticsPage,
    icon: IconChartBar,
    moduleKey: 'analytics',
    supportsView: true,
    supportsManage: false,
    tabs: [
      { key: 'analytics-financial', title: 'Financial Analytics' },
      { key: 'analytics-crm', title: 'CRM Analytics' },
      { key: 'analytics-employee', title: 'Employee Analytics' },
      { key: 'analytics-inventory', title: 'Inventory Analytics' }
    ]
  },
  {
    menuId: 'calendar',
    type: 'page',
    title: 'Calendar',
    path: '/calendar',
    component: CalendarPage,
    icon: IconCalendar,
    moduleKey: 'calendar',
    supportsView: true,
    supportsManage: true,
    tabs: [
      { key: 'calendar-view', title: 'View Calendar' },
      { key: 'calendar-manage', title: 'Manage Calendar' }
    ]
  },
  {
    menuId: 'insights',
    type: 'page',
    title: 'AI Insights',
    path: '/insights',
    component: UnderConstruction,
    icon: IconBrain,
    moduleKey: 'insights',
    supportsView: true,
    supportsManage: false
  },
  {
    menuId: 'marketing',
    type: 'page',
    title: 'Marketing Tools',
    path: '/marketing',
    component: UnderConstruction,
    icon: IconSpeakerphone,
    moduleKey: 'marketing',
    supportsView: true,
    supportsManage: false
  },
  {
    menuId: 'profile',
    type: 'page',
    title: 'My Profile',
    path: '/me',
    component: MyProfile,
    requiresPermission: false,
    moduleKey: 'settings',
    hidden: true
  },
  {
    menuId: 'google-drive-callback',
    type: 'page',
    title: 'Google Drive Callback',
    path: '/auth/google-drive/callback',
    component: GoogleDriveCallback,
    requiresAuth: false,
    requiresPermission: false,
    moduleKey: 'integrations',
    hidden: true
  },
  {
    menuId: 'demo',
    type: 'page',
    title: 'RBAC Demo',
    path: '/demo',
    component: RBACDemo,
    requiresPermission: false,
    devOnly: true,
    hidden: true
  },
  {
    menuId: 'playground',
    type: 'page',
    title: 'Playground',
    path: '/playground',
    component: PlaygroundPage,
    requiresPermission: false,
    devOnly: true,
    hidden: true
  }
];
