// The single seam between the redesigned /insights page and its data. The page
// calls getInsights() and dismissInsight(); which data answers depends on
// VITE_INSIGHTS_REDESIGN (flag.ts):
//
//   mock  mock/insights.mock.ts, after a short delay so the skeleton shows
//   live  the agent's pending list, mapped by fromAgent.ts
//   off   getInsights() throws InsightsDisabledError and the page keeps
//         today's content (S2 wires the fallback)
//
// api/agent.api is imported lazily in live mode only: a static import would
// pull utils/axios into every test of this file (it dies on sessionStorage
// under vitest) and into the mock-only bundle for no reason.

import { isFeedbackReasonCode } from 'api/agentFeedback';

import { getInsightsMode, type InsightsMode } from './flag';
import { payloadFromAgent, rationaleFromAgent } from './fromAgent';
import { INSIGHTS_MOCK } from './mock/insights.mock';
import { INSIGHT_CATEGORIES, type InsightCategory, type InsightsPayload, type Recommendation } from './types';

export class InsightsDisabledError extends Error {
  constructor() {
    super('Insights redesign is off (VITE_INSIGHTS_REDESIGN=off); render the existing /insights page instead.');
    this.name = 'InsightsDisabledError';
  }
}

export interface InsightsOptions {
  mode?: InsightsMode;
  /** Mock only: how long before the mock resolves. Tests pass 0. */
  mockDelayMs?: number;
}

const DEFAULT_MOCK_DELAY_MS = 400;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Dev-only: `?insightsMock=error` makes the mock reject, so the error state can be seen. */
const mockErrorRequested = (): boolean =>
  import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('insightsMock') === 'error';

export async function getInsights({
  mode = getInsightsMode(),
  mockDelayMs = DEFAULT_MOCK_DELAY_MS
}: InsightsOptions = {}): Promise<InsightsPayload> {
  if (mode === 'off') throw new InsightsDisabledError();

  if (mode === 'mock') {
    if (mockDelayMs > 0) await wait(mockDelayMs);
    if (mockErrorRequested()) throw new Error('Mock insights error (?insightsMock=error)');
    // A copy, so a caller that mutates the list (dismiss) never edits the fixture.
    return structuredClone(INSIGHTS_MOCK);
  }

  const { AgentAPI } = await import('api/agent.api');
  const response = await AgentAPI.Recommendations.list();
  return payloadFromAgent(response.recommendations);
}

/**
 * The rationale and facts for one card, fetched when the card is opened. Mock
 * cards already carry theirs, so mock mode returns them from the fixture.
 */
export async function getInsightDetail(
  id: string,
  { mode = getInsightsMode() }: Pick<InsightsOptions, 'mode'> = {}
): Promise<Pick<Recommendation, 'rationale' | 'facts' | 'signalCount'>> {
  if (mode === 'off') throw new InsightsDisabledError();
  if (mode === 'mock') {
    const rec = INSIGHTS_MOCK.recommendations.find((r) => r.id === id);
    if (!rec) throw new Error(`No mock insight ${id}`);
    return structuredClone({ rationale: rec.rationale, facts: rec.facts, signalCount: rec.signalCount });
  }
  const { AgentAPI } = await import('api/agent.api');
  return rationaleFromAgent(await AgentAPI.Recommendations.rationale(id));
}

/**
 * Dismiss one card. Live mode sends the Dashboard's thumbs-down (feedback with
 * sentiment "down"), not the bare /dismiss/ endpoint, so the reason reaches the
 * learning loop. `reason` may be one of the backend's reason codes
 * (api/agentFeedback FEEDBACK_REASON_CODES), sent as the code, or free text,
 * sent as reason_text. Mock mode makes no request and logs the call it would
 * have made; the page removes the card itself.
 */
export async function dismissInsight(
  id: string,
  reason?: string,
  { mode = getInsightsMode() }: Pick<InsightsOptions, 'mode'> = {}
): Promise<void> {
  if (mode === 'mock') {
    console.info(
      `[insights-redesign] dismissInsight(${id}, ${reason === undefined ? 'no reason' : JSON.stringify(reason)}) (mock: no request)`
    );
    return;
  }
  if (mode !== 'live') return;
  const { AgentAPI } = await import('api/agent.api');
  const isCode = isFeedbackReasonCode(reason);
  await AgentAPI.Recommendations.submitFeedback(id, {
    sentiment: 'down',
    reasonCode: isCode ? reason : undefined,
    reasonText: isCode ? undefined : reason
  });
}

/** Largest impact first. Stable for equal amounts; never mutates the input. */
export const sortByImpact = (recs: readonly Recommendation[]): Recommendation[] =>
  [...recs].sort((a, b) => b.impact.amount - a.impact.amount);

/** How many cards in each category, with every category present (0 when none). */
export const countByCategory = (recs: readonly Recommendation[]): Record<InsightCategory, number> => {
  const counts = Object.fromEntries(INSIGHT_CATEGORIES.map((c) => [c, 0])) as Record<InsightCategory, number>;
  for (const rec of recs) counts[rec.category] += 1;
  return counts;
};
