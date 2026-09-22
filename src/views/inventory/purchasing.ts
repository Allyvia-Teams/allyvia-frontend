// views/inventory/purchasing.ts
//
// Suppliers and purchase orders, as pure functions. No React here so the rules
// that decide what a buyer is allowed to do — and what a delivery costs — can be
// tested directly, which is the house convention in this folder.
//
// THE MONEY RULE, AND WHY THIS FILE HAS ITS OWN READER
// Every decimal on this API arrives as a JSON *string* with 2 or 4 decimal
// places, EXCEPT from `POST /purchase-orders/{id}/receive/`, which bypasses the
// serializer and returns the same keys as JSON *numbers*. So one screen reads
// `unit_cost: "24.5000"` before receiving and `unit_cost: 24.5` after it, and a
// reader that handles only one of them renders half the page as an em dash.
// `readMoney` accepts both and yields the same exact value.
//
// Beyond that: a buyer reconciles landed cost against a freight invoice, so the
// arithmetic here is integer arithmetic (bigint ten-thousandths), never floats.
// `0.1 + 0.2` losing a cent on a $40,000 container is not a rounding curiosity,
// it is a wrong number on a page that claims to reconcile.
//
// And an unknown money value renders as an em dash, never 0.00 — the same
// principle stockFormat.ts already applies to stock: unknown and zero lead to
// different decisions.

import { blockersByLineId, parseApiError, statusOf, unattachedBlockers } from './apiErrors';
import { EM_DASH, formatQuantity } from './stockFormat';

// ---------------------------------------------------------------------------
// Money on this wire
// ---------------------------------------------------------------------------

/** Anything this API can put in a money field. */
export type WireMoney = string | number | null | undefined;

/** The finest scale the API uses. Line costs are 4dp; totals and fees are 2dp. */
const MONEY_PLACES = 4;
const MONEY_SCALE = 10000n;

const DECIMAL_RE = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Integer division rounding halves AWAY FROM ZERO.
 *
 * This is Python's `ROUND_HALF_UP`, which is what the backend quantizes every
 * money value with. Matching it exactly is the whole point: the landed-cost
 * preview below has to predict the number the server will store, and JS's
 * `Math.round` (half up toward +Infinity) disagrees with it on negatives.
 */
const divideHalfUp = (numerator: bigint, denominator: bigint): bigint => {
  const negative = numerator < 0n !== denominator < 0n;
  const a = numerator < 0n ? -numerator : numerator;
  const b = denominator < 0n ? -denominator : denominator;
  const quotient = a / b;
  const rounded = (a % b) * 2n >= b ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
};

/** Exact decimal text → ten-thousandths. null when this is not a number at all. */
const scaleDecimalText = (text: string): bigint | null => {
  const trimmed = text.trim();
  if (!DECIMAL_RE.test(trimmed)) return null;

  const negative = trimmed.startsWith('-');
  const [whole, fraction = ''] = (negative ? trimmed.slice(1) : trimmed).split('.');
  const padded = (fraction + '0000').slice(0, MONEY_PLACES);
  let scaled = BigInt(whole || '0') * MONEY_SCALE + BigInt(padded);
  // Nothing on this API carries a fifth decimal, but if one ever appears,
  // rounding it beats truncating it: silently dropping digits understates cost.
  if (fraction.length > MONEY_PLACES && Number(fraction[MONEY_PLACES]) >= 5) scaled += 1n;
  return negative ? -scaled : scaled;
};

/** Ten-thousandths → grouped decimal text at `places`, sign included. */
const formatScaled = (scaled: bigint, places: number): string => {
  const rounded = divideHalfUp(scaled, 10n ** BigInt(MONEY_PLACES - places));
  const negative = rounded < 0n;
  const digits = (negative ? -rounded : rounded).toString().padStart(places + 1, '0');
  const whole = digits.slice(0, digits.length - places);
  const fraction = places > 0 ? digits.slice(digits.length - places) : '';
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
};

export interface MoneyReading {
  /** False when the wire carried null, blank or garbage — display an em dash. */
  known: boolean;
  /** Exact value in ten-thousandths. Use this for anything that must reconcile. */
  scaled: bigint;
  /** Whole cents, for ordinary arithmetic. null when unknown. */
  cents: number | null;
}

const UNKNOWN_MONEY: MoneyReading = { known: false, scaled: 0n, cents: null };

/**
 * Read a money field from either of the two shapes this API sends.
 *
 * `cents` is rounded to whole cents and so is lossy for a 4dp landed cost —
 * anything reconciling against a supplier invoice should use `scaled`.
 */
export const readMoney = (value: WireMoney): MoneyReading => {
  if (value === null || value === undefined || value === '') return UNKNOWN_MONEY;

  // A JSON number is the receive endpoint's shape. `toFixed(4)` is lossless for
  // anything this API can send (4dp is its finest scale) and, unlike String(),
  // it never produces exponent notation for a large total.
  const text = typeof value === 'number' ? (Number.isFinite(value) ? value.toFixed(MONEY_PLACES) : '') : String(value);

  const scaled = scaleDecimalText(text);
  if (scaled === null) return UNKNOWN_MONEY;
  return { known: true, scaled, cents: Number(divideHalfUp(scaled, 100n)) };
};

/** Whole cents for arithmetic, or null when the value is unknown. */
export const moneyCents = (value: WireMoney): number | null => readMoney(value).cents;

