import type { ContactTierLevel, CustomerTier } from 'api/innerCircle.api';

/**
 * What a tier is called, and what colour it wears.
 *
 * A boutique on a threshold ladder names its own rungs, and until now the
 * merchant app could not show them: `Contact.tier` is a lossy projection
 * (every middle rung collapses to "regular"), so the names the merchant
 * configured were visible to their CUSTOMERS and not to themselves. The rung
 * now ships on the row and this module decides what to render from it.
 *
 * `tierLabel` is TOTAL — it cannot throw. The version it replaces indexed a
 * three-key record with a server string, so any unrecognised slug was an
 * exception, and an exception here unmounts whatever table it was rendering.
 */

const TIER_CONFIG: Record<CustomerTier, { label: string; color: 'warning' | 'primary' | 'default' }> = {
  vault: { label: 'Vault', color: 'warning' },
  regular: { label: 'Regular', color: 'primary' },
  shopper: { label: 'Shopper', color: 'default' }
};

function isLegacyTier(tier: string): tier is CustomerTier {
  return tier in TIER_CONFIG;
}

/**
 * Six hex digits, nothing else.
 *
 * TierLevel.color has NO validator — not on the model, not in the
 * serializer — so a merchant who types "gold" gets it stored verbatim.
 * Handing that to MUI's getContrastText throws, and the throw takes the
 * whole customers table down with it.
 */
export function isHexColor(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * The name to show. Ladder rung first, then the legacy label, then whatever
 * the server said verbatim, then null for "nothing to show".
 */
export function tierLabel(tier: string | null | undefined, level?: Pick<ContactTierLevel, 'name'> | null): string | null {
  const rung = level?.name?.trim();
  if (rung) return rung;
  const slug = (tier || '').trim();
  if (!slug) return null;
  if (isLegacyTier(slug)) return TIER_CONFIG[slug].label;
  // An unrecognised server string passes through rather than vanishing —
  // the existing perks and style-vote helpers already do this.
  return slug;
}

export type TierChipStyle =
  | { kind: 'muted' }
  | { kind: 'palette'; color: 'warning' | 'primary' | 'default' }
  | { kind: 'custom'; hex: string };

/** How the chip should be painted, without importing MUI. */
export function tierChipStyle(tier: string | null | undefined, level?: Pick<ContactTierLevel, 'name' | 'color'> | null): TierChipStyle {
  if (!tierLabel(tier, level)) return { kind: 'muted' };
  if (level?.name?.trim()) {
    return isHexColor(level.color) ? { kind: 'custom', hex: level.color } : { kind: 'palette', color: 'primary' };
  }
  const slug = (tier || '').trim();
  if (isLegacyTier(slug)) return { kind: 'palette', color: TIER_CONFIG[slug].color };
  return { kind: 'palette', color: 'default' };
}
