import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// material-ui
import { createTheme, Theme, ThemeProvider, useTheme } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
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
import { cardOverrides, resolveChromeTheme, resolveContentTheme } from 'themes/immersiveTheme';
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

  // Zone gate: the owner's brand template applies either to the whole app ('main-app') or only to
  // the Inner Circle routes ('inner-circle'). When it doesn't apply on the current route, both the
  // chrome and the content stay on the ambient (global neutral) theme — i.e. today's un-branded
  // look. See docs/superpowers/specs/2026-07-21-template-gallery-design.md (Consumers section).
  const zone = brandTheme?.brandedZone ?? 'main-app';
  const isInnerCircle = location.pathname.startsWith('/inner-circle');
  const applies = zone === 'main-app' || (zone === 'inner-circle' && isInnerCircle);

  // Chrome (Sidebar + AppBar) layer: the brand TEMPLATE applied ONLY to the chrome, at its
  // effective polarity (dark chrome for sidebar/immersive/bold; tinted for tinted; neutral chrome
  // templates such as clean/widgets resolve to null so they stay ambient). Gated by `applies` so
  // the inner-circle zone only themes the chrome on /inner-circle routes. The CONTENT layer is a
  // separate ThemeProvider (contentTheme, below); neither touches the global light theme.
  const chromeTheme = useMemo<Theme | null>(() => {
    if (!applies) return null;
    const schemeMode = mode === ThemeMode.DARK ? 'dark' : 'light';
    const template = brandTheme?.template ?? 'tinted';
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
  }, [applies, brandTheme, mode, borderRadius, fontFamily, headingFontFamily, outlinedFilled, themeDirection]);

  // Content (MainContentStyled + Outlet) layer: mirrors the chrome's 4-step assembly but from
  // `resolveContentTheme`, which paints the canvas background + card/paper surfaces for the
  // tinted/immersive/bold templates and carries the accented-card override for `widgets`. Returns
  // null (content stays on the global neutral theme) when it doesn't apply or the template's
  // content is fully neutral (clean/sidebar). Gated by the same `applies` route/zone check.
  const contentTheme = useMemo<Theme | null>(() => {
    if (!applies) return null;
    const schemeMode = mode === ThemeMode.DARK ? 'dark' : 'light';
    const template = brandTheme?.template ?? 'tinted';
    const resolved = resolveContentTheme(brandTheme, schemeMode, template);
    if (!resolved) return null;

    const contentMode = resolved.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT;
    const headingFont = brandTheme?.headingFont ?? headingFontFamily;

    const paletteTheme = buildTheme(contentMode, resolved.colors);
    const themeTypography = Typography(paletteTheme, borderRadius, fontFamily, headingFont);
    const themeCustomShadows = customShadows(contentMode, paletteTheme);

    const built = createTheme({
      direction: themeDirection,
      palette: paletteTheme.palette,
      breakpoints: { values: { xs: 0, sm: 375, md: 768, lg: 1024, xl: 1536 } },
      mixins: { toolbar: { minHeight: '64px', padding: '16px' } },
      typography: themeTypography,
      customShadows: themeCustomShadows
    });
    built.components = componentStyleOverrides(built, borderRadius, outlinedFilled);

    // Merge the accented-card override (brand left-border + brand-tinted title) for the `widgets`
    // template. Deep-merge each component key's fragment into the assembled `built.components` so
    // the existing styleOverrides are preserved rather than replaced.
    if (resolved.cardAccented && brandTheme) {
      const extra = cardOverrides(brandTheme.primary);
      const components = built.components as Record<string, unknown>;
      for (const [key, frag] of Object.entries(extra)) {
        components[key] = deepmerge(components[key] ?? {}, frag);
      }
    }
    return built;
  }, [applies, brandTheme, mode, borderRadius, fontFamily, headingFontFamily, outlinedFilled, themeDirection]);

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

  // Main content panel. Extracted so it can be rendered either bare (global neutral theme) or
  // wrapped in the branded content ThemeProvider without duplicating this JSX. The sx below is
  // unchanged from before the two-layer split (transition + top-left rounding + overflow clip).
  const mainContent = (
    <MainContentStyled
      {...{ borderRadius, menuOrientation, open: drawerOpen }}
      sx={{
        transition: `${theme.transitions.create('margin', {
          easing: drawerOpen ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
          duration: theme.transitions.duration.shorter + 200
        })}`,
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        // Round the content panel's top-left where it meets the dark chrome (sidebar + header),
        // matching the inner widgets' rounding. overflow clips content to the rounded corner.
        borderTopLeftRadius: 18,
        overflow: 'hidden'
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
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Chrome layer: branded chrome theme when one resolves for this route/zone; else ambient. */}
      {chromeTheme ? <ThemeProvider theme={chromeTheme}>{chrome}</ThemeProvider> : chrome}

      {/* Content layer: branded content theme (tinted/dark canvas + cards, or the widgets accented
          cards) when one resolves; else the global neutral theme so tables/status chips stay legible. */}
      {contentTheme ? <ThemeProvider theme={contentTheme}>{mainContent}</ThemeProvider> : mainContent}
      {/* Mobile bottom navigation removed as per requirement */}
    </Box>
  );
}
