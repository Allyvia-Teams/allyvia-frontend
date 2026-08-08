// views/inventory/reorder.ts
//
// The reorder inbox's rules, as pure functions. No React, no axios — the
// transport lives in api/inventoryReorder.api.ts and never carries logic.
//
// WHY THIS FILE IS MOSTLY ABOUT RENDERING ARITHMETIC
// The engine's own docstring states the design constraint: "a buyer asked to
// spend money on a number they cannot check will ignore the number." So the
// backend ships a 20-key `rationale` with every suggestion, and this file turns
// it into an ordered list of labelled steps that reconstruct the formula:
//
//     ceil(velocity x (lead_time + review_period + safety)) - on_hand - on_order,
//     floored at 0
//
// Two rules follow from that, and both are enforced here rather than in a
// component:
//
//   1. A MISSING KEY DEGRADES, IT DOES NOT FABRICATE. `toNum` from
//      utils/financeFormat maps null and garbage to 0 — correct for summing a
//      chart, catastrophic here, where a fabricated 0 would read as "the engine
//      measured zero" and change what somebody buys. Every reader below returns
//      null for an absent key and the step renders an em dash, exactly as
//      stockFormat.ts already does for unknown stock.
//
//   2. THE SUM IS RE-CHECKED CLIENT-SIDE. A shown sum that does not add up is
//      worse than no sum, so `checkRationaleArithmetic` recomputes the quantity
//      from the parts and says plainly when it disagrees with the server's
//      figure. It uses scaled bigint arithmetic, not floats: 0.07 * 100 is
//      7.000000000000001 in IEEE 754, whose ceiling is 8 rather than 7, and the
//      buyer would be told to order one garment too many by a rounding artefact.
//
// There is no currency in the rationale, which is why nothing here formats money
// — the reorder contract carries quantities and days only.

// isUuid is purchasing.ts's, deliberately: the reorder list endpoint 500s on a
// non-uuid filter exactly as the PO and transfer list endpoints do, and one
// regex answering all three is better than three that could drift apart.
import { isUuid } from './purchasing';
import { EM_DASH, formatQuantity } from './stockFormat';
import { formatPercent, formatRatio, marginOf } from 'utils/financeFormat';

// ---------------------------------------------------------------------------
// The wire shapes
// ---------------------------------------------------------------------------

export type ReorderStatus = 'suggested' | 'dismissed' | 'ordered' | 'superseded';

/**
 * One row of GET /inventory/reorder-suggestions/.
 *
 * Declared here rather than imported from api/inventoryReorder.api.ts because a
 * test that imports an api module fails collection outright (axios -> mockApi ->
 * sessionStorage at module load). The two declarations are structurally
 * identical, so a component may hold either.
 */
export interface ReorderSuggestion {
  id: string;
  status: ReorderStatus | string;
  status_label?: string;
  inventory_item_id?: number;
  sku?: string | null;
  name: string;
  size?: string;
  color?: string;
  location_id: string;
  location_name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  /** STRING, 4dp. */
  velocity_daily?: string;
  /** STRING 2dp, or null when velocity is zero — never "0 days of cover". */
  days_of_cover?: string | null;
  /** "YYYY-MM-DD", or null when nothing is selling and so nothing runs out. */
  forecast_stockout_date: string | null;
  /** CAN BE NEGATIVE: a suggestion generated days ago whose date has passed. */
  days_until_stockout?: number | null;
  on_hand?: number;
  on_order?: number;
  lead_time_days?: number;
  suggested_qty: number;
  suggested_reorder_point?: number;
  /** Null means nobody ever set one. It is NOT zero. */
  current_reorder_point?: number | null;
  rationale?: Rationale;
  purchase_order_id?: string | null;
  purchase_order_number?: string | null;
  dismissal_reason?: string;
  generated_at?: string;
}

/** The 20-key working. Typed loosely on purpose — every read below is guarded. */
export type Rationale = Record<string, unknown> | null | undefined;

/** The company buying policy echoed alongside the list. */
export interface ReorderPolicy {
  review_period_days: number;
  safety_days: number;
  dismissal_cooldown_days: number;
}

// ---------------------------------------------------------------------------
// Guarded readers
// ---------------------------------------------------------------------------

/**
 * Whether the engine wrote this key at all.
 *
 * Distinct from "the value is null", which is meaningful for `days_of_cover`:
 * null there means "nothing is selling, so it never runs out". Absent means the
 * engine did not record it, and the two must not read the same on screen.
 */
export const hasRationaleKey = (rationale: Rationale, key: string): boolean =>
  !!rationale && Object.prototype.hasOwnProperty.call(rationale, key);

/** An integer input, or null when it is absent or unreadable. Never 0 by default. */
const readInt = (rationale: Rationale, key: string): number | null => {
  const raw = rationale?.[key];
  if (raw === null || raw === undefined || raw === '') return null;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
};

/** A decimal input (a 2dp or 4dp string on this wire), or null. Never 0 by default. */
const readDecimal = (rationale: Rationale, key: string): number | null => {
  const raw = rationale?.[key];
  if (raw === null || raw === undefined || raw === '') return null;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

/** A string input, or null. Blank counts as absent — a blank label helps nobody. */
const readText = (rationale: Rationale, key: string): string | null => {
  const raw = rationale?.[key];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
};

/** `lead_time_observations` — always an array on the wire, defensive anyway. */
const readObservations = (rationale: Rationale): number[] => {
  const raw = rationale?.['lead_time_observations'];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => (typeof entry === 'number' ? entry : Number(entry))).filter((entry) => Number.isFinite(entry));
};

/** Append a unit without ever producing "— days" for an unknown value. */
const withUnit = (text: string, unit: string): string => (text === EM_DASH ? text : `${text} ${unit}`);

/** De-slug an unrecognised enum, the stockFormat.reasonLabel convention. */
const deSlug = (value: string): string => {
  const cleaned = value.replace(/_/g, ' ').trim();
  if (!cleaned) return EM_DASH;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

// ---------------------------------------------------------------------------
// Exact arithmetic
// ---------------------------------------------------------------------------

/** Velocity and target units are 4dp on this wire. */
const SCALE_PLACES = 4;
const SCALE = 10000n;
const DECIMAL_RE = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * "1.2500" -> 12500n. Null when the text is not a plain decimal.
 *
 * Digits beyond the fourth are truncated, which cannot lose anything the API
 * sends: velocity_daily and target_units are both quantized to 4dp server-side.
 */
const parseScaled = (value: unknown): bigint | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  const text = typeof value === 'number' ? value.toFixed(SCALE_PLACES) : value.trim();
  if (!DECIMAL_RE.test(text)) return null;
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');
  const padded = `${fraction}${'0'.repeat(SCALE_PLACES)}`.slice(0, SCALE_PLACES);
  const scaled = BigInt(`${whole || '0'}${padded}`);
  return negative ? -scaled : scaled;
};

