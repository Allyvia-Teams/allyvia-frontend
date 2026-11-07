// Live mode: the agent's pending recommendations -> InsightsPayload.
//
// Pure, and `import type` only from api/agent.api: importing that module for
// real pulls in utils/axios, which dies on sessionStorage under vitest. The
// adapter does the fetching; this file only decides what each field becomes.
//
// Written against agent.api.ts as PR #164 leaves it (optional `sector` on each
// row). Until #164 merges, `sector` is read through a local widening so this
// compiles on main too; a backend or client without it falls back to rec_type.
// Every field the API does not carry has a TODO(insights-live) naming the gap;
// data-spec.md section 3 is the same list.

import type { PendingRecommendation, RationaleSignal, RecommendationRationale } from 'api/agent.api';
import { splitLead } from 'ui-component/frame/frame';
import { humanizeKey } from 'views/dashboard/recommendationSignals';

import type { Confidence, Fact, FactSource, InsightCategory, InsightsPayload, PrimaryActionKind, Recommendation } from './types';

// --- category ---------------------------------------------------------------

// backend agent/taxonomy.py RecType -> card category. rec_type is the more
// specific of the two (it knows a markdown from a reorder; the sector does not).
const CATEGORY_BY_REC_TYPE: Record<string, InsightCategory> = {
  reorder: 'inventory',
  stockout_recovery: 'inventory',
  stock_transfer: 'inventory',
  weather_prep: 'inventory',
  overstock_markdown: 'pricing',
  pricing_adjustment: 'pricing',
  margin_protection: 'pricing',
  category_promotion: 'pricing',
  staffing_adjustment: 'staffing',
  labor_scheduling: 'staffing',
  staffing_benchmark: 'staffing',
  member_winback: 'inner_circle',
  member_event: 'inner_circle',
  style_vote: 'inner_circle',
  event_promo: 'inner_circle',
  cross_store_campaign: 'inner_circle',
  supplier_consolidation: 'cash',
  vendor_consolidation: 'cash',
  spend_allocation: 'cash',
  health_divergence: 'cash'
};

// PR #164's Sector. `general` has no category of its own.
const CATEGORY_BY_SECTOR: Record<string, InsightCategory> = {
  inventory: 'inventory',
  staffing: 'staffing',
  finance: 'cash'
};

type RowWithSector = PendingRecommendation & { sector?: string | null };

export const categoryFor = (rec: RowWithSector): InsightCategory =>
  CATEGORY_BY_REC_TYPE[rec.rec_type ?? ''] ??
  CATEGORY_BY_SECTOR[rec.sector ?? ''] ??
  // TODO(insights-live): category. Untyped rows in the `general` sector (and
  // rows from a backend with neither field) have no category; inventory is
  // where most of them are about.
  'inventory';

// --- confidence -------------------------------------------------------------

/** confidence_score is 0..1. Thresholds are ours; the backend has no bands. */
export const confidenceFor = (score: number | null | undefined): Confidence => {
  const s = typeof score === 'number' && Number.isFinite(score) ? score : 0;
  if (s >= 0.75) return 'high';
  if (s >= 0.5) return 'medium';
  return 'low';
};

// --- primary action ----------------------------------------------------------

// TODO(insights-live): primaryAction. The API has no action field. The kind is
// derived from the category and the label is a neutral "Review" until the
// backend says what the button should do; a specific verb ("Draft purchase
// order") on a row we cannot act on would promise something the click does not do.
const ACTION_KIND_BY_CATEGORY: Record<InsightCategory, PrimaryActionKind> = {
  inventory: 'purchase_order',
  pricing: 'markdown',
  staffing: 'shift',
  inner_circle: 'invite',
  cash: 'payment'
};

// --- time formatting -----------------------------------------------------------

const timeOf = (date: Date): string => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "7:02 AM", or "" for a missing or unparseable timestamp. */
export const clockTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : timeOf(date);
};

