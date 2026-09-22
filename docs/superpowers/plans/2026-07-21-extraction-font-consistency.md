# Extraction Accuracy + Font Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** More accurate brand-color extraction (OKLab clustering, adaptive thresholds, coverage-based selection) and consistent brand fonts (h5/h6 + chart legends), with no regressions to the analytics dashboard.

**Architecture:** `extractBrandColors.ts` becomes a thin canvas shell over pure, exported, node-testable functions (sRGB→OKLab, adaptive chroma cutoff, OKLab median-cut with coverage, coverage/hue-based selection). Font work is one typography edit plus 10 additive `useTheme()`-driven legend edits.

**Tech Stack:** React 19, MUI v7, ApexCharts, Vitest (node env — no jsdom/canvas).

**Spec:** `docs/superpowers/specs/2026-07-21-extraction-font-consistency-design.md`

## Global Constraints

- Branch `innercirclecrmmerge` — verify `git branch --show-current` before EVERY commit.
- Node via nvm: `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"` before any npm/vitest command.
- Backend zero changes. TS strict, no `any`. `@typescript-eslint/no-shadow` is error-level (don't name an sx/callback param `theme` when an outer `theme` exists). No Tailwind.
- Typecheck baseline is **48 `error TS` lines**; the 10 chart files + `extractBrandColors.ts` have **0** errors today — keep them at 0. Do not touch `typography.tsx`'s pre-existing errors (L69/124) or any other baseline error.
- **Never a global `fontFamily` find/replace.** Touch only the 10 listed legend sites. Leave all monospace sites alone.
- Tests: `npx vitest run <path>`. Working dir: `/Users/nigelfernando/Documents/Allyvia/allyvia-frontend`.

## Verified facts

- `extractBrandColors.ts` public: `extractBrandColors(imageFile: File): Promise<BrandColorResult>`; `BrandColorResult = { swatches: string[]; suggestedPrimary: string; suggestedSecondary: string }`; imports `ensureAccessible, hexToHsl, hexToRgb, rgbToHex` from `themes/brandPalette`. Pure exports today: `pixelSaturationLightness`, `isBrandPixel`, `medianCut`, `selectSuggestions`, `interface Rgb`.
- Consumer: `src/ui-component/settings/Branding.tsx` calls `extractBrandColors` and reads `swatches`/`suggestedPrimary`/`suggestedSecondary` — return shape must not change.
- Test env: `vite.config.mts` `test: { passWithNoTests: true }` only — node, no jsdom/canvas. Existing test imports pure fns only, feeds in-memory `Rgb[]`.
- `themes/harmony.ts` exports `hexToOklch(hex): {L,C,H}`, `oklchToHex`; NO OKLab distance/deltaE (private only). `brandPalette.ts` exports `ensureAccessible(hex, text, minRatio=4.5, label?)`, `hexToRgb`, `rgbToHex`, `hexToHsl`.
- `typography.tsx`: `Typography(theme, borderRadius, fontFamily, headingFontFamily?)`; `headingFont = headingFontFamily || fontFamily` (L18); h1–h4 have `fontFamily: headingFont`; **h6 (L22-27) and h5 (L28-33) have NO fontFamily key.**
- Font-load already fires at bootstrap (`themes/index.tsx` L33-40 useEffect); no change needed.

---

### Task 1: Rewrite extraction with pure OKLab functions (TDD)

**Files:**

- Rewrite: `src/utils/extractBrandColors.ts`
- Rewrite: `src/utils/extractBrandColors.test.ts`

**Interfaces:**

- Produces: `interface Rgb {r;g;b}`; `interface Oklab {L;a;b}`; `interface ColorCluster {rgb:Rgb; hex:string; coverage:number}`; pure `rgbToOklab(r,g,b):Oklab`, `chroma(c:Oklab):number`, `oklabDistance(p,q:Oklab):number`, `filterPixels(data:Uint8ClampedArray):Rgb[]`, `adaptiveChromaCutoff(pixels:Rgb[]):number`, `quantize(pixels:Rgb[], maxColors:number):ColorCluster[]`, `selectSuggestions(clusters:ColorCluster[]):{suggestedPrimary;suggestedSecondary}`; unchanged public `extractBrandColors(file):Promise<BrandColorResult>`.

- [ ] **Step 1: Write the failing test file**

Replace `src/utils/extractBrandColors.test.ts` entirely with:

```ts
import { describe, expect, it } from 'vitest';

import {
  adaptiveChromaCutoff,
  chroma,
  filterPixels,
  oklabDistance,
  quantize,
  rgbToOklab,
  selectSuggestions,
  type ColorCluster,
  type Rgb
} from './extractBrandColors';

const cluster = (base: Rgb, n: number, jitter = 4): Rgb[] =>
  Array.from({ length: n }, (_, i) => ({ r: base.r + (i % jitter), g: base.g + (i % jitter), b: base.b + (i % jitter) }));

const HEX = /^#[0-9a-f]{6}$/;

describe('rgbToOklab / chroma / oklabDistance', () => {
  it('grey has ~zero chroma; saturated red has high chroma', () => {
    expect(chroma(rgbToOklab(128, 128, 128))).toBeLessThan(0.01);
    expect(chroma(rgbToOklab(255, 0, 0))).toBeGreaterThan(0.15);
  });

  it('distance is zero for identical colors and positive otherwise', () => {
    expect(oklabDistance(rgbToOklab(10, 20, 30), rgbToOklab(10, 20, 30))).toBeCloseTo(0, 6);
    expect(oklabDistance(rgbToOklab(255, 0, 0), rgbToOklab(0, 0, 255))).toBeGreaterThan(0.2);
  });
});

describe('filterPixels', () => {
  const px = (r: number, g: number, b: number, a: number) => [r, g, b, a];

  it('drops transparent, near-white and near-black; keeps opaque mid colors', () => {
    const data = new Uint8ClampedArray([
      ...px(200, 40, 40, 255), // keep (red)
      ...px(200, 40, 40, 100), // drop (transparent)
      ...px(255, 255, 255, 255), // drop (near-white)
      ...px(2, 2, 2, 255) // drop (near-black)
    ]);
    const kept = filterPixels(data);
    expect(kept).toEqual([{ r: 200, g: 40, b: 40 }]);
  });

  it('returns [] for an all-transparent image', () => {
    const data = new Uint8ClampedArray([...px(200, 40, 40, 0), ...px(10, 200, 10, 20)]);
    expect(filterPixels(data)).toEqual([]);
  });
});

describe('adaptiveChromaCutoff', () => {
  it('requires real chroma for a vivid image, relaxes for a pastel one', () => {
    const vivid = adaptiveChromaCutoff(cluster({ r: 220, g: 20, b: 20 }, 50));
    const pastel = adaptiveChromaCutoff(cluster({ r: 210, g: 200, b: 205 }, 50));
    expect(vivid).toBeGreaterThan(pastel);
  });

  it('does not throw on empty input', () => {
    expect(() => adaptiveChromaCutoff([])).not.toThrow();
  });
});

describe('quantize', () => {
  it('returns [] for no pixels', () => {
    expect(quantize([], 4)).toEqual([]);
  });

  it('yields one full-coverage cluster for a solid color', () => {
    const out = quantize(cluster({ r: 100, g: 50, b: 20 }, 40), 6);
    expect(out).toHaveLength(1);
    expect(out[0].coverage).toBeCloseTo(1, 5);
    expect(out[0].hex).toMatch(HEX);
  });

  it('separates two colors and orders by coverage (dominant first)', () => {
    const out = quantize([...cluster({ r: 230, g: 20, b: 20 }, 90), ...cluster({ r: 20, g: 20, b: 230 }, 10)], 2);
    expect(out).toHaveLength(2);
    expect(out[0].coverage).toBeGreaterThan(out[1].coverage);
    expect(out[0].rgb.r).toBeGreaterThan(out[0].rgb.b); // dominant is the red
    expect(out.reduce((s, c) => s + c.coverage, 0)).toBeCloseTo(1, 5);
  });
});

describe('selectSuggestions', () => {
  const build = (pixels: Rgb[]): ColorCluster[] => quantize(pixels, 6);

  it('falls back to Allyvia defaults for no clusters', () => {
    expect(selectSuggestions([])).toEqual({ suggestedPrimary: '#2f6fd4', suggestedSecondary: '#5f4cc0' });
  });

  it('returns primary === secondary for a solid (monochrome) logo', () => {
    const { suggestedPrimary, suggestedSecondary } = selectSuggestions(build(cluster({ r: 90, g: 58, b: 34 }, 60)));
    expect(suggestedPrimary).toMatch(HEX);
    expect(suggestedSecondary).toBe(suggestedPrimary);
  });

  it('picks the higher-coverage color as primary and a hue-distant one as secondary', () => {
    const out = selectSuggestions(build([...cluster({ r: 220, g: 30, b: 30 }, 85), ...cluster({ r: 30, g: 80, b: 220 }, 25)]));
    expect(out.suggestedPrimary).not.toBe(out.suggestedSecondary);
    // primary derives from the dominant red (after AA it stays reddish: r dominates b)
    const primR = parseInt(out.suggestedPrimary.slice(1, 3), 16);
    const primB = parseInt(out.suggestedPrimary.slice(5, 7), 16);
    expect(primR).toBeGreaterThan(primB);
  });

  it('surfaces a small accent as secondary (90% base + 10% accent)', () => {
    const out = selectSuggestions(build([...cluster({ r: 40, g: 120, b: 60 }, 90), ...cluster({ r: 210, g: 60, b: 30 }, 10)]));
    // primary is the green base, secondary is the orange accent (different hues)
    expect(out.suggestedSecondary).not.toBe(out.suggestedPrimary);
  });

  it('still finds a chromatic pick for a pastel logo (not the default blue)', () => {
    const out = selectSuggestions(build(cluster({ r: 214, g: 176, b: 190 }, 60))); // dusty rose, low chroma
    expect(out.suggestedPrimary).not.toBe('#2f6fd4');
    expect(out.suggestedPrimary).toMatch(HEX);
  });

  it('is deterministic for a photographic spread', () => {
    const pixels = [
      ...cluster({ r: 120, g: 90, b: 60 }, 30),
      ...cluster({ r: 60, g: 110, b: 120 }, 28),
      ...cluster({ r: 150, g: 60, b: 90 }, 26),
      ...cluster({ r: 90, g: 130, b: 70 }, 24)
    ];
    const a = selectSuggestions(build(pixels));
    const b = selectSuggestions(build(pixels));
    expect(a).toEqual(b);
    expect(a.suggestedPrimary).toMatch(HEX);
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run: `npx vitest run src/utils/extractBrandColors.test.ts`
Expected: FAIL — the new exports (`rgbToOklab`, `chroma`, `oklabDistance`, `filterPixels`, `adaptiveChromaCutoff`, `quantize`, new `selectSuggestions` signature, `ColorCluster`) don't exist yet.

- [ ] **Step 3: Rewrite the module**

Replace `src/utils/extractBrandColors.ts` entirely with:

```ts
// ==============================|| BRAND COLOR EXTRACTION ||============================== //
//
// Client-side extraction of candidate brand colors from a logo. The image is drawn to an
// offscreen canvas (downsampled), pixels read, background/shadow filtered, remaining pixels
// clustered in OKLab (perceptual) space. Coverage + hue drive the primary/secondary picks.
// The canvas shell is a thin wrapper; all logic lives in pure functions (node-testable, no canvas).

import { ensureAccessible, rgbToHex } from 'themes/brandPalette';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

export interface ColorCluster {
  rgb: Rgb;
  hex: string;
  /** fraction of the filtered pixels this cluster represents, [0, 1] */
  coverage: number;
}

export interface BrandColorResult {
  swatches: string[];
  suggestedPrimary: string;
  suggestedSecondary: string;
}

const MIN_ALPHA = 128;
const NEAR_WHITE_L = 0.95; // OKLab lightness
const NEAR_BLACK_L = 0.08;
const MAX_CANVAS_DIM = 256;
const MAX_SWATCHES = 6;
const CHROMA_FLOOR = 0.04; // "chromatic" cut when the image has real color
const LOW_CHROMA_FLOOR = 0.012; // relaxed cut for pastel / muted / earth-tone logos
const DEFAULT_PRIMARY = '#2f6fd4';
const DEFAULT_SECONDARY = '#5f4cc0';

const srgbToLinear = (c: number): number => {
  const cn = c / 255;
  return cn <= 0.04045 ? cn / 12.92 : ((cn + 0.055) / 1.055) ** 2.4;
};

/** sRGB (0–255) → OKLab. Björn Ottosson's coefficients. Pure — exported for testing. */
export function rgbToOklab(r: number, g: number, b: number): Oklab {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  };
}

