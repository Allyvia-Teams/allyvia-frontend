// views/inventory/stockFormat.ts
//
// How stock reads on screen: movement reasons, per-location levels, and the
// adjustment dialog's rules. Pure functions, tested directly.
//
// The recurring principle, borrowed from utils/financeFormat.ts: a number that is
// UNKNOWN must not render as zero. Zero stock and unknown stock lead to different
// decisions, so `null` becomes an em dash rather than a confident 0.

export const EM_DASH = '—';

/** Every reason the backend ledger can record. Mirrors StockMovement.REASONS. */
export type MovementReason =
  | 'sale'
  | 'refund_restock'
  | 'po_receive'
  | 'transfer_out'
  | 'transfer_in'
  | 'count_adjust'
  | 'manual_adjust'
  | 'shrinkage'
  | 'initial';

/**
 * Human labels. Phrased as what HAPPENED, not as a database enum, because this
 * column is read by a shop manager and not by an engineer.
 */
const REASON_LABELS: Record<MovementReason, string> = {
  sale: 'Sold',
  refund_restock: 'Returned to stock',
  po_receive: 'Received',
  transfer_out: 'Sent out',
  transfer_in: 'Received in',
  count_adjust: 'Stocktake',
  manual_adjust: 'Manual adjustment',
  shrinkage: 'Shrinkage',
  initial: 'Opening stock'
};

/**
 * An unrecognised reason falls back to a de-slugged version of itself rather than
 * to 'Unknown'. A future backend reason should read as "Damage write off", not
 * vanish behind a placeholder that tells the reader nothing.
 */
export const reasonLabel = (reason: string): string => {
  const known = REASON_LABELS[reason as MovementReason];
  if (known) return known;
  const cleaned = (reason || '').replace(/_/g, ' ').trim();
  if (!cleaned) return EM_DASH;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

/** Semantic colour for a movement, by what it did to stock. */
export type MovementTone = 'increase' | 'decrease' | 'neutral';

export const movementTone = (delta: number): MovementTone => {
  if (delta > 0) return 'increase';
  if (delta < 0) return 'decrease';
  return 'neutral';
};

/** A signed delta always carries its sign, so +3 and -3 are never confused. */
export const formatDelta = (delta: number | null | undefined): string => {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return EM_DASH;
  return delta > 0 ? `+${delta}` : `${delta}`;
};

/** Quantities: zero is a real number and renders as 0; null does not. */
export const formatQuantity = (quantity: number | null | undefined): string => {
  if (quantity === null || quantity === undefined || Number.isNaN(quantity)) return EM_DASH;
  return `${quantity}`;
};

/**
 * Movement unit cost. Null means the cost was unknown at the time, which the
 * backend records deliberately rather than guessing a zero — so it must not
 * render as 0.00 here either.
 */
export const formatUnitCost = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return EM_DASH;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return EM_DASH;
  return numeric.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

export interface StockLevelRow {
  location_id: string;
  location_name: string;
  is_default: boolean;
  quantity_on_hand: number;
}

export interface ItemStock {
  total: number;
  levels_total: number;
  levels: StockLevelRow[];
  in_transit?: number;
  on_order?: number;
}

/**
 * The one-line answer to "how many do we have".
 *
 * In-transit and on-order are deliberately NOT added to the on-hand figure — they
 * are on no shelf — but they are named, because "8 here, 6 on a van" is the
 * honest answer and hiding the 6 makes a manager reorder something already
 * moving.
 */
export const describeAvailability = (stock: ItemStock): string => {
  const parts = [`${stock.total} on hand`];
  if (stock.in_transit) parts.push(`${stock.in_transit} in transit`);
  if (stock.on_order) parts.push(`${stock.on_order} on order`);
  return parts.join(', ');
};

/**
 * True when the denormalized total disagrees with the sum of its locations.
 *
 * It never should — the backend maintains one from the other in a transaction —
 * so surfacing it is a cheap tripwire rather than an expected state. Silence here
 * is the point.
 */
export const hasLevelDrift = (stock: ItemStock): boolean => stock.total !== stock.levels_total;

/** Sort for display: the default location first, then alphabetically. */
export const sortLevels = (levels: StockLevelRow[]): StockLevelRow[] =>
  [...levels].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return a.location_name.localeCompare(b.location_name);
  });

