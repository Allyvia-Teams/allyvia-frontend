// views/inventory/stockCounts.ts
//
// The stocktake, as pure functions: envelope normalisation, the state machine's
// gates, the scanner buffer, and the variance table.
//
// THREE THINGS DRIVE THE WHOLE DESIGN OF THIS FILE.
//
// 1. THE ENVELOPES DIFFER PER ENDPOINT. Six calls against the same resource return
//    five different shapes — a bare array (list), a bare object (create, review,
//    cancel), `{count, summary, lines}` (detail), `{count, adjustments}` (apply),
//    and `{recorded, summary}` (entries). Only ONE of them carries lines. A client
//    that reads `response.lines` uniformly renders an empty grid after every scan
//    batch, so `normalizeCountResponse` reports `linesKnown` and the caller
//    refetches instead of believing an absence.
//
// 2. NULL IS NOT ZERO. `counted_qty`, `variance`, `unit_cost` and `cost_impact`
//    are null while a line is uncounted, and null again when the item has no cost
//    on record. "Nobody looked at this shelf" and "this shelf matched" are
//    different facts; so are "this loss cost nothing" and "we do not know what
//    this loss cost". Every one of them renders as an em dash — the same rule
//    stockFormat.ts and utils/financeFormat.ts already follow.
//
// 3. THE COUNTER IS HOLDING A SCANNER, NOT A KEYBOARD. Entries are ALL-OR-NOTHING
//    server-side: one unrecognised barcode 409s the batch and records nothing. So
//    every scan is resolved against the known line set BEFORE submission and
//    unknowns are quarantined locally, which is the only way a floor counter's
//    forty good reads survive one scan of a carrier bag.

import { MovementTone, EM_DASH, formatDelta, formatQuantity, formatUnitCost, movementTone } from './stockFormat';
import { ParsedApiError, parseApiError, statusOf } from './apiErrors';

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export type CountStatus = 'open' | 'review' | 'applied' | 'cancelled';
export type CountScope = 'all' | 'category' | 'filter';
/** The four write calls. `enter` is POST /entries/. */
export type CountAction = 'enter' | 'review' | 'apply' | 'cancel';

export const COUNT_STATUSES: CountStatus[] = ['open', 'review', 'applied', 'cancelled'];
export const COUNT_SCOPES: CountScope[] = ['all', 'category', 'filter'];

export const isCountStatus = (value: unknown): value is CountStatus => COUNT_STATUSES.includes(value as CountStatus);

const STATUS_LABELS: Record<CountStatus, string> = {
  open: 'Open',
  review: 'In review',
  applied: 'Applied',
  cancelled: 'Cancelled'
};

/**
 * Human label for a status, de-slugging anything we do not recognise rather than
 * hiding it — same reasoning as stockFormat's `reasonLabel`. A status the backend
 * adds later should read as something, not vanish.
 */
export const countStatusLabel = (status: string): string => {
  const known = STATUS_LABELS[status as CountStatus];
  if (known) return known;
  const cleaned = (status || '').replace(/_/g, ' ').trim();
  if (!cleaned) return EM_DASH;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export type CountStatusColor = 'default' | 'info' | 'warning' | 'success' | 'error';

const STATUS_COLORS: Record<CountStatus, CountStatusColor> = {
  open: 'info',
  // Amber, because review is the only state where a human still has to decide
  // something — it must not look as settled as 'applied'.
  review: 'warning',
  applied: 'success',
  // NOT 'error', unlike a cancelled purchase order. An abandoned stocktake wrote
  // nothing and cost nothing; colouring it red reads as a failure that needs
  // chasing.
  cancelled: 'default'
};

export const countStatusColor = (status: string): CountStatusColor => STATUS_COLORS[status as CountStatus] ?? 'default';

/**
 * What a count actually covered, read from the stored filter rather than from the
 * scope name.
 *
 * The two disagree in exactly one case, and it is this module's quiet-wrong-answer
 * trap: `_scoped_items` reads `(scope_filter or {}).get("category")` and SKIPS a
 * criterion it cannot find, so a `category` count whose filter arrived empty counted
 * the WHOLE location. A screen that renders the scope name alone labels that count
 * "Category" and leaves a reader no way to tell it from a deliberately narrowed one,
 * so the missing criterion is named instead of assumed.
 */
export const describeCountScope = (count: { scope: string; scope_filter?: Record<string, unknown> | null }): string => {
  const filter =
    count.scope_filter && typeof count.scope_filter === 'object' && !Array.isArray(count.scope_filter) ? count.scope_filter : {};
  const text = (key: string): string => (typeof filter[key] === 'string' ? (filter[key] as string).trim() : '');
  const category = text('category');
  const search = text('search');
  const productId = text('product_id');

  if (count.scope === 'all') return 'All items';
  if (count.scope === 'category') return category ? `Category: ${category}` : 'Category (none set) — every item at this location';
  if (count.scope === 'filter') {
    const parts: string[] = [];
    if (category) parts.push(`category ${category}`);
    if (search) parts.push(`matching “${search}”`);
    // The id itself is meaningless on screen; that a style filter is in play is not.
    if (productId) parts.push('one style');
    if (filter.with_stock_only === true) parts.push('with stock on hand');
    return parts.length ? `Filtered: ${parts.join(', ')}` : 'Filtered (nothing set) — every item at this location';
  }
  // An unrecognised scope is echoed rather than hidden, same reasoning as
  // countStatusLabel: a scope the backend adds later should read as something.
  return count.scope || EM_DASH;
};

// ---------------------------------------------------------------------------
// Money, in integer ten-thousandths
// ---------------------------------------------------------------------------
//
// Cost figures arrive as JSON STRINGS with four decimal places. Totals shown next
// to a variance get reconciled against the ledger by a human, so they are summed
// as integers and only turned back into a string at the end. `0.1 + 0.2` has no
// business anywhere near a shrinkage figure.

const MONEY_UNITS_PER_DOLLAR = 10000;

/**
 * A 4dp money string as an integer number of ten-thousandths, or null when the
 * value is absent/unparseable — which stays null all the way to the em dash.
 *
 * Digits beyond the fourth are dropped rather than rounded: this API emits exactly
 * four, so a fifth would be a shape change worth noticing in a test, not a
 * rounding decision worth guessing at.
 */
export const parseMoneyUnits = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const text = typeof value === 'number' ? value.toString() : value.trim();
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(text);
  if (!match) return null;
  const [, sign, whole, fraction = ''] = match;
  const scaled = (fraction + '0000').slice(0, 4);
  const units = Number(whole) * MONEY_UNITS_PER_DOLLAR + Number(scaled);
  return sign === '-' ? -units : units;
};

