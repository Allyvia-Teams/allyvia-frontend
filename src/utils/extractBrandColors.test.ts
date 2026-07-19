import { describe, expect, it, vi } from 'vitest';

import { hexToHsl } from 'themes/brandPalette';
import { isBrandPixel, medianCut, pixelSaturationLightness, selectSuggestions, type Rgb } from './extractBrandColors';

const LV_BROWN = '#5a3a22';
const LV_GOLD = '#c8a951';

describe('pixelSaturationLightness', () => {
  it('reports lightness/saturation extremes correctly', () => {
    expect(pixelSaturationLightness(255, 255, 255).l).toBeCloseTo(1, 2); // white
    expect(pixelSaturationLightness(0, 0, 0).l).toBeCloseTo(0, 2); // black
    expect(pixelSaturationLightness(128, 128, 128).s).toBeCloseTo(0, 2); // grey → no saturation
    const red = pixelSaturationLightness(255, 0, 0);
    expect(red.s).toBeCloseTo(1, 2);
    expect(red.l).toBeCloseTo(0.5, 2);
  });

  it('handles light saturated colors (the l > 0.5 saturation branch)', () => {
    const pink = pixelSaturationLightness(255, 200, 200); // light but fully saturated
    expect(pink.l).toBeGreaterThan(0.5);
    expect(pink.s).toBeCloseTo(1, 2);
  });
});

describe('isBrandPixel', () => {
  it('rejects backgrounds, shadows and transparency; accepts saturated brand colors', () => {
    expect(isBrandPixel(255, 255, 255, 255)).toBe(false); // near-white background
    expect(isBrandPixel(2, 2, 2, 255)).toBe(false); // near-black
    expect(isBrandPixel(130, 130, 130, 255)).toBe(false); // grey shadow (low saturation)
    expect(isBrandPixel(90, 58, 34, 100)).toBe(false); // brown but transparent
    expect(isBrandPixel(90, 58, 34, 255)).toBe(true); // opaque saturated brown
    expect(isBrandPixel(200, 169, 81, 255)).toBe(true); // gold
  });
});

describe('medianCut', () => {
  const cluster = (base: Rgb, n: number, jitter = 5): Rgb[] =>
    Array.from({ length: n }, (_, i) => ({
      r: base.r + (i % jitter),
      g: base.g + (i % jitter),
      b: base.b + (i % jitter)
    }));

  it('returns [] for no pixels', () => {
    expect(medianCut([], 4)).toEqual([]);
  });

  it('separates two distinct clusters into two swatches', () => {
    const reds = cluster({ r: 240, g: 10, b: 10 }, 50);
    const blues = cluster({ r: 10, g: 10, b: 240 }, 50);
    const out = medianCut([...reds, ...blues], 2);

    expect(out).toHaveLength(2);
    const hasRed = out.some((c) => c.r > 200 && c.b < 60);
    const hasBlue = out.some((c) => c.b > 200 && c.r < 60);
    expect(hasRed && hasBlue).toBe(true);
  });

  it('orders swatches by population (most prominent first)', () => {
    const reds = cluster({ r: 240, g: 10, b: 10 }, 90);
    const blues = cluster({ r: 10, g: 10, b: 240 }, 10);
    const out = medianCut([...reds, ...blues], 2);
    // dominant red cluster should come first
    expect(out[0].r).toBeGreaterThan(out[0].b);
  });

  it('returns a single swatch for a uniform (zero-range) input instead of looping', () => {
    const uniform = Array.from({ length: 10 }, () => ({ r: 100, g: 50, b: 20 }));
    const out = medianCut(uniform, 4); // asks for 4 but the box has zero range → stops at 1
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ r: 100, g: 50, b: 20 });
  });
});

describe('selectSuggestions', () => {
  it('picks the darkest swatch as primary and the most distinct as secondary (LV brown/gold)', () => {
    // brown is darker than gold → primary; gold is most distinct → secondary
    const { suggestedPrimary, suggestedSecondary } = selectSuggestions([LV_GOLD, LV_BROWN, '#e8dcc8']);

    // brown already passes AA on white, so it is returned unchanged as primary
    expect(suggestedPrimary).toBe(LV_BROWN);
    // secondary is derived from the gold; ensureAccessible darkens it but keeps the gold hue
    expect(suggestedSecondary).not.toBe(suggestedPrimary);
    const secHue = hexToHsl(suggestedSecondary).h;
    expect(secHue).toBeGreaterThan(35); // gold/amber hue range
    expect(secHue).toBeLessThan(55);
  });

  it('returns AA-legible suggestions (white text passes)', () => {
    const { suggestedPrimary, suggestedSecondary } = selectSuggestions([LV_GOLD, LV_BROWN]);
    // both must be dark enough for white text (contrast is computed by the caller via ensureAccessible)
    expect(hexToHsl(suggestedPrimary).l).toBeLessThan(0.5);
    expect(hexToHsl(suggestedSecondary).l).toBeLessThan(0.6);
  });

  it('falls back to Allyvia defaults when no swatches are found', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(selectSuggestions([])).toEqual({ suggestedPrimary: '#2f6fd4', suggestedSecondary: '#5f4cc0' });
    warn.mockRestore();
  });

  it('falls back to primary === secondary for a single-swatch (monochrome) logo', () => {
    const { suggestedPrimary, suggestedSecondary } = selectSuggestions([LV_BROWN]);
    expect(suggestedPrimary).toBe(LV_BROWN);
    expect(suggestedSecondary).toBe(LV_BROWN);
  });
});