/** Round a scaled value up to whole units, mirroring Python's math.ceil. */
const ceilScaled = (scaled: bigint): number => {
  const whole = scaled / SCALE;
  const remainder = scaled % SCALE;
  return Number(remainder > 0n ? whole + 1n : whole);
};

export type ArithmeticVerdict = 'agrees' | 'disagrees' | 'incomplete';

export interface ArithmeticCheck {
  verdict: ArithmeticVerdict;
  /** What the rationale's own parts produce, or null when a part is missing. */
  recomputed: number | null;
  /** What the suggestion claims. */
  reported: number | null;
  message: string;
}

/**
 * Re-derive the suggested quantity from the rationale's parts.
 *
 * Recomputed from the ATOMIC inputs — velocity, lead time, review period, safety
 * days, on hand, on order — rather than from `horizon_days` and `target_qty`, so
 * the intermediate figures the UI prints are checked too. A disagreement means
 * one of the numbers on screen does not belong to the others, and the UI must
 * say so instead of quietly showing a sum that does not add up.
 */
export const checkRationaleArithmetic = (rationale: Rationale): ArithmeticCheck => {
  const reported = readInt(rationale, 'suggested_qty');
  const velocity = parseScaled(rationale?.['velocity_daily']);
  const leadTime = readInt(rationale, 'lead_time_days');
  const review = readInt(rationale, 'review_period_days');
  const safety = readInt(rationale, 'safety_days');
  const onHand = readInt(rationale, 'on_hand');
  const onOrder = readInt(rationale, 'on_order');

  if (
    velocity === null ||
    leadTime === null ||
    review === null ||
    safety === null ||
    onHand === null ||
    onOrder === null ||
    reported === null
  ) {
    return {
      verdict: 'incomplete',
      recomputed: null,
      reported,
      message: 'Some of the working was not recorded, so this quantity cannot be re-checked here.'
    };
  }

  const horizon = leadTime + review + safety;
  const targetUnits = velocity * BigInt(horizon);
  // `if target_units > 0 else 0` in the engine: a zero or negative demand is not
  // rounded up to one garment.
  const targetQty = targetUnits > 0n ? ceilScaled(targetUnits) : 0;
  const recomputed = Math.max(0, targetQty - onHand - onOrder);

  if (recomputed === reported) {
    return {
      verdict: 'agrees',
      recomputed,
      reported,
      message: `These figures reproduce the suggested quantity of ${reported}.`
    };
  }
  return {
    verdict: 'disagrees',
    recomputed,
    reported,
    message: `These figures do not add up: they give ${recomputed}, but the suggestion says ${reported}. Treat the quantity as unverified.`
  };
};

/**
 * How much of the target is already covered, as a percentage, or null when there
 * is no target to be a percentage of.
 *
 * `marginOf` is utils/financeFormat's, and its null-on-a-zero-denominator rule is
 * exactly right here: with a target of 0 there is no such thing as "100% covered".
 */
export const coverageOfTarget = (rationale: Rationale): number | null => {
  const targetQty = readInt(rationale, 'target_qty');
  const onHand = readInt(rationale, 'on_hand');
  const onOrder = readInt(rationale, 'on_order');
  if (targetQty === null || onHand === null || onOrder === null) return null;
  return marginOf(onHand + onOrder, targetQty);
};

/** The coverage percentage as text, em dash when undefined. */
export const formatCoverage = (rationale: Rationale): string => formatPercent(coverageOfTarget(rationale), 0);

// ---------------------------------------------------------------------------
// Lead-time provenance
// ---------------------------------------------------------------------------

export type LeadTimeSource = 'observed_median' | 'supplier_stated' | 'no_supplier';

export interface LeadTimeProvenance {
  source: string;
  label: string;
  detail: string;
  /**
   * False for `no_supplier`, where the figure is the review period standing in
   * for a horizon. Calling that a lead time would be a lie about a number the
   * buyer is being asked to trust.
   */
  isLeadTime: boolean;
  observations: number[];
  /**
   * True when observations exist but were NOT the source of the figure. Showing
   * the array without this caveat contradicts the number printed beside it.
   */
  observationsUnused: boolean;
}

/**
 * Where the lead time came from, in words.
 *
 * The three sources are genuinely different claims and the UI must not blur them:
 * measured, promised, or absent entirely.
 *
 * The number of receipts needed before the median replaces the promise is
 * `ReorderPolicy.min_lead_time_receipts`, which the list endpoint does NOT send —
 * so the copy says "too few" rather than inventing the threshold, the same
 * discipline stockSeverity applies to a missing reorder point.
 */
export const describeLeadTime = (rationale: Rationale): LeadTimeProvenance => {
  const source = readText(rationale, 'lead_time_source') ?? '';
  const days = readInt(rationale, 'lead_time_days');
  const observations = readObservations(rationale);
  const supplier = readText(rationale, 'supplier_name');
  const supplierLabel = supplier ?? 'the supplier';
  const count = observations.length;

  if (source === 'observed_median') {
    return {
      source,
      label: 'Measured',
      detail:
        `The median of ${count} recorded ${count === 1 ? 'delivery' : 'deliveries'} from ${supplierLabel}. ` +
        'The median, not the average, so one disastrous shipment cannot inflate every future order.',
      isLeadTime: true,
      observations,
      observationsUnused: false
    };
  }

  if (source === 'supplier_stated') {
    const detail =
      count > 0
        ? `${supplierLabel} states ${formatQuantity(days)} days. Only ${count} ${count === 1 ? 'delivery has' : 'deliveries have'} ` +
          'been recorded — too few to measure a reliable median, so the stated figure is used and those ' +
          'observations are not what the number above came from.'
        : `${supplierLabel} states ${formatQuantity(days)} days. No deliveries have been recorded yet, so this is a claim ` +
          'rather than a measurement.';
    return {
      source,
      label: "Supplier's own figure",
      detail,
      isLeadTime: true,
      observations,
      observationsUnused: count > 0
    };
  }

  if (source === 'no_supplier') {
    return {
      source,
      label: 'No lead time',
      detail:
        'This item has never been bought from a supplier, so there is NO lead time. ' +
        `The ${formatQuantity(days)}-day review period is standing in for one, and it is not a delivery estimate.`,
      isLeadTime: false,
      observations,
      observationsUnused: count > 0
    };
  }

  return {
    source,
    // De-slugged, not "Unknown": a source the backend adds later should still
    // read as something.
    label: source ? deSlug(source) : EM_DASH,
    detail: source
      ? 'This suggestion names a lead-time source this screen does not recognise yet.'
      : 'The engine did not record where this lead time came from.',
    isLeadTime: true,
    observations,
    observationsUnused: false
  };
};

// ---------------------------------------------------------------------------
// The working, step by step
// ---------------------------------------------------------------------------

/** The glyph that joins a step to the one above it. */
export type RationaleOperator = '+' | '×' | '−' | '=';