/** Back to a 4dp string, so a client-side total is the same shape as the API's. */
export const formatMoneyUnits = (units: number | null | undefined): string | null => {
  if (units === null || units === undefined || Number.isNaN(units)) return null;
  const sign = units < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(units));
  const whole = Math.trunc(absolute / MONEY_UNITS_PER_DOLLAR);
  const fraction = `${absolute % MONEY_UNITS_PER_DOLLAR}`.padStart(4, '0');
  return `${sign}${whole}.${fraction}`;
};

// ---------------------------------------------------------------------------
// Wire shapes and the one client shape
// ---------------------------------------------------------------------------

export interface CountSummary {
  total_lines: number;
  counted_lines: number;
  uncounted_lines: number;
  /** Excludes BOTH null (uncounted) and 0 (matched) — see the null-is-not-zero rule. */
  lines_with_variance: number;
  net_variance_units: number;
  /** Positive magnitude, not a signed loss. */
  shrinkage_units: number;
  overage_units: number;
  /** 4dp string, or null when the figure is absent. Never coerced to '0.0000'. */
  net_cost_impact: string | null;
}

/**
 * One count line. Wire field names are kept verbatim so a row on screen is
 * traceable to the payload without a rename table; derived fields are camelCase.
 *
 * `barcode` is NOT part of the count-line payload — the caller joins it in from
 * the item catalogue. See `buildScanIndex` for what happens when it does not.
 */
export interface CountLine {
  line_id: string;
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  /** Snapshotted when the count was opened. Does not drift. See EXPECTED_SNAPSHOT_NOTE. */
  expected_qty: number;
  counted_qty: number | null;
  variance: number | null;
  unit_cost: string | null;
  cost_impact: string | null;
  note: string;
  counted_at: string | null;
  counted_by_email: string;
  barcode?: string | null;
}

export interface NormalizedCount {
  id: string;
  reference: string;
  /**
   * Left as a plain string on purpose: an unrecognised status must fail the action
   * gates closed rather than be cast into the union and enable buttons. Narrow it
   * with `isCountStatus` when you need the union.
   */
  status: string;
  status_label: string;
  location_id: string | null;
  location_name: string;
  scope: string;
  scope_filter: Record<string, unknown>;
  notes: string;
  is_mutable: boolean;
  created_by_email: string;
  applied_by_email: string;
  applied_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  /** Null when the envelope carried no summary — never a fabricated row of zeros. */
  summary: CountSummary | null;
}

export interface CountAdjustment {
  inventory_item_id: number;
  sku: string | null;
  delta: number;
  quantity_after: number;
}

export type CountEnvelope = 'list' | 'count' | 'detail' | 'apply' | 'entries' | 'unknown';

export interface NormalizedCountResponse {
  envelope: CountEnvelope;
  /** The single count, when the envelope carried one. Null for list and entries. */
  count: NormalizedCount | null;
  /** Every count, for the list envelope. Empty otherwise. */
  counts: NormalizedCount[];
  lines: CountLine[];
  /**
   * True only when the envelope actually carried lines. False means "the grid you
   * are holding is still the truth — refetch". An empty `lines` with `linesKnown`
   * true is a real zero-line count, which is a legal thing to open.
   */
  linesKnown: boolean;
  summary: CountSummary | null;
  /** Present only on the apply envelope; `[]` there means a no-op apply. */
  adjustments: CountAdjustment[] | null;
  /** Present only on the entries envelope. */
  recorded: number | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

const asNullableString = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

const asInt = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return fallback;
};

/** Integer-or-null, preserving the difference between a real 0 and an absent value. */
const asIntOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
};

/** Money stays a string. A number is stringified rather than kept as a float. */
const asMoney = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value.toString();
  return null;
};

export const normalizeSummary = (raw: unknown): CountSummary | null => {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    total_lines: asInt(record.total_lines),
    counted_lines: asInt(record.counted_lines),
    uncounted_lines: asInt(record.uncounted_lines),
    lines_with_variance: asInt(record.lines_with_variance),
    net_variance_units: asInt(record.net_variance_units),
    shrinkage_units: asInt(record.shrinkage_units),
    overage_units: asInt(record.overage_units),
    net_cost_impact: asMoney(record.net_cost_impact)
  };
};

export const normalizeCountLine = (raw: unknown): CountLine | null => {
  const record = asRecord(raw);
  if (!record) return null;
  const expected = asInt(record.expected_qty);
  const counted = asIntOrNull(record.counted_qty);
  const variance = asIntOrNull(record.variance);
  return {
    line_id: asString(record.line_id),
    inventory_item_id: asInt(record.inventory_item_id),
    sku: asNullableString(record.sku),
    name: asString(record.name),
    size: asString(record.size),
    color: asString(record.color),
    expected_qty: expected,
    counted_qty: counted,
    // Derived only as a fallback for a missing key, and never for an uncounted
    // line: inventing a variance of 0 there would claim the shelf matched.
    variance: variance !== null ? variance : counted === null ? null : counted - expected,
    unit_cost: asMoney(record.unit_cost),
    cost_impact: asMoney(record.cost_impact),
    note: asString(record.note),
    counted_at: asNullableString(record.counted_at),
    counted_by_email: asString(record.counted_by_email),
    barcode: asNullableString(record.barcode)
  };
};

export const normalizeCount = (raw: unknown): NormalizedCount | null => {
  const record = asRecord(raw);
  if (!record) return null;
  const status = asString(record.status);
  const scopeFilter = asRecord(record.scope_filter);
  return {
    id: asString(record.id),
    reference: asString(record.reference),
    status,
    status_label: asString(record.status_label) || countStatusLabel(status),
    location_id: asNullableString(record.location_id),
    location_name: asString(record.location_name),
    scope: asString(record.scope, 'all'),
    // scope_filter must be an OBJECT: the backend does `(scope_filter or {}).get(...)`
    // and a list or a string there is a 500. Refuse to propagate a bad shape.
    scope_filter: scopeFilter ?? {},
    notes: asString(record.notes),
    // Derive rather than default to false, because a missing key would grey out
    // every button on a perfectly open count.
    is_mutable: typeof record.is_mutable === 'boolean' ? record.is_mutable : status === 'open' || status === 'review',
    created_by_email: asString(record.created_by_email),
    applied_by_email: asString(record.applied_by_email),
    applied_at: asNullableString(record.applied_at),
    cancelled_at: asNullableString(record.cancelled_at),
    created_at: asNullableString(record.created_at),
    summary: normalizeSummary(record.summary)
  };
};

const normalizeAdjustment = (raw: unknown): CountAdjustment | null => {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    inventory_item_id: asInt(record.inventory_item_id),
    sku: asNullableString(record.sku),
    delta: asInt(record.delta),
    quantity_after: asInt(record.quantity_after)
  };
};

