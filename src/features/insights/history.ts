// Rows for /insights/history (S5): this visit's record resolved against the
// current payload. Pure, so vitest can test it in node.

import { DISMISS_REASONS } from './dismissals';
import { CATEGORY_LABELS, formatImpact } from './insightsView';
import type { Recommendation } from './types';
import type { VisitRecord } from './visitRecord';

export interface HistoryRow {
  id: string;
  /** ms since epoch of the latest thing that happened to the card. */
  at: number;
  category: string;
  title: string;
  impact: string;
  outcome: string;
}

export const HISTORY_NOTE = 'Showing actions from this visit. Full history arrives when the outcome ledger is connected.';

const reasonLabel = (code: string | null): string | null => DISMISS_REASONS.find((r) => r.code === code)?.label ?? null;

/** "Acted on", "Dismissed · Not relevant", or both when an acted card was dismissed afterwards. */
export const outcomeLabel = (acted: boolean, dismissed: { reason: string | null } | undefined): string => {
  const dismissedText = dismissed ? ['Dismissed', reasonLabel(dismissed.reason)].filter(Boolean).join(' · ') : '';
  if (acted && dismissedText) return `Acted on, then ${dismissedText.charAt(0).toLowerCase()}${dismissedText.slice(1)}`;
  return acted ? 'Acted on' : dismissedText;
};

/**
 * One row per card the record mentions, newest first. Ids the payload no longer
 * has are dropped: there is nothing to show for them.
 */
export function historyRows(record: VisitRecord, recs: readonly Recommendation[]): HistoryRow[] {
  const byId = new Map(recs.map((rec) => [rec.id, rec]));
  const ids = [...new Set([...record.acted.map((e) => e.id), ...record.dismissed.map((e) => e.id)])];
  return ids
    .flatMap((id): HistoryRow[] => {
      const rec = byId.get(id);
      if (!rec) return [];
      const acted = record.acted.find((e) => e.id === id);
      const dismissed = record.dismissed.find((e) => e.id === id);
      return [
        {
          id,
          at: Math.max(acted?.at ?? 0, dismissed?.at ?? 0),
          category: CATEGORY_LABELS[rec.category],
          title: rec.title,
          impact: [formatImpact(rec.impact), rec.impact.label].filter(Boolean).join(' '),
          outcome: outcomeLabel(Boolean(acted), dismissed)
        }
      ];
    })
    .sort((a, b) => b.at - a.at);
}

/** "Nov 7, 2:14 PM" in the viewer's time zone. */
export const formatVisitTime = (at: number): string =>
  new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
