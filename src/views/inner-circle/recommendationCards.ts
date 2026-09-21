// Imported from the module, never the `ui-component/frame` barrel: the barrel
// re-exports Panel and friends, which pull in MUI, and this file's tests run
// in vitest's plain `node` environment. Same rule `outreachRows.ts` follows.
import { splitLead } from 'ui-component/frame/frame';
import { kindLabel as outreachKindLabel } from './outreachRows';

// `import type` ONLY — that module reads `import.meta.env` at load time and
// this file's tests run in vitest's plain `node` environment, so a value
// import would blow up on the first line. Same rule `outreachRows.ts` follows.
import type { OutreachRecommendation } from 'api/innerCircle.api';
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
 * The real wire types live in `api/innerCircle.api` (`OutreachHealth`,
 * `OutreachRecommendation`). `PostureHealth` and `CardLike` below are the
 * STRUCTURAL shapes this seam needs — the wire types satisfy them
 * structurally, and are deliberately not `extends`ed, so this file stays
 * testable against a three-key literal rather than a fourteen-field one.
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

function intlMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

/**
 * `$1,100` for a normal ISO 4217 code. `Intl.NumberFormat`'s constructor
 * throws a `RangeError` for a code it does not recognise, and this runs
 * inside render — so a bad currency must never escape as a blank card.
 *
 * The fallback is `inventoryKpis.ts`'s own, and its FIRST step is what makes
 * it worth copying: RETRY in USD. A company misconfigured to `"US$"` is a
 * settings typo, not a reason to show the owner a figure with no thousands
 * separator — the grouping is what makes `$52,000` readable at a glance, and
 * dropping it degrades the number in the one dimension that matters while
 * "fixing" a currency symbol nobody was reading. Plain digits are the last
 * resort only, for a runtime with no usable `Intl` at all.
 */