/**
 * Money for display: `$1,234.50`, or an em dash when unknown.
 *
 * Deliberately NOT stockFormat's `formatUnitCost`, which is float+locale based
 * and always 2dp: a 4dp landed cost of 22.3456 would render there as $22.35,
 * throwing away exactly the precision a buyer is checking. That function still
 * belongs on movement rows; this one is for anything that has to add up.
 */
export const formatMoney = (value: WireMoney, places: 2 | 4 = 2): string => {
  const money = readMoney(value);
  if (!money.known) return EM_DASH;
  const negative = money.scaled < 0n;
  return `${negative ? '-' : ''}$${formatScaled(negative ? -money.scaled : money.scaled, places)}`;
};

/** A 4dp cost (unit cost, landed unit cost) at full precision. */
export const formatCost = (value: WireMoney): string => formatMoney(value, 4);

/** Plain decimal text with no symbol and no grouping — what a payload should carry. */
const toDecimalText = (scaled: bigint, places: number): string => formatScaled(scaled, places).replace(/,/g, '');

// ---------------------------------------------------------------------------
// Status vocabulary
// ---------------------------------------------------------------------------

export type PoStatus = 'draft' | 'submitted' | 'partially_received' | 'received' | 'cancelled';

/** In lifecycle order, which is the order the filter chips should read in. */
export const PO_STATUSES: PoStatus[] = ['draft', 'submitted', 'partially_received', 'received', 'cancelled'];

const PO_STATUS_LABELS: Record<PoStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  partially_received: 'Partially received',
  received: 'Received',
  cancelled: 'Cancelled'
};

/**
 * The label, falling back to a de-slugged version of an unrecognised status
 * rather than to 'Unknown' — the same reasoning as stockFormat.reasonLabel. The
 * API sends `status_label` too; prefer that when you have it and use this when
 * you only have the enum (a filter chip, an optimistic update).
 */
export const poStatusLabel = (status: string): string => {
  const known = PO_STATUS_LABELS[status as PoStatus];
  if (known) return known;
  const cleaned = (status || '').replace(/_/g, ' ').trim();
  if (!cleaned) return EM_DASH;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

/** MUI chip/palette colour keys. */
export type PoStatusColor = 'default' | 'info' | 'warning' | 'success' | 'error';

const PO_STATUS_COLORS: Record<PoStatus, PoStatusColor> = {
  draft: 'default',
  submitted: 'info',
  // Amber: a part-delivered order is the one state that needs a human to chase
  // the rest, so it must not look as settled as 'received'.
  partially_received: 'warning',
  received: 'success',
  cancelled: 'error'
};

export const poStatusColor = (status: string): PoStatusColor => PO_STATUS_COLORS[status as PoStatus] ?? 'default';

export type PoAction = 'edit' | 'submit' | 'cancel' | 'receive';

/**
 * Which actions the backend will actually accept from this status.
 *
 * Mirrors inventory/purchasing.py's transition guards exactly:
 *   edit    — draft only (`is_editable`)
 *   submit  — draft only
 *   cancel  — draft or submitted, never after a receipt
 *   receive — submitted or partially_received
 *
 * Derived from the status alone so a toolbar cannot offer a button whose only
 * possible outcome is a 409. That matters most for cancel: once anything has
 * been received the PO is in `partially_received`, and the endpoint answers with
 * the illegal-transition body — the friendlier "already received N units"
 * message the service layer can raise is unreachable over HTTP, so there is no
 * copy to soften the failure with. Hide the button instead.
 */
export const poActionsFor = (status: string): Record<PoAction, boolean> => ({
  edit: status === 'draft',
  submit: status === 'draft',
  cancel: status === 'draft' || status === 'submitted',
  receive: status === 'submitted' || status === 'partially_received'
});

export const canPoAction = (status: string, action: PoAction): boolean => poActionsFor(status)[action];

// ---------------------------------------------------------------------------
// The objects
// ---------------------------------------------------------------------------

export interface PurchaseOrderLine {
  id: string;
  /** An INTEGER pk, unlike every uuid on the parent object. */
  inventory_item_id: number;
  sku: string;
  name: string;
  size: string;
  color: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: WireMoney;
  /** null until a receipt happens: nothing has actually landed yet. */
  landed_unit_cost: WireMoney;
  /** What it WILL cost, available from the draft onwards. Not an actual. */
  projected_landed_unit_cost: WireMoney;
  line_value: WireMoney;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  status: PoStatus | string;
  status_label: string;
  supplier_id: string;
  supplier_name: string;
  destination_id: string;
  destination_name: string;
  /** 'YYYY-MM-DD' or null — a DateField, never a datetime. */
  expected_at: string | null;
  submitted_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  shipping: WireMoney;
  duty: WireMoney;
  other_fees: WireMoney;
  /** Derived server-side = shipping + duty + other_fees. Read-only. */
  landed_cost_pool: WireMoney;
  goods_value: WireMoney;
  total_value: WireMoney;
  notes: string;
  is_editable: boolean;
  lines: PurchaseOrderLine[];
}

/**
 * Which of the two cost figures to show, and how to label it.
 *
 * The pool is distributed over ORDERED value, so `landed_unit_cost` is identical
 * on the first partial receipt and the last — it is not a running average, and
 * the projection it eventually replaces was already the same number. What
 * changes at the first receipt is that the figure stops being a forecast, and
 * that distinction is the one thing the UI must not blur: a projected cost fed
 * into a margin report as an actual is a fiction with two decimal places.
 */
export interface LineCostDisplay {
  text: string;
  isProjection: boolean;
  label: string;
}

export const lineCostDisplay = (line: Pick<PurchaseOrderLine, 'landed_unit_cost' | 'projected_landed_unit_cost'>): LineCostDisplay => {
  const actual = readMoney(line.landed_unit_cost);
  if (actual.known) {
    return { text: formatCost(line.landed_unit_cost), isProjection: false, label: 'Landed unit cost' };
  }
  const projected = readMoney(line.projected_landed_unit_cost);
  return {
    text: projected.known ? formatCost(line.projected_landed_unit_cost) : EM_DASH,
    isProjection: projected.known,
    label: 'Projected landed unit cost'
  };
};

// ---------------------------------------------------------------------------
// Receipt progress
// ---------------------------------------------------------------------------

type QtyLine = Pick<PurchaseOrderLine, 'qty_ordered' | 'qty_received'>;

const asCount = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
};

