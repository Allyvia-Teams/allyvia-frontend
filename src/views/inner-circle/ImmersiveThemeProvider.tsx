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
import { buildTemplateSurfaces, ImmersiveSurfaces, resolveZoneSurfaces } from 'themes/immersiveTheme';
import { buildTheme } from 'themes/palette';
import customShadows from 'themes/shadows';
import Typography from 'themes/typography';

// types
import { ColorProps } from 'types';
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

  // `surfaces` (ImmersiveSurfaces, with headerBand) only exists when Inner Circle IS the
  // branded zone — the full template treatment. When main-app is branded instead, Inner
  // Circle renders the neutral contrast chrome, which has no hero-band concept.
  const surfaces = useMemo<ImmersiveSurfaces | null>(
    () => (brandedZone === 'inner-circle' ? buildTemplateSurfaces(brandTheme, schemeMode, template) : null),
    [brandTheme, schemeMode, template, brandedZone]
  );

  // The IC zone's ColorProps: full template when IC is branded, otherwise the neutral
  // standard chrome so IC visibly contrasts against a branded main app.
  const colors = useMemo<ColorProps | null>(
    () => resolveZoneSurfaces(brandTheme, schemeMode, { self: 'inner-circle', brandedZone, template }),
    [brandTheme, schemeMode, brandedZone, template]
  );

  const immersiveTheme: Theme | null = useMemo(() => {
    if (!colors) return null;

    // Same assembly recipe as ThemeCustomization (themes/index.tsx), from the
    // zone-resolved ColorProps; componentStyleOverrides comes LAST so every
    // override derives from the finished tinted theme.
    const paletteTheme = buildTheme(mode, colors);
    const typography: TypographyVariantsOptions = Typography(paletteTheme, borderRadius, fontFamily, headingFont);
    if (surfaces) {
      (['h1', 'h2', 'h3', 'h4'] as const).forEach((variant) => {
        typography[variant] = { ...(typography[variant] as object), color: surfaces.headingInk };
      });
    }
    const shadows: CustomShadowProps = customShadows(mode, paletteTheme);

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
  }, [colors, surfaces, template, brandedZone, mode, borderRadius, fontFamily, headingFont, outlinedFilled, themeDirection]);

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
