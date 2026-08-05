import { describe, expect, it } from 'vitest';

import { EM_DASH } from './stockFormat';
import {
  EMPTY_ACTION_BODY,
  PATCH_EMPTY_LINES_REFUSED,
  RECEIVE_EMPTY_LINES_REFUSED,
  RECEIVE_INVALID_PLAN_REFUSED,
  ReceiveDraft,
  ReceivePayload,
  Transfer,
  TransferDraft,
  TransferLine,
  UNRESOLVED_LINE_REFUSED,
  aggregateReceiveScans,
  buildClearTransferLinesPayload,
  buildReceivePayload,
  buildTransferCreatePayload,
  buildTransferPatchPayload,
  canTransfer,
  describeOriginAvailability,
  describeTransferRoute,
  dispatchPreflight,
  legalTransferActions,
  newDraftLineKey,
  newTransferDraftLine,
  normalizeTransfer,
  originAvailability,
  planReceive,
  transferActionUnavailableReason,
  transferActionsFor,
  transferDraftFrom,
  transferListQuery,
  transferLineGrid,
  transferLineLabel,
  transferLinesChanged,
  transferPatchPartiallySaved,
  transferSaveNeedsRefetch,
  transferShortfallReport,
  transferStatusColor,
  transferStatusLabel,
  validateTransferDraft
} from './transfersLogic';

const makeLine = (over: Partial<TransferLine> = {}): TransferLine => ({
  id: over.id ?? '11111111-1111-4111-8111-111111111111',
  inventory_item_id: over.inventory_item_id ?? 501,
  sku: over.sku ?? 'LS100-IVORY-S',
  name: over.name ?? 'Linen Shirt',
  size: over.size ?? 'S',
  color: over.color ?? 'Ivory',
  qty: over.qty ?? 4,
  qty_dispatched: over.qty_dispatched ?? 0,
  qty_received: over.qty_received ?? 0,
  qty_in_transit: over.qty_in_transit ?? 0,
  available_at_origin: over.available_at_origin === undefined ? null : over.available_at_origin
});

/**
 * A line whose `available_at_origin` KEY IS ABSENT, not null.
 *
 * makeLine rewrites undefined to null, which is what hid the undefined path from every
 * availability test: the module never saw the shape a serializer refactor would produce.
 */
const makeLineWithoutAvailability = (over: Partial<TransferLine> = {}): TransferLine => {
  const line = makeLine(over);
  delete line.available_at_origin;
  return line;
};

const makeTransfer = (over: Partial<Transfer> = {}): Transfer => ({
  id: over.id ?? '99999999-9999-4999-8999-999999999999',
  reference: over.reference ?? 'TR-000001',
  status: over.status ?? 'draft',
  status_label: over.status_label ?? 'Draft',
  from_location_id: over.from_location_id ?? 'loc-main',
  from_location_name: over.from_location_name ?? 'Main',
  to_location_id: over.to_location_id ?? 'loc-airport',
  to_location_name: over.to_location_name ?? 'Airport',
  notes: over.notes ?? '',
  is_editable: over.is_editable ?? (over.status ?? 'draft') === 'draft',
  dispatched_at: over.dispatched_at ?? null,
  received_at: over.received_at ?? null,
  cancelled_at: over.cancelled_at ?? null,
  created_by_email: over.created_by_email ?? 'buyer@example.com',
  dispatched_by_email: over.dispatched_by_email ?? null,
  received_by_email: over.received_by_email ?? null,
  qty_total: over.qty_total ?? 4,
  qty_in_transit_total: over.qty_in_transit_total ?? 0,
  created_at: over.created_at ?? '2026-08-05T10:00:00Z',
  lines: over.lines ?? [makeLine()]
});

const makeDraft = (over: Partial<TransferDraft> = {}): TransferDraft => ({
  fromLocationId: over.fromLocationId === undefined ? 'loc-main' : over.fromLocationId,
  toLocationId: over.toLocationId === undefined ? 'loc-airport' : over.toLocationId,
  notes: over.notes ?? '',
  lines: over.lines ?? [newTransferDraftLine({ inventoryItemId: 501, sku: 'LS100-IVORY-S', qty: '4' })]
});

const httpError = (status: number, data: unknown) => ({ response: { status, data } });

describe('transferStatusLabel', () => {
  it('reads as English rather than as the database enum', () => {
    expect(transferStatusLabel('draft')).toBe('Draft');
    expect(transferStatusLabel('in_transit')).toBe('In transit');
    expect(transferStatusLabel('received')).toBe('Received');
    expect(transferStatusLabel('cancelled')).toBe('Cancelled');
  });

  it("prefers the server's status_label, which is the only thing that knows a status we do not", () => {
    expect(transferStatusLabel('partially_received', 'Partially received')).toBe('Partially received');
    // A blank server label must not blank the chip.
    expect(transferStatusLabel('in_transit', '   ')).toBe('In transit');
  });

  it('de-slugs an unknown status instead of hiding it behind "Unknown"', () => {
    expect(transferStatusLabel('awaiting_pickup')).toBe('Awaiting pickup');
    expect(transferStatusLabel('')).toBe(EM_DASH);
  });
});

describe('transferStatusColor', () => {
  it('greys a draft, flags a receipt as success, and never guesses on an unknown status', () => {
    expect(transferStatusColor('draft')).toBe('default');
    expect(transferStatusColor('in_transit')).toBe('info');
    expect(transferStatusColor('received')).toBe('success');
    expect(transferStatusColor('cancelled')).toBe('error');
    expect(transferStatusColor('something_new')).toBe('default');
  });
});

describe('legalTransferActions', () => {
  it('offers edit, dispatch and cancel on a draft', () => {
    expect(legalTransferActions('draft')).toEqual(['edit', 'dispatch', 'cancel']);
  });

  it('offers ONLY receive once dispatched, because there is no reversal flow to cancel into', () => {
    const actions = legalTransferActions('in_transit');
    expect(actions).toEqual(['receive']);
    // Offering Cancel here would offer a guaranteed 409 on stock already off the shelf.
    expect(actions).not.toContain('cancel');
    expect(canTransfer('in_transit', 'cancel')).toBe(false);
    expect(canTransfer('in_transit', 'edit')).toBe(false);
  });

  it('offers nothing on a terminal transfer', () => {
    expect(legalTransferActions('received')).toEqual([]);
    expect(legalTransferActions('cancelled')).toEqual([]);
  });

  it('offers nothing at all for a status it does not recognise', () => {
    // Showing no button is recoverable; showing Dispatch on an unknown status is not.
    expect(legalTransferActions('partially_received')).toEqual([]);
    expect(canTransfer('partially_received', 'dispatch')).toBe(false);
  });
});

describe('transferActionsFor', () => {
  it('lets is_editable veto editing even on a draft', () => {
    expect(transferActionsFor({ status: 'draft', is_editable: true })).toContain('edit');
    const locked = transferActionsFor({ status: 'draft', is_editable: false });
    expect(locked).not.toContain('edit');
    // The veto is narrow: dispatch and cancel are still status-legal.
    expect(locked).toEqual(['dispatch', 'cancel']);
  });

  it('does not resurrect an action the status forbids just because is_editable is true', () => {
    expect(transferActionsFor({ status: 'received', is_editable: true })).toEqual([]);
  });
});

