// types
import { ColorProps } from 'types';
import { BrandTheme } from 'types/config';

import { generateBrandPalette } from './brandPalette';
import { AA_NORMAL, ensureLegible, generateHarmony, hexToOklch, oklchToHex } from './harmony';

// Locked text tokens (see LOCKED_TIER3_TOKENS in brandPalette.ts) that every
// immersive surface must stay legible against, chosen by POLARITY (not app mode) — see
// docs/superpowers/specs/2026-07-21-brand-luminance-polarity-addendum.md.
const LIGHT_TEXT = '#374151'; // grey700 — dark ink, light polarity
const DARK_SURFACE_TEXT = '#bdc8f0'; // darkTextPrimary — near-white, dark polarity

/** The three owner-selectable whole-page looks (see docs/superpowers/specs/2026-07-21-bespoke-branding-templates-design.md §A). */
export type TemplateName = 'bright' | 'soft' | 'bold';

/**
 * Surface polarity: `light` = light surfaces + dark ink text (today's look); `dark` = dark,
 * brand-colored surfaces + near-white text. Polarity is what actually drives which
 * `TEMPLATE_PRESETS` bucket and text token a surface is built against — it is a DIFFERENT axis
 * from `appMode` (the user's light/dark toggle): a light-brand company sees light-polarity
 * soft/bold surfaces even in... no — see `polarity()` below for the exact precedence.
 */
export type Polarity = 'light' | 'dark';

/** Below this OKLCH lightness, a brand primary is considered "dark" and auto-flips soft/bold to dark polarity. */
export const DARK_BRAND_THRESHOLD = 0.5;

/**
 * Resolve the surface polarity for a template + the app's light/dark toggle + the brand's own
 * luminance. Precedence (per the design addendum):
 *  1. `appMode === 'dark'` always wins — respect the user's dark-mode toggle.
 *  2. `template === 'bright'` forces `'light'` — Bright is the always-light/airy escape.
 *  3. Otherwise soft/bold AUTO-REFLECT the brand: dark primary → dark polarity, light primary → light.
 */
export function polarity(template: TemplateName, appMode: 'light' | 'dark', darkBrand: boolean): Polarity {
  if (appMode === 'dark') return 'dark';
  if (template === 'bright') return 'light';
  return darkBrand ? 'dark' : 'light';
}

interface TemplatePreset {
  /** page canvas target lightness (AA-corrected afterward) */
  bgL: number;
  /** elevated card surface target lightness */
  paperL: number;
  /** hero band target lightness */
  bandL: number;
  /** chroma ceiling for this template's surfaces (keeps the brand hue, holds colorfulness to a tasteful level) */
  chromaMax: number;
}

type LightPresets = Record<TemplateName, TemplatePreset>;
// `bright` has no dark preset — it is the "always-light/airy escape" and normally never reaches
// dark polarity via template-driven resolution. The one path that CAN still land here is the
// appMode==='dark' override (which outranks the template check in `polarity()`); `presetFor`
// below falls back to `soft` (the lightest dark option) for that combination.
type DarkPresets = Record<Exclude<TemplateName, 'bright'>, TemplatePreset>;

/**
 * Per-polarity, per-template surface targets. Keyed by POLARITY first (not app mode): `light`
 * carries all three templates (today's tuned values, unchanged); `dark` carries brand-colored,
 * fuller-chroma targets for `soft`/`bold` so a dark brand reads as itself, not a grey wash.
 */
export const TEMPLATE_PRESETS: { light: LightPresets; dark: DarkPresets } = {
  light: {
    bright: { bgL: 0.985, paperL: 1.0, bandL: 0.96, chromaMax: 0.03 },
    soft: { bgL: 0.94, paperL: 0.965, bandL: 0.9, chromaMax: 0.05 },
    bold: { bgL: 0.9, paperL: 0.94, bandL: 0.84, chromaMax: 0.07 }
  },
  dark: {
    soft: { bgL: 0.3, paperL: 0.36, bandL: 0.26, chromaMax: 0.09 },
    bold: { bgL: 0.2, paperL: 0.26, bandL: 0.16, chromaMax: 0.12 }
  }
};

