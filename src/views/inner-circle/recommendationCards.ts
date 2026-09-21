import { kindLabel as outreachKindLabel } from './outreachRows';

import type { OutreachKind } from './navigation';

/**
 * `recommendationCards.ts` — the pure seam Session 5's This-week destination
 * renders from: the posture line (Growth/Save mode, the figures behind it,
 * and how many of the five health signals actually fired) and the
 * base/downside/upside recommendation cards, in dollars, that sit under it.
 *
 * `import type` only from `./navigation` — no value import needed there.
 * Nothing here fetches, nothing here is React or MUI: every claim is a pure
 * function over a plain object, matching `outreachRows.ts`'s own rule, so
 * this file can be tested in vitest's plain `node` environment.
 *
 * Task 5.2 owns the real wire types (`agent/health.py`'s response shape and
 * the widened `OutreachRecommendationCard`). To keep this task
 * self-contained, `PostureHealth` and `CardLike` below are the STRUCTURAL
 * shapes this seam needs — Task 5.2's real types only have to satisfy them
 * structurally, not literally extend them.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One of the seven reasons the backend can cite for a provisional score. */
export type PostureReason =
  | 'expenses_unobserved'
  | 'inventory_unavailable'
  | 'customer_engine_unavailable'
  | 'trajectory_provisional_under_13_months'
  | 'no_prior_revenue'
  | 'green_capped_no_profitability'
  | 'profitability_unavailable'
  // The backend's reason vocabulary is not sealed at this seam's boundary —
  // an unrecognised value must still render (humanised), never disappear.
  | (string & {});

export interface PostureHealth {
  score: number | null;
  tier: 'red' | 'yellow' | 'green' | null;
  mode: 'save' | 'growth' | null;
  provisional: boolean;
  components: Record<string, number>;
  inputs: Record<string, number | boolean | string | null>;
  projection: {
    label: 'grow' | 'stagnate' | 'fail';
    net_12: string;
    cash_end: string;
    cash_estimated: boolean;
    rev_12?: string;
  };
  reasons: string[];
  as_of: string;
}

export interface OutreachCase {
  amount: string;
  assumption: string;
}

/** The Outreach kinds, plus the one card kind that has no Outreach row of its own. */
export type CardKind = OutreachKind | 'perk-settings';

export interface CardLike {
  id: string;
  kind: CardKind;
  cases: { downside: OutreachCase; base: OutreachCase; upside: OutreachCase } | null;
  cost: { amount: string | null; label: string; owner_input: boolean } | null;
  expected_health_delta: number | null;
  confidence: 'low' | 'medium' | 'high';
  expected_value_dollars?: string | null;
}

export interface PostureLine {
  chip: string;
  tone: 'success' | 'warning' | 'error' | 'neutral';
  text: string;
  /** `based on N of 5 signals`, present only when the score is provisional. */
  caveat?: string;
  /** `Missing: <reason>, <reason>, ...`, present only alongside `caveat`. */
  caveatTooltip?: string;
}

export interface AmountRow {
  label: string;
  amount: string;
  assumption: string;
}

// ---------------------------------------------------------------------------
// Money — one guarded formatter, mirroring `inventoryKpis.ts::excludedStockAtRetail`.
// ---------------------------------------------------------------------------

/**
 * `$1,100` for a normal ISO 4217 code. `Intl.NumberFormat`'s constructor
 * throws a `RangeError` for a code it does not recognise, and this runs
 * inside render — so a bad currency must never escape as a blank card.
 * The fallback matches `inventoryKpis.ts`'s own: plain digits, no thousands
 * separator, so a broken currency is visibly plainer than a working one
 * rather than silently identical to it.
 */
export function formatMoney(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
}

/** `+$1,100` / `−$1,100` (the U+2212 minus, never a hyphen). */
function formatSignedMoney(amount: string, currency = 'USD'): string {
  const n = Number(amount);
  const sign = n < 0 ? '−' : '+';
  return `${sign}${formatMoney(Math.abs(n), currency)}`;
}

// ---------------------------------------------------------------------------
// Posture line
// ---------------------------------------------------------------------------

/**
 * Every reason the backend can cite for a provisional score, in the owner's
 * words. Covers all SEVEN — the brief names five, but `agent/health.py`'s
 * "tier is never green while profitability is unobserved" rule and its
 * plain "we don't have profitability at all" case are two more, and a
 * tooltip that silently dropped either would under-report what is missing.
 */
export const REASON_COPY: Record<string, string> = {
  expenses_unobserved: 'expenses not observed',
  inventory_unavailable: 'inventory ledger unavailable',
  customer_engine_unavailable: 'customer history too thin',
  trajectory_provisional_under_13_months: 'under 13 months of history',
  no_prior_revenue: 'no prior-year revenue',
  green_capped_no_profitability: 'profitability not observed, so not green',
  profitability_unavailable: 'profitability not observed'
};

/**
 * A reason not in the table is humanised (`_` → space) rather than dropped —
 * the backend's reason vocabulary can grow, and a tooltip that silently
 * omitted an unrecognised reason would under-report what the score is
 * missing, which is the one thing this tooltip exists to say.
 */
export function reasonCopy(reason: string): string {
  return REASON_COPY[reason] ?? reason.replace(/_/g, ' ');
}

/** `up 9%` / `down 6%` / `flat` — never "up 0%" or "down 0%". */
function trajectoryPart(yoy: number): string {
  const pct = Math.round(yoy * 100);
  if (pct === 0) return 'Revenue is flat on last year';
  return pct > 0 ? `Revenue is up ${pct}% on last year` : `Revenue is down ${Math.abs(pct)}% on last year`;
}