describe('normalizeTransfer', () => {
  it('coalesces a null sku to empty, which is what every label here already means by "no sku"', () => {
    const wire = { ...makeTransfer(), lines: [{ ...makeLine(), sku: null }] };
    const normalized = normalizeTransfer(wire);
    expect(normalized.lines[0].sku).toBe('');
    // '' makes transferLineLabel fall back to the name instead of printing "null".
    expect(transferLineLabel(normalized.lines[0])).toBe('Linen Shirt (Ivory / S)');
  });

  it('leaves everything else, including an absent available_at_origin, untouched', () => {
    const line = makeLineWithoutAvailability({ qty: 7 });
    const wire = { ...makeTransfer({ reference: 'TR-000042' }), lines: [{ ...line, sku: 'LS100-IVORY-S' }] };
    const normalized = normalizeTransfer(wire);
    expect(normalized.reference).toBe('TR-000042');
    expect(normalized.lines[0].qty).toBe(7);
    // Still ABSENT rather than rewritten to null, so originAvailability keeps being
    // the only thing that decides what "not loaded" means.
    expect('available_at_origin' in normalized.lines[0]).toBe(false);
    expect(originAvailability(normalized.lines[0])).toBeNull();
  });
});

describe('transferActionUnavailableReason', () => {
  it('says nothing when the action is legal', () => {
    expect(transferActionUnavailableReason('draft', 'cancel')).toBeNull();
    expect(transferActionUnavailableReason('in_transit', 'receive')).toBeNull();
  });

  it('explains that a dispatched transfer cannot be cancelled because nothing reverses it', () => {
    const reason = transferActionUnavailableReason('in_transit', 'cancel') ?? '';
    // The user's question is "why is this greyed out", and the answer is permanent:
    // the stock has physically left, so retrying later will not help.
    expect(reason).toContain('no reversal');
    expect(reason).toContain('received');
  });

  it('names the statuses an action IS legal from, derived from the same table as the gate', () => {
    expect(transferActionUnavailableReason('draft', 'receive')).toBe(
      'Receiving is only possible while a transfer is in transit — this one is draft.'
    );
    expect(transferActionUnavailableReason('received', 'dispatch')).toBe(
      'Dispatching is only possible while a transfer is draft — this one is received.'
    );
  });

  it('degrades honestly on a status this build has never heard of', () => {
    // legalTransferActions offers nothing for an unknown status, so every action is
    // unavailable and the sentence still has to read as English.
    expect(transferActionUnavailableReason('partially_received', 'receive')).toBe(
      'Receiving is only possible while a transfer is in transit — this one is partially received.'
    );
  });
});

describe('transferListQuery', () => {
  it('repeats ?status= rather than sending an array, because the view reads getlist', () => {
    expect(transferListQuery({ statuses: ['draft', 'in_transit'] })).toBe('status=draft&status=in_transit');
  });

  it('drops unknown and duplicated statuses', () => {
    expect(transferListQuery({ statuses: ['draft', 'draft', 'partially_received', ''] })).toBe('status=draft');
  });

  it('omits a location_id that is not a uuid, because the view 500s on one', () => {
    // Unfiltered is a page; an uncaught ValidationError is an error page.
    expect(transferListQuery({ locationId: 'main' })).toBe('');
    expect(transferListQuery({ locationId: null })).toBe('');
    expect(transferListQuery({ locationId: '  22222222-2222-4222-8222-222222222222 ' })).toBe(
      'location_id=22222222-2222-4222-8222-222222222222'
    );
  });

  it('is empty with no filters, so the caller can append it unconditionally', () => {
    expect(transferListQuery()).toBe('');
    expect(transferListQuery({ statuses: [] })).toBe('');
  });
});

describe('EMPTY_ACTION_BODY', () => {
  it('is empty and frozen, because dispatch and cancel read no body', () => {
    expect(Object.keys(EMPTY_ACTION_BODY)).toHaveLength(0);
    // Frozen so a caller cannot quietly attach the transfer to the POST.
    expect(Object.isFrozen(EMPTY_ACTION_BODY)).toBe(true);
  });
});

describe('describeTransferRoute and transferLineLabel', () => {
  it('names both ends of the move', () => {
    expect(describeTransferRoute(makeTransfer())).toBe('Main → Airport');
  });

  it('em-dashes a missing location name rather than showing an arrow into nothing', () => {
    expect(describeTransferRoute({ from_location_name: 'Main', to_location_name: '' })).toBe(`Main → ${EM_DASH}`);
  });

  it('identifies a line by SKU, name and variant axes', () => {
    expect(transferLineLabel(makeLine())).toBe('LS100-IVORY-S — Linen Shirt (Ivory / S)');
    expect(transferLineLabel(makeLine({ size: '', color: '' }))).toBe('LS100-IVORY-S — Linen Shirt');
    expect(transferLineLabel(makeLine({ sku: '', name: '', size: 'S', color: 'Ivory' }))).toBe('Ivory / S');
    expect(transferLineLabel(makeLine({ sku: '', name: '', size: '', color: '' }))).toBe(EM_DASH);
  });
});

describe('transferLineGrid', () => {
  it('derives the size/colour axes through matrix.toGrid so receiving and the catalogue agree', () => {
    const grid = transferLineGrid([
      makeLine({ id: 'a', size: 'S', color: 'Ivory' }),
      makeLine({ id: 'b', size: 'M', color: 'Ivory' }),
      makeLine({ id: 'c', size: 'M', color: 'Slate' })
    ]);
    expect(grid.sizes).toEqual(['S', 'M']);
    expect(grid.colors).toEqual(['Ivory', 'Slate']);
    expect(grid.cell('Slate', 'M')).toMatchObject({ id: 'c' });
    expect(grid.cell('Slate', 'S')).toBeUndefined();
  });
});

describe('newDraftLineKey', () => {
  it('gives every new row a distinct key, since a row with no server id still needs identity', () => {
    expect(newDraftLineKey()).not.toBe(newDraftLineKey());
    expect(newTransferDraftLine().key).not.toBe(newTransferDraftLine().key);
  });
});

describe('transferDraftFrom', () => {
  it('keys rows by the server line id and keeps quantities as text', () => {
    const draft = transferDraftFrom(
      makeTransfer({ notes: 'send with the Friday van', lines: [makeLine({ id: 'line-1', qty: 6, available_at_origin: 9 })] })
    );
    expect(draft.fromLocationId).toBe('loc-main');
    expect(draft.notes).toBe('send with the Friday van');
    expect(draft.lines[0]).toMatchObject({ key: 'line-1', id: 'line-1', inventoryItemId: 501, availableAtOrigin: 9 });
    // Text, not a number: a field being edited passes through '' and '-'.
    expect(draft.lines[0].qty).toBe('6');
  });

  it('normalises an ABSENT available_at_origin to null, so the draft line cannot lie about its type', () => {
    // TransferDraftLine.availableAtOrigin is typed `number | null`, and undefined leaking
    // through it is worse than null: null is checked for everywhere, undefined is not.
    const draft = transferDraftFrom(makeTransfer({ lines: [makeLineWithoutAvailability({ id: 'line-1', qty: 5 })] }));
    expect(draft.lines[0].availableAtOrigin).toBeNull();
    expect(draft.lines[0].availableAtOrigin).not.toBeUndefined();
  });
});

