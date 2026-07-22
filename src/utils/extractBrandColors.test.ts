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
