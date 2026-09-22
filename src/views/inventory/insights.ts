// views/inventory/insights.ts
//
// The shared, pure logic behind the inventory insights screens — sell-through,
// aging, low performers, per-location performance, the style matrix, shrinkage
// and per-item analytics. No React and no axios, so every rule below is tested
// directly rather than through a rendered component.
//
// WHY THIS FILE EXISTS
//
// Four properties of the analytics API, all verified against the running
// backend, will produce a screen that lies if they are formatted naively:
//
//   1. `sell_through` CAN BE NEGATIVE. The backend's `_ratio` guards a zero
//      denominator and nothing else, so a refund that came back into stock with
//      no matching sale inside the window yields `units_sold: -2,
//      sell_through: -2.0`. Rendered through an unsigned formatter that is
//      "200%"; drawn on a clamped progress bar it is a full bar.
//   2. `daily_velocity`, and therefore `days_of_cover` and `weeks_of_supply`,
//      follow it negative (probe: -0.0219, -136.5, -19.5).
//   3. THE WHOLE MARGIN BLOCK CAN BE NEGATIVE. COGS is quantity x the CURRENT
//      moving-average cost charged against the HISTORICAL line total, so any
//      markdown sold below today's average cost produces a loss: revenue
//      "10.00", cogs "50.00", gross_margin "-40.00", gross_margin_pct -400.0,
//      gmroi -0.4. Formatted as unsigned currency, a $40 loss reads as a $40
//      profit — the single worst thing this module can allow.
//   4. THESE ENDPOINTS INCLUDE ARCHIVED VARIANTS, unlike the dashboard's
//      inventory-value KPI. A capital total here will not tie out to it, so we
//      say so on the artefact instead of letting someone hunt the difference.
//
// Two further conventions run through everything, both inherited:
// null is UNDEFINED and renders as an em dash rather than 0 (stockFormat.ts),
// and an ABSENT payload is not the same as ALL-ZERO data (financeFormat.ts).
//
// Money arrives as decimal STRINGS and ratios as JSON NUMBERS — never mix the
// two paths in one formatter. Money is read through purchasing.ts's exact
// bigint reader, not floats.

import { formatPercent, formatRatio, marginOf, ratioOf } from 'utils/financeFormat';

import { parseApiError, statusOf } from './apiErrors';
import { formatMoney, isUuid, readMoney } from './purchasing';
import { EM_DASH, formatQuantity } from './stockFormat';

// ---------------------------------------------------------------------------
// Wire shapes
// ---------------------------------------------------------------------------

/** Every analytics response carries this envelope before its own payload. */
export interface AnalyticsWindow {
  start: string;
  end: string;
  /** (end - start).days + 1 — the default 90-day window reports 91. */
  days: number;
}

export interface AnalyticsEnvelope {
  window: AnalyticsWindow;
  location_id: string | null;
  location_name: string | null;
}

/**
 * One variant's row. `units_sold`, `sell_through`, `daily_velocity`,
 * `days_of_cover` and `weeks_of_supply` can all be negative; `opening_stock`
 * can be too (it is derived as current minus movements since the start, an
 * identity that undershoots on backdated data).
 */
export interface SellThroughRow {
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  category: string;
  product_id: string | null;
  style_code: string | null;
  style_name: string | null;
  opening_stock: number;
  units_received: number;
  units_sold: number;
  on_hand: number;
  /** A FRACTION (0.52 = 52%), null iff opening_stock + units_received == 0. */
  sell_through: number | null;
  /** Never null — floored to 0.0 — so it cannot be used to detect "undefined". */
  daily_velocity: number;
  /** null iff daily_velocity == 0 exactly. */
  days_of_cover: number | null;
  weeks_of_supply: number | null;
  cost_price: string;
  unit_price: string;
  stock_value_at_cost: string;
}

/** A low-performer row is a sell-through row plus exactly two keys. */
export interface LowPerformerRow extends SellThroughRow {
  /** MAX age across locations when unscoped; null when unknown. */
  age_days: number | null;
  capital_tied: string;
}

/** by_style / by_category / by_size / by_color. */
export interface SellThroughAgg {
  key: string;
  opening_stock: number;
  units_received: number;
  units_sold: number;
  on_hand: number;
  variants: number;
  stock_value_at_cost: string;
  sell_through: number | null;
}

/**
 * The margin block, which sits in `totals`, `company_totals` and an item's
 * `margin`.
 *
 * MIND THE MIXED CONVENTION: `gmroi` and `stock_turn` are FRACTIONS while
 * `gross_margin_pct` is ALREADY A PERCENT, and they sit side by side.
 */
export interface GmroiBlock {
  revenue: string;
  cogs: string;
  gross_margin: string;
  /** Already a percent (66.666…), null iff revenue == 0. */
  gross_margin_pct: number | null;
  /** 2dp or 3dp — it is (opening + closing) / 2, so an odd cent yields "0.005". */
  average_inventory_cost: string;
  /** Fractions, both null iff average_inventory_cost == 0. */
  gmroi: number | null;
  stock_turn: number | null;
}

/** One (item, location) pair. `inventory_item_id` REPEATS across the array. */
export interface AgingRow {
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  category: string;
  style_code: string | null;
  location_id: string;
  location_name: string;
  on_hand: number;
  last_received_at: string | null;
  /** null when no inbound movement exists for that (item, location). */
  age_days: number | null;
  cost_price: string;
  capital_tied: string;
}

export interface AgingBucket {
  label: string;
  units: number;
  capital_tied: string;
  items: number;
}

export interface LocationRow {
  location_id: string;
  location_name: string;
  is_default: boolean;
  units_sold: number;
  opening_stock: number;
  /** Location-scoped, so this INCLUDES transfer_in — see LOCATION_SCOPE_CAVEAT. */
  units_received: number;
  on_hand: number;
  stock_value_at_cost: string;
  sell_through: number | null;
  revenue: string;
  cogs: string;
  gross_margin: string;
  gross_margin_pct: number | null;
  gmroi: number | null;
  shrinkage: ShrinkageBlock;
}

export interface MatrixCell {
  size: string;
  color: string;
  units_sold: number;
  on_hand: number;
  opening_stock: number;
  units_received: number;
  variants: number;
  stock_value_at_cost: string;
  sell_through: number | null;
}

/** `units` is a LOSS MAGNITUDE (always >= 0); `cost` is the one 4dp money field. */
export interface ShrinkageBlock {
  units: number;
  cost: string;
}