export interface RationaleStep {
  /** Stable across renders and matches the rationale key it reads. */
  key: string;
  label: string;
  /** Already formatted. An em dash means the engine did not record it. */
  value: string;
  /** One line saying why this number is in the formula at all. */
  detail?: string;
  operator?: RationaleOperator;
  /** False when the underlying key was absent — the value is an em dash, not a 0. */
  known: boolean;
}

/**
 * The formula as an ordered list a person can read down.
 *
 * velocity, then the three spans that make the horizon, then the multiplication,
 * then the two subtractions, then the answer. Every step that is missing from the
 * rationale still appears — with an em dash and a note — because a silently
 * shorter list would look like a complete sum that happens to have fewer terms.
 */
export const readRationale = (rationale: Rationale): RationaleStep[] => {
  const window = readInt(rationale, 'velocity_window_days');
  const recentHalf = readInt(rationale, 'velocity_recent_half_days');
  // A STRING on the wire ("2"), and the older half's weight of 1 is implied
  // rather than sent — so the copy says "implied" instead of stating it as data.
  const recentWeight = readDecimal(rationale, 'velocity_recent_weight');
  const velocity = readDecimal(rationale, 'velocity_daily');

  const velocityDetail =
    window !== null && recentHalf !== null && recentWeight !== null
      ? `Sales over the last ${window} days, with the most recent ${recentHalf} weighted ${formatRatio(recentWeight, 0)}x ` +
        "(the older half's weight of 1 is implied, not sent)."
      : 'A recency-weighted average of what actually sold.';

  const leadTime = describeLeadTime(rationale);
  const leadTimeDays = readInt(rationale, 'lead_time_days');
  const review = readInt(rationale, 'review_period_days');
  const safety = readInt(rationale, 'safety_days');
  const horizon = readInt(rationale, 'horizon_days');
  const targetUnits = readDecimal(rationale, 'target_units');
  const targetQty = readInt(rationale, 'target_qty');
  const onHand = readInt(rationale, 'on_hand');
  const onOrder = readInt(rationale, 'on_order');
  const suggested = readInt(rationale, 'suggested_qty');

  const missing = 'The engine did not record this figure.';

  return [
    {
      key: 'velocity_daily',
      label: 'Sales velocity',
      value: withUnit(formatRatio(velocity, 4), 'a day'),
      detail: velocity === null ? missing : velocityDetail,
      known: velocity !== null
    },
    {
      key: 'lead_time_days',
      // Named by its provenance, so "No lead time" cannot be read as a lead time
      // of 7 days.
      label: leadTime.isLeadTime ? 'Lead time' : 'Stand-in for a lead time',
      value: withUnit(formatQuantity(leadTimeDays), 'days'),
      detail: leadTimeDays === null ? missing : leadTime.detail,
      known: leadTimeDays !== null
    },
    {
      key: 'review_period_days',
      label: 'Review period',
      value: withUnit(formatQuantity(review), 'days'),
      detail:
        review === null
          ? missing
          : 'How often buying is actually reviewed. Stock has to last until somebody next looks, not just until this delivery lands.',
      operator: '+',
      known: review !== null
    },
    {
      key: 'safety_days',
      label: 'Safety buffer',
      value: withUnit(formatQuantity(safety), 'days'),
      detail: safety === null ? missing : 'Cover for a late van or an unusually good week. Days, because a late van is measured in days.',
      operator: '+',
      known: safety !== null
    },
    {
      key: 'horizon_days',
      label: 'Days to cover',
      value: withUnit(formatQuantity(horizon), 'days'),
      detail: horizon === null ? missing : 'Lead time plus review period plus safety buffer.',
      operator: '=',
      known: horizon !== null
    },
    {
      key: 'target_units',
      label: 'Demand across those days',
      value: withUnit(formatRatio(targetUnits, 4), 'units'),
      detail: targetUnits === null ? missing : 'Velocity multiplied by the days to cover.',
      operator: '×',
      known: targetUnits !== null
    },
    {
      key: 'target_qty',
      label: 'Target stock',
      value: withUnit(formatQuantity(targetQty), 'units'),
      detail: targetQty === null ? missing : 'Rounded up — half a garment is a garment you have to buy.',
      operator: '=',
      known: targetQty !== null
    },
    {
      key: 'on_hand',
      label: 'Already on the shelf',
      value: withUnit(formatQuantity(onHand), 'units'),
      detail: onHand === null ? missing : 'Stock at this location when the suggestion was generated.',
      operator: '−',
      known: onHand !== null
    },
    {
      key: 'on_order',
      label: 'Already on order',
      value: withUnit(formatQuantity(onOrder), 'units'),
      detail: onOrder === null ? missing : 'Units on a submitted purchase order that has not arrived yet.',
      operator: '−',
      known: onOrder !== null
    },
    {
      key: 'suggested_qty',
      label: 'Suggested order',
      value: withUnit(formatQuantity(suggested), 'units'),
      detail: suggested === null ? missing : 'Floored at zero: an overstocked item suggests nothing rather than a negative order.',
      operator: '=',
      known: suggested !== null
    }
  ];
};

/** The five rationale keys that are provenance rather than arithmetic. */
export interface RationaleMeta {
  /** The engine's own formula string, verbatim. */
  formula: string;
  formulaKnown: boolean;
  /** The forecast model that produced the velocity. */
  provider: string;
  supplierName: string;
  generatedForDate: string;
  /** "6.40 days", "Never — nothing is selling", or an em dash when unrecorded. */
  daysOfCover: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  velocity: 'Recency-weighted sales history',
  // The engine writes this literal when a provider has no name attribute.
  unknown: 'Unnamed forecast model'
};

export const readRationaleMeta = (rationale: Rationale): RationaleMeta => {
  const formula = readText(rationale, 'formula');
  const provider = readText(rationale, 'forecast_provider');
  const coverText = readDecimal(rationale, 'days_of_cover');

  let daysOfCover: string;
  if (!hasRationaleKey(rationale, 'days_of_cover')) {
    daysOfCover = EM_DASH;
  } else if (rationale?.['days_of_cover'] === null || coverText === null) {
    // A recorded null is a real answer — zero velocity — and is the calmest state
    // there is. It must never read as "0 days".
    daysOfCover = 'Never — nothing is selling';
  } else {
    daysOfCover = withUnit(formatRatio(coverText, 2), 'days');
  }

  return {
    formula: formula ?? EM_DASH,
    formulaKnown: formula !== null,
    provider: provider ? (PROVIDER_LABELS[provider] ?? deSlug(provider)) : EM_DASH,
    supplierName: readText(rationale, 'supplier_name') ?? EM_DASH,
    generatedForDate: readText(rationale, 'generated_for_date') ?? EM_DASH,
    daysOfCover
  };
};

// ---------------------------------------------------------------------------
// Urgency
// ---------------------------------------------------------------------------

/**
 * `none` is not a lesser `ok`. It is the zero-velocity state — nothing sells, so
 * nothing runs out — and it is the LEAST urgent thing in the inbox. The backend
 * sorts it last with `nulls_last` for the same reason.
 */