/** Still to come on this line. Never negative, even if the wire disagrees. */
export const lineOutstanding = (line: QtyLine): number => Math.max(0, asCount(line.qty_ordered) - asCount(line.qty_received));

/**
 * Percentage received, or null when nothing was ordered.
 *
 * null rather than 0 or 100 for the empty denominator, following the repo's
 * finance convention: a figure that is undefined renders as an em dash and never
 * as a confident number. NaN% on a progress bar is the failure mode this avoids.
 */
export const lineReceivedPercent = (line: QtyLine): number | null => {
  const ordered = asCount(line.qty_ordered);
  if (ordered <= 0) return null;
  return (asCount(line.qty_received) / ordered) * 100;
};

export interface ReceiptProgress {
  ordered: number;
  received: number;
  outstanding: number;
  percent: number | null;
  /** Every ordered unit has arrived. False for an empty PO — nothing arrived. */
  fullyReceived: boolean;
  /** At least one unit has arrived, which is what forecloses cancelling. */
  anyReceived: boolean;
}

/** The whole-PO rollup, summed from the lines rather than trusted from a header. */
export const receiptProgress = (lines: QtyLine[]): ReceiptProgress => {
  const rows = lines ?? [];
  const ordered = rows.reduce((total, line) => total + asCount(line.qty_ordered), 0);
  const received = rows.reduce((total, line) => total + asCount(line.qty_received), 0);
  const outstanding = rows.reduce((total, line) => total + lineOutstanding(line), 0);
  return {
    ordered,
    received,
    outstanding,
    percent: ordered > 0 ? (received / ordered) * 100 : null,
    // An order with no lines is not "complete"; it has nothing to complete.
    fullyReceived: ordered > 0 && outstanding === 0,
    anyReceived: received > 0
  };
};

export const isFullyReceived = (lines: QtyLine[]): boolean => receiptProgress(lines).fullyReceived;

/** One line's progress in words, for a table cell or an aria-label. */
export const describeLineProgress = (line: QtyLine): string => {
  const outstanding = lineOutstanding(line);
  const base = `${formatQuantity(asCount(line.qty_received))} of ${formatQuantity(asCount(line.qty_ordered))} received`;
  return outstanding > 0 ? `${base}, ${outstanding} outstanding` : base;
};

// ---------------------------------------------------------------------------
// Landed-cost preview
// ---------------------------------------------------------------------------

export interface LandedPreviewLine {
  /** Line uuid once saved, or the draft row's own key before that. */
  key: string;
  qtyOrdered: number;
  unitCost: WireMoney;
}

export interface LandedFees {
  shipping: WireMoney;
  duty: WireMoney;
  other_fees: WireMoney;
}

export interface LandedPreviewShare {
  key: string;
  /** Ordered value, 4dp text. */
  lineValue: string;
  /** This row's slice of the pool, in whole cents. Sums EXACTLY to the pool. */
  shareCents: number;
  /** Share as 2dp text. */
  share: string;
  /** unit cost + share/qty, 4dp text. A projection, never an actual. */
  projectedLandedUnitCost: string;
  /** True on the one row that absorbed the odd cent. */
  carriesRemainder: boolean;
}

export interface LandedPreview {
  /** shipping + duty + other_fees, in whole cents. */
  poolCents: number;
  pool: string;
  goodsValue: string;
  totalValue: string;
  shares: LandedPreviewShare[];
  shareByKey: Map<string, LandedPreviewShare>;
}

/**
 * Predict what the backend will store, so a draft can show landed cost before
 * anyone saves it.
 *
 * This mirrors inventory/purchasing.py::distribute_landed_pool line for line:
 * value-weighted over ORDERED value (a £2,000 line of coats carries more freight
 * than a £50 line of socks), each share rounded half-up to a cent, and the
 * REMAINDER CENT handed to the largest line by value. Every part of that matters:
 *   - dropping the remainder understates cost of goods by a cent per receipt,
 *     forever;
 *   - spreading it around makes the answer depend on iteration order;
 *   - so the shares must sum to the pool exactly, and there is a test that says so.
 *
 * The one place this CANNOT match the server is the tie-break. The backend breaks
 * a tie on ordered value with `str(line.id)`, and a draft's rows have no server
 * ids yet — so with two lines of identical value the odd cent may land on the
 * other one once saved. The pool total is unaffected; only which line carries
 * the cent, and only while equal-valued. Refetch after saving rather than
 * reconciling against this.
 */
