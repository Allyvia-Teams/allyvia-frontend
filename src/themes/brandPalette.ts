// ==============================|| BRAND PALETTE GENERATOR ||============================== //
//
// Produces a full `ColorProps` object from a single brand pair (primary + secondary).
//
// The brand ramps (primary/secondary, light + dark) AND the semantic colors (success/error/warning)
// are produced by the perceptual harmony engine in `./harmony`: any brand hex yields a set that is
// both legible (WCAG AA on every fg/bg pair used) and harmonious (semantics re-toned to the brand's
// chroma/tone, with hues kept inside their inviolable meaning bands). True neutrals — greys, paper,
// dark-mode surfaces and text — plus the decorative gold/orange accents remain the locked Allyvia
// tokens (a pure-neutral fallback), so the app chrome stays stable across brands.
//
// The output has the exact same key set that `_allyvia_theme.module.scss` exports and that
// `palette.tsx` reads, so a brand pair can rebrand the whole app through the existing spine.
//
// The HSL helpers and `ensureAccessible` below are retained verbatim: they are the public surface
// consumed by `extractBrandColors.ts` and `Branding.tsx` and are independent of the OKLCH engine.
//
// No new npm dependency — all color math is implemented inline and fully typed.

import type { ColorProps } from 'types';

// Perceptual OKLCH harmony engine (does the real brand→palette work; see ./harmony).
import { generateHarmony } from './harmony';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Hsl {
  /** hue in degrees, [0, 360) */
  h: number;
  /** saturation, [0, 1] */
  s: number;
  /** lightness, [0, 1] */
  l: number;
}

export interface Rgb {
  /** red, [0, 255] */
  r: number;
  /** green, [0, 255] */
  g: number;
  /** blue, [0, 255] */
  b: number;
}

export type TextColor = '#fff' | '#000';

export interface BrandInput {
  primary: string;
  secondary: string;
  mode: 'light' | 'dark';
}

// ---------------------------------------------------------------------------
// Pure color-space helpers
// ---------------------------------------------------------------------------

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/** Parse a #rgb / #rrggbb hex string to 0-255 channels. Throws on malformed input. */
export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`brandPalette: invalid hex color "${hex}"`);
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

const channelToHex = (c: number): string => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0');

/** Serialize 0-255 channels to a lowercase #rrggbb hex string. */
export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

/** Convert a hex color to HSL (h in degrees, s/l in [0, 1]). */
export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l }; // achromatic
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return { h: h * 60, s, l };
}

const hue2rgb = (p: number, q: number, tRaw: number): number => {
  let t = tRaw;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
};