export type ReorderUrgency = 'critical' | 'warning' | 'ok' | 'none';

export type UrgencyColor = 'error' | 'warning' | 'success' | 'default';

export interface UrgencyReading {
  level: ReorderUrgency;
  color: UrgencyColor;
  label: string;
  detail: string;
}

const URGENCY_COLORS: Record<ReorderUrgency, UrgencyColor> = {
  critical: 'error',
  warning: 'warning',
  ok: 'success',
  // Grey, not green: "never runs out" is not a healthy stock position, it is an
  // item nobody is buying. Colouring it green would congratulate dead stock.
  none: 'default'
};

/**
 * How urgent this row is, measured against the time it takes to restock.
 *
 * Inside the lead time is critical — a new order cannot arrive before the shelf
 * empties. Inside twice the lead time is a warning: still orderable, but the
 * window is closing. Beyond that there is time.
 *
 * `days` CAN BE NEGATIVE, for a suggestion generated before a forecast date that
 * has since passed. That reads as worse than any positive number, never as a
 * small one.
 *
 * With no lead time to measure against, an item that has not already run out is
 * left alone rather than assigned an invented threshold — the same reasoning as
 * stockSeverity returning `ok` with no reorder point set.
 */
export const reorderUrgency = (days: number | null | undefined, leadTimeDays: number | null | undefined): UrgencyReading => {
  if (days === null || days === undefined || !Number.isFinite(days)) {
    return {
      level: 'none',
      color: URGENCY_COLORS.none,
      label: 'Not selling',
      detail:
        'Nothing has sold in the velocity window, so there is no stockout to be close to. This is the calmest row in the inbox, not the loudest.'
    };
  }

  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      level: 'critical',
      color: URGENCY_COLORS.critical,
      label: `Overdue by ${overdue} ${overdue === 1 ? 'day' : 'days'}`,
      detail: 'The forecast stockout date has already passed. This suggestion is stale — the shelf is very likely empty already.'
    };
  }

  const lead = leadTimeDays === null || leadTimeDays === undefined || !Number.isFinite(leadTimeDays) ? null : leadTimeDays;

  if (lead === null) {
    return {
      level: 'ok',
      color: URGENCY_COLORS.ok,
      label: `${days} ${days === 1 ? 'day' : 'days'} left`,
      detail: 'No lead time was recorded, so there is nothing to measure this against. No threshold is invented here.'
    };
  }

  if (days <= lead) {
    return {
      level: 'critical',
      color: URGENCY_COLORS.critical,
      label: days === 0 ? 'Out today' : `${days} ${days === 1 ? 'day' : 'days'} left`,
      detail: `Restocking takes about ${lead} ${lead === 1 ? 'day' : 'days'}, so an order placed now arrives after the shelf is empty.`
    };
  }

  if (days <= lead * 2) {
    return {
      level: 'warning',
      color: URGENCY_COLORS.warning,
      label: `${days} days left`,
      detail: `Restocking takes about ${lead} ${lead === 1 ? 'day' : 'days'}. Order within the next ${days - lead} to arrive in time.`
    };
  }

  return {
    level: 'ok',
    color: URGENCY_COLORS.ok,
    label: `${days} days left`,
    detail: `Comfortably more than the ${lead}-day restock time.`
  };
};

// ---------------------------------------------------------------------------
// The stockout date, in words
// ---------------------------------------------------------------------------

export interface StockoutDescription {
  headline: string;
  detail: string;
  /** False when there is no forecast at all, so the UI can style it calmly. */
  hasForecast: boolean;
}

/**
 * What the forecast date actually means.
 *
 * The engine truncates days of cover with `int()`, so 3.9 days becomes today + 3.
 * The date is therefore the day you run out DURING, not the last day you are
 * covered — and a UI that says "covered until the 8th" would be off by most of a
 * trading day on every row.
 *
 * A null date is worded as "not selling". It is emphatically not "0 days", which
 * would sort and read as the most urgent row on the screen when it is the least.
 */
export const describeStockout = (
  row: Pick<ReorderSuggestion, 'forecast_stockout_date' | 'days_until_stockout' | 'days_of_cover'>
): StockoutDescription => {
  if (!row.forecast_stockout_date) {
    return {
      headline: 'Not selling — no stockout forecast',
      detail:
        'Nothing sold in the velocity window, so there is no date at which this runs out. The backend sends null rather than a 999-day sentinel precisely so this row does not sort into the urgent end.',
      hasForecast: false
    };
  }

  const days = typeof row.days_until_stockout === 'number' && Number.isFinite(row.days_until_stockout) ? row.days_until_stockout : null;
  const cover = row.days_of_cover === null || row.days_of_cover === undefined ? null : Number(row.days_of_cover);
  const coverText = cover !== null && Number.isFinite(cover) ? `${formatRatio(cover, 2)} days of cover, truncated. ` : '';

  let headline: string;
  if (days === null) {
    headline = `Runs out during ${row.forecast_stockout_date}`;
  } else if (days < 0) {
    const overdue = Math.abs(days);
    headline = `Ran out during ${row.forecast_stockout_date}, ${overdue} ${overdue === 1 ? 'day' : 'days'} ago`;
  } else if (days === 0) {
    headline = `Runs out today, ${row.forecast_stockout_date}`;
  } else {
    headline = `Runs out during ${row.forecast_stockout_date}, in ${days} ${days === 1 ? 'day' : 'days'}`;
  }

  return {
    headline,
    detail: `${coverText}This is the day stock runs out DURING, not the last day it lasts.`,
    hasForecast: true
  };
};

// ---------------------------------------------------------------------------
// Status vocabulary
// ---------------------------------------------------------------------------

export const REORDER_STATUSES: ReorderStatus[] = ['suggested', 'dismissed', 'ordered', 'superseded'];

const REORDER_STATUS_LABELS: Record<ReorderStatus, string> = {
  suggested: 'Suggested',
  dismissed: 'Dismissed',
  ordered: 'Ordered',
  superseded: 'Superseded'
};

/** The label, de-slugging an unrecognised status rather than hiding it as "Unknown". */
export const reorderStatusLabel = (status: string): string => {
  const known = REORDER_STATUS_LABELS[status as ReorderStatus];
  if (known) return known;
  return status ? deSlug(status) : EM_DASH;
};

export type ReorderStatusColor = 'default' | 'info' | 'warning' | 'success' | 'error';

const REORDER_STATUS_COLORS: Record<ReorderStatus, ReorderStatusColor> = {
  // The only status that wants something from the reader.
  suggested: 'info',
  ordered: 'success',
  // Both closed, both needing nothing: a dismissal is a decision, not a fault,
  // and a superseded row was replaced by a fresher one. Neither is a warning.
  dismissed: 'default',
  superseded: 'default'
};

export const reorderStatusColor = (status: string): ReorderStatusColor => REORDER_STATUS_COLORS[status as ReorderStatus] ?? 'default';

