import { describe, expect, it } from 'vitest';
import type { NetworkPolicy, PerkRecommendation, StoreProfile } from 'api/innerCircle.api';
import fixture from './fixtures/network-contract.json';
import { EMPTY_STORE_PROFILE, localityLabel, policiesValid, policyPayload, profileError, storeSuggestionForTier } from './network';
const policies = fixture.policies as NetworkPolicy[];
const recommendation = fixture.recommendation as PerkRecommendation;
describe('network API contract and drafts', () => {
  it('matches actual backend defaults without silently turning on an offer', () => {
    const profile: StoreProfile = fixture.profile as StoreProfile;
    expect(profile).toEqual(EMPTY_STORE_PROFILE);
    expect(policies.every((row) => !row.is_active && row.welcome_pct === null)).toBe(true);
    expect(policyPayload(policies)).toEqual([]);
    expect(recommendation.payload.storewide_pct.map((row) => row.legacy_tier)).toEqual(['shopper', 'regular', 'vault']);
  });
  it('enforces the 15% contract for active and inactive configured rows', () => {
    const rows = [{ ...policies[0], is_active: true, welcome_pct: '15' }];
    expect(policyPayload(rows)[0].welcome_pct).toBe('15.00');
    for (const value of ['15.01', '0', '-1', '', 'Infinity', '2.345'])
      expect(policiesValid([{ ...rows[0], welcome_pct: value }])).toBe(false);
    expect(() => policyPayload([{ ...rows[0], welcome_pct: '20' }])).toThrow();
  });
  it('rejects a misleading Instagram host and preserves public choices', () => {
    expect(profileError({ ...EMPTY_STORE_PROFILE, instagram_url: 'https://instagram.com.attacker.test/shop' })).not.toBeNull();
    expect(profileError({ ...EMPTY_STORE_PROFILE, instagram_url: 'https://www.instagram.com/shop' })).toBeNull();
    expect(profileError({ ...EMPTY_STORE_PROFILE, description: 'x'.repeat(281) })).not.toBeNull();
  });
  it('uses the strictest recommendation when several rungs share a legacy benefit', () => {
    const rec = structuredClone(recommendation);
    rec.payload.storewide_pct = [
      { level_id: 'a', level_name: 'A', legacy_tier: 'regular', pct: 3 },
      { level_id: 'b', level_name: 'B', legacy_tier: 'regular', pct: 8 }
    ];
    expect(storeSuggestionForTier(rec, 'regular')).toBe(3);
    rec.dismissed_at = '2026-09-05T12:00:00Z';
    expect(storeSuggestionForTier(rec, 'regular')).toBeNull();
  });
  it('has a safe label for an older backend without locality', () => {
    expect(localityLabel(undefined)).toBe('Locality unknown');
    expect(localityLabel('local')).toBe('Local');
    expect(localityLabel('visitor')).toBe('Visitor');
  });
});
