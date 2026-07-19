import { describe, expect, it } from 'vitest';

import { BRAND_FONTS, findBrandFont } from './brandFonts';

describe('BRAND_FONTS allowlist', () => {
  it('offers a curated set (~12) of well-formed entries', () => {
    expect(BRAND_FONTS.length).toBeGreaterThanOrEqual(10);
    expect(BRAND_FONTS.length).toBeLessThanOrEqual(16);

    for (const f of BRAND_FONTS) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.family.length).toBeGreaterThan(0);
      expect(['serif', 'sans', 'display']).toContain(f.category);
      // weights must be a non-empty list of valid CSS/Google font weights (100–900, step 100),
      // including a regular (400) face — an unavailable weight makes the css2 URL 400 at runtime.
      expect(Array.isArray(f.weights)).toBe(true);
      expect(f.weights.length).toBeGreaterThan(0);
      expect(f.weights).toContain(400);
      f.weights.forEach((w) => {
        expect(Number.isInteger(w), `weight ${w} of ${f.family} must be an integer`).toBe(true);
        expect(w).toBeGreaterThanOrEqual(100);
        expect(w).toBeLessThanOrEqual(900);
        expect(w % 100, `weight ${w} of ${f.family} must be a multiple of 100`).toBe(0);
      });
    }
  });

  it('has unique family names', () => {
    const families = BRAND_FONTS.map((f) => f.family.toLowerCase());
    expect(new Set(families).size).toBe(families.length);
  });

  it('findBrandFont resolves case-insensitively and returns undefined for unknown families', () => {
    expect(findBrandFont('playfair display')?.family).toBe('Playfair Display');
    expect(findBrandFont('  MARCELLUS  ')?.family).toBe('Marcellus');
    expect(findBrandFont('not-a-real-font')).toBeUndefined();
  });
});
