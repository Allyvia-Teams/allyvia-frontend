// assets
import {
  IconHome,
  IconLifebuoy,
  IconReportMoney,
  IconChartBar,
  IconFile,
  IconObjectScan,
  IconUsersGroup,
  IconCalendar,
  IconCalendarTime,
  IconPlugConnected,
  IconClock,
  IconList,
  IconScan,
  IconBulb,
  IconCheck,
  IconSettings,
  IconCrown,
  IconTruck,
  IconClipboardList
} from '@tabler/icons-react';

import { NavItemType } from 'types';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';

// constant
const icons = {
  IconHome,
  IconReportMoney,
  IconLifebuoy,
  IconChartBar,
  IconFile,
  IconObjectScan,
  IconUsersGroup,
  IconCalendar,
  IconCalendarTime,
  IconPlugConnected,
  IconClock,
  IconList,
  IconScan,
  IconBulb,
  IconCheck,
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
    { id: 'dashboard', title: 'Dashboard', icon: icons.IconHome, type: 'item', url: '/dashboard' },
    { id: 'pos', title: 'POS', icon: PointOfSaleIcon, type: 'item', url: '/pos' },
    { id: 'integrations', title: 'Integrations', icon: icons.IconPlugConnected, type: 'item', url: '/integrations' },
    { id: 'finance', title: 'Finance & Accounting', url: '/finance', type: 'item', icon: icons.IconReportMoney },
    {
      id: 'employees',
      title: 'Employees & Payroll',
      type: 'collapse',
      icon: icons.IconUsersGroup,
      children: [
        { id: 'employees-home', title: 'Directory', type: 'item', url: '/employees', icon: icons.IconList },
        { id: 'employees-clock', title: 'Clock In / Out', type: 'item', url: '/employees/clock', icon: icons.IconClock },
        { id: 'employees-time-approval', title: 'Time Approval', type: 'item', url: '/employees/time-approval', icon: icons.IconCheck },
        { id: 'employees-scheduling', title: 'Auto-Scheduling', type: 'item', url: '/scheduling', icon: icons.IconCalendarTime }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory',
      type: 'collapse',
      icon: icons.IconObjectScan,
      children: [
        { id: 'inventory-home', title: 'Inventory', type: 'item', url: '/inventory', icon: icons.IconObjectScan },
        { id: 'inventory-update', title: 'Update Inventory', type: 'item', url: '/inventory/update', icon: icons.IconScan }
      ]
    },
    { id: 'vendors', title: 'Vendors', type: 'item', url: '/vendors', icon: icons.IconTruck },
    { id: 'insights', title: 'Insights', url: '/insights', type: 'item', icon: icons.IconBulb },
    { id: 'analytics', title: 'Analytics', url: '/analytics', type: 'item', icon: icons.IconChartBar },
    { id: 'documents', title: 'Documents', url: '/documents', type: 'item', icon: icons.IconFile },
    { id: 'crm', title: 'CRM', url: '/crm', type: 'item', icon: icons.IconLifebuoy },
    {
      id: 'inner-circle',
      title: 'Inner Circle',
      type: 'collapse',
      icon: icons.IconCrown,
      children: [
        { id: 'inner-circle-home', title: 'Dashboard', type: 'item', url: '/inner-circle', icon: icons.IconCrown },
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
