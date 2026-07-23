// types
import { ColorProps } from 'types';
import { BrandTheme } from 'types/config';

import { generateBrandPalette } from './brandPalette';
import { AA_NORMAL, ensureLegible, generateHarmony, oklchToHex } from './harmony';

// ==============================|| TEMPLATE LAYER MODEL (6 looks × 3 layers) ||============================== //
//
// See docs/superpowers/specs/2026-07-21-template-gallery-design.md (Architecture section is
// authoritative). An owner picks ONE of 6 cohesive templates. Each template is expressed as a
// TREATMENT applied to each of three independent layers:
//   • chrome  — sidebar + top AppBar
//   • canvas  — the content page background
//   • card    — widget / card surfaces
// Treatments: 'neutral' (standard light/white), 'tinted' (light brand wash + dark ink),
// 'dark' (dark brand surface + near-white text), 'accented' (white card + brand accent; card-only).
//
// This module owns the low-level surface machinery (`treatmentSurfaces` → OKLCH via `ensureLegible`
// + `generateBrandPalette`) and the two public resolvers MainLayout consumes: `resolveChromeTheme`
// (chrome layer) and `resolveContentTheme` (canvas + card layers). It is null-safe throughout —
// a missing/malformed/neutral brand resolves to null so callers fall through to the ambient
// (un-branded) theme.

// Locked text tokens (see LOCKED_TIER3_TOKENS in brandPalette.ts) that every branded surface must
// stay legible against, chosen by POLARITY (not app mode) — see
// docs/superpowers/specs/2026-07-21-brand-luminance-polarity-addendum.md.
const LIGHT_TEXT = '#374151'; // grey700 — dark ink, light polarity
const DARK_SURFACE_TEXT = '#bdc8f0'; // darkTextPrimary — near-white, dark polarity

/**
 * Surface polarity: `light` = light surfaces + dark ink text (today's look); `dark` = dark,
 * brand-colored surfaces + near-white text. A treatment picks its polarity via `TREATMENT_TARGETS`.
 */
export type Polarity = 'light' | 'dark';

/** The six owner-selectable whole-UI looks (see the design spec's template table). */
export type TemplateName = 'clean' | 'tinted' | 'sidebar' | 'widgets' | 'immersive' | 'bold';

/**
 * How a single layer (chrome / canvas / card) is rendered. `accented` is only ever valid on the
 * card layer (white card + brand left-border/title); chrome + canvas are only ever
 * neutral | tinted | dark.
 */
export type Treatment = 'neutral' | 'tinted' | 'dark' | 'accented';

/** The 6 templates, each a treatment per layer. Authoritative table — matches the design spec. */
export const TEMPLATE_SPECS: Record<TemplateName, { chrome: Treatment; canvas: Treatment; card: Treatment }> = {
  clean: { chrome: 'neutral', canvas: 'neutral', card: 'neutral' },
  // tinted vs immersive both wash the content (in light mode the canvas + cards share ONE surface
  // token — background.paper — so a "tinted canvas + white cards" split is not expressible; both
  // layers must be tinted for the wash to render). They are differentiated by CHROME instead:
  // tinted = neutral (white) chrome + washed content; immersive = tinted chrome + washed content.
  tinted: { chrome: 'neutral', canvas: 'tinted', card: 'tinted' },
  sidebar: { chrome: 'dark', canvas: 'neutral', card: 'neutral' },
  widgets: { chrome: 'neutral', canvas: 'neutral', card: 'accented' },
  immersive: { chrome: 'tinted', canvas: 'tinted', card: 'tinted' },
  bold: { chrome: 'dark', canvas: 'dark', card: 'dark' }
};

/**
 * Per-treatment OKLCH surface targets (reuse today's tuned values): `tinted` == the old light "soft"
 * preset, `dark` == the old dark "bold" preset. `neutral`/`accented` have no surface target — they
 * keep `generateBrandPalette`'s own locked surface tokens.
 */
const TREATMENT_TARGETS = {
  tinted: { pol: 'light' as Polarity, bgL: 0.94, paperL: 0.965, chromaMax: 0.05 },
  dark: { pol: 'dark' as Polarity, bgL: 0.2, paperL: 0.26, chromaMax: 0.12 }
};

/** Build a single AA-corrected surface hex at (L, C, H) against `text`. */
function surface(L: number, C: number, H: number, text: string, label: string): string {
  return oklchToHex(ensureLegible({ L, C, H }, text, AA_NORMAL, label));
}