/**
 * A FUNCTION, not a shared constant.
 *
 * Spreading one module-level object would copy the `lines` and `counts`
 * REFERENCES, so every normalised response in the app would share one array with
 * every other. A grid that sorts or pushes in place — ordinary React practice,
 * which is why `sortVarianceRows` hands back `[...rows]` — would then poison every
 * later call and produce the state this type contract calls impossible:
 * `linesKnown: false` alongside a non-empty `lines`.
 */
const emptyResponse = (): NormalizedCountResponse => ({
  envelope: 'unknown',
  count: null,
  counts: [],
  lines: [],
  linesKnown: false,
  summary: null,
  adjustments: null,
  recorded: null
});

/**
 * Read any of the six stock-count response bodies into one client shape.
 *
 * Envelopes are told apart by KEY PRESENCE, never by which call was made, so a
 * caller that reuses this after an endpoint changes shape gets `envelope:
 * 'unknown'` instead of silently reading undefined.
 */
export const normalizeCountResponse = (payload: unknown): NormalizedCountResponse => {
  // GET /stock-counts/ — a bare array, not a paginated envelope.
  if (Array.isArray(payload)) {
    return {
      ...emptyResponse(),
      envelope: 'list',
      counts: payload.map(normalizeCount).filter((count): count is NormalizedCount => count !== null)
    };
  }

  const body = asRecord(payload);
  if (!body) return emptyResponse();

  // Tolerate a caller who passed the axios response instead of `response.data`.
  // A count object has no `data` key, so this can only be the wrapper.
  if (!('id' in body) && !('count' in body) && !('recorded' in body) && 'data' in body) {
    return normalizeCountResponse(body.data);
  }

  // POST /entries/ — {recorded, summary}. NO LINES: the grid is now stale and the
  // caller must refetch. This is the envelope that bites hardest.
  if ('recorded' in body) {
    return {
      ...emptyResponse(),
      envelope: 'entries',
      recorded: asInt(body.recorded),
      summary: normalizeSummary(body.summary)
    };
  }

  // The detail and apply envelopes carry a `count` OBJECT. Key presence is not
  // enough: `{count, next, previous, results}` — what DRF emits the moment
  // pagination is switched on for the bare-array list endpoint, a one-setting
  // change — has a `count` that is a NUMBER. Routing that into the detail branch
  // drops every row in `results` while telling the caller the envelope WAS
  // recognised, which is the one thing this function promises never to do. It is
  // deliberately reported as 'unknown' rather than read as a list: `results` is one
  // page of many and this module cannot fetch the rest, so a caller has to notice.
  const countObject = asRecord(body.count);
  if (countObject) {
    const count = normalizeCount(countObject);
    // POST /apply/ — {count, adjustments}. `adjustments: []` is a legitimate
    // no-op: every line matched, or the count had no lines at all.
    if (Array.isArray(body.adjustments)) {
      return {
        ...emptyResponse(),
        envelope: 'apply',
        count,
        summary: normalizeSummary(body.summary) ?? count?.summary ?? null,
        adjustments: body.adjustments.map(normalizeAdjustment).filter((row): row is CountAdjustment => row !== null)
      };
    }
    // GET /stock-counts/{id}/ — {count, summary, lines}. The summary appears
    // TWICE, top-level and nested inside `count`; they are the same object, and
    // the top-level one is preferred so the nested copy can be dropped later
    // without changing what renders.
    const linesKnown = Array.isArray(body.lines);
    return {
      ...emptyResponse(),
      envelope: 'detail',
      count,
      linesKnown,
      lines: linesKnown ? (body.lines as unknown[]).map(normalizeCountLine).filter((line): line is CountLine => line !== null) : [],
      summary: normalizeSummary(body.summary) ?? count?.summary ?? null
    };
  }

  // POST /stock-counts/, /review/, /cancel/ — a BARE count object. No lines, so a
  // freshly created count still needs a detail fetch before its grid can render.
  if ('id' in body || 'reference' in body) {
    const count = normalizeCount(body);
    return { ...emptyResponse(), envelope: 'count', count, summary: count?.summary ?? null };
  }

  return emptyResponse();
};

// ---------------------------------------------------------------------------
// The state machine
// ---------------------------------------------------------------------------
//
// open -> review -> applied, and cancel from open or review. There is no way back:
// once applied, a count is a dated statement of what was on the shelf, and later
// edits would destroy the only thing it is for.

const LEGAL_FROM: Record<CountAction, CountStatus[]> = {
  enter: ['open', 'review'],
  review: ['open'],
  // Apply from 'open' is a 409, not a shortcut. THE UI MUST CALL /review/ FIRST.
  apply: ['review'],
  cancel: ['open', 'review']
};

/**
 * Status-only legality. An unrecognised status yields false for everything: we do
 * not know what state machine it belongs to, so failing closed is the only safe
 * reading.
 */
export const isActionLegal = (status: string, action: CountAction): boolean => isCountStatus(status) && LEGAL_FROM[action].includes(status);

export interface CountActionState {
  allowed: boolean;
  /** Why not, phrased for a disabled button's tooltip. Null when allowed. */
  reason: string | null;
  /** The action that must happen first — the difference between "never" and "not yet". */
  needsFirst: CountAction | null;
}

export interface CountViewer {
  /**
   * GET list and GET detail are open to any authenticated role; create, entries,
   * review, apply and cancel are ALL admin-only. A floor counter cannot scan.
   */
  isAdmin: boolean;
}

/**
 * Which of the four write actions can be offered right now, and why not otherwise.
 *
 * This exists so the apply button is never rendered in a state where pressing it
 * returns 409 — the whole illegal-transition family should be unreachable from the
 * UI, and reachable only when another session has moved the count underneath us.
 */
export const countActionStates = (count: { status: string } | null, viewer: CountViewer): Record<CountAction, CountActionState> => {
  const status = count?.status ?? '';
  const build = (action: CountAction): CountActionState => {
    if (!count) return { allowed: false, reason: 'No count loaded.', needsFirst: null };
    if (!viewer.isAdmin) return { allowed: false, reason: NON_ADMIN_NOTICE, needsFirst: null };
    if (isActionLegal(status, action)) return { allowed: true, reason: null, needsFirst: null };
    if (action === 'apply' && status === 'open') {
      return { allowed: false, reason: APPLY_NEEDS_REVIEW_NOTE, needsFirst: 'review' };
    }
    if (status === 'applied') {
      return { allowed: false, reason: 'This count has been applied. Applied counts are immutable.', needsFirst: null };
    }
    if (status === 'cancelled') {
      return { allowed: false, reason: 'This count was cancelled.', needsFirst: null };
    }
    const allowedFrom = isCountStatus(status) ? LEGAL_FROM[action] : [];
    const suffix = allowedFrom.length ? ` It is only available from: ${allowedFrom.join(', ')}.` : '';
    return { allowed: false, reason: `Not available while the count is “${countStatusLabel(status)}”.${suffix}`, needsFirst: null };
  };
  return { enter: build('enter'), review: build('review'), apply: build('apply'), cancel: build('cancel') };
};

