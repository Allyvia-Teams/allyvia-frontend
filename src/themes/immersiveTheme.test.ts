import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateBrandPalette } from './brandPalette';
import { AA_NORMAL, contrastRatio, hexToOklch } from './harmony';
import {
  buildImmersiveColors,
  buildImmersiveSurfaces,
  buildTemplateColors,
  buildTemplateSurfaces,
  DARK_BRAND_THRESHOLD,
  polarity,
  resolveZoneSurfaces,
  resolveZoneTheme,
  TEMPLATE_PRESETS,
  TemplateName
} from './immersiveTheme';

// A LIGHT brand (OKLCH L ~0.556 for the primary — see console.log in the harness that produced
// this: hexToOklch('#2f6fd4').L === 0.5558) — sits ABOVE DARK_BRAND_THRESHOLD, so soft/bold
// auto-reflect to LIGHT polarity for this brand.
const BRAND = { primary: '#2f6fd4', secondary: '#5f4cc0', headingFont: 'Playfair Display' };
// A second light brand (green, L ~0.755) used to prove the auto-reflect isn't blue-specific.
const LIGHT_BRAND_2 = { primary: '#7cc47c', secondary: '#5f4cc0', headingFont: 'Playfair Display' };
// A DARK brand (deep green, OKLCH L ~0.399 for the primary) — sits BELOW DARK_BRAND_THRESHOLD, so
// soft/bold auto-reflect to DARK polarity: brand-colored dark surfaces + near-white text.
const DARK_BRAND = { primary: '#18552a', secondary: '#5f4cc0', headingFont: 'Playfair Display' };

const HEX = /^#[0-9a-f]{6}$/;
const LIGHT_TEXT = '#374151';
const DARK_TEXT = '#bdc8f0';
const TEMPLATES: TemplateName[] = ['bright', 'soft', 'bold'];

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

// Chroma is asserted against `chromaMax` by parsing the returned HEX string back to OKLCH
// (there is no other public surface to measure it from). Round-tripping OKLCH -> 8-bit hex ->
// OKLCH is NOT lossless: quantizing to 256 levels/channel and re-expanding perturbs the
// reconstructed chroma by up to ~0.001-0.0011 whenever the true continuous value sits right at
// (not comfortably under, via gamut clipping) the requested ceiling. 2e-3 comfortably covers that
// noise without masking a real overshoot (a genuine preset/logic bug would blow past the ceiling
// by far more than this).
const CHROMA_QUANT_EPS = 2e-3;

// Hue is mathematically undefined at zero chroma (grey/white/black) — a template whose preset
// lightness is literal white (bright.paperL === 1.0, "white/airy" by design) legitimately produces
// an achromatic paper surface, so there is no hue to preserve there. Below this floor, skip the
// hue-preservation assertion instead of failing on meaningless noise.
const HUE_SIGNAL_FLOOR = 0.004;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildImmersiveSurfaces (legacy template="soft" wrapper)', () => {
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

describe('buildImmersiveColors (legacy template="soft" wrapper)', () => {
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

describe('buildImmersiveSurfaces/Colors are template="soft" wrappers', () => {
  // NB: for BRAND (a LIGHT brand, L~0.556 > DARK_BRAND_THRESHOLD) this equality holds regardless
  // of the redesign: buildImmersiveSurfaces passes `mode` straight through as polarity, and
  // buildImmersiveColors's internal `polarity()` resolution lands on the SAME value for this
  // brand — appMode='dark' always forces dark polarity (so the 'dark' case matches trivially),
  // and appMode='light' with a light brand auto-reflects to 'light' polarity too.
  it.each(['light', 'dark'] as const)('%s: buildImmersiveSurfaces === buildTemplateSurfaces(brand, mode, "soft")', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildImmersiveSurfaces(BRAND, mode)).toEqual(buildTemplateSurfaces(BRAND, mode, 'soft'));
  });

  it.each(['light', 'dark'] as const)('%s: buildImmersiveColors === buildTemplateColors(brand, mode, "soft")', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildImmersiveColors(BRAND, mode)).toEqual(buildTemplateColors(BRAND, mode, 'soft'));
  });
});

