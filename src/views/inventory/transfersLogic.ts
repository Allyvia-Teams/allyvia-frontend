// views/inventory/transfersLogic.ts
//
// The stock-transfer screen's rules, as pure functions. Named transfersLogic so a
// component file can be Transfers.tsx without a case-only collision.
//
// Transfers are the one inventory flow where a wrong request body destroys data
// silently and returns 200. Three traps, all probe-verified against the running
// backend, and each one has a named guard below:
//
//   TRAP 1 — THE SAME BODY, OPPOSITE CATASTROPHES.
//     PATCH /transfers/{id}/ with {"lines": []} DELETES EVERY LINE and answers 200
//     with qty_total 0, leaving a draft that can never be dispatched.
//     POST /transfers/{id}/receive/ with {"lines": []} means RECEIVE EVERYTHING —
//     the view gates on truthiness, so [] falls through to receive-all.
//     So no builder here may ever emit `lines: []` as a side effect of an empty
//     draft. Clearing lines is a separate, differently-named function
//     (buildClearTransferLinesPayload), and "receive everything" is expressed by
//     OMITTING lines, never by an empty array.
//
//   TRAP 2 — A REPEATED line_id IN receive KEEPS ONLY THE LAST ENTRY.
//     It does not sum and it does not error. A scanner UI that appends one entry
//     per scan therefore UNDER-RECEIVES, and the difference is written off with no
//     shrinkage movement anywhere. buildReceivePayload aggregates by line_id first.
//
//   TRAP 3 — A 400 ON "lines" STILL COMMITS THE HEADER.
//     PATCH saves notes/from_location_id/to_location_id before resolving lines, and
//     the resolver RETURNS a 400 Response instead of raising, so the atomic block
//     commits. transferPatchPartiallySaved() tells the form it must refetch.
//
// There is NO money on the transfer contract — no unit cost, no line value. That is
// why nothing here formats currency: a shortfall's cash value would have to be
// invented, and an invented number in a loss report is worse than no number. The
// copy names the loss in units and says why it is invisible elsewhere.

import { isIllegalTransition, mayHavePartiallySaved, parseApiError } from './apiErrors';
import { toGrid } from './matrix';
// isUuid is purchasing.ts's, deliberately: both list endpoints 500 on a non-uuid
// filter and one regex answering both is better than two that could drift apart.
import { isUuid } from './purchasing';
import { EM_DASH, formatQuantity } from './stockFormat';

// ---------------------------------------------------------------------------
// The wire shapes
// ---------------------------------------------------------------------------
export type TransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled';

export interface TransferLine {
  id: string;
  /** INTEGER, unlike the transfer's own uuid. Mixing the two is a 400. */
  inventory_item_id: number;
  sku: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  qty_dispatched: number;
  /**
   * ACCUMULATING, not absolute. The receive endpoint does
   * `qty_received = qty_received + qty` (inventory/transfers.py:267) and rejects any
   * entry whose qty exceeds that line's qty_in_transit (`reason: "over_receipt"`).
   *
   * So a receive body states what arrived NOW, never the running total. Sending the
   * running total is refused as an over-receipt while qty_received is 0 — and if that
   * check were ever relaxed it would breach the DB CheckConstraint
   * `qty_received <= qty_dispatched` (models.py:1164) and 500 on an IntegrityError.
   * A "received" figure is only ever read from here, never computed and sent back.
   */
  qty_received: number;
  /** Derived server-side as max(0, qty_dispatched - qty_received). Never negative. */
  qty_in_transit: number;
  /**
   * Origin on-hand for this item, and NOT capped by qty — so `qty > available` is a
   * real comparison. Populated ONLY on a draft GET detail / POST / PATCH response;
   * null everywhere else means NOT LOADED, which is not the same as zero.
   *
   * OPTIONAL on purpose, though today's serializer always emits the key: the value is
   * built with a dict `.get()` (transfer_views.py:79), so it is one refactor from being
   * omitted rather than null — and `undefined` fails EVERY `<=` comparison silently,
   * which turns "not loaded" into a confident refusal with a NaN in the shortfall.
   * Declaring it optional makes the compiler, not a test, demand the undefined branch
   * at each of the three read sites. Read it through originAvailability().
   */
  available_at_origin?: number | null;
}

export interface Transfer {
  id: string;
  reference: string;
  status: TransferStatus;
  status_label: string;
  from_location_id: string;
  from_location_name: string;
  to_location_id: string;
  to_location_name: string;
  notes: string;
  /** True iff status === 'draft'. Honoured as a veto, never as the sole source. */
  is_editable: boolean;
  dispatched_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  created_by_email: string | null;
  dispatched_by_email: string | null;
  received_by_email: string | null;
  qty_total: number;
  /** After a receive this is the total SHORTFALL, not stock on a van. See below. */
  qty_in_transit_total: number;
  created_at: string;
  lines: TransferLine[];
}

/**
 * The transfer exactly as the transport types it, where `sku` MAY BE NULL.
 *
 * An item can exist without a SKU (the supplier-catalogue importer allows it), so
 * the API's own type is `string | null` while everything in this module wants a
 * string it can trim. The two are reconciled in exactly one place, below.
 */
export type WireTransfer = Omit<Transfer, 'lines'> & {
  lines: Array<Omit<TransferLine, 'sku'> & { sku: string | null }>;
};

/**
 * Normalise a transfer as it arrives from the API.
 *
 * A null sku becomes '', which is already what every label here means by "no sku,
 * fall back to the name". Doing it at the boundary keeps the coalesce out of each
 * call site and — the actual point — keeps the compiler able to check them: a `as
 * Transfer` at each call would silence this and every future shape change with it.
 */