describe('originAvailability', () => {
  it('collapses an absent key into null, because the two mean the same thing and undefined compares false', () => {
    expect(originAvailability(makeLine({ available_at_origin: 9 }))).toBe(9);
    // Zero is a real answer and must survive the normalisation.
    expect(originAvailability(makeLine({ available_at_origin: 0 }))).toBe(0);
    expect(originAvailability(makeLine({ available_at_origin: null }))).toBeNull();
    expect(originAvailability(makeLineWithoutAvailability())).toBeNull();
  });
});

describe('describeOriginAvailability', () => {
  it('renders unknown origin stock as an em dash, never as zero', () => {
    // available_at_origin is only populated on a draft detail/POST/PATCH response.
    // "0 at origin" would stop a buyer building a transfer that is perfectly fine.
    expect(describeOriginAvailability({ availableAtOrigin: null })).toBe(`${EM_DASH} at origin`);
    expect(describeOriginAvailability({ availableAtOrigin: null })).not.toContain('0 at origin');
    expect(describeOriginAvailability({ availableAtOrigin: 0 })).toBe('0 at origin');
    expect(describeOriginAvailability({ availableAtOrigin: 12 })).toBe('12 at origin');
  });
});

describe('validateTransferDraft', () => {
  const validate = (over: Partial<TransferDraft> = {}) => validateTransferDraft(makeDraft(over));

  it('accepts a well-formed draft', () => {
    const result = validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.lineErrors).toEqual({});
  });

  it('refuses the same location at both ends, which the backend rejects outright', () => {
    const result = validate({ fromLocationId: 'loc-main', toLocationId: 'loc-main' });
    expect(result.valid).toBe(false);
    expect(result.errors.toLocationId).toContain('different');
  });

  it('requires both ends to be chosen', () => {
    expect(validate({ fromLocationId: null }).errors.fromLocationId).toBeTruthy();
    expect(validate({ toLocationId: null }).errors.toLocationId).toBeTruthy();
  });

  it('refuses an empty line list and says why it matters', () => {
    const result = validate({ lines: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.lines).toContain('dispatched');
  });

  it('rejects a blank, fractional or sub-1 quantity', () => {
    const blank = newTransferDraftLine({ inventoryItemId: 501, qty: '' });
    expect(validate({ lines: [blank] }).lineErrors[blank.key]).toBe('Enter a quantity');

    const fractional = newTransferDraftLine({ inventoryItemId: 501, qty: '2.5' });
    expect(validate({ lines: [fractional] }).lineErrors[fractional.key]).toBe('Whole numbers only');

    const zero = newTransferDraftLine({ inventoryItemId: 501, qty: '0' });
    expect(validate({ lines: [zero] }).lineErrors[zero.key]).toContain('at least 1');
  });

  it('rejects a line with no item chosen', () => {
    const empty = newTransferDraftLine({ inventoryItemId: null, qty: '3' });
    expect(validate({ lines: [empty] }).lineErrors[empty.key]).toContain('Pick an item');
  });

  it('flags BOTH rows when one item appears twice, because dispatch checks each row alone', () => {
    // 5 + 5 against 8 on the shelf passes the per-line check twice and then 409s the
    // whole transfer with nothing to say the pair was the problem.
    const first = newTransferDraftLine({ inventoryItemId: 501, qty: '5' });
    const second = newTransferDraftLine({ inventoryItemId: 501, qty: '5' });
    const result = validate({ lines: [first, second] });

    expect(result.valid).toBe(false);
    expect(result.duplicateItemKeys).toEqual([first.key, second.key]);
    expect(result.lineErrors[first.key]).toContain('more than one line');
    expect(result.lineErrors[second.key]).toContain('more than one line');
  });

  it('warns about origin stock WITHOUT blocking, because stock can arrive before dispatch', () => {
    const line = newTransferDraftLine({ inventoryItemId: 501, qty: '5', availableAtOrigin: 3 });
    const result = validate({ lines: [line] });

    expect(result.lineWarnings[line.key]).toContain('only 3');
    expect(result.lineWarnings[line.key]).toContain('all-or-nothing');
    // A warning is not an error: the draft still saves.
    expect(result.valid).toBe(true);
    expect(result.lineErrors[line.key]).toBeUndefined();
  });

  it('warns on the item TOTAL across rows, not on each row alone', () => {
    const first = newTransferDraftLine({ inventoryItemId: 501, qty: '5', availableAtOrigin: 8 });
    const second = newTransferDraftLine({ inventoryItemId: 501, qty: '5', availableAtOrigin: 8 });
    const result = validate({ lines: [first, second] });

    // Judged per row, 5 <= 8 twice and nothing warns at all.
    expect(result.lineWarnings[first.key]).toContain('Sending 10');
    expect(result.lineWarnings[second.key]).toContain('Sending 10');
  });

  it('does not warn when origin stock was never loaded', () => {
    // null is unknown, and inventing a warning from unknown is the same error as
    // rendering it as 0.
    const line = newTransferDraftLine({ inventoryItemId: 501, qty: '500', availableAtOrigin: null });
    expect(validate({ lines: [line] }).lineWarnings).toEqual({});
  });

  it('does not warn on an UNDEFINED availability either, which is the shape a hand-built draft leaks', () => {
    // Only transferDraftFrom normalises; a draft assembled row by row can still carry
    // undefined. `undefined <= n` is false, so the guard is what stops a warning being
    // invented — and its copy would read "only — are at the origin", quoting nothing.
    const line = {
      ...newTransferDraftLine({ inventoryItemId: 501, qty: '500' }),
      availableAtOrigin: undefined as unknown as number | null
    };
    const result = validate({ lines: [line] });
    expect(result.lineWarnings).toEqual({});
    expect(result.lineWarnings[line.key]).toBeUndefined();
  });
});

describe('buildTransferCreatePayload', () => {
  it('maps to the API shape and trims the notes', () => {
    const line = newTransferDraftLine({ inventoryItemId: 501, qty: '4' });
    const payload = buildTransferCreatePayload(makeDraft({ notes: '  Friday van  ', lines: [line] }));
    expect(payload).toEqual({
      from_location_id: 'loc-main',
      to_location_id: 'loc-airport',
      notes: 'Friday van',
      lines: [{ inventory_item_id: 501, qty: 4 }]
    });
  });

  it('refuses to build from a line with no item rather than dropping it silently', () => {
    // A dropped row on a full-replace payload is a line the user can still see and
    // the server no longer has.
    const broken = newTransferDraftLine({ inventoryItemId: null, qty: '4' });
    expect(() => buildTransferCreatePayload(makeDraft({ lines: [broken] }))).toThrow(UNRESOLVED_LINE_REFUSED);
  });
});

