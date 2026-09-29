// Pure view-model for the recommendation card's reasoning chain and the
// savings widget's gate (ALL-152). No React: vitest runs in node.

import type { SavingsResponse } from 'api/agent.api';

// Labels for agent/signals.py's registry. Unknown values fall back to a
// de-underscored version of themselves rather than disappearing.
const SIGNAL_LABELS: Record<string, string> = {
  weather: 'weather',
  weather_learned: 'weather (learned from your shop)',
  sales_trend: 'sales trend',
  overstock: 'overstock',
  supplier_risk: 'supplier concentration',
  inventory_status: 'stock levels',
  purchase_velocity: 'purchase velocity',
  crm_preferences: 'Inner Circle preferences',
  spend_anomalies: 'spend anomalies',
  margin_health: 'margin',
  staffing: 'staffing forecast',
  calendar_exception: 'your calendar',
  taste_profile: 'Inner Circle taste',
  trend_index: 'external trends'
};

export const humanizeKey = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const signalLabel = (value: string): string => SIGNAL_LABELS[value] ?? humanizeKey(value).toLowerCase();

/** "Driven by: weather (learned from your shop), overstock" — or null when unattributed. */
export const drivenByLine = (signals: string[] | undefined | null): string | null => {
  if (!signals || signals.length === 0) return null;
  return `Driven by: ${signals.map(signalLabel).join(', ')}`;
};

export type ImpactKind = 'grounded' | 'model_estimate' | 'none';

/** Whether the dollar figure was computed from data or is the model's own guess. */
export const impactKind = (source: string | null | undefined, dollars: string | null | undefined): ImpactKind => {
  if (dollars == null || dollars === '' || Number(dollars) === 0) return 'none';
  if (source === 'llm_estimate') return 'model_estimate';
  return 'grounded';
};

export const impactLabel = (dollars: string, kind: ImpactKind): string | null => {
  if (kind === 'none') return null;
  const amount = `$${parseFloat(dollars).toLocaleString()}`;
  return kind === 'grounded' ? `${amount} estimated impact` : `${amount} model estimate — not yet grounded`;
};

export interface SavingsGateView {
  showTotal: boolean;
  progress: string | null; // "1 of 3 verified" while the gate is not met
}

/** The widget shows a total only once the ledger has enough behind it. A
 * response from an older backend without `gate` behaves as before (met). */
export const savingsGateView = (data: Pick<SavingsResponse, 'gate' | 'realized_total_dollars'>): SavingsGateView => {
  const total = Number(data.realized_total_dollars ?? 0);
  if (!data.gate) return { showTotal: total > 0, progress: null };
  if (data.gate.met) return { showTotal: total > 0, progress: null };
  return {
    showTotal: false,
    progress: `${data.gate.verified_recommendations} of ${data.gate.required} recommendations verified`
  };
};

/** by_signal rows worth listing, largest first. Never mixed into by_type. */
export const signalRows = (bySignal: Record<string, string> | undefined): Array<[string, string]> =>
  Object.entries(bySignal ?? {})
    .filter(([, value]) => Number(value) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .map(([key, value]) => [signalLabel(key), value]);