/** "today at 7:02 AM", "yesterday at 6:40 PM", "Nov 3 at 7:00 AM"; "" when unknown. */
export const relativeStamp = (iso: string | null | undefined, now: Date = new Date()): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  let day: string;
  if (sameDay(date, now)) day = 'today';
  else if (sameDay(date, yesterday)) day = 'yesterday';
  else day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${day} at ${timeOf(date)}`;
};

// --- one row --------------------------------------------------------------------

export const recommendationFromAgent = (rec: RowWithSector): Recommendation => {
  const { title, body } = splitLead(rec.recommendation_text);
  const dollars = Number(rec.predicted_impact_dollars);
  const amount = Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars) : 0;
  const category = categoryFor(rec);

  return {
    id: rec.id,
    category,
    title,
    summary: body ?? '',
    // TODO(insights-live): deadline. No field carries a merchant deadline;
    // expires_at is when the row stops being shown, not when to act by.
    deadline: '',
    confidence: confidenceFor(rec.confidence_score),
    impact: {
      amount,
      // TODO(insights-live): impact label. The API has no impact kind (revenue
      // protected, cash freed...). Until it does, say only whether the figure
      // was computed or guessed, as the Dashboard does.
      label: amount === 0 ? '' : rec.impact_source === 'llm_estimate' ? 'model estimate' : 'estimated impact',
      signed: amount > 0
    },
    primaryAction: { label: 'Review', kind: ACTION_KIND_BY_CATEGORY[category] },
    // Filled by rationaleFromAgent when the card is opened: the rationale is a
    // second request per row, fetched lazily as the Dashboard does today.
    rationale: { narrative: '', steps: [] },
    facts: [],
    // TODO(insights-live): signalCount. driving_signals is the registry
    // signals stamped at birth; [] on rows that predate the registry, so an
    // older row reads 0 until its rationale is loaded.
    signalCount: rec.driving_signals?.length ?? 0,
    lastChecked: clockTime(rec.generated_at)
  };
};

// --- the list ---------------------------------------------------------------------

export const payloadFromAgent = (recs: RowWithSector[], now: Date = new Date()): InsightsPayload => {
  const latest = recs.reduce<string | null>((acc, rec) => (!acc || rec.generated_at > acc ? rec.generated_at : acc), null);
  return {
    // TODO(insights-live): storeName. Not on the recommendations response; the
    // page should read the company name from the store it already has.
    storeName: '',
    // TODO(insights-live): mode. No endpoint says whether the shop is in Save
    // or Growth mode; Save is the conservative reading.
    mode: 'save',
    refreshedAt: relativeStamp(latest, now),
    // Backend order is the rank (composite_score after #164). Not re-sorted here.
    recommendations: recs.map(recommendationFromAgent)
  };
};

// --- the rationale (second request, on open) ---------------------------------

// agent/signals.py registry keys -> fact tag. Unknown keys fall back to
// sales_history, the source most signals are computed from.
const FACT_SOURCE_BY_SIGNAL: Record<string, FactSource> = {
  weather: 'weather',
  weather_learned: 'weather',
  sales_trend: 'sales_history',
  purchase_velocity: 'sales_history',
  trend_index: 'sales_history',
  overstock: 'inventory',
  inventory_status: 'inventory',
  supplier_risk: 'vendor_terms',
  crm_preferences: 'inner_circle',
  taste_profile: 'inner_circle',
  spend_anomalies: 'cash',
  margin_health: 'pricing',
  staffing: 'staffing',
  calendar_exception: 'local_events'
};

export const factSourceFor = (key: string | null | undefined): FactSource => FACT_SOURCE_BY_SIGNAL[key ?? ''] ?? 'sales_history';

const factValue = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  return String(value);
};

const signalFacts = (signal: RationaleSignal): Fact[] =>
  Object.entries(signal.facts ?? {})
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => ({
      source: factSourceFor(signal.key),
      label: humanizeKey(key),
      value: factValue(value),
      // TODO(insights-live): fact sub-line. Signal facts are bare key/value
      // pairs; the signal's own name is the only context there is.
      sub: humanizeKey(signal.key)
    }));

export const rationaleFromAgent = (rationale: RecommendationRationale): Pick<Recommendation, 'rationale' | 'facts' | 'signalCount'> => {
  const cited = rationale.signals.filter((signal) => signal.cited && !signal.abstained && !signal.unavailable);
  const groundTruth: Fact[] = rationale.ground_truth
    .filter((row) => row.metric && row.baseline_value)
    .map((row) => ({
      source: factSourceFor(row.source),
      label: humanizeKey(row.metric ?? ''),
      value: row.baseline_value ?? '',
      sub: row.baseline_window_days ? `${row.baseline_window_days}-day baseline` : 'Baseline'
    }));
  return {
    rationale: {
      narrative: rationale.summary?.text ?? '',
      // TODO(insights-live): steps. The rationale endpoint has no ordered
      // steps; an empty list hides the numbered section.
      steps: []
    },
    facts: [...cited.flatMap(signalFacts), ...groundTruth],
    signalCount: cited.length
  };
};
