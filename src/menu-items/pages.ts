// assets
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
  IconList,
  IconBulb
} from '@tabler/icons-react';

import { NavItemType } from 'types';

// constant
const icons = {
  IconHome,
  IconReportMoney,
  IconLifebuoy,
  IconBuildingCommunity,
  IconChartBar,
  IconFile,
  IconSpeakerphone,
  IconObjectScan,
  IconUsersGroup,
  IconCalendar,
  IconPlugConnected,
  IconClock,
  IconList,
  IconBulb
};

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const pages: NavItemType = {
  id: 'root',
  title: '',
  type: 'group',
  children: [
    { id: 'dashboard', title: 'Dashboard', icon: icons.IconHome, type: 'item', url: '/dashboard' },
    { id: 'integrations', title: 'Integrations', icon: icons.IconPlugConnected, type: 'item', url: '/integrations' },
    { id: 'finance', title: 'Finance & Accounting', url: '/finance', type: 'item', icon: icons.IconReportMoney },
    {
      id: 'employees',
      title: 'Employees & Payroll',
      type: 'collapse', // was 'item'
      icon: icons.IconUsersGroup,
      children: [
        { id: 'employees-home', title: 'Directory', type: 'item', url: '/employees', icon: icons.IconList },
        { id: 'employees-clock', title: 'Clock In / Out', type: 'item', url: '/employees/clock', icon: icons.IconClock }
      ]
    },
    { id: 'crm', title: 'CRM', url: '/crm', type: 'item', icon: icons.IconLifebuoy },
    { id: 'community', title: 'Community Networking', url: '/community', type: 'item', icon: icons.IconBuildingCommunity },
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
    { id: 'documents', title: 'Documents', url: '/documents', type: 'item', icon: icons.IconFile },
    { id: 'analytics', title: 'Analytics', url: '/analytics', type: 'item', icon: icons.IconChartBar },
    { id: 'insights', title: 'Insights', url: '/insights', type: 'item', icon: icons.IconBulb },
    { id: 'calendar', title: 'Calendar', url: '/calendar', type: 'item', icon: icons.IconCalendar },
    { id: 'marketing', title: 'Marketing Tools', url: '/marketing', type: 'item', icon: icons.IconSpeakerphone }
  ]
};

export default pages;
