import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AA_LARGE,
  AA_NORMAL,
  contrastRatio,
  ensureLegible,
  generateHarmony,
  hexToOklch,
  oklchToHex,
  SEMANTIC_BANDS,
  type HarmonyResult,
  type SemanticName
} from './harmony';

const HEX = /^#[0-9a-f]{6}$/;
const GREY_700 = '#374151'; // dark text token (LOCKED_TIER3_TOKENS.grey700)
const DARK_NAVY = '#1a223f'; // LOCKED_TIER3_TOKENS.darkBackground

// The six brand inputs from the deliverable's screenshot grid.
const BRANDS = {
  pink: '#F7A8C4',
  yellow: '#FFD400',
  teal: '#0D9488',
  grey: '#3A3A3A',
  navy: '#17255A',
  neon: '#00FF66'
} as const;

const gen = (primary: string, secondary = primary): HarmonyResult => generateHarmony({ primary, secondary });

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// OKLCH conversion — validated against Björn Ottosson's published reference values
// ---------------------------------------------------------------------------

describe('OKLCH conversion (reference values)', () => {
  const cases: Array<[string, number, number, number]> = [
    // hex, L, C, H  (H is don't-care when C≈0)
    ['#ffffff', 1.0, 0.0, NaN],
    ['#000000', 0.0, 0.0, NaN],
    ['#808080', 0.5999, 0.0, NaN],
    ['#ff0000', 0.6279, 0.2577, 29.23],
    ['#00ff00', 0.8664, 0.2948, 142.5],
    ['#0000ff', 0.452, 0.3132, 264.05]
  ];

  it.each(cases)('%s → OKLCH matches reference', (hex, L, C, H) => {
    const o = hexToOklch(hex);
    expect(o.L).toBeCloseTo(L, 2);
    expect(o.C).toBeCloseTo(C, 2);
    if (!Number.isNaN(H)) expect(Math.abs(((o.H - H + 540) % 360) - 180)).toBeLessThan(1.5);
  });

  it('round-trips hex → OKLCH → hex within 1 LSB', () => {
    for (const hex of ['#2f6fd4', '#c8a951', '#5a3a22', '#e53935', '#f7a8c4', '#00ff66']) {
      const back = oklchToHex(hexToOklch(hex));
      const a = hexToOklch(hex);
      const b = hexToOklch(back);
      expect(a.L).toBeCloseTo(b.L, 2);
      expect(a.C).toBeCloseTo(b.C, 2);
    }
  });

  it('gamut-maps an out-of-gamut OKLCH by reducing chroma, preserving hue', () => {
    const wanted = { L: 0.9, C: 0.4, H: 142 }; // way past the sRGB green boundary
    const hex = oklchToHex(wanted);
    expect(hex).toMatch(HEX);
    const got = hexToOklch(hex);
    expect(got.C).toBeLessThan(wanted.C); // chroma was pulled in
    expect(Math.abs(((got.H - wanted.H + 540) % 360) - 180)).toBeLessThan(3); // hue preserved
  });
});

// ---------------------------------------------------------------------------
// Legibility pass — moves L only, always reaches target, warns
// ---------------------------------------------------------------------------