export const previewLandedCosts = (lines: LandedPreviewLine[], fees: LandedFees): LandedPreview => {
  const rows = lines ?? [];
  const poolScaled = [fees?.shipping, fees?.duty, fees?.other_fees].reduce<bigint>((total, value) => total + readMoney(value).scaled, 0n);
  const poolCents = divideHalfUp(poolScaled, 100n);

  const valued = rows.map((row) => {
    const qty = Math.max(0, asCount(row.qtyOrdered));
    const unitCost = readMoney(row.unitCost).scaled;
    return { key: row.key, qty, unitCost, lineValue: unitCost * BigInt(qty) };
  });
  const totalValue = valued.reduce<bigint>((total, row) => total + row.lineValue, 0n);

  // A zero pool, or a PO of free samples, gives every line zero — not a division
  // by zero and not a NaN on the page.
  const distribute = poolCents > 0n && totalValue > 0n;
  const cents = new Map<string, bigint>(valued.map((row) => [row.key, 0n]));
  if (distribute) {
    valued.forEach((row) => cents.set(row.key, divideHalfUp(poolCents * row.lineValue, totalValue)));
  }

  let remainderKey: string | null = null;
  if (distribute) {
    const allocated = valued.reduce<bigint>((total, row) => total + (cents.get(row.key) ?? 0n), 0n);
    const remainder = poolCents - allocated;
    if (remainder !== 0n) {
      const biggest = valued.reduce((best, row) =>
        row.lineValue > best.lineValue || (row.lineValue === best.lineValue && row.key > best.key) ? row : best
      );
      cents.set(biggest.key, (cents.get(biggest.key) ?? 0n) + remainder);
      remainderKey = biggest.key;
    }
  }

  const shares = valued.map((row) => {
    const shareCents = cents.get(row.key) ?? 0n;
    // share / qty at 4dp: the share is in cents, so ×100 lifts it to
    // ten-thousandths before the division. Half-up, matching the backend's
    // _cost() quantize — and skipped entirely at qty 0, as the backend does.
    const perUnit = row.qty > 0 ? divideHalfUp(shareCents * 100n, BigInt(row.qty)) : 0n;
    return {
      key: row.key,
      lineValue: toDecimalText(row.lineValue, 4),
      shareCents: Number(shareCents),
      share: toDecimalText(shareCents * 100n, 2),
      projectedLandedUnitCost: toDecimalText(row.unitCost + perUnit, 4),
      carriesRemainder: row.key === remainderKey
    };
  });

  return {
    poolCents: Number(poolCents),
    pool: toDecimalText(poolCents * 100n, 2),
    goodsValue: toDecimalText(totalValue, 4),
    totalValue: toDecimalText(totalValue + poolCents * 100n, 4),
    shares,
    shareByKey: new Map(shares.map((share) => [share.key, share]))
  };
};

// ---------------------------------------------------------------------------
// Receiving a delivery
// ---------------------------------------------------------------------------

export interface ReceiveDraftRow {
  lineId: string;
  /** Raw field text: a half-typed entry must not be coerced into a quantity. */
  qty: string;
}

export interface ReceivePayload {
  lines: Array<{ line_id: string; qty: number }>;
}

export interface ReceiveDraftResult {
  valid: boolean;
  /** Whole-submission message, null when there is nothing to say. */
  error: string | null;
  /** Per-line messages keyed by line id. */
  lineErrors: Record<string, string>;
  /** The request body, or null when it must not be sent. */
  payload: ReceivePayload | null;
  /**
   * The line ids in payload order. Blank rows are dropped, so this is a SUBSET of
   * the form's rows and the only record of what was actually sent.
   *
   * It is NOT index-aligned with a 409's `detail[]`. The backend appends a blocker
   * only for entries that failed, so a two-line receipt whose SECOND line is bad
   * answers with a one-element array whose index 0 refers to the line that was
   * fine. Match on `line_id` — hand this list to `receiveConflict` below, which
   * does exactly that.
   */
  submittedLineIds: string[];
}

/** Prefill "receive everything outstanding". Fully-received lines stay blank. */
export const receiveAllRows = (lines: Array<Pick<PurchaseOrderLine, 'id'> & QtyLine>): ReceiveDraftRow[] =>
  (lines ?? []).map((line) => {
    const outstanding = lineOutstanding(line);
    return { lineId: line.id, qty: outstanding > 0 ? String(outstanding) : '' };
  });

/**
 * Validate a receive form and build its body.
 *
 * THE QUANTITY IS AN INCREMENT, NOT A NEW TOTAL. `qty` accumulates onto
 * `qty_received`: receiving 2 on a line already at 3 leaves it at 5. Transfers
 * behave the opposite way, which is exactly why there is no shared helper — one
 * function serving both would eventually send a total where a delta was meant
 * and double-receive a delivery.
 *
 * Four things are caught here rather than at the API:
 *   - duplicate line ids are AGGREGATED into one entry. Sending the same id
 *     twice is a `duplicate_line` 409 that rejects the WHOLE receipt, and a form
 *     with a split row (two cartons of the same SKU) will otherwise produce it.
 *   - blank and zero rows are dropped. A receive form lists every line and most
 *     are left empty; `qty: 0` is invalid at this endpoint (unlike an
 *     adjustment, where 0 is merely pointless).
 *   - an empty submission gets a client-side sentence instead of the 400 from
 *     `allow_empty=False`, which reads as "lines: This list may not be empty."
 *   - a quantity over the outstanding balance is refused with the outstanding
 *     number in the message, instead of the `over_receipt` 409 — which also
 *     rejects every other line in the receipt, so one typo loses the lot.
 */