/**
 * Derive the `{ background, paper }` surface pair for a `tinted` | `dark` treatment from the brand
 * pair. The surface's hue/chroma come from the brand's harmony; its lightness from the treatment
 * target; and it is AA-corrected against the polarity's locked text token so it can never end up
 * illegible (a dark treatment is corrected against near-white text, so it only ever moves DARKER).
 *
 * Returns null when nothing sensible can be derived: no brand, a neutral/near-grey brand, or a
 * malformed hex (reachable via the unvalidated localStorage cache).
 */
function treatmentSurfaces(brandTheme: BrandTheme, treatment: 'tinted' | 'dark'): { background: string; paper: string } | null {
  if (!brandTheme) return null;
  try {
    const harmony = generateHarmony({ primary: brandTheme.primary, secondary: brandTheme.secondary });
    if (harmony.isNeutralBrand) return null;

    const target = TREATMENT_TARGETS[treatment];
    const H = harmony.brandHue;
    const C = Math.min(harmony.chromaBudget, target.chromaMax);
    const text = target.pol === 'light' ? LIGHT_TEXT : DARK_SURFACE_TEXT;

    const background = surface(target.bgL, C, H, text, `${treatment}.background`);
    const paper = surface(target.paperL, Math.min(C, 0.035), H, text, `${treatment}.paper`);
    return { background, paper };
  } catch {
    return null;
  }
}

/**
 * Build the `ColorProps` + effective `mode` for ONE uniform treatment applied across all surfaces.
 * Used for the CHROME layer (whose treatment is only ever neutral | tinted | dark).
 *
 *  - `neutral`  → `generateBrandPalette(appMode)` unchanged (mode = appMode).
 *  - `tinted`   → light-polarity tinted surfaces re-pointed onto `generateBrandPalette('light')`; mode 'light'.
 *  - `dark`     → dark-polarity brand surfaces re-pointed onto `generateBrandPalette('dark')`; mode 'dark'.
 *  - `accented` → treated as `neutral` for colors (the accent flag is handled by the content layer).
 *
 * Null-safe: null/malformed/neutral brand → null.
 */
