import { alpha, createTheme, Theme } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import type { BrandTheme } from 'types/config';
import { contrastRatio } from './brandPalette';

export const BODY_FONTS = ['Inter', 'Manrope', 'Space Grotesk', 'Poppins'] as const;
export interface BrandExperience {
  version: 1;
  canvas: string;
  surface: string;
  navigation: string;
  bodyFont: (typeof BODY_FONTS)[number];
  corners: 0 | 6 | 12 | 20;
  density: 'comfortable' | 'compact';
  finish: 'flat' | 'outlined' | 'elevated';
  headingStyle: 'editorial' | 'modern';
  navStyle: 'pill' | 'line';
  buttonStyle: 'solid' | 'outline' | 'rounded';
  tableStyle: 'lines' | 'striped' | 'relaxed';
}

export const DEFAULT_EXPERIENCE: BrandExperience = {
  version: 1,
  canvas: '#F4F5F7',
  surface: '#FFFFFF',
  navigation: '#FFFFFF',
  bodyFont: 'Inter',
  corners: 12,
  density: 'comfortable',
  finish: 'outlined',
  headingStyle: 'modern',
  navStyle: 'pill',
  buttonStyle: 'solid',
  tableStyle: 'lines'
};

/** Never interpret arbitrary persisted overrides as CSS. Unknown versions retain legacy rendering. */
export function parseBrandExperience(raw: unknown): BrandExperience | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const v = raw as Record<string, unknown>;
  if (v.version !== 1) return undefined;
  const color = (key: string) =>
    typeof v[key] === 'string' && /^#[\da-f]{6}$/i.test(v[key] as string)
      ? (v[key] as string)
      : DEFAULT_EXPERIENCE[key as 'canvas' | 'surface' | 'navigation'];
  return {
    version: 1,
    canvas: color('canvas'),
    surface: color('surface'),
    navigation: color('navigation'),
    bodyFont: BODY_FONTS.includes(v.bodyFont as BrandExperience['bodyFont']) ? (v.bodyFont as BrandExperience['bodyFont']) : 'Inter',
    corners: [0, 6, 12, 20].includes(v.corners as number) ? (v.corners as BrandExperience['corners']) : 12,
    density: v.density === 'compact' ? 'compact' : 'comfortable',
    finish: v.finish === 'flat' || v.finish === 'elevated' ? v.finish : 'outlined',
    headingStyle: v.headingStyle === 'editorial' ? 'editorial' : 'modern',
    navStyle: v.navStyle === 'line' ? 'line' : 'pill',
    buttonStyle: v.buttonStyle === 'outline' || v.buttonStyle === 'rounded' ? v.buttonStyle : 'solid',
    tableStyle: v.tableStyle === 'striped' || v.tableStyle === 'relaxed' ? v.tableStyle : 'lines'
  };
}

export interface BrandStyle {
  id: string;
  name: string;
  description: string;
  brand: NonNullable<BrandTheme> & { experience: BrandExperience };
}

export const BRAND_STYLES: readonly BrandStyle[] = [
  {
    id: 'heritage',
    name: 'Heritage',
    description: 'Warm paper. Rich green. An editorial point of view.',
    brand: {
      primary: '#234C3A',
      secondary: '#895C39',
      headingFont: 'Libre Baskerville',
      template: 'clean',
      experience: {
        ...DEFAULT_EXPERIENCE,
        canvas: '#F3F0E8',
        surface: '#FFFCF5',
        navigation: '#E9E5DA',
        corners: 0,
        headingStyle: 'editorial',
        navStyle: 'line'
      }
    }
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Quiet neutrals. Crisp type. Space for what matters.',
    brand: {
      primary: '#292929',
      secondary: '#6A625C',
      headingFont: 'Manrope',
      template: 'clean',
      experience: {
        ...DEFAULT_EXPERIENCE,
        canvas: '#F5F4F2',
        navigation: '#FAF9F7',
        bodyFont: 'Manrope',
        corners: 6,
        finish: 'flat',
        navStyle: 'line'
      }
    }
  },
  {
    id: 'bloom',
    name: 'Bloom',
    description: 'Soft lilac. Rounded forms. A welcoming rhythm.',
    brand: {
      primary: '#67419A',
      secondary: '#8C4563',
      headingFont: 'Fraunces',
      template: 'clean',
      experience: {
        ...DEFAULT_EXPERIENCE,
        canvas: '#F4F0F8',
        navigation: '#EEE7F4',
        corners: 20,
        finish: 'elevated',
        headingStyle: 'editorial'
      }
    }
  },
  {
    id: 'after-hours',
    name: 'After hours',
    description: 'Deep charcoal. Electric accents. A sharper edge.',
    brand: {
      primary: '#326644',
      secondary: '#6664AE',
      headingFont: 'Space Grotesk',
      template: 'bold',
      experience: {
        ...DEFAULT_EXPERIENCE,
        canvas: '#151918',
        surface: '#202623',
        navigation: '#111613',
        bodyFont: 'Space Grotesk',
        corners: 6,
        density: 'compact'
      }
    }
  }
];