describe('transferLinesChanged', () => {
  const original = makeTransfer({
    lines: [makeLine({ id: 'line-1', inventory_item_id: 501, qty: 4 }), makeLine({ id: 'line-2', inventory_item_id: 502, qty: 2 })]
  });

  const rowsOf = (transfer: Transfer) => transferDraftFrom(transfer).lines;

  it('is false for an untouched grid', () => {
    expect(transferLinesChanged(makeDraft({ lines: rowsOf(original) }), original)).toBe(false);
  });

  it('is false when rows are merely reordered, because PATCH replaces the whole set', () => {
    // Sending lines to record a drag would delete and recreate every line — new
    // uuids, lost identity — to achieve nothing.
    const reordered = [...rowsOf(original)].reverse();
    expect(transferLinesChanged(makeDraft({ lines: reordered }), original)).toBe(false);
  });

  it('is true when a quantity, an item, or the row count changes', () => {
    const edited = rowsOf(original).map((row, index) => (index === 0 ? { ...row, qty: '9' } : row));
    expect(transferLinesChanged(makeDraft({ lines: edited }), original)).toBe(true);

    expect(transferLinesChanged(makeDraft({ lines: rowsOf(original).slice(0, 1) }), original)).toBe(true);

    const added = [...rowsOf(original), newTransferDraftLine({ inventoryItemId: 503, qty: '1' })];
    expect(transferLinesChanged(makeDraft({ lines: added }), original)).toBe(true);
  });
});

describe('buildTransferPatchPayload', () => {
  const original = makeTransfer({
    notes: 'old note',
    lines: [makeLine({ id: 'line-1', inventory_item_id: 501, qty: 4 })]
  });
  const unchangedLines = () => transferDraftFrom(original).lines;

  it('OMITS lines entirely for a notes-only edit', () => {
    const payload = buildTransferPatchPayload(
      makeDraft({ notes: 'new note', lines: unchangedLines(), fromLocationId: 'loc-main', toLocationId: 'loc-airport' }),
      original
    );
    expect(payload).toEqual({ notes: 'new note' });
    // Every request carrying `lines` replaces the whole set; a notes edit must not.
    expect(payload).not.toHaveProperty('lines');
  });

  it('sends lines when the grid changed, and nothing else when nothing else changed', () => {
    const edited = unchangedLines().map((row) => ({ ...row, qty: '7' }));
    const payload = buildTransferPatchPayload(makeDraft({ notes: 'old note', lines: edited }), original);
    expect(payload).toEqual({ lines: [{ inventory_item_id: 501, qty: 7 }] });
  });

  it('sends a changed origin or destination on its own', () => {
    const payload = buildTransferPatchPayload(
      makeDraft({ notes: 'old note', toLocationId: 'loc-warehouse', lines: unchangedLines() }),
      original
    );
    expect(payload).toEqual({ to_location_id: 'loc-warehouse' });
  });

  it('THROWS instead of sending "lines": [] when the user removed every row', () => {
    // TRAP 1: PATCH with an empty array DELETES every line and answers 200 with
    // qty_total 0, leaving a draft that can never be dispatched. The empty array
    // must be unreachable from an empty editor.
    expect(() => buildTransferPatchPayload(makeDraft({ notes: 'old note', lines: [] }), original)).toThrow(PATCH_EMPTY_LINES_REFUSED);
  });

  it('does not throw when the transfer had no lines to begin with — nothing changed', () => {
    const emptyOriginal = makeTransfer({ notes: 'old note', lines: [] });
    const payload = buildTransferPatchPayload(makeDraft({ notes: 'newer', lines: [] }), emptyOriginal);
    expect(payload).toEqual({ notes: 'newer' });
    expect(payload).not.toHaveProperty('lines');
  });

  it('is empty when nothing changed at all', () => {
    expect(buildTransferPatchPayload(makeDraft({ notes: 'old note', lines: unchangedLines() }), original)).toEqual({});
  });
});

describe('buildClearTransferLinesPayload', () => {
  it('is the ONLY place an empty lines array comes from, and it is named for what it destroys', () => {
    expect(buildClearTransferLinesPayload()).toEqual({ lines: [] });
  });
});

describe('dispatchPreflight', () => {
  it('warns before dispatch, naming the all-or-nothing consequence', () => {
    const preflight = dispatchPreflight(makeTransfer({ lines: [makeLine({ id: 'line-1', qty: 10, available_at_origin: 4 })] }));
    expect(preflight.willBeRefused).toBe(true);
    expect(preflight.shortLines[0]).toMatchObject({
      lineId: 'line-1',
      lineQty: 10,
      requestedForItem: 10,
      availableAtOrigin: 4,
      shortForItem: 6
    });
    expect(preflight.totalShort).toBe(6);
    expect(preflight.message).toContain('refuses the whole transfer');
  });

  it('sums per ITEM, catching two rows that each pass alone and fail together', () => {
    const preflight = dispatchPreflight(
      makeTransfer({
        lines: [
          makeLine({ id: 'line-1', inventory_item_id: 501, qty: 5, available_at_origin: 8 }),
          makeLine({ id: 'line-2', inventory_item_id: 501, qty: 5, available_at_origin: 8 })
        ]
      })
    );
    // A per-line check sees 5 <= 8 twice and reports nothing, then the dispatch 409s.
    expect(preflight.willBeRefused).not.toBe(false);
    expect(preflight.shortLines).toHaveLength(2);
    expect(preflight.shortLines[0].requestedForItem).toBe(10);
  });

  it('counts the shortfall ONCE per item however many rows carry it, so the total is summable', () => {
    // The per-line rows repeat the item's figures by design (availability belongs to the
    // item), so a consumer summing them reports 4 units short against a true 2. That is
    // why totalShort and shortItems exist and why the row fields say "ForItem".
    const preflight = dispatchPreflight(
      makeTransfer({
        lines: [
          makeLine({ id: 'line-1', inventory_item_id: 501, qty: 5, available_at_origin: 8 }),
          makeLine({ id: 'line-2', inventory_item_id: 501, qty: 5, available_at_origin: 8 })
        ]
      })
    );

    expect(preflight.totalShort).toBe(2);
    // 4 is what summing the per-line column produces, and it is wrong.
    expect(preflight.totalShort).not.toBe(4);
    expect(preflight.shortItems).toEqual([
      { inventoryItemId: 501, label: 'LS100-IVORY-S — Linen Shirt (Ivory / S)', requested: 10, availableAtOrigin: 8, short: 2 }
    ]);
    // Each row still states its OWN quantity, so a row claiming to ask for 10 is gone.
    expect(preflight.shortLines.map((row) => row.lineQty)).toEqual([5, 5]);
    expect(preflight.message).toContain('2 unit(s) short in total');
  });

  it('adds up shortfalls across DIFFERENT items, which are genuinely separate units', () => {
    const preflight = dispatchPreflight(
      makeTransfer({
        lines: [
          makeLine({ id: 'line-1', inventory_item_id: 501, qty: 10, available_at_origin: 4 }),
          makeLine({ id: 'line-2', inventory_item_id: 502, qty: 6, available_at_origin: 1 })
        ]
      })
    );
    expect(preflight.shortItems).toHaveLength(2);
    expect(preflight.totalShort).toBe(11);
  });

  it('stays quiet when the origin holds enough, even though available_at_origin is not capped by qty', () => {
    const preflight = dispatchPreflight(makeTransfer({ lines: [makeLine({ qty: 4, available_at_origin: 40 })] }));
    expect(preflight.willBeRefused).toBe(false);
    expect(preflight.shortLines).toEqual([]);
    expect(preflight.shortItems).toEqual([]);
    expect(preflight.totalShort).toBe(0);
    expect(preflight.message).toBeNull();
  });

  it('says it checked NOTHING when the response carried no origin figures', () => {
    // available_at_origin exists only on a draft detail/POST/PATCH response. Silence
    // from an unchecked preflight must not read as "checked and fine".
    const preflight = dispatchPreflight(makeTransfer({ lines: [makeLine({ qty: 4, available_at_origin: null })] }));
    expect(preflight.originStockUnknown).toBe(true);
    expect(preflight.willBeRefused).toBe(false);
    expect(preflight.message).toContain('nothing has been checked');
  });

  it('treats an ABSENT available_at_origin key exactly like null, not as a checked zero', () => {
    // The key is built with a dict .get() server-side, so omission is one refactor away.
    // undefined fails every `<=`, which fabricates an all-or-nothing refusal out of a
    // figure nobody supplied — and puts NaN in a quantity the copy shows the user.
    const preflight = dispatchPreflight(makeTransfer({ lines: [makeLineWithoutAvailability({ id: 'line-1', qty: 5 })] }));

    expect(preflight.shortLines).toEqual([]);
    expect(preflight.willBeRefused).toBe(false);
    // Reporting "checked, and nothing is wrong" would be the same lie in the other
    // direction: nothing was known, so nothing was checked.
    expect(preflight.originStockUnknown).toBe(true);
    expect(preflight.message).toContain('nothing has been checked');
    expect(preflight.totalShort).toBe(0);
  });

  it('does not claim origin stock is unknown for a transfer with no lines at all', () => {
    // [].every() is true, so without the length test an empty transfer blames the
    // response for missing a figure that was never asked for.
    const preflight = dispatchPreflight({ lines: [], from_location_name: 'Main' });
    expect(preflight.originStockUnknown).toBe(false);
    expect(preflight.message).toBeNull();
    expect(preflight.willBeRefused).toBe(false);
  });
});

