import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateBrandPalette } from './brandPalette';
import { AA_NORMAL, contrastRatio, hexToOklch } from './harmony';
import {
  buildTreatmentColors,
  cardOverrides,
  resolveChromeTheme,
  resolveContentTheme,
  TEMPLATE_SPECS,
  TemplateName
} from './immersiveTheme';

// A real, chromatic brand (deep green primary + dark-goldenrod secondary) — well clear of the
// neutral-brand threshold, so every treatment resolves.
const BRAND = { primary: '#18552a', secondary: '#b8860b', headingFont: 'Playfair Display' };
// A second, even darker brand (deep teal) — used to prove dark treatments read as themselves.
const DARK_BRAND = { primary: '#07302c', secondary: '#b8860b', headingFont: 'Playfair Display' };

const LIGHT_TEXT = '#374151'; // grey700 — dark ink the light treatments must stay legible against
const DARK_TEXT = '#bdc8f0'; // near-white the dark treatment must stay legible against

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TEMPLATE_SPECS', () => {
  it('has the 6 expected templates, each a treatment per layer', () => {
    expect(TEMPLATE_SPECS).toEqual({
      clean: { chrome: 'neutral', canvas: 'neutral', card: 'neutral' },
      tinted: { chrome: 'neutral', canvas: 'tinted', card: 'tinted' },
      sidebar: { chrome: 'dark', canvas: 'neutral', card: 'neutral' },
      widgets: { chrome: 'neutral', canvas: 'neutral', card: 'accented' },
      immersive: { chrome: 'tinted', canvas: 'tinted', card: 'tinted' },
      bold: { chrome: 'dark', canvas: 'dark', card: 'dark' }
    });
  });
});

describe('buildTreatmentColors', () => {
  it.each(['light', 'dark'] as const)('neutral: mode === appMode (%s) and colors deep-equal generateBrandPalette(appMode)', (appMode) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = buildTreatmentColors(BRAND, 'neutral', appMode);
    expect(result).not.toBeNull();
    expect(result!.mode).toBe(appMode);
    expect(result!.colors).toEqual(generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: appMode }));
  });

  it("tinted: mode 'light', grey50 & paper re-pointed off the light base", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: 'light' });
    const result = buildTreatmentColors(BRAND, 'tinted', 'light');
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('light');
    expect(result!.colors.grey50).not.toBe(base.grey50);
    expect(result!.colors.paper).not.toBe(base.paper);
  });

  it("dark: mode 'dark', dark* surface tokens re-pointed off the dark base", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: 'dark' });
    const result = buildTreatmentColors(BRAND, 'dark', 'light');
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('dark');
    expect(result!.colors.darkBackground).not.toBe(base.darkBackground);
    expect(result!.colors.darkPaper).not.toBe(base.darkPaper);
    expect(result!.colors.darkLevel1).not.toBe(base.darkLevel1);
    expect(result!.colors.darkLevel2).not.toBe(base.darkLevel2);
    // darkBackground/darkPaper share the canvas hex; darkLevel1/2 share the card hex.
    expect(result!.colors.darkBackground).toBe(result!.colors.darkPaper);
    expect(result!.colors.darkLevel1).toBe(result!.colors.darkLevel2);
  });

  it("accented is treated as 'neutral' for colors", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildTreatmentColors(BRAND, 'accented', 'light')).toEqual(buildTreatmentColors(BRAND, 'neutral', 'light'));
  });

  it('returns null for null / malformed / neutral brands', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildTreatmentColors(null, 'tinted', 'light')).toBeNull();
    expect(buildTreatmentColors({ ...BRAND, primary: 'not-a-hex' }, 'tinted', 'light')).toBeNull();
    expect(buildTreatmentColors({ ...BRAND, primary: '#f7f7f7', secondary: '#eeeeee' }, 'tinted', 'light')).toBeNull();
    // dark treatment fails the same way
    expect(buildTreatmentColors({ ...BRAND, primary: '#f7f7f7', secondary: '#eeeeee' }, 'dark', 'light')).toBeNull();
  });
});

describe('resolveChromeTheme', () => {
  it('clean, tinted & widgets have neutral chrome → null (chrome stays on the ambient theme)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveChromeTheme(BRAND, 'light', 'clean')).toBeNull();
    expect(resolveChromeTheme(BRAND, 'light', 'tinted')).toBeNull();
    expect(resolveChromeTheme(BRAND, 'light', 'widgets')).toBeNull();
  });

  it("immersive has tinted chrome → mode 'light'", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveChromeTheme(BRAND, 'light', 'immersive');
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('light');
  });

  it("sidebar & bold have dark chrome → mode 'dark'", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const template of ['sidebar', 'bold'] as const) {
      const result = resolveChromeTheme(BRAND, 'light', template);
      expect(result).not.toBeNull();
      expect(result!.mode).toBe('dark');
    }
  });

  it('null-safe for null/malformed/neutral brand on a themed-chrome template', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveChromeTheme(null, 'light', 'immersive')).toBeNull();
    expect(resolveChromeTheme({ ...BRAND, primary: 'not-a-hex' }, 'light', 'bold')).toBeNull();
  });
});

