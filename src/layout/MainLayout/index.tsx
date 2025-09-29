import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

// project imports
import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';
import HorizontalBar from './HorizontalBar';
import MainContentStyled from './MainContentStyled';
import Loader from 'ui-component/Loader';

import { MenuOrientation } from 'config';
import useConfig from 'hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { containerViewportOffset } from 'store/constant';

// ==============================|| MAIN LAYOUT ||============================== //

export default function MainLayout() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const { borderRadius, container, miniDrawer, menuOrientation } = useConfig();
  const { menuMaster, menuMasterLoading } = useGetMenuMaster();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;

  useEffect(() => {
    handlerDrawerOpen(!miniDrawer);
  }, [miniDrawer]);

  useEffect(() => {
    downMD && handlerDrawerOpen(false);
  }, [downMD]);

  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downMD;

  // horizontal menu-list bar : drawer
  const menu = useMemo(() => (isHorizontal ? <HorizontalBar /> : <Sidebar />), [isHorizontal]);

  if (menuMasterLoading) return <Loader />;

  const isKioskLogin = location.pathname === '/kiosk/login';

  if (isKioskLogin) {
    // Render a minimal, full-bleed layout for kiosk login (no header/sidebar/footer)
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth={false} sx={{ px: 0 }}>
          <Outlet />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* header */}
      <AppBar enableColorOnDark position="fixed" color="inherit" elevation={0} sx={{ bgcolor: 'background.default' }}>
        <Toolbar sx={{ p: isHorizontal ? 1.25 : 2 }}>
          <Header />
        </Toolbar>
      </AppBar>

      {/* menu / drawer */}
      {menu}

      {/* main content */}
      <MainContentStyled {...{ borderRadius, menuOrientation, open: drawerOpen }}>
        <Container
          maxWidth={container ? 'lg' : false}
          sx={{
            ...(!container && { px: { xs: 0 } }),
            minHeight: `calc(100vh - ${containerViewportOffset}px)`,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* breadcrumb */}
          <Outlet />
          <Footer />
        </Container>
      </MainContentStyled>
      {/* Mobile bottom navigation removed as per requirement */}
    </Box>
  );
}
