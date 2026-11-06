// The plan list (Inventory › Plan, buy planner B9): one memo per store, so plans group by store; every link
// carries the plan's own store, because a plan answers only under its store's scope (buying/plan_views.py).

import type { PlanSummary, Scope } from 'api/buying.api';

export interface StoreGroup {
  store: { id: string; name: string };
  plans: PlanSummary[];
}

export const groupByStore = (plans: PlanSummary[]): StoreGroup[] => {
  const groups = new Map<string, StoreGroup>();
  plans.forEach((plan) => {
    const group = groups.get(plan.location.id) ?? { store: plan.location, plans: [] };
    group.plans.push(plan);
    groups.set(plan.location.id, group);
  });
  return Array.from(groups.values())
    .map((g) => ({ ...g, plans: [...g.plans].sort((a, b) => b.target_date.localeCompare(a.target_date)) }))
    .sort((a, b) => a.store.name.localeCompare(b.store.name));
};

export const planHref = (plan: Pick<PlanSummary, 'id' | 'location'>): string =>
  `/inventory/plan/${plan.id}?location_id=${encodeURIComponent(plan.location.id)}`;

const RUNNING: Record<string, string> = {
  '': 'Working…',
  reading_catalog: 'Reading…',
  encoding: 'Encoding…',
  matching: 'Matching…',
  carrying: 'Carrying…',
  sizing: 'Sizing…',
  composing: 'Writing…'
};

const SETTLED: Partial<Record<PlanSummary['status'], string>> = {
  frozen: 'Frozen',
  ordered: 'Ordered',
  closed: 'Closed',
  cancelled: 'Cancelled'
};

export const planStatusWord = (plan: PlanSummary): string => {
  const settled = SETTLED[plan.status];
  if (settled) return settled;
  const base = plan.status === 'draft' ? 'Draft' : 'Open';
  if (plan.run.status === 'queued') return 'Waiting to size…';
  if (plan.run.status === 'running') return RUNNING[plan.run.step] ?? 'Working…';
  if (plan.run.status === 'stale') return `${base} · needs a re-size`;
  if (plan.run.status === 'failed') return `${base} · sizing failed`;
  return base;
};

/** All locations, and creating a plan for any store, only for a role the server answered with the company view. */
export const canOfferAll = (scope: Scope): boolean => scope.scope === 'company';
