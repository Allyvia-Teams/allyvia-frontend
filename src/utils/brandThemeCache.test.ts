import { afterEach, describe, expect, it } from 'vitest';

import type { CompanyThemeResponse } from 'api/branding';
import { companyThemeToBrandTheme, readBrandThemeCache, writeBrandThemeCache } from './brandThemeCache';

// Build a full backend response, overriding only the fields a test cares about.
const resp = (over: Partial<CompanyThemeResponse>): CompanyThemeResponse => ({
  primary_hex: '#5a3a22',
  secondary_hex: '#8a712b',
  heading_font: 'Playfair Display',
  logo_url: null,
  extracted_palette: [],
  overrides: {},
  updated_at: '2026-07-19T00:00:00Z',
  ...over
});

function stubLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear()
  };
  return store;
}

describe('companyThemeToBrandTheme', () => {
  it('maps a backend theme response to the config brandTheme shape', () => {
    expect(companyThemeToBrandTheme(resp({ heading_font: 'Playfair Display' }))).toEqual({
      primary: '#5a3a22',
      secondary: '#8a712b',
      headingFont: 'Playfair Display'
    });
  });

  it('returns null when the company has no theme', () => {
    expect(companyThemeToBrandTheme(null)).toBeNull();
  });

  it('coerces a null heading font to an empty string (exercises the || fallback)', () => {
    expect(companyThemeToBrandTheme(resp({ primary_hex: '#111111', secondary_hex: '#222222', heading_font: null }))).toEqual({
      primary: '#111111',
      secondary: '#222222',
      headingFont: ''
    });
  });
});

describe('brand theme cache', () => {
  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it('round-trips a theme keyed by company id', () => {
    stubLocalStorage();
    const bt = { primary: '#5a3a22', secondary: '#8a712b', headingFont: '' };
    writeBrandThemeCache('company-1', bt);
    expect(readBrandThemeCache('company-1')).toEqual(bt);
  });

  it('distinguishes "no cache entry" (undefined) from a cached null theme', () => {
    stubLocalStorage();
    expect(readBrandThemeCache('never-set')).toBeUndefined();
    writeBrandThemeCache('no-theme-co', null);
    expect(readBrandThemeCache('no-theme-co')).toBeNull();
  });

  it('is company-scoped (one company’s cache does not leak to another)', () => {
    stubLocalStorage();
    writeBrandThemeCache('company-a', { primary: '#5a3a22', secondary: '#8a712b', headingFont: '' });
    expect(readBrandThemeCache('company-b')).toBeUndefined();
  });

  it('never throws when localStorage is unavailable (SSR / no DOM)', () => {
    // no stub installed → localStorage is undefined in the node test env
    expect(() => writeBrandThemeCache('x', null)).not.toThrow();
    expect(readBrandThemeCache('x')).toBeUndefined();
  });

  it('returns undefined (not a throw) when the cached value is corrupt JSON', () => {
    const store = stubLocalStorage();
    store.set('allyvia-brand-theme:corrupt', '{not valid json');
    expect(readBrandThemeCache('corrupt')).toBeUndefined();
  });
});