// ---------------------------------------------------------------------------
// Tone and the negative-safe formatters
// ---------------------------------------------------------------------------

export type FigureTone = 'positive' | 'negative' | 'neutral' | 'unknown';

/**
 * Tone by SIGN, not by verdict.
 *
 * A 4% sell-through is terrible news and still tones 'positive' here, because
 * this function knows the sign and nothing else. Anything that wants a verdict
 * needs a threshold, and this module does not invent thresholds — the same rule
 * `stockSeverity` follows when no reorder point is set.
 */
export const signTone = (value: number | null | undefined): FigureTone => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'unknown';
  if (value < 0) return 'negative';
  if (value > 0) return 'positive';
  return 'neutral';
};

/**
 * A FRACTION field (sell_through, gmroi, stock_turn) rendered as a percentage.
 *
 * The sign survives: -2.0 renders "-200.0%", never "200.0%". That distinction
 * is the difference between "two units came back" and "two thirds of the buy
 * sold through".
 */
export const formatFractionPercent = (fraction: number | null | undefined, digits = 1): string =>
  formatPercent(fraction === null || fraction === undefined ? null : fraction * 100, digits);

/**
 * A field that is ALREADY a percent (`gross_margin_pct`, which the backend
 * multiplies by 100 before sending).
 *
 * It exists for its name. `gross_margin_pct` sits in the same object as
 * `gmroi`, and passing it to `formatFractionPercent` renders 66.67% as 6666.7%
 * — a number nobody double-takes at because percentages over 100 are ordinary
 * on this screen.
 */
export const formatPercentValue = (percent: number | null | undefined, digits = 1): string => formatPercent(percent, digits);

/** GMROI and stock turn read as multiples, not percentages: "-0.40×", "2.50×". */
export const formatTurns = (value: number | null | undefined, digits = 2): string =>
  value === null || value === undefined || !Number.isFinite(value) ? EM_DASH : `${formatRatio(value, digits)}×`;

/**
 * Days of cover, told honestly in three states.
 *
 * `days_of_cover` is null exactly when velocity is 0 — nothing sold, so cover
 * is undefined rather than infinite — and negative exactly when velocity is
 * negative, which means more units came back than went out. A bare "-91 days"
 * is meaningless, so the number is shown signed WITH the reason beside it
 * rather than clamped away.
 */
export interface CoverReading {
  display: string;
  tone: FigureTone;
  /** Why the number reads the way it does; null when it is unremarkable. */
  note: string | null;
}

export const describeDaysOfCover = (daysOfCover: number | null | undefined, velocity?: number | null): CoverReading => {
  if (daysOfCover === null || daysOfCover === undefined || !Number.isFinite(daysOfCover)) {
    return {
      display: EM_DASH,
      tone: 'unknown',
      note: velocity === 0 ? 'Nothing sold in this window, so cover is undefined — not infinite.' : 'No cover figure for this window.'
    };
  }
  if (daysOfCover < 0) {
    return {
      display: `${formatRatio(daysOfCover, 1)} days`,
      tone: 'negative',
      note: NET_RETURNS_NOTE
    };
  }
  return { display: `${formatRatio(daysOfCover, 1)} days`, tone: 'neutral', note: null };
};

/**
 * Weeks of supply — the same figure as days of cover, in the unit a buyer
 * thinks in when they are placing a seasonal order.
 *
 * Signed for the same reason, and an em dash when undefined: appending the unit
 * to an unknown value would print "— weeks", which reads as a quantity of weeks
 * rather than as no answer at all.
 */
export const formatWeeksOfSupply = (weeks: number | null | undefined): string =>
  weeks === null || weeks === undefined || !Number.isFinite(weeks) ? EM_DASH : `${formatRatio(weeks, 1)} weeks`;

/**
 * True when this row is a net-returns artefact rather than a performance
 * signal: more units came back into stock in the window than left it.
 */
export const isNetReturns = (row: { units_sold?: number | null; sell_through?: number | null; daily_velocity?: number | null }): boolean =>
  (row.units_sold ?? 0) < 0 || (row.sell_through ?? 0) < 0 || (row.daily_velocity ?? 0) < 0;

// ---------------------------------------------------------------------------
// Bars and gauges
// ---------------------------------------------------------------------------

export interface SafeBar {
  /** Always within [0, 1] — safe to hand to a LinearProgress. */
  fraction: number;
  /** True when the TRUE value did not fit, so the caller shows the real number. */
  outOfRange: boolean;
}

/**
 * A drawable bar fraction plus an admission when it had to be clamped.
 *
 * A progress bar cannot draw -200% or 340%, but silently clamping is how a
 * refund artefact ends up looking like a sold-out style. The clamp is returned
 * WITH `outOfRange` so the caller can print the honest figure next to a bar
 * that is visibly pinned, instead of the bar being the only thing on screen.
 */
export const safeBarFraction = (value: number | null | undefined, max = 1): SafeBar => {
  if (value === null || value === undefined || !Number.isFinite(value)) return { fraction: 0, outOfRange: false };
  // No positive scale means there is nothing to draw against; a non-zero value
  // is then reported as out of range rather than drawn at some invented width.
  if (!Number.isFinite(max) || max <= 0) return { fraction: 0, outOfRange: value !== 0 };
  const raw = value / max;
  return { fraction: Math.min(1, Math.max(0, raw)), outOfRange: raw < 0 || raw > 1 };
};

export interface GaugeReading extends SafeBar {
  display: string;
  tone: FigureTone;
}

/**
 * Sell-through as a gauge: honest text, clamped bar, and the flag that says the
 * two disagree.
 *
 * Tone is 'negative' only for a negative value. A low positive sell-through is
 * not toned bad here because "low" needs a threshold nobody has set, and a
 * buying screen that paints half the catalogue red on day one gets ignored.
 */
export const sellThroughGauge = (fraction: number | null | undefined): GaugeReading => ({
  display: formatFractionPercent(fraction),
  tone: fraction === null || fraction === undefined || !Number.isFinite(fraction) ? 'unknown' : fraction < 0 ? 'negative' : 'neutral',
  ...safeBarFraction(fraction ?? null, 1)
});

// ---------------------------------------------------------------------------
// Absent vs empty
// ---------------------------------------------------------------------------

export type DataPresence = 'absent' | 'empty' | 'present';

