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
import { buildImmersiveColors, buildImmersiveSurfaces, ImmersiveSurfaces } from 'themes/immersiveTheme';
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

  const surfaces = useMemo(() => buildImmersiveSurfaces(brandTheme, schemeMode), [brandTheme, schemeMode]);

  const immersiveTheme: Theme | null = useMemo(() => {
    const colors = buildImmersiveColors(brandTheme, schemeMode);
    if (!colors || !surfaces) return null;

    // Same assembly recipe as ThemeCustomization (themes/index.tsx), from the
    // immersive-tinted ColorProps; componentStyleOverrides comes LAST so every
    // override derives from the finished tinted theme.
    const paletteTheme = buildTheme(mode, colors);
    const typography: TypographyVariantsOptions = Typography(paletteTheme, borderRadius, fontFamily, headingFont);
    (['h1', 'h2', 'h3', 'h4'] as const).forEach((variant) => {
      typography[variant] = { ...(typography[variant] as object), color: surfaces.headingInk };
    });
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

    theme.components = {
      ...base,
      MuiTabs: { styleOverrides: { ...baseTabs, indicator: { ...baseTabs.indicator, backgroundColor: accent } } },
      MuiTab: { styleOverrides: { ...baseTab, root: { ...baseTab.root, '&.Mui-selected': { color: accent } } } },
      MuiTableCell: { styleOverrides: { ...baseTableCell, head: { ...baseTableCell.head, backgroundColor: alpha(accent, 0.06) } } },
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
  }, [brandTheme, schemeMode, mode, surfaces, borderRadius, fontFamily, headingFont, outlinedFilled, themeDirection]);

  const ctx = useMemo<ImmersiveContextValue>(
    () => ({ active: immersiveTheme !== null, surfaces: immersiveTheme ? surfaces : null }),
    [immersiveTheme, surfaces]
  );

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
