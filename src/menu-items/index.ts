/**
 * Menu Items Export
 *
 * Main entry point for menu items.
 * Exports menu items in the format expected by UI components.
 *
 * All route definitions are in menu-items/routes.ts
 * All utilities are in menu-items/utils.ts
 */

import { getMenuItems } from './utils';
import type { NavItemType } from 'types';

// ==============================|| MENU ITEMS ||============================== //

// Get menu items from unified route configuration and wrap in expected format
const menuItems: { items: NavItemType[] } = {
  items: [getMenuItems()]
};

// Default export for MenuList and Breadcrumbs components
export default menuItems;
