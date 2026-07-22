import { createContext, ReactNode, useContext, useMemo } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, createTheme, Theme, ThemeProvider, TypographyVariantsOptions } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import componentStyleOverrides from 'themes/compStyleOverride';
import { buildTemplateSurfaces, ImmersiveSurfaces, resolveZoneTheme } from 'themes/immersiveTheme';
import { buildTheme } from 'themes/palette';
import customShadows from 'themes/shadows';
import Typography from 'themes/typography';

// types
import { CustomShadowProps } from 'types/default-theme';

interface ImmersiveContextValue {
  active: boolean;
  surfaces: ImmersiveSurfaces | null;
}

const ImmersiveContext = createContext<ImmersiveContextValue>({ active: false, surfaces: null });

export function useImmersive(): ImmersiveContextValue {
  return useContext(ImmersiveContext);
}

// ==============================|| INNER CIRCLE - IMMERSIVE THEME PROVIDER ||============================== //

// Route-scoped brand-immersive theme. When the brand yields no sensible tint
// (no brand, malformed hex, neutral brand) it renders children untouched, so
// the standard theme is the guaranteed fallback.
export default function ImmersiveThemeProvider({ children }: { children: ReactNode }) {
  const { borderRadius, brandTheme, fontFamily, headingFontFamily, mode, outlinedFilled, themeDirection } = useConfig();
  const headingFont = brandTheme?.headingFont ?? headingFontFamily;
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const schemeMode = mode === ThemeMode.DARK ? 'dark' : 'light';
  const template = brandTheme?.template ?? 'soft';
  const brandedZone = brandTheme?.brandedZone ?? 'main-app';

  // The IC zone's theme: colors + the EFFECTIVE mode (may differ from the app's mode toggle —
  // a dark-brand company's branded zone renders with the dark ramp even while the app is light).
  const zoneTheme = useMemo(
    () => resolveZoneTheme(brandTheme, schemeMode, { self: 'inner-circle', brandedZone, template }),
    [brandTheme, schemeMode, brandedZone, template]
  );

  // `surfaces` (ImmersiveSurfaces, with headerBand) only exists when Inner Circle IS the
  // branded zone — the full template treatment, built at the zone's EFFECTIVE mode (the
  // resolved polarity). When main-app is branded instead, Inner Circle renders the neutral
  // contrast chrome, which has no hero-band concept.
  const surfaces = useMemo<ImmersiveSurfaces | null>(
    () => (zoneTheme && brandedZone === 'inner-circle' ? buildTemplateSurfaces(brandTheme, zoneTheme.mode, template) : null),
    [brandTheme, zoneTheme, template, brandedZone]
  );

  const immersiveTheme: Theme | null = useMemo(() => {
    if (!zoneTheme) return null;

    const themeMode = zoneTheme.mode === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT;

    // Same assembly recipe as ThemeCustomization (themes/index.tsx), from the
    // zone-resolved ColorProps + the EFFECTIVE mode; componentStyleOverrides comes LAST so
    // every override derives from the finished tinted theme.
    const paletteTheme = buildTheme(themeMode, zoneTheme.colors);
    const typography: TypographyVariantsOptions = Typography(paletteTheme, borderRadius, fontFamily, headingFont);
    if (surfaces) {
      (['h1', 'h2', 'h3', 'h4'] as const).forEach((variant) => {
        typography[variant] = { ...(typography[variant] as object), color: surfaces.headingInk };
      });
    }
    const shadows: CustomShadowProps = customShadows(themeMode, paletteTheme);

    const theme = createTheme({
      direction: themeDirection,
      palette: paletteTheme.palette,
      breakpoints: { values: { xs: 0, sm: 375, md: 768, lg: 1024, xl: 1536 } },
      mixins: { toolbar: { minHeight: '64px', padding: '16px' } },
      typography,
      customShadows: shadows
    });

    const base = componentStyleOverrides(theme, borderRadius, outlinedFilled);
    const accent = theme.palette.primary.main;
    const baseTabs = (base?.MuiTabs?.styleOverrides ?? {}) as Record<string, object>;
    const baseTab = (base?.MuiTab?.styleOverrides ?? {}) as Record<string, object>;
    const baseTableCell = (base?.MuiTableCell?.styleOverrides ?? {}) as Record<string, object>;
    const baseButton = (base?.MuiButton?.styleOverrides ?? {}) as Record<string, object>;
    const baseTabRoot = (baseTab.root ?? {}) as Record<string, unknown>;
    const baseTabSelected = (baseTabRoot['&.Mui-selected'] ?? {}) as object;
    const baseTableCellRoot = (baseTableCell.root ?? {}) as Record<string, unknown>;
    const baseTableCellHead = (baseTableCellRoot['&.MuiTableCell-head'] ?? {}) as object;

    theme.components = {
      ...base,
      MuiTabs: { styleOverrides: { ...baseTabs, indicator: { ...baseTabs.indicator, backgroundColor: accent } } },
      MuiTab: {
        styleOverrides: {
          ...baseTab,
          root: { ...baseTabRoot, '&.Mui-selected': { ...baseTabSelected, color: accent } }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          ...baseTableCell,
          root: { ...baseTableCellRoot, '&.MuiTableCell-head': { ...baseTableCellHead, backgroundColor: alpha(accent, 0.06) } }
        }
      },
      MuiButton: {
        styleOverrides: {
          ...baseButton,
          containedPrimary: {
            ...baseButton.containedPrimary,
            backgroundColor: accent,
            color: theme.palette.primary.contrastText,
            '&:hover': { backgroundColor: theme.palette.primary.dark }
          }
        }
      }
    } as Theme['components'];

    return theme;
  }, [zoneTheme, surfaces, template, brandedZone, borderRadius, fontFamily, headingFont, outlinedFilled, themeDirection]);

  // `active` tracks full template immersion specifically (hero band etc.), which only
  // applies when Inner Circle is the branded zone — not the neutral-contrast case.
  const ctx = useMemo<ImmersiveContextValue>(() => ({ active: surfaces !== null, surfaces }), [surfaces]);

  if (!immersiveTheme) {
    return <>{children}</>;
  }

  return (
    <ImmersiveContext.Provider value={ctx}>
      <ThemeProvider theme={immersiveTheme}>
        <Fade in appear timeout={reducedMotion ? 0 : 250}>
          <Box>{children}</Box>
        </Fade>
      </ThemeProvider>
    </ImmersiveContext.Provider>
  );
}