/** OKLab chroma (colorfulness). Pure. */
export function chroma(c: Oklab): number {
  return Math.hypot(c.a, c.b);
}

/** Euclidean OKLab distance. Pure. */
export function oklabDistance(p: Oklab, q: Oklab): number {
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

function oklabHue(c: Oklab): number {
  const h = (Math.atan2(c.b, c.a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

function hueDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Opaque, non-background pixels: drop alpha < MIN_ALPHA and near-white/near-black (by OKLab L).
 * Pure — exported for testing; feed the canvas's RGBA Uint8ClampedArray.
 */
export function filterPixels(data: Uint8ClampedArray): Rgb[] {
  const out: Rgb[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < MIN_ALPHA) continue;
    const { L } = rgbToOklab(r, g, b);
    if (L >= NEAR_WHITE_L || L <= NEAR_BLACK_L) continue;
    out.push({ r, g, b });
  }
  return out;
}

/**
 * Chroma cutoff derived from the pixels' own chroma distribution: require a real chroma when the
 * image is genuinely colorful, but relax to a low floor for pastel/muted logos so we don't gate
 * every cluster out. Pure — exported for testing. Safe on empty input.
 */
export function adaptiveChromaCutoff(pixels: Rgb[]): number {
  if (pixels.length === 0) return CHROMA_FLOOR;
  const chromas = pixels.map((p) => chroma(rgbToOklab(p.r, p.g, p.b))).sort((x, y) => x - y);
  const p90 = chromas[Math.min(chromas.length - 1, Math.floor(chromas.length * 0.9))];
  return p90 >= CHROMA_FLOOR ? CHROMA_FLOOR : LOW_CHROMA_FLOOR;
}

interface LabPoint {
  rgb: Rgb;
  lab: Oklab;
}

/**
 * OKLab median-cut quantization. Splits the box with the widest OKLab axis at its median until
 * maxColors boxes exist, then averages each box (in RGB) and records coverage. Deterministic;
 * returns clusters sorted by coverage (dominant first). Pure — exported for testing.
 */
export function quantize(pixels: Rgb[], maxColors: number): ColorCluster[] {
  if (pixels.length === 0) return [];
  const total = pixels.length;
  let boxes: LabPoint[][] = [pixels.map((rgb) => ({ rgb, lab: rgbToOklab(rgb.r, rgb.g, rgb.b) }))];

  while (boxes.length < maxColors) {
    let ti = -1;
    let tRange = -1;
    let tAxis: keyof Oklab = 'L';
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      (['L', 'a', 'b'] as const).forEach((axis) => {
        let mn = Infinity;
        let mx = -Infinity;
        for (const pt of box) {
          const v = pt.lab[axis];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
        const range = mx - mn;
        if (range > tRange) {
          tRange = range;
          ti = i;
          tAxis = axis;
        }
      });
    });
    if (ti === -1 || tRange <= 1e-6) break;
    const box = boxes[ti];
    box.sort((x, y) => x.lab[tAxis] - y.lab[tAxis]);
    const mid = Math.floor(box.length / 2);
    boxes.splice(ti, 1, box.slice(0, mid), box.slice(mid));
  }

  return boxes
    .filter((b) => b.length > 0)
    .map((box) => {
      const sum = box.reduce((acc, pt) => ({ r: acc.r + pt.rgb.r, g: acc.g + pt.rgb.g, b: acc.b + pt.rgb.b }), { r: 0, g: 0, b: 0 });
      const n = box.length;
      const rgb = { r: Math.round(sum.r / n), g: Math.round(sum.g / n), b: Math.round(sum.b / n) };
      return { rgb, hex: rgbToHex(rgb), coverage: n / total };
    })
    .sort((a, b) => b.coverage - a.coverage);
}

/** Remove duplicate hexes, preserving order. */
function dedupeHex(hexes: string[]): string[] {
  const seen = new Set<string>();
  return hexes.filter((h) => (seen.has(h) ? false : (seen.add(h), true)));
}

/**
 * Pick suggestions from clusters:
 * - primary   = highest-coverage cluster that clears the adaptive chroma cutoff
 * - secondary = the remaining cluster whose OKLab hue is most distant from primary
 * Both pass ensureAccessible so white text meets WCAG AA. Empty → Allyvia defaults; a single
 * cluster → secondary === primary (monochrome logo). Pure — exported for testing.
 */
export function selectSuggestions(clusters: ColorCluster[]): { suggestedPrimary: string; suggestedSecondary: string } {
  if (clusters.length === 0) {
    return { suggestedPrimary: DEFAULT_PRIMARY, suggestedSecondary: DEFAULT_SECONDARY };
  }
  const labOf = (c: ColorCluster) => rgbToOklab(c.rgb.r, c.rgb.g, c.rgb.b);
  const cutoff = adaptiveChromaCutoff(clusters.map((c) => c.rgb));
  const chromatic = clusters.filter((c) => chroma(labOf(c)) >= cutoff);
  const pool = (chromatic.length > 0 ? chromatic : clusters).slice().sort((a, b) => b.coverage - a.coverage);

  const primary = pool[0];
  const primaryHue = oklabHue(labOf(primary));
  const rest = pool.filter((c) => c.hex !== primary.hex);

  let secondary = primary;
  let best = -1;
  for (const c of rest) {
    const d = hueDelta(oklabHue(labOf(c)), primaryHue);
    if (d > best) {
      best = d;
      secondary = c;
    }
  }

  return {
    suggestedPrimary: ensureAccessible(primary.hex, '#fff'),
    suggestedSecondary: ensureAccessible(secondary.hex, '#fff')
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load the image for color extraction.'));
    };
    img.src = url;
  });
}

