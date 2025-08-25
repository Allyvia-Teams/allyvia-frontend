import { useMemo, ReactNode } from 'react';

// material-ui
import { createTheme, StyledEngineProvider, ThemeOptions, ThemeProvider, Theme, TypographyVariantsOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// project imports
import useConfig from 'hooks/useConfig';
import Palette from './palette';
import Typography from './typography';

import componentStyleOverrides from './compStyleOverride';
import customShadows from './shadows';

// types
import { CustomShadowProps } from 'types/default-theme';

interface Props {
  children: ReactNode;
}

export default function ThemeCustomization({ children }: Props) {
  const { borderRadius, fontFamily, mode, outlinedFilled, presetColor, themeDirection } = useConfig();

  const theme: Theme = useMemo<Theme>(() => Palette(mode, presetColor), [mode, presetColor]);

  const themeTypography: TypographyVariantsOptions = useMemo<TypographyVariantsOptions>(
    () => Typography(theme, borderRadius, fontFamily),
    [theme, borderRadius, fontFamily]
  );
  const themeCustomShadows: CustomShadowProps = useMemo<CustomShadowProps>(() => customShadows(mode, theme), [mode, theme]);

  const themeOptions: ThemeOptions = useMemo(
    () => ({
      direction: themeDirection,
      palette: theme.palette,
      // Align breakpoints with product requirements
      breakpoints: {
        values: {
          xs: 0, // keep for compatibility
          sm: 375, // mobile M
          md: 768, // tablet
          lg: 1024, // small desktop
          xl: 1536 // large desktop (default)
        }
      },
      mixins: {
        toolbar: {
          minHeight: '64px',
          padding: '16px'
        }
      },
      typography: themeTypography,
      customShadows: themeCustomShadows
    }),
    [themeDirection, theme, themeCustomShadows, themeTypography]
  );

  const themes: Theme = createTheme(themeOptions);
  themes.components = useMemo(() => componentStyleOverrides(themes, borderRadius, outlinedFilled), [themes, borderRadius, outlinedFilled]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={themes}>
        <CssBaseline enableColorScheme />
        <div style={{ overflowX: 'hidden', width: '100%', maxWidth: '100%' }}>{children}</div>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