export const normalizeTransfer = (wire: WireTransfer): Transfer => ({
  ...wire,
  lines: wire.lines.map((line) => ({ ...line, sku: line.sku ?? '' }))
});

// ---------------------------------------------------------------------------
// Status vocabulary
// ---------------------------------------------------------------------------
export type TransferChipColor = 'default' | 'info' | 'success' | 'error';
export type TransferAction = 'edit' | 'dispatch' | 'receive' | 'cancel';

/** Every status the list filter may offer, and the only ones `?status=` accepts. */
export const TRANSFER_STATUSES: TransferStatus[] = ['draft', 'in_transit', 'received', 'cancelled'];

const STATUS_LABELS: Record<TransferStatus, string> = {
  draft: 'Draft',
  in_transit: 'In transit',
  received: 'Received',
  cancelled: 'Cancelled'
};

const STATUS_COLORS: Record<TransferStatus, TransferChipColor> = {
  draft: 'default',
  in_transit: 'info',
  received: 'success',
  cancelled: 'error'
};

/**
 * The server sends `status_label` already; pass it and it wins, because a status
 * this build has never heard of still has a label there. Falling back to a de-slug
 * rather than to "Unknown" follows stockFormat.reasonLabel: a future status should
 * read as "Partially received", not vanish.
 */
