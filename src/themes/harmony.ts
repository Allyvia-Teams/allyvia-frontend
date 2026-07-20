// ==============================|| PERCEPTUAL COLOR-HARMONY ENGINE (OKLCH) ||============================== //
//
// Turns ANY brand color into a color set that is both LEGIBLE and HARMONIOUS, deterministically
// and with no network. It is the internals behind `generateBrandPalette` (see brandPalette.ts) —
// that function keeps its exact signature/return type; this module does the real work.
//
// Why OKLCH and not HSL? HSL "lightness" is not perceptual: equal HSL-L steps look wildly uneven
// across hues (a yellow at L=0.5 is far brighter than a blue at L=0.5), which makes ramps and
// contrast reasoning unreliable. OKLCH (built on Björn Ottosson's OKLab) is perceptually uniform,
// so stepping L gives even ramps and lets us reason about legibility directly.
//
// Design contract:
//   • All math happens in OKLCH.
//   • Semantic MEANING is inviolable: success/error/warning/info hues never leave their band.
//   • The legibility (WCAG) pass runs LAST and always wins — it only ever moves lightness (L),
//     never hue or chroma, so a corrected color keeps its identity.
//   • Pure functions, no dependency, no `Date`/`Math.random` — same input ⇒ same output (snapshot-safe).
//
// No new npm dependency: OKLab/OKLCH conversion + WCAG relative luminance are implemented inline
// and unit-tested against known reference values (see harmony.test.ts). This mirrors the house
// style of brandPalette.ts, which likewise avoids a color dependency.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A color in the OKLCH space. */
export interface Oklch {
  /** perceptual lightness, [0, 1] (0 = black, 1 = white) */
  L: number;
  /** chroma (colorfulness), >= 0; ~0 is grey, ~0.15 is vivid, >0.25 is neon */
  C: number;
  /** hue in degrees, [0, 360) */
  H: number;
}

/** Linear-ish sRGB channels in [0, 1] (gamma-encoded, i.e. ready to serialize to hex). */
interface Rgb01 {
  r: number;
  g: number;
  b: number;
}

/** A 5-stop ramp (palest → darkest), each a #rrggbb hex string. */
export interface RampStops {
  light: string;
  c200: string;
  main: string;
  dark: string;
  c800: string;
}

/**
 * A single semantic color emitted as the pieces the UI actually needs:
 *  - `main`  — the saturated color (icon / text / solid fill)
 *  - `tint`  — a high-lightness, low-chroma wash for chip/badge backgrounds
 *  - `dark`  — a deeper `main` for hover / emphasis
 *  - `c200`  — a mid tint (only `success` has a `200` slot downstream, but all four carry one)
 */
export interface SemanticSet {
  main: string;
  tint: string;
  dark: string;
  c200: string;
}

export type SemanticName = 'success' | 'error' | 'warning' | 'info';

/** Hue band (OKLCH degrees) a semantic may live in. Its center is the neutral anchor. */
export interface HueBand {
  lo: number;
  hi: number;
  center: number;
  /**
   * Where legibility "pulls": 'white' = white text sits on this fill (make it dark enough),
   * 'dark' = dark text sits on this fill (keep it light enough — e.g. amber warnings whose
   * downstream `contrastText` is grey-700).
   */
  legibleAgainst: 'white' | 'dark';
}

export interface HarmonyOptions {
  /** How the accent (secondary) hue relates to the brand when it must be DERIVED (single-color / neutral brand). Default 'analogous' (+30°). */
  accentScheme?: 'analogous' | 'complementary' | 'triadic';
  /** Max degrees a semantic hue may be nudged toward the brand, always clamped inside its band. Default 8. */
  hueNudgeDeg?: number;
  /** Upper chroma bound for large surfaces (tames neon brands). Default 0.16. */
  chromaMax?: number;
  /** Lower chroma bound for the brand ramp (keeps slightly-muted brands from going flat). Default 0.05. */
  chromaMin?: number;
  /** Floor for semantic chroma so success/error stay recognizably colored even under a muted brand. Default 0.085. */
  semanticChromaMin?: number;
  /** Brand chroma at/under which the brand is treated as neutral (grey). Default 0.04. */
  neutralThreshold?: number;
}

