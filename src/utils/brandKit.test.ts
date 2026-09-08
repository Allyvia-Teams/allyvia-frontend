import { describe, expect, it } from 'vitest';
import { BRAND_STYLES } from 'themes/brandExperience';
import { parseBrandKit, tailorBrand, BrandAnalysis } from './brandKit';
import { chooseElementLook, ELEMENT_LOOKS } from 'ui-component/settings/ElementLooks';
import { companyThemeToBrandTheme } from './brandThemeCache';

const analysis: BrandAnalysis = {
  colors: ['#123456', '#F5EFE1'],
  primary: '#123456',
  fonts: ['Manrope'],
  website: 'https://example.com',
  method: 'extracted',
  warnings: [],
  interpretation: null
};
describe('brand kit tailoring', () => {
  it('tailors colors and supported fonts while preserving the selected layout and element choices', () => {
    const brand = chooseElementLook(BRAND_STYLES[0].brand, 'buttonStyle', 'outline');
    const tailored = tailorBrand(brand, analysis, []);
    expect(tailored.primary).toBe('#123456');
    expect(tailored.headingFont).toBe('Manrope');
    expect(tailored.template).toBe(brand.template);
    expect(tailored.experience?.corners).toBe(0);
    expect(tailored.experience?.buttonStyle).toBe('outline');
    expect(tailored.experience?.navStyle).toBe('line');
    expect(tailored.brandKit?.website).toBe(analysis.website);
    expect(brand.brandKit).toBeUndefined();
  });
  it('deduplicates color casing and removes a deleted uploaded logo while retaining hosted logos', () => {
    const logo = 'data:image/png;base64,aGVsbG8=';
    const brand = { ...BRAND_STYLES[0].brand, logoUrl: logo };
    const result = tailorBrand(brand, { ...analysis, primary: '#abcdef', colors: ['#abcdef', '#ABCDEF', '#123456'] }, []);
    expect(result.brandKit?.colors).toEqual(['#ABCDEF', '#123456']);
    expect(result.secondary).toBe('#123456');
    expect(result.logoUrl).toBeNull();
    expect(tailorBrand({ ...brand, logoUrl: 'https://example.com/logo.png' }, analysis, []).logoUrl).toBe('https://example.com/logo.png');
  });
  it('keeps an explicit black brand color even when colorful references exist', () => {
    expect(tailorBrand(BRAND_STYLES[0].brand, { ...analysis, primary: '#000000', colors: ['#000000', '#EE1155'] }, []).primary).toBe(
      '#000000'
    );
  });
  it('retains licensed custom typography and handles empty evidence without crashing', () => {
    const brand = { ...BRAND_STYLES[1].brand, headingFont: 'Merchant font', customFontUrl: 'https://example.com/brand.woff2' };
    const result = tailorBrand(brand, { ...analysis, colors: [], fonts: [], primary: undefined }, []);
    expect(result.headingFont).toBe('Merchant font');
    expect(result.primary).toBe(brand.primary);
  });
  it('rejects SVG, remote resources and unsupported kit versions from persisted overrides', () => {
    expect(parseBrandKit({ version: 2 })).toBeUndefined();
    expect(
      parseBrandKit({
        version: 1,
        logo: 'data:image/svg+xml,<svg/>',
        sources: [{ kind: 'logo', name: 'x', thumbnail: 'https://example.com/tracker' }]
      })?.logo
    ).toBeUndefined();
    expect(parseBrandKit({ version: 1, colors: ['red', '#123456'], sources: [] })?.colors).toEqual(['#123456']);
  });
  it('round-trips portable logo and references through the company theme contract', () => {
    const logo = 'data:image/png;base64,aGVsbG8=';
    const kit = {
      version: 1 as const,
      logo,
      website: analysis.website,
      colors: analysis.colors,
      fonts: [],
      character: 'Editorial',
      sources: [{ name: 'Logo', kind: 'logo' as const, thumbnail: logo }]
    };
    const mapped = companyThemeToBrandTheme({
      primary_hex: '#123456',
      secondary_hex: '#654321',
      heading_font: '',
      logo_url: null,
      custom_font_url: null,
      extracted_palette: [],
      overrides: { brandKit: kit },
      updated_at: ''
    });
    expect(mapped?.brandKit).toEqual(kit);
    expect(mapped?.logoUrl).toBe(logo);
  });
  it('keeps brand identity when changing any individual element', () => {
    const brand = tailorBrand(BRAND_STYLES[0].brand, analysis, []);
    for (const group of ELEMENT_LOOKS)
      for (const option of group.options) {
        const next = chooseElementLook(brand, group.key, option.value);
        expect(next.primary).toBe(brand.primary);
        expect(next.headingFont).toBe(brand.headingFont);
        expect(next.brandKit).toBe(brand.brandKit);
        expect(next.experience?.[group.key]).toBe(option.value);
      }
    expect(chooseElementLook(brand, 'canvas', 'javascript:bad')).toBe(brand);
  });
});