// ---------------------------------------------------------------------------
// The scanner path
// ---------------------------------------------------------------------------

/**
 * Why a scan could not be turned into an entry.
 *
 * `not_in_count` is the server's own reason, echoed verbatim. The other two are
 * local: they describe states the server never sees, because the whole point of
 * quarantining is that the batch is never sent.
 */
export type ScanRejectReason = 'not_in_count' | 'no_barcode_index' | 'unidentified_line';

export interface ScanIndex {
  byLineId: Map<string, CountLine>;
  byBarcode: Map<string, CountLine>;
  bySku: Map<string, CountLine>;
  /**
   * Lines that DO match a SKU or barcode but carry no `line_id`, keyed the same
   * way. They are kept out of the three resolving maps and held here instead:
   * `line_id` is the only identifier our entries carry, so a count cannot be
   * recorded against such a line — but a scan that hits one deserves to be told
   * why rather than "not in this count".
   */
  unidentified: Map<string, CountLine>;
  /**
   * False when no line in the set carries a barcode. The count-line payload does
   * not include one, so unless the caller joined the catalogue in, a genuine
   * barcode scan cannot be resolved here even though the server would match it —
   * which is a different failure from "that item is not in this count".
   */
  hasBarcodes: boolean;
}

/**
 * Build the lookup the server builds, with the same precedence and the same
 * collision behaviour.
 *
 * Keys are `.trim().toLowerCase()` to mirror the server's `.strip().lower()`. When
 * two lines share a barcode the LAST one wins, because the server assigns into a
 * dict in line order and does the same — client and server must never disagree
 * about which line a scan belongs to.
 *
 * A LINE WITH NO `line_id` IS NOT INDEXED UNDER ANY KEY. `line_id` is a UUIDField
 * server-side, so a blank one means a malformed or renamed payload — and resolving
 * a scan to it would build a tally that submits `{line_id: '', counted_qty: N}`,
 * which fails the serializer's "line_id or a non-blank barcode_or_sku" rule and
 * 400s the whole all-or-nothing batch. The forty good reads must not die for it.
 */
export const buildScanIndex = (lines: CountLine[]): ScanIndex => {
  const byLineId = new Map<string, CountLine>();
  const byBarcode = new Map<string, CountLine>();
  const bySku = new Map<string, CountLine>();
  const unidentified = new Map<string, CountLine>();
  (lines || []).forEach((line) => {
    const sku = (line.sku || '').trim().toLowerCase();
    const barcode = (line.barcode || '').trim().toLowerCase();
    // Blank AFTER trimming: `normalizeCountLine` yields '' for an absent key, and a
    // whitespace-only id is just as unsendable as an empty one.
    if (!(line.line_id || '').trim()) {
      if (sku) unidentified.set(sku, line);
      if (barcode) unidentified.set(barcode, line);
      return;
    }
    byLineId.set(line.line_id, line);
    if (sku) bySku.set(sku, line);
    if (barcode) byBarcode.set(barcode, line);
  });
  return { byLineId, byBarcode, bySku, unidentified, hasBarcodes: byBarcode.size > 0 };
};

export interface ScanResolution {
  line: CountLine | null;
  matchedBy: 'barcode' | 'sku' | null;
  /** The trimmed string, exactly as the server echoes it back in a blocker's `lookup`. */
  lookup: string;
}

/**
 * Resolve a scanned string: BARCODE FIRST, then SKU.
 *
 * The precedence is not cosmetic. One item's barcode can equal another item's SKU,
 * and the server checks barcodes first — so a client that checked SKUs first would
 * post the count to the wrong line and the server would never see the mistake,
 * because the payload carries a line_id by then.
 */
export const resolveScan = (index: ScanIndex, raw: string): ScanResolution => {
  const lookup = (raw || '').trim();
  const key = lookup.toLowerCase();
  if (!key) return { line: null, matchedBy: null, lookup };
  const byBarcode = index.byBarcode.get(key);
  if (byBarcode) return { line: byBarcode, matchedBy: 'barcode', lookup };
  const bySku = index.bySku.get(key);
  if (bySku) return { line: bySku, matchedBy: 'sku', lookup };
  return { line: null, matchedBy: null, lookup };
};

export interface ScanTally {
  lineId: string;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  expectedQty: number;
  /** The ONE absolute figure this line will submit. */
  countedQty: number;
  /** How many times it was scanned. A tally the counter is building, not the value sent. */
  scans: number;
  /**
   * What the server already had, so the row can say "was 7". Deliberately NOT the
   * starting point for `countedQty` — see `applyScan`.
   */
  previousCounted: number | null;
  note: string;
  /** True once a human typed the figure instead of scanning it up. */
  typed: boolean;
}

export interface ScanQuarantine {
  /** The trimmed scanned string, matching a server blocker's `lookup`. */
  lookup: string;
  reason: ScanRejectReason;
  detail: string;
  /** Scanning the same unknown item ten times is one problem, not ten. */
  scans: number;
}

export interface ScanEvent {
  lookup: string;
  matchedBy: 'barcode' | 'sku' | null;
  lineId: string | null;
  /** The running absolute figure after this scan, for the confirmation beep. */
  countedQty: number | null;
  accepted: boolean;
  reason: ScanRejectReason | null;
}

export interface ScanBuffer {
  /** Insertion-ordered, because that is the order the counter worked the shelves in. */
  tallies: ScanTally[];
  quarantined: ScanQuarantine[];
  /** The most recent scan, so the UI can beep or buzz without diffing the buffer. */
  lastEvent: ScanEvent | null;
}

export const emptyScanBuffer = (): ScanBuffer => ({ tallies: [], quarantined: [], lastEvent: null });

const QUARANTINE_DETAIL: Record<ScanRejectReason, string> = {
  // The server's own wording, so one renderer handles a local quarantine and a
  // server blocker identically.
  not_in_count:
    'No line in this count matches that id, SKU or barcode. If the item is genuinely on the shelf, widen the count’s scope or add it explicitly.',
  no_barcode_index:
    'This count was loaded without barcodes, so a barcode cannot be matched here. Type the SKU instead, or reload the count with the item catalogue.',
  unidentified_line:
    'That item is in this count, but the count returned it without a line id, so a quantity cannot be recorded against it. Reload the count and scan it again.'
};

/**
 * Does this lookup look like a retail barcode rather than a SKU?
 *
 * The GTIN family (GTIN-8/12/13/14) is all digits, 8 to 14 of them; the SKUs this
 * catalogue generates carry letters and hyphens (`LS100-IVORY-S`). The distinction
 * only ever picks between two explanations for a scan that already failed — it
 * never decides whether a scan resolves — so a numeric SKU misread as a barcode
 * costs a slightly wrong remedy sentence, not a wrong count.
 */
