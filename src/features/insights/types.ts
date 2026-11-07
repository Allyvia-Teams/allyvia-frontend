// The one shape the redesigned Insights page renders from (S1). The mock and
// the live agent both reach the UI through adapter.ts as an InsightsPayload, so
// components never see an API type. Field-by-field notes on where each value
// comes from in live mode are in docs/insights-redesign/data-spec.md.

export type InsightCategory = 'inventory' | 'pricing' | 'staffing' | 'inner_circle' | 'cash';

export const INSIGHT_CATEGORIES: readonly InsightCategory[] = ['inventory', 'pricing', 'staffing', 'inner_circle', 'cash'];

/** Where a fact came from. Shown as a small tag on each fact row. */
export type FactSource =
  | 'sales_history'
  | 'inventory'
  | 'weather'
  | 'local_events'
  | 'staffing'
  | 'pricing'
  | 'inner_circle'
  | 'cash'
  | 'vendor_terms';

export type Confidence = 'high' | 'medium' | 'low';

export type Fact = {
  source: FactSource;
  label: string; // "Units sold, last 10 days"
  value: string; // "14" (already formatted for display)
  sub: string; // "2.3x its November average"
};

export type PrimaryActionKind = 'purchase_order' | 'shift' | 'markdown' | 'invite' | 'payment';

export type Recommendation = {
  id: string; // live: PendingRecommendation.id (the id feedback and rationale take)
  category: InsightCategory;
  title: string;
  summary: string;
  deadline: string; // "Order by 5 PM today"
  confidence: Confidence;
  /** `signed` puts a + in front of the amount ("+$1,140"); unsigned reads as a plain figure ("$4,200"). */
  impact: { amount: number; label: string; signed: boolean };
  primaryAction: { label: string; kind: PrimaryActionKind };
  /**
   * What the primary action's flow would be prefilled with (S5): item, sizes,
   * quantities, percentage, date, segment. The mock fills it for every card;
   * live leaves it undefined. No flow accepts a prefill today (actions.ts), so
   * it is recorded, not sent.
   */
  actionPayload?: Record<string, unknown>;
  rationale: { narrative: string; steps: string[] };
  facts: Fact[];
  signalCount: number;
  lastChecked: string; // "7:02 AM"
};

export type InsightsPayload = {
  storeName: string;
  mode: 'save' | 'growth';
  refreshedAt: string; // "today at 7:02 AM"
  recommendations: Recommendation[];
};