describe('polarity() — luminance-driven precedence', () => {
  it("appMode==='dark' always wins, even for 'bright' or a light brand", () => {
    expect(polarity('bright', 'dark', /* darkBrand */ false)).toBe('dark');
    expect(polarity('soft', 'dark', false)).toBe('dark');
    expect(polarity('bold', 'dark', true)).toBe('dark');
  });

  it("'bright' forces 'light' polarity whenever appMode isn't forcing dark, regardless of brand darkness", () => {
    expect(polarity('bright', 'light', true)).toBe('light');
    expect(polarity('bright', 'light', false)).toBe('light');
  });

  it('soft/bold auto-reflect the brand when appMode is light', () => {
    expect(polarity('soft', 'light', true)).toBe('dark');
    expect(polarity('bold', 'light', true)).toBe('dark');
    expect(polarity('soft', 'light', false)).toBe('light');
    expect(polarity('bold', 'light', false)).toBe('light');
  });

  it('DARK_BRAND_THRESHOLD is 0.5 and correctly classifies the fixture brands', () => {
    expect(DARK_BRAND_THRESHOLD).toBe(0.5);
    expect(hexToOklch(BRAND.primary).L).toBeGreaterThanOrEqual(DARK_BRAND_THRESHOLD);
    expect(hexToOklch(LIGHT_BRAND_2.primary).L).toBeGreaterThanOrEqual(DARK_BRAND_THRESHOLD);
    expect(hexToOklch(DARK_BRAND.primary).L).toBeLessThan(DARK_BRAND_THRESHOLD);
  });
});

