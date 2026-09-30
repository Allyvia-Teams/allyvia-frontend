import { describe, expect, it } from 'vitest';

import type { EnrolmentFunnel, SetupPlan, SetupPlanStep, TierReadiness } from 'api/innerCircle.api';
import { SETUP_STEP_ORDER, describeSetupPlan, needsSetup, setupLadderToSend } from './setupPlan';

const funnel = (over: Partial<EnrolmentFunnel> = {}): EnrolmentFunnel => ({
  customers: 11,
  contactable_by_phone: 11,
  contactable_by_email: 11,
  unreachable: 0,
  in_inner_circle: 0,
  not_in_inner_circle: 11,
  provisional: 0,
  claimed: 0,
  declined: 0,
  ...over
});

const readiness = (over: Partial<TierReadiness> = {}): TierReadiness => ({
  ready: true,
  engine: 'legacy',
  reason: 'No ladder yet.',
  history_days: 20,
  blockers: [],
  ...over
});

// The server's plan for the S7 backend fixture shop: one sale to link, one
// duplicate to fold, a proposal drawn from own spend, eleven to enrol.
const steps = (over: Partial<Record<SetupPlanStep['key'], Partial<SetupPlanStep>>> = {}): SetupPlanStep[] =>
  [
    {
      key: 'link_sales',
      would_link: 1,
      ambiguous: 0,
      no_match: 0,
      link_rate: { sales: 12, linked: 11, rate: 0.9167 },
      link_rate_after: { sales: 12, linked: 12, rate: 1 }
    },
    { key: 'merge_duplicates', strong_groups: 1, rows_folded: 1, review_groups: 0, refused: [] },
    {
      key: 'ladder',
      action: 'create',
      active_ladder: null,
      proposal: {
        window: 'lifetime',
        grace_days: 30,
        customers_measured: 11,
        basis: "percentiles of this shop's per-customer lifetime spend",
        levels: [
          { rank: 0, name: 'Member', threshold: '0.00', customers: 11, customers_at_this_level: 4 },
          { rank: 1, name: 'Silver', threshold: '1000.00', customers: 7, customers_at_this_level: 4 },
          { rank: 2, name: 'Gold', threshold: '3000.00', customers: 3, customers_at_this_level: 2 },
          { rank: 3, name: 'Vault', threshold: '5000.00', customers: 1, customers_at_this_level: 1 }
        ]
      }
    },
    {
      key: 'tiers',
      ready: true,
      engine: 'ladder',
      reason: 'An active ladder measures a lifetime window.',
      history_days: 20,
      blockers: [],
      distribution: [
        { rank: 0, name: 'Member', threshold: '0.00', customers: 4 },
        { rank: 1, name: 'Silver', threshold: '1000.00', customers: 4 },
        { rank: 2, name: 'Gold', threshold: '3000.00', customers: 2 },
        { rank: 3, name: 'Vault', threshold: '5000.00', customers: 1 }
      ]
    },
    { key: 'enrol', would_enrol: 11, members_created: 11, members_reused: 0, skipped_no_identity: 0, conflicts: 0 }
  ].map((step) => ({ ...step, ...(over[step.key as SetupPlanStep['key']] ?? {}) })) as SetupPlanStep[];

const plan = (over: Partial<SetupPlan> = {}): SetupPlan => ({
  ready: true,
  blockers: [],
  reason: '',
  steps: steps(),
  funnel: funnel(),
  ...over
});

describe('needsSetup', () => {
  it('a shop with customers and no ladder needs setup', () => {
    expect(needsSetup(funnel(), readiness())).toBe(true);
  });

  it('a shop with a ladder but nobody enrolled still needs setup', () => {
    expect(needsSetup(funnel(), readiness({ engine: 'ladder' }))).toBe(true);
  });

  it('a shop with a ladder and members is set up', () => {
    expect(needsSetup(funnel({ in_inner_circle: 9, not_in_inner_circle: 2 }), readiness({ engine: 'ladder' }))).toBe(false);
  });

  it('a shop with no customers has nothing to set up', () => {
    expect(needsSetup(funnel({ customers: 0, not_in_inner_circle: 0 }), readiness())).toBe(false);
  });
});

