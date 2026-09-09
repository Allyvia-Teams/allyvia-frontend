import { describe, expect, it } from 'vitest';
import { parseBrandIdentity } from './brandIdentity';
import { companyThemeToBrandTheme } from './brandThemeCache';
describe('merchant identity', () => {
  it('bounds uploaded-logo framing and ignores unsafe colors and invalid layouts', () => {
    const value = parseBrandIdentity({
      layout: 'script',
      size: 500,
      zoom: Infinity,
      padding: -5,
      radius: 100,
      background: 'url(https://example.com)',
      name: 'x'.repeat(200)
    });
    expect(value).toMatchObject({ layout: 'logo', size: 48, zoom: 1, padding: 0, radius: 24, background: 'transparent' });
    expect(value.name).toHaveLength(60);
  });
  it('round-trips the editable identity independently of the image', () => {
    const identity = parseBrandIdentity({ layout: 'wordmark', name: 'Maison', tagline: 'Since 1989', size: 40 });
    const brand = companyThemeToBrandTheme({
      primary_hex: '#234C3A',
      secondary_hex: '#AE9270',
      heading_font: '',
      logo_url: null,
      custom_font_url: null,
      extracted_palette: [],
      overrides: { identity },
      updated_at: ''
    });
    expect(brand?.identity).toEqual(identity);
    expect(brand?.logoUrl).toBeNull();
  });
});
