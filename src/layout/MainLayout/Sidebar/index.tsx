import { memo, useMemo } from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import MenuList from '../MenuList';
import MiniDrawerStyled from './MiniDrawerStyled';
import SidebarBrand from './SidebarBrand';
import SidebarUser from './SidebarUser';

import { MenuOrientation } from 'config';
import useConfig from 'hooks/useConfig';
import { drawerWidth } from 'store/constant';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// ==============================|| SIDEBAR DRAWER ||============================== //
// Design handoff 1.6: 236px wide, a 64px brand header, captioned groups, and the
// user row pinned to the bottom. The drawer owns its own header now; the app bar
// starts to its right rather than spanning over it.

function Sidebar({ seamless = false }: { seamless?: boolean }) {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const { menuOrientation, miniDrawer, mode } = useConfig();

  const drawer = useMemo(() => {
    const isVerticalOpen = menuOrientation === MenuOrientation.VERTICAL && drawerOpen;
    const drawerContent = null;
    // No top padding: the first group caption sits just under the header line.
    const padding = drawerOpen ? '0 10px 14px' : '12px 0';

    return (
      <>
        {downMD ? (
          <Box sx={{ padding }}>
            <MenuList />
            {isVerticalOpen && drawerContent}
          </Box>
        ) : (
          <PerfectScrollbar style={{ flex: 1, minHeight: 0, padding }}>
            <MenuList />
            {isVerticalOpen && drawerContent}
          </PerfectScrollbar>
        )}
      </>
    );
  }, [downMD, drawerOpen, menuOrientation, mode]);

  const toggle = () => handlerDrawerOpen(!drawerOpen);

  return (
    <Box component="nav" sx={{ flexShrink: { md: 0 }, width: { xs: 'auto', md: drawerWidth } }} aria-label="Main navigation">
      {downMD || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downMD ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={toggle}
          sx={{
            '& .MuiDrawer-paper': {
              zIndex: 1099,
              width: drawerWidth,
              ...(seamless && { '&.MuiPaper-root': { borderRight: 'none' } }),
              bgcolor: 'background.default',
              color: 'text.primary',
              display: 'flex',
              flexDirection: 'column'
            }
          }}
          ModalProps={{ keepMounted: true }}
          color="inherit"
        >
          <SidebarBrand collapsed={false} onToggle={downMD ? undefined : toggle} />
          {drawer}
          <SidebarUser collapsed={false} />
        </Drawer>
      ) : (
        <MiniDrawerStyled variant="permanent" open={drawerOpen} seamless={seamless}>
          <SidebarBrand collapsed={!drawerOpen} onToggle={toggle} />
          {drawer}
          <SidebarUser collapsed={!drawerOpen} />
        </MiniDrawerStyled>
      )}
    </Box>
  );
}

export default memo(Sidebar);