describe('aggregateReceiveScans', () => {
  it('SUMS repeated scans of one line instead of letting the last one win', () => {
    // TRAP 2: the endpoint keeps only the last entry for a repeated line_id — it
    // does not sum and it does not error — so three scans of 2 would receive 2 and
    // write off the missing 4 with no shrinkage movement anywhere.
    const { entries } = aggregateReceiveScans([
      { lineId: 'line-1', qty: '2' },
      { lineId: 'line-1', qty: '2' },
      { lineId: 'line-1', qty: '2' }
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ lineId: 'line-1', qty: 6, scanCount: 3 });
    // 2 is what last-entry-wins would have received.
    expect(entries[0].qty).not.toBe(2);
  });

  it('keeps first-seen order so the confirmation list matches the scanning order', () => {
    const { entries } = aggregateReceiveScans([
      { lineId: 'line-2', qty: '1' },
      { lineId: 'line-1', qty: '1' },
      { lineId: 'line-2', qty: '1' }
    ]);
    expect(entries.map((entry) => entry.lineId)).toEqual(['line-2', 'line-1']);
    expect(entries[0].qty).toBe(2);
  });

  it('reports a non-numeric or negative scan rather than counting it as zero', () => {
    // Counting it as zero would shorten the delivery in exactly the way trap 2 does.
    const { entries, invalid } = aggregateReceiveScans([
      { lineId: 'line-1', qty: '3' },
      { lineId: 'line-1', qty: 'abc' },
      { lineId: 'line-1', qty: '-1' }
    ]);
    expect(entries[0].qty).toBe(3);
    expect(invalid).toHaveLength(2);
  });

  it('accepts an explicit zero, which is a valid short delivery', () => {
    const { entries, invalid } = aggregateReceiveScans([{ lineId: 'line-1', qty: '0' }]);
    expect(entries[0].qty).toBe(0);
    expect(invalid).toEqual([]);
  });
});

