import { useEffect, useRef } from 'react';

import { useSelector } from 'store';
import useConfig from 'hooks/useConfig';
import { getCompanyTheme } from 'api/branding';
import { companyThemeToBrandTheme, readBrandThemeCache, writeBrandThemeCache } from 'utils/brandThemeCache';

// ==============================|| BRAND THEME BOOTSTRAP ||============================== //
//
// On login (once the company is known), hydrate the app's brandTheme from the backend so the
// whole org is branded on any device. Paints from a per-company localStorage cache first to
// avoid a color flash, then revalidates from the server in the background. Renders nothing.
//
// Until resolved, the app shows the neutral Allyvia default (brandTheme stays whatever config
// holds — null for a fresh browser).

export default function BrandThemeSync() {
  const companyId = useSelector((state) => state.auth?.currentRole?.company_id) as string | undefined;
  const { onChangeBrandTheme } = useConfig();

  // Avoid re-applying the cache for a company we've already synced this session.
  const syncedCompany = useRef<string | null>(null);

  useEffect(() => {
    if (!companyId || syncedCompany.current === companyId) return;
    syncedCompany.current = companyId;

    let cancelled = false;

    // 1) Paint from cache first (instant, no flash for returning users on this browser).
    //    If this company has no cache entry, fall back to the neutral Allyvia default rather than
    //    leaving a previously-active company's theme showing (cross-tenant flash on role switch).
    onChangeBrandTheme(readBrandThemeCache(companyId) ?? null);

    // 2) Revalidate from the server; the server is the source of truth per company.
    getCompanyTheme()
      .then((resp) => {
        if (cancelled) return;
        const brandTheme = companyThemeToBrandTheme(resp);
        onChangeBrandTheme(brandTheme);
        writeBrandThemeCache(companyId, brandTheme);
      })
      .catch(() => {
        // On network/permission error keep the cached/default theme; don't clear branding.
      });

    return () => {
      cancelled = true;
    };
    // onChangeBrandTheme identity changes each render; intentionally only depend on companyId.
  }, [companyId]);

  return null;
}