export interface HarmonyResult {
  /** True when the brand is essentially grey; a single accent is injected and the rest stays monochrome. */
  isNeutralBrand: boolean;
  /** The comfortable chroma the whole set is built around (brand chroma, clamped). */
  chromaBudget: number;
  /** The brand's characteristic lightness — biases how deep/light non-brand colors lean. */
  toneProfile: number;
  /** The brand's OKLCH hue (the accent and, gently, the semantics orient around it). */
  brandHue: number;
  primaryLight: RampStops;
  primaryDark: RampStops;
  secondaryLight: RampStops;
  secondaryDark: RampStops;
  success: SemanticSet;
  error: SemanticSet;
  warning: SemanticSet;
  info: SemanticSet;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Semantic hue bands, in OKLCH degrees, validated against the app's own current tokens:
 * successMain #2e7d32 → H144, errorMain #e53935 → H27, warningMain #f59e0b → H70,
 * Allyvia blue #2f6fd4 → H259. A semantic's hue is INVIOLABLE: clamped into [lo, hi] always.
 */
export const SEMANTIC_BANDS: Readonly<Record<SemanticName, HueBand>> = Object.freeze({
  success: { lo: 140, hi: 155, center: 146, legibleAgainst: 'white' },
  error: { lo: 25, hi: 35, center: 29, legibleAgainst: 'white' },
  // Amber is intrinsically light; downstream `warning.contrastText` is grey-700 (dark text on the
  // fill), so warning is legible-against-dark — we keep it light rather than darkening it to a muddy olive.
  warning: { lo: 70, hi: 90, center: 78, legibleAgainst: 'dark' },
  info: { lo: 230, hi: 260, center: 248, legibleAgainst: 'white' }
});

// WCAG AA thresholds (kept local so this module is self-contained; identical to brandPalette.ts).
export const AA_NORMAL = 4.5; // body / normal-weight UI text
export const AA_LARGE = 3.0; // large text (>= 24px, or >= 18.66px bold) and UI graphics

// The default accent hue injected when a brand is neutral (grey) — a calm, trustworthy blue.
const NEUTRAL_ACCENT_HUE = 250;

// Dark-navy surface the dark-mode accents must stay legible on (mirrors LOCKED_TIER3_TOKENS.darkBackground).
const DARK_SURFACE = '#1a223f';

// Dark text token (mirrors LOCKED_TIER3_TOKENS.grey700). It is the `contrastText` palette.tsx pairs
// with the `warning` surface, so amber warning stops must stay legible AGAINST it.
const GREY_700 = '#374151';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/** Wrap a hue into [0, 360). */
const wrapHue = (h: number): number => ((h % 360) + 360) % 360;

/** Signed smallest angular distance from `a` to `b`, in (-180, 180]. */
const hueDiff = (a: number, b: number): number => {
  const d = ((b - a + 540) % 360) - 180;
  return d === -180 ? 180 : d;
};

// ---------------------------------------------------------------------------
// sRGB <-> OKLab <-> OKLCH  (Björn Ottosson, https://bottosson.github.io/posts/oklab/)
// ---------------------------------------------------------------------------

const srgbToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const hex2byte = (h: string, i: number): number => parseInt(h.slice(i, i + 2), 16);

/** Parse #rgb / #rrggbb → gamma sRGB in [0, 1]. Throws on malformed input. */
function hexToRgb01(hex: string): Rgb01 {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`harmony: invalid hex color "${hex}"`);
  }
  return { r: hex2byte(h, 0) / 255, g: hex2byte(h, 2) / 255, b: hex2byte(h, 4) / 255 };
}

const byteToHex = (v: number): string =>
  clamp(Math.round(v * 255), 0, 255)
    .toString(16)
    .padStart(2, '0');