export const looksLikeBarcode = (value: string): boolean => /^\d{8,14}$/.test((value || '').trim());

/**
 * WHY a lookup did not resolve, decided from the LOOKUP and what the index holds —
 * never from a global flag.
 *
 * The count-line payload carries no barcode, so `hasBarcodes` is false for every
 * count whose caller did not join the catalogue in — which is the DEFAULT. Choosing
 * the reason from that flag alone made `not_in_count` unreachable there and told a
 * counter who typed a SKU that is genuinely absent from the count to go and fix the
 * catalogue, when the fix is to widen the count's scope. Both sentences are
 * remedies, and handing over the wrong one leaves a real shelf item out of the
 * stocktake.
 */
const quarantineReason = (index: ScanIndex, lookup: string): ScanRejectReason => {
  if (index.unidentified.has(lookup.toLowerCase())) return 'unidentified_line';
  if (!index.hasBarcodes && looksLikeBarcode(lookup)) return 'no_barcode_index';
  return 'not_in_count';
};

const tallyFromLine = (line: CountLine): ScanTally => ({
  lineId: line.line_id,
  sku: line.sku,
  name: line.name,
  size: line.size,
  color: line.color,
  expectedQty: line.expected_qty,
  countedQty: 0,
  scans: 0,
  previousCounted: line.counted_qty,
  note: '',
  typed: false
});

/**
 * Record one scan.
 *
 * A REPEATED SCAN INCREMENTS THE TALLY, AND THE TALLY IS SUBMITTED AS AN ABSOLUTE
 * FIGURE. The server overwrites rather than accumulates — a counter who recounts a
 * shelf means "it is 7", not "seven more" — so the buffer models "the current count
 * for this line" and emits exactly one entry per line however many times it was
 * scanned.
 *
 * The tally starts at 0 even when the server already has a counted quantity for
 * that line. Starting from the previous figure would accumulate onto an earlier
 * count, which is precisely what the overwrite rule forbids; the old value is kept
 * as `previousCounted` so the row can show both.
 *
 * A blank scan is a no-op rather than a quarantine: there is nothing to tell the
 * user about an empty string, and the API rejects a blank `barcode_or_sku` anyway.
 *
 * `step` is for a case of twelve — one scan, twelve units — and MUST be a positive
 * whole number. `counted_qty` is an IntegerField(min_value=0) and entries are
 * all-or-nothing, so a step of -1 or 0.5 would tally to a figure that 400s the
 * whole batch and loses every other read in it. An unusable step is refused the way
 * `setScanCount` refuses an unusable typed figure: the buffer comes back untouched,
 * and the tally visibly does not move.
 */
export const applyScan = (buffer: ScanBuffer, index: ScanIndex, raw: string, step = 1): ScanBuffer => {
  if (!Number.isInteger(step) || step < 1) return buffer;
  const { line, matchedBy, lookup } = resolveScan(index, raw);
  if (!lookup) return buffer;

  if (!line) {
    const reason = quarantineReason(index, lookup);
    const existing = buffer.quarantined.find((row) => row.lookup.toLowerCase() === lookup.toLowerCase());
    const quarantined = existing
      ? buffer.quarantined.map((row) => (row === existing ? { ...row, scans: row.scans + 1 } : row))
      : [...buffer.quarantined, { lookup, reason, detail: QUARANTINE_DETAIL[reason], scans: 1 }];
    return {
      tallies: buffer.tallies,
      quarantined,
      lastEvent: { lookup, matchedBy: null, lineId: null, countedQty: null, accepted: false, reason }
    };
  }

  const existing = buffer.tallies.find((tally) => tally.lineId === line.line_id);
  const next = existing
    ? { ...existing, countedQty: existing.countedQty + step, scans: existing.scans + 1 }
    : { ...tallyFromLine(line), countedQty: step, scans: 1 };
  return {
    tallies: existing ? buffer.tallies.map((tally) => (tally === existing ? next : tally)) : [...buffer.tallies, next],
    quarantined: buffer.quarantined,
    lastEvent: { lookup, matchedBy, lineId: line.line_id, countedQty: next.countedQty, accepted: true, reason: null }
  };
};

export interface CountedQtyValidation {
  valid: boolean;
  value: number | null;
  error: string | null;
}

/**
 * What a typed quantity field accepts. `counted_qty` is an IntegerField with
 * min_value=0, so a negative is a 400 and a decimal is a 400 — both worth catching
 * before a round trip.
 */
export const validateCountedQtyInput = (raw: string): CountedQtyValidation => {
  const text = (raw ?? '').trim();
  if (text === '') return { valid: false, value: null, error: 'Enter the counted quantity' };
  if (!/^\d+$/.test(text)) {
    // A leading '-' lands here too: "we counted minus two" is not a thing.
    return { valid: false, value: null, error: 'Whole numbers, zero or more' };
  }
  return { valid: true, value: Number(text), error: null };
};

/** Type an absolute figure over whatever the tally holds. Zero is a real answer. */
export const setScanCount = (buffer: ScanBuffer, index: ScanIndex, lineId: string, countedQty: number): ScanBuffer => {
  const line = index.byLineId.get(lineId);
  if (!line || !Number.isInteger(countedQty) || countedQty < 0) return buffer;
  const existing = buffer.tallies.find((tally) => tally.lineId === lineId);
  const next = { ...(existing ?? tallyFromLine(line)), countedQty, typed: true };
  return {
    ...buffer,
    tallies: existing ? buffer.tallies.map((tally) => (tally === existing ? next : tally)) : [...buffer.tallies, next]
  };
};

/** Attach a note to a line in this batch. */
export const setScanNote = (buffer: ScanBuffer, index: ScanIndex, lineId: string, note: string): ScanBuffer => {
  const line = index.byLineId.get(lineId);
  if (!line) return buffer;
  const existing = buffer.tallies.find((tally) => tally.lineId === lineId);
  const next = { ...(existing ?? tallyFromLine(line)), note: (note ?? '').slice(0, 500) };
  return {
    ...buffer,
    tallies: existing ? buffer.tallies.map((tally) => (tally === existing ? next : tally)) : [...buffer.tallies, next]
  };
};

/**
 * Drop a line from this batch.
 *
 * This removes it from what will be SUBMITTED. It does not un-count the line on
 * the server — there is no call for that, and a line already counted stays counted
 * until something overwrites it.
 */
export const clearScan = (buffer: ScanBuffer, lineId: string): ScanBuffer => ({
  ...buffer,
  tallies: buffer.tallies.filter((tally) => tally.lineId !== lineId)
});

