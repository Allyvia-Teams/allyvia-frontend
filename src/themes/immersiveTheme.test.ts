import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateBrandPalette } from './brandPalette';
import { AA_NORMAL, contrastRatio, hexToOklch } from './harmony';
import {
  buildImmersiveColors,
  buildImmersiveSurfaces,
  buildTemplateColors,
  buildTemplateSurfaces,
  resolveZoneSurfaces,
  TEMPLATE_PRESETS,
  TemplateName
} from './immersiveTheme';

const BRAND = { primary: '#2f6fd4', secondary: '#5f4cc0', headingFont: 'Playfair Display' };
const HEX = /^#[0-9a-f]{6}$/;
const LIGHT_TEXT = '#374151';
const DARK_TEXT = '#bdc8f0';
const TEMPLATES: TemplateName[] = ['bright', 'soft', 'bold'];

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

// Chroma is asserted against `chromaMax` by parsing the returned HEX string back to OKLCH
// (there is no other public surface to measure it from). Round-tripping OKLCH -> 8-bit hex ->
// OKLCH is NOT lossless: quantizing to 256 levels/channel and re-expanding perturbs the
// reconstructed chroma by up to ~0.001-0.0011 whenever the true continuous value sits right at
// (not comfortably under, via gamut clipping) the requested ceiling — measured empirically across
// all 3 templates x 2 modes (deltas: bright/dark bg +0.00079, soft/light band +0.00046,
// soft/dark bg +0.00004). 2e-3 comfortably covers that noise without masking a real overshoot
// (a genuine preset/logic bug would blow past the ceiling by far more than this).
const CHROMA_QUANT_EPS = 2e-3;

// Hue is mathematically undefined at zero chroma (grey/white/black) — a template whose preset
// lightness is literal white (bright.paperL.light === 1.0, "white/airy" by design) legitimately
// produces an achromatic paper surface, so there is no hue to preserve there. Below this floor,
// skip the hue-preservation assertion instead of failing on meaningless noise.
const HUE_SIGNAL_FLOOR = 0.004;

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

describe('buildImmersiveSurfaces/Colors are template="soft" wrappers', () => {
  it.each(['light', 'dark'] as const)('%s: buildImmersiveSurfaces === buildTemplateSurfaces(brand, mode, "soft")', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildImmersiveSurfaces(BRAND, mode)).toEqual(buildTemplateSurfaces(BRAND, mode, 'soft'));
  });

  it.each(['light', 'dark'] as const)('%s: buildImmersiveColors === buildTemplateColors(brand, mode, "soft")', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildImmersiveColors(BRAND, mode)).toEqual(buildTemplateColors(BRAND, mode, 'soft'));
  });
});

describe('buildTemplateSurfaces — template engine', () => {
  it("'soft' preset reproduces today's exact target values", () => {
    expect(TEMPLATE_PRESETS.soft).toEqual({
      bgL: { light: 0.94, dark: 0.16 },
      paperL: { light: 0.965, dark: 0.2 },
      bandL: { light: 0.9, dark: 0.19 },
      chromaMax: 0.05
    });
  });

  it.each(TEMPLATES)('template=%s returns null for null brand, malformed hex, and neutral brands', (template) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildTemplateSurfaces(null, 'light', template)).toBeNull();
    expect(buildTemplateSurfaces({ ...BRAND, primary: 'not-a-hex' }, 'light', template)).toBeNull();
    expect(buildTemplateSurfaces({ ...BRAND, primary: '#f7f7f7', secondary: '#eeeeee' }, 'light', template)).toBeNull();
  });

  for (const template of TEMPLATES) {
    for (const mode of ['light', 'dark'] as const) {
      it(`template=${template} mode=${mode}: surfaces non-null, AA-clean, hue preserved, chroma within budget`, () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const s = buildTemplateSurfaces(BRAND, mode, template);
        expect(s).not.toBeNull();

        const text = mode === 'light' ? LIGHT_TEXT : DARK_TEXT;
        const preset = TEMPLATE_PRESETS[template];
        const brandHue = hexToOklch(BRAND.primary).H;

        for (const [name, hex] of [
          ['background', s!.background],
          ['paper', s!.paper]
        ] as const) {
          const ratio = contrastRatio(hex, text);
          console.log(`[${template}/${mode}] ${name} vs text ${text}: ${ratio.toFixed(2)}:1`);
          expect(hex).toMatch(HEX);
          expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);

          const oklch = hexToOklch(hex);
          if (oklch.C >= HUE_SIGNAL_FLOOR) {
            expect(hueDistance(oklch.H, brandHue)).toBeLessThanOrEqual(8);
          } else {
            console.log(`[${template}/${mode}] ${name} is effectively achromatic (C=${oklch.C.toFixed(5)}) — hue undefined, skipping hue check`);
          }
          expect(oklch.C).toBeLessThanOrEqual(preset.chromaMax + CHROMA_QUANT_EPS);
        }

        for (const [name, hex] of [
          ['headerBand[0]', s!.headerBand[0]],
          ['headerBand[1]', s!.headerBand[1]]
        ] as const) {
          const oklch = hexToOklch(hex);
          console.log(`[${template}/${mode}] ${name} chroma: ${oklch.C.toFixed(4)} (max ${preset.chromaMax})`);
          expect(oklch.C).toBeLessThanOrEqual(preset.chromaMax + CHROMA_QUANT_EPS);
        }

        const inkRatio = contrastRatio(s!.headingInk, s!.background);
        console.log(`[${template}/${mode}] headingInk vs background: ${inkRatio.toFixed(2)}:1`);
        expect(inkRatio).toBeGreaterThanOrEqual(AA_NORMAL);
      });
    }
  }

  it('TEMPLATE SEPARATION (light mode): bold.background L < soft.background L < bright.background L', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bold = hexToOklch(buildTemplateSurfaces(BRAND, 'light', 'bold')!.background).L;
    const soft = hexToOklch(buildTemplateSurfaces(BRAND, 'light', 'soft')!.background).L;
    const bright = hexToOklch(buildTemplateSurfaces(BRAND, 'light', 'bright')!.background).L;
    console.log(`template separation (light background L): bold=${bold.toFixed(4)} < soft=${soft.toFixed(4)} < bright=${bright.toFixed(4)}`);
    expect(bold).toBeLessThan(soft);
    expect(soft).toBeLessThan(bright);
  });
});