// ---------------------------------------------------------------------------
// The list query
// ---------------------------------------------------------------------------

export interface ReorderListFilters {
  statuses?: string[];
  locationId?: string | null;
  supplierId?: string | null;
}

const buildQuery = (pairs: Array<[string, string]>): string => {
  const params = new URLSearchParams();
  pairs.forEach(([key, value]) => params.append(key, value));
  return params.toString();
};

/**
 * The query string for GET /inventory/reorder-suggestions/.
 *
 * Three traps, each of which turns a page into an error page:
 *
 *   - A non-uuid `?location_id=` or `?supplier_id=` is an UNCAUGHT 500. The view
 *     feeds the raw value into a `filter(...)` and Django raises ValidationError
 *     outside any handler, so the response is HTML and `response.json()` throws
 *     before any error key can be read. Anything that is not a uuid is omitted
 *     and the list comes back unfiltered, which is a page rather than a stack
 *     trace. Use `isUuid` at the call site to disable the control instead.
 *   - An EMPTY `?status=` is a 400: `getlist('status')` returns `['']`, which is
 *     truthy, and '' is not a known status. So an empty or fully-invalid status
 *     selection omits the parameter entirely, which is also what makes the
 *     backend apply its own default of live suggestions only.
 *   - `status` is repeatable and read with `getlist`, which is why this returns a
 *     string: axios would serialize an array as `status[]=suggested` and the
 *     filter would silently stop applying.
 */
export const reorderListQuery = (filters: ReorderListFilters = {}): string => {
  const pairs: Array<[string, string]> = [];
  const seen = new Set<string>();
  (filters.statuses ?? []).forEach((status) => {
    const value = (status ?? '').trim();
    if (!REORDER_STATUSES.includes(value as ReorderStatus) || seen.has(value)) return;
    seen.add(value);
    pairs.push(['status', value]);
  });
  if (isUuid(filters.locationId)) pairs.push(['location_id', (filters.locationId as string).trim()]);
  if (isUuid(filters.supplierId)) pairs.push(['supplier_id', (filters.supplierId as string).trim()]);
  return buildQuery(pairs);
};

// ---------------------------------------------------------------------------
// Selection and payloads
// ---------------------------------------------------------------------------

/** `dismissal_reason` is a 255-char CharField; the serializer 400s beyond it. */
export const DISMISSAL_REASON_MAX_LENGTH = 255;

export interface SelectionCheck {
  valid: boolean;
  /** Deduplicated. Empty whenever the selection is invalid — nothing half-valid ships. */
  ids: string[];
  error?: string;
}

/**
 * Whether a multi-select can be acted on.
 *
 * A bad id is rejected rather than filtered out. Dropping it would send a
 * SHORTER list than the user ticked and report success, so three rows would be
 * dismissed out of four and nothing on screen would say which one survived.
 */
export const validateSelection = (ids: ReadonlyArray<string | null | undefined> | null | undefined): SelectionCheck => {
  const present = (ids ?? []).map((id) => (typeof id === 'string' ? id.trim() : '')).filter((id) => id !== '');
  if (present.length === 0) {
    return { valid: false, ids: [], error: 'Select at least one suggestion first.' };
  }
  if (present.some((id) => !isUuid(id))) {
    return { valid: false, ids: [], error: 'That selection contains a suggestion this page cannot identify. Refresh and try again.' };
  }
  return { valid: true, ids: Array.from(new Set(present)) };
};

export interface DismissPayload {
  suggestion_ids: string[];
  reason?: string;
}

export interface SuggestionIdsPayload {
  suggestion_ids: string[];
}

/**
 * POST /reorder-suggestions/dismiss/, or null when the selection is unusable.
 *
 * Null rather than a throw: the caller's job is to keep the button disabled, and
 * a null is a second lock rather than an exception to catch. The reason is
 * omitted when blank — an empty string would overwrite nothing with nothing — and
 * capped, so a pasted paragraph loses its tail instead of losing the whole
 * action to a 400. Bind DISMISSAL_REASON_MAX_LENGTH to the field's maxLength and
 * the cap never fires.
 */
export const dismissPayload = (
  ids: ReadonlyArray<string | null | undefined> | null | undefined,
  reason?: string
): DismissPayload | null => {
  const check = validateSelection(ids);
  if (!check.valid) return null;
  const trimmed = (reason ?? '').trim();
  return {
    suggestion_ids: check.ids,
    ...(trimmed ? { reason: trimmed.slice(0, DISMISSAL_REASON_MAX_LENGTH) } : {})
  };
};

/** POST /reorder-suggestions/create-po/, or null when the selection is unusable. */
export const createPoPayload = (ids: ReadonlyArray<string | null | undefined> | null | undefined): SuggestionIdsPayload | null => {
  const check = validateSelection(ids);
  return check.valid ? { suggestion_ids: check.ids } : null;
};

/** POST /reorder-suggestions/apply-reorder-point/, or null when unusable. */
export const applyReorderPointPayload = (ids: ReadonlyArray<string | null | undefined> | null | undefined): SuggestionIdsPayload | null => {
  const check = validateSelection(ids);
  return check.valid ? { suggestion_ids: check.ids } : null;
};

// ---------------------------------------------------------------------------
// "This will create 2 draft orders"
// ---------------------------------------------------------------------------

export const NO_SUPPLIER_GROUP_LABEL = 'No supplier';

export interface ReorderGroup {
  /** Stable key for a list render. */
  key: string;
  supplierId: string | null;
  supplierName: string;
  locationId: string;
  locationName: string;
  suggestions: ReorderSuggestion[];
  totalUnits: number;
  /** False for the supplier-less bucket: it cannot become a purchase order. */
  canOrder: boolean;
  /** Present only when canOrder is false, saying why in words. */
  note?: string;
}

export type CreatePoSkipReason = 'no_supplier' | 'not_live';

export interface CreatePoSkip {
  suggestionId: string;
  name: string;
  reason: CreatePoSkipReason;
  detail: string;
}

export interface CreatePoPreview {
  /** Orderable groups first, the supplier-less bucket last. */
  groups: ReorderGroup[];
  /** How many draft purchase orders the call will actually create. */
  orderCount: number;
  /** Every selected suggestion that will NOT become a line, and why. */
  skipped: CreatePoSkip[];
  summary: string;
}

const SKIP_DETAIL: Record<CreatePoSkipReason, string> = {
  no_supplier:
    'This item has never been bought from a supplier, so there is nothing to order from. Add it to a draft PO by hand and set the supplier there.',
  not_live: 'Only a live suggestion can become a purchase order; this one has already been dismissed, ordered or superseded.'
};