const rgb01ToHex = ({ r, g, b }: Rgb01): string => `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;

/** gamma sRGB [0,1] → OKLCH. */
function rgb01ToOklch({ r, g, b }: Rgb01): Oklch {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.hypot(A, B);
  const H = C < 1e-7 ? 0 : wrapHue((Math.atan2(B, A) * 180) / Math.PI);
  return { L, C, H };
}

/** OKLCH → gamma sRGB [0,1] (may fall outside [0,1] if out of the sRGB gamut). */
function oklchToRgb01({ L, C, H }: Oklch): Rgb01 {
  const hr = (H * Math.PI) / 180;
  const A = C * Math.cos(hr);
  const B = C * Math.sin(hr);

  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  };
}

const inGamut = ({ r, g, b }: Rgb01): boolean => [r, g, b].every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** Public: parse a hex color to OKLCH. */
export function hexToOklch(hex: string): Oklch {
  return rgb01ToOklch(hexToRgb01(hex));
}

/**
 * Public: serialize an OKLCH color to #rrggbb.
 *
 * If the color is outside the sRGB gamut, chroma is reduced (hue and lightness preserved) via
 * binary search until it fits — this keeps the perceptual identity (you never get a hue shift
 * from clipping), then any 1-LSB residual is clamped on serialize.
 */
export function oklchToHex(o: Oklch): string {
  const base: Oklch = { L: clamp(o.L, 0, 1), C: Math.max(0, o.C), H: wrapHue(o.H) };

  if (inGamut(oklchToRgb01(base))) {
    return rgb01ToHex(oklchToRgb01(base));
  }

  // Binary-search the largest in-gamut chroma at this (L, H).
  let lo = 0;
  let hi = base.C;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb01({ ...base, C: mid }))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return rgb01ToHex(oklchToRgb01({ ...base, C: lo }));
}

// ---------------------------------------------------------------------------
// WCAG contrast (self-contained)
// ---------------------------------------------------------------------------

/** Relative luminance per WCAG 2.1, in [0, 1]. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb01(hex);
  const lin = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG contrast ratio between two colors, in [1, 21]. Symmetric. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ---------------------------------------------------------------------------
// Legibility pass — runs last, always wins, moves L only
// ---------------------------------------------------------------------------

/**
 * Adjust an OKLCH color's LIGHTNESS ONLY until it reaches `minRatio` contrast against `bg`,
 * preserving hue and chroma. Direction is chosen automatically: if `bg` is lighter than the
 * color we darken it, otherwise we lighten it. Emits a single `console.warn` (before → after)
 * whenever a shift is actually applied.
 *
 * This is the guarantee that makes ANY brand safe: whatever the harmony step proposes, this step
 * drags foregrounds into legibility without touching their identity (hue/chroma untouched).
 */
export function ensureLegible(color: Oklch, bg: string, minRatio: number, label: string): Oklch {
  const startHex = oklchToHex(color);
  if (contrastRatio(startHex, bg) >= minRatio) {
    return color;
  }

  // Darken the color if the background is the lighter of the two, else lighten it.
  const darken = relativeLuminance(bg) >= relativeLuminance(startHex);
  const step = 0.01;
  let L = color.L;
  let best: Oklch = color;

  for (let i = 0; i < 100; i += 1) {
    L = clamp(darken ? L - step : L + step, 0, 1);
    best = { ...color, L };
    if (contrastRatio(oklchToHex(best), bg) >= minRatio || L <= 0 || L >= 1) {
      break;
    }
  }

  const endHex = oklchToHex(best);

  console.warn(
    `[harmony] ${label} shifted for WCAG (target ${minRatio} on ${bg}): ${startHex} → ${endHex} ` +
      `(contrast ${contrastRatio(startHex, bg).toFixed(2)} → ${contrastRatio(endHex, bg).toFixed(2)})`
  );
  return best;
}

// ---------------------------------------------------------------------------
// Ramp builder
// ---------------------------------------------------------------------------

/**
 * Build a 5-stop OKLCH ramp around a hue at a given chroma budget.
 *
 * `main` is placed at a legible lightness and then contrast-corrected against `mainBg` (white text
 * for solid fills, so the fill is dark enough — equivalently the color is legible AS text on white).
 * The other four stops are derived RELATIVE to the corrected main L, which guarantees a strictly
 * decreasing light → dark ordering for any input, and keeps chroma peaking mid-ramp and tapering at
 * the extremes (no neon-light tint, no muddy-dark shade).
 */
function buildRamp(hue: number, chroma: number, toneProfile: number, mode: 'light' | 'dark', label: string): RampStops {
  // Target main lightness: a legible mid, nudged slightly by the brand's tone (deeper brand → deeper main).
  const targetMainL = clamp(0.56 + (toneProfile - 0.6) * 0.12, 0.45, 0.64);
  const mainCorrected = ensureLegible({ L: targetMainL, C: chroma, H: hue }, '#ffffff', AA_NORMAL, `${label}.main`);
  const mL = mainCorrected.L;

  if (mode === 'light') {
    return {
      light: oklchToHex({ L: mL + (1 - mL) * 0.9, C: chroma * 0.4, H: hue }),
      c200: oklchToHex({ L: mL + (1 - mL) * 0.55, C: chroma * 0.68, H: hue }),
      main: oklchToHex(mainCorrected),
      dark: oklchToHex(ensureLegible({ L: mL * 0.82, C: chroma * 0.95, H: hue }, '#ffffff', AA_NORMAL, `${label}.dark`)),
      c800: oklchToHex(ensureLegible({ L: mL * 0.66, C: chroma * 0.8, H: hue }, '#ffffff', AA_NORMAL, `${label}.800`))
    };
  }

  // Dark mode: the palest stops lean brighter so the accent reads on the dark-navy surface, while
  // `main` stays white-text legible. `c200` is explicitly lifted until it clears AA_LARGE on navy.
  const c200Dark = ensureLegible({ L: 0.8, C: chroma * 0.72, H: hue }, DARK_SURFACE, AA_LARGE, `${label}.200`);
  return {
    light: oklchToHex({ L: 0.9, C: chroma * 0.5, H: hue }),
    c200: oklchToHex(c200Dark),
    main: oklchToHex(mainCorrected),
    dark: oklchToHex(ensureLegible({ L: mL * 0.85, C: chroma * 0.9, H: hue }, '#ffffff', AA_NORMAL, `${label}.dark`)),
    c800: oklchToHex(ensureLegible({ L: mL * 0.7, C: chroma * 0.75, H: hue }, '#ffffff', AA_NORMAL, `${label}.800`))
  };
}

// ---------------------------------------------------------------------------
// Semantic harmonization
// ---------------------------------------------------------------------------

/**
 * Build one semantic color, harmonized to the brand but with its MEANING preserved.
 *
 * - Hue starts at the band center and is nudged toward the brand hue by at most `hueNudgeDeg`,
 *   then hard-clamped inside the band — so a pink brand tilts "success" toward a warmer green,
 *   but it never stops reading as green.
 * - Chroma follows the brand's budget (muted brand → muted semantics; vivid → vivid), floored so
 *   the color stays recognizable.
 * - `main` is contrast-corrected: for white-text semantics it is darkened until white text passes
 *   AND until it is legible AS text on its own tint; for dark-text semantics (amber warning) it is
 *   kept light and verified against dark text.
 * - `tint` is a pale, low-chroma wash (chip background) that any dark text clears.
 */
function buildSemantic(band: HueBand, brandHue: number, semChroma: number, toneProfile: number, hueNudgeDeg: number): SemanticSet {
  const hue = clamp(band.center + clamp(hueDiff(band.center, brandHue), -hueNudgeDeg, hueNudgeDeg), band.lo, band.hi);

  // Pale wash for chip/badge backgrounds: high L, low C. Verified to seat dark text (grey-700).
  const tint = ensureLegibleBg({ L: 0.95, C: Math.min(semChroma * 0.28, 0.045), H: hue }, GREY_700, AA_NORMAL, `${band.center}.tint`);
  const tintHex = oklchToHex(tint);

  let main: Oklch;
  if (band.legibleAgainst === 'white') {
    // Dark enough for white text; then also dark enough to be legible AS text on its own tint.
    const targetL = clamp(0.58 - (0.6 - toneProfile) * 0.1, 0.45, 0.62);
    main = ensureLegible({ L: targetL, C: semChroma, H: hue }, '#ffffff', AA_NORMAL, `sem${band.center}.main`);
    main = ensureLegible(main, tintHex, AA_NORMAL, `sem${band.center}.main/tint`);
  } else {
    // Amber-style: keep it light; dark text (grey-700) must clear it. Lighten (not darken) if needed.
    const targetL = clamp(0.76 + (toneProfile - 0.6) * 0.06, 0.7, 0.82);
    main = ensureLegible({ L: targetL, C: semChroma, H: hue }, GREY_700, AA_NORMAL, `sem${band.center}.main`);
  }

  const mL = main.L;
  // The `dark` (hover/emphasis) stop must stay legible against the SAME text as `main`:
  //  - white-legible semantics → darken it (deeper fill still clears white text);
  //  - dark-legible amber (warning) → start a touch darker for a hover shade, but keep grey-700
  //    legible by LIGHTENING if needed, so `warning.dark` never becomes a deep amber that its
  //    grey-700 `contrastText` fails on (palette.tsx pairs .dark with the same contrastText).
  const dark =
    band.legibleAgainst === 'white'
      ? ensureLegible({ L: mL * 0.82, C: semChroma, H: hue }, '#ffffff', AA_NORMAL, `sem${band.center}.dark`)
      : ensureLegibleBg({ L: mL * 0.9, C: semChroma, H: hue }, GREY_700, AA_NORMAL, `sem${band.center}.dark`);
  const c200 = oklchToHex({ L: clamp(mL + (1 - mL) * 0.55, 0, 0.9), C: semChroma * 0.6, H: hue });

  return { main: oklchToHex(main), tint: tintHex, dark: oklchToHex(dark), c200 };
}

/** Like ensureLegible but LIGHTENS a background until dark `text` clears it (keeps hue/chroma). */
function ensureLegibleBg(bg: Oklch, text: string, minRatio: number, label: string): Oklch {
  const startHex = oklchToHex(bg);
  if (contrastRatio(startHex, text) >= minRatio) {
    return bg;
  }
  const step = 0.01;
  let L = bg.L;
  let best: Oklch = bg;
  for (let i = 0; i < 100; i += 1) {
    L = clamp(L + step, 0, 1);
    best = { ...bg, L };
    if (contrastRatio(oklchToHex(best), text) >= minRatio || L >= 1) break;
  }

  console.warn(`[harmony] ${label} tint lightened for WCAG: ${startHex} → ${oklchToHex(best)}`);
  return best;
}

// ---------------------------------------------------------------------------
// Accent (secondary) hue derivation
// ---------------------------------------------------------------------------

function deriveAccentHue(brandHue: number, scheme: NonNullable<HarmonyOptions['accentScheme']>): number {
  switch (scheme) {
    case 'complementary':
      return wrapHue(brandHue + 180);
    case 'triadic':
      return wrapHue(brandHue + 120);
    case 'analogous':
    default:
      return wrapHue(brandHue + 30);
  }
}

// ---------------------------------------------------------------------------
// Engine entry point
// ---------------------------------------------------------------------------

/**
 * Turn a brand pair into a full, legible, harmonious color system.
 *
 * `secondary` is honored when it is a real (chromatic) color: its hue is kept but its chroma/tone
 * are pulled to the brand's budget so it reads as a sibling. When the brand is neutral (grey) — or
 * a caller passes a near-grey secondary — a single tasteful accent is derived instead (default
 * analogous +30°), so interactive elements still have life while everything else stays monochrome.
 */
export function generateHarmony(input: { primary: string; secondary: string }, opts: HarmonyOptions = {}): HarmonyResult {
  const {
    accentScheme = 'analogous',
    hueNudgeDeg = 8,
    chromaMax = 0.16,
    chromaMin = 0.05,
    semanticChromaMin = 0.085,
    neutralThreshold = 0.04
  } = opts;

  const brand = hexToOklch(input.primary);
  const secondaryOklch = hexToOklch(input.secondary);

  const isNeutralBrand = brand.C < neutralThreshold;
  const toneProfile = brand.L;
  const brandHue = brand.H;

  // chromaBudget: the brand's chroma, kept out of the "flat" and "neon" zones. Semantics get a
  // slightly firmer floor so success/error never wash out to grey.
  const chromaBudget = clamp(brand.C, chromaMin, chromaMax);
  const semChroma = clamp(brand.C, semanticChromaMin, chromaMax);

  // Primary ramp: the brand hue itself (or a pure-neutral grey ramp for a grey brand).
  const primaryChroma = isNeutralBrand ? 0 : chromaBudget;
  const primaryLight = buildRamp(brandHue, primaryChroma, toneProfile, 'light', 'primary');
  const primaryDark = buildRamp(brandHue, primaryChroma, toneProfile, 'dark', 'darkPrimary');

  // Secondary/accent hue:
  //  - neutral (grey) brand → inject one tasteful, fixed accent (a calm blue), the only splash of color;
  //  - chromatic brand with a neutral secondary → derive an accent from the brand hue (default +30°);
  //  - otherwise honor the provided secondary's hue, re-toned to the brand budget so it reads as a sibling.
  const secondaryIsNeutral = secondaryOklch.C < neutralThreshold;
  const accentHue = isNeutralBrand ? NEUTRAL_ACCENT_HUE : secondaryIsNeutral ? deriveAccentHue(brandHue, accentScheme) : secondaryOklch.H;
  // A neutral brand's accent needs real chroma even though the brand itself had none.
  const accentChroma = isNeutralBrand ? clamp(0.1, semanticChromaMin, chromaMax) : chromaBudget;
  const secondaryLight = buildRamp(accentHue, accentChroma, toneProfile, 'light', 'secondary');
  const secondaryDark = buildRamp(accentHue, accentChroma, toneProfile, 'dark', 'darkSecondary');

  // Semantics: harmonized to the brand, meaning preserved. A grey brand has no hue to pull toward,
  // so the nudge is disabled and each semantic sits at its neutral band center.
  const semanticNudge = isNeutralBrand ? 0 : hueNudgeDeg;
  const semantic = (name: SemanticName): SemanticSet =>
    buildSemantic(SEMANTIC_BANDS[name], brandHue, semChroma, toneProfile, semanticNudge);

  return {
    isNeutralBrand,
    chromaBudget,
    toneProfile,
    brandHue,
    primaryLight,
    primaryDark,
    secondaryLight,
    secondaryDark,
    success: semantic('success'),
    error: semantic('error'),
    warning: semantic('warning'),
    info: semantic('info')
  };
}
