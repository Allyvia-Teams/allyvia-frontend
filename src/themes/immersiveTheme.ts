// types
import { ColorProps } from 'types';
import { BrandTheme } from 'types/config';

import { generateBrandPalette } from './brandPalette';
import { AA_NORMAL, ensureLegible, generateHarmony, hexToOklch, oklchToHex } from './harmony';

// Locked text tokens (see LOCKED_TIER3_TOKENS in brandPalette.ts) that every
// immersive surface must stay legible against.
const LIGHT_TEXT = '#374151'; // grey700
const DARK_TEXT = '#bdc8f0'; // darkTextPrimary

/** The three owner-selectable whole-page looks (see docs/superpowers/specs/2026-07-21-bespoke-branding-templates-design.md §A). */
export type TemplateName = 'bright' | 'soft' | 'bold';

interface TemplatePreset {
  /** page canvas target lightness, per mode (AA-corrected afterward) */
  bgL: { light: number; dark: number };
  /** elevated card surface target lightness, per mode */
  paperL: { light: number; dark: number };
  /** hero band target lightness, per mode */
  bandL: { light: number; dark: number };
  /** chroma ceiling for this template's surfaces (keeps the brand hue, holds colorfulness to a tasteful level) */
  chromaMax: number;
}

/**
 * Per-template surface targets. `soft` reproduces the original single-look values exactly
 * (today's baked constants); `bright`/`bold` are new, spaced far enough apart that the AA
 * legibility pass (which only ever moves lightness) cannot collapse the three into each other.
 */
export const TEMPLATE_PRESETS: Record<TemplateName, TemplatePreset> = {
  soft: {
    bgL: { light: 0.94, dark: 0.16 },
    paperL: { light: 0.965, dark: 0.2 },
    bandL: { light: 0.9, dark: 0.19 },
    chromaMax: 0.05
  },
  bright: {
    bgL: { light: 0.985, dark: 0.2 },
    paperL: { light: 1.0, dark: 0.24 },
    bandL: { light: 0.96, dark: 0.23 },
    chromaMax: 0.03
  },
  bold: {
    bgL: { light: 0.9, dark: 0.12 },
    paperL: { light: 0.94, dark: 0.16 },
    bandL: { light: 0.84, dark: 0.15 },
    chromaMax: 0.09
  }
};

export interface ImmersiveSurfaces {
  /** page canvas — the immersive background.default */
  background: string;
  /** elevated card surface */
  paper: string;
  /** brand-primary ink for h1–h4, AA-corrected against `background` */
  headingInk: string;
  /** hero band gradient stops: brand hue → secondary hue at matched L/C */
  headerBand: [string, string];
  /** accent used by the scoped component overrides */
  accent: string;
}

function surface(L: number, C: number, H: number, text: string, label: string): string {
  return oklchToHex(ensureLegible({ L, C, H }, text, AA_NORMAL, label));
}

/**
 * Derive the immersive surfaces for a given template from the brand pair.
 * Returns null when nothing sensible can be derived (no brand, malformed hex —
 * reachable via the unvalidated localStorage cache — or a neutral/near-white
 * brand); callers fall back to the standard theme.
 */
export function buildTemplateSurfaces(
  brandTheme: BrandTheme,
  mode: 'light' | 'dark',
  template: TemplateName = 'soft'
): ImmersiveSurfaces | null {
  if (!brandTheme) return null;
  try {
    const harmony = generateHarmony({ primary: brandTheme.primary, secondary: brandTheme.secondary });
    if (harmony.isNeutralBrand) return null;

    const preset = TEMPLATE_PRESETS[template];
    const H = harmony.brandHue;
    const C = Math.min(harmony.chromaBudget, preset.chromaMax);
    const secondaryHue = hexToOklch(brandTheme.secondary).H;

    const light = mode === 'light';
    const text = light ? LIGHT_TEXT : DARK_TEXT;

    const background = surface(preset.bgL[mode], C, H, text, `${template}.${mode}.background`);
    const paper = surface(preset.paperL[mode], Math.min(C, 0.035), H, text, `${template}.${mode}.paper`);

    // Brand-primary heading ink, pushed until it clears the tinted canvas.
    const headingInk = oklchToHex(ensureLegible(hexToOklch(brandTheme.primary), background, AA_NORMAL, `${template}.${mode}.headingInk`));

    // Hero band: a clearly deeper brand wash behind the page title.
    const bandL = preset.bandL[mode];
    const headerBand: [string, string] = [oklchToHex({ L: bandL, C, H }), oklchToHex({ L: bandL, C, H: secondaryHue })];

    return { background, paper, headingInk, headerBand, accent: brandTheme.primary };
  } catch {
    return null;
  }
}

/**
 * ColorProps for the scoped immersive theme at a given template: the standard brand palette
 * with its surface tokens re-pointed at the template's tints. Tokens are tinted BEFORE
 * slot-mapping because mainContent, compStyleOverride, and MainContentStyled read
 * `paper`/`grey50`/`dark*` directly, bypassing `background.*`.
 */
export function buildTemplateColors(brandTheme: BrandTheme, mode: 'light' | 'dark', template: TemplateName = 'soft'): ColorProps | null {
  if (!brandTheme) return null;
  const surfaces = buildTemplateSurfaces(brandTheme, mode, template);
  if (!surfaces) return null;
  const base = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode });
  if (mode === 'light') {
    return { ...base, paper: surfaces.paper, grey50: surfaces.background };
  }
  return {
    ...base,
    darkPaper: surfaces.background,
    darkBackground: surfaces.background,
    darkLevel1: surfaces.paper,
    darkLevel2: surfaces.paper
  };
}

/** Thin `template='soft'` wrapper — keeps existing callers/tests untouched. */
export function buildImmersiveSurfaces(brandTheme: BrandTheme, mode: 'light' | 'dark'): ImmersiveSurfaces | null {
  return buildTemplateSurfaces(brandTheme, mode, 'soft');
}

/** Thin `template='soft'` wrapper — keeps existing callers/tests untouched. */
export function buildImmersiveColors(brandTheme: BrandTheme, mode: 'light' | 'dark'): ColorProps | null {
  return buildTemplateColors(brandTheme, mode, 'soft');
}

/**
 * Resolve the `ColorProps` a given zone (`main-app` | `inner-circle`) should render with, given
 * which single zone the owner branded:
 *  - `self === brandedZone` → the full template treatment (`buildTemplateColors`).
 *  - otherwise → clean neutral standard chrome (`generateBrandPalette`'s own locked surface
 *    tokens, NOT template-re-pointed) so the branded zone visibly pops against it. Brand accent
 *    ramps (primary/secondary buttons, links, charts) still apply in both zones — only the
 *    surface tint is zone-exclusive.
 *  - null/malformed/neutral brand → null (standard theme).
 */
export function resolveZoneSurfaces(
  brandTheme: BrandTheme,
  mode: 'light' | 'dark',
  args: { self: 'main-app' | 'inner-circle'; brandedZone: 'main-app' | 'inner-circle'; template: TemplateName }
): ColorProps | null {
  if (!brandTheme) return null;
  if (args.self === args.brandedZone) {
    return buildTemplateColors(brandTheme, mode, args.template);
  }
  try {
    return generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode });
  } catch {
    return null;
  }
}