export function formatMoney(value: number, currency = 'USD'): string {
  try {
    return intlMoney(value, currency);
  } catch {
    // Fall through to the USD retry.
  }
  try {
    return intlMoney(value, 'USD');
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
 * What the line says when NOT ONE figure arrived.
 *
 * The closing sentences above are anaphoric — "lean into that" needs a "that",
 * and with no figures the growth line read as the bare, baffling "Suggestions
 * below lean into that." The save line was grammatical but still opened with a
 * conclusion and no evidence. Both now say plainly that the figures are
 * missing, which is the honest version of the same claim: the mode is real
 * (it comes from the score), only the arithmetic behind the sentence is not
 * available to print.
 */
const NO_FIGURE_TEXT: Record<'save' | 'growth', string> = {
  growth: 'No trend figures yet — suggestions below lean into growth.',
  save: 'No trend figures yet — suggestions below protect cash and bring members back without spending cash up front.'
};

/**
 * The assembled figure sentence starts with a capital, and it has to be done
 * HERE rather than in the part-builders.
 *
 * Each clause is written to sit mid-sentence ("you have about 210 days of
 * cash"), because which one comes first depends on which figures arrived —
 * and on the save rig the trajectory clause is the one that is missing, so
 * the line rendered "you have about 0 days of cash. Suggestions below…".
 * Capitalising the joined result is the only place that knows what ended up
 * first.
 */
function capitaliseFirst(sentence: string): string {
  return sentence ? sentence.charAt(0).toUpperCase() + sentence.slice(1) : sentence;
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

  const closing = closingSentence(mode);
  const factSentence = capitaliseFirst(joinParts(parts));
  // With no figures at all the closing sentence cannot stand alone — see
  // NO_FIGURE_TEXT. With no mode either, there is nothing to say and the line
  // renders as its chip alone.
  const text = parts.length === 0 ? (mode ? NO_FIGURE_TEXT[mode] : '') : closing ? `${factSentence} ${closing}` : factSentence;

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

// ---------------------------------------------------------------------------
// Dashboard hand-off
// ---------------------------------------------------------------------------

/**
 * The Dashboard's one line pointing at This week (design §3.4).
 *
 * A helper rather than a template literal at the call site for one reason:
 * `${n} Inner Circle suggestions` reads "1 Inner Circle suggestions" on the
 * commonest non-zero count there is, and a pluralisation bug inside JSX is
 * invisible to every gate this repo runs.
 */
export function innerCircleHandoffLabel(count: number): string {
  return count === 1 ? '1 Inner Circle suggestion' : `${count} Inner Circle suggestions`;
}

// ---------------------------------------------------------------------------
// Card presentation — the small decisions that would otherwise live in JSX
// ---------------------------------------------------------------------------

/** The intent chip: the design's two words, not the wire's two lowercase ones. */
export function intentChipLabel(intent: 'save' | 'growth'): string {
  return intent === 'save' ? 'Save' : 'Growth';
}

/** "high confidence" — the caption at the card header's right. */
export function confidenceLabel(confidence: CardLike['confidence']): string {
  return `${confidence} confidence`;
}

/** `Chip`'s `color` prop for a posture tone. MUI has no `neutral`; it has `default`. */
export function postureChipColor(tone: PostureLine['tone']): 'success' | 'warning' | 'error' | 'default' {
  return tone === 'neutral' ? 'default' : tone;
}

/**
 * "Because you're in Growth mode — <reason>", the card's own posture line
 * (design §3.2). Returns `null` rather than a half-sentence when EITHER half
 * is missing: with no mode there is no "in X mode" to claim, and with no
 * reason the heading is a promise of an explanation that never arrives.
 *
 * "Growth mode" / "Save mode" are copied verbatim from `buildPostureLine`'s
 * chip, so the card cannot name a different posture than the line above it.
 */
export function becauseLine(mode: PostureHealth['mode'], postureReason: string): string | null {
  const reason = (postureReason ?? '').trim();
  if (!mode || !reason) return null;
  return `Because you're in ${mode === 'save' ? 'Save' : 'Growth'} mode — ${reason}`;
}

/**
 * "14 members in this group", and NEVER "14 will receive this".
 *
 * `audience_size` is the size of the group the card is ABOUT. The win-back
 * rule issues to the legacy slug intersected with a 55–90-day silence window,
 * and the curated-promo rule to whoever matches at issue time — neither is
 * this number. Rendering it as a delivery count would make the card promise
 * something the system does not do (design §10b.12; Session 4's review
 * condition). Singular at one, and `null` at zero rather than the phrase
 * "0 members in this group", which is a Why-now reason to do nothing.
 */
export function audienceContextLine(size: number | null | undefined): string | null {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return null;
  return size === 1 ? '1 member in this group' : `${size} members in this group`;
}

/** "over 30 days" — the window the cases are measured across, or null. */
export function windowLabel(days: number | null | undefined): string | null {
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) return null;
  return days === 1 ? 'over 1 day' : `over ${days} days`;
}

// ---------------------------------------------------------------------------
// Show n more
// ---------------------------------------------------------------------------

/** Design §3.3: at most five render, the rest are behind one press. */
export const CARD_PAGE_SIZE = 5;

/**
 * "Show 3 more", or `null` when there is nothing behind the fold.
 *
 * Takes the TOTAL and how many are shown, not "total minus five": the button
 * must disappear once expanded, and arithmetic that assumed five would keep
 * offering to reveal cards that are already on screen.
 */
export function showMoreLabel(total: number, shown: number): string | null {
  const hidden = total - shown;
  if (hidden <= 0) return null;
  return `Show ${hidden} more`;
}

// ---------------------------------------------------------------------------
// The perk-settings card — a client-side adapter, not a card the API sends
// ---------------------------------------------------------------------------

/** Where "Set it up" goes for a perk-settings card: the tier settings section. */
export const PERK_SETTINGS_HREF = '/inner-circle?tab=settings&section=tiers';

/** The fallback title when the recommendation carries no narrative of its own. */
export const PERK_SETTINGS_FALLBACK_TITLE = 'Adjust your network welcome perk';

export interface PerkSettingsActions {
  type: 'perk-settings';
  /** A NUMBER, unlike every outreach card's uuid — its endpoints take an int. */
  perkRecommendationId: number;
  /** Where "Set it up" navigates; there is no composer for this kind. */
  href: string;
}

/**
 * The one card that is not an `agent.Recommendation`.
 *
 * `PerkRecommendation` lives at its own endpoint with its own accept and
 * dismiss routes, so it carries an `actions` discriminant: the card component
 * reads it and wires Not now / Don't suggest to `dismissPerkRecommendation`
 * rather than the agent's snooze and feedback, which know nothing about it.
 */
export interface PerkSettingsCard extends CardLike {
  kind: 'perk-settings';
  intent: 'growth';
  title: string;
  /** The rest of the narrative after its first sentence, when there is one. */
  body: string | null;
  posture_reason: string;
  reasons: string[];
  window_days: number | null;
  audience_size: number | null;
  cases: null;
  cost: null;
  expected_health_delta: null;
  actions: PerkSettingsActions;
}

/** The shape this adapter reads — the fields of `PerkRecommendation` it needs. */
export interface PerkRecommendationLike {
  id: number;
  confidence: string;
  narrative: string | null;
  accepted_at: string | null;
  dismissed_at: string | null;
}

const CONFIDENCES: readonly CardLike['confidence'][] = ['low', 'medium', 'high'];

/**
 * A `PerkRecommendation` as a This-week card, or `null` when there is nothing
 * to show.
 *
 * `null` for: no recommendation at all (the endpoint 404s for a company that
 * has none, and a failed fetch is decoration-class — no card, no error), one
 * already ACCEPTED, and one already DISMISSED. That mirrors the outreach list,
 * which the backend narrows to undecided cards server-side: a surface headed
 * "This week" must not re-offer a decision the owner already made.
 *
 * Every dollar field is `null` rather than 0. This recommendation carries no
 * priced cases — it is a settings change whose value is the network traffic it
 * unlocks, which nothing here measures — and a `$0` base case would sort it
 * last while claiming to be worth nothing, two different statements. With
 * `expected_value_dollars: null` and `cases: null`, `sortCards` reads it as 0
 * and it sorts below every priced card, which is the honest position for a
 * card with no figure, without printing a figure.
 *
 * `confidence` is VALIDATED against the three values, not cast: it is a plain
 * string on that endpoint's wire, and an unrecognised one becomes 'medium'
 * rather than reaching `CONFIDENCE_RANK` as an undefined and turning the whole
 * sort into NaN comparisons.
 */
export function adaptPerkRecommendation(rec: PerkRecommendationLike | null | undefined): PerkSettingsCard | null {
  if (!rec) return null;
  if (rec.accepted_at || rec.dismissed_at) return null;

  const { title, body } = splitLead(rec.narrative ?? '');
  const confidence = (CONFIDENCES as readonly string[]).includes(rec.confidence) ? (rec.confidence as CardLike['confidence']) : 'medium';

  return {
    // Prefixed, so it can never collide with an outreach card's uuid in a
    // React key or in `sortCards`' id tiebreak.
    id: `perk-settings-${rec.id}`,
    kind: 'perk-settings',
    intent: 'growth',
    title: title || PERK_SETTINGS_FALLBACK_TITLE,
    body,
    // No posture claim: this recommendation is not generated from health, and
    // a "Because you're in Growth mode" line here would attribute it to a
    // reading it never consulted. `becauseLine` returns null on an empty one.
    posture_reason: '',
    reasons: [],
    window_days: null,
    audience_size: null,
    cases: null,
    cost: null,
    expected_health_delta: null,
    confidence,
    expected_value_dollars: null,
    actions: { type: 'perk-settings', perkRecommendationId: rec.id, href: PERK_SETTINGS_HREF }
  };
}

/**
 * Everything This week can render: the cards the recommender sent, plus the
 * one the client adapts. A discriminated union on `kind` — no outreach card
 * can carry `'perk-settings'`, so `isPerkSettingsCard` narrows it exhaustively
 * and the component's two action sets cannot be applied to the wrong card.
 */
export type ThisWeekCard = OutreachRecommendation | PerkSettingsCard;

/** The three kinds an outreach card may carry, as a runtime set. */
const OUTREACH_CARD_KINDS: ReadonlySet<string> = new Set<OutreachKind>(['discount', 'event', 'vote']);

/**
 * Drops any card whose kind has no composer behind it.
 *
 * The wire type says `kind` is always one of the three, and for these origins
 * it is — the backend builds it from `outreach.get("kind_wire")`. But that
 * call can yield `None` for a malformed row, and the type is an assertion
 * about the backend rather than a guarantee from it. A card that reached the
 * screen with an unknown kind would render a "Set it up" button that opens a
 * composer with no dialog for it: an empty modal, from a suggestion that
 * looked real. Dropping it loses one card; rendering it loses the owner's
 * trust in the button.
 */
export function adaptOutreachCards(results: readonly OutreachRecommendation[] | null | undefined): OutreachRecommendation[] {
  if (!Array.isArray(results)) return [];
  return results.filter((card) => OUTREACH_CARD_KINDS.has(card.kind as string));
}

/** Narrows the mixed list; `kind` is the discriminant, `actions` is the payload. */
export function isPerkSettingsCard(card: { kind: CardKind }): card is PerkSettingsCard {
  return card.kind === 'perk-settings';
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

/** The generate endpoint's throttle, stated so a 429 is not reported as a fault. */
export const REFRESH_THROTTLED_MESSAGE = 'Try again in a bit.';
export const REFRESH_FAILED_MESSAGE = "Couldn't refresh suggestions just now.";

/**
 * What the Refresh button says after it fails.
 *
 * `POST …/recommendations/generate/` is throttled at 6/hour per role, so a 429
 * is the ordinary answer to an impatient second press — reporting it as a
 * failure would send the owner looking for a problem that is a rate limit
 * doing its job. Read structurally off the axios error rather than by
 * `instanceof`, which does not survive the module boundary reliably.
 */
export function refreshErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 429 ? REFRESH_THROTTLED_MESSAGE : REFRESH_FAILED_MESSAGE;
}

// ---------------------------------------------------------------------------
// The four tiles
// ---------------------------------------------------------------------------

/** What a tile shows when the figure is not available. */
export const TILE_UNKNOWN = '—';

/**
 * A count for a tile, or an em dash.
 *
 * ALL-103, on a surface that has no other way to say it: a failed summary
 * fetch must not render "0 Vault members". Three different states land here —
 * the request failed, the backend does not send this field yet
 * (`codes_issued_month` until Task 5.0), and the figure is genuinely zero —
 * and only the last of them is a number. The first two are the same em dash,
 * because the tile has no room to distinguish them and both mean "we do not
 * know"; the tile's `basis` is where a caller says which.
 */
export function tileFigure(value: number | null | undefined, unavailable = false): string | number {
  if (unavailable || typeof value !== 'number' || !Number.isFinite(value)) return TILE_UNKNOWN;
  return value;
}

/**
 * The money tile. Same rule, plus the wire's habit of sending decimal STRINGS
 * — `Number("975996.21")` is fine, `Number("")` is 0 and would print `$0`
 * for a field that arrived empty, which is why the guard is `Number.isFinite`
 * over a rejected empty string rather than `?? 0`.
 */
export function tileMoney(value: number | string | null | undefined, unavailable = false): string {
  if (unavailable || value === null || value === undefined || value === '') return TILE_UNKNOWN;
  const n = Number(value);
  return Number.isFinite(n) ? formatMoney(n) : TILE_UNKNOWN;
}

// ---------------------------------------------------------------------------
// The rule a discount card has already created
// ---------------------------------------------------------------------------

/**
 * The `PromotionRule` id a discount card's recommender ALREADY created, or
 * null.
 *
 * This is the single most load-bearing branch on This week, and the reason is
 * `OutreachComposer`'s own docstring: `outreach_recommender._write` persists a
 * real, inactive rule for every win-back card and binds the recommendation's
 * whole measurement to that rule's codes
 * (`adoption_override.params.promotion_rule_id`). Opening the composer without
 * it takes `PromotionDialog`'s CREATE branch and mints a SECOND rule — the
 * accept then records the new id while the ledger keeps watching the first,
 * which is inactive forever and mints nothing, so ALL-152 reads a suggestion
 * that worked as never adopted. Worse, once the accept lands the card leaves
 * `results`, so `suggestedPromotionIds` stops naming the orphan and it surfaces
 * in the Outreach table as a Draft the owner never wrote — the exact thing the
 * "Suggested" mark exists to prevent.
 *
 * Only for `discount`: the event and vote recommenders pre-create nothing, and
 * `prefillFor` drops this key from the form values (correctly — it is not a
 * field). A non-string id is ignored rather than coerced, for
 * `suggestedPromotionIds`' reason: `String(undefined)` is `"undefined"`, which
 * would resolve to nothing while looking like an id.
 */
export function suggestedRuleId(card: { kind: CardKind; prefill?: Record<string, unknown> | null }): string | null {
  if (card.kind !== 'discount') return null;
  const id = card.prefill?.promotion_rule_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Shown in the composer when the suggested rule turned out to be gone.
 *
 * A 404 here means somebody deleted the rule between the card being generated
 * and the owner pressing the button. Creating a new one is the right recovery
 * — but silently, the owner would believe they were editing the suggestion,
 * and the measurement would be orphaned exactly as if this whole branch did
 * not exist. The sentence is what makes the fallback visible.
 */
export const RULE_REMOVED_NOTICE = 'The suggested rule was removed; this creates a new one.';

// ---------------------------------------------------------------------------
// Why now
// ---------------------------------------------------------------------------

/**
 * The Why-now bullets: the backend's own reasons, then the group the card is
 * about, LAST.
 *
 * Blank reasons are dropped here rather than in JSX so that "the heading
 * appears only when there is something under it" is one tested rule — a
 * heading over an empty list is a promise of an explanation that never
 * arrives, and an empty `<ul>` under a label is invisible to every gate.
 */
export function whyNowLines(reasons: readonly string[] | null | undefined, audience: number | null | undefined): string[] {
  const lines = Array.isArray(reasons) ? reasons.filter((r) => typeof r === 'string' && r.trim().length > 0) : [];
  const audienceLine = audienceContextLine(audience);
  return audienceLine ? [...lines, audienceLine] : lines;
}

// ---------------------------------------------------------------------------
// Cards the client could not render
// ---------------------------------------------------------------------------

/**
 * "2 suggestions could not be shown (unknown kind)", or null.
 *
 * ALL-103 from the inside. `adaptOutreachCards` drops a card whose kind has no
 * composer behind it — and if it drops ALL of them, the fetch succeeded, the
 * list is empty, and the owner would read "Nothing worth suggesting this week"
 * about a week that produced suggestions. Unreachable today; the whole point
 * is that it is unreachable by accident rather than by design.
 */
export function droppedCardsMessage(received: number, kept: number): string | null {
  const dropped = received - kept;
  if (dropped <= 0) return null;
  const noun = dropped === 1 ? 'suggestion' : 'suggestions';
  return `${dropped} ${noun} could not be shown (unknown kind)`;
}

// ---------------------------------------------------------------------------
// Tile basis
// ---------------------------------------------------------------------------

/** The basis line that explains an em dash on an OPTIONAL tile figure. */
export const TILE_ABSENT_BASIS = 'not reported by this backend';

/**
 * Why a tile shows nothing — but only when that reason is "the backend does
 * not send this field".
 *
 * A failed fetch already has a voice: the Retry control under the tile row.
 * Printing "not reported by this backend" there as well would blame the
 * backend's feature set for a network blip, which is the wrong thing to go
 * looking at. `undefined` (no basis) for a real figure and for a failure;
 * the sentence only for a genuinely absent optional field.
 */
export function tileBasis(value: number | null | undefined, unavailable = false): string | undefined {
  if (unavailable) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return undefined;
  return TILE_ABSENT_BASIS;
}