/**
 * Extract candidate brand colors from a logo file, entirely client-side.
 * Returns distinct swatches (dominant first) plus suggested primary/secondary.
 */
export async function extractBrandColors(imageFile: File): Promise<BrandColorResult> {
  const img = await loadImage(imageFile);

  const naturalW = img.naturalWidth || MAX_CANVAS_DIM;
  const naturalH = img.naturalHeight || MAX_CANVAS_DIM;
  const scale = Math.min(1, MAX_CANVAS_DIM / Math.max(naturalW, naturalH));
  const w = Math.max(1, Math.round(naturalW * scale));
  const h = Math.max(1, Math.round(naturalH * scale));

  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas is not available for color extraction.');
    }
    ctx.drawImage(img, 0, 0, w, h);

    const { data } = ctx.getImageData(0, 0, w, h);
    const pixels = filterPixels(data);
    const clusters = quantize(pixels, MAX_SWATCHES);
    const swatches = dedupeHex(clusters.map((c) => c.hex));
    const { suggestedPrimary, suggestedSecondary } = selectSuggestions(clusters);

    return { swatches, suggestedPrimary, suggestedSecondary };
  } finally {
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  }
}
```

- [ ] **Step 4: Run to verify GREEN**

Run: `npx vitest run src/utils/extractBrandColors.test.ts` — all pass.
Run: `npx vitest run` (full) — no regressions (Branding consumer untouched; other suites green).
Run: `npm run typecheck` — grep for `extractBrandColors`; expected: no errors in the file (48 baseline elsewhere).

- [ ] **Step 5: Commit**

```bash
git add src/utils/extractBrandColors.ts src/utils/extractBrandColors.test.ts
git commit -m "feat(branding): OKLab-based color extraction — adaptive chroma, coverage-weighted primary/secondary"
```

---

### Task 2: Brand heading font on h5 + h6

**Files:**

- Modify: `src/themes/typography.tsx`

- [ ] **Step 1: Add fontFamily to h5 and h6**

In `src/themes/typography.tsx`, add `fontFamily: headingFont,` as the first key of the `h6` object (currently L22-27) and the `h5` object (currently L28-33). After the edit:

```ts
    h6: {
      fontFamily: headingFont,
      fontWeight: 500,
      color: theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
      fontSize: '0.75rem',
      letterSpacing: '0.01em'
    },
    h5: {
      fontFamily: headingFont,
      fontSize: '0.875rem',
      color: theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
      fontWeight: 600,
      letterSpacing: '-0.005em'
    },
