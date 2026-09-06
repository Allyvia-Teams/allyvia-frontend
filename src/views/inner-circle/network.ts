import type {
  NetworkPolicy,
  NetworkPolicyInput,
  StoreProfile,
  Locality,
  PerkRecommendation,
  RecommendationField
} from 'api/innerCircle.api';
export const NETWORK_PRIVACY =
  "A merchant learns about a customer's network status only when the customer chooses to reveal it — by claiming a welcome perk at that store.";
export const CATEGORIES = ['clothing', 'shoes', 'accessories', 'beauty', 'home'] as const;
export const AUDIENCES = ['women', 'men', 'unisex', 'kids', 'mixed'] as const;
export const EMPTY_STORE_PROFILE: StoreProfile = { description: '', instagram_url: '', categories: [], audience: '' };
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const localityLabel = (locality?: Locality) =>
  locality === 'local' ? 'Local' : locality === 'visitor' ? 'Visitor' : 'Locality unknown';
export function policiesValid(rows: NetworkPolicy[]): boolean {
  return rows.every((row) => {
    if (!row.is_active && !row.welcome_pct?.trim()) return true;
    const value = Number(row.welcome_pct);
    return !!row.welcome_pct?.trim() && Number.isFinite(value) && value > 0 && value <= 15 && /^\d+(\.\d{1,2})?$/.test(row.welcome_pct);
  });
}
export function policyPayload(rows: NetworkPolicy[]): NetworkPolicyInput[] {
  if (!policiesValid(rows)) throw new Error('Enter a percentage greater than 0 and no more than 15%.');
  return rows
    .filter((row) => row.is_active || row.welcome_pct?.trim())
    .map(({ level_id, welcome_pct, is_active }) => ({ level_id, welcome_pct: Number(welcome_pct).toFixed(2), is_active }));
}
export function profileError(profile: StoreProfile): string | null {
  if (profile.description.length > 280) return 'Keep the description to 280 characters.';
  if (profile.instagram_url) {
    try {
      const url = new URL(profile.instagram_url);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        !['instagram.com', 'www.instagram.com'].includes(url.hostname) ||
        url.username ||
        url.password ||
        (url.port && url.port !== '443')
      )
        return 'Use an instagram.com URL.';
    } catch {
      return 'Use an instagram.com URL.';
    }
  }
  return null;
}
export function recommendationReasons(recommendation: PerkRecommendation, field: RecommendationField): string[] {
  const inputs = recommendation.payload.rationale.find((row) => row.field === field)?.because ?? [];
  return inputs.map(({ input, value }) => {
    if (value === null) return `${input.replaceAll('_', ' ')}: not enough data yet.`;
    if (input === 'gross_margin_pct') return `Your recorded gross margin is ${Number(value).toFixed(1)}%.`;
    if (input === 'discount_cap_pct') return `The discount budget is ${value}%, limited to one third of margin and a maximum of 15%.`;
    if (input === 'conclusive_attribution_ratio')
      return `Attributed revenue is ${Number(value).toFixed(1)} times the recorded discount; this does not measure incremental profit.`;
    if (input === 'weekday_profile' && Array.isArray(value))
      return value
        .map((row) => `${WEEKDAYS[row.weekday]}: ${Number(row.mean).toFixed(0)} average daily revenue across ${row.samples} observed days`)
        .join('; ');
    return typeof value === 'string' ? value : `${input.replaceAll('_', ' ')}: ${JSON.stringify(value)}`;
  });
}

export function storeSuggestionForTier(recommendation: PerkRecommendation | undefined, tier: string): number | null {
  if (!recommendation || recommendation.dismissed_at) return null;
  const values = recommendation.payload.storewide_pct
    .filter((row) => (row.legacy_tier ?? row.level_id) === tier && row.pct != null)
    .map((row) => row.pct!);
  return values.length ? Math.min(...values) : null;
}
