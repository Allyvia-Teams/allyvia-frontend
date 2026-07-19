import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AA_NORMAL,
  contrastRatio,
  ensureAccessible,
  generateBrandPalette,
  hexToHsl,
  hexToRgb,
  hslToHex,
  LOCKED_TIER3_TOKENS
} from './brandPalette';

const HEX = /^#[0-9a-f]{6}$/;

// Smallest angular distance between two hues, accounting for the 0/360 wraparound.
const hueDelta = (a: string, b: string): number => {
  const d = Math.abs(hexToHsl(a).h - hexToHsl(b).h);
  return Math.min(d, 360 - d);
};

// Louis-Vuitton-ish brand pair used across the ramp tests.
const LV_BROWN = '#5a3a22';
const LV_GOLD = '#c8a951';

// Every key `palette.tsx` reads off the resolved `colors` object.
const REQUIRED_KEYS = [
  'paper',
  'darkPaper',
  'darkBackground',
  'darkLevel1',
  'darkLevel2',
  'darkTextPrimary',
  'darkTextSecondary',
  'darkTextTitle',
  'primaryLight',
  'primary200',
  'primaryMain',
  'primaryDark',
  'primary800',
  'secondaryLight',
  'secondary200',
  'secondaryMain',
  'secondaryDark',
  'secondary800',
  'darkPrimaryLight',
  'darkPrimary200',
  'darkPrimaryMain',
  'darkPrimaryDark',
  'darkPrimary800',
  'darkSecondaryLight',
  'darkSecondary200',
  'darkSecondaryMain',
  'darkSecondaryDark',
  'darkSecondary800',
  'goldDark',
  'gold200',
  'gold800',
  'goldText',
  'successLight',
  'success200',
  'successMain',
  'successDark',
  'errorLight',
  'errorMain',
  'errorDark',
  'orangeLight',
  'orangeMain',
  'orangeDark',
  'warningLight',
  'warningMain',
  'warningDark',
  'grey50',
  'grey100',
  'grey200',
  'grey300',
  'grey500',
  'grey600',
  'grey700',
  'grey900'
] as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ensureAccessible', () => {
  it('darkens a too-light color until white text meets AA, preserving hue', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input = '#68a6f5'; // raw Allyvia logo blue — too light for white text

    expect(contrastRatio(input, '#fff')).toBeLessThan(AA_NORMAL); // precondition

    const corrected = ensureAccessible(input, '#fff');

    expect(corrected).not.toBe(input);
    expect(contrastRatio(corrected, '#fff')).toBeGreaterThanOrEqual(AA_NORMAL);
    // hue is preserved through the correction
    expect(Math.abs(hexToHsl(corrected).h - hexToHsl(input).h)).toBeLessThan(2);
    // a shift was reported, quoting original + corrected hex
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(input);
    expect(warn.mock.calls[0][0]).toContain(corrected);
  });

  it('lightens a too-dark color until black text meets AA, preserving hue and warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input = LV_BROWN; // dark brown — black text on it is illegible

    expect(contrastRatio(input, '#000')).toBeLessThan(AA_NORMAL); // precondition

    const corrected = ensureAccessible(input, '#000');

    expect(corrected).not.toBe(input);
    expect(contrastRatio(corrected, '#000')).toBeGreaterThanOrEqual(AA_NORMAL);
    // moved in the correct direction: lighter than the input
    expect(hexToHsl(corrected).l).toBeGreaterThan(hexToHsl(input).l);
    // hue preserved through the lightening branch
    expect(hueDelta(corrected, input)).toBeLessThan(2);
    // a shift was reported on this branch too, quoting original + corrected hex
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(input);
    expect(warn.mock.calls[0][0]).toContain(corrected);
  });

  it('returns a color that already passes unchanged, without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(ensureAccessible('#000000', '#fff')).toBe('#000000');
    expect(ensureAccessible('#2f6fd4', '#fff')).toBe('#2f6fd4'); // corrected Allyvia blue already passes
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('generateBrandPalette — ramp generation', () => {
  it('emits the five primary ramp stops as valid hex', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = generateBrandPalette({ primary: LV_BROWN, secondary: LV_GOLD, mode: 'light' });

    for (const key of ['primaryLight', 'primary200', 'primaryMain', 'primaryDark', 'primary800']) {
      expect(p[key]).toMatch(HEX);
    }
  });

  it('orders the primary ramp light → dark by HSL lightness', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = generateBrandPalette({ primary: LV_BROWN, secondary: LV_GOLD, mode: 'light' });

    const l = (hex: string) => hexToHsl(hex).l;
    expect(l(p.primaryLight)).toBeGreaterThan(l(p.primary200));
    expect(l(p.primary200)).toBeGreaterThan(l(p.primaryMain));
    expect(l(p.primaryMain)).toBeGreaterThan(l(p.primaryDark));
    expect(l(p.primaryDark)).toBeGreaterThan(l(p.primary800));
  });

  it('orders the secondary and both dark-mode ramps light → dark (exercises the dark-mode factors)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = generateBrandPalette({ primary: LV_BROWN, secondary: LV_GOLD, mode: 'light' });
    const l = (hex: string) => hexToHsl(hex).l;

    const assertOrdered = (prefix: string) => {
      const stops = [`${prefix}Light`, `${prefix}200`, `${prefix}Main`, `${prefix}Dark`, `${prefix}800`].map((k) => l(p[k]));
      for (let i = 0; i < stops.length - 1; i += 1) {
        expect(stops[i], `${prefix} ramp not strictly decreasing at stop ${i}`).toBeGreaterThan(stops[i + 1]);
      }
    };

    assertOrdered('secondary'); // light-mode secondary factors
    assertOrdered('darkPrimary'); // dark-mode factor set
    assertOrdered('darkSecondary'); // dark-mode factor set
  });

  it('makes primary/secondary main legible with white text (WCAG AA)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = generateBrandPalette({ primary: LV_BROWN, secondary: LV_GOLD, mode: 'light' });

    expect(contrastRatio(p.primaryMain, '#fff')).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(p.secondaryMain, '#fff')).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(p.darkPrimaryMain, '#fff')).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(p.darkSecondaryMain, '#fff')).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('preserves the brand hue in the light tints', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = generateBrandPalette({ primary: LV_BROWN, secondary: LV_GOLD, mode: 'light' });
    const brownHue = hexToHsl(LV_BROWN).h;

    expect(Math.abs(hexToHsl(p.primary200).h - brownHue)).toBeLessThan(8);
    expect(Math.abs(hexToHsl(p.primaryLight).h - brownHue)).toBeLessThan(8);
  });

  it('copies every Tier-3 token verbatim from the locked source', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = generateBrandPalette({ primary: LV_BROWN, secondary: LV_GOLD, mode: 'light' });

    // representative non-brand tokens must NOT be derived from the brand color
    expect(p.successMain).toBe('#2e7d32');
    expect(p.errorMain).toBe('#e53935');
    expect(p.warningMain).toBe('#f59e0b');
    expect(p.grey700).toBe('#374151');
    expect(p.paper).toBe('#ffffff');

    for (const [key, value] of Object.entries(LOCKED_TIER3_TOKENS)) {
      expect(p[key]).toBe(value);
    }
  });

  it('returns a complete ColorProps — every key palette.tsx reads is present and valid', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = generateBrandPalette({ primary: LV_BROWN, secondary: LV_GOLD, mode: 'light' });

    for (const key of REQUIRED_KEYS) {
      expect(p[key], `missing/invalid key: ${key}`).toMatch(HEX);
    }
  });

  it('produces a complete, AA-legible palette in dark mode and passes its active-main self-check', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = generateBrandPalette({ primary: LV_BROWN, secondary: LV_GOLD, mode: 'dark' });

    for (const key of REQUIRED_KEYS) {
      expect(p[key], `missing/invalid key: ${key}`).toMatch(HEX);
    }
    // the mode:'dark' active ramp (darkPrimary/darkSecondary main) must be white-text legible
    expect(contrastRatio(p.darkPrimaryMain, '#fff')).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(p.darkSecondaryMain, '#fff')).toBeGreaterThanOrEqual(AA_NORMAL);
    // the dark-branch self-check must NOT fire (any warns are ramp corrections, not the AA guard)
    const selfCheckWarned = warn.mock.calls.some((c) => String(c[0]).includes('below WCAG AA'));
    expect(selfCheckWarned).toBe(false);
  });
});

describe('color-space helpers round-trip', () => {
  it('hexToHsl → hslToHex reproduces the input within rounding tolerance', () => {
    for (const hex of ['#2f6fd4', '#c8a951', '#5a3a22', '#e53935']) {
      const { h, s, l } = hexToHsl(hex);
      const back = hslToHex(h, s, l);
      const a = hexToHsl(hex);
      const b = hexToHsl(back);
      // hue (the most conversion-sensitive channel) survives the round-trip
      expect(hueDelta(hex, back), `hue drift for ${hex}`).toBeLessThan(2);
      // lightness/saturation survive the round-trip closely
      expect(Math.abs(a.l - b.l)).toBeLessThan(0.02);
      expect(Math.abs(a.s - b.s)).toBeLessThan(0.02);
    }
  });

  it('hexToRgb parses 3- and 6-digit hex and throws on malformed input', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#2f6fd4')).toEqual({ r: 47, g: 111, b: 212 });
    expect(() => hexToRgb('#zz00ff')).toThrow(/invalid hex/);
    expect(() => hexToRgb('#12345')).toThrow(/invalid hex/);
    expect(() => hexToRgb('not-a-color')).toThrow(/invalid hex/);
  });
});