/**
 * Nothing loaded, versus loaded and there is nothing to show.
 *
 * The finance precedent: `{points: [], total: 0}` renders nothing at all, while
 * four zero buckets render an explicit empty state. They are different claims —
 * "we have not got the data" versus "we have the data and the answer is none" —
 * and collapsing them into one grey box turns a failed request into a
 * confident statement about the business.
 */
export const presenceOf = (payload: unknown, rows: readonly unknown[] | null | undefined): DataPresence => {
  if (payload === null || payload === undefined) return 'absent';
  // A present payload whose rows key is missing is a shape we do not recognise;
  // reading it as empty is the safe half of that mistake.
  if (!rows || rows.length === 0) return 'empty';
  return 'present';
};

/**
 * The sentence for an empty panel, or null when there should be no sentence.
 *
 * 'absent' deliberately gets nothing: "No sales in this window" is a claim
 * about the shop, and we cannot make it from a request that never arrived.
 */
export const emptyMessageFor = (presence: DataPresence, subject: string): string | null =>
  presence === 'empty' ? `No ${subject} in this window.` : null;

/**
 * True when every figure given is a real, loaded zero.
 *
 * Accepts money strings and numbers alike, because "0.0000" and 0 are the same
 * claim on this API, and an unknown value (null, blank, garbage) is never zero —
 * that is the em-dash case, not the "nothing happened" case.
 *
 * An empty list is NOT all-zero: there were no figures to be zero, which is the
 * absent case and a different sentence.
 */
export const allZero = (values: Array<string | number | null | undefined>): boolean =>
  values.length > 0 &&
  values.every((value) => {
    if (typeof value === 'number') return value === 0;
    const money = readMoney(value);
    return money.known && money.scaled === 0n;
  });

// ---------------------------------------------------------------------------
// The 999 sentinel
// ---------------------------------------------------------------------------

/**
 * `analytics.slow_movers()` — the primitive behind the insights OverstockCard —
 * substitutes 999 days of cover when velocity is zero, and it is kept on
 * purpose: the value is persisted in an OverstockInsight payload and fed to an
 * LLM, so changing it would rewrite history.
 *
 * The Session 4 endpoints return NULL for the same condition, their own module
 * docstring calling 999 "a lie that sorts". So the same item can read 999 on
 * one surface and an em dash on another, and 999 must never reach a screen as a
 * number of days.
 */
export const NEVER_SOLD_SENTINEL = 999;

/**
 * Sentinel detection. `velocity` is authoritative when it is available, because
 * `velocity <= 0` is the exact condition the backend substitutes 999 for — and
 * a genuine 999.0 days of cover at a real selling rate is an ordinary number
 * that must keep reading as one. Without velocity, the value 999 is the only
 * signal there is, so it is taken at face value.
 *
 * A NEGATIVE velocity also produces the sentinel upstream, but it means
 * something else entirely: those rows carry `netReturns` and should be labelled
 * from that, not from this.
 */
export const isNeverSold = (daysOnHand: number | null | undefined, velocity?: number | null): boolean => {
  if (velocity !== null && velocity !== undefined && Number.isFinite(velocity)) return velocity <= 0;
  return daysOnHand === NEVER_SOLD_SENTINEL;
};

/** "Never sold" for the sentinel, an em dash for unknown, otherwise days. */
export const formatDaysOnHand = (daysOnHand: number | null | undefined, velocity?: number | null): string => {
  if (isNeverSold(daysOnHand, velocity)) return 'Never sold';
  if (daysOnHand === null || daysOnHand === undefined || !Number.isFinite(daysOnHand)) return EM_DASH;
  return `${formatRatio(daysOnHand, 1)} days`;
};

/** One slow-moving row, however it was sourced. */
export interface SlowMoverView {
  /** Stable across renders: the id when there is one, else the name. */
  key: string;
  name: string;
  unitsOnHand: number;
  /** null = undefined (no velocity). The 999 sentinel never survives to here. */
  daysOfCover: number | null;
  neverSold: boolean;
  /** True when returns outran sales in the window — not a slow seller. */
  netReturns: boolean;
  capitalTied: string | null;
  sellThrough: number | null;
}

/** The legacy insights payload, whose `days_on_hand` carries the 999 sentinel. */
export interface InsightsSlowMover {
  item_name: string;
  sku?: string;
  quantity_on_hand: number;
  sales_velocity: number;
  days_on_hand: number;
  capital_tied: number;
  units_sold_in_period: number;
}

/**
 * Read a legacy overstock row, converting the sentinel into the flag it always
 * meant. Nothing downstream then has to remember the number 999.
 */
export const fromInsightsSlowMover = (row: InsightsSlowMover): SlowMoverView => {
  const neverSold = isNeverSold(row.days_on_hand, row.sales_velocity);
  return {
    key: row.sku || row.item_name,
    name: row.item_name,
    unitsOnHand: row.quantity_on_hand,
    daysOfCover: neverSold ? null : row.days_on_hand,
    neverSold,
    netReturns: (row.units_sold_in_period ?? 0) < 0 || (row.sales_velocity ?? 0) < 0,
    capitalTied: typeof row.capital_tied === 'number' ? row.capital_tied.toFixed(2) : null,
    sellThrough: null
  };
};

/**
 * Read a low-performer row into the same shape, so §3.5's "feed the existing
 * OverstockCard rather than duplicate it" has one row type to feed it with.
 *
 * `days_of_cover` is null here exactly when velocity is zero, which is the same
 * condition the legacy 999 encodes — so the two surfaces converge instead of
 * disagreeing on screen.
 */
export const fromLowPerformer = (row: LowPerformerRow): SlowMoverView => ({
  key: String(row.inventory_item_id),
  name: row.name,
  unitsOnHand: row.on_hand,
  daysOfCover: row.days_of_cover,
  neverSold: row.daily_velocity === 0,
  netReturns: isNetReturns(row),
  capitalTied: row.capital_tied,
  sellThrough: row.sell_through
});

/**
 * The scale a set of slow-mover bars should be drawn against.
 *
 * Sentinel and negative rows are excluded from the maximum: one never-sold item
 * at 999 flattens every real bar to a sliver, which is precisely how the
 * sentinel "sorts" its way into a chart. Floored at 1 so a bar is never divided
 * by zero.
 *
 * Folded rather than spread into `Math.max`: these endpoints do not paginate,
 * so the array is as long as the catalogue and a spread of it is an argument
 * list long enough to overflow the stack.
 */
export const slowMoverScaleMax = (rows: SlowMoverView[]): number =>
  rows.reduce((max, row) => (!row.neverSold && (row.daysOfCover ?? 0) > max ? (row.daysOfCover as number) : max), 1);

