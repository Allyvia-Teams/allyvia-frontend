import { buildMenuRoot } from 'registry/builders';
import type { NavItemType } from 'types';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: { items: NavItemType[] } = {
  items: [buildMenuRoot()]
};

// Default export for MenuList and Breadcrumbs components
export default menuItems;
