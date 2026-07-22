// project imports
import { MenuOrientation, ThemeDirection, ThemeMode } from 'config';

// Body font family. Widened to `string` so brand themes can specify any font;
// the three below remain the suggested/default choices.
export type FontFamily = string;
export const DEFAULT_FONT_FAMILIES = [`'Inter', sans-serif`, `'Poppins', sans-serif`, `'Roboto', sans-serif`] as const;

export type PresetColor = 'default' | 'theme1' | 'theme2' | 'theme3' | 'theme4' | 'theme5' | 'theme6' | 'allyvia';
export type I18n = 'en' | 'fr' | 'ro' | 'zh'; // 'en' - English, 'fr' - French, 'ro' - Romanian, 'zh' - Chinese

/**
 * Per-company brand theme. When set, brand `primary`/`secondary` drive the palette
 * (via generateBrandPalette) and `headingFont` is applied to h1–h4. `null` = no brand
 * theme, so the app falls back to the `presetColor` SCSS path and the body font.
 *
 * `logoUrl` (optional) swaps the Allyvia logo app-wide. `customFontUrl` (optional) points to a
 * hosted, licensed font file; when set, `headingFont` may be a custom family loaded via @font-face.
 */
export type BrandTheme = {
  primary: string;
  secondary: string;
  headingFont: string;
  logoUrl?: string | null;
  customFontUrl?: string | null;
  /** Visual preset applied to branded surfaces. Defaults to 'soft' when unset. */
  template?: 'bright' | 'soft' | 'bold';
  /** Which zone(s) the brand theme is applied to. Defaults to 'main-app' when unset. */
  brandedZone?: 'inner-circle' | 'main-app';
  /** Accent colors (owner-picked overrides, or extracted from the logo). Defaults to []. */
  accents?: string[];
} | null;

export type ConfigProps = {
  /**
   * the props used for menu orientation (diffrent theme layout).
   * we provide static below options -
   * 'vertical' (default) - MenuOrientation.VERTICAL
   * 'horizontal' - MenuOrientation.HORIZONTAL
   */
  menuOrientation: MenuOrientation;

  /**
   * the props used for show mini variant drawer
   * the mini variant is recommended for apps sections that need quick selection access alongside content.
   * default - false
   */
  miniDrawer: boolean;

  /**
   * The props used for the theme font-style.
   * We provide static below options -
   * `'Inter', sans-serif`
   * `'Poppins', sans-serif`
   * `'Roboto', sans-serif` (default)
   */
  fontFamily: FontFamily;

  /**
   * the props used for change globaly card border radius.
   * We provide dynamic number values for border radius -
   * default value - 8
   */
  borderRadius: number;

  /**
   * the props used for change globaly ioutlined input background color.
   * default - true which show input with background color
   * false - will show input with transparent background
   */
  outlinedFilled: boolean;

  /**
   * the props used for default theme palette mode
   * explore the default theme
   * below theme options -
   * 'light' (default) - ThemeMode.LIGHT
   * 'dark' - ThemeMode.DARK
   */
  mode: ThemeMode;

  /**
   * the props used for theme primary color variants
   * we provide static below options thoe s are already defaine in src/themes/theme -
   * 'default'
   * 'theme1'
   * 'theme2'
   * 'theme3'
   * 'theme4'
   * 'theme5'
   * 'theme6'
   */
  presetColor: PresetColor;

  /**
   * The props used for display menu-items with multi-language.
   * We provide static below languages according to 'react-intl' options - https://www.npmjs.com/package/react-intl
   * 'en' (default)
   * 'fr'
   * 'ro'
   * 'zh'
   */
  i18n: I18n;

  /**
   * the props used for default theme direction
   * explore the default theme
   * below theme options -
   * 'ltr' (default) - ThemeDirection.LTR
   * 'rtl' - ThemeDirection.RTL
   */
  themeDirection: ThemeDirection;

  /**
   * the props used for theme container.
   * the container centers your content horizontally. It's the most basic layout element.
   * true - (default) which show container
   * false - will show fluid
   */
  container: boolean;

  /**
   * per-company brand theme (primary/secondary colors + heading font).
   * null (default) - no brand theme; palette follows presetColor and headings use the body font.
   */
  brandTheme: BrandTheme;

  /**
   * optional heading font family applied to h1–h4 only. When a brandTheme is set,
   * brandTheme.headingFont takes precedence over this value.
   */
  headingFontFamily?: string;
};

export type CustomizationProps = {
  menuOrientation: MenuOrientation;
  miniDrawer: boolean;
  fontFamily: FontFamily;
  borderRadius: number;
  outlinedFilled: boolean;
  mode: ThemeMode;
  presetColor: PresetColor;
  i18n: I18n;
  themeDirection: ThemeDirection;
  container: boolean;
  brandTheme: BrandTheme;
  headingFontFamily?: string;
  onChangeBrandTheme: (brandTheme: BrandTheme) => void;
  onChangeMenuOrientation: (menuOrientation: MenuOrientation) => void;
  onChangeMiniDrawer: (miniDrawer: boolean) => void;
  onChangeMode: (mode: ThemeMode) => void;
  onChangePresetColor: (presetColor: PresetColor) => void;
  onChangeLocale: (i18n: I18n) => void;
  onChangeDirection: (themeDirection: ThemeDirection) => void;
  onChangeContainer: (container: boolean) => void;
  onChangeFontFamily: (fontFamily: FontFamily) => void;
  onChangeBorderRadius: (event: Event, newValue: number | number[]) => void;
  onChangeOutlinedField: (outlinedFilled: boolean) => void;
  onReset: () => void;
};
