import { memo, useMemo, useState } from 'react';
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
import menuItems from 'menu-items';
import useConfig from 'hooks/useConfig';
import { useSelector } from 'store';
import { useLocation } from 'react-router-dom';

// import { Menu } from 'menu-items/widget';
import { HORIZONTAL_MAX_ITEM } from 'config';
import { useGetMenuMaster } from 'api/menu';
// import { useGetMenu, useGetMenuMaster } from 'api/menu';

// types
import { NavItemType } from 'types';

// ==============================|| SIDEBAR MENU LIST ||============================== //

function MenuList() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const { menuOrientation } = useConfig();
  // const { menuLoading } = useGetMenu();
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downMD;

  const [selectedID, setSelectedID] = useState<string | undefined>('');
  const location = useLocation();
  const roleType = useSelector((s) => s.auth.currentRole?.role_type as string | undefined);
  const kiosk = useSelector((s) => s.kiosk);

  // Build filtered menu based on role and kiosk mode
  const activeMenu = useMemo(() => {
    // Hide sidebar for kiosk pages entirely
    if (location.pathname.startsWith('/kiosk') || kiosk.isAuthenticated) {
      return { items: [] as NavItemType[] };
    }

    // Default full menu
    if ((roleType || '').toLowerCase() !== 'member') {
      return { items: menuItems.items };
    }

    // Member role: allow only Clock and Inventory (no Directory)
    const root = (menuItems.items[0] || { id: 'root', title: '', type: 'group', children: [] }) as NavItemType;
    const filteredChildren: NavItemType[] = [];
    for (const item of root.children || []) {
      if (item.id === 'employees') {
        const allowedKids = (item.children || []).filter((c: NavItemType) => c.id === 'employees-clock');
        filteredChildren.push({ ...item, children: allowedKids });
      } else if (item.id === 'inventory') {
        filteredChildren.push(item);
      }
    }

    const filteredRoot: NavItemType = { ...root, children: filteredChildren };
    return { items: [filteredRoot] };
  }, [kiosk.isAuthenticated, location.pathname, roleType]);
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

  let lastItemIndex = activeMenu.items.length - 1;
  let remItems: NavItemType[] = [];
  let lastItemId: string;

  if (lastItem && lastItem < activeMenu.items.length) {
    lastItemId = activeMenu.items[lastItem - 1].id!;
    lastItemIndex = lastItem - 1;
    remItems = activeMenu.items.slice(lastItem - 1, activeMenu.items.length).map((item) => ({
      title: item.title,
      elements: item.children,
      icon: item.icon,
      ...(item.url && {
        url: item.url
      })
    }));
  }

  const navItems = activeMenu.items.slice(0, Math.max(0, lastItemIndex + 1)).map((item, index) => {
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
