import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('api/innerCircle.api', () => ({
  acceptPerkRecommendation: vi.fn(),
  dismissPerkRecommendation: vi.fn(),
  fetchNetworkPolicies: vi.fn(),
  fetchPerkRecommendations: vi.fn(),
  saveNetworkPolicies: vi.fn()
}));
import type { NetworkPolicy, PerkRecommendation } from 'api/innerCircle.api';
import { NetworkPerksEditor } from './NetworkPerksPanel';
import LocalityChip from './LocalityChip';
import fixture from 'views/inner-circle/fixtures/network-contract.json';
import { NETWORK_PRIVACY } from 'views/inner-circle/network';

describe('network controls rendered contract', () => {
  it('renders the actual default-off response and the privacy explanation', () => {
    const html = renderToStaticMarkup(<NetworkPerksEditor rows={fixture.policies as NetworkPolicy[]} onChange={() => {}} />);
    expect(html).toContain('Silver');
    expect(html).toContain('Off');
    expect(html).not.toContain('checked=""');
    expect(html).toContain('Maximum 15%');
    expect(html).toContain(NETWORK_PRIVACY.replaceAll("'", '&#x27;'));
  });
  it('renders recommendation chips as draft controls without changing the input', () => {
    const rec = structuredClone(fixture.recommendation) as PerkRecommendation;
    rec.payload.welcome_pct[0].pct = 8;
    const html = renderToStaticMarkup(
      <NetworkPerksEditor rows={fixture.policies as NetworkPolicy[]} onChange={() => {}} recommendation={rec} />
    );
    expect(html).toContain('Recommended: 8%');
    expect(html).not.toContain('value="8"');
  });
  it('renders old customer payloads with missing locality', () => {
    expect(renderToStaticMarkup(<LocalityChip />)).toContain('Locality unknown');
  });
});