describe('buildTemplateSurfaces — template engine', () => {
  it("light-polarity 'soft' preset reproduces today's exact target values; dark-polarity presets match the addendum", () => {
    expect(TEMPLATE_PRESETS.light).toEqual({
      bright: { bgL: 0.985, paperL: 1.0, bandL: 0.96, chromaMax: 0.03 },
      soft: { bgL: 0.94, paperL: 0.965, bandL: 0.9, chromaMax: 0.05 },
      bold: { bgL: 0.9, paperL: 0.94, bandL: 0.84, chromaMax: 0.07 }
    });
    expect(TEMPLATE_PRESETS.dark).toEqual({
      soft: { bgL: 0.3, paperL: 0.36, bandL: 0.26, chromaMax: 0.09 },
      bold: { bgL: 0.2, paperL: 0.26, bandL: 0.16, chromaMax: 0.12 }
    });
  });

  it.each(TEMPLATES)('template=%s returns null for null brand, malformed hex, and neutral brands', (template) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildTemplateSurfaces(null, 'light', template)).toBeNull();
    expect(buildTemplateSurfaces({ ...BRAND, primary: 'not-a-hex' }, 'light', template)).toBeNull();
    expect(buildTemplateSurfaces({ ...BRAND, primary: '#f7f7f7', secondary: '#eeeeee' }, 'light', template)).toBeNull();
  });

  describe('LIGHT polarity (light brand, BRAND)', () => {
    for (const template of TEMPLATES) {
      it(`template=${template}: surfaces non-null, AA-clean vs dark ink, hue preserved, chroma within budget`, () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const s = buildTemplateSurfaces(BRAND, 'light', template);
        expect(s).not.toBeNull();

        const preset = TEMPLATE_PRESETS.light[template];
        const brandHue = hexToOklch(BRAND.primary).H;

        for (const [name, hex] of [
          ['background', s!.background],
          ['paper', s!.paper]
        ] as const) {
          const ratio = contrastRatio(hex, LIGHT_TEXT);
          console.log(`[${template}/light] ${name} vs text ${LIGHT_TEXT}: ${ratio.toFixed(2)}:1`);
          expect(hex).toMatch(HEX);
          expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);

          const oklch = hexToOklch(hex);
          if (oklch.C >= HUE_SIGNAL_FLOOR) {
            expect(hueDistance(oklch.H, brandHue)).toBeLessThanOrEqual(8);
          } else {
            console.log(
              `[${template}/light] ${name} is effectively achromatic (C=${oklch.C.toFixed(5)}) — hue undefined, skipping hue check`
            );
          }
          expect(oklch.C).toBeLessThanOrEqual(preset.chromaMax + CHROMA_QUANT_EPS);
        }

        for (const [name, hex] of [
          ['headerBand[0]', s!.headerBand[0]],
          ['headerBand[1]', s!.headerBand[1]]
        ] as const) {
          const oklch = hexToOklch(hex);
          console.log(`[${template}/light] ${name} chroma: ${oklch.C.toFixed(4)} (max ${preset.chromaMax})`);
          expect(oklch.C).toBeLessThanOrEqual(preset.chromaMax + CHROMA_QUANT_EPS);
        }

        const inkRatio = contrastRatio(s!.headingInk, s!.background);
        console.log(`[${template}/light] headingInk vs background: ${inkRatio.toFixed(2)}:1`);
        expect(inkRatio).toBeGreaterThanOrEqual(AA_NORMAL);

        // LIGHT polarity: the background must actually stay light (this is the whole point — a
        // light-polarity surface must not have been dragged dark).
        const bgL = hexToOklch(s!.background).L;
        console.log(`[${template}/light] background L: ${bgL.toFixed(4)}`);
        expect(bgL).toBeGreaterThan(0.5);
      });
    }

    it('a second light brand (#7cc47c, L~0.755) also stays LIGHT polarity for soft/bold', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      for (const template of ['soft', 'bold'] as const) {
        const s = buildTemplateSurfaces(LIGHT_BRAND_2, 'light', template)!;
        const bgL = hexToOklch(s.background).L;
        const ratio = contrastRatio(s.background, LIGHT_TEXT);
        console.log(`[${template}/light/#7cc47c] background L=${bgL.toFixed(4)}, AA vs dark ink: ${ratio.toFixed(2)}:1`);
        expect(bgL).toBeGreaterThan(0.5);
        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    });
  });

  describe('DARK polarity (dark brand, DARK_BRAND = #18552a)', () => {
    for (const template of ['soft', 'bold'] as const) {
      it(`template=${template}: surfaces non-null, AA-clean vs near-white text, hue preserved, chroma within budget`, () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const s = buildTemplateSurfaces(DARK_BRAND, 'dark', template);
        expect(s).not.toBeNull();

        const preset = TEMPLATE_PRESETS.dark[template];
        const brandHue = hexToOklch(DARK_BRAND.primary).H;

        for (const [name, hex] of [
          ['background', s!.background],
          ['paper', s!.paper]
        ] as const) {
          const ratio = contrastRatio(hex, DARK_TEXT);
          console.log(`[${template}/dark] ${name} vs text ${DARK_TEXT}: ${ratio.toFixed(2)}:1`);
          expect(hex).toMatch(HEX);
          expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);

          const oklch = hexToOklch(hex);
          if (oklch.C >= HUE_SIGNAL_FLOOR) {
            expect(hueDistance(oklch.H, brandHue)).toBeLessThanOrEqual(8);
          } else {
            console.log(
              `[${template}/dark] ${name} is effectively achromatic (C=${oklch.C.toFixed(5)}) — hue undefined, skipping hue check`
            );
          }
          expect(oklch.C).toBeLessThanOrEqual(preset.chromaMax + CHROMA_QUANT_EPS);
        }

        const inkRatio = contrastRatio(s!.headingInk, s!.background);
        console.log(`[${template}/dark] headingInk vs background: ${inkRatio.toFixed(2)}:1`);
        expect(inkRatio).toBeGreaterThanOrEqual(AA_NORMAL);

        // DARK polarity: the background must actually STAY dark — this is the bug being fixed
        // (previously a dark brand's surface was AA-corrected against DARK ink and got dragged
        // light, i.e. "pale mint"). L < 0.35 and meaningfully chromatic (not a desaturated wash).
        const bg = hexToOklch(s!.background);
        console.log(`[${template}/dark] background L=${bg.L.toFixed(4)}, C=${bg.C.toFixed(4)} (reads as the brand, not a wash)`);
        expect(bg.L).toBeLessThan(0.35);
        expect(bg.C).toBeGreaterThan(0.04);
      });
    }
  });

  it('TEMPLATE SEPARATION (light polarity, BRAND): bold.background L < soft.background L < bright.background L', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bold = hexToOklch(buildTemplateSurfaces(BRAND, 'light', 'bold')!.background).L;
    const soft = hexToOklch(buildTemplateSurfaces(BRAND, 'light', 'soft')!.background).L;
    const bright = hexToOklch(buildTemplateSurfaces(BRAND, 'light', 'bright')!.background).L;
    console.log(
      `template separation (light background L): bold=${bold.toFixed(4)} < soft=${soft.toFixed(4)} < bright=${bright.toFixed(4)}`
    );
    expect(bold).toBeLessThan(soft);
    expect(soft).toBeLessThan(bright);
  });

  it('TEMPLATE SEPARATION (dark polarity, DARK_BRAND): bold.background L < soft.background L', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bold = hexToOklch(buildTemplateSurfaces(DARK_BRAND, 'dark', 'bold')!.background).L;
    const soft = hexToOklch(buildTemplateSurfaces(DARK_BRAND, 'dark', 'soft')!.background).L;
    console.log(`template separation (dark background L): bold=${bold.toFixed(4)} < soft=${soft.toFixed(4)}`);
    expect(bold).toBeLessThan(soft);
  });
});

