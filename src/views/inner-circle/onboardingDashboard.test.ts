import { describe, expect, it } from 'vitest';

import type {
  DashboardDataQuality,
  DashboardTiers,
  DuplicateGroup,
  EnrolmentFunnel,
  LadderProposal,
  TierReadiness
} from 'api/innerCircle.api';
import {
  buildActions,
  buildFunnelStages,
  buildTierSegments,
  describeBasis,
  describeMergeEffect,
  describeProposal,
  describeReasons,
  enrollableCount,
  formatMoney,
  membershipLabel,
  share
} from './onboardingDashboard';

const funnel = (over: Partial<EnrolmentFunnel> = {}): EnrolmentFunnel => ({
  customers: 379,
  contactable_by_phone: 281,
  contactable_by_email: 265,
  unreachable: 46,
  in_inner_circle: 333,
  not_in_inner_circle: 46,
  provisional: 333,
  claimed: 0,
  declined: 0,
  ...over
});

const quality = (over: Partial<DashboardDataQuality> = {}): DashboardDataQuality => ({
  duplicates: { groups: 0, strong_groups: 0, review_groups: 0, contacts_involved: 0, contacts_removable: 0 },
  unreachable: 46,
  no_spend_recorded: 0,
  spend_from_import_snapshot: 0,
  missing_name: 0,
  merged_away: 41,
  ...over
});

const readiness = (over: Partial<TierReadiness> = {}): TierReadiness => ({
  ready: true,
  engine: 'ladder',
  reason: 'An active ladder measures a lifetime window.',
  history_days: 400,
  blockers: [],
  ...over
});

describe('share', () => {
  it('never divides by zero on a brand-new shop', () => {
    // 0/0 renders "NaN%" -- on the first screen an owner ever opens.
    expect(share(0, 0)).toBe(0);
    expect(share(5, 0)).toBe(0);
  });

  it('rounds to one decimal', () => {
    expect(share(1, 3)).toBe(33.3);
  });
});

describe('buildFunnelStages', () => {
  it('reports the real Square year the acceptance run produced', () => {
    const stages = buildFunnelStages(funnel());
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s]));
    expect(byKey.customers.value).toBe(379);
    expect(byKey.in_inner_circle.value).toBe(333);
    expect(byKey.in_inner_circle.percent).toBe(87.9);
    expect(byKey.unreachable.value).toBe(46);
  });

  it('keeps unreachable as its own stage, not folded into not-enrolled', () => {
    // They are a different kind of problem: no action by the owner enrols
    // them, so mixing the two makes a ceiling look like a backlog.
    const keys = buildFunnelStages(funnel()).map((s) => s.key);
    expect(keys).toContain('unreachable');
    expect(keys).toContain('not_in_inner_circle');
  });

  it('does not raise an alarm when nothing is wrong', () => {
    const stages = buildFunnelStages(funnel({ unreachable: 0, not_in_inner_circle: 0 }));
    const tones = stages.map((s) => s.tone);
    expect(tones).not.toContain('alert');
    expect(tones).not.toContain('warning');
  });
});

describe('enrollableCount', () => {
  it('excludes the unreachable so the button cannot lie', () => {
    // not_in_inner_circle includes people the server will skip; offering to
    // enrol them promises something that will not happen.
    expect(enrollableCount(funnel())).toBe(0);
    expect(enrollableCount(funnel({ not_in_inner_circle: 60, unreachable: 46 }))).toBe(14);
  });

  it('never goes negative', () => {
    expect(enrollableCount(funnel({ not_in_inner_circle: 2, unreachable: 46 }))).toBe(0);
  });
});

describe('buildTierSegments', () => {
  const tiers: DashboardTiers = {
    mode: 'ladder',
    ladder_window: 'lifetime',
    levels: [
      { rank: 0, name: 'Member', threshold: '0.00', customers: 108 },
      { rank: 1, name: 'Silver', threshold: '2000.00', customers: 167 },
      { rank: 2, name: 'Gold', threshold: '3000.00', customers: 68 },
      { rank: 3, name: 'Vault', threshold: '4000.00', customers: 36 }
    ],
    untiered: 0
  };

  it('puts the highest rung first', () => {
    expect(buildTierSegments(tiers).map((s) => s.name)).toEqual(['Vault', 'Gold', 'Silver', 'Member']);
  });

  it('percentages are of the whole base including the untiered', () => {
    const segments = buildTierSegments({ ...tiers, untiered: 29 });
    const total = segments.reduce((sum, s) => sum + s.customers, 0);
    expect(total).toBe(408);
    expect(segments.at(-1)?.name).toBe('Not tiered');
  });

  it('omits the untiered segment when there are none', () => {
    expect(buildTierSegments(tiers).some((s) => s.name === 'Not tiered')).toBe(false);
  });
});