/**
 * What POST create-po/ will do, worked out before the call.
 *
 * The backend groups by (supplier, destination) because that is what a purchase
 * order IS — one supplier, one delivery address — so five ticked rows can become
 * one order or five. Telling the buyer which, before they click, is the whole
 * point of this function.
 *
 * Mirrors the backend's own two skip reasons exactly. Supplier-less rows appear
 * BOTH as a group flagged `canOrder: false` — so the buyer sees the bucket and
 * its name rather than watching rows vanish — and in `skipped`, which is the flat
 * "what will not happen" list. The overlap is deliberate; not-live rows are in
 * `skipped` only, since including them in a group would promise units no order
 * will carry.
 */
export const previewPurchaseOrders = (suggestions: ReorderSuggestion[]): CreatePoPreview => {
  const skipped: CreatePoSkip[] = [];
  const orderable = new Map<string, ReorderGroup>();
  const unorderable = new Map<string, ReorderGroup>();

  suggestions.forEach((suggestion) => {
    if (suggestion.status !== 'suggested') {
      skipped.push({ suggestionId: suggestion.id, name: suggestion.name, reason: 'not_live', detail: SKIP_DETAIL.not_live });
      return;
    }

    const noSupplier = !suggestion.supplier_id;
    if (noSupplier) {
      skipped.push({ suggestionId: suggestion.id, name: suggestion.name, reason: 'no_supplier', detail: SKIP_DETAIL.no_supplier });
    }

    const bucket = noSupplier ? unorderable : orderable;
    const key = `${suggestion.supplier_id ?? 'none'}|${suggestion.location_id}`;
    const existing = bucket.get(key);
    if (existing) {
      existing.suggestions.push(suggestion);
      existing.totalUnits += suggestion.suggested_qty;
      return;
    }
    bucket.set(key, {
      key,
      supplierId: suggestion.supplier_id ?? null,
      supplierName: suggestion.supplier_name ?? NO_SUPPLIER_GROUP_LABEL,
      locationId: suggestion.location_id,
      locationName: suggestion.location_name,
      suggestions: [suggestion],
      totalUnits: suggestion.suggested_qty,
      canOrder: !noSupplier,
      ...(noSupplier ? { note: SKIP_DETAIL.no_supplier } : {})
    });
  });

  const byName = (a: ReorderGroup, b: ReorderGroup): number =>
    a.supplierName.localeCompare(b.supplierName) || a.locationName.localeCompare(b.locationName);
  const groups = [...Array.from(orderable.values()).sort(byName), ...Array.from(unorderable.values()).sort(byName)];
  const orderCount = orderable.size;

  const orderSentence =
    orderCount === 0
      ? 'Nothing selected can become a purchase order.'
      : `This will create ${orderCount} draft purchase ${orderCount === 1 ? 'order' : 'orders'}.`;
  const skipSentence = skipped.length ? ` ${skipped.length} ${skipped.length === 1 ? 'suggestion' : 'suggestions'} will be left out.` : '';

  return { groups, orderCount, skipped, summary: `${orderSentence}${skipSentence}` };
};

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

/**
 * The backend's ordering, reproduced: `forecast_stockout_date ASC nulls_last`,
 * then `-suggested_qty`.
 *
 * USE THIS ONLY WHEN THE CLIENT MUST RE-DERIVE THE ORDER — after an optimistic
 * removal, or when merging a locally-updated row back in. The list as fetched is
 * ALREADY in this order and should be rendered as it arrives.
 *
 * Re-sorting by any other column inverts a deliberate decision: a null date means
 * velocity is zero, "not selling, so it never runs out", which is the LEAST
 * urgent state in the inbox. Postgres sorts nulls FIRST on ASC, so the backend
 * says `nulls_last` explicitly; a client sort that forgets to, or a sentinel like
 * 999 or Infinity standing in for the null, heads the buyer's screen with the
 * items they should care least about.
 *
 * Ties beyond those two keys are database-order-undefined, so this comparator
 * returns 0 for them rather than inventing a third key — and JS sort is stable,
 * which keeps the server's arbitrary-but-given order intact.
 */
export const compareForServerOrder = (a: ReorderSuggestion, b: ReorderSuggestion): number => {
  const dateA = a.forecast_stockout_date;
  const dateB = b.forecast_stockout_date;
  if (dateA !== dateB) {
    if (!dateA) return 1;
    if (!dateB) return -1;
    // ISO "YYYY-MM-DD" compares correctly as text, which is why no Date is built.
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
  }
  return b.suggested_qty - a.suggested_qty;
};

/** Re-derive the server's order. Stable, so undefined ties keep their given order. */
export const sortForServerOrder = (rows: ReorderSuggestion[]): ReorderSuggestion[] => [...rows].sort(compareForServerOrder);

/**
 * Does this list still match the order the server would send?
 *
 * Checks only for an inversion of the two defined keys, so a pair the database
 * left in an arbitrary order is not reported as wrong. A false here means a
 * client sort has been applied on top of the server's, which is the bug this
 * exists to catch.
 */
export const isInServerOrder = (rows: ReorderSuggestion[]): boolean =>
  rows.every((row, index) => index === 0 || compareForServerOrder(rows[index - 1], row) <= 0);

// ---------------------------------------------------------------------------
// The landing-page strip
// ---------------------------------------------------------------------------

/** A row loud enough to interrupt somebody with, plus what made it loud. */
export interface UrgentStockout {
  suggestion: ReorderSuggestion;
  urgency: UrgencyReading;
  /**
   * Where the days the urgency was measured AGAINST came from.
   *
   * `isLeadTime: false` means `lead_time_days` is the `no_supplier` stand-in —
   * the review period — so the strip must not tell a reader "restocking takes 7
   * days" about an item that has no supplier to restock from.
   */
  leadTime: LeadTimeProvenance;
}

/**
 * The rows a compact strip should shout about: red inside the lead time, amber
 * inside twice it, nothing else.
 *
 * The thresholds are `reorderUrgency`'s and are deliberately NOT restated here.
 * One definition of "critical", shared by the inbox and the strip, is the only
 * arrangement in which the two surfaces cannot disagree about the same row.
 *
 * Three exclusions, each of which would otherwise put the calmest rows on the
 * loudest surface:
 *
 *   - A NULL `forecast_stockout_date` is dropped outright. It means velocity is
 *     zero — "not selling, so it never runs out" — the LEAST urgent state there
 *     is, which is why the backend sorts it last with `nulls_last`. The test is
 *     on the DATE rather than on the derived urgency, so a malformed row
 *     carrying a `days_until_stockout` without a date still cannot get in.
 *   - `ok` is dropped: there is time, including the row with no lead time at
 *     all, where no threshold is invented.
 *   - `none` is dropped: it is the zero-velocity state above.
 *
 * ORDER IS PRESERVED, never re-sorted, and reds are NOT grouped above ambers:
 * the list arrives in the backend's `forecast_stockout_date ASC nulls_last,
 * -suggested_qty`, and a 20-day lead time is critical at 18 days out while a
 * next-day supplier is comfortable at 3 — so grouping by colour would move the
 * later stockout above the sooner one.
 */