export const transferStatusLabel = (status: string, serverLabel?: string | null): string => {
  const supplied = (serverLabel ?? '').trim();
  if (supplied) return supplied;
  const known = STATUS_LABELS[status as TransferStatus];
  if (known) return known;
  const cleaned = (status || '').replace(/_/g, ' ').trim();
  if (!cleaned) return EM_DASH;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export const transferStatusColor = (status: string): TransferChipColor => STATUS_COLORS[status as TransferStatus] ?? 'default';

/**
 * Which actions the backend will actually accept, derived from status alone.
 *
 * A dispatched transfer can only be RECEIVED — there is no reversal flow in v1, so
 * offering Cancel on an in-transit transfer offers a guaranteed 409. Cancel is
 * legal from draft only, and both terminal statuses offer nothing. An unrecognised
 * status offers nothing too: showing no button is recoverable, showing a button
 * that 409s is not.
 */
const LEGAL_ACTIONS: Record<TransferStatus, TransferAction[]> = {
  draft: ['edit', 'dispatch', 'cancel'],
  in_transit: ['receive'],
  received: [],
  cancelled: []
};

export const legalTransferActions = (status: string): TransferAction[] => LEGAL_ACTIONS[status as TransferStatus] ?? [];

export const canTransfer = (status: string, action: TransferAction): boolean => legalTransferActions(status).includes(action);

const ACTION_LABELS: Record<TransferAction, string> = {
  edit: 'Editing',
  dispatch: 'Dispatching',
  receive: 'Receiving',
  cancel: 'Cancelling'
};

/** Derived from LEGAL_ACTIONS so the copy below cannot drift from the gate above. */
const statusesAllowing = (action: TransferAction): TransferStatus[] =>
  TRANSFER_STATUSES.filter((status) => LEGAL_ACTIONS[status].includes(action));

/**
 * WHY an action is unavailable, or null when it is available.
 *
 * A disabled button with no explanation is read as a bug, and the user's next move
 * is to reload and try again. That matters most for Cancel: there is no reversal
 * flow at all, so "you cannot cancel this" is a permanent fact about a dispatched
 * transfer and not a transient state worth retrying.
 *
 * Lives here rather than in the component because the sentence has to agree with
 * LEGAL_ACTIONS, and the only way to guarantee that is to derive it from the table.
 */
export const transferActionUnavailableReason = (status: string, action: TransferAction): string | null => {
  if (canTransfer(status, action)) return null;

  if (action === 'cancel' && status === 'in_transit') {
    return (
      'This transfer has been dispatched — the stock has already left the origin. There is no reversal flow: ' +
      'it can only be received, and anything that did not arrive shows up as a shortfall.'
    );
  }

  const allowed = statusesAllowing(action);
  const current = transferStatusLabel(status).toLowerCase();
  if (allowed.length === 0) return `${ACTION_LABELS[action]} is not something a transfer supports.`;
  return (
    `${ACTION_LABELS[action]} is only possible while a transfer is ` +
    `${allowed.map((entry) => transferStatusLabel(entry).toLowerCase()).join(' or ')} — this one is ${current}.`
  );
};

/**
 * Legal actions for a fetched transfer, letting `is_editable` VETO editing.
 *
 * is_editable is documented as "true iff draft", so it agrees with the status table
 * today. Treating it as a veto rather than as the answer means a future server-side
 * lock (a draft frozen mid-dispatch, say) hides the Edit button instead of handing
 * the user a form whose save is rejected.
 */
export const transferActionsFor = (transfer: Pick<Transfer, 'status' | 'is_editable'>): TransferAction[] =>
  legalTransferActions(transfer.status).filter((action) => action !== 'edit' || transfer.is_editable);

/**
 * Dispatch and cancel read NO body at all.
 *
 * Frozen so a caller cannot decorate it on the way out: an unexpected key in one of
 * these posts is at best ignored and at worst a 400, and both are avoidable.
 */
export const EMPTY_ACTION_BODY: Readonly<Record<string, never>> = Object.freeze({});

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
export const describeTransferRoute = (transfer: Pick<Transfer, 'from_location_name' | 'to_location_name'>): string =>
  `${(transfer.from_location_name || '').trim() || EM_DASH} → ${(transfer.to_location_name || '').trim() || EM_DASH}`;

export const transferLineLabel = (line: Pick<TransferLine, 'sku' | 'name' | 'size' | 'color'>): string => {
  const clean = (value: string) => (value || '').trim();
  const head = [clean(line.sku), clean(line.name)].filter(Boolean).join(' — ');
  const axes = [clean(line.color), clean(line.size)].filter(Boolean).join(' / ');
  if (!head) return axes || EM_DASH;
  return axes ? `${head} (${axes})` : head;
};

/**
 * A size x colour view of a transfer's lines, for receiving a whole size run.
 *
 * Delegates to matrix.toGrid instead of re-deriving the axes, so the receive screen
 * and the catalogue cannot disagree about which sizes exist or what order they go in.
 */
export const transferLineGrid = (lines: TransferLine[]) => toGrid(lines);

// ---------------------------------------------------------------------------
// The draft-line editor
// ---------------------------------------------------------------------------
export interface TransferDraftLine {
  /** React key. A row that has no server id yet still needs a stable identity. */
  key: string;
  /** The server's line uuid, or null for a row the user just added. */
  id: string | null;
  inventoryItemId: number | null;
  sku: string;
  name: string;
  /** Raw field text: a half-typed value must not be coerced to a number. */
  qty: string;
  /** From available_at_origin — null is UNKNOWN, and unknown is not zero. */
  availableAtOrigin: number | null;
}

export interface TransferDraft {
  fromLocationId: string | null;
  toLocationId: string | null;
  notes: string;
  lines: TransferDraftLine[];
}

let draftLineSeq = 0;

/** Unique row key for a line that has no server id to be identified by. */
export const newDraftLineKey = (): string => {
  draftLineSeq += 1;
  return `new-${draftLineSeq}`;
};

export const newTransferDraftLine = (seed: Partial<Omit<TransferDraftLine, 'key'>> = {}): TransferDraftLine => ({
  key: newDraftLineKey(),
  id: seed.id ?? null,
  inventoryItemId: seed.inventoryItemId ?? null,
  sku: seed.sku ?? '',
  name: seed.name ?? '',
  qty: seed.qty ?? '1',
  availableAtOrigin: seed.availableAtOrigin ?? null
});

export type EditableTransfer = Pick<Transfer, 'from_location_id' | 'to_location_id' | 'notes' | 'lines'>;

/**
 * Origin stock as a two-state answer: a number, or null for NOT LOADED.
 *
 * The one place `undefined` is collapsed into `null`, so no comparison downstream can
 * be made against undefined — which is neither true nor false but falsy in a way that
 * reads as "checked and short". Mirrors newTransferDraftLine's `?? null` and
 * stockFormat.formatQuantity, both of which already tolerate an absent value.
 */
export const originAvailability = (line: Pick<TransferLine, 'available_at_origin'>): number | null => line.available_at_origin ?? null;

/** Load a fetched draft into the editor, keyed by the server's own line ids. */
export const transferDraftFrom = (transfer: EditableTransfer): TransferDraft => ({
  fromLocationId: transfer.from_location_id || null,
  toLocationId: transfer.to_location_id || null,
  notes: transfer.notes ?? '',
  lines: transfer.lines.map((line) => ({
    key: line.id,
    id: line.id,
    inventoryItemId: line.inventory_item_id,
    sku: line.sku,
    name: line.name,
    qty: `${line.qty}`,
    // Normalised here so TransferDraftLine.availableAtOrigin cannot lie about its type.
    availableAtOrigin: originAvailability(line)
  }))
});

/** Whole-number field text → number, or null when it is not a whole number yet. */
const parseIntegerText = (raw: string): number | null => {
  const text = (raw ?? '').trim();
  if (!/^-?\d+$/.test(text)) return null;
  return Number(text);
};

/**
 * The origin-stock chip on a draft line.
 *
 * Renders an em dash when availability was not in the response, because "0 at
 * origin" is a claim the API never made and would stop a buyer building a transfer
 * that is actually fine.
 */
export const describeOriginAvailability = (line: Pick<TransferDraftLine, 'availableAtOrigin'>): string =>
  `${formatQuantity(line.availableAtOrigin)} at origin`;

export interface TransferDraftValidation {
  valid: boolean;
  /** Header-level problems, keyed by the field they belong to. */
  errors: Partial<Record<'fromLocationId' | 'toLocationId' | 'lines', string>>;
  /** Blocking per-line problems, keyed by TransferDraftLine.key. */
  lineErrors: Record<string, string>;
  /** NON-blocking availability warnings, keyed by TransferDraftLine.key. */
  lineWarnings: Record<string, string>;
  /** Keys of every line whose item appears on another line too. */
  duplicateItemKeys: string[];
}

/**
 * What must be true before a draft can be saved.
 *
 * Availability is a WARNING, never an error: available_at_origin was read when the
 * draft was fetched, and a delivery can land before dispatch. Blocking on it would
 * stop a buyer writing tomorrow's transfer today.
 */
export const validateTransferDraft = (draft: TransferDraft): TransferDraftValidation => {
  const errors: TransferDraftValidation['errors'] = {};
  const lineErrors: Record<string, string> = {};
  const lineWarnings: Record<string, string> = {};

  if (!draft.fromLocationId) errors.fromLocationId = 'Choose where the stock is leaving from';
  if (!draft.toLocationId) errors.toLocationId = 'Choose where the stock is going';
  if (draft.fromLocationId && draft.toLocationId && draft.fromLocationId === draft.toLocationId) {
    errors.toLocationId = 'Origin and destination must be different locations';
  }
  if (draft.lines.length === 0) {
    errors.lines = 'Add at least one item — a transfer with no lines can never be dispatched';
  }

  // Requested quantity per ITEM, summed across rows. Availability belongs to the
  // item and not to the row, so two rows of 5 must be judged as 10.
  const requestedByItem = new Map<number, number>();
  const keysByItem = new Map<number, string[]>();

  draft.lines.forEach((line) => {
    const qty = parseIntegerText(line.qty);

    if (line.inventoryItemId === null) {
      lineErrors[line.key] = 'Pick an item for this line';
    } else if (qty === null) {
      lineErrors[line.key] = (line.qty ?? '').trim() === '' ? 'Enter a quantity' : 'Whole numbers only';
    } else if (qty < 1) {
      lineErrors[line.key] = 'Quantity must be at least 1 — remove the line instead of sending 0';
    }

    if (line.inventoryItemId === null) return;
    requestedByItem.set(line.inventoryItemId, (requestedByItem.get(line.inventoryItemId) ?? 0) + Math.max(qty ?? 0, 0));
    keysByItem.set(line.inventoryItemId, [...(keysByItem.get(line.inventoryItemId) ?? []), line.key]);
  });

  // Two rows for one item are individually plausible and jointly impossible: the
  // dispatch check is per line, so 5 + 5 against 8 on the shelf passes twice and
  // then refuses the whole transfer with no hint that the pair was the problem.
  const duplicateItemKeys: string[] = [];
  keysByItem.forEach((keys) => {
    if (keys.length < 2) return;
    keys.forEach((key) => {
      duplicateItemKeys.push(key);
      if (!lineErrors[key]) lineErrors[key] = 'This item is on more than one line — combine them into a single quantity';
    });
  });

  draft.lines.forEach((line) => {
    // `?? null` rather than a bare null test: an undefined availability compares false
    // against every `<=`, so an unknown figure would warn as though it were checked.
    const available = line.availableAtOrigin ?? null;
    if (line.inventoryItemId === null || available === null) return;
    const requested = requestedByItem.get(line.inventoryItemId) ?? 0;
    if (requested <= available) return;
    lineWarnings[line.key] =
      `Sending ${requested} but only ${formatQuantity(available)} are at the origin — ` +
      'dispatch is all-or-nothing and would be refused for the whole transfer';
  });

  return {
    valid: Object.keys(errors).length === 0 && Object.keys(lineErrors).length === 0,
    errors,
    lineErrors,
    lineWarnings,
    duplicateItemKeys
  };
};

// ---------------------------------------------------------------------------
// Create / PATCH payloads — TRAP 1, the PATCH half
// ---------------------------------------------------------------------------
export interface TransferLinePayload {
  /** The resolver keys on the item, which is why its 400 echoes inventory_item_id. */
  inventory_item_id: number;
  qty: number;
}

export interface TransferPatchPayload {
  from_location_id?: string;
  to_location_id?: string;
  notes?: string;
  lines?: TransferLinePayload[];
}

export const PATCH_EMPTY_LINES_REFUSED =
  'Refusing to PATCH "lines": [] — the endpoint reads that as DELETE EVERY LINE and answers 200. ' +
  'Use buildClearTransferLinesPayload() if that is genuinely the intent.';

export const UNRESOLVED_LINE_REFUSED = 'Refusing to build a transfer payload from a line with no item or no whole-number quantity.';

/**
 * Draft lines → wire lines, refusing to produce an empty array.
 *
 * Skipping an unresolved row would drop it silently, which on a full-replace PATCH
 * means deleting a line the user still sees on screen. Throwing is loud, and
 * validateTransferDraft already stops the user getting here.
 */
const buildableLines = (draft: TransferDraft): TransferLinePayload[] => {
  const lines = draft.lines.map((line) => {
    const qty = parseIntegerText(line.qty);
    if (line.inventoryItemId === null || qty === null || qty < 1) throw new Error(UNRESOLVED_LINE_REFUSED);
    return { inventory_item_id: line.inventoryItemId, qty };
  });
  if (lines.length === 0) throw new Error(PATCH_EMPTY_LINES_REFUSED);
  return lines;
};

export const buildTransferCreatePayload = (draft: TransferDraft) => ({
  from_location_id: draft.fromLocationId ?? '',
  to_location_id: draft.toLocationId ?? '',
  notes: (draft.notes ?? '').trim(),
  lines: buildableLines(draft)
});

const lineSignature = (id: string | null, itemId: number | null, qty: number | null): string => `${id ?? ''}|${itemId ?? ''}|${qty ?? ''}`;

/**
 * Did the line grid actually change?
 *
 * Compared as an ORDER-INSENSITIVE multiset: PATCH replaces the whole line set, so
 * sending it because a user dragged a row would delete and recreate every line
 * (new uuids, lost identity) to achieve nothing.
 */
export const transferLinesChanged = (draft: TransferDraft, original: Pick<EditableTransfer, 'lines'>): boolean => {
  const before = original.lines.map((line) => lineSignature(line.id, line.inventory_item_id, line.qty)).sort();
  const after = draft.lines.map((line) => lineSignature(line.id, line.inventoryItemId, parseIntegerText(line.qty))).sort();
  return before.length !== after.length || before.some((signature, index) => signature !== after[index]);
};

/**
 * The PATCH body, carrying only what changed.
 *
 * `lines` is omitted unless the grid changed — every request that includes it
 * replaces the entire line set, so a notes-only edit must not touch them. If the
 * grid changed to nothing at all, this THROWS rather than sending the [] that would
 * wipe the transfer.
 */
export const buildTransferPatchPayload = (draft: TransferDraft, original: EditableTransfer): TransferPatchPayload => {
  const payload: TransferPatchPayload = {};

  if ((draft.fromLocationId ?? '') !== original.from_location_id) payload.from_location_id = draft.fromLocationId ?? '';
  if ((draft.toLocationId ?? '') !== original.to_location_id) payload.to_location_id = draft.toLocationId ?? '';
  if ((draft.notes ?? '').trim() !== (original.notes ?? '').trim()) payload.notes = (draft.notes ?? '').trim();
  if (transferLinesChanged(draft, original)) payload.lines = buildableLines(draft);

  return payload;
};

/**
 * The ONE way to send {"lines": []}, which DELETES EVERY LINE.
 *
 * Separate and awkwardly named on purpose: an empty array must be something a
 * developer typed deliberately, never something an empty editor produced.
 */
export const buildClearTransferLinesPayload = (): { lines: [] } => ({ lines: [] });

// ---------------------------------------------------------------------------
// Dispatch preflight
// ---------------------------------------------------------------------------
/**
 * One offending LINE, so the grid can mark every row involved.
 *
 * Availability belongs to the ITEM, not to the row, so two rows of one item are short
 * together or not at all — which means the item-level figures below REPEAT across those
 * rows. They are named for that: summing a column of `shortForItem` double-counts.
 * `DispatchPreflight.totalShort` is the only summed figure, and it is deduplicated.
 */
export interface DispatchPreflightRow {
  lineId: string;
  label: string;
  /** THIS row's own quantity. */
  lineQty: number;
  /** Requested for this line's ITEM across every row of the transfer. Repeated. */
  requestedForItem: number;
  availableAtOrigin: number;
  /** The ITEM's shortfall, repeated on each of its rows. NOT summable. */
  shortForItem: number;
}

/** One offending ITEM. This is the list to count and the column to sum. */
export interface DispatchPreflightItem {
  inventoryItemId: number;
  label: string;
  requested: number;
  availableAtOrigin: number;
  short: number;
}

export interface DispatchPreflight {
  /** One entry per affected LINE — for painting rows, not for arithmetic. */
  shortLines: DispatchPreflightRow[];
  /** One entry per affected ITEM — for arithmetic. */
  shortItems: DispatchPreflightItem[];
  /** Units short across the transfer, counted once per item. */
  totalShort: number;
  /** True when the server will refuse the WHOLE transfer, not just these lines. */
  willBeRefused: boolean;
  /** True when no line carried an origin figure, so this check proved nothing. */
  originStockUnknown: boolean;
  message: string | null;
}

/**
 * Warn before dispatching, because dispatch is all-or-nothing: every line is
 * availability-checked first and one short line 409s the entire transfer.
 *
 * Summed per item for the same reason validateTransferDraft sums: two lines of one
 * item each pass alone and fail together. `originStockUnknown` exists because
 * available_at_origin is absent outside a draft detail/POST/PATCH response — silence
 * from this function must not be read as "checked and fine".
 */
export const dispatchPreflight = (transfer: Pick<Transfer, 'lines' | 'from_location_name'>): DispatchPreflight => {
  const requestedByItem = new Map<number, number>();
  transfer.lines.forEach((line) => {
    requestedByItem.set(line.inventory_item_id, (requestedByItem.get(line.inventory_item_id) ?? 0) + line.qty);
  });

  const shortLines: DispatchPreflightRow[] = [];
  // Keyed by item so the shortfall is counted ONCE however many rows carry the item.
  const shortItems = new Map<number, DispatchPreflightItem>();

  transfer.lines.forEach((line) => {
    const available = originAvailability(line);
    // Unknown is not zero: a line with no origin figure is not checked at all, because
    // a warning invented from unknown data is the same mistake as rendering it as 0.
    if (available === null) return;
    const requested = requestedByItem.get(line.inventory_item_id) ?? line.qty;
    if (requested <= available) return;
    shortLines.push({
      lineId: line.id,
      label: transferLineLabel(line),
      lineQty: line.qty,
      requestedForItem: requested,
      availableAtOrigin: available,
      shortForItem: requested - available
    });
    if (!shortItems.has(line.inventory_item_id)) {
      shortItems.set(line.inventory_item_id, {
        inventoryItemId: line.inventory_item_id,
        label: transferLineLabel(line),
        requested,
        availableAtOrigin: available,
        short: requested - available
      });
    }
  });

  const items = [...shortItems.values()];
  const totalShort = items.reduce((sum, item) => sum + item.short, 0);
  // `.every()` on an empty array is true, so without the length test a transfer with no
  // lines at all would claim its origin stock is unknown and blame the response.
  const originStockUnknown = transfer.lines.length > 0 && transfer.lines.every((line) => originAvailability(line) === null);
  const origin = (transfer.from_location_name || '').trim() || 'the origin';

  let message: string | null = null;
  if (shortLines.length > 0) {
    message =
      `${shortLines.length} line(s) ask for more than ${origin} holds — ${totalShort} unit(s) short in total. ` +
      'Dispatch checks every line first and refuses the whole transfer, so fix these before sending.';
  } else if (originStockUnknown) {
    message = `Stock at ${origin} was not included in this response, so nothing has been checked here — the server will check on dispatch.`;
  }

  return { shortLines, shortItems: items, totalShort, willBeRefused: shortLines.length > 0, originStockUnknown, message };
};

// ---------------------------------------------------------------------------
// Receiving — TRAP 1 (the receive half) and TRAP 2
// ---------------------------------------------------------------------------
export type ReceiveMode = 'all' | 'partial';

export interface ReceiveScan {
  lineId: string;
  /** Field text or a scanner's increment. Repeats are expected, not a bug. */
  qty: string;
}

export interface ReceiveDraft {
  mode: ReceiveMode;
  /** One entry per scan or keystroke; folded by line id before sending. */
  scans: ReceiveScan[];
}

export interface AggregatedScan {
  lineId: string;
  qty: number;
  /** How many scans folded into this one entry. */
  scanCount: number;
}

/**
 * Fold repeated scans of one line into a single entry — TRAP 2.
 *
 * The endpoint keeps only the LAST entry for a repeated line_id. It does not sum
 * and it does not error, so three scans of two units each would receive 2 of 6 and
 * the missing 4 would be written off with no shrinkage movement to find later.
 *
 * A scan whose quantity is not a whole number is returned in `invalid` rather than
 * counted as zero, which would silently shorten the delivery in exactly the same way.
 */
export const aggregateReceiveScans = (scans: ReceiveScan[]): { entries: AggregatedScan[]; invalid: ReceiveScan[] } => {
  const order: string[] = [];
  const totals = new Map<string, AggregatedScan>();
  const invalid: ReceiveScan[] = [];

  scans.forEach((scan) => {
    const qty = parseIntegerText(scan.qty);
    if (qty === null || qty < 0) {
      invalid.push(scan);
      return;
    }
    const current = totals.get(scan.lineId);
    if (current) {
      current.qty += qty;
      current.scanCount += 1;
      return;
    }
    order.push(scan.lineId);
    totals.set(scan.lineId, { lineId: scan.lineId, qty, scanCount: 1 });
  });

  return { entries: order.map((lineId) => totals.get(lineId) as AggregatedScan), invalid };
};

export type ReceivableTransfer = Pick<Transfer, 'lines' | 'from_location_name' | 'to_location_name'>;

export interface ReceivePlanRow {
  lineId: string;
  label: string;
  /** The cap: what is still in transit on this line. */
  inTransit: number;
  receiving: number;
  shortfall: number;
  scanCount: number;
  error: string | null;
}

export interface ReceivePlan {
  mode: ReceiveMode;
  rows: ReceivePlanRow[];
  totalInTransit: number;
  totalReceiving: number;
  totalShortfall: number;
  hasShortfall: boolean;
  /** Copy the user acknowledges before committing a loss. Null when nothing is lost. */
  shortfallWarning: string | null;
  /** Scanned line ids that are not in transit on this transfer. */
  unknownLineIds: string[];
  valid: boolean;
  errors: string[];
}

/**
 * What a receive will do, worked out BEFORE it is sent.
 *
 * The shortfall has to be shown first because it is irreversible and invisible
 * afterwards: status becomes "received" even on a short delivery, the missing units
 * stay in qty_in_transit, and no shrinkage movement is written anywhere.
 *
 * The cap is qty_in_transit rather than qty_dispatched because the wire quantity is an
 * INCREMENT (see TransferLine.qty_received): what is still in transit is exactly what
 * is still receivable, and it is the exact bound the server itself checks. Capping
 * against qty_dispatched instead — sending `qty_received + scanned` as if the field
 * were absolute — would be refused as an over-receipt on any line already part
 * received, and would breach a DB CheckConstraint if that refusal were ever relaxed.
 *
 * That choice is also what keeps the module's TWO shortfall figures identical rather
 * than merely agreeing at qty_received 0: this function's `qty_in_transit - receiving`
 * and transferShortfallReport's `qty_dispatched - qty_received` describe the same units
 * once the receive lands, because qty_received becomes `qty_received + receiving` and
 * qty_in_transit is `qty_dispatched - qty_received`. Pinned by a round-trip test.
 */
export const planReceive = (draft: ReceiveDraft, transfer: ReceivableTransfer): ReceivePlan => {
  const inTransitLines = transfer.lines.filter((line) => line.qty_in_transit > 0);
  // Scans are dropped in 'all' mode, not merely ignored when computing `receiving`: a
  // left-over scan buffer would otherwise report unknown line ids and invalid
  // quantities, invalidating a receive-all that the scans have no bearing on.
  const { entries, invalid } = aggregateReceiveScans(draft.mode === 'partial' ? draft.scans : []);
  const byLineId = new Map(entries.map((entry) => [entry.lineId, entry]));

  const errors: string[] = [];
  const unknownLineIds = entries.filter((entry) => !inTransitLines.some((line) => line.id === entry.lineId)).map((entry) => entry.lineId);

  if (inTransitLines.length === 0) errors.push('Nothing is in transit on this transfer.');
  // A quarantined scan must invalidate the plan, not just be counted out of it: the line
  // it was scanned against would otherwise go on the wire as an explicit zero and be
  // written off. buildReceivePayload refuses to build while this error stands.
  if (invalid.length > 0) errors.push(`${invalid.length} scan(s) had a quantity that is not a whole number.`);
  if (unknownLineIds.length > 0) {
    // The backend keys a malformed line_id under "line_id", not "qty" — but a
    // client-side membership check catches both that and a stale line list.
    errors.push(`${unknownLineIds.length} scanned line(s) are not in transit on this transfer.`);
  }

  const rows: ReceivePlanRow[] = inTransitLines.map((line) => {
    const entry = byLineId.get(line.id);
    const receiving = draft.mode === 'all' ? line.qty_in_transit : (entry?.qty ?? 0);
    const over = receiving > line.qty_in_transit;
    return {
      lineId: line.id,
      label: transferLineLabel(line),
      inTransit: line.qty_in_transit,
      receiving,
      // Clamped so an over-cap scan reads as "0 short" and not as a NEGATIVE shortfall,
      // which would subtract from totalShortfall and could cancel a genuine loss on
      // another line — turning the warning the user must acknowledge into silence.
      shortfall: Math.max(line.qty_in_transit - receiving, 0),
      scanCount: entry?.scanCount ?? 0,
      error: over ? `Cannot receive ${receiving} — only ${line.qty_in_transit} are in transit on this line` : null
    };
  });

  const totalInTransit = rows.reduce((sum, row) => sum + row.inTransit, 0);
  const totalReceiving = rows.reduce((sum, row) => sum + row.receiving, 0);
  const totalShortfall = rows.reduce((sum, row) => sum + row.shortfall, 0);
  const origin = (transfer.from_location_name || '').trim() || 'the origin';
  const destination = (transfer.to_location_name || '').trim() || 'the destination';

  return {
    mode: draft.mode,
    rows,
    totalInTransit,
    totalReceiving,
    totalShortfall,
    hasShortfall: totalShortfall > 0,
    shortfallWarning:
      totalShortfall > 0
        ? `${totalShortfall} unit(s) will be short. They left ${origin} and will arrive at neither ${origin} nor ${destination}: ` +
          'the transfer still closes as received, no shrinkage movement is recorded, and nothing else will flag them again.'
        : null,
    unknownLineIds,
    valid: errors.length === 0 && rows.every((row) => row.error === null),
    errors
  };
};

export interface ReceiveLinePayload {
  line_id: string;
  qty: number;
}

/** `lines` ABSENT means receive everything. An empty array means the same thing. */
export interface ReceivePayload {
  lines?: ReceiveLinePayload[];
}

export const RECEIVE_EMPTY_LINES_REFUSED =
  'Refusing to POST "lines": [] to receive/ — the endpoint reads an empty array as RECEIVE EVERYTHING, ' +
  'which is the opposite of a partial receive with nothing scanned.';

export const RECEIVE_INVALID_PLAN_REFUSED =
  'Refusing to build a receive body from a plan that is not valid — a rejected scan would go on the wire as ' +
  'qty 0, the transfer would still close as received, and the difference would be written off with no ' +
  'shrinkage movement anywhere. Fix the plan, do not send it.';

/**
 * The receive body — TRAP 1 and TRAP 2 both live here.
 *
 * "Receive everything" is the ABSENCE of `lines`, never `lines: []`. They happen to
 * mean the same thing to this endpoint, but the empty array is the shape that means
 * DELETE on PATCH, so it is never emitted from anywhere in this module.
 *
 * A partial receive emits one entry for EVERY in-transit line, including explicit
 * zeros for lines nothing was scanned against. An omitted line already receives
 * zero, so the zeros change nothing on the server — they exist so that "the user
 * scanned nothing" produces a non-empty array instead of degrading into
 * receive-everything, and so the request states the whole delivery on its face.
 *
 * It THROWS on an invalid plan rather than sending it, because every way a plan can
 * be invalid turns into a WRONG QUANTITY here and not into a rejected request:
 *   - an unparseable scan ('4x') is quarantined by aggregateReceiveScans, so the line
 *     it was scanned against falls through to the explicit zero — a 100% shortfall on
 *     a delivery that physically arrived;
 *   - a scan naming a line id this transfer does not have (a stale list, a mistyped
 *     id) leaves EVERY row at zero, closing the whole transfer as received short;
 *   - an over-cap scan is the mirror image — the server's own `over_receipt` check
 *     would catch that one, but only after the request has been formed, and relying on
 *     a server 409 to protect a body we already know is wrong is not a guard.
 * Only the FIRST of those is silent, and silence here is unrecoverable: nothing is
 * flagged afterwards. Throwing matches the empty-array trap above, which is the same
 * class of mistake, and planReceive already gives the UI everything it needs to stop
 * the user reaching this call.
 *
 * Duplicate scans are summed by aggregateReceiveScans before they get here.
 */
export const buildReceivePayload = (draft: ReceiveDraft, transfer: ReceivableTransfer): ReceivePayload => {
  if (draft.mode === 'all') return {};

  const plan = planReceive(draft, transfer);

  // The empty-array trap is checked FIRST because "nothing is in transit" also makes
  // the plan invalid, and RECEIVE_EMPTY_LINES_REFUSED names the specific catastrophe
  // (an empty array means receive-everything) that the generic refusal below does not.
  const lines = plan.rows.map((row) => ({ line_id: row.lineId, qty: row.receiving }));
  if (lines.length === 0) throw new Error(RECEIVE_EMPTY_LINES_REFUSED);

  if (!plan.valid) {
    // Name what was wrong: this throw reaches a developer, and "invalid plan" with no
    // reason sends them back to the scan buffer to guess.
    const reasons = [...plan.errors, ...plan.rows.map((row) => row.error).filter((error): error is string => error !== null)];
    throw new Error(`${RECEIVE_INVALID_PLAN_REFUSED} ${reasons.join(' ')}`.trim());
  }

  return { lines };
};

// ---------------------------------------------------------------------------
// Shortfall on a transfer that has already been received
// ---------------------------------------------------------------------------
export interface TransferOutstandingLine {
  lineId: string;
  label: string;
  dispatched: number;
  received: number;
  outstanding: number;
}

export interface TransferShortfallReport {
  lines: TransferOutstandingLine[];
  totalOutstanding: number;
  /** True only when the transfer is RECEIVED — before that the units are on a van. */
  isLoss: boolean;
  headline: string | null;
  detail: string | null;
  /** Tripwire: our per-line sum should equal the server's qty_in_transit_total. */
  matchesServerTotal: boolean;
}

export type ShortfallTransfer = Pick<Transfer, 'status' | 'lines' | 'from_location_name' | 'to_location_name' | 'qty_in_transit_total'>;

/**
 * dispatched-minus-received, per line and in total.
 *
 * The number is called `outstanding` rather than `lost` because ONE FIGURE MEANS TWO
 * OPPOSITE THINGS depending on status: on an in-transit transfer it is stock on a
 * van, and on a received one it is stock that left one location and arrived at
 * neither. Only the second is a loss, which is why isLoss checks the status and the
 * copy is withheld until then.
 *
 * It is worth showing loudly, because nothing else will: the transfer reads
 * "Received", no shrinkage movement exists, and the units are simply absent from
 * every on-hand figure.
 */
export const transferShortfallReport = (transfer: ShortfallTransfer): TransferShortfallReport => {
  const everyLine: TransferOutstandingLine[] = transfer.lines.map((line) => ({
    lineId: line.id,
    label: transferLineLabel(line),
    dispatched: line.qty_dispatched,
    received: line.qty_received,
    // Clamped because received > dispatched is impossible server-side (a
    // CheckConstraint) but reachable in a stale client copy — and an unclamped negative
    // would CANCEL OUT a real loss on another line, hiding it in the total below.
    outstanding: Math.max(line.qty_dispatched - line.qty_received, 0)
  }));

  // Summed over EVERY line rather than over the reported ones, so the clamp above is
  // load-bearing rather than defence the filter already provides. It also matches how
  // the server builds qty_in_transit_total — sum(max(0, dispatched - received)) — which
  // is what matchesServerTotal compares against.
  const totalOutstanding = everyLine.reduce((sum, line) => sum + line.outstanding, 0);
  const lines = everyLine.filter((line) => line.outstanding > 0);
  const isLoss = transfer.status === 'received' && totalOutstanding > 0;
  const origin = (transfer.from_location_name || '').trim() || 'the origin';
  const destination = (transfer.to_location_name || '').trim() || 'the destination';

  return {
    lines,
    totalOutstanding,
    isLoss,
    headline: isLoss ? `${totalOutstanding} unit(s) left ${origin} and arrived at neither location` : null,
    detail: isLoss
      ? `This transfer closed as received with ${totalOutstanding} unit(s) still counted as in transit. They are gone from ` +
        `${origin}, were never added to ${destination}, and no shrinkage movement was recorded — so they will not appear in ` +
        'any stock report. Investigate, then write them off deliberately.'
      : null,
    matchesServerTotal: transfer.qty_in_transit_total === totalOutstanding
  };
};

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------
export interface TransferListFilters {
  statuses?: string[];
  /** Matches EITHER end of the route — the view ORs from_location and to_location. */
  locationId?: string | null;
}

/**
 * The query string for GET /inventory/transfers/.
 *
 * Returns a STRING because `?status=` is repeatable and read with getlist(): axios's
 * default array serialiser would send `status[]=draft`, which that call ignores, so
 * the filter would appear to do nothing while returning every transfer.
 *
 * A non-uuid `?location_id=` is an UNCAUGHT 500 — the view feeds the raw value into
 * `filter(Q(from_location_id=...))` and Django raises outside any handler — so a
 * value that is not a uuid is omitted and the list comes back unfiltered, which is a
 * page rather than an error page. Unknown statuses get a clean 400 instead, but are
 * dropped for the same reason: a stale bookmark should not break the screen.
 */
export const transferListQuery = (filters: TransferListFilters = {}): string => {
  const params = new URLSearchParams();
  const seen = new Set<string>();
  (filters.statuses ?? []).forEach((status) => {
    if (!TRANSFER_STATUSES.includes(status as TransferStatus) || seen.has(status)) return;
    seen.add(status);
    params.append('status', status);
  });
  if (isUuid(filters.locationId)) params.append('location_id', (filters.locationId as string).trim());
  return params.toString();
};

// ---------------------------------------------------------------------------
// Error classification — TRAP 3
// ---------------------------------------------------------------------------

/**
 * True when a rejected PATCH may nonetheless have SAVED the header — TRAP 3.
 *
 * The view saves notes/from_location_id/to_location_id, then resolves lines, and the
 * resolver RETURNS a 400 Response instead of raising, so `@transaction.atomic`
 * commits the header anyway. A form that treats the 400 as "nothing happened"
 * desyncs from the server for good.
 *
 * apiErrors.mayHavePartiallySaved is exactly the right test, and not by luck:
 * serializer-level `lines` errors (a bare string array, or non_field_errors) are
 * raised BEFORE anything is written and carry no per-row entries, while the resolver
 * errors that land after the header is saved are precisely the ones that do.
 */
export const transferPatchPartiallySaved = (err: unknown): boolean => mayHavePartiallySaved(err, parseApiError(err, 'lines'));

/**
 * True when the client's copy of the transfer is wrong and must be refetched —
 * either because a 400 committed half of a PATCH, or because a 409 says the action
 * was never legal from the status the client thought it had.
 */
export const transferSaveNeedsRefetch = (err: unknown): boolean => {
  const parsed = parseApiError(err, 'lines');
  return mayHavePartiallySaved(err, parsed) || isIllegalTransition(parsed);
};