export const buildReceivePayload = (
  rows: ReceiveDraftRow[],
  lines: Array<Pick<PurchaseOrderLine, 'id' | 'sku'> & QtyLine>
): ReceiveDraftResult => {
  const byId = new Map((lines ?? []).map((line) => [line.id, line]));
  const lineErrors: Record<string, string> = {};
  const totals = new Map<string, number>();
  const order: string[] = [];

  (rows ?? []).forEach((row) => {
    const lineId = (row?.lineId ?? '').trim();
    const raw = (row?.qty ?? '').trim();
    if (!lineId) return;
    // Blank is "not receiving this one", which is the normal state of most rows.
    if (raw === '') return;

    if (!/^-?\d+$/.test(raw)) {
      lineErrors[lineId] = 'Whole numbers only';
      return;
    }
    const qty = Number(raw);
    if (qty === 0) return;
    if (qty < 0) {
      lineErrors[lineId] = 'A receipt cannot be negative — use an adjustment to correct a mistake';
      return;
    }
    if (!byId.has(lineId)) {
      lineErrors[lineId] = 'This line is not on this purchase order.';
      return;
    }

    if (!totals.has(lineId)) order.push(lineId);
    totals.set(lineId, (totals.get(lineId) ?? 0) + qty);
  });

  order.forEach((lineId) => {
    const line = byId.get(lineId);
    if (!line) return;
    const outstanding = lineOutstanding(line);
    const qty = totals.get(lineId) ?? 0;
    if (outstanding === 0) {
      lineErrors[lineId] = 'This line is already fully received.';
    } else if (qty > outstanding) {
      lineErrors[lineId] = `Only ${outstanding} of ${asCount(line.qty_ordered)} remain outstanding on this line.`;
    }
  });

  const hasLineErrors = Object.keys(lineErrors).length > 0;
  const submittedLineIds = order.filter((lineId) => !lineErrors[lineId]);

  if (submittedLineIds.length === 0) {
    return {
      valid: false,
      error: hasLineErrors
        ? 'Fix the highlighted lines before receiving.'
        : 'Enter a quantity on at least one line — there is nothing to receive yet.',
      lineErrors,
      payload: null,
      submittedLineIds: []
    };
  }

  if (hasLineErrors) {
    // Partial submission is not on offer: the endpoint writes nothing when any
    // line fails, so sending the good rows now would still be one round trip
    // that changes nothing while looking like progress.
    return { valid: false, error: 'Fix the highlighted lines before receiving.', lineErrors, payload: null, submittedLineIds: [] };
  }

  return {
    valid: true,
    error: null,
    lineErrors,
    payload: { lines: submittedLineIds.map((lineId) => ({ line_id: lineId, qty: totals.get(lineId) as number })) },
    submittedLineIds
  };
};

export interface ReceiveConflict {
  /** One sentence for the Alert above the form. Never empty. */
  summary: string;
  /** Blocker messages keyed by line id, ready to merge into the form's lineErrors. */
  lineErrors: Record<string, string>;
  /**
   * Blockers no row on this form can display: one naming a line the client did not
   * send, or one the server could not attach to a line at all. They belong in the
   * Alert, because a form that swallows them shows a failed receipt with every row
   * looking clean.
   */
  unattributed: string[];
  /**
   * True when a blocker named a line this submission did not contain, which means
   * the client's copy of the PO is stale — refetch before letting the user retry.
   */
  stale: boolean;
}

/**
 * Attribute a 409's blockers to the lines that were actually submitted.
 *
 * BY `line_id`, NEVER BY POSITION. `_validate_receipts` appends a blocker only for
 * entries that FAIL and `continue`s past the ones that pass, so `detail[]` is a
 * subset of what was sent: send [L3, L1], have L1 rejected, and the body carries
 * one blocker at index 0. Indexing `submittedLineIds[0]` paints L3 red — the wrong
 * row, while the wrong number sits unmarked on the right one — and the receipt
 * wrote nothing, so the user retries the same mistake.
 *
 * Pass `submittedLineIds` from `buildReceivePayload`, not the form's rows: blank
 * rows never reached the server and cannot have been blocked.
 */
export const receiveConflict = (err: unknown, submittedLineIds: string[]): ReceiveConflict => {
  const parsed = parseApiError(err, 'lines');
  const submitted = new Set(submittedLineIds ?? []);
  const lineErrors: Record<string, string> = {};
  const unattributed: string[] = [];
  let stale = false;

  blockersByLineId(parsed).forEach((blocker, lineId) => {
    if (submitted.has(lineId)) {
      lineErrors[lineId] = blocker.message;
      return;
    }
    // A line we did not send cannot be shown on a row of this form, and the server
    // knowing about it means our copy of the PO predates someone else's edit.
    stale = true;
    unattributed.push(blocker.message);
  });

  unattachedBlockers(parsed).forEach((blocker) => unattributed.push(blocker.message));

  return { summary: parsed.summary, lineErrors, unattributed, stale };
};

