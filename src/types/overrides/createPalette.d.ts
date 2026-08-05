import '@mui/material/styles';

<<<<<<< HEAD
// AUGMENT '@mui/material/styles', NOT '@mui/material/styles/createPalette'.
//
// This file used to target the deep path, and under MUI v7 with
// `moduleResolution: "bundler"` that specifier does not resolve: MUI's exports
// map routes './*' to './*/index.d.ts', so '@mui/material/styles/createPalette'
// looks for styles/createPalette/index.d.ts — a directory that does not exist
// (the real declaration is the file styles/createPalette.d.ts).
//
// TypeScript does not warn about that. `declare module '<unresolvable>'`
// silently declares a BRAND-NEW ambient module instead of augmenting the real
// one, so every declaration below was inert and the 48 resulting errors
// (palette.dark, text.dark, palette.orange, numeric shade keys) looked like
// application bugs. Its siblings createTheme.d.ts and createTypography.d.ts
// always targeted '@mui/material/styles' and always worked, which is what gave
// the game away.
//
// If you ever see "Property 'dark' does not exist on type 'Palette'" again,
// check this specifier first.
//
// '@mui/material/styles' re-exports Palette, PaletteColor, PaletteColorOptions,
// PaletteOptions and TypeText, so every augmentation below has a real target.
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
