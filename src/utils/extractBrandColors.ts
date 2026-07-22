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
// OKLab lightness compresses the low end far less than HSL does: rgb(2,2,2) — visually pure
// black — already lands at L≈0.0847. A 0.08 cutoff (the naive HSL-scale value) would let that
// pixel through, so the near-black gate is set just above the darkest realistic near-black pixel.
const NEAR_BLACK_L = 0.1;
const MAX_CANVAS_DIM = 256;
const MAX_SWATCHES = 6;
const CHROMA_FLOOR = 0.04; // "chromatic" cut when the image has real color
const LOW_CHROMA_FLOOR = 0.012; // relaxed cut for pastel / muted / earth-tone logos
// Perceptual near-duplicate threshold (OKLab distance) used to merge quantize() boxes. Jitter from
// anti-aliasing/dithering around one true logo color measures ~0.009–0.011 here; genuinely distinct
// hues/lightness levels in this module's own test fixtures never measure below ~0.11 — a >10x margin.
const MERGE_DISTANCE = 0.03;
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

interface WeightedCluster {
  rgb: Rgb;
  lab: Oklab;
  count: number;
}

/**
 * Merge clusters that are perceptually identical (OKLab distance below MERGE_DISTANCE), combining
 * them via a count-weighted RGB average. Repeats on the closest remaining pair until none are
 * within the threshold. Collapses the near-duplicate boxes that median-cut alone produces from
 * anti-aliasing/dither jitter around a single true color (e.g. a flat-color logo).
 */
function mergeNearDuplicates(clusters: WeightedCluster[]): WeightedCluster[] {
  let list = clusters.slice();
  while (list.length > 1) {
    let bi = -1;
    let bj = -1;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const d = oklabDistance(list[i].lab, list[j].lab);
        if (d < bestDist) {
          bestDist = d;
          bi = i;
          bj = j;
        }
      }
    }
    if (bestDist >= MERGE_DISTANCE) break;
    const a = list[bi];
    const b = list[bj];
    const n = a.count + b.count;
    const rgb: Rgb = {
      r: Math.round((a.rgb.r * a.count + b.rgb.r * b.count) / n),
      g: Math.round((a.rgb.g * a.count + b.rgb.g * b.count) / n),
      b: Math.round((a.rgb.b * a.count + b.rgb.b * b.count) / n)
    };
    list = list.filter((_, idx) => idx !== bi && idx !== bj);
    list.push({ rgb, lab: rgbToOklab(rgb.r, rgb.g, rgb.b), count: n });
  }
  return list;
}

/**
 * OKLab median-cut quantization. Splits the box with the widest OKLab axis at its largest gap
 * (not the population median — a small, well-separated accent color must still land in its own
 * box even when it is a small minority of the pixels and maxColors only allows one split) until
 * maxColors boxes exist. Averages each box (in RGB), merges perceptual near-duplicates, and
 * records coverage. Deterministic; returns clusters sorted by coverage (dominant first).
 * Pure — exported for testing.
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
    let splitAt = Math.floor(box.length / 2);
    let bestGap = -1;
    for (let k = 1; k < box.length; k++) {
      const gap = box[k].lab[tAxis] - box[k - 1].lab[tAxis];
      if (gap > bestGap) {
        bestGap = gap;
        splitAt = k;
      }
    }
    boxes.splice(ti, 1, box.slice(0, splitAt), box.slice(splitAt));
  }

  const weighted: WeightedCluster[] = boxes
    .filter((b) => b.length > 0)
    .map((box) => {
      const sum = box.reduce((acc, pt) => ({ r: acc.r + pt.rgb.r, g: acc.g + pt.rgb.g, b: acc.b + pt.rgb.b }), { r: 0, g: 0, b: 0 });
      const n = box.length;
      const rgb = { r: Math.round(sum.r / n), g: Math.round(sum.g / n), b: Math.round(sum.b / n) };
      return { rgb, lab: rgbToOklab(rgb.r, rgb.g, rgb.b), count: n };
    });

  return mergeNearDuplicates(weighted)
    .map((c) => ({ rgb: c.rgb, hex: rgbToHex(c.rgb), coverage: c.count / total }))
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