describe('buildTemplateColors — template engine', () => {
  it.each(TEMPLATES)('template=%s returns null whenever surfaces are null', (template) => {
    expect(buildTemplateColors(null, 'light', template)).toBeNull();
  });

  it.each(TEMPLATES)('template=%s: light re-points paper/grey50, dark re-points darkPaper/darkBackground/darkLevel1/2', (template) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sLight = buildTemplateSurfaces(BRAND, 'light', template)!;
    const cLight = buildTemplateColors(BRAND, 'light', template)!;
    expect(cLight.paper).toBe(sLight.paper);
    expect(cLight.grey50).toBe(sLight.background);

    const sDark = buildTemplateSurfaces(BRAND, 'dark', template)!;
    const cDark = buildTemplateColors(BRAND, 'dark', template)!;
    expect(cDark.darkPaper).toBe(sDark.background);
    expect(cDark.darkBackground).toBe(sDark.background);
    expect(cDark.darkLevel1).toBe(sDark.paper);
    expect(cDark.darkLevel2).toBe(sDark.paper);
  });
});

describe('resolveZoneSurfaces', () => {
  it.each(['light', 'dark'] as const)('%s: self === brandedZone deep-equals buildTemplateColors(...)', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expected = buildTemplateColors(BRAND, mode, 'bold');
    const actual = resolveZoneSurfaces(BRAND, mode, { self: 'inner-circle', brandedZone: 'inner-circle', template: 'bold' });
    expect(actual).toEqual(expected);
  });

  it.each(['light', 'dark'] as const)('%s: self === brandedZone (main-app) deep-equals buildTemplateColors(...)', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expected = buildTemplateColors(BRAND, mode, 'bright');
    const actual = resolveZoneSurfaces(BRAND, mode, { self: 'main-app', brandedZone: 'main-app', template: 'bright' });
    expect(actual).toEqual(expected);
  });

  it.each(['light', 'dark'] as const)('%s: non-branded zone deep-equals the neutral generateBrandPalette base (no template re-point)', (mode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expected = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode });
    const actual = resolveZoneSurfaces(BRAND, mode, { self: 'main-app', brandedZone: 'inner-circle', template: 'bold' });
    expect(actual).toEqual(expected);
  });

  it('returns null for a null brand', () => {
    expect(resolveZoneSurfaces(null, 'light', { self: 'inner-circle', brandedZone: 'inner-circle', template: 'soft' })).toBeNull();
    expect(resolveZoneSurfaces(null, 'light', { self: 'main-app', brandedZone: 'inner-circle', template: 'soft' })).toBeNull();
  });

  it('returns null for a malformed/neutral brand even in the branded zone', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      resolveZoneSurfaces({ ...BRAND, primary: 'not-a-hex' }, 'light', { self: 'inner-circle', brandedZone: 'inner-circle', template: 'soft' })
    ).toBeNull();
  });
});