/**
 * A slow-mover bar.
 *
 * A never-sold row pins the bar full and says so, flagged out of range because
 * "forever" is not on the scale. A net-returns row is checked FIRST: its cover
 * is negative, which is off the bottom of the same scale, and calling it "never
 * sold" would be the opposite of what happened — it sold and came back.
 */
export const slowMoverBar = (row: SlowMoverView, scaleMax: number): GaugeReading => {
  if (row.netReturns) return { display: 'Net returns', tone: 'negative', fraction: 0, outOfRange: true };
  if (row.neverSold) return { display: 'Never sold', tone: 'negative', fraction: 1, outOfRange: true };
  const cover = describeDaysOfCover(row.daysOfCover);
  return { display: cover.display, tone: cover.tone, ...safeBarFraction(row.daysOfCover, scaleMax) };
};

// ---------------------------------------------------------------------------
// Aging
// ---------------------------------------------------------------------------

/** The five numeric buckets, always present, always in this order. */
export const AGING_BUCKET_ORDER = ['0-30', '30-60', '60-90', '90-180', '180+'] as const;

/** Appended by the backend ONLY when it has items, so never index positionally. */
export const UNKNOWN_AGE_BUCKET = 'unknown';

const AGING_BUCKET_LABELS: Record<string, string> = {
  '0-30': 'Under 30 days',
  '30-60': '30 to 60 days',
  '60-90': '60 to 90 days',
  '90-180': '90 to 180 days',
  '180+': 'Over 180 days',
  unknown: 'Age unknown'
};

/** Boundaries are low <= age < high, so an age of exactly 30 is in "30-60". */
export const agingBucketLabel = (label: string): string => AGING_BUCKET_LABELS[label] ?? label;

/**
 * The buckets in a fixed, index-safe order: the five numeric ones zero-filled
 * when the backend omitted them, then "unknown" LAST and only when it has
 * something in it.
 *
 * The backend appends "unknown" conditionally, so `buckets[5]` is sometimes
 * undefined and sometimes the unknown bucket. Reading it by label is the only
 * form that cannot silently shift.
 */
export const orderedAgingBuckets = (buckets: AgingBucket[] | null | undefined): AgingBucket[] => {
  const byLabel = new Map((buckets ?? []).map((bucket) => [bucket.label, bucket]));
  const ordered: AgingBucket[] = AGING_BUCKET_ORDER.map(
    (label) => byLabel.get(label) ?? { label, units: 0, capital_tied: '0.00', items: 0 }
  );
  const unknown = byLabel.get(UNKNOWN_AGE_BUCKET);
  if (unknown && unknown.items > 0) ordered.push(unknown);
  return ordered;
};

/**
 * Oldest first, with UNKNOWN AGE LAST.
 *
 * "We do not know when this arrived" is not "this is ancient". A markdown list
 * headed by rows whose age is merely unrecorded sends a buyer to discount stock
 * that might have landed yesterday, so an unknown age sorts to the bottom — the
 * same key the backend uses, restated here because any client-side re-sort
 * (by capital, by name) has to preserve it.
 */
export const sortByAge = <T extends { age_days: number | null }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => {
    const aUnknown = a.age_days === null || a.age_days === undefined;
    const bUnknown = b.age_days === null || b.age_days === undefined;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    if (aUnknown) return 0;
    return (b.age_days as number) - (a.age_days as number);
  });

/** A React key for an aging row: the id alone REPEATS across locations. */
export const agingRowKey = (row: Pick<AgingRow, 'inventory_item_id' | 'location_id'>): string =>
  `${row.inventory_item_id}:${row.location_id}`;

/** "45 days", or an em dash when no inbound movement was ever recorded. */
export const formatAgeDays = (ageDays: number | null | undefined): string =>
  ageDays === null || ageDays === undefined || !Number.isFinite(ageDays) ? EM_DASH : `${ageDays} days`;

const AGING_APPROXIMATION_FALLBACK =
  'Age is days since the most recent inbound movement for the units on hand at that location. It dates the batch, not each unit.';

/**
 * The caveat the aging panel carries.
 *
 * The endpoint ships its own `approximation` sentence; we print THAT rather
 * than a copy, so if the backend's method changes the screen stops claiming the
 * old one. The fallback exists only for a payload that predates the field.
 */
export const agingCaveat = (approximation: string | null | undefined): string =>
  typeof approximation === 'string' && approximation.trim() ? approximation.trim() : AGING_APPROXIMATION_FALLBACK;

// ---------------------------------------------------------------------------
// The window, and saying so on the artefact
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * A strict, zero-padded, real calendar date.
 *
 * Python 3.10's `date.fromisoformat` is strict, so "2026-1-1", "20260101" and
 * "2026-01-01T00:00:00" are all 400s. The day is checked against the month as
 * well, because "2026-02-30" parses as a shape and exists in no calendar.
 */
export const isCalendarDate = (value: unknown): boolean => {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
};

/**
 * "2026-08-05" as "5 Aug 2026", built from the string's own parts.
 *
 * Deliberately not `new Date('2026-08-05')`: that parses a bare date as UTC
 * midnight, which is the PREVIOUS DAY everywhere west of Greenwich. A window
 * caption that says "to 4 Aug" for a window ending on the 5th is a small lie
 * that makes every figure under it unverifiable.
 */
export const formatWindowDate = (iso: string | null | undefined): string => {
  if (!isCalendarDate(iso)) return EM_DASH;
  const [year, month, day] = (iso as string).split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
};

/** Inclusive day count, or null when either end is unusable. */
export const daysInclusive = (start: string | null | undefined, end: string | null | undefined): number | null => {
  if (!isCalendarDate(start) || !isCalendarDate(end)) return null;
  const [ys, ms, ds] = (start as string).split('-').map(Number);
  const [ye, me, de] = (end as string).split('-').map(Number);
  const span = Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds);
  const days = Math.round(span / 86400000) + 1;
  return days > 0 ? days : null;
};

const windowDays = (window: AnalyticsWindow): number | null => {
  // The server's own count is preferred: it is what the figures were computed
  // over, and it is inclusive (a 90-day default window reports 91).
  if (Number.isInteger(window.days) && window.days > 0) return window.days;
  return daysInclusive(window.start, window.end);
};

/**
 * The caption every insights artefact carries: "30 days to 5 Aug 2026".
 *
 * Not optional decoration. Every figure on these screens is true only of its
 * window, and a chart exported, screenshotted or pasted into a message loses
 * the picker that produced it. The window has to travel WITH the numbers.
 */
