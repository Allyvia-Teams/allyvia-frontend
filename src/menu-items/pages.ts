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
  IconPlugConnected,
  IconClock,
  IconClockCheck,
  IconBarcode,
  IconHanger,
  IconZoomScan,
  IconRuler2,
  IconBuildingStore,
  IconTruckDelivery,
  IconShoppingCartPlus,
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
  IconPlugConnected,
  IconClock,
  IconClockCheck,
  IconBarcode,
  IconHanger,
  IconZoomScan,
  IconRuler2,
  IconBuildingStore,
  IconTruckDelivery,
  IconShoppingCartPlus,
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
// Labels are sentence case and name destinations. MenuList's limited (member /
// kiosk) menu looks items up BY ID across every group, so an item can move
// between groups without touching that filter.

const operate: NavItemType = {
  id: 'operate',
  title: 'Operate',
  type: 'group',
  children: [
    { id: 'dashboard', title: 'Dashboard', icon: icons.IconLayoutDashboard, type: 'item', url: '/dashboard' },
    { id: 'pos', title: 'POS', icon: icons.IconCashRegister, type: 'item', url: '/pos' },
    {
      id: 'inventory',
      title: 'Inventory',
      type: 'collapse',
      icon: icons.IconPackages,
      children: [
        { id: 'inventory-find', title: 'Find a Size', type: 'item', url: '/inventory/find', icon: icons.IconZoomScan },
        // Two views of the same stock: the flat grid of every item and all its
        // fields, and the style catalogue's size × colour matrices.
        { id: 'inventory-home', title: 'All Items', type: 'item', url: '/inventory', icon: icons.IconPackage },
        { id: 'inventory-styles', title: 'Style Catalogue', type: 'item', url: '/inventory/styles', icon: icons.IconHanger },
        { id: 'inventory-locations', title: 'Locations', type: 'item', url: '/inventory/locations', icon: icons.IconBuildingStore },
        {
          id: 'inventory-buying',
          title: 'Buying',
          type: 'collapse',
          icon: icons.IconShoppingCartPlus,
          children: [
            { id: 'inventory-reorder', title: 'Reorder Inbox', type: 'item', url: '/inventory/reorder', icon: icons.IconShoppingCartPlus },
            {
              id: 'inventory-purchase-orders',
              title: 'Purchase Orders',
              type: 'item',
              url: '/inventory/purchase-orders',
              icon: icons.IconFileInvoice
            },
            { id: 'inventory-suppliers', title: 'Suppliers', type: 'item', url: '/inventory/suppliers', icon: icons.IconTruckDelivery }
          ]
        },
        {
          id: 'inventory-movement',
          title: 'Movement',
          type: 'collapse',
          icon: icons.IconArrowsExchange,
          children: [
            { id: 'inventory-transfers', title: 'Transfers', type: 'item', url: '/inventory/transfers', icon: icons.IconArrowsExchange },
            {
              id: 'inventory-stock-counts',
              title: 'Stocktakes',
              type: 'item',
              url: '/inventory/stock-counts',
              icon: icons.IconClipboardCheck
            }
          ]
        },
        {
          id: 'inventory-reporting',
          title: 'Reporting',
          type: 'collapse',
          icon: icons.IconChartHistogram,
          children: [
            {
              id: 'inventory-insights',
              title: 'Inventory Insights',
              type: 'item',
              url: '/inventory/insights',
              icon: icons.IconChartHistogram
            },
            { id: 'inventory-quickbooks', title: 'QuickBooks Posting', type: 'item', url: '/inventory/quickbooks', icon: icons.IconBook }
          ]
        },
        {
          id: 'inventory-settings',
          title: 'Settings',
          type: 'collapse',
          icon: icons.IconRuler2,
          children: [
            { id: 'inventory-size-scales', title: 'Size Scales', type: 'item', url: '/inventory/size-scales', icon: icons.IconRuler2 }
          ]
        }
      ]
    },
    { id: 'vendors', title: 'Vendors', type: 'item', url: '/vendors', icon: icons.IconTruck },
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
    { id: 'calendar', title: 'Calendar', url: '/calendar', type: 'item', icon: icons.IconCalendar }
  ]
};

const money: NavItemType = {
  id: 'money',
  title: 'Money',
  type: 'group',
  children: [
    { id: 'finance', title: 'Finance & accounting', url: '/finance', type: 'item', icon: icons.IconReportMoney },
    { id: 'integrations', title: 'Integrations', icon: icons.IconPlugConnected, type: 'item', url: '/integrations' },
    { id: 'documents', title: 'Documents', url: '/documents', type: 'item', icon: icons.IconFiles }
  ]
};

const understand: NavItemType = {
  id: 'understand',
  title: 'Understand',
  type: 'group',
  children: [
    { id: 'insights', title: 'Insights', url: '/insights', type: 'item', icon: icons.IconSparkles },
    { id: 'analytics', title: 'Analytics', url: '/analytics', type: 'item', icon: icons.IconChartBar },
    { id: 'inner-circle', title: 'Inner Circle', url: '/inner-circle', type: 'item', icon: icons.IconCrown },
    { id: 'settings', title: 'Settings', url: '/settings', type: 'item', icon: icons.IconSettings }
  ]
};

export const menuGroups: NavItemType[] = [operate, money, understand];

// Every top-level destination across the groups, for id lookups.
export const topLevelItems: NavItemType[] = menuGroups.flatMap((group) => group.children ?? []);

export default menuGroups;
