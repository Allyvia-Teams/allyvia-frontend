import { memo, useMemo, useState, useEffect, useRef } from 'react';
// import { memo, useLayoutEffect, useState } from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import NavItem from './NavItem';
import NavGroup from './NavGroup';
import { MenuOrientation } from 'config';
import useConfig from 'hooks/useConfig';
import { useSelector, useDispatch } from 'store';
import { useLocation } from 'react-router-dom';
import { getMenuItemsFromSubscription } from 'utils/subscription-menu';
import { fetchMyPermissions } from 'store/slices/role';
import { permissionKeyToMenuIdMap, requiresPermissionCheck } from 'registry/builders';
import { buildAllowedKeys, makeMenuChecker } from 'utils/permission-helpers';
import type { SubscriptionStatusResponse } from 'types/subscription';

// import { Menu } from 'menu-items/widget';
import { HORIZONTAL_MAX_ITEM } from 'config';
import { useGetMenuMaster } from 'api/menu';
// import { useGetMenu, useGetMenuMaster } from 'api/menu';

// types
import { NavItemType } from 'types';

// ==============================|| SIDEBAR MENU LIST ||============================== //

function MenuList() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const dispatch = useDispatch();

  const { menuOrientation } = useConfig();
  // const { menuLoading } = useGetMenu();
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downMD;

  const [selectedID, setSelectedID] = useState<string | undefined>('');
  const location = useLocation();
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn);
  const roleType = useSelector((s) => s.auth.currentRole?.role_type as string | undefined);
  const currentRoleId = useSelector((s) => s.auth.currentRole?.id);
  // Use permissions from role slice (myPermissions) - this has the effective permissions from backend
  const myPermissions = useSelector((s) => s.role.myPermissions);
  const myPermissionsLoading = useSelector((s) => s.role.myPermissionsLoading);
  const subscription = useSelector((s) => s.subscription.status);
  const availableModules = useSelector((s) => s.role.availableModules);
  const kiosk = useSelector((s) => s.kiosk);

  // Get permissions from new structure (permissions at top level)
  const permissions = myPermissions?.permissions;

  // Get available_modules from separate endpoint (not in permissions response)
  // Use availableModules from Redux state (fetched separately via fetchAvailableModules)
  const availableModulesSource = availableModules?.available_modules;

  // Fetch current user's permissions when logged in (from role slice)
  // Also refetch when role changes (currentRoleId changes) to get fresh permissions for new role
  // Use a ref to track the last fetched role ID to prevent infinite loops
  const lastFetchedRoleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !currentRoleId) {
      // Reset ref when user logs out
      lastFetchedRoleIdRef.current = null;
      return;
    }

    // Check if we already have permissions for this role
    const hasPermissionsForCurrentRole = myPermissions?.role?.id === currentRoleId;
    const alreadyFetchingForRole = lastFetchedRoleIdRef.current === currentRoleId;

    // Only fetch if:
    // 1. Not currently loading
    // 2. We haven't already initiated a fetch for this role (tracked by ref)
    // 3. We don't have permissions for this role yet
    if (!myPermissionsLoading && !alreadyFetchingForRole && !hasPermissionsForCurrentRole) {
      lastFetchedRoleIdRef.current = currentRoleId;
      dispatch(fetchMyPermissions());
    }
  }, [isLoggedIn, currentRoleId, myPermissionsLoading, dispatch]); // Only depend on these, check myPermissions inside

  // Build filtered menu based on subscription, role, permissions, and kiosk mode
  const activeMenu = useMemo(() => {
    const isMember = (roleType || '').toLowerCase() === 'member';
    const onKioskLogin = location.pathname === '/kiosk/login';
    const onKioskRoute = location.pathname.startsWith('/kiosk');

    // Hide sidebar only on the Kiosk login page
    if (onKioskLogin) return { items: [] as NavItemType[] };

    // Step 1: Filter by subscription first (what modules are available to the company)
    // Use availableModules from role slice (fetched via /api/v1/role/available-modules/)
    // Otherwise fallback to subscription.available_modules
    const modulesForFiltering = availableModulesSource || subscription?.available_modules;
    const subscriptionForFiltering: SubscriptionStatusResponse | null =
      modulesForFiltering && subscription
        ? {
            ...subscription,
            available_modules: modulesForFiltering
          }
        : subscription;

    let filteredMenu = getMenuItemsFromSubscription(subscriptionForFiltering);
    const root = filteredMenu;

    // If no subscription modules available, return empty menu
    if (!root.children || root.children.length === 0) {
      return { items: [] as NavItemType[] };
    }

    // Step 2: Filter by permissions if they exist (what user has permission to access)
    // Special case: Admin users with empty or invalid permissions should see all subscription modules
    const isAdmin = roleType?.toLowerCase() === 'admin';

    // Use permission structure (role.permissions)
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      // Build allowed keys from permissions
      // This extracts all permission keys where view: true, handling pages/tabs arrays
      const allowedKeys = buildAllowedKeys(permissions);

      // STEP B: Create permission checker with warnings for unmapped keys
      const hasPermission = makeMenuChecker(allowedKeys, permissionKeyToMenuIdMap);

      // If no allowed keys (all permissions are view: false), fall back to subscription-only for admins
      // For non-admins, this means they have no access
      if (allowedKeys.size === 0) {
        // Admin users should see all subscription modules if permissions have no view: true items
        // This handles cases where permissions are being set up or admin role is incomplete
        if (isAdmin && !onKioskRoute) {
          return { items: [filteredMenu] };
        }
        // Non-admin users with no view permissions should see nothing
        return { items: [] as NavItemType[] };
      }

      const filteredChildren: NavItemType[] = [];

      for (const item of root.children || []) {
        // Handle collapse items (employees, inventory)
        //
        // PRECEDENCE RULE:
        // 1. Subscription filtering (Step A) already filtered by available_modules
        // 2. Permission filtering (Step B) checks if user has permission
        // 3. Items with requiresPermission: false are always shown
        //
        // For collapse items:
        // - If parent has requiresPermission: false → always show
        // - If parent has permission → show all children (children already filtered by subscription)
        // - If only children have permission → show only those children
        // - This keeps subscription constraints strict (parent permission doesn't bypass subscription)
        if (item.type === 'collapse' && item.children && item.id) {
          // Check if parent doesn't require permission
          const parentNoPermissionRequired = !requiresPermissionCheck(item.id);

          // Check if parent key has permission OR any children have permission
          const parentHasPermission = hasPermission(item.id);
          // Filter children that have permission OR don't require permission (children are already subscription-filtered)
          const visibleChildren = item.children.filter((child) => {
            if (!child.id) return false;
            // Always show children that don't require permission
            if (!requiresPermissionCheck(child.id)) return true;
            // Otherwise check permission
            return hasPermission(child.id);
          });

          // If parent doesn't require permission, always show all children
          if (parentNoPermissionRequired) {
            filteredChildren.push({ ...item, children: item.children });
          }
          // If parent has permission, show all children (children already subscription-filtered in Step A)
          else if (parentHasPermission) {
            // Parent has permission - show all children
            // Note: Children are already filtered by subscription, so this is safe
            filteredChildren.push({ ...item, children: item.children });
          } else if (visibleChildren.length > 0) {
            // Only some children have permission or don't require permission - show only those children
            filteredChildren.push({ ...item, children: visibleChildren });
          }
        }
        // Handle regular items - check if they have permission or don't require permission
        else if (item.type === 'item' && item.id) {
          // Always show items that don't require permission
          if (!requiresPermissionCheck(item.id)) {
            filteredChildren.push(item);
          } else if (hasPermission(item.id)) {
            filteredChildren.push(item);
          }
        }
      }

      // If filtering resulted in empty menu, fall back to subscription-only for admins
      // This handles edge cases where permissions don't match subscription modules
      if (filteredChildren.length === 0) {
        if (isAdmin && !onKioskRoute) {
          // Admin should see all subscription modules as fallback
          return { items: [filteredMenu] };
        }
        // Non-admin users see nothing if no permissions match
        return { items: [] as NavItemType[] };
      }

      const filteredRoot: NavItemType = { ...root, children: filteredChildren };
      return { items: [filteredRoot] };
    }

    // Fallback: If no permissions exist, use subscription-filtered menu
    // For admin users, always show subscription modules if no permissions
    // For non-admin users, show subscription modules if not member/kiosk
    const showLimited = isMember || onKioskRoute;
    if (!showLimited || isAdmin) {
      // If no permissions, use subscription-filtered menu
      // Admin users should always see subscription modules as fallback
      return { items: [filteredMenu] };
    }

    // Limited menu: Inventory and Employees → Clock In/Out
    const filteredChildren: NavItemType[] = [];
    for (const item of root.children || []) {
      if (item.id === 'employees') {
        // Replace the Employees group with a single Clock In/Out item so the header doesn't say "Employees & Payroll"
        const clock = (item.children || []).find((c: NavItemType) => c.id === 'employees-clock');
        if (clock) {
          const clockUrl = kiosk.isAuthenticated || onKioskRoute ? '/kiosk/clock' : (clock as any).url || '/employees/clock';
          filteredChildren.push({ ...clock, url: clockUrl });
        }
      } else if (item.id === 'inventory') {
        const invUrl = kiosk.isAuthenticated || onKioskRoute ? '/kiosk/inventory' : (item as any).url || '/inventory';
        filteredChildren.push({ ...item, url: invUrl });
      }
    }
    const filteredRoot: NavItemType = { ...root, children: filteredChildren };
    return { items: [filteredRoot] };
  }, [kiosk.isAuthenticated, location.pathname, roleType, permissions, subscription, availableModulesSource]);
  // const [menuItems, setMenuItems] = useState<{ items: NavItemType[] }>({ items: [] });

  // let widgetMenu = Menu();

  // useLayoutEffect(() => {
  //   const isFound = menuItem.items.some((element) => {
  //     if (element.id === 'group-widget') {
  //       return true;
  //     }
  //     return false;
  //   });
  //   if (menuLoading) {
  //     menuItem.items.splice(1, 0, widgetMenu);
  //     setMenuItems({ items: [...menuItem.items] });
  //   } else if (!menuLoading && widgetMenu?.id !== undefined && !isFound) {
  //     menuItem.items.splice(1, 1, widgetMenu);
  //     setMenuItems({ items: [...menuItem.items] });
  //   } else {
  //     setMenuItems({ items: [...menuItem.items] });
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [menuLoading]);

  // last menu-item to show in horizontal menu bar
  const lastItem = isHorizontal ? HORIZONTAL_MAX_ITEM : null;

  // Ensure activeMenu.items exists and is an array
  const menuItems = activeMenu?.items || [];
  let lastItemIndex = menuItems.length - 1;
  let remItems: NavItemType[] = [];
  let lastItemId: string;

  if (lastItem && lastItem < menuItems.length) {
    lastItemId = menuItems[lastItem - 1].id!;
    lastItemIndex = lastItem - 1;
    remItems = menuItems.slice(lastItem - 1, menuItems.length).map((item) => ({
      title: item.title,
      elements: item.children,
      icon: item.icon,
      ...(item.url && {
        url: item.url
      })
    }));
  }

  const navItems = menuItems.slice(0, Math.max(0, lastItemIndex + 1)).map((item, index) => {
    switch (item.type) {
      case 'group':
        if (item.url && item.id !== lastItemId) {
          return (
            <List key={item.id}>
              <NavItem item={item} level={1} isParents setSelectedID={() => setSelectedID('')} />
              {!isHorizontal && index !== 0 && <Divider sx={{ py: 0.5 }} />}
            </List>
          );
        }

        return (
          <NavGroup
            key={item.id}
            setSelectedID={setSelectedID}
            selectedID={selectedID}
            item={item}
            lastItem={lastItem!}
            remItems={remItems}
            lastItemId={lastItemId}
          />
        );
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Menu Items Error
          </Typography>
        );
    }
  });

  return !isHorizontal ? <Box {...(drawerOpen && { sx: { mt: 1.5 } })}>{navItems}</Box> : <>{navItems}</>;
}

export default memo(MenuList);