// ---------------------------------------------------------------------------
// Creating and editing a purchase order
// ---------------------------------------------------------------------------

export interface PoDraftLine {
  /** Client-side row identity. Not sent — the server assigns line uuids. */
  key: string;
  inventoryItemId: number | null;
  /** Raw field text throughout, so a half-typed number is never coerced. */
  qtyOrdered: string;
  unitCost: string;
}

export interface PoDraft {
  supplierId: string;
  /** null means "use the company default location". */
  destinationId: string | null;
  expectedAt: string | Date | null;
  poNumber?: string;
  shipping: string;
  duty: string;
  otherFees: string;
  notes: string;
  lines: PoDraftLine[];
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * How long that month really was. Computed arithmetically rather than by round-
 * tripping a Date, because a Date would drag the local timezone into a question
 * that has nothing to do with one — and `new Date(y, m, 0)` silently remaps years
 * 0-99 into the 1900s, which gets February's length wrong for them.
 */
const daysInMonth = (year: number, month: number): number => (month === 2 && isLeapYear(year) ? 29 : MONTH_LENGTHS[month - 1]);

/**
 * 'YYYY-MM-DD' for `expected_at`, which is a DateField: a datetime string is a
 * 400 ("Use one of these formats instead: YYYY-MM-DD.").
 *
 * A Date is read in LOCAL time, not via toISOString(): a buyer west of UTC who
 * picks the 6th at 11pm would have had that sliced into the 7th, and an expected
 * delivery date silently off by one is the kind of bug nobody reports and
 * everybody works around. A string keeps the date component it already names —
 * re-parsing '2026-08-06T00:00:00Z' into local time would shift it the other way.
 *
 * A string is CALENDAR-checked, not just shape-checked. '2026-02-30' matches
 * YYYY-MM-DD and is still not a day: `date.fromisoformat` raises on it and the
 * DateField answers with the same "use YYYY-MM-DD" 400 as 'soon' does — a message
 * that reads as nonsense next to a field already holding a YYYY-MM-DD value. So
 * an impossible date is null here, and `validatePoDraft` refuses it by the same
 * route as any other unsendable one.
 */
export const formatExpectedAt = (value: string | Date | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    // A Date cannot hold a day that does not exist, so there is nothing to check.
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12) return null;
  if (dayNumber < 1 || dayNumber > daysInMonth(Number(year), monthNumber)) return null;
  return `${year}-${month}-${day}`;
};

export type PoDraftField = 'supplierId' | 'destinationId' | 'expectedAt' | 'shipping' | 'duty' | 'otherFees' | 'lines';

export interface PoDraftValidation {
  valid: boolean;
  errors: Partial<Record<PoDraftField, string>>;
  /** Per-row messages keyed by the draft row's `key`. */
  lineErrors: Record<string, string>;
}

const feeError = (value: string): string | null => {
  const raw = (value ?? '').trim();
  // Blank is 0, not an error: most orders have no duty.
  if (raw === '') return null;
  const scaled = scaleDecimalText(raw);
  if (scaled === null) return 'Enter an amount like 120.00';
  if (scaled < 0n) return 'Cannot be negative';
  return null;
};

export const validatePoDraft = (draft: PoDraft): PoDraftValidation => {
  const errors: PoDraftValidation['errors'] = {};
  const lineErrors: Record<string, string> = {};

  // A non-uuid supplier_id is not a 400 on every path — `?supplier_id=` on the
  // list endpoint is an uncaught 500 — so the client checks the shape itself.
  if (!isUuid(draft.supplierId)) errors.supplierId = 'Choose a supplier';
  if (draft.destinationId && !isUuid(draft.destinationId)) errors.destinationId = 'Choose a destination';

  const expectedRaw = draft.expectedAt;
  const expectedProvided = expectedRaw instanceof Date || (typeof expectedRaw === 'string' && expectedRaw.trim() !== '');
  if (expectedProvided && formatExpectedAt(expectedRaw) === null) errors.expectedAt = 'Use a date like 2026-08-06';

  (['shipping', 'duty', 'otherFees'] as const).forEach((field) => {
    const message = feeError(draft[field]);
    if (message) errors[field] = message;
  });

  const rows = draft.lines ?? [];
  if (rows.length === 0) errors.lines = 'Add at least one line — a purchase order with nothing on it cannot be submitted.';

  // One row per variant. `_resolve_lines` answers 400 on a repeated
  // inventory_item_id (and `uniq_inventory_poline_item_per_po` would refuse it
  // anyway), and on PATCH that 400 costs the whole edit — `lines` is a wholesale
  // replacement, so the line grid the user just keyed is lost with it. Refused
  // rather than merged, unlike buildReceivePayload's duplicate aggregation: two
  // receipt rows of one line are two cartons of the same thing, whereas two order
  // rows of one variant usually carry different unit costs, and silently adding the
  // quantities together would pick one of those costs for the buyer.
  const firstRowForItem = new Map<number, number>();

  rows.forEach((row, position) => {
    if (row.inventoryItemId === null || row.inventoryItemId === undefined) {
      lineErrors[row.key] = 'Choose a variant';
      return;
    }
    const firstPosition = firstRowForItem.get(row.inventoryItemId);
    if (firstPosition === undefined) {
      firstRowForItem.set(row.inventoryItemId, position);
    } else {
      // Flag the later row, so the message points at the one to delete and the
      // quantity the user wants keeps a home.
      lineErrors[row.key] = `This variant is already on line ${firstPosition + 1} — combine the quantities into one line.`;
      return;
    }
    const qty = (row.qtyOrdered ?? '').trim();
    if (!/^\d+$/.test(qty) || Number(qty) < 1) {
      lineErrors[row.key] = 'Order at least 1';
      return;
    }
    const cost = scaleDecimalText((row.unitCost ?? '').trim() || '0');
    if (cost === null) {
      lineErrors[row.key] = 'Enter a cost like 24.50';
      return;
    }
    if (cost < 0n) lineErrors[row.key] = 'Cost cannot be negative';
  });

  return { valid: Object.keys(errors).length === 0 && Object.keys(lineErrors).length === 0, errors, lineErrors };
};