/** Low-stock highlighting for a matrix cell or a level chip. */
export type StockSeverity = 'out' | 'low' | 'ok';

export const stockSeverity = (quantity: number, reorderPoint: number | null | undefined): StockSeverity => {
  if (quantity <= 0) return 'out';
  // No reorder point means nobody has said what "low" is for this item, so we do
  // not invent a threshold — Session 5's suggestions exist to fill that in.
  if (reorderPoint === null || reorderPoint === undefined) return 'ok';
  return quantity <= reorderPoint ? 'low' : 'ok';
};

// ---------------------------------------------------------------------------
// The manual adjustment dialog
// ---------------------------------------------------------------------------
export type AdjustmentMode = 'delta' | 'target';
export type AdjustmentReason = 'manual_adjust' | 'shrinkage';

export interface AdjustmentDraft {
  mode: AdjustmentMode;
  /** Raw field text, because a half-typed "-" must not be coerced to 0. */
  value: string;
  reason: AdjustmentReason;
  note: string;
  locationId: string | null;
}

export interface AdjustmentValidation {
  valid: boolean;
  errors: Partial<Record<'value' | 'note' | 'locationId', string>>;
}

/**
 * The dialog's rules, matching the backend serializer so the user is corrected
 * before a round trip rather than after one.
 *
 * A NOTE IS REQUIRED. This is the one movement with no external cause to point
 * at, so the reason has to come from the person making it — otherwise the ledger
 * records that stock changed and nothing about why, which is the situation the
 * whole module exists to end.
 */
export const validateAdjustment = (draft: AdjustmentDraft): AdjustmentValidation => {
  const errors: AdjustmentValidation['errors'] = {};

  const raw = (draft.value ?? '').trim();
  if (raw === '') {
    errors.value = draft.mode === 'delta' ? 'Enter a change, e.g. -2' : 'Enter the counted quantity';
  } else if (!/^-?\d+$/.test(raw)) {
    errors.value = 'Whole numbers only';
  } else {
    const numeric = Number(raw);
    if (draft.mode === 'delta' && numeric === 0) {
      errors.value = 'A change of 0 would not adjust anything';
    }
    if (draft.mode === 'target' && numeric < 0) {
      errors.value = 'A counted quantity cannot be negative';
    }
  }

  if (!(draft.note ?? '').trim()) {
    errors.note = 'Say why — an adjustment without a reason cannot be audited later';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/** The body POST /inventory/items/{id}/stock/adjust/ expects. */
export const toAdjustmentPayload = (draft: AdjustmentDraft) => {
  const numeric = Number((draft.value ?? '').trim());
  return {
    ...(draft.mode === 'delta' ? { delta: numeric } : { target: numeric }),
    reason: draft.reason,
    note: draft.note.trim(),
    ...(draft.locationId ? { location_id: draft.locationId } : {})
  };
};

/**
 * Turn a 409 from the adjust endpoint into something a person can act on.
 *
 * The backend answers 409 with `{detail, requested, available}` for insufficient
 * stock, and the numbers are the useful part — "only 2 at Downtown" tells the
 * operator what to do, "Conflict" does not.
 */
export const describeAdjustmentError = (error: unknown): string => {
  const response = (error as { response?: { status?: number; data?: Record<string, unknown> } })?.response;
  const data = response?.data ?? {};
  if (response?.status === 409 && typeof data.available === 'number') {
    return `${data.detail ?? 'Not enough stock.'} (requested ${data.requested}, available ${data.available})`;
  }
  if (typeof data.detail === 'string') return data.detail;
  const firstFieldError = Object.values(data).find((value) => Array.isArray(value) && value.length);
  if (Array.isArray(firstFieldError)) return String(firstFieldError[0]);
  return 'Could not adjust stock. Please try again.';
};
