import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

// project imports
import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';
import HorizontalBar from './HorizontalBar';
import MainContentStyled from './MainContentStyled';
import Loader from 'ui-component/Loader';

import { MenuOrientation, ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { containerViewportOffset } from 'store/constant';
import { useSelector } from 'store';
import { useGlobalSyncMonitor } from 'hooks/useGlobalSyncMonitor';
import { buildImmersiveSurfaces } from 'themes/immersiveTheme';

// ==============================|| MAIN LAYOUT ||============================== //

export default function MainLayout() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const { borderRadius, container, miniDrawer, menuOrientation, brandTheme, mode } = useConfig();
  const { menuMaster, menuMasterLoading } = useGetMenuMaster();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;

  // Get QuickBooks connection status for global sync monitoring
  const { quickbooks } = useSelector((state) => state.integrations);
  const { currentRole } = useSelector((state) => state.auth);

  const companyId = currentRole?.company_id || null;
  const isConnected =
    quickbooks.connection.status === 'connected' ||
    quickbooks.connection.status === 'refreshing' ||
    quickbooks.connection.status === 'expired';

  // Initialize global sync monitoring
  useGlobalSyncMonitor(companyId, isConnected);

  useEffect(() => {
    handlerDrawerOpen(!miniDrawer);
  }, [miniDrawer]);

  useEffect(() => {
    downMD && handlerDrawerOpen(false);
  }, [downMD]);

  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downMD;

  // horizontal menu-list bar : drawer
  const menu = useMemo(() => (isHorizontal ? <HorizontalBar /> : <Sidebar />), [isHorizontal]);

  const { pathname } = location;
  // Immersive Inner Circle canvas: painted on the always-mounted <main> so the
  // 250ms background-color transition crossfades on BOTH route enter and leave.
  const immersiveCanvas = useMemo(() => {
    if (!pathname.startsWith('/inner-circle')) return null;
    return buildImmersiveSurfaces(brandTheme, mode === ThemeMode.DARK ? 'dark' : 'light')?.background ?? null;
  }, [pathname, brandTheme, mode]);

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
      <AppBar
        enableColorOnDark
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)'
        }}
      >
        <Toolbar sx={{ p: isHorizontal ? 1.25 : 2 }}>
          <Header />
        </Toolbar>
      </AppBar>

      {/* menu / drawer */}
      {menu}

      {/* main content */}
      <MainContentStyled
        {...{ borderRadius, menuOrientation, open: drawerOpen }}
        sx={{
          transition: `${theme.transitions.create('margin', {
            easing: drawerOpen ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter + 200
          })}, background-color 250ms ease`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          ...(immersiveCanvas && { backgroundColor: immersiveCanvas })
        }}
      >
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