describe('ensureLegible', () => {
  it('darkens a light fill until white text passes AA, preserving hue & chroma', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const start = { L: 0.85, C: 0.1, H: 356 }; // light pink — white text fails
    expect(contrastRatio(oklchToHex(start), '#ffffff')).toBeLessThan(AA_NORMAL);

    const fixed = ensureLegible(start, '#ffffff', AA_NORMAL, 'test');
    expect(contrastRatio(oklchToHex(fixed), '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(fixed.L).toBeLessThan(start.L); // darkened
    expect(fixed.H).toBe(start.H); // hue untouched
    expect(fixed.C).toBe(start.C); // chroma untouched
  });

  it('returns an already-legible color unchanged, without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dark = { L: 0.3, C: 0.1, H: 250 };
    expect(ensureLegible(dark, '#ffffff', AA_NORMAL, 'test')).toBe(dark);
    expect(warn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Semantic meaning is inviolable
// ---------------------------------------------------------------------------

describe('semantic hue bands are never left', () => {
  it('keeps every semantic inside its band for a full sweep of brand hues', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (let H = 0; H < 360; H += 15) {
      const primary = oklchToHex({ L: 0.6, C: 0.12, H });
      const h = gen(primary);
      (['success', 'error', 'warning', 'info'] as SemanticName[]).forEach((name) => {
        const band = SEMANTIC_BANDS[name];
        const mainHue = hexToOklch(h[name].main).H;
        // allow a hair of gamut-mapping/rounding slack outside the strict band
        expect(mainHue).toBeGreaterThanOrEqual(band.lo - 2);
        expect(mainHue).toBeLessThanOrEqual(band.hi + 2);
      });
    }
  });

  it('nudges toward the brand but stays in-band (pink brand → warmer, still-green success)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const h = gen(BRANDS.pink);
    const successHue = hexToOklch(h.success.main).H;
    expect(successHue).toBeGreaterThanOrEqual(SEMANTIC_BANDS.success.lo);
    expect(successHue).toBeLessThanOrEqual(SEMANTIC_BANDS.success.hi);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('deterministic', () => {
  it('same input → identical output (snapshot-safe)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(gen(BRANDS.pink)).toEqual(gen(BRANDS.pink));
    expect(gen(BRANDS.neon, BRANDS.teal)).toEqual(gen(BRANDS.neon, BRANDS.teal));
  });
});

// ---------------------------------------------------------------------------
// Contrast guarantees for every one of the six brands
// ---------------------------------------------------------------------------

describe('WCAG AA holds for all six brand inputs', () => {
  for (const [name, hex] of Object.entries(BRANDS)) {
    it(`${name} (${hex}) — every fg/bg pair used passes AA`, () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const h = gen(hex);

      // brand actions: white text on the solid fill (light + dark mode)
      expect(contrastRatio(h.primaryLight.main, '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);
      expect(contrastRatio(h.secondaryLight.main, '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);
      expect(contrastRatio(h.primaryDark.main, '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);
      expect(contrastRatio(h.secondaryDark.main, '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);

      // dark-mode accent reads on the navy surface (large/UI ⇒ AA_LARGE)
      expect(contrastRatio(h.primaryDark.c200, DARK_NAVY)).toBeGreaterThanOrEqual(AA_LARGE);

      // white-text semantics legible with white text AND as text on their own tint
      for (const s of [h.success, h.error, h.info]) {
        expect(contrastRatio(s.main, '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);
        expect(contrastRatio(s.main, s.tint)).toBeGreaterThanOrEqual(AA_NORMAL);
      }

      // amber warning is a dark-text-on-fill token: grey-700 must clear BOTH its main and its
      // hover (`dark`) surface — palette.tsx pairs the same grey-700 contrastText with warning.dark
      expect(contrastRatio(h.warning.main, GREY_700)).toBeGreaterThanOrEqual(AA_NORMAL);
      expect(contrastRatio(h.warning.dark, GREY_700)).toBeGreaterThanOrEqual(AA_NORMAL);

      // any dark text on a semantic tint chip is legible
      for (const s of [h.success, h.error, h.warning, h.info]) {
        expect(contrastRatio(s.tint, GREY_700)).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Ramps are perceptually ordered light → dark
// ---------------------------------------------------------------------------

describe('ramps ordered light → dark (OKLCH L)', () => {
  for (const [name, hex] of Object.entries(BRANDS)) {
    it(`${name} — primary & secondary, light & dark modes strictly decrease`, () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const h = gen(hex);
      for (const ramp of [h.primaryLight, h.primaryDark, h.secondaryLight, h.secondaryDark]) {
        const ls = [ramp.light, ramp.c200, ramp.main, ramp.dark, ramp.c800].map((x) => hexToOklch(x).L);
        for (let i = 0; i < ls.length - 1; i += 1) expect(ls[i]).toBeGreaterThan(ls[i + 1]);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Acceptance criteria
// ---------------------------------------------------------------------------

describe('acceptance criteria', () => {
  it('pink → legible pink action + softer, still-green success (re-toned, not fire-engine)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const h = gen(BRANDS.pink);

    // legible pink action color: white text passes, hue still in the pink/magenta family
    expect(contrastRatio(h.primaryLight.main, '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);
    const pMainHue = hexToOklch(h.primaryLight.main).H;
    expect(pMainHue > 330 || pMainHue < 20).toBe(true);

    // success re-toned: green band, muted (chroma well below raw #00ff00's 0.29), still clearly green
    const s = hexToOklch(h.success.main);
    expect(s.H).toBeGreaterThanOrEqual(SEMANTIC_BANDS.success.lo);
    expect(s.H).toBeLessThanOrEqual(SEMANTIC_BANDS.success.hi);
    expect(s.C).toBeLessThan(0.2); // softer than fire-engine green
    expect(s.C).toBeGreaterThan(0.04); // but unambiguously colored
    expect(h.success.main).not.toBe('#2e7d32'); // no longer the raw locked green
  });

  it('yellow → tints keep yellow, action darkened to pass AA', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const h = gen(BRANDS.yellow);
    const brandHue = hexToOklch(BRANDS.yellow).H;

    // the pale tint keeps the yellow hue
    expect(Math.abs(hexToOklch(h.primaryLight.light).H - brandHue)).toBeLessThan(12);
    // action darkened: main is much darker than the raw yellow, and white text passes
    expect(hexToOklch(h.primaryLight.main).L).toBeLessThan(hexToOklch(BRANDS.yellow).L);
    expect(contrastRatio(h.primaryLight.main, '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('grey → isNeutralBrand, one accent introduced, primary stays monochrome', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const h = gen(BRANDS.grey);
    expect(h.isNeutralBrand).toBe(true);
    // primary ramp is (near) monochrome
    expect(hexToOklch(h.primaryLight.main).C).toBeLessThan(0.03);
    // exactly one injected accent with real chroma for interactive elements
    expect(hexToOklch(h.secondaryLight.main).C).toBeGreaterThan(0.05);
    // UI still usable: primary buttons legible with white text
    expect(contrastRatio(h.primaryLight.main, '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('neon → chroma clamped so large surfaces are not eye-searing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const h = gen(BRANDS.neon);
    const inputC = hexToOklch(BRANDS.neon).C;
    expect(inputC).toBeGreaterThan(0.24); // input really was neon

    // The clamp must ENGAGE, not merely be satisfiable: chromaBudget is strictly below the raw input.
    // (This fails if chromaMax is removed — chromaBudget would equal the input 0.255.)
    expect(h.chromaBudget).toBeLessThan(inputC);
    expect(h.chromaBudget).toBeLessThanOrEqual(0.16);

    // The clamp bites on a LARGE surface stop (c200), where the sRGB gamut is NOT already the limiter:
    // ~0.108 clamped vs ~0.173 unclamped. `main` is gamut-masked at this L, so it can't prove the clamp.
    const c200C = hexToOklch(h.primaryLight.c200).C;
    expect(c200C).toBeLessThanOrEqual(0.16);
    expect(c200C).toBeLessThan(inputC);
  });
});