/** Money out of a form field: exact digits as a string, so no float touches it. */
const feePayload = (value: string): string => toDecimalText(scaleDecimalText((value ?? '').trim() || '0') ?? 0n, 2);

const linesPayload = (rows: PoDraftLine[]) =>
  (rows ?? []).map((row) => ({
    inventory_item_id: row.inventoryItemId as number,
    qty_ordered: Number((row.qtyOrdered ?? '').trim()),
    // A string, not a Number: the user's typed digits reach the DecimalField
    // unrounded, and '24.5' arrives as 24.5000 rather than as a float's idea of it.
    unit_cost: toDecimalText(scaleDecimalText((row.unitCost ?? '').trim() || '0') ?? 0n, 4)
  }));

/**
 * POST /inventory/purchase-orders/.
 *
 * `destination_id: null` is sent explicitly — the create serializer allows null
 * and the view falls back to the company default location. The PATCH builder
 * below must NOT do the same thing; see there.
 */
export const buildPoCreatePayload = (draft: PoDraft) => ({
  supplier_id: draft.supplierId.trim(),
  destination_id: draft.destinationId ? draft.destinationId.trim() : null,
  expected_at: formatExpectedAt(draft.expectedAt),
  ...(draft.poNumber && draft.poNumber.trim() ? { po_number: draft.poNumber.trim() } : {}),
  shipping: feePayload(draft.shipping),
  duty: feePayload(draft.duty),
  other_fees: feePayload(draft.otherFees),
  notes: (draft.notes ?? '').trim(),
  lines: linesPayload(draft.lines)
});

/**
 * PATCH /inventory/purchase-orders/{id}/ — draft only.
 *
 * TWO ASYMMETRIES WITH CREATE, BOTH LEARNED THE HARD WAY:
 *
 * 1. `destination_id: null` is a 400 here ("This field may not be null.") even
 *    though POST accepts it, because the update serializer's UUIDField is
 *    `required=False` without `allow_null`. So a cleared destination is OMITTED,
 *    which leaves the existing one alone. There is no way to un-set a
 *    destination on an existing PO, and a form that tried would fail its save
 *    with a message about a field the user never touched.
 *
 * 2. `lines` is a WHOLESALE REPLACEMENT: every existing line is deleted and
 *    rebuilt, and every line UUID changes. Omitting the key leaves them
 *    untouched, so `linesChanged` must be false unless the user actually edited
 *    the grid — otherwise a save that only changed the notes silently reissues
 *    every line id, and any receive form still holding the old ones will get
 *    `unknown_line` for all of them.
 */
export const buildPoPatchPayload = (draft: PoDraft, options: { linesChanged: boolean }) => ({
  supplier_id: draft.supplierId.trim(),
  ...(draft.destinationId ? { destination_id: draft.destinationId.trim() } : {}),
  expected_at: formatExpectedAt(draft.expectedAt),
  shipping: feePayload(draft.shipping),
  duty: feePayload(draft.duty),
  other_fees: feePayload(draft.otherFees),
  notes: (draft.notes ?? '').trim(),
  ...(options.linesChanged ? { lines: linesPayload(draft.lines) } : {})
});

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

// Version and variant nibbles are deliberately unconstrained: the database
// accepts any uuid, and this guard exists to keep a non-uuid out of a filter,
// not to police uuid versions.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): boolean => typeof value === 'string' && UUID_RE.test(value.trim());

/** Encode pairs, repeating a key as many times as it appears. */
const buildQuery = (pairs: Array<[string, string]>): string => {
  const params = new URLSearchParams();
  pairs.forEach(([key, value]) => params.append(key, value));
  return params.toString();
};

export interface PoListFilters {
  statuses?: string[];
  supplierId?: string | null;
  locationId?: string | null;
}

/**
 * The query string for GET /inventory/purchase-orders/.
 *
 * A non-uuid `?supplier_id=` or `?location_id=` is an UNCAUGHT 500 — the view
 * feeds the raw value straight into a `filter(...)` and Django raises
 * ValidationError outside any handler. So anything that is not a uuid is omitted
 * and the list comes back unfiltered, which is a page rather than an error page.
 * Use `isUuid` at the call site if you need to grey the filter out instead.
 *
 * Unknown statuses are dropped too: those DO get a clean 400, but a stale
 * bookmark should not be able to break the page either.
 */
