import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// material-ui
import { createTheme, Theme, ThemeProvider, useTheme } from '@mui/material/styles';
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
import { resolveChromeTheme } from 'themes/immersiveTheme';
import { buildTheme } from 'themes/palette';
import Typography from 'themes/typography';
import customShadows from 'themes/shadows';
import componentStyleOverrides from 'themes/compStyleOverride';

// ==============================|| MAIN LAYOUT ||============================== //

export default function MainLayout() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const {
    borderRadius,
    container,
    miniDrawer,
    menuOrientation,
    brandTheme,
    mode,
    fontFamily,
    headingFontFamily,
    outlinedFilled,
    themeDirection
  } = useConfig();
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

  // Chrome (Sidebar + AppBar) theme: the brand TEMPLATE applied ONLY to the chrome, at its
  // effective polarity (dark brand + soft/bold -> dark chrome; bright -> light; dark app mode ->
  // dark). Content (MainContentStyled/Outlet below) is NOT wrapped in this theme — it stays on
  // the standard light-brand global theme from ThemeCustomization/Palette(), so cards, tables,
  // and status chips stay legible. See
  // docs/superpowers/specs/2026-07-21-chrome-only-theming-addendum.md.
  const chromeTheme = useMemo<Theme | null>(() => {
    const schemeMode = mode === ThemeMode.DARK ? 'dark' : 'light';
    const template = brandTheme?.template ?? 'soft';
    const resolvedChrome = resolveChromeTheme(brandTheme, schemeMode, template);
    if (!resolvedChrome) return null;

    const chromeMode = resolvedChrome.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT;
    const headingFont = brandTheme?.headingFont ?? headingFontFamily;

    // Same 4-step assembly as ThemeCustomization (themes/index.tsx): palette -> typography ->
    // customShadows -> componentStyleOverrides, built from the chrome-resolved ColorProps + mode.
    const paletteTheme = buildTheme(chromeMode, resolvedChrome.colors);
    const themeTypography = Typography(paletteTheme, borderRadius, fontFamily, headingFont);
    const themeCustomShadows = customShadows(chromeMode, paletteTheme);

    const built = createTheme({
      direction: themeDirection,
      palette: paletteTheme.palette,
      breakpoints: { values: { xs: 0, sm: 375, md: 768, lg: 1024, xl: 1536 } },
      mixins: { toolbar: { minHeight: '64px', padding: '16px' } },
      typography: themeTypography,
      customShadows: themeCustomShadows
    });
    built.components = componentStyleOverrides(built, borderRadius, outlinedFilled);
    return built;
  }, [brandTheme, mode, borderRadius, fontFamily, headingFontFamily, outlinedFilled, themeDirection]);

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

  // Chrome (AppBar + Sidebar/HorizontalBar) renders under the branded chrome theme when one
  // resolves; otherwise it falls through to the ambient (global) theme untouched, so the standard
  // no-brand look is identical to before this change.
  const chrome = (
    <>
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
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {chromeTheme ? <ThemeProvider theme={chromeTheme}>{chrome}</ThemeProvider> : chrome}

      {/* main content — always the global light theme; never wrapped in the chrome theme, so
          cards/tables/status chips stay legible regardless of the chrome's template/polarity. */}
      <MainContentStyled
        {...{ borderRadius, menuOrientation, open: drawerOpen }}
        sx={{
          transition: `${theme.transitions.create('margin', {
            easing: drawerOpen ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter + 200
          })}`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
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