```

Also update the comment at L16 from "Only h1–h4 take the brand heading font" to "h1–h6 take the brand heading font; body/inputs/tables stay on the body font." Leave `body1`/`body2`/`subtitle*`/`button`/inputs untouched.

- [ ] **Step 2: Verify** — `npm run typecheck` (still 48 baseline; the pre-existing L69/124 errors are unrelated and unchanged), `npm run build`, `npx vitest run src/themes/typography.test.ts` (if the suite asserts h5/h6 font, update in lockstep; otherwise it stays green).

- [ ] **Step 3: Commit**

```bash
git add src/themes/typography.tsx
git commit -m "feat(theme): extend brand heading font to h5 and h6 section titles"
```

---

### Task 3: Chart legend fonts read the theme

**Files (10 legend sites across 8 files):**

- Modify: `src/ui-component/analytics/inventory/InventoryTreemap.tsx` (L119)
- Modify: `src/views/dashboard/TotalGrowthBarChart.tsx` (consumer of the static config; L68-71 legend merge)
- Modify: `src/ui-component/analytics/crm/CRMAnalyticsPrimaryCharts.tsx` (L161)
- Modify: `src/ui-component/analytics/crm/CRMAnalyticsSecondaryCharts.tsx` (L104, 266, 492)
- Modify: `src/ui-component/analytics/crm/CRMRepPerformance.tsx` (L53, 106)
- Modify: `src/ui-component/analytics/employee/EmployeeAnalytics.tsx` (L292)
- Modify: `src/ui-component/analytics/employee/TimeUtilization.tsx` (L47)

**Interfaces:** each site's ApexCharts `legend.fontFamily` becomes `theme.typography.fontFamily`. Additive-only: add `import { useTheme } from '@mui/material/styles';` + `const theme = useTheme();` where the component lacks a theme; never restructure the options objects.

For EACH site, replace the literal:

```ts
fontFamily: 'Roboto, sans-serif',
```

with:

```ts
fontFamily: theme.typography.fontFamily,
```

Per-file setup (do the minimum; verify against the current file since line numbers may have shifted — locate by the `fontFamily: 'Roboto, sans-serif'` string inside a `legend` block):

- [ ] **Step 1: `InventoryTreemap.tsx`** — already imports/calls `useTheme()`. Just swap the one string (L119).

- [ ] **Step 2: `TotalGrowthBarChart.tsx`** — has `useTheme()` (L44) and an existing legend merge (~L68-71) that spreads `...prev.legend`. Add `fontFamily: theme.typography.fontFamily` into that legend override object. (Leave the static `chart-data/total-growth-bar-chart.tsx` file alone — the consumer override wins.)

- [ ] **Step 3: `CRMAnalyticsPrimaryCharts.tsx`** — has `useConfig()` but no `useTheme`. Add `import { useTheme } from '@mui/material/styles';` and `const theme = useTheme();`, then swap L161.

- [ ] **Step 4: `CRMAnalyticsSecondaryCharts.tsx`** — add `useTheme()` once; swap all three legend sites (L104, 266, 492).

- [ ] **Step 5: `CRMRepPerformance.tsx`** — no theme hook. Add `import { useTheme }` + `const theme = useTheme();`; swap L53 and L106.

- [ ] **Step 6: `EmployeeAnalytics.tsx`** — options built in an inline IIFE that closes over component scope. Add `const theme = useTheme();` at component top (add the import); the IIFE closes over it; swap L292.

- [ ] **Step 7: `TimeUtilization.tsx`** — `useSelector` only. Add `import { useTheme }` + `const theme = useTheme();`; swap L47.

- [ ] **Step 8: Verify**

Run: `grep -rn "Roboto, sans-serif" src/ui-component/analytics src/views/dashboard` — expect ZERO matches in the 8 edited files (the static `chart-data/total-growth-bar-chart.tsx` string may remain but is overridden; if it still contains the literal, that's acceptable per plan — note it).
Run: `npm run typecheck` — the 8 files stay at 0 errors (48 baseline elsewhere).
Run: `npm run build`.
Run: `grep -rn "fontFamily.*monospace" src` — confirm the monospace sites are all still present (untouched).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(analytics): chart legend fonts read the theme (brand body font) instead of hardcoded Roboto"
```