describe('describeSetupPlan', () => {
  it('reads back every step in the order the server runs them', () => {
    expect(describeSetupPlan(plan()).map((line) => line.key)).toEqual([...SETUP_STEP_ORDER]);
    expect([...SETUP_STEP_ORDER]).toEqual(['link_sales', 'merge_duplicates', 'ladder', 'tiers', 'enrol']);
  });

  it('names the numbers the owner is agreeing to', () => {
    const lines = Object.fromEntries(describeSetupPlan(plan(), 'USD').map((line) => [line.key, line]));
    expect(lines.link_sales.title).toBe('Link 1 imported sale to a customer already on your list');
    expect(lines.link_sales.detail).toContain('12 of 12 sales will name a customer (100%)');
    expect(lines.merge_duplicates.title).toBe('Merge 1 duplicate record');
    expect(lines.ladder.title).toBe('Create your tiers');
    expect(lines.ladder.detail).toContain('Silver from $1,000');
    expect(lines.ladder.detail).toContain('Vault from $5,000');
    expect(lines.tiers.detail).toBe('4 Member · 4 Silver · 2 Gold · 1 Vault');
    expect(lines.enrol.title).toBe('Add 11 customers to Inner Circle');
    expect(lines.enrol.detail).toContain('Nothing is sent to anybody');
  });

  it('an existing ladder is kept, not re-proposed', () => {
    const kept = plan({
      steps: steps({
        ladder: {
          action: 'keep',
          proposal: null,
          active_ladder: {
            window: 'lifetime',
            grace_days: 30,
            levels: [
              { rank: 0, name: 'Friend', threshold: '0.00' },
              { rank: 1, name: 'Patron', threshold: '2000.00' }
            ]
          }
        }
      })
    });
    const ladder = describeSetupPlan(kept).find((line) => line.key === 'ladder');
    expect(ladder?.title).toBe('Keep your tiers');
    expect(ladder?.detail).toContain('Patron from $2,000');
  });

  it('a refused plan says why, on the tiers step, and adds nobody', () => {
    const refused = plan({
      ready: false,
      blockers: ['no_active_ladder_with_deep_history'],
      reason: 'This shop has 200 days of history and no active tier ladder.',
      steps: steps({
        ladder: { action: 'none', proposal: null, active_ladder: null },
        tiers: {
          ready: false,
          engine: 'legacy',
          reason: 'This shop has 200 days of history and no active tier ladder.',
          blockers: ['no_active_ladder_with_deep_history'],
          distribution: undefined
        }
      }).filter((step) => step.key !== 'enrol')
    });
    const lines = describeSetupPlan(refused);
    const tiers = lines.find((line) => line.key === 'tiers');
    expect(tiers?.severity).toBe('blocked');
    expect(tiers?.detail).toContain('200 days of history');
    expect(lines.find((line) => line.key === 'enrol')?.title).toBe('Nobody is added until tiers can be set');
  });

  it('reports the people who cannot be added, as a ceiling not a failure', () => {
    const partial = plan({ steps: steps({ enrol: { would_enrol: 8, skipped_no_identity: 3 } }) });
    const enrol = describeSetupPlan(partial).find((line) => line.key === 'enrol');
    expect(enrol?.detail).toContain('3 have no phone or email on file');
  });
});

describe('setupLadderToSend', () => {
  it('sends back exactly the ladder the owner was shown', () => {
    // A displayed tier is a promise: the confirm carries the thresholds on
    // screen, so a proposal recomputed between preview and click cannot
    // silently move them.
    expect(setupLadderToSend(plan())).toEqual({
      window: 'lifetime',
      grace_days: 30,
      levels: [
        { rank: 0, name: 'Member', threshold: '0.00' },
        { rank: 1, name: 'Silver', threshold: '1000.00' },
        { rank: 2, name: 'Gold', threshold: '3000.00' },
        { rank: 3, name: 'Vault', threshold: '5000.00' }
      ]
    });
  });

  it('sends nothing when the shop keeps its own ladder', () => {
    const kept = plan({ steps: steps({ ladder: { action: 'keep', proposal: null } }) });
    expect(setupLadderToSend(kept)).toBeUndefined();
  });
});
