// assets
import { IconHome } from '@tabler/icons-react';
import { NavItemType } from 'types';

// constant
// We'll populate this with the icons for other pages
const icons = { IconHome };

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const pages: NavItemType = {
  id: 'dashboard',
  title: 'dashboard',
  icon: icons.IconHome,
  type: 'group',
  url: '/dashboard'
};

export default pages;