export const describeWindow = (window: AnalyticsWindow | null | undefined): string => {
  if (!window || !isCalendarDate(window.end)) return EM_DASH;
  const days = windowDays(window);
  const ending = formatWindowDate(window.end);
  if (days === null) return `to ${ending}`;
  return `${days} ${days === 1 ? 'day' : 'days'} to ${ending}`;
};

/** The same window spelled out: "7 Jul 2026 – 5 Aug 2026". */
export const describeWindowRange = (window: AnalyticsWindow | null | undefined): string => {
  if (!window || !isCalendarDate(window.start) || !isCalendarDate(window.end)) return EM_DASH;
  return `${formatWindowDate(window.start)} – ${formatWindowDate(window.end)}`;
};

/** The scope line beside the window: a location name, or the whole company. */
export const describeScope = (envelope: Pick<AnalyticsEnvelope, 'location_name'> | null | undefined): string =>
  envelope?.location_name ? envelope.location_name : 'All locations';

/**
 * A Date as "YYYY-MM-DD" in the BROWSER'S OWN calendar day.
 *
 * `toISOString().slice(0, 10)` is the obvious version and it is wrong for half
 * the planet: it converts to UTC first, so at 19:00 in New York it returns
 * tomorrow's date. A picker that defaults to "today" would then request a day
 * that has not happened yet, and — because the caption is rendered from the
 * response envelope — the screen would faithfully report a window the user
 * never chose.
 */
export const isoDateOf = (date: Date): string => {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface WindowPreset {
  days: number;
  label: string;
}

/** The offered windows. 90 matches the server's own default span. */
export const WINDOW_PRESETS: WindowPreset[] = [
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 180, label: 'Last 180 days' },
  { days: 365, label: 'Last 12 months' }
];

/**
 * `days` calendar days ending today, INCLUSIVE at both ends.
 *
 * The server's window is inclusive — `window.days` counts both ends, which is
 * why its own 90-day default reports 91 — so "last 30 days" spans today and the
 * 29 days before it and comes back as 30, not 31. Getting this off by one is
 * invisible on screen and shifts every ratio on it.
 *
 * Built from local calendar parts so a preset chosen late in the evening does
 * not silently become tomorrow's window; see `isoDateOf`.
 */
export const presetWindow = (days: number, today: Date = new Date()): { start: string; end: string } => {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (Math.max(1, Math.trunc(days)) - 1));
  return { start: isoDateOf(start), end: isoDateOf(end) };
};

// ---------------------------------------------------------------------------
// Query builders — the params that 500 if you get them wrong
// ---------------------------------------------------------------------------

const buildQuery = (pairs: Array<[string, string]>): string => {
  const params = new URLSearchParams();
  pairs.forEach(([key, value]) => params.append(key, value));
  return params.toString();
};

export interface AnalyticsQuery {
  start?: string | null;
  end?: string | null;
  locationId?: string | null;
}

const windowPairs = (query: AnalyticsQuery): Array<[string, string]> => {
  const pairs: Array<[string, string]> = [];
  // A malformed date is only a 400, but a request we know will fail is not
  // worth sending: omitting falls back to the server's default window, which
  // the caption then reports honestly from the response envelope.
  if (isCalendarDate(query.start) && isCalendarDate(query.end) && daysInclusive(query.start, query.end) === null) return pairs;
  if (isCalendarDate(query.start)) pairs.push(['start', query.start as string]);
  if (isCalendarDate(query.end)) pairs.push(['end', query.end as string]);
  return pairs;
};

/**
 * The shared `?start=&end=&location_id=` for all seven analytics endpoints.
 *
 * A NON-UUID `location_id` IS AN UNCAUGHT 500 with an HTML body — the view
 * feeds it straight into a UUIDField filter and Django's ValidationError
 * escapes DRF's handler, so `response.json()` throws before any error key can
 * be read. Anything that is not a uuid is therefore omitted and the panel comes
 * back unscoped, which is a page rather than an error page. Use `isUuid` at the
 * call site if the filter should be greyed out instead.
 *
 * `start > end` is dropped whole rather than half, so a mid-edit date picker
 * cannot silently apply one end of a range the user has not finished typing.
 */
export const analyticsQuery = (query: AnalyticsQuery = {}): string => {
  const pairs = windowPairs(query);
  if (isUuid(query.locationId)) pairs.push(['location_id', (query.locationId as string).trim()]);
  return buildQuery(pairs);
};

export interface LowPerformersQuery extends AnalyticsQuery {
  limit?: number | null;
  minCapital?: number | string | null;
}

const PLAIN_DECIMAL_RE = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * `?limit=` and `?min_capital=` on top of the shared window.
 *
 * `min_capital=NaN` IS A SECOND UNCAUGHT 500: `Decimal("NaN")` constructs
 * happily, survives the view's try/except, and then raises InvalidOperation on
 * the first comparison. `Infinity` is legal but returns nothing, and exponent
 * notation is what `String(1e21)` produces — so only plain decimal text is sent
 * and everything else is omitted.
 *
 * `limit` is clamped to the server's own [1, 200] and must be an integer: a
 * float or an empty string is a 400 from `int()`.
 */
export const lowPerformersQuery = (query: LowPerformersQuery = {}): string => {
  const pairs = windowPairs(query);
  if (isUuid(query.locationId)) pairs.push(['location_id', (query.locationId as string).trim()]);
  if (typeof query.limit === 'number' && Number.isInteger(query.limit)) {
    pairs.push(['limit', String(Math.min(200, Math.max(1, query.limit)))]);
  }
  const minCapital = query.minCapital;
  if (minCapital !== null && minCapital !== undefined && minCapital !== '') {
    const text = typeof minCapital === 'number' ? (Number.isFinite(minCapital) ? String(minCapital) : '') : String(minCapital).trim();
    if (PLAIN_DECIMAL_RE.test(text)) pairs.push(['min_capital', text]);
  }
  return buildQuery(pairs);
};

export interface MatrixQuery extends AnalyticsQuery {
  productId?: string | null;
  category?: string | null;
}

/**
 * The matrix query. `product_id` has the SAME uncaught-500 trap as
 * `location_id`, so it is uuid-gated too. `category` cannot 500 and is matched
 * case-insensitively; blank means no filter.
 *
 * `product_id` wins over `category` server-side, so both are sent as given and
 * the caller decides which control is live.
 */
