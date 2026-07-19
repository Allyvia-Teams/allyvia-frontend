import { BrandTheme } from 'types/config';
import type { CompanyThemeResponse } from 'api/branding';

// ==============================|| BRAND THEME MAPPING + CACHE ||============================== //
//
// Pure helpers (no axios import) so they can be unit-tested without the browser-only axios/mock
// chain. Maps between the backend theme shape and the config `brandTheme`, and caches the
// resolved theme per company in localStorage for paint-from-cache-first bootstrap.

/** Map a backend theme response to the config `brandTheme` shape (or null when unset). */
export function companyThemeToBrandTheme(resp: CompanyThemeResponse | null): BrandTheme {
  if (!resp) return null;
  return {
    primary: resp.primary_hex,
    secondary: resp.secondary_hex,
    headingFont: resp.heading_font || ''
  };
}

const CACHE_PREFIX = 'allyvia-brand-theme:';

const cacheKey = (companyId: string) => `${CACHE_PREFIX}${companyId}`;

/**
 * Read the cached brand theme for a company.
 * Returns `undefined` when nothing is cached (leave the current theme as-is), or the cached
 * `BrandTheme` (which may itself be `null`, meaning "this company has no brand theme").
 */
export function readBrandThemeCache(companyId: string): BrandTheme | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(companyId));
    if (raw === null) return undefined;
    return JSON.parse(raw) as BrandTheme;
  } catch {
    return undefined;
  }
}

export function writeBrandThemeCache(companyId: string, brandTheme: BrandTheme): void {
  try {
    localStorage.setItem(cacheKey(companyId), JSON.stringify(brandTheme));
  } catch {
    /* ignore quota / serialization errors — the cache is best-effort */
  }
}
