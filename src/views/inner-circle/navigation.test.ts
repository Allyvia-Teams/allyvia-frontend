import { describe, expect, it } from 'vitest';

import {
  DESTINATIONS,
  LEGACY_TABS,
  parseDestination,
  parseCustomersView,
  parseOutreachStatus,
  parseOutreachKind,
  parseSettingsSection,
  legacyTabTarget,
  buildCrmRedirectTarget
} from './navigation';

describe('parseDestination', () => {
  it('defaults to this-week and accepts the four destinations', () => {
    expect(parseDestination(null)).toBe('this-week');
    expect(parseDestination('garbage')).toBe('this-week');
    for (const d of DESTINATIONS) expect(parseDestination(d)).toBe(d);
  });
});

describe('legacyTabTarget (both directions)', () => {
  const cases: Array<[string, string]> = [
    ['setup', 'tab=settings&section=setup'],
    ['members', 'tab=customers'],
    ['pipeline', 'tab=customers&view=prospects'],
    ['promotions', 'tab=outreach&kind=discount'],
    ['perks', 'tab=outreach&kind=event'],
    ['style-vote', 'tab=outreach&kind=vote'],
    ['approvals', 'tab=outreach'],
    ['tiers', 'tab=settings&section=tiers'],
    ['benefits', 'tab=settings&section=benefits']
  ];
  it.each(cases)('maps legacy %s', (legacy, expected) => {
    expect(legacyTabTarget(new URLSearchParams({ tab: legacy }))?.toString()).toBe(expected);
  });
  it('carries the pipeline sub-view into prospects', () => {
    expect(legacyTabTarget(new URLSearchParams({ tab: 'pipeline', view: 'deals', recordId: 'r1' }))?.toString()).toBe(
      'tab=customers&view=prospects&prospects=deals&recordId=r1'
    );
  });
  it('returns null for a current destination (no redirect loop)', () => {
    for (const d of DESTINATIONS) expect(legacyTabTarget(new URLSearchParams({ tab: d }))).toBeNull();
  });
  it('falls back to this-week for an unrecognised legacy tab', () => {
    expect(legacyTabTarget(new URLSearchParams({ tab: 'garbage' }))?.toString()).toBe('tab=this-week');
  });
  it('covers every legacy tab exactly once', () => {
    const LEGACY = ['setup', 'members', 'pipeline', 'promotions', 'approvals', 'perks', 'style-vote', 'tiers', 'benefits'];
    const hand = cases.map(([l]) => l).sort();
    expect(hand).toEqual(LEGACY.sort());
    // Independently corroborated against production LEGACY (not just the two
    // hand-written arrays above agreeing with each other) — a row added or
    // removed from LEGACY without a matching test case now fails here.
    expect([...LEGACY_TABS].sort()).toEqual(hand);
  });
});

describe('sub-parsers', () => {
  it('customers view defaults to leaderboard', () => {
    expect(parseCustomersView(null)).toBe('leaderboard');
    expect(parseCustomersView('prospects')).toBe('prospects');
  });
  it('outreach status defaults to all and kind to null', () => {
    expect(parseOutreachStatus('live')).toBe('live');
    expect(parseOutreachStatus('awaiting')).toBe('all');
    expect(parseOutreachKind('event')).toBe('event');
    expect(parseOutreachKind('survey')).toBeNull();
  });
  it('settings section defaults to setup and accepts its two other values', () => {
    expect(parseSettingsSection(null)).toBe('setup');
    expect(parseSettingsSection('tiers')).toBe('tiers');
    expect(parseSettingsSection('benefits')).toBe('benefits');
    expect(parseSettingsSection('garbage')).toBe('setup');
  });
});

describe('buildCrmRedirectTarget', () => {
  it('sends leads/deals to prospects', () => {
    expect(buildCrmRedirectTarget(new URLSearchParams({ tab: 'deals', recordId: 'x' }))).toBe(
      '/inner-circle?tab=customers&view=prospects&prospects=deals&recordId=x'
    );
  });
  it('sends a contact to customers', () => {
    expect(buildCrmRedirectTarget(new URLSearchParams({ tab: 'contacts', recordId: 'c' }))).toBe('/inner-circle?tab=customers&recordId=c');
  });
  it('defaults to customers', () => {
    expect(buildCrmRedirectTarget(new URLSearchParams())).toBe('/inner-circle?tab=customers');
  });
});
