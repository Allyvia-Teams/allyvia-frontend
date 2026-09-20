import { describe, expect, it } from 'vitest';

import type { BuyingRound, PerkEvent, PromotionRule } from 'api/innerCircle.api';
import { isoToLocalInput } from 'ui-component/inner-circle/dateInput';

import { buildOutreachRows, filterRows, kindCounts, OUTREACH_KINDS, prefillFor, statusFor } from './outreachRows';

const promo = (over: Partial<PromotionRule> = {}): PromotionRule => ({
  id: 'p1',
  name: 'Vault 10%',
  description: '',
  tier_scope: 'vault',
  top_n: null,
  discount_pct: '10.00',
  cadence_days: 30,
  code_valid_days: 14,
  trigger_type: 'manual',
  is_active: false,
  codes_issued: 0,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...over
});

const perk = (over: Partial<PerkEvent> = {}): PerkEvent => ({
  id: 'k1',
  title: 'Preview',
  description: '',
  perk_type: 'early_access',
  eligible_scope: 'tier',
  top_n: 10,
  tier: 'vault',
  capacity: 14,
  event_date: '2026-10-01T18:00:00Z',
  location: '',
  status: 'draft',
  invite_count: 0,
  response_counts: { invited: 0, interested: 0, booked: 0, declined: 0 },
  created_at: '2026-09-02T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
  ...over
});

const round = (over: Partial<BuyingRound> = {}): BuyingRound => ({
  id: 'r1',
  title: 'Which knit?',
  description: '',
  options: [],
  eligible_scope: 'top_n',
  top_n: 25,
  tier: null,
  status: 'open',
  closes_at: '2026-09-20T00:00:00Z',
  opened_at: null,
  closed_at: null,
  winning_option_index: null,
  fulfilled_item: null,
  invite_count: 25,
  vote_count: 9,
  is_accepting_votes: true,
  created_at: '2026-09-03T00:00:00Z',
  updated_at: '2026-09-03T00:00:00Z',
  ...over
});

describe('statusFor — one case per source status', () => {
  it.each<[string, unknown, string]>([
    ['promotion inactive, no codes', promo(), 'draft'],
    ['promotion active', promo({ is_active: true }), 'live'],
    ['promotion inactive with codes', promo({ codes_issued: 8 }), 'ended'],
    ['perk draft', perk(), 'draft'],
    ['perk inviting', perk({ status: 'inviting' }), 'live'],
    ['perk closed', perk({ status: 'closed' }), 'ended'],
    ['round draft', round({ status: 'draft' }), 'draft'],
    ['round open', round(), 'live'],
    ['round closed', round({ status: 'closed' }), 'ended']
  ])('%s', (_l, obj, expected) => {
    expect(statusFor(obj as never).status).toBe(expected);
  });
});

describe('buildOutreachRows', () => {
  it('flattens three sources into one shape sorted by when desc', () => {
    const rows = buildOutreachRows([promo()], [perk()], [round()]);
    // when: promotion.updated_at 2026-09-01, perk.event_date 2026-10-01, round.closes_at 2026-09-20
    // sorted descending by `when`: event (10-01) > vote (09-20) > discount (09-01)
    expect(rows.map((r) => r.kind)).toEqual(['event', 'vote', 'discount']);
  });

  it('audience wording', () => {
    const rows = buildOutreachRows([promo({ tier_scope: 'top_n', top_n: 25 })], [perk()], [round()]);
    expect(rows.find((r) => r.kind === 'discount')?.audience).toBe('Top 25 by spend');
    expect(rows.find((r) => r.kind === 'event')?.audience).toBe('Vault');
  });

  it('statusDetail names the figure that matters', () => {
    const rows = buildOutreachRows(
      [promo({ is_active: true, codes_issued: 8 })],
      [perk({ status: 'inviting', invite_count: 12, response_counts: { invited: 12, interested: 1, booked: 4, declined: 0 } })],
      [round()]
    );
    expect(rows.find((r) => r.kind === 'discount')?.statusDetail).toBe('8 codes in tiles');
    expect(rows.find((r) => r.kind === 'event')?.statusDetail).toBe('12 invited · 4 booked');
    expect(rows.find((r) => r.kind === 'vote')?.statusDetail).toMatch(/9 votes · closes/);
  });
});

describe('kindCounts and filterRows', () => {
  it('counts respect the status filter, chips overlap nothing', () => {
    const rows = buildOutreachRows([promo(), promo({ id: 'p2', is_active: true })], [perk()], []);
    expect(kindCounts(rows, 'all')).toEqual({ discount: 2, event: 1, vote: 0 });
    expect(kindCounts(rows, 'live')).toEqual({ discount: 1, event: 0, vote: 0 });
    expect(filterRows(rows, { status: 'live', kind: null, query: '' })).toHaveLength(1);
    expect(filterRows(rows, { status: 'all', kind: 'event', query: 'prev' })).toHaveLength(1);
  });
});

describe('OUTREACH_KINDS', () => {
  it('is the three plain-words entries in order', () => {
    expect(OUTREACH_KINDS.map((k) => [k.kind, k.label])).toEqual([
      ['discount', 'Give a discount'],
      ['event', 'Invite to an event or perk'],
      ['vote', 'Ask what to stock']
    ]);
  });
});

describe('prefillFor', () => {
  it('maps a discount prefill to PromotionDialog form keys', () => {
    expect(
      prefillFor('discount', {
        name: 'Welcome back, Regular',
        tier_scope: 'regular',
        trigger_type: 'winback',
        discount_pct: '15',
        code_valid_days: 14,
        cadence_days: 30
      })
    ).toEqual({
      name: 'Welcome back, Regular',
      tier_scope: 'regular',
      trigger_type: 'winback',
      discount_pct: '15',
      code_valid_days: '14',
      cadence_days: '30'
    });
  });

  it('maps an event prefill, converting the ISO date to the input format', () => {
    const out = prefillFor('event', {
      title: 'Vault preview',
      perk_type: 'early_access',
      eligible_scope: 'tier',
      tier: 'vault',
      capacity: 14,
      event_date: '2026-09-30T18:00:00Z',
      location: ''
    });
    expect(out.perk_type).toBe('early_access');
    expect(out.capacity).toBe('14');
    expect(out.event_date).toBe(isoToLocalInput('2026-09-30T18:00:00Z'));
  });

  it('null prefill gives an empty object', () => {
    expect(prefillFor('vote', null)).toEqual({});
  });

  it('ignores keys the form does not have', () => {
    expect(prefillFor('discount', { promotion_rule_id: 'x' } as never)).toEqual({});
  });
});
