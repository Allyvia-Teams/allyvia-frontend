import '@mui/material/styles';

// Augment '@mui/material/styles', NOT the deep '@mui/material/styles/createPalette' path.
// MUI v7's package exports map routes './*' to './*/index.d.ts', so the deep path no longer
// resolves under moduleResolution "bundler" — TS would silently treat the block below as an
// ambient declaration of a nonexistent module and merge nothing. The palette interfaces are
// re-exported from '@mui/material/styles', which resolves, so augmenting there merges correctly.
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

  export interface TypeText {
    dark: string;
    hint: string;
  }

  interface PaletteOptions {
    orange?: PaletteColorOptions;
    dark?: PaletteColorOptions;
    gold?: PaletteColorOptions;
  }
  interface Palette {
    orange: PaletteColor;
    dark: PaletteColor;
  }
}
