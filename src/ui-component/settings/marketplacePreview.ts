import type { CompanyThemeResponse } from 'api/branding';
import type { CompanyBusinessInfo } from 'types/settings';

/**
 * What a store's marketplace entry actually contains, and whether it will
 * appear at all.
 *
 * THE POINT OF THIS MODULE is the second question. The consumer directory is
 * `filter(marketplace_listed=True, theme__isnull=False)` — so a merchant can
 * switch listing on, watch it save, and never appear, with nothing anywhere
 * telling them why. `marketplaceVisibility` re-derives that filter here so the
 * screen can say it out loud, and a backend test pins the filter so this copy
 * cannot quietly become a lie.
 */

export type MarketplaceVisibility = 'listed' | 'listed_no_theme' | 'not_listed' | 'not_listed_no_theme';

export function marketplaceVisibility(listed: boolean, theme: CompanyThemeResponse | null | undefined): MarketplaceVisibility {
  const themed = !!theme;
  if (listed) return themed ? 'listed' : 'listed_no_theme';
  return themed ? 'not_listed' : 'not_listed_no_theme';
}

/** True when the store is opted in but cannot be seen. */
export function isSilentlyInvisible(visibility: MarketplaceVisibility): boolean {
  return visibility === 'listed_no_theme';
}

export interface MarketplacePreviewRow {
  label: string;
  /** Null renders as "Not set" — the point is showing what is missing. */
  value: string | null;
}

export interface MarketplacePreview {
  name: string;
  logoUrl: string | null;
  primaryHex: string | null;
  secondaryHex: string | null;
  headingFont: string | null;
  rows: MarketplacePreviewRow[];
}

const blankToNull = (value: string | null | undefined): string | null => {
  const text = (value ?? '').trim();
  return text === '' ? null : text;
};

/**
 * Mirrors the consumer marketplace serializer exactly — id, name, city, state,
 * country, website, industry, and branding. Nothing else is public, and
 * nothing else may appear here: a preview that shows more than the entry does
 * is worse than no preview, because the merchant would edit for an audience
 * that never sees it.
 *
 * A themeless company nulls every branding key but keeps `name` — the brand
 * name in the directory is `company.name`, from the Business Info card, NOT
 * anything on the theme.
 */
export function buildMarketplacePreview(
  company: Pick<CompanyBusinessInfo, 'name' | 'city' | 'state' | 'country' | 'website' | 'industry'> | null | undefined,
  theme: CompanyThemeResponse | null | undefined
): MarketplacePreview {
  const location = [company?.city, company?.state, company?.country].map(blankToNull).filter(Boolean).join(', ');

  return {
    name: blankToNull(company?.name) ?? 'Your store',
    logoUrl: theme ? blankToNull(theme.logo_url) : null,
    primaryHex: theme ? blankToNull(theme.primary_hex) : null,
    secondaryHex: theme ? blankToNull(theme.secondary_hex) : null,
    headingFont: theme ? blankToNull(theme.heading_font) : null,
    rows: [
      { label: 'Store name', value: blankToNull(company?.name) },
      { label: 'Location', value: location === '' ? null : location },
      { label: 'Industry', value: blankToNull(company?.industry) },
      { label: 'Website', value: blankToNull(company?.website) }
    ]
  };
}

export const MARKETPLACE_PRIVACY_NOTICE =
  'Only these details are public. Your street address, postal code, phone number, business email and tax ID are never shown in the marketplace.';

export const MARKETPLACE_TOGGLE_DESCRIPTION =
  'Members browsing the Allyvia app can find your store and ask to join. Turning this off removes you from the directory; it does not affect anyone who has already joined.';

export const LISTED_NO_THEME_TITLE = "You're listed, but not appearing";
export const LISTED_NO_THEME_BODY =
  'The Allyvia marketplace only shows stores that have a brand saved. Until you save a logo and brand colours in Branding, members will not see your store — and nothing will tell them it exists.';

export const NOT_LISTED_NO_THEME_TITLE = 'Set your brand first';
export const NOT_LISTED_NO_THEME_BODY =
  'The Allyvia marketplace only shows stores that have a brand saved. Save a logo and brand colours in Branding, or turning this on will have no effect.';
