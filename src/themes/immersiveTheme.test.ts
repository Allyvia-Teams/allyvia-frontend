import { afterEach, describe, expect, it, vi } from 'vitest';

import { AA_NORMAL, contrastRatio, hexToOklch } from './harmony';
import { buildImmersiveColors, buildImmersiveSurfaces } from './immersiveTheme';

const BRAND = { primary: '#2f6fd4', secondary: '#5f4cc0', headingFont: 'Playfair Display' };
const HEX = /^#[0-9a-f]{6}$/;
const LIGHT_TEXT = '#374151';
const DARK_TEXT = '#bdc8f0';

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildImmersiveSurfaces', () => {
  it('returns null for null brand, malformed hex, and neutral brands', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildImmersiveSurfaces(null, 'light')).toBeNull();
    expect(buildImmersiveSurfaces({ ...BRAND, primary: 'not-a-hex' }, 'light')).toBeNull();
    expect(buildImmersiveSurfaces({ ...BRAND, primary: '#f7f7f7', secondary: '#eeeeee' }, 'light')).toBeNull();
  });

  it.each(['light', 'dark'] as const)('%s surfaces clear AA vs the locked text tokens (ratios logged)', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, mode);
    expect(s).not.toBeNull();
    const text = mode === 'light' ? LIGHT_TEXT : DARK_TEXT;
    for (const [name, hex] of [
      ['background', s!.background],
      ['paper', s!.paper]
    ] as const) {
      const ratio = contrastRatio(hex, text);
      console.log(`immersive.${mode}.${name} vs text ${text}: ${ratio.toFixed(2)}:1`);
      expect(hex).toMatch(HEX);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    }
    const inkRatio = contrastRatio(s!.headingInk, s!.background);
    console.log(`immersive.${mode}.headingInk vs background: ${inkRatio.toFixed(2)}:1`);
    expect(inkRatio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('keeps the brand hue and crushes chroma on the light background', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, 'light')!;
    const brandHue = hexToOklch(BRAND.primary).H;
    const bg = hexToOklch(s.background);
    expect(hueDistance(bg.H, brandHue)).toBeLessThanOrEqual(8);
    expect(bg.C).toBeLessThanOrEqual(0.05 + 1e-6);
  });

  it('emits a two-stop header band and is deterministic', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, 'light')!;
    expect(s.headerBand).toHaveLength(2);
    expect(s.headerBand[0]).toMatch(HEX);
    expect(s.headerBand[1]).toMatch(HEX);
    expect(buildImmersiveSurfaces(BRAND, 'light')).toEqual(s);
  });
});

describe('buildImmersiveColors', () => {
  it('re-points light surface tokens, leaving the brand palette otherwise intact', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, 'light')!;
    const c = buildImmersiveColors(BRAND, 'light')!;
    expect(c.paper).toBe(s.paper);
    expect(c.grey50).toBe(s.background);
    expect(c.primaryMain).toBeDefined();
  });

  it('re-points dark surface tokens', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = buildImmersiveSurfaces(BRAND, 'dark')!;
    const c = buildImmersiveColors(BRAND, 'dark')!;
    expect(c.darkPaper).toBe(s.background);
    expect(c.darkBackground).toBe(s.background);
    expect(c.darkLevel1).toBe(s.paper);
    expect(c.darkLevel2).toBe(s.paper);
  });

  it('returns null whenever surfaces are null', () => {
    expect(buildImmersiveColors(null, 'light')).toBeNull();
  });
});