export const urgentStockouts = (rows: ReorderSuggestion[] | null | undefined): UrgentStockout[] =>
  (rows ?? []).reduce<UrgentStockout[]>((urgent, suggestion) => {
    if (!suggestion.forecast_stockout_date) return urgent;
    const urgency = reorderUrgency(suggestion.days_until_stockout, suggestion.lead_time_days);
    if (urgency.level !== 'critical' && urgency.level !== 'warning') return urgent;
    urgent.push({ suggestion, urgency, leadTime: describeLeadTime(suggestion.rationale) });
    return urgent;
  }, []);

// ---------------------------------------------------------------------------
// The dashboard deep link
// ---------------------------------------------------------------------------

/** `inventory/reorder.py::ORIGIN`, verbatim. */
export const REORDER_ORIGIN = 'inventory_reorder';

/** Where the inbox lives. One constant, so a route rename breaks one line. */
export const REORDER_INBOX_PATH = '/inventory/reorder';

/** The query key that focuses the inbox on a single suggestion. */
export const REORDER_FOCUS_PARAM = 'suggestion';

/**
 * A link into the inbox, focused on a suggestion and/or scoped to a location.
 *
 * BOTH IDS ARE UUID-GATED before they reach the URL, which is the whole reason
 * this is a function rather than a template literal at each call site: the
 * reorder list endpoint answers a non-uuid `?location_id=` with an UNCAUGHT
 * HTML 500, so a link built from an unvalidated id is a stack trace rather than
 * a page. An unusable id is dropped and the link degrades to the plain inbox —
 * still the right screen, just not pre-filtered.
 */
export const reorderInboxHref = (suggestionId?: unknown, locationId?: unknown): string => {
  const params = new URLSearchParams();
  if (isUuid(suggestionId)) params.append(REORDER_FOCUS_PARAM, String(suggestionId).trim());
  if (isUuid(locationId)) params.append('location_id', String(locationId).trim());
  const query = params.toString();
  return query ? `${REORDER_INBOX_PATH}?${query}` : REORDER_INBOX_PATH;
};

/**
 * Why the dashboard's restock count and the inbox's differ, in one line.
 *
 * `feed_agent_recommendations` takes the five most imminent live suggestions
 * forecast to run out within 14 days (`AGENT_MAX_RECOMMENDATIONS = 5`,
 * `AGENT_STOCKOUT_HORIZON_DAYS = 14`). The inbox has neither cap nor horizon.
 * The difference is by design, and saying so where the link is beats letting
 * somebody discover it as a bug.
 */
export const AGENT_FEED_CAP_NOTE =
  'The dashboard surfaces at most 5 restock suggestions, and only those forecast to run out within 14 days. The reorder inbox lists every one of them, so the two counts differ by design.';

/** What a recommendation's `signal_sources` says about the reorder engine. */
export interface ReorderRecommendation {
  /** True iff `origin` is the engine's own literal. Nothing else identifies it. */
  isReorder: boolean;
  suggestionId: string | null;
  locationId: string | null;
  skus: string[];
  /** Where to send the reader, or null when this is not a reorder recommendation. */
  href: string | null;
}

/** A fresh inert reading per call, so no caller can mutate a shared `skus` array. */
const notAReorder = (): ReorderRecommendation => ({ isReorder: false, suggestionId: null, locationId: null, skus: [], href: null });

/**
 * Read a dashboard recommendation's `signal_sources` for a reorder deep link.
 *
 * The shape the engine writes is
 * `{origin: 'inventory_reorder', category: 'restock', sources: [...],
 * target_skus: [sku], location_id: uuid, suggestion_id: uuid}` — but the field
 * is a free `Record<string, unknown>` shared with every other recommendation
 * generator, so every read below is guarded and the function is total: a null, a
 * string, an array, or an object with none of these keys all return the same
 * inert answer rather than throwing inside a render.
 *
 * `origin` alone decides. `category: 'restock'` is not sufficient — another
 * generator could reasonably use that word — and matching on it would put an
 * inventory link on somebody else's recommendation.
 *
 * The link itself is `reorderInboxHref`'s, so a malformed id is dropped there
 * rather than forwarded into a query that 500s.
 */
export const readReorderRecommendation = (signalSources: unknown): ReorderRecommendation => {
  if (typeof signalSources !== 'object' || signalSources === null || Array.isArray(signalSources)) return notAReorder();
  const signals = signalSources as Record<string, unknown>;
  if (readText(signals, 'origin') !== REORDER_ORIGIN) return notAReorder();

  const suggestionRaw = readText(signals, 'suggestion_id');
  const locationRaw = readText(signals, 'location_id');
  const suggestionId = isUuid(suggestionRaw) ? (suggestionRaw as string) : null;
  const locationId = isUuid(locationRaw) ? (locationRaw as string) : null;
  const rawSkus = signals['target_skus'];
  const skus = Array.isArray(rawSkus)
    ? rawSkus.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '').map((entry) => entry.trim())
    : [];

  return { isReorder: true, suggestionId, locationId, skus, href: reorderInboxHref(suggestionId, locationId) };
};

// ---------------------------------------------------------------------------
// The list envelope
// ---------------------------------------------------------------------------

export interface ReorderInbox {
  /** In the order the server sent them. Never re-sorted here. */
  items: ReorderSuggestion[];
  /**
   * The envelope's own total. NULL means the endpoint did not send it; 0 means
   * it did and the answer is "buy nothing", which is a different screen.
   */
  totalUnitsSuggested: number | null;
  /**
   * Partial on purpose: a key the endpoint omitted stays undefined rather than
   * becoming 0, because 0 safety days is a policy somebody chose and "we were
   * not told" is not.
   */
  policy: Partial<ReorderPolicy> | null;
}

const readCount = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Read GET /inventory/reorder-suggestions/ without trusting its shape.
 *
 * A bare array is accepted because that is what every other list endpoint in
 * this module returns, and a future serializer change to match them should
 * degrade to "the list works, the totals are unknown" rather than to a blank
 * screen. The order is preserved exactly: see compareForServerOrder for why
 * re-sorting here would be a bug rather than a preference.
 */
export const normalizeReorderResponse = (body: unknown): ReorderInbox => {
  if (Array.isArray(body)) {
    return { items: body as ReorderSuggestion[], totalUnitsSuggested: null, policy: null };
  }
  if (!isObject(body)) return { items: [], totalUnitsSuggested: null, policy: null };

  const items = Array.isArray(body.items) ? (body.items as ReorderSuggestion[]) : [];
  const rawPolicy = body.policy;
  let policy: Partial<ReorderPolicy> | null = null;
  if (isObject(rawPolicy)) {
    policy = {};
    const review = readCount(rawPolicy.review_period_days);
    const safety = readCount(rawPolicy.safety_days);
    const cooldown = readCount(rawPolicy.dismissal_cooldown_days);
    if (review !== null) policy.review_period_days = review;
    if (safety !== null) policy.safety_days = safety;
    if (cooldown !== null) policy.dismissal_cooldown_days = cooldown;
  }
  return { items, totalUnitsSuggested: readCount(body.total_units_suggested), policy };
};