export const dismissQuarantine = (buffer: ScanBuffer, lookup: string): ScanBuffer => ({
  ...buffer,
  quarantined: buffer.quarantined.filter((row) => row.lookup.toLowerCase() !== (lookup || '').trim().toLowerCase())
});

export interface CountEntryPayload {
  line_id: string;
  counted_qty: number;
  note?: string;
}

/**
 * The body POST /stock-counts/{id}/entries/ expects.
 *
 * ONE ENTRY PER LINE, carrying the absolute figure — never one entry per scan.
 * Even within a single request the last entry for a line wins, so N entries for one
 * line would make the batch's meaning depend on array order.
 *
 * Every entry identifies its line by `line_id`, never by `barcode_or_sku`, because
 * line_id takes priority server-side and we have already resolved the scan: sending
 * the barcode would ask the server to repeat a lookup that could, with duplicate
 * barcodes, land somewhere else. Quarantined scans are not in here at all — that is
 * the point of quarantining them, since one unmatched lookup 409s the whole batch
 * and records nothing.
 *
 * A blank note is omitted rather than sent: the server only overwrites a note when
 * the new one is non-empty, so '' is a no-op that reads like an intent to clear.
 */
export const toEntriesPayload = (buffer: ScanBuffer): { entries: CountEntryPayload[] } => ({
  entries: buffer.tallies.map((tally) => ({
    line_id: tally.lineId,
    counted_qty: tally.countedQty,
    ...(tally.note.trim() ? { note: tally.note.trim() } : {})
  }))
});

/** The serializer sets allow_empty=False, so an empty batch is a 400, not a no-op. */
export const canSubmitEntries = (buffer: ScanBuffer): boolean => buffer.tallies.length > 0;

// ---------------------------------------------------------------------------
// The variance table
// ---------------------------------------------------------------------------

export type VarianceTone = MovementTone | 'unknown';

export interface VarianceRow {
  line_id: string;
  inventory_item_id: number;
  sku: string | null;
  name: string;
  size: string;
  color: string;
  expected_qty: number;
  counted_qty: number | null;
  variance: number | null;
  unit_cost: string | null;
  cost_impact: string | null;
  note: string;
  /** name / size / colour, blanks omitted. */
  label: string;
  /** counted_qty is not null — somebody looked. */
  counted: boolean;
  /** A real, non-zero variance. Matches the server's `lines_with_variance` rule. */
  hasVariance: boolean;
  tone: VarianceTone;
  /**
   * True when this line has a variance but no cost on record, so it contributes
   * units to the count and NOTHING to the money column. See `detectMissingCostLines`.
   */
  costMissing: boolean;
  costImpactUnits: number | null;
  expectedText: string;
  countedText: string;
  varianceText: string;
  unitCostText: string;
  costImpactText: string;
}

export const varianceLabel = (line: Pick<CountLine, 'name' | 'size' | 'color'>): string =>
  [line.name, line.size, line.color].filter((part) => (part || '').trim() !== '').join(' / ');

/**
 * One display row per line, with the null-vs-zero distinction carried all the way
 * to the formatted strings.
 *
 * Formatting is delegated to stockFormat so an uncounted line renders the same em
 * dash here as an unknown quantity does everywhere else in the module.
 */
export const buildVarianceRows = (lines: CountLine[]): VarianceRow[] =>
  (lines || []).map((line) => {
    const hasVariance = line.variance !== null && line.variance !== 0;
    return {
      line_id: line.line_id,
      inventory_item_id: line.inventory_item_id,
      sku: line.sku,
      name: line.name,
      size: line.size,
      color: line.color,
      expected_qty: line.expected_qty,
      counted_qty: line.counted_qty,
      variance: line.variance,
      unit_cost: line.unit_cost,
      cost_impact: line.cost_impact,
      note: line.note,
      label: varianceLabel(line),
      counted: line.counted_qty !== null,
      hasVariance,
      tone: line.variance === null ? 'unknown' : movementTone(line.variance),
      costMissing: hasVariance && line.cost_impact === null,
      costImpactUnits: parseMoneyUnits(line.cost_impact),
      expectedText: formatQuantity(line.expected_qty),
      countedText: formatQuantity(line.counted_qty),
      varianceText: formatDelta(line.variance),
      unitCostText: formatUnitCost(line.unit_cost),
      costImpactText: formatUnitCost(line.cost_impact)
    };
  });

export type VarianceSort = 'worst_shrinkage' | 'worst_cost' | 'name';

// Rows with a real variance first, then UNCOUNTED rows, then the matched ones.
// Uncounted outranks matched because "nobody looked at this shelf" is an open
// question, while a matched line is the boring majority and belongs at the bottom.
const sortBucket = (row: VarianceRow): number => (row.hasVariance ? 0 : row.counted ? 2 : 1);

/**
 * Worst first. Uncounted lines are NOT sorted as if their variance were zero —
 * they are bucketed separately, so they cannot be mistaken for lines that matched.
 */
export const sortVarianceRows = (rows: VarianceRow[], mode: VarianceSort = 'worst_shrinkage'): VarianceRow[] =>
  [...rows].sort((a, b) => {
    const bucket = sortBucket(a) - sortBucket(b);
    if (bucket !== 0) return bucket;
    if (mode === 'worst_shrinkage') {
      const left = a.variance ?? 0;
      const right = b.variance ?? 0;
      if (left !== right) return left - right;
    } else if (mode === 'worst_cost') {
      // A variance with no cost on record sorts last within its bucket: we cannot
      // rank what we do not know, and pretending it is 0.00 would rank it as
      // harmless. The exclusion notice is what tells the user about these.
      if ((a.costImpactUnits === null) !== (b.costImpactUnits === null)) return a.costImpactUnits === null ? 1 : -1;
      const left = a.costImpactUnits ?? 0;
      const right = b.costImpactUnits ?? 0;
      if (left !== right) return left - right;
    }
    return a.label.localeCompare(b.label);
  });

export interface MissingCostReport {
  /** Lines with a real variance and no cost on record. */
  lineCount: number;
  /** Units of variance those lines represent, as a positive magnitude. */
  units: number;
  hasExclusions: boolean;
  /** Ready-to-render sentence, or null when there is nothing to disclose. */
  message: string | null;
}

/**
 * THE ZERO-COST TRAP.
 *
 * When an item's `cost_price` is 0 the backend stores `unit_cost_snapshot` as NULL,
 * so `unit_cost` and `cost_impact` come back null while `variance` is a real
 * number — and `net_cost_impact` SKIPS those lines. The money column therefore
 * genuinely does not sum to the displayed total, and no amount of client-side
 * arithmetic will make it.
 *
 * The only honest response is to say so, which needs both figures: how many lines
 * were left out and how many units they represent.
 */
