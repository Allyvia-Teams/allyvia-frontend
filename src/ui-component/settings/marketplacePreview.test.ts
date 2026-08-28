import { describe, expect, it } from 'vitest';

import type { CompanyThemeResponse } from 'api/branding';

import { buildMarketplacePreview, isSilentlyInvisible, marketplaceVisibility, MARKETPLACE_PRIVACY_NOTICE } from './marketplacePreview';

const theme = (over: Partial<CompanyThemeResponse> = {}): CompanyThemeResponse => ({
  primary_hex: '#112233',
  secondary_hex: '#AABBCC',
  heading_font: 'Playfair Display',
  logo_url: 'https://example.test/logo.png',
  custom_font_url: null,
  extracted_palette: [],
  overrides: {},
  updated_at: '2026-01-01T00:00:00Z',
  ...over
});

const company = {
  name: 'Merths',
  city: 'Austin',
  state: 'TX',
  country: 'US',
  website: 'https://merths.test',
  industry: 'Fashion'
};

describe('marketplaceVisibility', () => {
  it('names the silent failure: listed, but no brand saved', () => {
    // THE bug this screen exists to prevent. The consumer directory filters
    // marketplace_listed AND theme__isnull=False, so a merchant can opt in,
    // see it save, and never appear — with nothing anywhere saying why.
    expect(marketplaceVisibility(true, null)).toBe('listed_no_theme');
    expect(isSilentlyInvisible('listed_no_theme')).toBe(true);
  });

  it('distinguishes all four states', () => {
    expect(marketplaceVisibility(true, theme())).toBe('listed');
    expect(marketplaceVisibility(false, theme())).toBe('not_listed');
    expect(marketplaceVisibility(false, null)).toBe('not_listed_no_theme');
    expect(marketplaceVisibility(true, undefined)).toBe('listed_no_theme');
  });

  it('only the listed-and-themed store is actually visible', () => {
    expect(isSilentlyInvisible('listed')).toBe(false);
    expect(isSilentlyInvisible('not_listed')).toBe(false);
    expect(isSilentlyInvisible('not_listed_no_theme')).toBe(false);
  });
});

describe('buildMarketplacePreview', () => {
  it('shows exactly what the entry carries', () => {
    const preview = buildMarketplacePreview(company, theme());

    expect(preview.name).toBe('Merths');
    expect(preview.logoUrl).toBe('https://example.test/logo.png');
    expect(preview.rows.map((r) => r.label)).toEqual(['Store name', 'Location', 'Industry', 'Website']);
    expect(preview.rows.find((r) => r.label === 'Location')?.value).toBe('Austin, TX, US');
  });

  it('never previews a field the marketplace does not publish', () => {
    // A preview that shows more than the entry does is worse than none: the
    // merchant would edit for an audience that never sees it.
    const preview = buildMarketplacePreview({ ...company, name: 'Merths' } as never, theme());
    const serialized = JSON.stringify(preview).toLowerCase();

    for (const forbidden of ['address', 'postal', 'tax_id', 'business_phone', 'business_email', 'latitude']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('a themeless store nulls every branding key but keeps its name', () => {
    // The brand NAME in the directory is company.name, from Business Info —
    // not anything on the theme.
    const preview = buildMarketplacePreview(company, null);

    expect(preview.name).toBe('Merths');
    expect(preview.logoUrl).toBeNull();
    expect(preview.primaryHex).toBeNull();
    expect(preview.secondaryHex).toBeNull();
    expect(preview.headingFont).toBeNull();
  });

  it('reports a missing field as missing rather than hiding the row', () => {
    const preview = buildMarketplacePreview({ ...company, website: '', industry: null } as never, theme());

    expect(preview.rows.find((r) => r.label === 'Website')?.value).toBeNull();
    expect(preview.rows.find((r) => r.label === 'Industry')?.value).toBeNull();
    expect(preview.rows).toHaveLength(4);
  });

  it('survives having no company loaded yet', () => {
    const preview = buildMarketplacePreview(null, null);

    expect(preview.name).toBe('Your store');
    expect(preview.rows.every((r) => r.value === null)).toBe(true);
  });

  it('builds a partial location from whatever is set', () => {
    const preview = buildMarketplacePreview({ ...company, state: null, country: null } as never, theme());

    expect(preview.rows.find((r) => r.label === 'Location')?.value).toBe('Austin');
  });

  it('the privacy notice names the fields that stay private', () => {
    for (const field of ['street address', 'postal code', 'phone number', 'business email', 'tax ID']) {
      expect(MARKETPLACE_PRIVACY_NOTICE).toContain(field);
    }
  });
});