/** Look up the preset for a resolved polarity, with the `bright`-has-no-dark-entry fallback documented above. */
function presetFor(pol: Polarity, template: TemplateName): TemplatePreset {
  if (pol === 'light') return TEMPLATE_PRESETS.light[template];
  return TEMPLATE_PRESETS.dark[template === 'bright' ? 'soft' : template];
}

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
 * Derive the immersive surfaces for a given template + POLARITY from the brand pair. `pol` is the
 * resolved surface polarity (see `polarity()`), NOT the app's light/dark toggle — callers that
 * need to go from (brand, appMode, template) to surfaces should go through `buildTemplateColors`
 * / `resolveZoneTheme`, which compute the polarity for you.
 *
 * Returns null when nothing sensible can be derived (no brand, malformed hex — reachable via the
 * unvalidated localStorage cache — or a neutral/near-white brand); callers fall back to the
 * standard theme.
 */
export function buildTemplateSurfaces(brandTheme: BrandTheme, pol: Polarity, template: TemplateName = 'soft'): ImmersiveSurfaces | null {
  if (!brandTheme) return null;
  try {
    const harmony = generateHarmony({ primary: brandTheme.primary, secondary: brandTheme.secondary });
    if (harmony.isNeutralBrand) return null;

    const preset = presetFor(pol, template);
    const H = harmony.brandHue;
    const C = Math.min(harmony.chromaBudget, preset.chromaMax);
    const secondaryHue = hexToOklch(brandTheme.secondary).H;

    // The text token a surface must stay legible against is chosen by POLARITY: this is the whole
    // fix — a dark-polarity surface is AA-corrected against near-white text, so `ensureLegible`
    // pulls it DARKER (never lighter) when it needs to move, and a dark target surface stays dark.
    const text = pol === 'light' ? LIGHT_TEXT : DARK_SURFACE_TEXT;

    const background = surface(preset.bgL, C, H, text, `${template}.${pol}.background`);
    const paper = surface(preset.paperL, Math.min(C, 0.035), H, text, `${template}.${pol}.paper`);

    let headingInk: string;
    if (pol === 'dark') {
      // Bright brand tint for headings on a dark surface: raise the primary's OKLCH L to ~0.85
      // (keeping hue/chroma) so it pops, rather than AA-correcting the primary itself (which,
      // starting from a dark primary, would just get pushed light anyway — this is more direct
      // and matches the design intent of "a bright tint of the primary").
      const primaryOklch = hexToOklch(brandTheme.primary);
      headingInk = oklchToHex(
        ensureLegible({ L: 0.85, C: primaryOklch.C, H: primaryOklch.H }, background, AA_NORMAL, `${template}.${pol}.headingInk`)
      );
    } else {
      // Light polarity: brand-primary heading ink, pushed until it clears the tinted canvas.
      headingInk = oklchToHex(ensureLegible(hexToOklch(brandTheme.primary), background, AA_NORMAL, `${template}.${pol}.headingInk`));
    }

    // Hero band: a clearly deeper brand wash behind the page title.
    const bandL = preset.bandL;
    const headerBand: [string, string] = [oklchToHex({ L: bandL, C, H }), oklchToHex({ L: bandL, C, H: secondaryHue })];

    return { background, paper, headingInk, headerBand, accent: brandTheme.primary };
  } catch {
    return null;
  }
}

/** Resolve the effective mode (== polarity) for a brand+template+appMode combo. Null on malformed hex. */
function resolveEffectiveMode(brandTheme: BrandTheme, appMode: 'light' | 'dark', template: TemplateName): Polarity | null {
  if (!brandTheme) return null;
  try {
    const darkBrand = hexToOklch(brandTheme.primary).L < DARK_BRAND_THRESHOLD;
    return polarity(template, appMode, darkBrand);
  } catch {
    return null;
  }
}

