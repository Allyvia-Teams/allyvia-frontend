// TEMPORARY (S1): proves the adapter end to end by logging what it returns.
// Renders nothing. S2 replaces this with the real card list; delete it then.

import { useEffect } from 'react';

import { getInsights, sortByImpact } from './adapter';
import { getInsightsMode } from './flag';

export function useInsightsAdapterProbe(): void {
  useEffect(() => {
    const mode = getInsightsMode();
    if (mode === 'off') return;
    let cancelled = false;
    getInsights({ mode })
      .then((payload) => {
        if (cancelled) return;
        const sorted = sortByImpact(payload.recommendations);
        const lines = sorted.map(
          (r, i) => `${i + 1}. ${r.id} · ${r.category} · $${r.impact.amount.toLocaleString('en-US')} · ${r.facts.length} facts`
        );
        console.info(`[insights-redesign] mode=${mode}: ${sorted.length} recommendations by impact\n${lines.join('\n')}`);
      })
      .catch((error: unknown) => {
        if (!cancelled) console.warn(`[insights-redesign] mode=${mode}: adapter failed`, error);
      });
    return () => {
      cancelled = true;
    };
  }, []);
}