describe('buildTemplateColors — template engine', () => {
  it.each(TEMPLATES)('template=%s returns null whenever the brand is null/malformed/neutral', (template) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildTemplateColors(null, 'light', template)).toBeNull();
    expect(buildTemplateColors({ ...BRAND, primary: 'not-a-hex' }, 'light', template)).toBeNull();
  });

  it.each(TEMPLATES)('template=%s: light-effective-mode re-points paper/grey50 (BRAND, appMode=light)', (template) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sLight = buildTemplateSurfaces(BRAND, 'light', template)!;
    const cLight = buildTemplateColors(BRAND, 'light', template)!;
    expect(cLight.paper).toBe(sLight.paper);
    expect(cLight.grey50).toBe(sLight.background);
  });

  it.each(['soft', 'bold'] as const)(
    'template=%s: dark-effective-mode re-points darkPaper/darkBackground/darkLevel1/2 (DARK_BRAND, appMode=light — auto-reflected)',
    (template) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const sDark = buildTemplateSurfaces(DARK_BRAND, 'dark', template)!;
      const cDark = buildTemplateColors(DARK_BRAND, 'light', template)!;
      expect(cDark.darkPaper).toBe(sDark.background);
      expect(cDark.darkBackground).toBe(sDark.background);
      expect(cDark.darkLevel1).toBe(sDark.paper);
      expect(cDark.darkLevel2).toBe(sDark.paper);
    }
  );
});