function runwayPart(days: number): string {
  return `you have about ${days} days of cash`;
}

function repeatSharePart(share: number): string {
  return `${Math.round(share * 100)}% of active customers came back this year`;
}

/**
 * Joins the present-figure clauses into one sentence: an Oxford-comma list
 * at three or more, a bare "and" at two, nothing at one, and an empty
 * string when NOTHING is present — never a comma-less run-on and never a
 * stray leading "and". `buildPostureLine` is what makes a missing figure
 * OMITTED here rather than reaching this function as a placeholder string.
 */
function joinParts(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return `${parts[0]}.`;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}.`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`;
}

function closingSentence(mode: PostureHealth['mode']): string {
  if (mode === 'save') return 'Suggestions below protect cash and bring members back without spending cash up front.';
  if (mode === 'growth') return 'Suggestions below lean into that.';
  return '';
}

/**
 * The posture line: a chip (Growth/Save mode, or "Not enough data yet" when
 * there is no mode at all), its tone, the sentence stating the figures
 * behind it, and — only when the score is provisional — a caveat naming how
 * many of the five signals fired and a tooltip naming what did not.
 *
 * A missing input (`inputs.runway_days` absent, say) is OMITTED from the
 * sentence rather than printed as "0 days" or "NaN%" — the guard is a
 * `typeof … === 'number'` check per figure, done here, before any of the
 * three part-builders ever sees the value.
 */
export function buildPostureLine(health: PostureHealth): PostureLine {
  const { mode, tier, inputs, provisional, components, reasons } = health;

  let chip: string;
  let tone: PostureLine['tone'];
  if (mode === null) {
    chip = 'Not enough data yet';
    tone = 'neutral';
  } else if (mode === 'save') {
    chip = 'Save mode';
    tone = 'error';
  } else {
    chip = 'Growth mode';
    tone = tier === 'yellow' ? 'warning' : 'success';
  }

  const parts: string[] = [];
  if (typeof inputs.trajectory_yoy === 'number') parts.push(trajectoryPart(inputs.trajectory_yoy));
  if (typeof inputs.runway_days === 'number') parts.push(runwayPart(inputs.runway_days));
  if (typeof inputs.repeat_share === 'number') parts.push(repeatSharePart(inputs.repeat_share));

  const factSentence = joinParts(parts);
  const closing = closingSentence(mode);
  const text = closing ? `${factSentence} ${closing}`.trim() : factSentence;

  const caveat = provisional ? `based on ${Object.keys(components).length} of 5 signals` : undefined;
  const caveatTooltip = provisional ? `Missing: ${reasons.map(reasonCopy).join(', ')}` : undefined;

  return { chip, tone, text, caveat, caveatTooltip };
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

const CONFIDENCE_RANK: Record<CardLike['confidence'], number> = { high: 3, medium: 2, low: 1 };

/** `expected_value_dollars` when present, else the base case, else 0 — never NaN. */
function cardValue(card: CardLike): number {
  const raw = card.expected_value_dollars ?? card.cases?.base.amount ?? '0';
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Highest expected value first, ties broken by confidence (high > medium >
 * low), remaining ties broken by `id` ascending so the order is stable
 * across a re-render of otherwise-identical cards. Returns a new array —
 * the caller's list is never reordered under it.
 */
export function sortCards<T extends CardLike>(cards: readonly T[]): T[] {
  return [...cards].sort((a, b) => {
    const valueDiff = cardValue(b) - cardValue(a);
    if (valueDiff !== 0) return valueDiff;
    const confidenceDiff = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (confidenceDiff !== 0) return confidenceDiff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** The three case rows, money-formatted, with the backend's own sentence verbatim. */
export function caseRows(card: CardLike, currency = 'USD'): AmountRow[] {
  if (!card.cases) return [];
  const { downside, base, upside } = card.cases;
  return [
    { label: 'Downside', amount: formatSignedMoney(downside.amount, currency), assumption: downside.assumption },
    { label: 'Base', amount: formatSignedMoney(base.amount, currency), assumption: base.assumption },
    { label: 'Upside', amount: formatSignedMoney(upside.amount, currency), assumption: upside.assumption }
  ];
}

/**
 * The cost row: "your input" when the owner sets it (whatever the current
 * amount happens to be, including null), an approximate `~$N` when the
 * backend has priced it, or `null` when the card carries no cost at all —
 * three states, never a fabricated $0.
 */
export function costRow(card: CardLike, currency = 'USD'): AmountRow | null {
  const { cost } = card;
  if (!cost) return null;
  const amount = cost.owner_input || cost.amount === null ? 'your input' : `~${formatMoney(Number(cost.amount), currency)}`;
  return { label: 'Cost', amount, assumption: cost.label };
}

/** `+1 point` / `+2 points` / `−3 points`, or `null` when the card has no health estimate. */
export function healthRow(card: CardLike): AmountRow | null {
  const delta = card.expected_health_delta;
  if (delta === null || delta === undefined) return null;
  const abs = Math.abs(delta);
  const sign = delta < 0 ? '−' : '+';
  const unit = abs === 1 ? 'point' : 'points';
  return { label: 'Health', amount: `${sign}${abs} ${unit}`, assumption: 'at the base case' };
}

/** The Outreach vocabulary, plus the one card kind Outreach has no row for. */
export function cardKindLabel(kind: CardKind): string {
  if (kind === 'perk-settings') return 'Adjust a network perk';
  return outreachKindLabel(kind);
}

/** The agreed empty-state sentence for a week with nothing worth surfacing. */
export const EMPTY_COPY = "Nothing worth suggesting this week. Your members look steady; we'll check again tonight.";
