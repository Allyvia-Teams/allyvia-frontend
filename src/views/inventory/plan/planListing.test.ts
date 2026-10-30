import { describe, expect, it } from 'vitest';

import type { PlanSummary } from 'api/buying.api';

import { readBuyPlanRecommendation } from './dashboard';
import { canOfferAll, groupByStore, planHref, planStatusWord } from './planListing';
import { PLAN_ID, run, STORE } from './planFixtures';

const plan = (
  id: string,
  name: string,
  store: { id: string; name: string },
  target: string,
  extra: Partial<PlanSummary> = {}
): PlanSummary => ({
  id,
  name,
  season_label: '',
  location: store,
  target_date: target,
  window_start: '2027-04-05',
  window_end: '2027-06-27',
  target_sell_through: '0.800',
  sell_through_basis: 'policy',
  budget_cost: null,
  status: 'open',
  note: '',
  run: run(),
  created_at: '2027-02-27T10:00:00Z',
  ...extra
});

const UPTOWN = { id: '77777777-7777-4777-8777-777777777777', name: 'Uptown' };

describe('the plan list', () => {
  it('groups plans by store (one memo per store), stores by name, plans newest order date first', () => {
    const groups = groupByStore([
      plan('a', 'Spring 27', UPTOWN, '2027-03-01'),
      plan('b', 'Spring 27', STORE, '2027-03-01'),
      plan('c', 'Holiday', STORE, '2026-10-26')
    ]);
    expect(groups.map((g) => [g.store.name, g.plans.map((p) => p.id)])).toEqual([
      ['Main', ['b', 'c']],
      ['Uptown', ['a']]
    ]);
  });

  it('links each plan with its own store', () => {
    expect(planHref(plan(PLAN_ID, 'Spring 27', STORE, '2027-03-01'))).toBe(`/inventory/plan/${PLAN_ID}?location_id=${STORE.id}`);
  });

  it("says the plan's state in words, the run first while it runs", () => {
    expect(planStatusWord(plan('a', 'x', STORE, '2027-03-01'))).toBe('Open');
    expect(planStatusWord(plan('a', 'x', STORE, '2027-03-01', { run: run('running', 'sizing') }))).toBe('Sizing…');
    expect(planStatusWord(plan('a', 'x', STORE, '2027-03-01', { run: run('stale') }))).toBe('Open · needs a re-size');
    expect(planStatusWord(plan('a', 'x', STORE, '2027-03-01', { status: 'frozen' }))).toBe('Frozen');
    expect(planStatusWord(plan('a', 'x', STORE, '2027-03-01', { status: 'ordered' }))).toBe('Ordered');
  });

  it('offers All locations only to a role the server answered with the company view', () => {
    expect(canOfferAll({ scope: 'company', location: null })).toBe(true);
    expect(canOfferAll({ scope: 'location', location: STORE })).toBe(false);
  });
});

describe('the Dashboard card', () => {
  it('links a buying card to its plan, at its store', () => {
    expect(readBuyPlanRecommendation({ origin: 'buying', kind: 'buy_plan_ready', plan_id: PLAN_ID, location_id: STORE.id })).toEqual({
      isBuyPlan: true,
      href: `/inventory/plan/${PLAN_ID}?location_id=${STORE.id}`
    });
  });

  it('gates the ids: a malformed id gives no link, another origin is not a buying card', () => {
    expect(readBuyPlanRecommendation({ origin: 'buying', plan_id: 'not-a-uuid', location_id: STORE.id })).toEqual({
      isBuyPlan: true,
      href: null
    });
    expect(readBuyPlanRecommendation({ origin: 'buying', plan_id: PLAN_ID, location_id: 'x' })).toEqual({
      isBuyPlan: true,
      href: `/inventory/plan/${PLAN_ID}`
    });
    expect(readBuyPlanRecommendation({ origin: 'reorder', plan_id: PLAN_ID })).toEqual({ isBuyPlan: false, href: null });
    expect(readBuyPlanRecommendation(null)).toEqual({ isBuyPlan: false, href: null });
    expect(readBuyPlanRecommendation(['buying'])).toEqual({ isBuyPlan: false, href: null });
  });
});