describe('resolveZoneTheme — new public API ({colors, mode})', () => {
  it('DARK brand, appMode=light: effectiveMode is "dark" for soft/bold, "light" for bright', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const template of ['soft', 'bold'] as const) {
      const zt = resolveZoneTheme(DARK_BRAND, 'light', { self: 'inner-circle', brandedZone: 'inner-circle', template });
      console.log(`resolveZoneTheme(DARK_BRAND, light, ${template}).mode = ${zt?.mode}`);
      expect(zt).not.toBeNull();
      expect(zt!.mode).toBe('dark');
    }
    const ztBright = resolveZoneTheme(DARK_BRAND, 'light', { self: 'inner-circle', brandedZone: 'inner-circle', template: 'bright' });
    console.log(`resolveZoneTheme(DARK_BRAND, light, bright).mode = ${ztBright?.mode}`);
    expect(ztBright).not.toBeNull();
    expect(ztBright!.mode).toBe('light');
  });

  it('LIGHT brand (BRAND), appMode=light: effectiveMode stays "light" for every template', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const template of TEMPLATES) {
      const zt = resolveZoneTheme(BRAND, 'light', { self: 'inner-circle', brandedZone: 'inner-circle', template });
      expect(zt).not.toBeNull();
      expect(zt!.mode).toBe('light');
    }
  });

  it("appMode=dark forces mode='dark' regardless of brand darkness or template (even 'bright')", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const template of TEMPLATES) {
      const zt = resolveZoneTheme(BRAND, 'dark', { self: 'inner-circle', brandedZone: 'inner-circle', template });
      expect(zt).not.toBeNull();
      expect(zt!.mode).toBe('dark');
    }
  });

  it.each(['light', 'dark'] as const)('%s: branded zone colors deep-equal buildTemplateColors(brand, appMode, template)', (appMode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expected = buildTemplateColors(DARK_BRAND, appMode, 'bold');
    const actual = resolveZoneTheme(DARK_BRAND, appMode, { self: 'inner-circle', brandedZone: 'inner-circle', template: 'bold' });
    expect(actual?.colors).toEqual(expected);
  });

  it.each(['light', 'dark'] as const)(
    '%s: non-branded zone returns {colors: neutral base, mode: appMode} (no template re-point)',
    (appMode) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const expectedColors = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: appMode });
      const actual = resolveZoneTheme(BRAND, appMode, { self: 'main-app', brandedZone: 'inner-circle', template: 'bold' });
      expect(actual).toEqual({ colors: expectedColors, mode: appMode });
    }
  );

  it('returns null for a null brand', () => {
    expect(resolveZoneTheme(null, 'light', { self: 'inner-circle', brandedZone: 'inner-circle', template: 'soft' })).toBeNull();
    expect(resolveZoneTheme(null, 'light', { self: 'main-app', brandedZone: 'inner-circle', template: 'soft' })).toBeNull();
  });

  it('returns null for a malformed/neutral brand even in the branded zone', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      resolveZoneTheme({ ...BRAND, primary: 'not-a-hex' }, 'light', {
        self: 'inner-circle',
        brandedZone: 'inner-circle',
        template: 'soft'
      })
    ).toBeNull();
    expect(
      resolveZoneTheme({ ...BRAND, primary: '#f7f7f7', secondary: '#eeeeee' }, 'light', {
        self: 'inner-circle',
        brandedZone: 'inner-circle',
        template: 'soft'
      })
    ).toBeNull();
  });
});

describe('resolveZoneSurfaces — compat shim over resolveZoneTheme', () => {
  it.each(['light', 'dark'] as const)('%s: self === brandedZone deep-equals resolveZoneTheme(...)?.colors', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expected = resolveZoneTheme(BRAND, mode, { self: 'inner-circle', brandedZone: 'inner-circle', template: 'bold' })?.colors;
    const actual = resolveZoneSurfaces(BRAND, mode, { self: 'inner-circle', brandedZone: 'inner-circle', template: 'bold' });
    expect(actual).toEqual(expected);
    expect(actual).toEqual(buildTemplateColors(BRAND, mode, 'bold'));
  });

  it.each(['light', 'dark'] as const)('%s: self === brandedZone (main-app) deep-equals buildTemplateColors(...)', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expected = buildTemplateColors(BRAND, mode, 'bright');
    const actual = resolveZoneSurfaces(BRAND, mode, { self: 'main-app', brandedZone: 'main-app', template: 'bright' });
    expect(actual).toEqual(expected);
  });

  it.each(['light', 'dark'] as const)(
    '%s: non-branded zone deep-equals the neutral generateBrandPalette base (no template re-point)',
    (mode) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const expected = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode });
      const actual = resolveZoneSurfaces(BRAND, mode, { self: 'main-app', brandedZone: 'inner-circle', template: 'bold' });
      expect(actual).toEqual(expected);
    }
  );

  it('returns null for a null brand', () => {
    expect(resolveZoneSurfaces(null, 'light', { self: 'inner-circle', brandedZone: 'inner-circle', template: 'soft' })).toBeNull();
    expect(resolveZoneSurfaces(null, 'light', { self: 'main-app', brandedZone: 'inner-circle', template: 'soft' })).toBeNull();
  });

  it('returns null for a malformed/neutral brand even in the branded zone', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      resolveZoneSurfaces({ ...BRAND, primary: 'not-a-hex' }, 'light', {
        self: 'inner-circle',
        brandedZone: 'inner-circle',
        template: 'soft'
      })
    ).toBeNull();
  });
});