// ---------------------------------------------------------------------------
// The policy behind every number on the page
// ---------------------------------------------------------------------------

export interface PolicyReading {
  key: keyof ReorderPolicy;
  label: string;
  /** Already formatted; an em dash when the endpoint did not send the figure. */
  value: string;
  detail: string;
  known: boolean;
}

/**
 * The buying policy, spelled out.
 *
 * Not decoration: the review period and safety days are two of the three spans
 * in every horizon on this screen, so a buyer who disagrees with a suggested
 * quantity is usually disagreeing with one of these. Showing the inputs is what
 * turns "the system says 18" into an argument that can be had.
 */
export const describePolicy = (policy: Partial<ReorderPolicy> | null | undefined): PolicyReading[] => [
  {
    key: 'review_period_days',
    label: 'Review period',
    value: withUnit(formatQuantity(policy?.review_period_days ?? null), 'days'),
    detail: 'How often buying is reviewed. Stock has to last until somebody next looks, so this is added to every horizon.',
    known: policy?.review_period_days !== undefined
  },
  {
    key: 'safety_days',
    label: 'Safety buffer',
    value: withUnit(formatQuantity(policy?.safety_days ?? null), 'days'),
    detail: 'Extra cover for a late delivery or an unusually good week. Also added to every horizon.',
    known: policy?.safety_days !== undefined
  },
  {
    key: 'dismissal_cooldown_days',
    label: 'Dismissal cooldown',
    value: withUnit(formatQuantity(policy?.dismissal_cooldown_days ?? null), 'days'),
    detail: 'How long a dismissed suggestion stays out of the inbox before the engine may raise it again.',
    known: policy?.dismissal_cooldown_days !== undefined
  }
];

/**
 * What dismissing actually does, with the cooldown filled in from the policy.
 *
 * The number is only stated when the endpoint sent it — an invented cooldown is
 * a promise about when a suggestion comes back, and the buyer would plan around
 * it.
 */
export const describeDismissal = (policy: Partial<ReorderPolicy> | null | undefined): string => {
  const cooldown = policy?.dismissal_cooldown_days;
  const window =
    cooldown === undefined || cooldown === null
      ? 'for the company’s dismissal cooldown, which this response did not include'
      : `for ${cooldown} ${cooldown === 1 ? 'day' : 'days'}`;
  return (
    `Dismissing takes these suggestions out of the inbox ${window}. Regenerating does NOT bring a dismissed suggestion back — ` +
    'that is what makes dismissing one mean something. The reason is stored with it, so the next person can see why.'
  );
};

/**
 * Applying a suggested reorder point is not a note-to-self — it writes the field
 * the low-stock highlighting reads.
 *
 * `stockFormat.stockSeverity` returns `low` when quantity <= reorder point and
 * `ok` when the reorder point is NULL, so accepting a suggestion for an item
 * that never had one can turn its chip amber on the style catalogue the moment
 * this call succeeds. Somebody who does not know that will read it as stock
 * having changed.
 */
export const APPLY_REORDER_POINT_NOTE =
  'This writes the suggested reorder point onto each item. It is the same figure the low-stock highlighting reads, so items with no ' +
  'reorder point today may start showing as low on the style catalogue and on the level chips as soon as this is applied — the stock ' +
  'has not changed, the threshold has.';

/** Regeneration supersedes live suggestions and deliberately leaves dismissals alone. */
export const REGENERATE_NOTE =
  'Regenerating recomputes the inbox from today’s stock and sales, and supersedes the suggestions currently showing — the inbox is ' +
  'current state, not a log. Dismissed suggestions are left alone, so a decision already made is not undone by a refresh.';

/** Session 7's precedent: say why the buttons are off rather than answer a 403. */
export const NON_ADMIN_REORDER_NOTICE =
  'The reorder inbox is read-only for your role. Anyone can read the suggestions and check the working, but dismissing, creating ' +
  'purchase orders, applying a reorder point and regenerating are admin-only.';

// ---------------------------------------------------------------------------
// What create-po/ actually created
// ---------------------------------------------------------------------------

export const PURCHASE_ORDERS_ROUTE = '/inventory/purchase-orders';

export interface CreatedPurchaseOrder {
  /** The uuid, or null when the response did not carry a usable one. */
  id: string | null;
  /** A name for the link. Never blank, so a button is never unlabelled. */
  reference: string;
  supplierName: string | null;
  destinationName: string | null;
  /** How many lines the order was created with; null when not sent. */
  lineCount: number | null;
  /** Where the link goes. Never a dead route — see purchaseOrderRoute. */
  route: string;
}

/**
 * The editor for a created order, or the list when there is no usable id.
 *
 * `/inventory/purchase-orders/:purchaseOrderId` renders an editor that fetches
 * by that segment, so a missing or malformed id produces a screen that loads
 * nothing and explains nothing. The list is a worse deep link and a much better
 * failure: the order the buyer was just told about is on it.
 */
export const purchaseOrderRoute = (id: unknown): string =>
  isUuid(id) ? `${PURCHASE_ORDERS_ROUTE}/${(id as string).trim()}` : PURCHASE_ORDERS_ROUTE;

/**
 * Read `{purchase_orders: [...]}` from POST create-po/.
 *
 * The endpoint answers 201 with the created orders and 200 with an EMPTY list
 * when nothing selected could become one, so an empty array here is a real
 * answer and not a parse failure — the caller must say "nothing was created"
 * rather than navigate somewhere.
 */
export const readCreatedPurchaseOrders = (body: unknown): CreatedPurchaseOrder[] => {
  const rows = Array.isArray(body) ? body : isObject(body) && Array.isArray(body.purchase_orders) ? body.purchase_orders : [];
  return rows.filter(isObject).map((row) => {
    const id = isUuid(row.id) ? (row.id as string).trim() : null;
    const number = typeof row.po_number === 'string' ? row.po_number.trim() : '';
    return {
      id,
      reference: number || 'Draft purchase order',
      supplierName: typeof row.supplier_name === 'string' && row.supplier_name.trim() ? row.supplier_name.trim() : null,
      destinationName: typeof row.destination_name === 'string' && row.destination_name.trim() ? row.destination_name.trim() : null,
      lineCount: Array.isArray(row.lines) ? row.lines.length : null,
      route: purchaseOrderRoute(row.id)
    };
  });
};

/** The sentence after the call, including the honest empty case. */
export const describeCreatedOrders = (orders: CreatedPurchaseOrder[]): string => {
  if (orders.length === 0) {
    return 'No purchase orders were created. Nothing selected could become one — check the suppliers on those items.';
  }
  const draft = `${orders.length} draft purchase ${orders.length === 1 ? 'order' : 'orders'} created.`;
  return `${draft} They are drafts: nothing has been sent to a supplier until one is submitted.`;
};
