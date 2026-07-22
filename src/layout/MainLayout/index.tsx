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
import { resolveZoneSurfaces } from 'themes/immersiveTheme';

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
  // Immersive canvas: painted on the always-mounted <main> so the 250ms background-color
  // transition crossfades on BOTH route enter and leave, for BOTH zones. MainContentStyled
  // itself renders under the outer (main-app-zone-resolved) theme regardless of route, so on
  // an Inner Circle route we must explicitly override it with the IC zone's own resolved
  // background — otherwise it would keep showing the main-app zone's chrome behind IC content.
  // Painting the main-app zone's resolved background explicitly (rather than leaving the sx
  // override absent) on non-IC routes too keeps the transition driven by an explicit value
  // change on every navigation, so a bold branded zone crossfades smoothly in both directions.
  const immersiveCanvas = useMemo(() => {
    const schemeMode = mode === ThemeMode.DARK ? 'dark' : 'light';
    const template = brandTheme?.template ?? 'soft';
    const brandedZone = brandTheme?.brandedZone ?? 'main-app';
    const self = pathname.startsWith('/inner-circle') ? 'inner-circle' : 'main-app';
    const zoneColors = resolveZoneSurfaces(brandTheme, schemeMode, { self, brandedZone, template });
    if (!zoneColors) return null;
    // Paint the deeper *background* surface on the canvas so cards (which read the lighter `paper`)
    // read as elevated layers. grey50 (light) / darkBackground (dark) carry the zone's background;
    // `paper` is the card surface and would flatten canvas==cards.
    return schemeMode === 'dark' ? zoneColors.darkBackground : zoneColors.grey50;
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