describe('planReceive', () => {
  const inTransit = makeTransfer({
    status: 'in_transit',
    from_location_name: 'Main',
    to_location_name: 'Airport',
    qty_in_transit_total: 14,
    lines: [
      makeLine({ id: 'line-1', inventory_item_id: 501, qty: 10, qty_dispatched: 10, qty_in_transit: 10 }),
      makeLine({ id: 'line-2', inventory_item_id: 502, sku: 'LS100-SLATE-M', qty: 4, qty_dispatched: 4, qty_in_transit: 4 })
    ]
  });

  it('receives everything with no shortfall in "all" mode', () => {
    const plan = planReceive({ mode: 'all', scans: [] }, inTransit);
    expect(plan.totalReceiving).toBe(14);
    expect(plan.totalShortfall).toBe(0);
    expect(plan.hasShortfall).toBe(false);
    expect(plan.shortfallWarning).toBeNull();
    expect(plan.valid).toBe(true);
  });

  it('ignores scans in "all" mode, so a stale scan list cannot shorten a receive-all', () => {
    const plan = planReceive({ mode: 'all', scans: [{ lineId: 'line-1', qty: '1' }] }, inTransit);
    expect(plan.totalReceiving).toBe(14);
  });

  it('DROPS the scan buffer in "all" mode rather than merely ignoring its quantities', () => {
    // `receiving` comes from qty_in_transit in this mode either way, so the totals cannot
    // prove the buffer was dropped. What the buffer would otherwise do is INVALIDATE a
    // receive-all it has no bearing on: a left-over scan from a previous transfer looks
    // like an unknown line, and a half-typed one looks like a bad quantity.
    const plan = planReceive(
      {
        mode: 'all',
        scans: [
          { lineId: 'a-line-from-another-transfer', qty: '1' },
          { lineId: 'line-1', qty: '4x' }
        ]
      },
      inTransit
    );

    expect(plan.unknownLineIds).toEqual([]);
    expect(plan.errors).toEqual([]);
    expect(plan.valid).toBe(true);
    expect(plan.totalReceiving).toBe(14);
    // scanCount describes the scans that BUILT this plan, and none did.
    expect(plan.rows.map((row) => row.scanCount)).toEqual([0, 0]);
  });

  it('reports the shortfall per line and in total BEFORE anything is sent', () => {
    const plan = planReceive(
      {
        mode: 'partial',
        scans: [
          { lineId: 'line-1', qty: '8' },
          { lineId: 'line-2', qty: '4' }
        ]
      },
      inTransit
    );
    expect(plan.rows[0]).toMatchObject({ lineId: 'line-1', receiving: 8, shortfall: 2 });
    expect(plan.rows[1]).toMatchObject({ lineId: 'line-2', receiving: 4, shortfall: 0 });
    expect(plan.totalShortfall).toBe(2);
    expect(plan.valid).toBe(true);
  });

  it('names a shortfall as units that arrive at neither location, since nothing else ever will', () => {
    const plan = planReceive({ mode: 'partial', scans: [{ lineId: 'line-1', qty: '8' }] }, inTransit);
    expect(plan.hasShortfall).toBe(true);
    expect(plan.shortfallWarning).toContain('arrive at neither');
    expect(plan.shortfallWarning).toContain('no shrinkage movement');
    // 6 = the 2 short on line-1 plus the whole of the unscanned line-2.
    expect(plan.totalShortfall).toBe(6);
  });

  it('folds repeated scans into one row before the totals are computed', () => {
    const plan = planReceive(
      {
        mode: 'partial',
        scans: [
          { lineId: 'line-1', qty: '4' },
          { lineId: 'line-1', qty: '4' },
          { lineId: 'line-1', qty: '2' }
        ]
      },
      inTransit
    );
    expect(plan.rows[0]).toMatchObject({ receiving: 10, shortfall: 0, scanCount: 3 });
    // Last-entry-wins would have received 2 and quietly lost 8.
    expect(plan.rows[0].receiving).not.toBe(2);
  });

  it('caps at qty_in_transit client-side, which is the exact bound the server checks', () => {
    const plan = planReceive({ mode: 'partial', scans: [{ lineId: 'line-1', qty: '12' }] }, inTransit);
    expect(plan.rows[0].error).toContain('only 10 are in transit');
    expect(plan.valid).toBe(false);
  });

  it('clamps an over-cap line to 0 short instead of a NEGATIVE shortfall that would cancel a real one', () => {
    // Unclamped, line-1's 10 - 12 = -2 nets off line-2's genuine 4 and the total reads 2
    // where it should read 4 — and on a single over-cap line it would read below zero,
    // hiding the acknowledgement the user has to give before a loss is committed.
    const plan = planReceive({ mode: 'partial', scans: [{ lineId: 'line-1', qty: '12' }] }, inTransit);

    expect(plan.rows[0].shortfall).toBe(0);
    expect(plan.rows[0].shortfall).not.toBe(-2);
    // line-2 was not scanned, so its whole 4 is short and that is all that is short.
    expect(plan.totalShortfall).toBe(4);
    expect(plan.totalShortfall).not.toBe(2);
    expect(plan.hasShortfall).toBe(true);
  });

  it('reports a non-whole-number scan as an error rather than quietly counting it out', () => {
    // aggregateReceiveScans quarantines '4x', which leaves line-2 at zero received. If
    // that did not invalidate the plan, buildReceivePayload would send qty 0 for a line
    // whose units physically arrived, and the shortfall would be written off unseen.
    const plan = planReceive(
      {
        mode: 'partial',
        scans: [
          { lineId: 'line-1', qty: '10' },
          { lineId: 'line-2', qty: '4x' }
        ]
      },
      inTransit
    );

    expect(plan.valid).toBe(false);
    expect(plan.errors.join(' ')).toContain('not a whole number');
    // The plan still SHOWS the damage the bad scan would do: 4 units unaccounted for.
    expect(plan.rows[1]).toMatchObject({ lineId: 'line-2', receiving: 0, shortfall: 4 });
    expect(plan.totalShortfall).toBe(4);
  });

  it('a negative scan is an error too, not a subtraction', () => {
    const plan = planReceive({ mode: 'partial', scans: [{ lineId: 'line-1', qty: '-3' }] }, inTransit);
    expect(plan.valid).toBe(false);
    expect(plan.errors.join(' ')).toContain('not a whole number');
    expect(plan.rows[0].receiving).toBe(0);
    expect(plan.rows[0].receiving).not.toBe(-3);
  });

  it('states a shortfall the shortfall report reproduces once the receive lands, on a PART-RECEIVED line', () => {
    // The wire quantity is an INCREMENT: inventory/transfers.py:267 does
    // `qty_received = qty_received + qty`, and rejects any qty above qty_in_transit as
    // `over_receipt`. So the cap is qty_in_transit, and the two shortfall computations in
    // this module — qty_in_transit - receiving here, qty_dispatched - qty_received in
    // transferShortfallReport — describe the same units for EVERY qty_received, not only
    // for zero. Sending the absolute running total instead would 409, or breach the
    // `qty_received <= qty_dispatched` CheckConstraint if that 409 were ever relaxed.
    const partly = makeTransfer({
      status: 'in_transit',
      qty_in_transit_total: 6,
      lines: [makeLine({ id: 'line-1', qty: 10, qty_dispatched: 10, qty_received: 4, qty_in_transit: 6 })]
    });
    const draft: ReceiveDraft = { mode: 'partial', scans: [{ lineId: 'line-1', qty: '5' }] };

    const plan = planReceive(draft, partly);
    expect(plan.rows[0]).toMatchObject({ inTransit: 6, receiving: 5, shortfall: 1 });
    expect(plan.valid).toBe(true);

    const payload = buildReceivePayload(draft, partly);
    expect(payload.lines).toEqual([{ line_id: 'line-1', qty: 5 }]);
    // 9 is qty_received + scanned — the absolute figure. It is above the 6 in transit, so
    // the server answers 409 over_receipt, and it is NOT what this module sends.
    expect(payload.lines?.[0].qty).not.toBe(9);

    // Now apply it the way the server does and ask the other computation.
    const afterReceive = makeTransfer({
      status: 'received',
      qty_in_transit_total: 1,
      lines: [makeLine({ id: 'line-1', qty: 10, qty_dispatched: 10, qty_received: 4 + 5, qty_in_transit: 1 })]
    });
    const report = transferShortfallReport(afterReceive);
    expect(report.totalOutstanding).toBe(plan.totalShortfall);
    expect(report.totalOutstanding).toBe(1);
    expect(report.matchesServerTotal).toBe(true);
  });

  it('flags a scanned line that is not in transit here, which is also how a bad line_id shows up', () => {
    const plan = planReceive({ mode: 'partial', scans: [{ lineId: 'not-a-uuid', qty: '1' }] }, inTransit);
    expect(plan.unknownLineIds).toEqual(['not-a-uuid']);
    expect(plan.valid).toBe(false);
    expect(plan.errors.join(' ')).toContain('not in transit');
  });

  it('lists only lines still in transit, so a fully received line cannot be received twice', () => {
    const partly = makeTransfer({
      status: 'in_transit',
      lines: [
        makeLine({ id: 'line-1', qty_dispatched: 10, qty_received: 10, qty_in_transit: 0 }),
        makeLine({ id: 'line-2', qty_dispatched: 4, qty_in_transit: 4 })
      ]
    });
    const plan = planReceive({ mode: 'all', scans: [] }, partly);
    expect(plan.rows.map((row) => row.lineId)).toEqual(['line-2']);
    expect(plan.totalInTransit).toBe(4);
  });

  it('refuses a receive when nothing is in transit', () => {
    const nothing = makeTransfer({ status: 'received', lines: [makeLine({ qty_dispatched: 4, qty_received: 4, qty_in_transit: 0 })] });
    const plan = planReceive({ mode: 'all', scans: [] }, nothing);
    expect(plan.valid).toBe(false);
    expect(plan.errors.join(' ')).toContain('Nothing is in transit');
  });
});