export const matrixQuery = (query: MatrixQuery = {}): string => {
  const pairs = windowPairs(query);
  if (isUuid(query.locationId)) pairs.push(['location_id', (query.locationId as string).trim()]);
  if (isUuid(query.productId)) pairs.push(['product_id', (query.productId as string).trim()]);
  const category = (query.category ?? '').trim();
  if (category) pairs.push(['category', category]);
  return buildQuery(pairs);
};

/**
 * The item id for `/inventory/items/{id}/analytics/`, or null when it is not
 * usable.
 *
 * `InventoryItem`'s pk is an INTEGER, unlike Location and Product. A
 * non-integer segment misses Django's URL resolver entirely and returns a 404
 * with an HTML body, so a client that assumes JSON error shapes fails to parse
 * its own error.
 */
export const itemAnalyticsId = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return parsed > 0 ? parsed : null;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Low performers
// ---------------------------------------------------------------------------

export interface LowPerformerRanking<T> {
  /** Genuine markdown candidates, in the backend's own rank order. */
  candidates: T[];
  /** Rows whose window is dominated by returns — listed, but not as failures. */
  netReturns: T[];
}

/**
 * Split, never re-sort.
 *
 * The backend ranks by sell_through ASCENDING with capital DESCENDING as the
 * tiebreak, which is right — except that a NEGATIVE sell-through is the
 * smallest number of all, so a single refund with no matching in-window sale
 * takes the top of the markdown list. That row is not the worst seller; it is
 * an item that sold and came back, and its window says nothing about demand.
 *
 * So negatives are partitioned OUT and shown after the real candidates, under
 * their own explanation. Order inside each partition is untouched — the sort is
 * stable and the backend's rank is the one on screen.
 */
export const rankLowPerformers = <T extends { sell_through: number | null; units_sold?: number; daily_velocity?: number }>(
  rows: T[] | null | undefined
): LowPerformerRanking<T> => {
  const candidates: T[] = [];
  const netReturns: T[] = [];
  (rows ?? []).forEach((row) => {
    if ((row.sell_through ?? 0) < 0) netReturns.push(row);
    else candidates.push(row);
  });
  return { candidates, netReturns };
};

/** The two partitions as one list, for a single-table view. */
export const orderLowPerformers = <T extends { sell_through: number | null }>(rows: T[] | null | undefined): T[] => {
  const { candidates, netReturns } = rankLowPerformers(rows);
  return [...candidates, ...netReturns];
};

/**
 * `total_capital_tied` is summed over the TRUNCATED list — 760.00 unlimited,
 * 180.00 with limit=1 — so it is never a company or portfolio total. Labelling
 * it as one invites someone to reconcile it with the balance sheet.
 */
export const describeLowPerformerTotal = (total: string | number | null | undefined, listed: number): string =>
  `${formatMoney(total)} tied up in the ${listed} listed ${listed === 1 ? 'item' : 'items'}`;

// ---------------------------------------------------------------------------
// Roll-ups — recomputed from summed inputs, never averaged
// ---------------------------------------------------------------------------

const SCALED_PLACES = 4;

/** Exact ten-thousandths back to plain decimal text, the shape the wire uses. */
const decimalText = (scaled: bigint): string => {
  const negative = scaled < 0n;
  const digits = (negative ? -scaled : scaled).toString().padStart(SCALED_PLACES + 1, '0');
  return `${negative ? '-' : ''}${digits.slice(0, -SCALED_PLACES)}.${digits.slice(-SCALED_PLACES)}`;
};

const sumMoney = (values: Array<string | number | null | undefined>): bigint =>
  values.reduce<bigint>((total, value) => total + readMoney(value).scaled, 0n);

export interface SellThroughInputs {
  opening_stock: number;
  units_received: number;
  units_sold: number;
}

/**
 * Sell-through for a GROUP, recomputed from summed units.
 *
 * THE RULE, inherited from Session 4's backend: a roll-up recomputes its ratio
 * from summed inputs and never averages the per-row ratios. A style with one
 * unit that sold and one with ninety-nine that did not is 1% sold through, not
 * 50% — averaging weights a single unit exactly as heavily as a hundred, and
 * the answer it gives is not merely imprecise, it is a different number that
 * points a buyer the other way.
 *
 * Null when the denominator is not positive: nothing was ever stocked (the
 * backend's own null condition), or the derived opening stock has undershot
 * into negative territory, where a ratio has no meaning worth printing.
 */
export const rollUpSellThrough = (rows: SellThroughInputs[] | null | undefined): number | null => {
  const list = rows ?? [];
  const sold = list.reduce((total, row) => total + (row.units_sold ?? 0), 0);
  const base = list.reduce((total, row) => total + (row.opening_stock ?? 0) + (row.units_received ?? 0), 0);
  return ratioOf(sold, base);
};

export interface UnitsRollUp extends SellThroughInputs {
  on_hand: number;
  sell_through: number | null;
}

/** The same recomputation over matrix cells, aggregates or per-location rows. */
export const rollUpUnits = (rows: Array<Partial<SellThroughInputs> & { on_hand?: number }> | null | undefined): UnitsRollUp => {
  const totals = (rows ?? []).reduce<SellThroughInputs & { on_hand: number }>(
    (acc, row) => ({
      opening_stock: acc.opening_stock + (row.opening_stock ?? 0),
      units_received: acc.units_received + (row.units_received ?? 0),
      units_sold: acc.units_sold + (row.units_sold ?? 0),
      on_hand: acc.on_hand + (row.on_hand ?? 0)
    }),
    { opening_stock: 0, units_received: 0, units_sold: 0, on_hand: 0 }
  );
  return { ...totals, sell_through: rollUpSellThrough([totals]) };
};

/**
 * A margin block for a selection of rows, recomputed the same way.
 *
 * Money is summed as exact ten-thousandths and the ratios are derived at the
 * end, so a selection of three locations gives the same margin the backend
 * would give for those three — not the mean of three percentages, which is a
 * different number whenever the locations differ in size.
 */
export const rollUpGmroi = (blocks: GmroiBlock[] | null | undefined): GmroiBlock => {
  const list = blocks ?? [];
  const revenue = sumMoney(list.map((block) => block.revenue));
  const cogs = sumMoney(list.map((block) => block.cogs));
  const margin = sumMoney(list.map((block) => block.gross_margin));
  const average = sumMoney(list.map((block) => block.average_inventory_cost));
  return {
    revenue: decimalText(revenue),
    cogs: decimalText(cogs),
    gross_margin: decimalText(margin),
    gross_margin_pct: marginOf(Number(margin), Number(revenue)),
    average_inventory_cost: decimalText(average),
    gmroi: ratioOf(Number(margin), Number(average)),
    stock_turn: ratioOf(Number(cogs), Number(average))
  };
};