export function buildTreatmentColors(
  brandTheme: BrandTheme,
  treatment: Treatment,
  appMode: 'light' | 'dark'
): { colors: ColorProps; mode: 'light' | 'dark' } | null {
  if (!brandTheme) return null;

  // 'accented' contributes no surface tint of its own — its colors are the neutral base.
  const effective = treatment === 'accented' ? 'neutral' : treatment;

  try {
    if (effective === 'neutral') {
      const colors = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode: appMode });
      return { colors, mode: appMode };
    }

    if (effective === 'tinted') {
      const base = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode: 'light' });
      const ts = treatmentSurfaces(brandTheme, 'tinted');
      if (!ts) return null;
      return { colors: { ...base, grey50: ts.background, paper: ts.paper }, mode: 'light' };
    }

    // effective === 'dark'
    const base = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode: 'dark' });
    const ts = treatmentSurfaces(brandTheme, 'dark');
    if (!ts) return null;
    return {
      colors: { ...base, darkPaper: ts.background, darkBackground: ts.background, darkLevel1: ts.paper, darkLevel2: ts.paper },
      mode: 'dark'
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the CHROME theme (Sidebar + top AppBar) for a template. The chrome layer's treatment is
 * looked up from `TEMPLATE_SPECS`.
 *
 * When the chrome treatment is `neutral` (clean, widgets) this returns null so MainLayout leaves
 * the chrome on the ambient (un-branded) theme — only `tinted`/`dark` chrome returns a theme.
 * Null-safe: null/malformed/neutral brand → null.
 */
export function resolveChromeTheme(
  brandTheme: BrandTheme,
  appMode: 'light' | 'dark',
  template: TemplateName = 'tinted'
): { colors: ColorProps; mode: 'light' | 'dark' } | null {
  const chrome = TEMPLATE_SPECS[template]?.chrome ?? 'neutral';
  // Neutral chrome needs no theming — fall through to the ambient theme.
  if (chrome === 'neutral') return null;
  return buildTreatmentColors(brandTheme, chrome, appMode);
}

/**
 * Resolve the CONTENT theme (canvas + cards) for a template. Builds the canvas background from the
 * `.canvas` treatment and re-points ONLY the card/paper tokens from the `.card` treatment, so e.g.
 * a tinted canvas + neutral card = tinted page background with white cards.
 *
 *  - `cardAccented` is true iff the card treatment is `accented` (the `widgets` template) — MainLayout
 *    merges `cardOverrides` into the assembled theme when it is set.
 *  - Fully-neutral content (neutral canvas + non-tinted/non-dark card: `clean`, `sidebar`) returns
 *    null so the content stays on the global neutral theme — UNLESS `cardAccented` (`widgets`), which
 *    returns a non-null neutral palette so the accented-card override is still carried.
 *  - `mode` is `dark` iff the canvas or card treatment is `dark`.
 *
 * Null-safe: unknown template, null/malformed/neutral brand → null.
 */
export function resolveContentTheme(
  brandTheme: BrandTheme,
  appMode: 'light' | 'dark',
  template: TemplateName
): { colors: ColorProps; mode: 'light' | 'dark'; cardAccented: boolean } | null {
  const spec = TEMPLATE_SPECS[template];
  if (!spec) return null;
  if (!brandTheme) return null;

  const canvasT = spec.canvas;
  const cardT = spec.card;
  const cardAccented = cardT === 'accented';

  try {
    // Fully-neutral content surfaces (clean, sidebar, widgets — all have a neutral canvas + a card
    // that is neither tinted nor dark). Return null unless the card is accented (widgets): that one
    // must return a non-null neutral palette so MainLayout still applies the accented-card override.
    if (canvasT === 'neutral' && cardT !== 'tinted' && cardT !== 'dark') {
      if (!cardAccented) return null;
      const colors = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode: appMode });
      return { colors, mode: appMode, cardAccented: true };
    }

    const mode: 'light' | 'dark' = canvasT === 'dark' || cardT === 'dark' ? 'dark' : 'light';
    const base = generateBrandPalette({ primary: brandTheme.primary, secondary: brandTheme.secondary, mode });

    // Canvas hex (page background) comes from the canvas treatment; card hex (elevated surface)
    // from the card treatment. A needed treatment that can't resolve short-circuits to null.
    let canvasHex: string | null = null;
    if (canvasT === 'tinted' || canvasT === 'dark') {
      const canvasSurfaces = treatmentSurfaces(brandTheme, canvasT);
      if (!canvasSurfaces) return null;
      canvasHex = canvasSurfaces.background;
    }
    let cardHex: string | null = null;
    if (cardT === 'tinted' || cardT === 'dark') {
      const cardSurfaces = treatmentSurfaces(brandTheme, cardT);
      if (!cardSurfaces) return null;
      cardHex = cardSurfaces.paper;
    }

    if (mode === 'light') {
      // In light mode the working canvas (MainContentStyled) AND the cards both read
      // `background.paper` (== colors.paper); `grey50` is only used by a couple of accents (bento
      // gradient / table zebra). So the wash must land in `paper` to actually render — fall back to
      // the canvas tint when the card layer itself is neutral so a canvas-only tint still shows.
      const surfaceHex = cardHex ?? canvasHex;
      const colors: ColorProps = {
        ...base,
        ...(canvasHex ? { grey50: canvasHex } : {}),
        ...(surfaceHex ? { paper: surfaceHex } : {})
      };
      return { colors, mode, cardAccented };
    }

    // Dark mode: re-point the dark surface tokens (canvas → background levels; card → elevated levels).
    const colors: ColorProps = {
      ...base,
      ...(canvasHex ? { darkPaper: canvasHex, darkBackground: canvasHex } : {}),
      ...(cardHex ? { darkLevel1: cardHex, darkLevel2: cardHex } : {})
    };
    return { colors, mode, cardAccented };
  } catch {
    return null;
  }
}

/**
 * MUI `components`-shaped fragment that makes cards "pop" for the `widgets` template: a brand-colored
 * left border on the card root and a brand-colored card title. Content stays white/legible — this
 * only accents the card's frame, never fills it. MainLayout deep-merges this into the assembled
 * content theme when `resolveContentTheme(...).cardAccented` is true. Typed loosely so the caller
 * can merge it without coupling to MUI's override types.
 */
export function cardOverrides(primaryHex: string): Record<string, unknown> {
  return {
    MuiCard: {
      styleOverrides: {
        // A brand accent stripe down the card's left edge. Implemented as a `::before` pseudo-element
        // (not `borderLeft`) on purpose: MainCard applies an instance `sx: { border: 'none' }`, whose
        // `border` shorthand would reset a theme-level `borderLeft` — but instance `sx` never touches
        // `::before`, so the stripe survives on both MainCard-based and plain MUI cards.
        root: {
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: primaryHex
          }
        }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        title: {
          color: primaryHex
        }
      }
    }
  };
}