export const detectMissingCostLines = (lines: CountLine[]): MissingCostReport => {
  let lineCount = 0;
  let units = 0;
  (lines || []).forEach((line) => {
    // A zero variance contributes nothing to the figure either way, and an
    // uncounted line was never observed — neither is an exclusion worth reporting.
    if (line.variance === null || line.variance === 0) return;
    if (line.cost_impact !== null) return;
    lineCount += 1;
    units += Math.abs(line.variance);
  });
  if (lineCount === 0) return { lineCount: 0, units: 0, hasExclusions: false, message: null };
  const noun = lineCount === 1 ? '1 line has' : `${lineCount} lines have`;
  const unitNoun = units === 1 ? '1 unit' : `${units} units`;
  return {
    lineCount,
    units,
    hasExclusions: true,
    message: `${noun} no cost on record (${unitNoun}) and ${lineCount === 1 ? 'is' : 'are'} not included in this figure.`
  };
};

export interface VarianceTotals {
  // Field names mirror the API summary so a caller can diff the two directly.
  total_lines: number;
  counted_lines: number;
  uncounted_lines: number;
  lines_with_variance: number;
  net_variance_units: number;
  shrinkage_units: number;
  overage_units: number;
  /** 4dp string summed in integer ten-thousandths, or null when no line had a cost. */
  net_cost_impact: string | null;
  netCostImpactText: string;
  missingCost: MissingCostReport;
}

/**
 * The totals row, computed the way the server computes it.
 *
 * Money is summed as integers and rendered once at the end. The result is expected
 * to equal the API's `net_cost_impact` exactly — including the fact that both skip
 * lines with no cost snapshot — so a mismatch is a real signal rather than
 * floating-point noise.
 *
 * `net_cost_impact` is null when NO line carried a cost impact, because "we have no
 * money figure" and "the money nets to zero" are different statements and only one
 * of them is 0.0000.
 */
export const varianceTotals = (lines: CountLine[]): VarianceTotals => {
  let counted = 0;
  let uncounted = 0;
  let withVariance = 0;
  let netUnits = 0;
  let shrinkage = 0;
  let overage = 0;
  let costUnits: number | null = null;

  (lines || []).forEach((line) => {
    if (line.variance === null) {
      uncounted += 1;
      return;
    }
    counted += 1;
    if (line.variance !== 0) withVariance += 1;
    netUnits += line.variance;
    if (line.variance < 0) shrinkage += -line.variance;
    else overage += line.variance;
    const impact = parseMoneyUnits(line.cost_impact);
    if (impact !== null) costUnits = (costUnits ?? 0) + impact;
  });

  const netCostImpact = formatMoneyUnits(costUnits);
  return {
    total_lines: (lines || []).length,
    counted_lines: counted,
    uncounted_lines: uncounted,
    lines_with_variance: withVariance,
    net_variance_units: netUnits,
    shrinkage_units: shrinkage,
    overage_units: overage,
    net_cost_impact: netCostImpact,
    netCostImpactText: formatUnitCost(netCostImpact),
    missingCost: detectMissingCostLines(lines)
  };
};

// ---------------------------------------------------------------------------
// Creating a count
// ---------------------------------------------------------------------------

export interface CountScopeFilterDraft {
  category?: string;
  productId?: string;
  search?: string;
  withStockOnly?: boolean;
}

export interface CountDraft {
  /** Null lets the backend pick the default location. '' must NEVER be sent. */
  locationId: string | null;
  /** '' is fine — the backend allocates SC-000001. null would be a 400. */
  reference: string;
  scope: CountScope;
  scopeFilter: CountScopeFilterDraft;
  notes: string;
}

