// VITE_INSIGHTS_REDESIGN: which /insights page renders, and from what data.
//
//   off   today's page, untouched
//   mock  the new page, from mock/insights.mock.ts
//   live  the new page, from the agent endpoints through adapter.ts
//
// Unset (or any other value) means `mock` under `vite` dev and `off` in every
// build, so production keeps today's page until someone sets the variable.

export type InsightsMode = 'off' | 'mock' | 'live';

const MODES: readonly InsightsMode[] = ['off', 'mock', 'live'];

type InsightsEnv = { VITE_INSIGHTS_REDESIGN?: string; DEV?: boolean };

export const getInsightsMode = (env: InsightsEnv = import.meta.env): InsightsMode => {
  const raw = (env.VITE_INSIGHTS_REDESIGN ?? '').trim().toLowerCase();
  if ((MODES as readonly string[]).includes(raw)) return raw as InsightsMode;
  return env.DEV ? 'mock' : 'off';
};
