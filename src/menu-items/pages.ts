// assets
import {
  IconLayoutDashboard,
  IconCashRegister,
  IconHeartHandshake,
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
  IconSparkles,
  IconSettings,
  IconCrown,
  IconTruck,
  IconClipboardList
} from '@tabler/icons-react';

import { NavItemType } from 'types';

// constant — one icon per destination, chosen for what the section does:
// dashboard = layout grid, POS = register, CRM = relationship handshake,
// inventory = packages, insights = AI sparkles, documents = file stack.
const icons = {
  IconLayoutDashboard,
  IconCashRegister,
  IconHeartHandshake,
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
  IconSparkles,
  IconSettings,
  IconCrown,
  IconTruck,
  IconClipboardList
};

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const pages: NavItemType = {
  id: 'root',
  title: '',
  type: 'group',
  children: [
    { id: 'dashboard', title: 'Dashboard', icon: icons.IconLayoutDashboard, type: 'item', url: '/dashboard' },
    { id: 'pos', title: 'POS', icon: icons.IconCashRegister, type: 'item', url: '/pos' },
    { id: 'integrations', title: 'Integrations', icon: icons.IconPlugConnected, type: 'item', url: '/integrations' },
    { id: 'finance', title: 'Finance & Accounting', url: '/finance', type: 'item', icon: icons.IconReportMoney },
    {
      id: 'employees',
      title: 'Employees & Payroll',
      type: 'collapse',
      icon: icons.IconUsersGroup,
      children: [
        { id: 'employees-home', title: 'Directory', type: 'item', url: '/employees', icon: icons.IconAddressBook },
        { id: 'employees-clock', title: 'Clock In / Out', type: 'item', url: '/employees/clock', icon: icons.IconClock },
        { id: 'employees-time-approval', title: 'Time Approval', type: 'item', url: '/employees/time-approval', icon: icons.IconClockCheck },
        { id: 'employees-scheduling', title: 'Auto-Scheduling', type: 'item', url: '/scheduling', icon: icons.IconCalendarTime }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory',
      type: 'collapse',
      icon: icons.IconPackages,
      children: [
        { id: 'inventory-home', title: 'Inventory', type: 'item', url: '/inventory', icon: icons.IconPackage },
        { id: 'inventory-update', title: 'Update Inventory', type: 'item', url: '/inventory/update', icon: icons.IconBarcode }
      ]
    },
    { id: 'vendors', title: 'Vendors', type: 'item', url: '/vendors', icon: icons.IconTruck },
    { id: 'insights', title: 'Insights', url: '/insights', type: 'item', icon: icons.IconSparkles },
    { id: 'analytics', title: 'Analytics', url: '/analytics', type: 'item', icon: icons.IconChartBar },
    { id: 'documents', title: 'Documents', url: '/documents', type: 'item', icon: icons.IconFiles },
    { id: 'crm', title: 'CRM', url: '/crm', type: 'item', icon: icons.IconHeartHandshake },
    {
      id: 'inner-circle',
      title: 'Inner Circle',
      type: 'collapse',
      icon: icons.IconCrown,
      children: [
        { id: 'inner-circle-home', title: 'Dashboard', type: 'item', url: '/inner-circle', icon: icons.IconLayoutDashboard },
        {
          id: 'inner-circle-survey-drafts',
          title: 'Survey Drafts',
          type: 'item',
          url: '/inner-circle/surveys/drafts',
          icon: icons.IconClipboardList
        }
      ]
    },
    { id: 'calendar', title: 'Calendar', url: '/calendar', type: 'item', icon: icons.IconCalendar },
    { id: 'settings', title: 'Settings', url: '/settings', type: 'item', icon: icons.IconSettings }
  ]
};

export default pages;