---

### Task 4: Verification pass

**Files:** none (fix-forward only).

- [ ] **Step 1: Static** — `npm run typecheck` (48 baseline, none in touched files); `npm run build`; `npx vitest run` (full — new extraction tests pass, all green); `npx prettier --check` + `npx eslint` on every touched file (fix with `--write` / targeted edits; watch `no-shadow`).

- [ ] **Step 2: Browser (dev servers :3000/:8000)**

1. `/analytics` → each chart tab renders; legends show Inter (not Roboto); no console errors from the chart files.
2. Immersive Inner Circle page: a section title / `h5`/`h6` element shows the brand heading font.
3. Settings → Branding: uploading a logo still produces swatches + suggested primary/secondary (extraction path intact end-to-end).

- [ ] **Step 3: Commit fixes** — `git add -A && git commit -m "fix: Part 4 verification follow-ups"` (skip if none).

## Self-review notes

- Spec coverage: OKLab clustering + adaptive threshold + coverage selection + 256px + 5 tests (T1), h5/h6 (T2), 10 legend sites (T3), analytics-intact + monospace-untouched verification (T3/T4), bootstrap font-load = verified no-change (spec §4b). Return-shape unchanged → Branding consumer safe.
- Type consistency: `Oklab`/`ColorCluster`/`Rgb` defined once in `extractBrandColors.ts`; `selectSuggestions` now takes `ColorCluster[]` (tests updated in lockstep); no `any`.
- Known deviations: `pixelSaturationLightness`/`isBrandPixel` removed (dead after OKLab switch) — their tests removed too; `NEAR_WHITE_L` retuned 0.92→0.95 for OKLab L (OKLab L of white is 1.0, of mid-greys lower than HSL lightness).
