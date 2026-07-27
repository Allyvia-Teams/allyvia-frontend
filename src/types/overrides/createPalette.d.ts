import '@mui/material/styles';

// MUI v7 + moduleResolution "bundler": the deep path '@mui/material/styles/createPalette'
// is not in the package exports map, so it must be augmented via '@mui/material/styles',
// which re-exports Palette, PaletteColor, PaletteColorOptions, PaletteOptions and TypeText.
declare module '@mui/material/styles' {
  interface PaletteColor {
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  }

  interface TypeText {
    dark: string;
    hint: string;
  }

  interface PaletteOptions {
    orange?: PaletteColorOptions;
    dark?: PaletteColorOptions;
    icon?: PaletteColorOptions;
    gold?: PaletteColorOptions;
  }
  interface Palette {
    orange: PaletteColor;
    dark: PaletteColor;
    icon: PaletteColor;
  }
}