/** Every figure in a margin block, formatted and toned in one pass. */
export interface GmroiDisplay {
  revenue: string;
  cogs: string;
  grossMargin: string;
  grossMarginPct: string;
  averageInventoryCost: string;
  gmroi: string;
  stockTurn: string;
  marginTone: FigureTone;
  gmroiTone: FigureTone;
}

export const describeGmroi = (block: GmroiBlock | null | undefined): GmroiDisplay => ({
  revenue: formatMoney(block?.revenue),
  cogs: formatMoney(block?.cogs),
  // Signed and exact: "-$40.00". An unsigned currency formatter here shows a
  // loss as a profit, which is reality (3) at the top of this file.
  grossMargin: formatMoney(block?.gross_margin),
  // ALREADY a percent — multiplying it renders -400% as -40000%.
  grossMarginPct: formatPercentValue(block?.gross_margin_pct ?? null),
  averageInventoryCost: formatMoney(block?.average_inventory_cost),
  gmroi: formatTurns(block?.gmroi ?? null),
  stockTurn: formatTurns(block?.stock_turn ?? null),
  marginTone: signTone(block?.gross_margin_pct ?? null),
  gmroiTone: signTone(block?.gmroi ?? null)
});

// ---------------------------------------------------------------------------
// The style matrix
// ---------------------------------------------------------------------------

export const BLANK_SIZE_LABEL = 'One size';
export const BLANK_COLOUR_LABEL = 'No colour';

export interface MatrixAxes {
  sizes: string[];
  colors: string[];
  /** True when a blank axis entry had to be added to reach a real cell. */
  addedBlankSize: boolean;
  addedBlankColor: boolean;
}

/**
 * The axes a grid can actually be drawn on.
 *
 * THE BACKEND'S AXES DROP BLANKS: `sizes`/`colors` are built with `if
 * row['size']`, but cells are keyed `(size or '', color or '')`. A one-size,
 * no-colour variant therefore produces a REAL cell at ("", "") that no
 * sizes x colors intersection ever reaches — verified live with 4 units and $20
 * of capital simply absent from the grid. Adding the blank axis entry is what
 * puts that stock back on screen.
 */
export const matrixAxes = (
  cells: MatrixCell[] | null | undefined,
  sizes: string[] | null | undefined,
  colors: string[] | null | undefined
): MatrixAxes => {
  const list = cells ?? [];
  const sizeAxis = [...(sizes ?? [])];
  const colorAxis = [...(colors ?? [])];
  const addedBlankSize = list.some((cell) => !cell.size) && !sizeAxis.includes('');
  const addedBlankColor = list.some((cell) => !cell.color) && !colorAxis.includes('');
  if (addedBlankSize) sizeAxis.push('');
  if (addedBlankColor) colorAxis.push('');
  return { sizes: sizeAxis, colors: colorAxis, addedBlankSize, addedBlankColor };
};

/**
 * Cells arrive as a FLAT SPARSE list sorted by (color, size), not a 2-D array,
 * so a grid is built by lookup rather than by index.
 *
 * The separator is a control character rather than a space or a pipe: sizes and
 * colours are free text, and ("XS L", "Ivory") must not collide with ("XS",
 * "L Ivory") into one cell.
 */
export const matrixCellKey = (size: string, color: string): string => `${size}\u001f${color}`;

export const matrixIndex = (cells: MatrixCell[] | null | undefined): Map<string, MatrixCell> =>
  new Map((cells ?? []).map((cell) => [matrixCellKey(cell.size ?? '', cell.color ?? ''), cell]));

/**
 * A missing intersection is EMPTY, not zero: the backend omits combinations
 * that do not exist, and drawing a 0 there claims a variant exists and has
 * never sold.
 */
export const matrixCellAt = (index: Map<string, MatrixCell>, size: string, color: string): MatrixCell | null =>
  index.get(matrixCellKey(size, color)) ?? null;

/** The label for an axis value, since a blank is a real, nameable variant. */
export const matrixAxisLabel = (value: string, axis: 'size' | 'color'): string =>
  value ? value : axis === 'size' ? BLANK_SIZE_LABEL : BLANK_COLOUR_LABEL;

/**
 * The label for a `by_size` / `by_color` / `by_category` / `by_style` key.
 *
 * THE BLANK IS SPELLED THREE WAYS IN ONE RESPONSE: the matrix's `cells` use
 * `""`, `by_size` and `by_color` use the literal string `"-"`, and `by_category`
 * uses `"Uncategorized"`. Printing `"-"` verbatim reads as a missing value on a
 * screen whose entire convention is that a dash means unknown — but that row is
 * not unknown. It is every one-size garment in the shop, with real units and
 * real capital behind it, and it is frequently the largest bar on the chart.
 */
export const aggKeyLabel = (key: string, dimension: 'size' | 'color' | 'category' | 'style'): string => {
  const trimmed = (key ?? '').trim();
  const blank = trimmed === '' || trimmed === '-';
  if (dimension === 'size' && blank) return BLANK_SIZE_LABEL;
  if (dimension === 'color' && blank) return BLANK_COLOUR_LABEL;
  // A style or category genuinely has no blank spelling on this wire (style
  // falls back to the variant name, category to "Uncategorized"), so an empty
  // key here is a shape we do not recognise and reads as unknown.
  return trimmed === '' ? EM_DASH : trimmed;
};

// ---------------------------------------------------------------------------
// Charting
// ---------------------------------------------------------------------------

export interface SellThroughPoint {
  label: string;
  sellThrough: number | null;
}

export interface SellThroughSeries {
  categories: string[];
  /** PERCENTAGES with the sign kept: a sell-through of -2.0 charts as -200. */
  values: number[];
  /** How many groups were left off because they were never stocked. */
  omitted: number;
}