/** Convert HSL (h in degrees, s/l in [0, 1]) to a lowercase #rrggbb hex string. */
export function hslToHex(hIn: number, sIn: number, lIn: number): string {
  const h = (((hIn % 360) + 360) % 360) / 360;
  const s = clamp(sIn, 0, 1);
  const l = clamp(lIn, 0, 1);

  if (s === 0) {
    const v = Math.round(l * 255);
    return rgbToHex({ r: v, g: v, b: v });
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbToHex({
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  });
}

// ---------------------------------------------------------------------------
// WCAG contrast helpers
// ---------------------------------------------------------------------------

/** Relative luminance per WCAG 2.1, in [0, 1]. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = [r, g, b].map((c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG contrast ratio between two colors, in [1, 21]. Symmetric in its arguments. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA thresholds.
export const AA_NORMAL = 4.5; // body / normal-weight UI text (button labels, links)
export const AA_LARGE = 3.0; // large text (>= 24px, or >= 18.66px bold)

// ---------------------------------------------------------------------------
// Accessibility auto-correction
// ---------------------------------------------------------------------------

/**
 * Ensure `hex` carries enough contrast to be legible.
 *
 * `text` is the color that will sit on `hex` — `'#fff'` (white text on a solid fill) or
 * `'#000'` (black text). Because WCAG contrast is symmetric, a color corrected against
 * white text is simultaneously legible AS white-on-brand (button fills) AND as
 * brand-on-white (brand-colored text/links on a white card) — the same ratio governs both.
 *
 * If the pair already meets `minRatio`, `hex` is returned unchanged. Otherwise the color is
 * darkened (for white text) or lightened (for black text) in small HSL-lightness steps,
 * preserving hue and saturation, until it passes. A `console.warn` is emitted whenever a
 * shift happens, quoting the original and corrected hex.
 *
 * Mirrors the manual correction already applied to Allyvia blue (`#68a6f5` → `#2f6fd4`).
 */
export function ensureAccessible(hex: string, text: TextColor, minRatio: number = AA_NORMAL, label?: string): string {
  const startRatio = contrastRatio(hex, text);
  if (startRatio >= minRatio) {
    return hex;
  }

  // White text needs a darker fill; black text needs a lighter fill.
  const darken = relativeLuminance(text) > 0.5;
  const { h, s } = hexToHsl(hex);
  let { l } = hexToHsl(hex);
  const step = 0.02;
  let corrected = hex;

  // Bounded loop: lightness is in [0, 1], so at most ~50 steps are ever needed.
  for (let i = 0; i < 100; i += 1) {
    l = darken ? l - step : l + step;
    if (l <= 0 || l >= 1) {
      l = clamp(l, 0, 1);
      corrected = hslToHex(h, s, l);
      break;
    }
    corrected = hslToHex(h, s, l);
    if (contrastRatio(corrected, text) >= minRatio) {
      break;
    }
  }

  const finalRatio = contrastRatio(corrected, text);
  const prefix = label ? `${label} ` : '';

  console.warn(
    `[brandPalette] ${prefix}color adjusted for WCAG AA: ${hex} → ${corrected} ` +
      `(contrast on ${text} text ${startRatio.toFixed(2)} → ${finalRatio.toFixed(2)}, target ${minRatio})`
  );
  return corrected;
}

// ---------------------------------------------------------------------------
// Locked Tier-3 tokens
// ---------------------------------------------------------------------------

/**
 * The single locked source for every non-brand token. These are copied VERBATIM from
 * `src/assets/scss/_allyvia_theme.module.scss` (the app's live default) and must never be
 * derived from the brand color. If the SCSS values change, mirror them here.
 */
export const LOCKED_TIER3_TOKENS: Readonly<Record<string, string>> = Object.freeze({
  // paper & background
  paper: '#ffffff',

  // gold
  goldDark: '#fff3c1',
  gold200: '#ffdd6e',
  gold800: '#ffe683',
  goldText: '#3d3d3d',

  // success — slightly muted green
  successLight: '#e8f5e9',
  success200: '#a5d6a7',
  successMain: '#2e7d32',
  successDark: '#1b5e20',

  // error — clean red
  errorLight: '#fff1f0',
  errorMain: '#e53935',
  errorDark: '#b71c1c',

  // orange
  orangeLight: '#fbe9e7',
  orangeMain: '#ffab91',
  orangeDark: '#d84315',

  // warning
  warningLight: '#fffbeb',
  warningMain: '#f59e0b',
  warningDark: '#d97706',

  // grey — clean neutral scale
  grey50: '#f9fafb',
  grey100: '#f3f4f6',
  grey200: '#e5e7eb',
  grey300: '#d1d5db',
  grey500: '#6b7280',
  grey600: '#4b5563',
  grey700: '#374151',
  grey900: '#111827',

  // dark theme backgrounds
  darkBackground: '#1a223f', // level 3
  darkPaper: '#111936', // level 4
  darkLevel1: '#29314f', // level 1
  darkLevel2: '#212946', // level 2

  // dark theme text
  darkTextTitle: '#d7dcec',
  darkTextPrimary: '#bdc8f0',
  darkTextSecondary: '#8492c4'
});

// ---------------------------------------------------------------------------
// Palette assembly — brand ramps + harmonized semantics via the OKLCH engine
// ---------------------------------------------------------------------------

/**
 * Generate a complete `ColorProps` object from a brand pair.
 *
 * - `primary` leads, `secondary` supports — no third brand color.
 * - The brand ramps AND success/error/warning are computed by the OKLCH harmony engine
 *   (`./harmony`): legible on every fg/bg pair used, harmonized to the brand, semantic hues locked
 *   inside their meaning bands.
 * - Both light AND dark ramps are always emitted (palette.tsx picks per active mode at read time).
 * - True neutrals + the decorative gold/orange accents come verbatim from `LOCKED_TIER3_TOKENS`
 *   (a pure-neutral fallback), so app chrome is stable across brands.
 * - `mode` selects which ramp is the "active" one for a final accessibility self-check.
 *
 * Signature and return type are UNCHANGED — every existing caller (palette.tsx) is untouched.
 */
export function generateBrandPalette({ primary, secondary, mode }: BrandInput): ColorProps {
  const h = generateHarmony({ primary, secondary });

  const result: Record<string, string> = {
    // Locked neutrals, backgrounds, dark text + decorative gold/orange (never brand-derived).
    ...LOCKED_TIER3_TOKENS,

    // primary ramp (light mode)
    primaryLight: h.primaryLight.light,
    primary200: h.primaryLight.c200,
    primaryMain: h.primaryLight.main,
    primaryDark: h.primaryLight.dark,
    primary800: h.primaryLight.c800,

    // secondary ramp (light mode)
    secondaryLight: h.secondaryLight.light,
    secondary200: h.secondaryLight.c200,
    secondaryMain: h.secondaryLight.main,
    secondaryDark: h.secondaryLight.dark,
    secondary800: h.secondaryLight.c800,

    // primary ramp (dark mode)
    darkPrimaryLight: h.primaryDark.light,
    darkPrimary200: h.primaryDark.c200,
    darkPrimaryMain: h.primaryDark.main,
    darkPrimaryDark: h.primaryDark.dark,
    darkPrimary800: h.primaryDark.c800,

    // secondary ramp (dark mode)
    darkSecondaryLight: h.secondaryDark.light,
    darkSecondary200: h.secondaryDark.c200,
    darkSecondaryMain: h.secondaryDark.main,
    darkSecondaryDark: h.secondaryDark.dark,
    darkSecondary800: h.secondaryDark.c800,

    // harmonized semantics — main (icon/text/fill) + tint→`light` (chip bg) + dark (hover) + 200 (mid)
    successLight: h.success.tint,
    success200: h.success.c200,
    successMain: h.success.main,
    successDark: h.success.dark,
    errorLight: h.error.tint,
    errorMain: h.error.main,
    errorDark: h.error.dark,
    warningLight: h.warning.tint,
    warningMain: h.warning.main,
    warningDark: h.warning.dark
  };

  // Final self-check on the ramp that will actually be active for `mode`.
  const activeMain = mode === 'dark' ? [result.darkPrimaryMain, result.darkSecondaryMain] : [result.primaryMain, result.secondaryMain];
  activeMain.forEach((hex) => {
    if (contrastRatio(hex, '#fff') < AA_NORMAL) {
      console.warn(`[brandPalette] active ${mode} main ${hex} is below WCAG AA on white text`);
    }
  });

  return result;
}
