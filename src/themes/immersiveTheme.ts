// types
import { ColorProps } from 'types';
import { BrandTheme } from 'types/config';

import { generateBrandPalette } from './brandPalette';
import { AA_NORMAL, ensureLegible, generateHarmony, hexToOklch, oklchToHex } from './harmony';

// Locked text tokens (see LOCKED_TIER3_TOKENS in brandPalette.ts) that every
// immersive surface must stay legible against.
const LIGHT_TEXT = '#374151'; // grey700
const DARK_TEXT = '#bdc8f0'; // darkTextPrimary

// Surface chroma ceiling: keep the brand hue, hold colorfulness to a tasteful
// (but clearly visible) level. Raised from the original 0.03 so the tint reads
// as brand color rather than a whisper of grey. Legibility is still guaranteed
// by ensureLegible below, which corrects lightness against the text token.
const SURFACE_CHROMA_MAX = 0.05;

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
 * Derive the immersive Inner Circle surfaces from the brand pair.
 * Returns null when nothing sensible can be derived (no brand, malformed hex —
 * reachable via the unvalidated localStorage cache — or a neutral/near-white
 * brand); callers fall back to the standard theme.
 */
export function buildImmersiveSurfaces(brandTheme: BrandTheme, mode: 'light' | 'dark'): ImmersiveSurfaces | null {
  if (!brandTheme) return null;
  try {
    const harmony = generateHarmony({ primary: brandTheme.primary, secondary: brandTheme.secondary });
    if (harmony.isNeutralBrand) return null;

    const H = harmony.brandHue;
    const C = Math.min(harmony.chromaBudget, SURFACE_CHROMA_MAX);
    const secondaryHue = hexToOklch(brandTheme.secondary).H;

    const light = mode === 'light';
    const text = light ? LIGHT_TEXT : DARK_TEXT;

    const background = surface(light ? 0.94 : 0.16, C, H, text, `immersive.${mode}.background`);
    const paper = surface(light ? 0.965 : 0.2, Math.min(C, 0.035), H, text, `immersive.${mode}.paper`);

    // Brand-primary heading ink, pushed until it clears the tinted canvas.
    const headingInk = oklchToHex(ensureLegible(hexToOklch(brandTheme.primary), background, AA_NORMAL, `immersive.${mode}.headingInk`));

    // Hero band: a clearly deeper brand wash behind the page title.
    const bandL = light ? 0.9 : 0.19;
    const headerBand: [string, string] = [oklchToHex({ L: bandL, C, H }), oklchToHex({ L: bandL, C, H: secondaryHue })];

    return { background, paper, headingInk, headerBand, accent: brandTheme.primary };
  } catch {
    return null;
  }
}

/**
 * ColorProps for the scoped immersive theme: the standard brand palette with
 * its surface tokens re-pointed at the muted tints. Tokens are tinted BEFORE
 * slot-mapping because mainContent, compStyleOverride, and MainContentStyled
 * read `paper`/`grey50`/`dark*` directly, bypassing `background.*`.
 */
export function buildImmersiveColors(brandTheme: BrandTheme, mode: 'light' | 'dark'): ColorProps | null {
  if (!brandTheme) return null;
  const surfaces = buildImmersiveSurfaces(brandTheme, mode);
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
