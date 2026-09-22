import { describe, expect, it } from 'vitest';

import { buildTierJourney, isLegacyJourney } from './tierJourney';

describe('isLegacyJourney', () => {
  it('recognises every position on the built-in ladder', () => {
    expect(isLegacyJourney({ current_tier: 'shopper', next_tier: 'regular' })).toBe(true);
    expect(isLegacyJourney({ current_tier: 'regular', next_tier: 'vault' })).toBe(true);
    expect(isLegacyJourney({ current_tier: 'vault', next_tier: null })).toBe(true);
  });

  it('does not mistake a merchant ladder for it', () => {
    expect(isLegacyJourney({ current_tier: 'Silver', next_tier: 'Gold' })).toBe(false);
    expect(isLegacyJourney({ current_tier: 'Bronze', next_tier: null })).toBe(false);
  });

  it('rejects a legacy name whose successor is wrong', () => {
    // A ladder that happens to reuse one legacy name is still a ladder.
    expect(isLegacyJourney({ current_tier: 'regular', next_tier: 'Platinum' })).toBe(false);
  });

  it('survives an empty progress payload', () => {
    expect(isLegacyJourney({ current_tier: null, next_tier: null })).toBe(false);
  });
});

describe('buildTierJourney', () => {
  it('renders the built-in journey exactly as it always did', () => {
    // No existing legacy boutique may see any change at all.
    const nodes = buildTierJourney({ current_tier: 'regular', next_tier: 'vault' });

    expect(nodes.map((n) => n.label)).toEqual(['Shopper', 'Regular', 'Vault']);
    expect(nodes.map((n) => n.achieved)).toEqual([true, true, false]);
    expect(nodes.find((n) => n.current)?.label).toBe('Regular');
  });

  it('shows a ladder customer their own rung names', () => {
    // THE bug: they used to see Shopper -> Regular -> Vault in the journey
    // while the footer told them about Platinum — three vocabularies on one
    // screen, on a page their customers actually read.
    const nodes = buildTierJourney({ current_tier: 'Silver', next_tier: 'Gold' });

    expect(nodes.map((n) => n.label)).toEqual(['Silver', 'Gold']);
    expect(nodes[0].current).toBe(true);
    expect(nodes[1].achieved).toBe(false);
  });

  it('shows one node at the top rung, not a phantom next', () => {
    const nodes = buildTierJourney({ current_tier: 'Obsidian', next_tier: null });

    expect(nodes).toHaveLength(1);
    expect(nodes[0].label).toBe('Obsidian');
  });

  it('renders nothing rather than guessing when there is no tier', () => {
    expect(buildTierJourney({ current_tier: null, next_tier: null })).toEqual([]);
  });

  it('the documented false positive is pinned, so nobody "fixes" it', () => {
    // A ladder named exactly like the built-in one reads as legacy — and that
    // is CORRECT, because the three-node rendering is then right anyway.
    const nodes = buildTierJourney({ current_tier: 'shopper', next_tier: 'regular' });

    expect(nodes).toHaveLength(3);
  });
});