describe('buildReceivePayload', () => {
  const inTransit = makeTransfer({
    status: 'in_transit',
    lines: [
      makeLine({ id: 'line-1', inventory_item_id: 501, qty: 10, qty_dispatched: 10, qty_in_transit: 10 }),
      makeLine({ id: 'line-2', inventory_item_id: 502, qty: 4, qty_dispatched: 4, qty_in_transit: 4 })
    ]
  });

  it('expresses "receive everything" by OMITTING lines, never by an empty array', () => {
    // TRAP 1: {"lines": []} does mean receive-everything to this endpoint, but it is
    // the same body that DELETES every line on PATCH. It is never emitted here.
    const payload = buildReceivePayload({ mode: 'all', scans: [] }, inTransit);
    expect(payload).toEqual({});
    expect(payload).not.toHaveProperty('lines');
    expect(payload.lines).toBeUndefined();
  });

  it('sends explicit zeros — not [] — when a partial receive has nothing scanned', () => {
    // TRAP 1 the other way round: an empty array here would receive EVERYTHING when
    // the user's intent was to receive nothing.
    const payload = buildReceivePayload({ mode: 'partial', scans: [] }, inTransit);
    expect(payload.lines).not.toEqual([]);
    expect(payload.lines).toEqual([
      { line_id: 'line-1', qty: 0 },
      { line_id: 'line-2', qty: 0 }
    ]);
  });

  it('aggregates duplicate scans into one entry per line', () => {
    // TRAP 2. Three scans, one entry, six units.
    const payload = buildReceivePayload(
      {
        mode: 'partial',
        scans: [
          { lineId: 'line-1', qty: '2' },
          { lineId: 'line-1', qty: '2' },
          { lineId: 'line-1', qty: '2' }
        ]
      },
      inTransit
    );
    const line1 = payload.lines?.filter((entry) => entry.line_id === 'line-1') ?? [];
    expect(line1).toHaveLength(1);
    expect(line1[0].qty).toBe(6);
    expect(line1[0].qty).not.toBe(2);
  });

  it('states every in-transit line, giving unscanned ones an explicit zero', () => {
    const payload = buildReceivePayload({ mode: 'partial', scans: [{ lineId: 'line-1', qty: '10' }] }, inTransit);
    expect(payload.lines).toEqual([
      { line_id: 'line-1', qty: 10 },
      { line_id: 'line-2', qty: 0 }
    ]);
  });

  it('throws rather than emitting [] when there is nothing in transit to receive', () => {
    const nothing = makeTransfer({ lines: [makeLine({ qty_dispatched: 4, qty_received: 4, qty_in_transit: 0 })] });
    expect(() => buildReceivePayload({ mode: 'partial', scans: [] }, nothing)).toThrow(RECEIVE_EMPTY_LINES_REFUSED);
  });

  it('THROWS on an unparseable scan instead of sending qty 0 for the line it was scanned against', () => {
    // The whole point of quarantining '4x' in aggregateReceiveScans is undone if the
    // builder then maps the plan straight to the wire: line-2 falls through to its
    // explicit zero, the transfer closes as received with a 4-unit shortfall, and those
    // units are gone from every on-hand figure with no shrinkage movement to find later.
    const draft: ReceiveDraft = {
      mode: 'partial',
      scans: [
        { lineId: 'line-1', qty: '10' },
        { lineId: 'line-2', qty: '4x' }
      ]
    };

    expect(() => buildReceivePayload(draft, inTransit)).toThrow(RECEIVE_INVALID_PLAN_REFUSED);
    // The refusal must say WHAT was wrong, or a developer goes back to guess at the buffer.
    expect(() => buildReceivePayload(draft, inTransit)).toThrow(/not a whole number/);
    // And the body it used to emit — a silent 100% shortfall on line-2 — is now unreachable.
    let emitted: ReceivePayload | null = null;
    try {
      emitted = buildReceivePayload(draft, inTransit);
    } catch {
      emitted = null;
    }
    expect(emitted).toBeNull();
  });

  it('THROWS when a scan names a line this transfer does not have, instead of sending ALL zeros', () => {
    // The worst shape of the same bug: nothing matches, every row keeps its explicit
    // zero, and a 5-unit scan becomes "receive nothing" — closing the whole transfer as
    // received with a 100% shortfall on a delivery that arrived intact.
    const draft: ReceiveDraft = { mode: 'partial', scans: [{ lineId: 'line-9', qty: '5' }] };

    expect(() => buildReceivePayload(draft, inTransit)).toThrow(RECEIVE_INVALID_PLAN_REFUSED);
    expect(() => buildReceivePayload(draft, inTransit)).toThrow(/not in transit/);
  });

  it('THROWS on an over-cap scan rather than driving the server qty_in_transit negative', () => {
    // 12 against 10 in transit is refused server-side as over_receipt, so the request is
    // pointless; and if that check were ever relaxed it would breach the
    // qty_received <= qty_dispatched CheckConstraint and fire the shortfall report's
    // matchesServerTotal tripwire against a total the client itself caused.
    const draft: ReceiveDraft = { mode: 'partial', scans: [{ lineId: 'line-1', qty: '12' }] };

    expect(() => buildReceivePayload(draft, inTransit)).toThrow(RECEIVE_INVALID_PLAN_REFUSED);
    expect(() => buildReceivePayload(draft, inTransit)).toThrow(/only 10 are in transit/);
  });

  it('still builds a genuinely short receive, which is a real event and not an error', () => {
    // The refusal above must not swallow the case the whole shortfall UI exists for.
    const payload = buildReceivePayload({ mode: 'partial', scans: [{ lineId: 'line-1', qty: '8' }] }, inTransit);
    expect(payload.lines).toEqual([
      { line_id: 'line-1', qty: 8 },
      { line_id: 'line-2', qty: 0 }
    ]);
  });

  it('never produces an empty lines array for any partial draft — it emits entries or refuses', () => {
    const drafts: ReceiveDraft[] = [
      { mode: 'partial', scans: [] },
      { mode: 'partial', scans: [{ lineId: 'line-1', qty: '0' }] },
      { mode: 'partial', scans: [{ lineId: 'unknown', qty: '3' }] },
      { mode: 'partial', scans: [{ lineId: 'line-1', qty: '4x' }] },
      { mode: 'partial', scans: [{ lineId: 'line-1', qty: '12' }] },
      { mode: 'partial', scans: [{ lineId: 'line-1', qty: '-1' }] }
    ];

    drafts.forEach((draft) => {
      let payload: ReceivePayload | null = null;
      try {
        payload = buildReceivePayload(draft, inTransit);
      } catch (err) {
        // A refusal is the other acceptable answer. An empty array, or a body built from
        // a plan the module itself called invalid, is not.
        expect((err as Error).message).toMatch(/Refusing/);
        return;
      }
      expect(payload.lines).not.toEqual([]);
      expect(payload.lines?.length).toBeGreaterThan(0);
    });
  });
});

