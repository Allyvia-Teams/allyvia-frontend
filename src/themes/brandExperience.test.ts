import { describe, expect, it } from 'vitest';
import { ThemeMode } from 'config';
import { BRAND_STYLES, DEFAULT_EXPERIENCE, applyBrandExperience, experienceSurfaces, parseBrandExperience } from './brandExperience';
import { contrastRatio, generateBrandPalette } from './brandPalette';
import { buildTheme } from './palette';
import { companyThemeToBrandTheme } from 'utils/brandThemeCache';

describe('Merchant visual identity', () => {
  it('preserves legacy themes exactly when experience is missing or a future version', () => {
    const base = buildTheme(ThemeMode.LIGHT, generateBrandPalette({ primary: '#234C3A', secondary: '#895C39', mode: 'light' }));
    expect(applyBrandExperience(base, null, 'content')).toBe(base);
    expect(parseBrandExperience({ version: 2 })).toBeUndefined();
    expect(applyBrandExperience(base, { primary: '#234C3A', secondary: '#895C39', headingFont: '' }, 'chrome')).toBe(base);
  });

  it('validates every persisted property instead of accepting arbitrary style overrides', () => {
    expect(
      parseBrandExperience({
        version: 1,
        canvas: 'url(https://invalid)',
        surface: '#fff',
        bodyFont: 'arbitrary',
        corners: -999,
        finish: '__proto__',
        density: 'huge',
        navStyle: 'script',
        headingStyle: 'foo'
      })
    ).toEqual(DEFAULT_EXPERIENCE);
  });

  it.each(BRAND_STYLES)('$name survives the actual company API response mapping', ({ brand }) => {
    const mapped = companyThemeToBrandTheme({
      primary_hex: brand.primary,
      secondary_hex: brand.secondary,
      heading_font: brand.headingFont,
      logo_url: null,
      custom_font_url: null,
      extracted_palette: [],
      overrides: { template: brand.template, experience: brand.experience },
      updated_at: ''
    });
    expect(mapped?.experience).toEqual(brand.experience);
    expect(mapped?.headingFont).toBe(brand.headingFont);
  });

  for (const style of BRAND_STYLES)
    for (const mode of [ThemeMode.LIGHT, ThemeMode.DARK])
      for (const zone of ['chrome', 'content'] as const) {
        it(`${style.name} / ${mode} / ${zone}: readable text, actual component styles and stable status semantics`, () => {
          const base = buildTheme(mode, generateBrandPalette({ primary: style.brand.primary, secondary: style.brand.secondary, mode }));
          const theme = applyBrandExperience(base, style.brand, zone);
          for (const ink of [theme.palette.text.primary, theme.palette.text.secondary]) {
            expect(contrastRatio(ink, theme.palette.background.default)).toBeGreaterThanOrEqual(4.5);
            expect(contrastRatio(ink, theme.palette.background.paper)).toBeGreaterThanOrEqual(4.5);
          }
          for (const status of ['error', 'success', 'warning', 'info'] as const)
            expect(theme.palette[status]).toEqual(base.palette[status]);
          expect(theme.typography.fontFamily).toContain(style.brand.experience.bodyFont);
          expect(theme.typography.h1.fontFamily).toBe(style.brand.headingFont);
          // A template is colour and type only (owner, 2026-09-12): the frame's radii, paddings,
          // heights and the ink primary button come from componentStyleOverrides and must survive
          // every style. `corners`, `density`, `buttonStyle` are stored for Brand Studio's preview
          // but never reach the working app's geometry.
          expect(theme.shape.borderRadius).toBe(base.shape.borderRadius);
          const button = theme.components?.MuiButton?.styleOverrides as
            | { root?: Record<string, unknown>; containedPrimary?: unknown }
            | undefined;
          expect(button?.root?.minHeight).toBeUndefined();
          expect(button?.root?.borderRadius).toBeUndefined();
          expect(button?.containedPrimary).toBeUndefined();
          const card = theme.components?.MuiCard?.styleOverrides as { root?: Record<string, unknown> } | undefined;
          expect(card?.root?.borderRadius).toBeUndefined();
          expect(theme.components?.MuiCardContent).toBeUndefined();
          expect(theme.components?.MuiPaper).toBeUndefined();
        });
      }

  it('corrects contradictory surface choices and mid-tone pairs to readable surfaces', () => {
    for (const canvas of ['#000000', '#FFFFFF', '#888888', '#FF00FF'])
      for (const surface of ['#FFFFFF', '#000000', '#777777', '#112244']) {
        const s = experienceSurfaces({ ...DEFAULT_EXPERIENCE, canvas, surface }, false);
        expect(contrastRatio(s.ink, s.canvas)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(s.ink, s.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(s.muted, s.surface)).toBeGreaterThanOrEqual(4.5);
      }
  });
});