export const emptyCountDraft = (): CountDraft => ({
  locationId: null,
  reference: '',
  scope: 'all',
  scopeFilter: {},
  notes: ''
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): boolean => typeof value === 'string' && UUID_RE.test(value.trim());

export interface CountDraftValidation {
  valid: boolean;
  errors: Partial<Record<'locationId' | 'reference' | 'scope' | 'productId', string>>;
}

/**
 * The guards that keep a create call off the 500 path.
 *
 * Three of these are not cosmetic validation, they are crash prevention: a
 * non-object `scope_filter` and a non-UUID `product_id` are both AttributeErrors
 * server-side, and a malformed `location_id` is a 500 on the list endpoint too.
 *
 * The category guard is different — it prevents a QUIET wrong answer. A
 * `category` scope with no category selected does not fail; the backend simply
 * skips the filter, and the user gets a full stocktake of the whole location
 * believing they scoped it to one rail.
 */
export const validateCountDraft = (draft: CountDraft): CountDraftValidation => {
  const errors: CountDraftValidation['errors'] = {};

  if (draft.locationId !== null && draft.locationId !== undefined && !isUuid(draft.locationId)) {
    errors.locationId = 'Choose a location, or leave it unset to use the default';
  }

  if ((draft.reference ?? '').trim().length > 64) {
    errors.reference = 'Reference cannot be longer than 64 characters';
  }

  if (!COUNT_SCOPES.includes(draft.scope)) {
    errors.scope = 'Choose what to count';
  }

  if (draft.scope === 'category' && !(draft.scopeFilter?.category ?? '').trim()) {
    errors.scope = 'Choose a category — without one this counts every item at the location';
  }

  const productId = draft.scopeFilter?.productId;
  if (productId !== undefined && productId !== null && productId.trim() !== '' && !isUuid(productId)) {
    errors.productId = 'That is not a valid style id';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

export interface CountCreatePayload {
  scope: CountScope;
  scope_filter: Record<string, unknown>;
  notes: string;
  location_id?: string;
  reference?: string;
}

/**
 * The body POST /inventory/stock-counts/ expects.
 *
 * `notes` is ALWAYS a string: `{"notes": null}` is a 400, and an empty textarea
 * bound straight to state is exactly how null gets there.
 *
 * `scope_filter` is ALWAYS a plain object, with blanks dropped. Anything else — a
 * list, a string, null — is a 500, so a garbage draft is flattened to `{}` here
 * rather than forwarded.
 *
 * `location_id` and `reference` are OMITTED when blank rather than sent empty. A
 * malformed location_id is a 500; '' as a reference happens to be legal (it
 * auto-allocates SC-000001) but omitting says the same thing without relying on
 * that.
 *
 * A NARROWED SCOPE WHOSE FILTER CAME OUT EMPTY IS REPORTED AS `scope: 'all'`. This is
 * the module's one quiet-wrong-answer trap: `_scoped_items` reads
 * `(scope_filter or {}).get("category")` and simply SKIPS a filter it cannot find, so
 * `{scope: 'category', scope_filter: {}}` does not fail — it stocktakes the whole
 * location while the user believes they scoped one rail. `validateCountDraft` is the
 * gate that stops that reaching here, and it can be skipped; when it is, the payload
 * must at least describe what the server will really do, so the count reads "All
 * items" afterwards instead of naming a rail it never scoped.
 */
export const toCountCreatePayload = (draft: CountDraft): CountCreatePayload => {
  const requested: CountScope = COUNT_SCOPES.includes(draft.scope) ? draft.scope : 'all';
  const source: CountScopeFilterDraft =
    draft.scopeFilter && typeof draft.scopeFilter === 'object' && !Array.isArray(draft.scopeFilter) ? draft.scopeFilter : {};

  const scopeFilter: Record<string, unknown> = {};
  const category = (source.category ?? '').trim();
  const search = (source.search ?? '').trim();
  const productId = (source.productId ?? '').trim();
  if (requested !== 'all') {
    if (category) scopeFilter.category = category;
    if (requested === 'filter') {
      if (search) scopeFilter.search = search;
      // Only a real UUID goes on the wire; anything else is a server-side 500.
      if (isUuid(productId)) scopeFilter.product_id = productId;
      if (source.withStockOnly) scopeFilter.with_stock_only = true;
    }
  }

  const reference = (draft.reference ?? '').trim();
  const locationId = (draft.locationId ?? '').trim();
  // Every criterion was blank, so nothing narrows anything: say 'all', which is what
  // the server is going to do regardless.
  const scope: CountScope = requested !== 'all' && Object.keys(scopeFilter).length === 0 ? 'all' : requested;

  return {
    scope,
    scope_filter: scopeFilter,
    notes: (draft.notes ?? '').trim(),
    ...(isUuid(locationId) ? { location_id: locationId } : {}),
    ...(reference ? { reference } : {})
  };
};

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export interface CountListFilters {
  statuses?: string[];
  /** Null, '' and an 'all' sentinel all mean "no filter" and must not be sent. */
  locationId?: string | null;
}

const cleanListFilters = (filters: CountListFilters): { statuses: CountStatus[]; locationId: string | null } => {
  const statuses = (filters.statuses ?? [])
    .map((value) => (value ?? '').trim())
    .filter((value): value is CountStatus => isCountStatus(value));
  const raw = (filters.locationId ?? '').trim();
  // An unknown status is a 400 and a malformed location_id is a 500, so both are
  // dropped here rather than forwarded to find out. Requiring a UUID also disposes
  // of the '' and 'all' sentinels a Select is prone to hold.
  return { statuses: [...new Set(statuses)], locationId: isUuid(raw) ? raw : null };
};

/** Params object for GET /inventory/stock-counts/. Blank keys are omitted entirely. */
export const toCountListParams = (filters: CountListFilters = {}): Record<string, string | string[]> => {
  const { statuses, locationId } = cleanListFilters(filters);
  return {
    ...(statuses.length ? { status: statuses } : {}),
    ...(locationId ? { location_id: locationId } : {})
  };
};

/**
 * The same filters as a query string, and the one to prefer for multiple statuses.
 *
 * The backend reads `request.GET.getlist("status")`, which needs `status=open&
 * status=review`. Axios 1.x serialises an array as `status[]=open&status[]=review`
 * by default and this app configures no paramsSerializer — so handing the params
 * object straight to axios silently drops every status filter and returns the whole
 * list. Building the string here sidesteps that.
 */
export const toCountListQueryString = (filters: CountListFilters = {}): string => {
  const { statuses, locationId } = cleanListFilters(filters);
  const search = new URLSearchParams();
  statuses.forEach((status) => search.append('status', status));
  if (locationId) search.append('location_id', locationId);
  return search.toString();
};

// ---------------------------------------------------------------------------
// Copy — the rules that look like bugs unless they are explained
// ---------------------------------------------------------------------------

/**
 * Why the expected column disagrees with the shelf report on a busy day.
 *
 * This is the single most likely support ticket in the module, and the answer is
 * that the disagreement is the feature.
 */
export const EXPECTED_SNAPSHOT_NOTE =
  'Expected quantities were snapshotted when this count was opened and do not change afterwards. On a trading day they will disagree with the live on-hand figure, and that is correct: measuring against live stock would turn every sale made during the count into phantom shrinkage.';

/** There is no way to clear a note, only to replace it. */
export const NOTE_OVERWRITE_ONLY_NOTE =
  'A line note can be replaced but not removed. The count only takes a new note when it is non-empty, so leaving the box blank keeps whatever note is already there.';

export const NON_ADMIN_NOTICE =
  'Stocktakes are read-only for your role. Anyone can view counts and their variances, but opening a count, entering quantities, moving it to review, applying it and cancelling it are admin-only.';

export const APPLY_NEEDS_REVIEW_NOTE =
  'Move the count to review first. Applying straight from “Open” is rejected — review is the read-before-commit gate.';

/** Every envelope but the detail one omits lines, so the grid on screen is stale. */
export const LINES_NOT_RETURNED_NOTE = 'Reload the count to see the updated lines — this response did not include them.';

export interface ApplyFailureExplanation {
  /** The backend's own sentence. Never empty. */
  summary: string;
  /** The backend's remediation sentence, when it supplied one. */
  hint: string | null;
  /** Our added sentence, for the parts of the message that read as a user's input but are not. */
  clarification: string | null;
  /** Stock moved since the snapshot. Retrying will keep failing; nothing was written. */
  isStockMoved: boolean;
  /** The count was not in review. The client's copy is stale — refetch. */
  isIllegalTransition: boolean;
  allowedFrom: string[] | null;
  parsed: ParsedApiError;
}

/**
 * Explain a failed apply.
 *
 * Two different 409s arrive here and they are told apart by key presence, not by
 * status code: `allowed_from` means the count was not in review, `hint` with no
 * `allowed_from` means stock moved since the snapshot.
 *
 * THE CLARIFICATION MATTERS. The insufficient-stock message reads "requested 14,
 * only 9 available", and nobody typed 14 — it is the size of the variance this
 * count would post. Without saying so, the user hunts for a field they never
 * filled in.
 */
export const explainApplyFailure = (err: unknown): ApplyFailureExplanation => {
  const parsed = parseApiError(err, 'entries');
  const isIllegalTransition = (parsed.allowedFrom?.length ?? 0) > 0;
  const isStockMoved = !isIllegalTransition && statusOf(err) === 409 && parsed.hint !== null;

  let clarification: string | null = null;
  if (isStockMoved && /requested/i.test(parsed.summary)) {
    clarification =
      'The “requested” figure is the size of the variance this count would post, not a number anyone typed. Nothing was written and the count is still in review; a fresh count is the way forward, because retrying this one will keep failing against the same snapshot.';
  } else if (isIllegalTransition) {
    clarification = APPLY_NEEDS_REVIEW_NOTE;
  }

  return {
    summary: parsed.summary,
    hint: parsed.hint,
    clarification,
    isStockMoved,
    isIllegalTransition,
    allowedFrom: parsed.allowedFrom,
    parsed
  };
};