describe('buildActions', () => {
  it('blocks on tiers when the engine cannot read imported dates', () => {
    const actions = buildActions(
      funnel(),
      quality(),
      readiness({
        ready: false,
        engine: 'legacy',
        reason: 'This shop has 400 days of history and no active tier ladder.',
        blockers: ['no_active_ladder_with_deep_history']
      })
    );
    const ladder = actions.find((a) => a.key === 'ladder');
    expect(ladder?.severity).toBe('blocked');
    expect(ladder?.cta).toBe('create-ladder');
  });

  it('puts duplicates before tiers, because merging changes who is top', () => {
    const actions = buildActions(
      funnel(),
      quality({ duplicates: { groups: 39, strong_groups: 39, review_groups: 0, contacts_involved: 80, contacts_removable: 41 } }),
      readiness()
    );
    expect(actions[0].key).toBe('duplicates');
    expect(actions[1].key).toBe('ladder');
    expect(actions[0].severity).toBe('todo');
  });

  it('offers pre-fill only for customers it can actually enrol', () => {
    const actions = buildActions(funnel({ not_in_inner_circle: 60, unreachable: 46 }), quality(), readiness());
    const prefill = actions.find((a) => a.key === 'prefill');
    expect(prefill?.title).toContain('14 customers');
  });

  it('says everyone is done rather than offering a no-op', () => {
    const actions = buildActions(funnel(), quality(), readiness());
    const prefill = actions.find((a) => a.key === 'prefill');
    expect(prefill?.severity).toBe('done');
  });

  it('states plainly that pre-fill sends nothing and grants no consent', () => {
    const actions = buildActions(funnel({ not_in_inner_circle: 60, unreachable: 0 }), quality(), readiness());
    const prefill = actions.find((a) => a.key === 'prefill');
    expect(prefill?.detail).toContain('Nothing is sent');
    expect(prefill?.detail).toContain('consent');
  });

  it('pluralises one customer correctly', () => {
    const actions = buildActions(funnel({ not_in_inner_circle: 1, unreachable: 0 }), quality({ unreachable: 0 }), readiness());
    expect(actions.find((a) => a.key === 'prefill')?.title).toContain('1 customer ready');
  });
});

describe('formatMoney', () => {
  it('renders an em dash rather than a zero for a missing figure', () => {
    // "$0" is a claim about the customer; "—" is a claim about our data.
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney('')).toBe('—');
    expect(formatMoney('not-a-number')).toBe('—');
  });

  it('survives a currency code a settings typo produced', () => {
    // Intl throws RangeError here, inside render -- it must not blank the page.
    expect(() => formatMoney('100', 'DOLLARS')).not.toThrow();
    expect(formatMoney('100', 'DOLLARS')).toBe('100');
  });

  it('accepts the decimal STRING the wire actually sends', () => {
    expect(formatMoney('9883.39', 'USD')).toContain('9,883');
  });
});

describe('describeReasons', () => {
  it('turns rule names into something an owner can check', () => {
    expect(describeReasons(['phone_and_name'])).toBe('same phone number and name');
    expect(describeReasons(['phone'])).toBe('same phone number');
  });

  it('degrades readably for a rule it does not know', () => {
    expect(describeReasons(['some_new_rule'])).toBe('some new rule');
  });

  it('never renders an empty explanation', () => {
    expect(describeReasons([])).toBe('looks like the same person');
  });
});

describe('describeMergeEffect', () => {
  const group: DuplicateGroup = {
    confidence: 'strong',
    reasons: ['phone_and_name'],
    combined_spend: '9883.39',
    primary: {
      id: '1',
      name: 'Chloe Chen',
      email: 'chloe@example.com',
      phone: '(555) 111-2222',
      source: 'square',
      external_id: 'SQ1',
      created_at: '2025-08-01T00:00:00Z',
      net_spend: '4266.35',
      sale_count: 21
    },
    duplicates: [
      {
        id: '2',
        name: 'Chloe Chen',
        email: '',
        phone: '(555) 111-2222',
        source: 'square',
        external_id: 'SQ2',
        created_at: '2025-09-01T00:00:00Z',
        net_spend: '5617.04',
        sale_count: 29
      }
    ]
  };

  it('leads with the spend the merge reveals', () => {
    // The real case: this shop's best customer reads $4,266 un-merged.
    const copy = describeMergeEffect(group, 'USD');
    expect(copy).toContain('9,883');
    expect(copy).toContain('4,266');
    expect(copy).toContain('1 duplicate record');
  });

  it('does not claim an increase when there is none', () => {
    const flat = { ...group, combined_spend: '4266.35' };
    expect(describeMergeEffect(flat, 'USD')).not.toContain('instead of');
  });
});

describe('describeProposal', () => {
  const proposal: LadderProposal = {
    window: 'lifetime',
    grace_days: 30,
    customers_measured: 379,
    basis: 'percentiles of this shop’s per-customer lifetime spend',
    has_active_ladder: false,
    levels: [
      { rank: 0, name: 'Member', threshold: 0, customers: 379, customers_at_this_level: 108 },
      { rank: 1, name: 'Silver', threshold: 2000, customers: 271, customers_at_this_level: 167 },
      { rank: 2, name: 'Gold', threshold: 3000, customers: 104, customers_at_this_level: 68 },
      { rank: 3, name: 'Vault', threshold: 4000, customers: 36, customers_at_this_level: 36 }
    ]
  };

  it('describes the paid rungs and skips the free one', () => {
    const lines = describeProposal(proposal, 'USD');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Silver');
    expect(lines[0]).toContain('167 customers here today');
    expect(lines.join(' ')).not.toContain('Member at');
  });
});

describe('labels', () => {
  it('says where a spend figure came from', () => {
    expect(describeBasis('imported')).toBe('from an imported summary');
    expect(describeBasis('pos')).toBe('from sales on file');
  });

  it('distinguishes a waiting membership from an active one', () => {
    // "Provisional" is jargon; the owner needs to know nobody has confirmed.
    expect(membershipLabel('provisional')).toBe('Membership waiting');
    expect(membershipLabel('claimed')).toBe('Using the app');
    expect(membershipLabel(null)).toBe('Not enrolled');
  });
});