/**
 * ColorProps for the scoped immersive theme, for the EFFECTIVE mode (which may differ from
 * `appMode` — see `polarity()`): the standard brand palette (built for the effective mode, so its
 * text tokens match the surfaces) with its surface tokens re-pointed at the template's tints.
 * Tokens are tinted BEFORE slot-mapping because mainContent, compStyleOverride, and
 * MainContentStyled read `paper`/`grey50`/`dark*` directly, bypassing `background.*`.
 */
export function buildTemplateColors(brandTheme: BrandTheme, appMode: 'light' | 'dark', template: TemplateName = 'soft'): ColorProps | null {
  if (!brandTheme) return null;
  const effectiveMode = resolveEffectiveMode(brandTheme, appMode, template);
  if (!effectiveMode) return null;
  const surfaces = buildTemplateSurfaces(brandTheme, effectiveMode, template);
  if (!surfaces) return null;
  const base = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode: effectiveMode });
  if (effectiveMode === 'light') {
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

/**
 * Legacy `template='soft'` wrapper. `mode` here is passed straight through AS the polarity
 * (pre-redesign behavior) rather than derived from the brand's own luminance — kept only so
 * existing callers/tests that pass an explicit light/dark keep working unchanged. New code should
 * prefer `buildTemplateColors`/`resolveZoneTheme`, which auto-reflect the brand.
 */
export function buildImmersiveSurfaces(brandTheme: BrandTheme, mode: 'light' | 'dark'): ImmersiveSurfaces | null {
  return buildTemplateSurfaces(brandTheme, mode, 'soft');
}

/** Legacy `template='soft'` wrapper — see `buildImmersiveSurfaces` above. */
export function buildImmersiveColors(brandTheme: BrandTheme, mode: 'light' | 'dark'): ColorProps | null {
  return buildTemplateColors(brandTheme, mode, 'soft');
}

/**
 * Resolve the theme a given zone (`main-app` | `inner-circle`) should render with, given which
 * single zone the owner branded:
 *  - `self === brandedZone` → the full template treatment, at its EFFECTIVE mode (which may
 *    differ from `appMode` — a dark-brand company's soft/bold zone renders with the dark ramp
 *    even while the app toggle is light).
 *  - otherwise → clean neutral standard chrome (`generateBrandPalette`'s own locked surface
 *    tokens, NOT template-re-pointed), following `appMode` (not the brand). Brand accent ramps
 *    (primary/secondary buttons, links, charts) still apply in both zones — only the surface tint
 *    is zone-exclusive.
 *  - null/malformed/neutral brand → null (standard theme).
 *
 * Consumers must build the zone's theme with `buildTheme(mode, colors)` using the RETURNED
 * `mode`, not `appMode` — that is what makes a dark-polarity zone actually render dark.
 */
export function resolveZoneTheme(
  brandTheme: BrandTheme,
  appMode: 'light' | 'dark',
  args: { self: 'main-app' | 'inner-circle'; brandedZone: 'main-app' | 'inner-circle'; template: TemplateName }
): { colors: ColorProps; mode: 'light' | 'dark' } | null {
  if (!brandTheme) return null;

  if (args.self === args.brandedZone) {
    const effectiveMode = resolveEffectiveMode(brandTheme, appMode, args.template);
    if (!effectiveMode) return null;
    const colors = buildTemplateColors(brandTheme, appMode, args.template);
    if (!colors) return null;
    return { colors, mode: effectiveMode };
  }

  try {
    const colors = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode: appMode });
    return { colors, mode: appMode };
  } catch {
    return null;
  }
}

/**
 * Compat shim for the pre-`resolveZoneTheme` call sites (`palette.tsx`, `MainLayout`,
 * `ImmersiveThemeProvider`): same inputs, returns just the `colors` half. New/updated callers
 * should migrate to `resolveZoneTheme` so they can also paint with the returned effective `mode`.
 */
export function resolveZoneSurfaces(
  brandTheme: BrandTheme,
  appMode: 'light' | 'dark',
  args: { self: 'main-app' | 'inner-circle'; brandedZone: 'main-app' | 'inner-circle'; template: TemplateName }
): ColorProps | null {
  return resolveZoneTheme(brandTheme, appMode, args)?.colors ?? null;
}