describe('resolveContentTheme', () => {
  it('clean & sidebar have fully-neutral content → null', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveContentTheme(BRAND, 'light', 'clean')).toBeNull();
    expect(resolveContentTheme(BRAND, 'light', 'sidebar')).toBeNull();
  });

  it("widgets → non-null, cardAccented true, mode 'light', neutral surfaces (grey50 == base grey50)", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: 'light' });
    const result = resolveContentTheme(BRAND, 'light', 'widgets');
    expect(result).not.toBeNull();
    expect(result!.cardAccented).toBe(true);
    expect(result!.mode).toBe('light');
    expect(result!.colors.grey50).toBe(base.grey50);
    expect(result!.colors.paper).toBe(base.paper);
  });

  it("tinted → mode 'light', grey50 AND paper re-pointed (content washes), cardAccented false", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: 'light' });
    const result = resolveContentTheme(BRAND, 'light', 'tinted');
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('light');
    expect(result!.cardAccented).toBe(false);
    expect(result!.colors.grey50).not.toBe(base.grey50);
    // paper is the load-bearing token (MainContentStyled + cards both read background.paper); it
    // MUST be re-pointed for the tinted wash to actually render, not left at the white base.
    expect(result!.colors.paper).not.toBe(base.paper);
  });

  it("immersive → mode 'light', both grey50 and paper re-pointed, cardAccented false", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: 'light' });
    const result = resolveContentTheme(BRAND, 'light', 'immersive');
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('light');
    expect(result!.cardAccented).toBe(false);
    expect(result!.colors.grey50).not.toBe(base.grey50);
    expect(result!.colors.paper).not.toBe(base.paper);
  });

  it("bold → mode 'dark', dark* re-pointed, cardAccented false", () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = generateBrandPalette({ primary: BRAND.primary, secondary: BRAND.secondary, mode: 'dark' });
    const result = resolveContentTheme(BRAND, 'light', 'bold');
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('dark');
    expect(result!.cardAccented).toBe(false);
    expect(result!.colors.darkBackground).not.toBe(base.darkBackground);
    expect(result!.colors.darkLevel1).not.toBe(base.darkLevel1);
  });

  it('null-safe for null/malformed/neutral brand', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveContentTheme(null, 'light', 'immersive')).toBeNull();
    expect(resolveContentTheme({ ...BRAND, primary: 'not-a-hex' }, 'light', 'immersive')).toBeNull();
    expect(resolveContentTheme({ ...BRAND, primary: '#f7f7f7', secondary: '#eeeeee' }, 'light', 'bold')).toBeNull();
  });
});

describe('AA legibility of the branded surfaces', () => {
  it('tinted content: grey50 AND paper clear AA vs dark ink and stay light', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveContentTheme(BRAND, 'light', 'tinted')!;
    expect(contrastRatio(result.colors.grey50, LIGHT_TEXT)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(result.colors.paper, LIGHT_TEXT)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(hexToOklch(result.colors.paper).L).toBeGreaterThan(0.5);
  });

  it('immersive content: grey50 AND paper clear AA vs dark ink', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveContentTheme(BRAND, 'light', 'immersive')!;
    expect(contrastRatio(result.colors.grey50, LIGHT_TEXT)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(result.colors.paper, LIGHT_TEXT)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('bold content: darkBackground AND darkLevel1 clear AA vs near-white text and stay dark', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveContentTheme(DARK_BRAND, 'light', 'bold')!;
    expect(contrastRatio(result.colors.darkBackground, DARK_TEXT)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(result.colors.darkLevel1, DARK_TEXT)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(hexToOklch(result.colors.darkBackground).L).toBeLessThan(0.35);
  });
});

describe('cardOverrides', () => {
  it('returns a non-empty MUI components fragment for the widgets accent', () => {
    const overrides = cardOverrides('#18552a');
    expect(overrides).toBeTruthy();
    expect(Object.keys(overrides).length).toBeGreaterThan(0);
    expect(JSON.stringify(overrides)).toContain('#18552a');
  });
});

// Type-level smoke: TemplateName covers exactly the six template keys (compile-time guard).
const ALL_TEMPLATES: TemplateName[] = ['clean', 'tinted', 'sidebar', 'widgets', 'immersive', 'bold'];
describe('TemplateName union', () => {
  it('enumerates the six templates present in TEMPLATE_SPECS', () => {
    expect(ALL_TEMPLATES.every((t) => t in TEMPLATE_SPECS)).toBe(true);
    expect(Object.keys(TEMPLATE_SPECS).sort()).toEqual([...ALL_TEMPLATES].sort());
  });
});
