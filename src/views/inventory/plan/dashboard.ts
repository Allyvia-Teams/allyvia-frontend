// The Dashboard's buy-plan card (buy planner B9; backend buying/agent_hook.py writes it when a plan freezes):
// `signal_sources = {origin: "buying", kind: "buy_plan_ready", plan_id, location_id, …}`. The card's words stay
// the server's; this only reads where it links. Ids are uuid-gated so a malformed one never reaches a URL.

import { isUuid } from '../purchasing';

export const BUYING_ORIGIN = 'buying';

export interface BuyPlanRecommendation {
  isBuyPlan: boolean;
  href: string | null;
}

const text = (signals: Record<string, unknown>, key: string) => (typeof signals[key] === 'string' ? (signals[key] as string).trim() : null);

export const readBuyPlanRecommendation = (signalSources: unknown): BuyPlanRecommendation => {
  if (typeof signalSources !== 'object' || signalSources === null || Array.isArray(signalSources)) return { isBuyPlan: false, href: null };
  const signals = signalSources as Record<string, unknown>;
  if (text(signals, 'origin') !== BUYING_ORIGIN) return { isBuyPlan: false, href: null };
  const planId = text(signals, 'plan_id');
  const locationId = text(signals, 'location_id');
  if (!isUuid(planId)) return { isBuyPlan: true, href: null };
  const query = isUuid(locationId) ? `?location_id=${locationId}` : '';
  return { isBuyPlan: true, href: `/inventory/plan/${planId}${query}` };
};
