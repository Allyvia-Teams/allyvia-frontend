// ==============================|| BRAND COLOR EXTRACTION ||============================== //
//
// Client-side extraction of candidate brand colors from a logo. The image is drawn to an
// offscreen canvas (downsampled for speed), pixels are read, background/shadow colors are
// filtered out, and the remaining pixels are quantized with an inline median-cut algorithm.
// No network call, no new dependency.

import { ensureAccessible, hexToHsl, hexToRgb, rgbToHex } from 'themes/brandPalette';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface BrandColorResult {
  /** Distinct saturated swatches, most prominent first. */
  swatches: string[];
  suggestedPrimary: string;
  suggestedSecondary: string;
}

// Pixels lighter/darker than these (HSL lightness) are treated as background / shadow / text.
const NEAR_WHITE_L = 0.92;
const NEAR_BLACK_L = 0.08;
// Below this HSL saturation a pixel is a grey (background, shadow, anti-aliasing) — not a brand color.
const MIN_SATURATION = 0.15;
const MIN_ALPHA = 128;
const MAX_CANVAS_DIM = 128; // downsample target — bounds work so a 1–2 MB logo extracts in well under 1s
const MAX_SWATCHES = 6;

/** Saturation + lightness of an RGB pixel, in [0, 1]. Cheap (no hex round-trip) for per-pixel use. */
export function pixelSaturationLightness(r: number, g: number, b: number): { s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return { s, l };
}

/** True if a pixel is a plausible brand color (opaque enough, saturated, not near-white/black). */
export function isBrandPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < MIN_ALPHA) return false;
  const { s, l } = pixelSaturationLightness(r, g, b);
  if (l >= NEAR_WHITE_L || l <= NEAR_BLACK_L) return false;
  if (s < MIN_SATURATION) return false;
  return true;
}

interface RangeInfo {
  channel: keyof Rgb;
  range: number;
}

function widestChannel(box: Rgb[]): RangeInfo {
  const min: Rgb = { r: 255, g: 255, b: 255 };
  const max: Rgb = { r: 0, g: 0, b: 0 };
  for (const p of box) {
    (['r', 'g', 'b'] as const).forEach((c) => {
      if (p[c] < min[c]) min[c] = p[c];
      if (p[c] > max[c]) max[c] = p[c];
    });
  }
  const ranges: RangeInfo[] = (['r', 'g', 'b'] as const).map((c) => ({ channel: c, range: max[c] - min[c] }));
  return ranges.reduce((best, cur) => (cur.range > best.range ? cur : best));
}

function averageColor(box: Rgb[]): Rgb {
  const sum = box.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }), { r: 0, g: 0, b: 0 });
  const n = box.length || 1;
  return { r: Math.round(sum.r / n), g: Math.round(sum.g / n), b: Math.round(sum.b / n) };
}

/**
 * Median-cut quantization: repeatedly split the box with the widest color channel at its median
 * until `maxColors` boxes exist, then average each box. Returns swatches sorted by population
 * (most prominent first). Pure — exported for testing.
 */
export function medianCut(pixels: Rgb[], maxColors: number): Rgb[] {
  if (pixels.length === 0) return [];
  let boxes: Rgb[][] = [pixels.slice()];

  while (boxes.length < maxColors) {
    // pick the splittable box (>= 2 px) with the widest channel range
    let target = -1;
    let targetRange = -1;
    let targetChannel: keyof Rgb = 'r';
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const { channel, range } = widestChannel(box);
      if (range > targetRange) {
        targetRange = range;
        target = i;
        targetChannel = channel;
      }
    });
    if (target === -1 || targetRange === 0) break; // nothing left to split meaningfully

    const box = boxes[target];
    box.sort((a, b) => a[targetChannel] - b[targetChannel]);
    const mid = Math.floor(box.length / 2);
    boxes.splice(target, 1, box.slice(0, mid), box.slice(mid));
  }

  return boxes
    .filter((b) => b.length > 0)
    .sort((a, b) => b.length - a.length)
    .map(averageColor);
}

function rgbDistance(a: string, b: string): number {
  const p = hexToRgb(a);
  const q = hexToRgb(b);
  return Math.sqrt((p.r - q.r) ** 2 + (p.g - q.g) ** 2 + (p.b - q.b) ** 2);
}

/** Remove duplicate hexes, preserving order. */
function dedupeHex(hexes: string[]): string[] {
  const seen = new Set<string>();
  return hexes.filter((h) => (seen.has(h) ? false : (seen.add(h), true)));
}

/**
 * Pick suggestions from a list of (already filtered) swatches:
 * - primary   = darkest swatch (deep brand color reads well as a solid fill with white text)
 * - secondary = the remaining swatch most distinct from primary (largest RGB distance)
 * Both are run through ensureAccessible so white text on them meets WCAG AA. Pure — exported for testing.
 */
export function selectSuggestions(swatches: string[]): { suggestedPrimary: string; suggestedSecondary: string } {
  const list = dedupeHex(swatches);
  if (list.length === 0) {
    // no colored pixels found — fall back to the Allyvia defaults
    return { suggestedPrimary: '#2f6fd4', suggestedSecondary: '#5f4cc0' };
  }

  const primaryHex = [...list].sort((a, b) => hexToHsl(a).l - hexToHsl(b).l)[0];
  const rest = list.filter((h) => h !== primaryHex);

  let secondaryHex = primaryHex;
  let bestDist = -1;
  for (const h of rest) {
    const d = rgbDistance(h, primaryHex);
    if (d > bestDist) {
      bestDist = d;
      secondaryHex = h;
    }
  }

  return {
    suggestedPrimary: ensureAccessible(primaryHex, '#fff'),
    suggestedSecondary: ensureAccessible(secondaryHex, '#fff')
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load the image for color extraction.'));
    };
    img.src = url;
  });
}

/**
 * Extract candidate brand colors from a logo file, entirely client-side.
 * Returns distinct saturated swatches plus suggested primary/secondary colors.
 */
export async function extractBrandColors(imageFile: File): Promise<BrandColorResult> {
  const img = await loadImage(imageFile);

  // SVGs may report 0 natural size — fall back to a square canvas.
  const naturalW = img.naturalWidth || MAX_CANVAS_DIM;
  const naturalH = img.naturalHeight || MAX_CANVAS_DIM;
  const scale = Math.min(1, MAX_CANVAS_DIM / Math.max(naturalW, naturalH));
  const w = Math.max(1, Math.round(naturalW * scale));
  const h = Math.max(1, Math.round(naturalH * scale));

  // Always release the blob URL, even if canvas access throws (getContext null, drawImage error).
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

    const brandPixels: Rgb[] = [];
    const relaxedPixels: Rgb[] = []; // opaque, non-white/black, but any saturation (fallback for muted logos)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < MIN_ALPHA) continue;
      const { l } = pixelSaturationLightness(r, g, b);
      if (l >= NEAR_WHITE_L || l <= NEAR_BLACK_L) continue;
      relaxedPixels.push({ r, g, b });
      if (isBrandPixel(r, g, b, a)) brandPixels.push({ r, g, b });
    }

    const source = brandPixels.length >= 16 ? brandPixels : relaxedPixels;
    const swatches = dedupeHex(medianCut(source, MAX_SWATCHES).map(rgbToHex));
    const { suggestedPrimary, suggestedSecondary } = selectSuggestions(swatches);

    return { swatches, suggestedPrimary, suggestedSecondary };
  } finally {
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  }
}
