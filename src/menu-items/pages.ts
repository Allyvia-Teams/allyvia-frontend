// assets
import {
  IconLayoutDashboard,
  IconCashRegister,
  IconReportMoney,
  IconChartBar,
  IconFiles,
  IconPackage,
  IconPackages,
  IconUsersGroup,
  IconAddressBook,
  IconCalendar,
  IconCalendarTime,
  IconClock,
  IconClockCheck,
  IconBarcode,
  IconHanger,
  IconZoomScan,
  IconRuler2,
  IconBuildingStore,
  IconTruckDelivery,
  IconShoppingCartPlus,
  IconClipboardList,
  IconBook,
  IconChartHistogram,
  IconFileInvoice,
  IconArrowsExchange,
  IconClipboardCheck,
  IconSparkles,
  IconSettings,
  IconTruck,
  IconCrown
} from '@tabler/icons-react';

import { NavItemType } from 'types';

// constant — one icon per destination, chosen for what the section does:
// dashboard = layout grid, POS = register, inventory = packages,
// insights = AI sparkles, documents = file stack.
const icons = {
  IconLayoutDashboard,
  IconCashRegister,
  IconReportMoney,
  IconChartBar,
  IconFiles,
  IconPackage,
  IconPackages,
  IconUsersGroup,
  IconAddressBook,
  IconCalendar,
  IconCalendarTime,
  IconClock,
  IconClockCheck,
  IconBarcode,
  IconHanger,
  IconZoomScan,
  IconRuler2,
  IconBuildingStore,
  IconTruckDelivery,
  IconShoppingCartPlus,
  IconClipboardList,
  IconBook,
  IconChartHistogram,
  IconFileInvoice,
  IconArrowsExchange,
  IconClipboardCheck,
  IconSparkles,
  IconSettings,
  IconTruck,
  IconCrown
};

// ==============================|| SIDEBAR MENU ||============================== //
//
// Three captioned groups (design handoff 1.6): Operate, Money, Understand.
// Owner moved Insights and Inner Circle into Operate and Calendar into Understand.
// Labels are sentence case and name destinations. MenuList's limited (member /
// kiosk) menu looks items up BY ID across every group, so an item can move
// between groups without touching that filter.

const operate: NavItemType = {
  id: 'operate',
  title: 'Operate',
  type: 'group',
  children: [
    {
      id: 'storefront',
      title: 'Online Storefront',
      type: 'collapse',
      icon: icons.IconBuildingStore,
      children: [
        { id: 'storefront-overview', title: 'Overview', type: 'item', url: '/storefront/overview' },
        { id: 'storefront-builder', title: 'Website builder', type: 'item', url: '/storefront/builder' },
        { id: 'storefront-products', title: 'Products', type: 'item', url: '/storefront/products' },
        { id: 'storefront-domains', title: 'Domains', type: 'item', url: '/storefront/domains' },
        { id: 'storefront-orders', title: 'Orders', type: 'item', url: '/storefront/orders' },
        { id: 'storefront-settings', title: 'Settings', type: 'item', url: '/storefront/settings' }
      ]
    },
    { id: 'dashboard', title: 'Dashboard', icon: icons.IconLayoutDashboard, type: 'item', url: '/dashboard' },
    { id: 'pos', title: 'POS', icon: icons.IconCashRegister, type: 'item', url: '/pos' },
    {
      id: 'inventory',
      title: 'Inventory',
      type: 'item',
      url: '/inventory',
      icon: icons.IconPackages,
      exact: true,
      also: [
        '/inventory/update',
        '/inventory/plan',
        '/inventory/purchase-orders',
        '/inventory/transfers',
        '/inventory/stock-counts',
        '/inventory/quickbooks',
        '/inventory/locations',
        '/inventory/size-scales'
      ]
    },
    { id: 'inventory-find', title: 'Find a size', type: 'item', url: '/inventory/find', icon: icons.IconZoomScan },
    {
      id: 'employees',
      title: 'Employees & pay',
      type: 'collapse',
      icon: icons.IconUsersGroup,
      children: [
        { id: 'employees-home', title: 'Directory', type: 'item', url: '/employees', icon: icons.IconAddressBook },
        { id: 'employees-clock', title: 'Clock In / Out', type: 'item', url: '/employees/clock', icon: icons.IconClock },
        {
          id: 'employees-time-approval',
          title: 'Time Approval',
          type: 'item',
          url: '/employees/time-approval',
          icon: icons.IconClockCheck
        },
        { id: 'employees-scheduling', title: 'Auto-Scheduling', type: 'item', url: '/scheduling', icon: icons.IconCalendarTime }
      ]
    },
    { id: 'insights', title: 'Insights', url: '/insights', type: 'item', icon: icons.IconSparkles },
    { id: 'inner-circle', title: 'Inner Circle', url: '/inner-circle', type: 'item', icon: icons.IconCrown }
  ]
};

const money: NavItemType = {
  id: 'money',
  title: 'Money',
  type: 'group',
  children: [
    { id: 'finance', title: 'Finance & accounting', url: '/finance', type: 'item', icon: icons.IconReportMoney },
    { id: 'documents', title: 'Documents', url: '/documents', type: 'item', icon: icons.IconFiles }
  ]
};

const understand: NavItemType = {
  id: 'understand',
  title: 'Understand',
  type: 'group',
  children: [
    { id: 'analytics', title: 'Analytics', url: '/analytics', type: 'item', icon: icons.IconChartBar },
    { id: 'calendar', title: 'Calendar', url: '/calendar', type: 'item', icon: icons.IconCalendar },
    { id: 'settings', title: 'Settings', url: '/settings', type: 'item', icon: icons.IconSettings }
  ]
};

export const menuGroups: NavItemType[] = [operate, money, understand];

// Every top-level destination across the groups, for id lookups.
export const topLevelItems: NavItemType[] = menuGroups.flatMap((group) => group.children ?? []);

export default menuGroups;