/**
 * A sell-through bar series, with the never-stocked groups LEFT OUT rather than
 * drawn at zero.
 *
 * A null sell-through means the denominator was zero: nothing was on the shelf
 * at the start of the window and nothing arrived during it, so the ratio does
 * not exist. Charted as a 0% bar it becomes the worst performer in the shop and
 * sends a buyer to mark down stock that was never there to sell. Those groups
 * are counted out instead, so the caller can say how many are missing from the
 * chart — `toNum` would have turned every one of them into a confident zero.
 *
 * Negatives are KEPT and charted below the axis, where a returns artefact is
 * visibly not a performance figure.
 *
 * `limit` is applied after the nulls are dropped, so a "top 10" chart always
 * draws ten bars rather than however many of the first ten happened to exist.
 */
export const sellThroughSeries = (points: SellThroughPoint[] | null | undefined, limit?: number): SellThroughSeries => {
  const drawable = (points ?? []).filter((point) => point.sellThrough !== null && Number.isFinite(point.sellThrough as number));
  const omitted = (points ?? []).length - drawable.length;
  const capped = typeof limit === 'number' && limit > 0 ? drawable.slice(0, Math.trunc(limit)) : drawable;
  return {
    categories: capped.map((point) => point.label),
    values: capped.map((point) => (point.sellThrough as number) * 100),
    omitted
  };
};

// ---------------------------------------------------------------------------
// Shrinkage
// ---------------------------------------------------------------------------

export interface ShrinkageReading {
  units: string;
  cost: string;
  summary: string;
  isZero: boolean;
  tone: FigureTone;
}

/**
 * Shrinkage, read as a loss.
 *
 * `units` is `abs(SUM(delta))` and is therefore always >= 0 — a MAGNITUDE, not
 * a signed delta. Printing "-12" here would double the minus sign already
 * implied by the word "lost", and printing "+12" would be grotesque.
 *
 * Zero is a real, loaded answer ("nothing went missing"), not a missing one, so
 * it gets a sentence rather than an em dash. Only negative movements count, so
 * found stock never offsets a loss.
 */
export const describeShrinkage = (block: ShrinkageBlock | null | undefined): ShrinkageReading => {
  if (!block) {
    return { units: EM_DASH, cost: EM_DASH, summary: EM_DASH, isZero: false, tone: 'unknown' };
  }
  const units = block.units ?? 0;
  const cost = readMoney(block.cost);
  const isZero = units === 0 && cost.known && cost.scaled === 0n;
  return {
    units: formatQuantity(units),
    // 4dp on the wire; the exact reader keeps all four and rounds only to show.
    cost: formatMoney(block.cost),
    summary: isZero
      ? 'No shrinkage recorded in this window'
      : `${formatQuantity(units)} ${units === 1 ? 'unit' : 'units'} lost, ${formatMoney(block.cost)} at cost`,
    isZero,
    tone: isZero ? 'neutral' : 'negative'
  };
};

// ---------------------------------------------------------------------------
// The sentences an artefact has to carry
// ---------------------------------------------------------------------------

/**
 * The definition, verbatim enough that a buyer can check the arithmetic.
 *
 * The last clause is the one that stops a support ticket: the same style shows
 * a DIFFERENT company-wide figure than the sum of its locations, because
 * company-wide `units_received` counts only purchase receipts and opening
 * stock, while a location's also counts what was transferred in. Both are
 * correct. Without this sentence one of them looks broken.
 */
export const SELL_THROUGH_DEFINITION =
  'Sell-through = units sold ÷ (opening stock + units received). Units sold is net of returns that came back into stock. ' +
  'Company-wide, units received counts purchase receipts and opening stock only; per location it also counts stock transferred in — ' +
  'so a style’s company-wide figure will not equal the sum of its locations.';

export const sellThroughDefinitionFor = (scope: 'company' | 'location'): string =>
  scope === 'location'
    ? `${SELL_THROUGH_DEFINITION} This view is per location, so transfers in are counted as received.`
    : `${SELL_THROUGH_DEFINITION} This view is company-wide, so transfers between your own locations are not counted as received.`;

/** Reality (4): the reconciliation that will not reconcile, said out loud. */
export const ARCHIVED_VARIANTS_CAVEAT =
  'These figures include archived variants; the dashboard’s inventory value excludes them, so a capital total here will not tie out to it.';

/** Reality (1) and (2), for a row a reader is about to distrust. */
export const NET_RETURNS_NOTE =
  'More units came back into stock than left it in this window, so this reads negative. It is a returns artefact, not a demand signal.';

/** Aging measures as of now over all history — the window does not touch it. */
export const AGING_IGNORES_WINDOW_NOTE = 'Ages are measured as of today over all history, so the date window does not change them.';

/** Four of the seven endpoints cache for 5 minutes with no write invalidation. */
export const ANALYTICS_STALENESS_NOTE =
  'Sell-through, aging, location and shrinkage figures are cached for up to 5 minutes, so a stock change made just now may not appear yet.';

/** Per-location units received includes transfers in; the sum is not a total. */
export const LOCATION_SCOPE_CAVEAT =
  'Per-location units received includes stock transferred in from your other locations, so these rows do not add up to the company figures.';

/** /analytics/locations/ validates and echoes location_id but never applies it. */
export const LOCATION_FILTER_IGNORED_NOTE =
  'This comparison always covers every location. The location filter above is not applied here — the endpoint reports it back but computes every store regardless.';

/** The reconciliation between this screen and Insights › Overstock Detection. */
export const OVERSTOCK_DIVERGENCE_NOTE =
  'Insights › Overstock Detection answers a similar question from an older figure, and the two will not always agree: it reports 999 days of cover for an item that has never sold, while this screen reports “Never sold”, and its capital total covers every slow mover rather than only the candidates listed here. Where they differ, this screen is the newer definition.';

// ---------------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------------

/**
 * Any analytics failure as one sentence.
 *
 * FOUR body shapes reach here and two of them are not JSON. A malformed
 * `location_id`, `product_id` or `min_capital` is an UNCAUGHT 500 whose body is
 * Django's HTML error page, so `response.json()` throws before any key can be
 * read and `parseApiError` correctly finds nothing.
 *
 * The query builders above make that unreachable by omitting anything that is
 * not a uuid or a plain decimal — which is exactly why a 500 that arrives
 * anyway must NOT be worded as a bad filter. It is a server fault, and telling
 * the user to fix their input would send them looking for a mistake they did
 * not make.
 */
export const describeAnalyticsError = (err: unknown): string => {
  const status = statusOf(err);
  if (status !== null && status >= 500) {
    return 'The server could not build this view. That is a fault on our side, not a problem with your filters — try again, or pick a different window.';
  }
  const parsed = parseApiError(err);
  return parsed.isFallback ? 'Could not load these figures. Please try again.' : parsed.summary;
};