export const purchaseOrderListQuery = (filters: PoListFilters = {}): string => {
  const pairs: Array<[string, string]> = [];
  const seen = new Set<string>();
  (filters.statuses ?? []).forEach((status) => {
    if (!PO_STATUSES.includes(status as PoStatus) || seen.has(status)) return;
    seen.add(status);
    // Repeatable: the view reads getlist('status'), which is why this returns a
    // string rather than an object — axios would serialize an array as
    // `status[]=draft` and the filter would silently stop applying.
    pairs.push(['status', status]);
  });
  if (isUuid(filters.supplierId)) pairs.push(['supplier_id', (filters.supplierId as string).trim()]);
  if (isUuid(filters.locationId)) pairs.push(['location_id', (filters.locationId as string).trim()]);
  return buildQuery(pairs);
};

/** GET /inventory/on-order/ — same 500 trap on `?location_id=`. */
export const onOrderQuery = (filters: { locationId?: string | null } = {}): string =>
  isUuid(filters.locationId) ? buildQuery([['location_id', (filters.locationId as string).trim()]]) : '';

/**
 * GET /inventory/suppliers/.
 *
 * The view widens the list only for '1', 'true' or 'yes'. EVERY other value —
 * including 'false' and '0' — reads as active-only, so sending
 * `?include_inactive=false` is not wrong so much as meaningless. The param is
 * omitted entirely when the toggle is off, which is the only form that cannot be
 * misread by a future reader of either side.
 */
export const supplierListQuery = (filters: { includeInactive?: boolean } = {}): string =>
  filters.includeInactive ? buildQuery([['include_inactive', 'true']]) : '';

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: Record<string, unknown>;
  default_lead_time_days: number;
  payment_terms: string;
  notes: string;
  qb_vendor_id: string | null;
  qb_vendor_name: string | null;
  square_vendor_id: string | null;
  is_active: boolean;
  /**
   * An integer ONLY on the list endpoint. POST, PATCH, GET detail and DELETE all
   * return null, because only the list annotates the Count().
   */
  open_po_count: number | null;
  created_at: string;
}

/**
 * Sort by name client-side, because the list endpoint does NOT arrive sorted.
 *
 * Supplier.Meta declares an ordering, but the view annotates Count() — that makes
 * it a GROUP BY query and Django drops the default ordering on those. The rows
 * come back in whatever order Postgres grouped them, which looks stable in
 * testing and shuffles the moment a PO is created.
 */
export const sortSuppliersByName = <T extends { name: string }>(suppliers: T[]): T[] =>
  [...(suppliers ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

/**
 * Open-PO count in words. null is UNKNOWN and must not read as zero.
 *
 * This is the whole reason the trap matters: a detail fetch or a save response
 * carries `open_po_count: null`, and "No open orders" on a supplier with four
 * outstanding orders is a sentence that gets someone's freight cancelled.
 */
export const describeOpenPos = (count: number | null | undefined): string => {
  if (count === null || count === undefined || Number.isNaN(count)) return EM_DASH;
  if (count === 0) return 'No open orders';
  return count === 1 ? '1 open order' : `${count} open orders`;
};

/**
 * Fold a detail/PATCH/DELETE response into the row already on screen.
 *
 * Those responses null `open_po_count`, so spreading one over the list row would
 * blank a figure the client already knew — an edit to a phone number would erase
 * "4 open orders" from the table. Nothing on those endpoints can close a PO, so
 * the previous count is still the truth until the list is refetched.
 */
export const mergeSupplierResponse = <T extends { open_po_count: number | null }>(previous: T | null | undefined, incoming: T): T => ({
  ...incoming,
  open_po_count: incoming.open_po_count ?? previous?.open_po_count ?? null
});

/** Where this supplier's accounting identity lives, if anywhere. */
export const describeVendorLink = (supplier: Pick<Supplier, 'qb_vendor_id' | 'qb_vendor_name' | 'square_vendor_id'>): string => {
  const links: string[] = [];
  if (supplier.qb_vendor_id) {
    // The id without a name means the mirror row has gone; say so rather than
    // printing a bare uuid at somebody.
    links.push(`Linked to QuickBooks: ${supplier.qb_vendor_name?.trim() || 'unnamed vendor'}`);
  }
  if (supplier.square_vendor_id) links.push('Linked to Square');
  return links.length ? links.join(' · ') : 'Not linked';
};

/**
 * The message for the supplier form's name field, or null.
 *
 * A duplicate name is a 400 keyed `name`, NOT a 409 — so a handler that watches
 * for a conflict status shows the generic fallback and the user never learns
 * which field is wrong. And apiErrors.parseApiError deliberately folds top-level
 * field errors into its summary string, which is right for a grid and wrong for
 * a form that wants to paint one input red. Hence this reader.
 */
export const supplierNameError = (err: unknown): string | null => {
  if (statusOf(err) !== 400) return null;
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  const value = data?.name;
  if (Array.isArray(value) && value.length) return String(value[0]);
  if (typeof value === 'string') return value;
  return null;
};

/** True when the 400 was specifically "that name is taken". */
export const isDuplicateSupplierName = (err: unknown): boolean => (supplierNameError(err) ?? '').includes('already exists');

/**
 * One sentence for an Alert, whatever went wrong.
 *
 * Delegates to apiErrors so the eleven body shapes stay in one place; only the
 * name-field case is special, and it is lifted out first so the form can put it
 * where the user is looking.
 */
export const describePurchasingError = (err: unknown, rowKey: 'lines' | 'entries' = 'lines'): string => parseApiError(err, rowKey).summary;