/** A single ink must be readable on both canvas and cards. Unsafe pairs fall back to one surface. */
export function experienceSurfaces(e: BrandExperience, dark: boolean, chrome = false) {
  let canvas = chrome ? e.navigation : e.canvas;
  let surface = chrome ? e.navigation : e.surface;
  // Respect the operator's dark preference without forcing light brand paper into a dark workspace.
  if (dark && contrastRatio('#FFFFFF', surface) < 4.5) {
    canvas = chrome ? '#171B1A' : '#191D1B';
    surface = chrome ? canvas : '#232925';
  }
  const score = (ink: string) => Math.min(contrastRatio(ink, canvas), contrastRatio(ink, surface));
  let ink = score('#171B18') >= score('#FFFFFF') ? '#171B18' : '#FFFFFF';
  if (score(ink) < 4.5) {
    canvas = surface;
    ink = contrastRatio('#000000', surface) >= contrastRatio('#FFFFFF', surface) ? '#000000' : '#FFFFFF';
  }
  const mutedCandidates = ['#666960', '#C5CEC8', ink];
  const muted = mutedCandidates.find((c) => Math.min(contrastRatio(c, canvas), contrastRatio(c, surface)) >= 4.5) ?? ink;
  return { canvas, surface, ink, muted, dark: contrastRatio('#FFFFFF', surface) >= contrastRatio('#171B18', surface) };
}

/**
 * Assemble the final visual layer for BOTH the working app and the Studio preview.
 *
 * COLOUR AND TYPE ONLY. A template is a style, not a layout (owner, 2026-09-12: switching
 * templates "reverts back to the bad UI … keep the same structure, just different styles").
 * So this layer may set palette, surfaces, fonts and heading weight, and the finish of a card
 * (ring vs shadow) — and must NOT touch radii, paddings, heights, table density, the nav item's
 * shape or the primary button's fill. Those come from componentStyleOverrides, which is the
 * one structure every template shares. The experience fields `corners`, `density`,
 * `buttonStyle`, `navStyle` and `tableStyle` are still stored and previewed by Brand Studio,
 * but here only `tableStyle: striped` (a colour) and `navStyle: line` (a colour bar) survive.
 */
export function applyBrandExperience(base: Theme, brand: BrandTheme, zone: 'chrome' | 'content'): Theme {
  const e = parseBrandExperience(brand?.experience);
  if (!e) return base;
  const s = experienceSurfaces(e, base.palette.mode === 'dark', zone === 'chrome');
  const font = `'${e.bodyFont}', sans-serif`;
  const rawPrimary = /^#[\da-f]{6}$/i.test(brand?.primary ?? '') ? brand!.primary : base.palette.primary.main;
  const readable = (color: string) => Math.min(contrastRatio(color, s.canvas), contrastRatio(color, s.surface)) >= 4.5;
  const primary = readable(rawPrimary) ? rawPrimary : readable(base.palette.primary.main) ? base.palette.primary.main : s.ink;
  const theme = createTheme(base, {
    palette: {
      mode: s.dark ? 'dark' : 'light',
      primary: { main: primary },
      background: { default: s.canvas, paper: s.surface },
      text: { primary: s.ink, secondary: s.muted, dark: s.ink },
      divider: alpha(s.ink, 0.14),
      grey: { 50: s.canvas, 100: s.canvas, 500: s.muted, 600: s.ink, 700: s.ink, 900: s.ink },
      dark: { 800: s.canvas, 900: s.surface, main: s.surface, dark: s.surface }
    },
    typography: {
      fontFamily: font,
      ...Object.fromEntries(
        ['body1', 'body2', 'subtitle1', 'subtitle2', 'caption', 'button', 'menuCaption', 'subMenuCaption'].map((key) => [
          key,
          { fontFamily: font, color: ['caption', 'subtitle2', 'menuCaption'].includes(key) ? s.muted : s.ink }
        ])
      ),
      ...Object.fromEntries(
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((key) => [
          key,
          {
            fontFamily: brand?.headingFont || font,
            color: s.ink,
            fontWeight: e.headingStyle === 'editorial' ? 400 : 600,
            letterSpacing: e.headingStyle === 'editorial' ? '-0.025em' : '-0.035em'
          }
        ])
      )
    }
  });
  const ring = e.finish === 'outlined' ? `inset 0 0 0 1px ${alpha(s.ink, 0.14)}` : 'none';
  theme.components = deepmerge(theme.components ?? {}, {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: s.surface,
          boxShadow: e.finish === 'elevated' ? `0 8px 32px ${alpha(s.ink, 0.08)}` : ring
        }
      }
    },
    MuiButton: { styleOverrides: { root: { fontFamily: font } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: s.surface } } },
    MuiTableCell: {
      styleOverrides: {
        root: { fontFamily: font },
        head: { backgroundColor: s.canvas, color: s.muted }
      }
    },
    MuiTableRow: {
      styleOverrides: { root: e.tableStyle === 'striped' ? { '&:nth-of-type(even)': { backgroundColor: alpha(s.ink, 0.04) } } : {} }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '& .MuiTypography-root': { fontFamily: font },
          ...(e.navStyle === 'line' ? { '&&.Mui-selected': { boxShadow: `inset 2px 0 0 ${primary}` } } : {})
        }
      }
    },
    MuiLink: { styleOverrides: { root: { color: contrastRatio(primary, s.surface) >= 4.5 ? primary : s.ink } } }
  });
  return theme;
}