describe('transferShortfallReport', () => {
  const shortLines = [
    makeLine({ id: 'line-1', qty: 10, qty_dispatched: 10, qty_received: 8, qty_in_transit: 2 }),
    makeLine({ id: 'line-2', sku: 'LS100-SLATE-M', qty: 4, qty_dispatched: 4, qty_received: 4, qty_in_transit: 0 })
  ];

  it('calls a received shortfall a loss and says the units arrived at neither location', () => {
    const report = transferShortfallReport(
      makeTransfer({
        status: 'received',
        lines: shortLines,
        qty_in_transit_total: 2,
        from_location_name: 'Main',
        to_location_name: 'Airport'
      })
    );
    expect(report.isLoss).toBe(true);
    expect(report.totalOutstanding).toBe(2);
    expect(report.lines.map((line) => line.lineId)).toEqual(['line-1']);
    expect(report.headline).toContain('arrived at neither location');
    expect(report.detail).toContain('no shrinkage movement');
    expect(report.detail).toContain('Airport');
  });

  it('does NOT call the identical number a loss while the transfer is still in transit', () => {
    // qty_dispatched - qty_received means two opposite things: stock on a van, and
    // stock that vanished. Only the received one is a loss.
    const report = transferShortfallReport(makeTransfer({ status: 'in_transit', lines: shortLines, qty_in_transit_total: 2 }));
    expect(report.totalOutstanding).toBe(2);
    expect(report.isLoss).not.toBe(true);
    expect(report.headline).toBeNull();
    expect(report.detail).toBeNull();
  });

  it('reports nothing for a clean receipt', () => {
    const report = transferShortfallReport(
      makeTransfer({
        status: 'received',
        qty_in_transit_total: 0,
        lines: [makeLine({ qty: 4, qty_dispatched: 4, qty_received: 4, qty_in_transit: 0 })]
      })
    );
    expect(report.lines).toEqual([]);
    expect(report.isLoss).toBe(false);
    expect(report.headline).toBeNull();
  });

  it('does not let an impossible over-received line cancel a real loss out of the total', () => {
    // received > dispatched breaches a server CheckConstraint, so it can only mean the
    // client's copy is stale. Unclamped, line-1's -2 nets off line-2's genuine 2 and the
    // report says nothing was lost at all — on a transfer where 2 units vanished. The
    // total is summed over EVERY line, not just the reported ones, so the clamp is what
    // stops that rather than the > 0 filter merely hiding the row.
    const report = transferShortfallReport(
      makeTransfer({
        status: 'received',
        qty_in_transit_total: 2,
        lines: [
          makeLine({ id: 'line-1', qty: 4, qty_dispatched: 4, qty_received: 6, qty_in_transit: 0 }),
          makeLine({ id: 'line-2', qty: 10, qty_dispatched: 10, qty_received: 8, qty_in_transit: 2 })
        ]
      })
    );

    expect(report.totalOutstanding).toBe(2);
    // 0 is what the unclamped sum produces, and it reads as "clean receipt".
    expect(report.totalOutstanding).not.toBe(0);
    expect(report.lines.map((line) => line.lineId)).toEqual(['line-2']);
    expect(report.isLoss).toBe(true);
    // The server clamps per line too — qty_in_transit_total is sum(max(0, d - r)) — so the
    // tripwire must stay silent rather than fire on arithmetic of our own making.
    expect(report.matchesServerTotal).toBe(true);
  });

  it('agrees with the server total, which is a tripwire and should stay silent', () => {
    const agreeing = transferShortfallReport(makeTransfer({ status: 'received', lines: shortLines, qty_in_transit_total: 2 }));
    expect(agreeing.matchesServerTotal).toBe(true);

    const drifting = transferShortfallReport(makeTransfer({ status: 'received', lines: shortLines, qty_in_transit_total: 5 }));
    expect(drifting.matchesServerTotal).toBe(false);
  });
});

describe('transferPatchPartiallySaved', () => {
  it('classifies a per-line 400 as maybe-saved, because the header commits before lines resolve', () => {
    // TRAP 3: the view saves notes/from/to, then the line resolver RETURNS a 400
    // Response instead of raising, so the atomic block commits the header anyway.
    // A form that treats this as "nothing happened" desyncs for good.
    const resolveError = httpError(400, { lines: [{ index: 1, inventory_item_id: 99, detail: 'No such item for this company.' }] });
    expect(transferPatchPartiallySaved(resolveError)).toBe(true);

    const fieldError = httpError(400, { lines: [{}, { qty: ['Must be greater than 0.'] }] });
    expect(transferPatchPartiallySaved(fieldError)).toBe(true);
  });

  it('does NOT claim a header-only 400 saved anything, because that fails before any write', () => {
    const headerError = httpError(400, { to_location_id: ['Origin and destination must differ.'] });
    expect(transferPatchPartiallySaved(headerError)).toBe(false);

    // A serializer-level `lines` error is raised before the header is touched too.
    expect(transferPatchPartiallySaved(httpError(400, { lines: ['This field is required.'] }))).toBe(false);
    expect(transferPatchPartiallySaved(httpError(400, { lines: { non_field_errors: ['This list may not be empty.'] } }))).toBe(false);
  });

  it('does not fire on a 409 or on a transport failure', () => {
    expect(transferPatchPartiallySaved(httpError(409, { detail: 'Insufficient stock.', error: 'blocked' }))).toBe(false);
    expect(transferPatchPartiallySaved(new Error('Network Error'))).toBe(false);
  });
});

describe('transferSaveNeedsRefetch', () => {
  it('also demands a refetch on an illegal-transition 409, where the local status is simply wrong', () => {
    const illegal = httpError(409, {
      detail: 'Only a draft transfer can be cancelled.',
      status: 'in_transit',
      allowed_from: ['draft']
    });
    expect(transferSaveNeedsRefetch(illegal)).toBe(true);
    // But nothing was written, so it is not the partial-save case.
    expect(transferPatchPartiallySaved(illegal)).toBe(false);
  });

  it('covers the partial-save 400 and leaves a plain validation 400 alone', () => {
    expect(transferSaveNeedsRefetch(httpError(400, { lines: [{ qty: ['Must be greater than 0.'] }] }))).toBe(true);
    expect(transferSaveNeedsRefetch(httpError(400, { notes: ['Too long.'] }))).toBe(false);
  });

  it('does not demand a refetch for an insufficient-stock 409, where the client is not stale', () => {
    // The blockers are about the shelf, not about the transfer's status.
    const blocked = httpError(409, {
      error: 'Insufficient stock at Main for 1 line(s).',
      detail: [{ line_id: 'line-1', lookup: 'LS100-IVORY-S', reason: 'insufficient_stock', detail: 'Requested 10, available 4.' }]
    });
    expect(transferSaveNeedsRefetch(blocked)).toBe(false);
  });
});
