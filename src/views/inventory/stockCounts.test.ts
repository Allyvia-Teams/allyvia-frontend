import { describe, expect, it } from 'vitest';

import {
  APPLY_NEEDS_REVIEW_NOTE,
  CountDraft,
  CountLine,
  EXPECTED_SNAPSHOT_NOTE,
  LINES_NOT_RETURNED_NOTE,
  NON_ADMIN_NOTICE,
  NOTE_OVERWRITE_ONLY_NOTE,
  ScanBuffer,
  applyScan,
  buildScanIndex,
  buildVarianceRows,
  canSubmitEntries,
  clearScan,
  countActionStates,
  countStatusColor,
  countStatusLabel,
  describeCountScope,
  detectMissingCostLines,
  dismissQuarantine,
  emptyCountDraft,
  emptyScanBuffer,
  explainApplyFailure,
  formatMoneyUnits,
  isActionLegal,
  looksLikeBarcode,
  normalizeCount,
  normalizeCountResponse,
  parseMoneyUnits,
  resolveScan,
  setScanCount,
  setScanNote,
  sortVarianceRows,
  toCountCreatePayload,
  toCountListParams,
  toCountListQueryString,
  toEntriesPayload,
  validateCountDraft,
  validateCountedQtyInput,
  varianceTotals
} from './stockCounts';
import { EM_DASH } from './stockFormat';

// --- fixtures ---------------------------------------------------------------

const LOCATION_ID = '2b1f3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const PRODUCT_ID = '9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f';

const line = (over: Partial<CountLine> = {}): CountLine => ({
  line_id: over.line_id ?? 'line-1',
  inventory_item_id: over.inventory_item_id ?? 101,
  sku: over.sku ?? 'LS100-IVORY-S',
  name: over.name ?? 'Linen Shirt',
  size: over.size ?? 'S',
  color: over.color ?? 'Ivory',
  expected_qty: over.expected_qty ?? 10,
  counted_qty: over.counted_qty === undefined ? null : over.counted_qty,
  variance: over.variance === undefined ? null : over.variance,
  unit_cost: over.unit_cost === undefined ? '48.0000' : over.unit_cost,
  cost_impact: over.cost_impact === undefined ? null : over.cost_impact,
  note: over.note ?? '',
  counted_at: over.counted_at ?? null,
  counted_by_email: over.counted_by_email ?? '',
  barcode: over.barcode
});

/** A counted line, with variance and cost impact filled in the way the API does. */
const counted = (over: Partial<CountLine> & { counted_qty: number }): CountLine => {
  const expected = over.expected_qty ?? 10;
  const variance = over.counted_qty - expected;
  const unitCost = over.unit_cost === undefined ? '48.0000' : over.unit_cost;
  const impact =
    over.cost_impact !== undefined
      ? over.cost_impact
      : unitCost === null
        ? null
        : formatMoneyUnits((parseMoneyUnits(unitCost) ?? 0) * variance);
  return line({ ...over, expected_qty: expected, variance, unit_cost: unitCost, cost_impact: impact });
};

const wireCount = (over: Record<string, unknown> = {}) => ({
  id: 'count-1',
  reference: 'SC-000001',
  status: 'open',
  status_label: 'Open',
  location_id: LOCATION_ID,
  location_name: 'Downtown',
  scope: 'all',
  scope_filter: {},
  notes: '',
  is_mutable: true,
  created_by_email: 'manager@shop.test',
  applied_by_email: '',
  applied_at: null,
  cancelled_at: null,
  created_at: '2026-08-05T09:00:00Z',
  summary: {
    total_lines: 3,
    counted_lines: 2,
    uncounted_lines: 1,
    lines_with_variance: 1,
    net_variance_units: -2,
    shrinkage_units: 2,
    overage_units: 0,
    net_cost_impact: '-96.0000'
  },
  ...over
});

const err = (status: number, data: unknown) => ({ response: { status, data } });

// --- envelopes --------------------------------------------------------------

describe('normalizeCountResponse', () => {
  it('reads GET /stock-counts/ as a bare ARRAY, not a paginated envelope', () => {
    const result = normalizeCountResponse([wireCount(), wireCount({ id: 'count-2', status: 'applied' })]);

    expect(result.envelope).toBe('list');
    expect(result.counts.map((count) => count.id)).toEqual(['count-1', 'count-2']);
    expect(result.count).toBeNull();
  });

  it('reads POST /stock-counts/ as a BARE count and reports that lines are unknown', () => {
    const result = normalizeCountResponse(wireCount());

    expect(result.envelope).toBe('count');
    expect(result.count?.reference).toBe('SC-000001');
    // The create response carries no lines even though the backend just generated
    // them. `lines: []` must therefore NOT be read as "this count has no lines".
    expect(result.linesKnown).toBe(false);
    expect(result.lines).toEqual([]);
  });

  it('reads GET /stock-counts/{id}/ as {count, summary, lines}', () => {
    const result = normalizeCountResponse({
      count: wireCount({ status: 'review' }),
      summary: wireCount().summary,
      lines: [counted({ counted_qty: 8 }), line({ line_id: 'line-2' })]
    });

    expect(result.envelope).toBe('detail');
    expect(result.linesKnown).toBe(true);
    expect(result.lines).toHaveLength(2);
    expect(result.summary?.net_cost_impact).toBe('-96.0000');
    expect(result.count?.status).toBe('review');
  });

  it('prefers the top-level summary over the copy nested inside count', () => {
    // The detail endpoint sends the same summary twice. Reading the top-level one
    // means the nested copy can be dropped later without changing the screen.
    const result = normalizeCountResponse({
      count: wireCount({ summary: { ...wireCount().summary, net_cost_impact: '-1.0000' } }),
      summary: { ...wireCount().summary, net_cost_impact: '-96.0000' },
      lines: []
    });
    expect(result.summary?.net_cost_impact).toBe('-96.0000');
  });

  it('falls back to the nested summary when the top level omits it', () => {
    const result = normalizeCountResponse({ count: wireCount(), lines: [] });
    expect(result.summary?.shrinkage_units).toBe(2);
  });

  it('distinguishes a real zero-line count from an envelope that just omits lines', () => {
    // A count whose scope matched nothing is creatable, reviewable and applyable,
    // so an empty grid is a legitimate state — and `linesKnown` is the only thing
    // that separates it from "we were not told".
    const zeroLine = normalizeCountResponse({ count: wireCount(), summary: wireCount().summary, lines: [] });
    expect(zeroLine.linesKnown).toBe(true);
    expect(zeroLine.lines).toEqual([]);

    const afterEntries = normalizeCountResponse({ recorded: 4, summary: wireCount().summary });
    expect(afterEntries.linesKnown).toBe(false);
  });

  it('reads POST /apply/ as {count, adjustments}, with [] meaning a no-op apply', () => {
    const applied = normalizeCountResponse({
      count: wireCount({ status: 'applied' }),
      adjustments: [{ inventory_item_id: 101, sku: 'LS100-IVORY-S', delta: -2, quantity_after: 8 }]
    });
    expect(applied.envelope).toBe('apply');
    expect(applied.adjustments).toEqual([{ inventory_item_id: 101, sku: 'LS100-IVORY-S', delta: -2, quantity_after: 8 }]);
    // Adjustments are not lines; the grid still has to be refetched.
    expect(applied.linesKnown).toBe(false);

    const noOp = normalizeCountResponse({ count: wireCount({ status: 'applied' }), adjustments: [] });
    expect(noOp.envelope).toBe('apply');
    expect(noOp.adjustments).toEqual([]);
  });

  it('reads POST /entries/ as {recorded, summary} — no lines, so the grid is stale', () => {
    const result = normalizeCountResponse({ recorded: 4, summary: wireCount().summary });

    expect(result.envelope).toBe('entries');
    expect(result.recorded).toBe(4);
    expect(result.summary?.total_lines).toBe(3);
    expect(result.linesKnown).toBe(false);
    // The trap this whole field exists for: a caller reading `lines` here would
    // paint an empty stocktake over a count with three lines in it.
    expect(result.lines).toEqual([]);
    expect(result.count).toBeNull();
  });

  it('reads POST /review/ and /cancel/ as BARE counts, not as {count: …}', () => {
    const reviewed = normalizeCountResponse(wireCount({ status: 'review', status_label: 'In review' }));
    expect(reviewed.envelope).toBe('count');
    expect(reviewed.count?.status).toBe('review');

    const cancelled = normalizeCountResponse(wireCount({ status: 'cancelled', cancelled_at: '2026-08-05T10:00:00Z' }));
    expect(cancelled.count?.cancelled_at).toBe('2026-08-05T10:00:00Z');
    // Not wrapped: `result.count.count` is the mistake this asserts against.
    expect(cancelled.counts).toEqual([]);
  });

  it('returns envelope "unknown" for a body it does not recognise instead of guessing', () => {
    expect(normalizeCountResponse(null).envelope).toBe('unknown');
    expect(normalizeCountResponse('oops').envelope).toBe('unknown');
    expect(normalizeCountResponse({ detail: 'Stock count not found.' }).envelope).toBe('unknown');
  });

  it('tolerates a caller who passed the axios response instead of response.data', () => {
    const result = normalizeCountResponse({ data: wireCount(), status: 201 });
    expect(result.envelope).toBe('count');
    expect(result.count?.id).toBe('count-1');
  });

  it('gives every response its OWN lines and counts arrays, so an in-place sort cannot poison the next call', () => {
    // Spreading one shared constant would copy the array REFERENCES, and a grid that
    // sorts or pushes in place is ordinary React practice. The corruption then shows
    // up in a later, unrelated call as `linesKnown: false` next to a non-empty
    // `lines` — a state this type contract says cannot happen.
    const afterEntries = normalizeCountResponse({ recorded: 4, summary: null });
    const unrecognised = normalizeCountResponse(null);

    expect(afterEntries.lines).not.toBe(unrecognised.lines);
    expect(afterEntries.counts).not.toBe(unrecognised.counts);

    afterEntries.lines.push(line({ line_id: 'ghost' }));
    const ghostCount = normalizeCount(wireCount());
    if (ghostCount) afterEntries.counts.push(ghostCount);

    const later = normalizeCountResponse({ recorded: 1, summary: null });
    // `linesKnown: false` with a line in `lines` is the impossible state the leak
    // produces, and the one a grid would render as a one-row stocktake.
    expect(later.linesKnown).toBe(false);
    expect(later.lines).toEqual([]);
    expect(later.counts).toEqual([]);
  });

  it('does not read a DRF-paginated body as a detail envelope just because it has a `count` key', () => {
    // `{count, next, previous, results}` is one settings change away, and its `count`
    // is a NUMBER. Key presence alone routes it into the detail branch, which drops
    // every row in `results` while reporting that the envelope WAS recognised.
    const paginated = normalizeCountResponse({
      count: 2,
      next: null,
      previous: null,
      results: [wireCount(), wireCount({ id: 'count-2' })]
    });

    expect(paginated.envelope).toBe('unknown');
    expect(paginated.envelope).not.toBe('detail');
    expect(paginated.count).toBeNull();
    expect(paginated.counts).toEqual([]);

    expect(normalizeCountResponse({ count: 'nope' }).envelope).toBe('unknown');
    // The real detail envelope, whose `count` is an object, still reads as one.
    expect(normalizeCountResponse({ count: wireCount(), lines: [] }).envelope).toBe('detail');
  });
});

describe('normalizeCount', () => {
  it('leaves an absent summary NULL rather than inventing a row of zeros', () => {
    // A zeroed summary would state "0 lines with variance" for a count nobody has
    // summarised — a confident answer to a question that was never asked.
    const normalized = normalizeCount(wireCount({ summary: undefined }));
    expect(normalized?.summary).toBeNull();
    expect(normalized?.summary).not.toEqual({
      total_lines: 0,
      counted_lines: 0,
      uncounted_lines: 0,
      lines_with_variance: 0,
      net_variance_units: 0,
      shrinkage_units: 0,
      overage_units: 0,
      net_cost_impact: '0.0000'
    });
  });

  it('keeps net_cost_impact as a STRING and null when absent', () => {
    const withMoney = normalizeCount(wireCount());
    expect(withMoney?.summary?.net_cost_impact).toBe('-96.0000');

    const withoutMoney = normalizeCount(wireCount({ summary: { ...wireCount().summary, net_cost_impact: null } }));
    expect(withoutMoney?.summary?.net_cost_impact).toBeNull();
  });

  it('derives is_mutable when the key is missing, so buttons are not greyed out by an omission', () => {
    expect(normalizeCount({ id: 'c', status: 'open' })?.is_mutable).toBe(true);
    expect(normalizeCount({ id: 'c', status: 'review' })?.is_mutable).toBe(true);
    expect(normalizeCount({ id: 'c', status: 'applied' })?.is_mutable).toBe(false);
    // A present false is still honoured — the server is the authority.
    expect(normalizeCount({ id: 'c', status: 'open', is_mutable: false })?.is_mutable).toBe(false);
  });

  it('forces scope_filter to an object, because a list or string there is a server 500', () => {
    expect(normalizeCount(wireCount({ scope_filter: ['category'] }))?.scope_filter).toEqual({});
    expect(normalizeCount(wireCount({ scope_filter: 'category' }))?.scope_filter).toEqual({});
    expect(normalizeCount(wireCount({ scope_filter: { category: 'Tops' } }))?.scope_filter).toEqual({ category: 'Tops' });
  });

  it('labels an unrecognised status instead of hiding it', () => {
    expect(normalizeCount({ id: 'c', status: 'part_counted' })?.status_label).toBe('Part counted');
    expect(countStatusLabel('review')).toBe('In review');
    expect(countStatusLabel('')).toBe(EM_DASH);
  });
});

describe('line normalisation preserves null-vs-zero', () => {
  it('keeps counted_qty, variance and cost null on an uncounted line', () => {
    const result = normalizeCountResponse({
      count: wireCount(),
      lines: [
        { line_id: 'l1', name: 'Shirt', expected_qty: 10, counted_qty: null, variance: null, unit_cost: '48.0000', cost_impact: null }
      ]
    });
    const only = result.lines[0];
    expect(only.counted_qty).toBeNull();
    expect(only.variance).toBeNull();
    // Zero would say "we looked and it matched". Nobody looked.
    expect(only.counted_qty).not.toBe(0);
    expect(only.variance).not.toBe(0);
  });

  it('keeps a genuine zero variance as 0, which means "counted and matched"', () => {
    const result = normalizeCountResponse({
      count: wireCount(),
      lines: [{ line_id: 'l1', expected_qty: 10, counted_qty: 10, variance: 0, cost_impact: '0.0000' }]
    });
    expect(result.lines[0].variance).toBe(0);
    expect(result.lines[0].counted_qty).toBe(10);
    expect(result.lines[0].variance).not.toBeNull();
  });

  it('derives a missing variance from the counted figure but never for an uncounted line', () => {
    const derived = normalizeCountResponse({ count: wireCount(), lines: [{ line_id: 'l1', expected_qty: 10, counted_qty: 7 }] });
    expect(derived.lines[0].variance).toBe(-3);

    const uncounted = normalizeCountResponse({ count: wireCount(), lines: [{ line_id: 'l2', expected_qty: 10 }] });
    expect(uncounted.lines[0].variance).toBeNull();
  });
});

// --- the state machine ------------------------------------------------------

describe('isActionLegal', () => {
  it('encodes open -> review -> applied with no shortcut', () => {
    expect(isActionLegal('open', 'review')).toBe(true);
    expect(isActionLegal('review', 'apply')).toBe(true);
    // Apply from open is a 409 with allowed_from: ["review"] — never a shortcut.
    expect(isActionLegal('open', 'apply')).toBe(false);
    expect(isActionLegal('review', 'review')).toBe(false);
  });

  it('allows entries and cancel from open or review only', () => {
    expect(isActionLegal('open', 'enter')).toBe(true);
    expect(isActionLegal('review', 'enter')).toBe(true);
    expect(isActionLegal('open', 'cancel')).toBe(true);
    expect(isActionLegal('review', 'cancel')).toBe(true);
    // Once applied the count is immutable: both of these 409 server-side.
    expect(isActionLegal('applied', 'enter')).toBe(false);
    expect(isActionLegal('applied', 'cancel')).toBe(false);
    expect(isActionLegal('cancelled', 'enter')).toBe(false);
  });

  it('fails closed on a status it does not know', () => {
    // An unrecognised status means we do not know which state machine we are in,
    // so nothing is offered rather than everything.
    expect(isActionLegal('part_counted', 'apply')).toBe(false);
    expect(isActionLegal('', 'enter')).toBe(false);
  });
});

describe('countActionStates', () => {
  const admin = { isAdmin: true };

  it('does not offer apply on an open count, so the 409 is unreachable from the UI', () => {
    const states = countActionStates({ status: 'open' }, admin);
    expect(states.apply.allowed).toBe(false);
    expect(states.apply.needsFirst).toBe('review');
    expect(states.apply.reason).toBe(APPLY_NEEDS_REVIEW_NOTE);
    expect(states.review.allowed).toBe(true);
    expect(states.enter.allowed).toBe(true);
    expect(states.cancel.allowed).toBe(true);
  });

  it('offers apply and entries in review, and nothing at all once applied', () => {
    const inReview = countActionStates({ status: 'review' }, admin);
    expect(inReview.apply.allowed).toBe(true);
    expect(inReview.enter.allowed).toBe(true);
    expect(inReview.review.allowed).toBe(false);

    const applied = countActionStates({ status: 'applied' }, admin);
    expect([applied.enter.allowed, applied.review.allowed, applied.apply.allowed, applied.cancel.allowed]).toEqual([
      false,
      false,
      false,
      false
    ]);
    expect(applied.cancel.reason).toContain('immutable');
  });

  it('tells a non-admin plainly instead of letting them earn a 403', () => {
    // A floor counter cannot scan at all: entries, review, apply and cancel are
    // admin-only even though the count itself is readable.
    const states = countActionStates({ status: 'open' }, { isAdmin: false });
    expect(states.enter.allowed).toBe(false);
    expect(states.enter.reason).toBe(NON_ADMIN_NOTICE);
    expect(states.review.allowed).toBe(false);
    expect(NON_ADMIN_NOTICE).toContain('admin-only');
  });

  it('offers nothing when no count is loaded', () => {
    const states = countActionStates(null, admin);
    expect(states.apply.allowed).toBe(false);
    expect(states.apply.reason).toContain('No count');
  });

  it('names the statuses an action is legal from when refusing', () => {
    const cancelled = countActionStates({ status: 'cancelled' }, admin);
    expect(cancelled.enter.reason).toContain('cancelled');
  });
});

// --- the scanner ------------------------------------------------------------

describe('resolveScan', () => {
  const lines = [
    line({ line_id: 'l-shirt', sku: 'LS100-IVORY-S', barcode: '5051234567890' }),
    line({ line_id: 'l-scarf', sku: 'SC200-RED', barcode: '5059999999999', name: 'Scarf' })
  ];
  const index = buildScanIndex(lines);

  it('matches on barcode and on SKU, case- and whitespace-insensitively', () => {
    expect(resolveScan(index, ' 5051234567890 ').line?.line_id).toBe('l-shirt');
    expect(resolveScan(index, 'ls100-ivory-s').line?.line_id).toBe('l-shirt');
    expect(resolveScan(index, '  SC200-red\n').line?.line_id).toBe('l-scarf');
  });

  it('checks BARCODE BEFORE SKU when one item’s barcode is another item’s SKU', () => {
    // This is the server's precedence, and mirroring it is load-bearing: the
    // payload carries a line_id, so a client that matched the SKU first would post
    // the count to the wrong line and the server would never see the mistake.
    const collided = buildScanIndex([
      line({ line_id: 'l-barcode-owner', sku: 'AAA-1', barcode: '5051' }),
      line({ line_id: 'l-sku-owner', sku: '5051', barcode: '9999', name: 'Belt' })
    ]);
    const resolved = resolveScan(collided, '5051');

    expect(resolved.line?.line_id).toBe('l-barcode-owner');
    expect(resolved.matchedBy).toBe('barcode');
    expect(resolved.line?.line_id).not.toBe('l-sku-owner');
  });

  it('reports the trimmed lookup, matching what a server blocker echoes back', () => {
    const missed = resolveScan(index, '  unknown-thing  ');
    expect(missed.line).toBeNull();
    expect(missed.matchedBy).toBeNull();
    expect(missed.lookup).toBe('unknown-thing');
  });

  it('lets the LAST line win a duplicate barcode, exactly as the server’s dict does', () => {
    // Client and server must agree about which line a scan belongs to; the server
    // assigns into a dict in line order, so the later line overwrites.
    const duplicated = buildScanIndex([line({ line_id: 'first', barcode: '777' }), line({ line_id: 'second', barcode: '777' })]);
    expect(resolveScan(duplicated, '777').line?.line_id).toBe('second');
  });

  it('knows when it holds no barcodes at all', () => {
    // The count-line payload has no barcode field; unless the caller joined the
    // catalogue in, barcode matching is simply unavailable here.
    expect(buildScanIndex([line({ barcode: undefined })]).hasBarcodes).toBe(false);
    expect(index.hasBarcodes).toBe(true);
  });
});

describe('the scan buffer', () => {
  const lines = [
    line({ line_id: 'l-shirt', sku: 'LS100-IVORY-S', barcode: '5051234567890', expected_qty: 10 }),
    line({ line_id: 'l-scarf', sku: 'SC200-RED', barcode: '5059999999999', name: 'Scarf', expected_qty: 4 })
  ];
  const index = buildScanIndex(lines);
  const scanMany = (raws: string[]): ScanBuffer => raws.reduce((buffer, raw) => applyScan(buffer, index, raw), emptyScanBuffer());

  it('OVERWRITES rather than accumulates: three scans submit ONE absolute 3', () => {
    // A counter who recounts a shelf means "it is 3", not "three more". The server
    // overwrites, and even within one request the last entry for a line wins — so
    // three entries of 1 would record 1, not 3.
    const buffer = scanMany(['5051234567890', '5051234567890', '5051234567890']);

    expect(buffer.tallies).toHaveLength(1);
    expect(buffer.tallies[0].countedQty).toBe(3);
    expect(buffer.tallies[0].scans).toBe(3);

    const payload = toEntriesPayload(buffer);
    expect(payload.entries).toEqual([{ line_id: 'l-shirt', counted_qty: 3 }]);
    expect(payload.entries).toHaveLength(1);
  });

  it('starts the tally at 0 even when the server already counted that line', () => {
    const recounted = buildScanIndex([line({ line_id: 'l-shirt', barcode: '5051234567890', counted_qty: 7, variance: -3 })]);
    const buffer = applyScan(emptyScanBuffer(), recounted, '5051234567890');

    expect(buffer.tallies[0].countedQty).toBe(1);
    // Starting from 7 would accumulate onto an earlier count — the exact thing the
    // overwrite rule forbids.
    expect(buffer.tallies[0].countedQty).not.toBe(8);
    // The old figure is kept so the row can say "was 7", not used as a base.
    expect(buffer.tallies[0].previousCounted).toBe(7);
  });

  it('keeps the shelves in the order they were worked, one tally per line', () => {
    const buffer = scanMany(['SC200-RED', '5051234567890', 'SC200-RED']);
    expect(buffer.tallies.map((tally) => tally.lineId)).toEqual(['l-scarf', 'l-shirt']);
    expect(buffer.tallies[0].countedQty).toBe(2);
    expect(buffer.tallies[1].countedQty).toBe(1);
  });

  it('quarantines an unknown scan LOCALLY so one bad read cannot 409 the batch', () => {
    // Entries are all-or-nothing: one unmatched lookup rejects everything and
    // records nothing. Forty good reads must not die for one carrier bag.
    const buffer = scanMany(['5051234567890', 'not-a-real-barcode', 'SC200-RED']);

    expect(buffer.quarantined).toHaveLength(1);
    expect(buffer.quarantined[0].lookup).toBe('not-a-real-barcode');
    expect(buffer.quarantined[0].reason).toBe('not_in_count');
    expect(canSubmitEntries(buffer)).toBe(true);

    const payload = toEntriesPayload(buffer);
    expect(payload.entries.map((entry) => entry.line_id)).toEqual(['l-shirt', 'l-scarf']);
    expect(JSON.stringify(payload)).not.toContain('not-a-real-barcode');
  });

  it('counts repeated scans of the same unknown item as ONE problem', () => {
    const buffer = scanMany(['ghost', 'ghost', 'GHOST']);
    expect(buffer.quarantined).toHaveLength(1);
    expect(buffer.quarantined[0].scans).toBe(3);
  });

  it('distinguishes "not in this count" from "we were not given any barcodes"', () => {
    // Without barcodes joined in, a genuine barcode scan cannot be matched here
    // even though the server would match it. Calling that "not in count" would be
    // a lie that sends the user off to widen a scope that is already correct.
    const skuOnly = buildScanIndex([line({ line_id: 'l-shirt', sku: 'LS100-IVORY-S', barcode: undefined })]);
    const buffer = applyScan(emptyScanBuffer(), skuOnly, '5051234567890');

    expect(buffer.quarantined[0].reason).toBe('no_barcode_index');
    expect(buffer.quarantined[0].reason).not.toBe('not_in_count');
    expect(buffer.quarantined[0].detail).toContain('SKU');
  });

  it('picks the reason from the LOOKUP, so a typed SKU still reads as "not in this count" with no barcodes joined', () => {
    // The count-line payload carries no barcode, so a barcode-less index is the
    // DEFAULT, not an edge case. Deciding the reason from that one flag made
    // 'not_in_count' unreachable there: a counter who typed the SKU of an item that
    // genuinely is not in the count was sent to reload the catalogue, and the shelf
    // item stayed out of the stocktake. Both sentences are remedies; the wrong one
    // costs a real count.
    const skuOnly = buildScanIndex([line({ line_id: 'l-shirt', sku: 'LS100-IVORY-S', barcode: undefined })]);
    const buffer = applyScan(emptyScanBuffer(), skuOnly, 'SC200-RED');

    expect(buffer.quarantined[0].reason).toBe('not_in_count');
    expect(buffer.quarantined[0].reason).not.toBe('no_barcode_index');
    expect(buffer.quarantined[0].detail).toContain('widen the count’s scope');
    expect(buffer.quarantined[0].detail).not.toContain('item catalogue');
    expect(buffer.lastEvent?.reason).toBe('not_in_count');

    // With barcodes joined in, a barcode we simply do not hold is also not_in_count —
    // the flag still matters, it just no longer decides on its own.
    expect(applyScan(emptyScanBuffer(), index, '5050000000000').quarantined[0].reason).toBe('not_in_count');
  });

  it('separates a barcode from a SKU by shape, since that is the only evidence a failed scan leaves', () => {
    // The GTIN family is 8–14 digits; this catalogue's SKUs carry letters.
    expect(looksLikeBarcode('5051234567890')).toBe(true);
    expect(looksLikeBarcode(' 12345678 ')).toBe(true);
    expect(looksLikeBarcode('LS100-IVORY-S')).toBe(false);
    expect(looksLikeBarcode('SC200-RED')).toBe(false);
    expect(looksLikeBarcode('1234567')).toBe(false);
    expect(looksLikeBarcode('123456789012345')).toBe(false);
    expect(looksLikeBarcode('')).toBe(false);
  });

  it('refuses a step that is not a positive whole number, because counted_qty is IntegerField(min_value=0)', () => {
    // There is no undoScan, so `step: -1` is the only way the scan path can express
    // "one too many" — and it tallies to a negative absolute figure that 400s the
    // whole all-or-nothing batch, losing every other read. setScanCount refuses the
    // same two values; this path had no equivalent.
    const one = applyScan(emptyScanBuffer(), index, '5051234567890');

    expect(applyScan(one, index, '5051234567890', -1)).toBe(one);
    expect(applyScan(one, index, '5051234567890', -2)).toBe(one);
    expect(applyScan(one, index, '5051234567890', 0.5)).toBe(one);
    expect(applyScan(one, index, '5051234567890', 0)).toBe(one);
    expect(applyScan(one, index, '5051234567890', Number.NaN)).toBe(one);

    // The tally is untouched, so the payload is still submittable…
    expect(toEntriesPayload(one).entries).toEqual([{ line_id: 'l-shirt', counted_qty: 1 }]);
    expect(toEntriesPayload(one).entries[0].counted_qty).not.toBe(-1);
    // …and a bad step on a fresh buffer creates no tally at all rather than one the
    // server would reject.
    const fresh = applyScan(emptyScanBuffer(), index, '5051234567890', -1);
    expect(fresh.tallies).toEqual([]);
    expect(canSubmitEntries(fresh)).toBe(false);
  });

  it('will not index a line the count returned WITHOUT a line id, because its entry would 400 the batch', () => {
    // line_id is a UUIDField server-side and the only identifier an entry carries, so
    // a blank one cannot be counted against: `{line_id: '', counted_qty: 3}` fails the
    // serializer's identify-the-line rule and takes every other read down with it.
    const broken = buildScanIndex([line({ line_id: '', sku: 'LS100-IVORY-S', barcode: '5051234567890' })]);
    expect(broken.byLineId.size).toBe(0);
    expect(broken.bySku.size).toBe(0);
    expect(broken.byBarcode.size).toBe(0);
    expect(broken.hasBarcodes).toBe(false);
    // Whitespace is the same fact: a padded id is not a UUID either.
    expect(buildScanIndex([line({ line_id: '   ', sku: 'LS100-IVORY-S' })]).bySku.size).toBe(0);

    const buffer = applyScan(emptyScanBuffer(), broken, 'LS100-IVORY-S');
    expect(buffer.tallies).toEqual([]);
    expect(canSubmitEntries(buffer)).toBe(false);
    expect(JSON.stringify(toEntriesPayload(buffer))).not.toContain('"line_id":""');

    // And it says WHY. "Widen the scope" would be a wild goose chase: the item IS in
    // the count, it is the payload that is unusable.
    expect(buffer.quarantined[0].reason).toBe('unidentified_line');
    expect(buffer.quarantined[0].reason).not.toBe('not_in_count');
    expect(buffer.quarantined[0].detail).toContain('Reload the count');
    expect(setScanCount(buffer, broken, '', 3).tallies).toEqual([]);
  });

  it('cuts a note to the 500 characters the CharField accepts', () => {
    // note is CharField(max_length=500); one over-long note 400s the batch and every
    // good read in it. The server truncates to 500 on the way in too, so the cut
    // matches what would have been stored.
    const long = setScanNote(setScanCount(emptyScanBuffer(), index, 'l-shirt', 3), index, 'l-shirt', 'x'.repeat(600));
    const note = toEntriesPayload(long).entries[0].note ?? '';

    expect(note).toHaveLength(500);
    expect(note.length).not.toBeGreaterThan(500);
    expect(long.tallies[0].note).toHaveLength(500);
  });

  it('reports the last scan so the UI can beep without diffing the buffer', () => {
    const accepted = applyScan(emptyScanBuffer(), index, '5051234567890');
    expect(accepted.lastEvent).toEqual({
      lookup: '5051234567890',
      matchedBy: 'barcode',
      lineId: 'l-shirt',
      countedQty: 1,
      accepted: true,
      reason: null
    });

    const rejected = applyScan(accepted, index, 'ghost');
    expect(rejected.lastEvent?.accepted).toBe(false);
    expect(rejected.lastEvent?.reason).toBe('not_in_count');
  });

  it('ignores a blank scan instead of quarantining an empty string', () => {
    // There is nothing to tell a user about an empty string, and the API rejects a
    // blank barcode_or_sku anyway — so the buffer is returned untouched.
    const start = emptyScanBuffer();
    const buffer = applyScan(start, index, '   ');
    expect(buffer).toBe(start);
    expect(buffer.quarantined).toEqual([]);
    expect(buffer.tallies).toEqual([]);
  });

  it('accepts a step so a case of twelve is one scan, still absolute', () => {
    let buffer = applyScan(emptyScanBuffer(), index, '5051234567890', 12);
    buffer = applyScan(buffer, index, '5051234567890', 12);
    expect(buffer.tallies[0].countedQty).toBe(24);
    expect(toEntriesPayload(buffer).entries[0].counted_qty).toBe(24);
  });

  it('lets a typed figure override the tally, and zero is a real answer', () => {
    const scanned = scanMany(['5051234567890', '5051234567890']);
    const typed = setScanCount(scanned, index, 'l-shirt', 0);

    expect(typed.tallies[0].countedQty).toBe(0);
    expect(typed.tallies[0].typed).toBe(true);
    expect(toEntriesPayload(typed).entries[0].counted_qty).toBe(0);
  });

  it('creates a tally for a line typed into directly, without a scan', () => {
    const typed = setScanCount(emptyScanBuffer(), index, 'l-scarf', 4);
    expect(typed.tallies).toEqual([expect.objectContaining({ lineId: 'l-scarf', countedQty: 4, scans: 0, typed: true })]);
  });

  it('refuses a negative or fractional typed figure rather than clamping it', () => {
    const base = setScanCount(emptyScanBuffer(), index, 'l-scarf', 4);
    expect(setScanCount(base, index, 'l-scarf', -1)).toBe(base);
    expect(setScanCount(base, index, 'l-scarf', 2.5)).toBe(base);
    expect(setScanCount(base, index, 'no-such-line', 3)).toBe(base);
  });

  it('omits a blank note, because there is no way to CLEAR a note', () => {
    // The server only overwrites a note when the new one is non-empty, so sending
    // '' reads like an intent to clear and does nothing.
    const withNote = setScanNote(setScanCount(emptyScanBuffer(), index, 'l-shirt', 3), index, 'l-shirt', '  two in the window display  ');
    expect(toEntriesPayload(withNote).entries[0]).toEqual({ line_id: 'l-shirt', counted_qty: 3, note: 'two in the window display' });

    const blanked = setScanNote(withNote, index, 'l-shirt', '   ');
    expect(toEntriesPayload(blanked).entries[0]).not.toHaveProperty('note');
  });

  it('identifies every entry by line_id and never by barcode_or_sku', () => {
    // line_id takes priority server-side, so sending the barcode would ask for a
    // lookup we have already done — and with duplicate barcodes it could land
    // somewhere else.
    const payload = toEntriesPayload(scanMany(['5051234567890', 'SC200-RED']));
    payload.entries.forEach((entry) => {
      expect(entry).not.toHaveProperty('barcode_or_sku');
      expect(entry.line_id).toBeTruthy();
    });
  });

  it('will not submit an empty batch, which the serializer rejects as a 400', () => {
    expect(canSubmitEntries(emptyScanBuffer())).toBe(false);
    expect(canSubmitEntries(scanMany(['SC200-RED']))).toBe(true);
  });

  it('drops a line from the batch without claiming the server un-counted it', () => {
    const buffer = clearScan(scanMany(['5051234567890', 'SC200-RED']), 'l-shirt');
    expect(buffer.tallies.map((tally) => tally.lineId)).toEqual(['l-scarf']);
  });

  it('dismisses a quarantined lookup case-insensitively', () => {
    const buffer = dismissQuarantine(scanMany(['ghost']), '  GHOST ');
    expect(buffer.quarantined).toEqual([]);
  });

  it('never mutates the buffer it was handed, so React state stays honest', () => {
    const first = scanMany(['5051234567890']);
    const second = applyScan(first, index, '5051234567890');
    expect(first.tallies[0].countedQty).toBe(1);
    expect(second.tallies[0].countedQty).toBe(2);
    expect(second).not.toBe(first);
  });
});

describe('validateCountedQtyInput', () => {
  it('rejects what the IntegerField(min_value=0) would reject', () => {
    expect(validateCountedQtyInput('7')).toEqual({ valid: true, value: 7, error: null });
    expect(validateCountedQtyInput('0')).toEqual({ valid: true, value: 0, error: null });
    expect(validateCountedQtyInput('')).toMatchObject({ valid: false, value: null });
    expect(validateCountedQtyInput('-1').error).toContain('zero or more');
    expect(validateCountedQtyInput('2.5').error).toContain('Whole numbers');
  });
});

// --- variance and cost ------------------------------------------------------

describe('buildVarianceRows', () => {
  it('renders an uncounted line as em dashes, never as zeros', () => {
    const [row] = buildVarianceRows([line({ expected_qty: 10 })]);

    expect(row.counted).toBe(false);
    expect(row.hasVariance).toBe(false);
    expect(row.tone).toBe('unknown');
    expect(row.countedText).toBe(EM_DASH);
    expect(row.varianceText).toBe(EM_DASH);
    expect(row.costImpactText).toBe(EM_DASH);
    expect(row.countedText).not.toBe('0');
    expect(row.costImpactText).not.toContain('0.00');
    // Expected is a real number and still renders as one.
    expect(row.expectedText).toBe('10');
  });

  it('separates "counted and matched" from "uncounted" in the derived flags', () => {
    const [matched] = buildVarianceRows([counted({ counted_qty: 10, expected_qty: 10 })]);
    expect(matched.counted).toBe(true);
    expect(matched.hasVariance).toBe(false);
    expect(matched.tone).toBe('neutral');
    expect(matched.varianceText).toBe('0');
    expect(matched.varianceText).not.toBe(EM_DASH);
  });

  it('signs the variance and labels the row for a human', () => {
    const [short] = buildVarianceRows([counted({ counted_qty: 8, expected_qty: 10 })]);
    expect(short.varianceText).toBe('-2');
    expect(short.tone).toBe('decrease');
    expect(short.label).toBe('Linen Shirt / S / Ivory');

    const [over] = buildVarianceRows([counted({ counted_qty: 12, expected_qty: 10 })]);
    expect(over.varianceText).toBe('+2');
    expect(over.tone).toBe('increase');
  });

  it('omits blank size and colour from the label rather than leaving separators', () => {
    const [row] = buildVarianceRows([line({ name: 'Gift Card', size: '', color: '' })]);
    expect(row.label).toBe('Gift Card');
  });

  it('flags the PER-ROW half of the zero-cost trap, so a grid can mark "units but no money"', () => {
    // The aggregate notice says how many lines were left out of the money total;
    // `costMissing` is what lets the row itself say it is one of them. Without it the
    // money column shows an em dash that reads identically to an uncounted line, and
    // the reconciliation gap has no visible owner.
    const rows = buildVarianceRows([
      counted({ line_id: 'l-free', counted_qty: 1, expected_qty: 6, unit_cost: null, cost_impact: null }),
      counted({ line_id: 'l-costed', counted_qty: 8, expected_qty: 10 }),
      line({ line_id: 'l-uncounted' }),
      counted({ line_id: 'l-matched', counted_qty: 10, expected_qty: 10, unit_cost: null, cost_impact: null })
    ]);

    // Only the line that contributes UNITS and no MONEY is flagged: an uncounted line
    // contributes neither, and a matched line has nothing to exclude.
    expect(rows.map((row) => row.costMissing)).toEqual([true, false, false, false]);
    expect(rows[0].hasVariance).toBe(true);
    expect(rows[0].varianceText).toBe('-5');
    expect(rows[0].costImpactUnits).toBeNull();
    expect(rows[0].costImpactText).toBe(EM_DASH);
    // The costed line is the control: same em-dash-free money, no flag.
    expect(rows[1].costMissing).toBe(false);
    expect(rows[1].costImpactUnits).toBe(-960000);
  });
});

describe('detectMissingCostLines — THE ZERO-COST TRAP', () => {
  it('fires when a line has a real variance and no cost on record', () => {
    // cost_price 0 is stored as unit_cost_snapshot NULL, so unit_cost and
    // cost_impact come back null while variance is a real number — and
    // net_cost_impact skips the line. The money column genuinely does not sum to
    // the total, and the only honest response is to say so.
    const report = detectMissingCostLines([
      counted({ counted_qty: 8, expected_qty: 10 }),
      counted({ line_id: 'l-free', counted_qty: 1, expected_qty: 6, unit_cost: null, cost_impact: null }),
      counted({ line_id: 'l-free-2', counted_qty: 3, expected_qty: 1, unit_cost: null, cost_impact: null })
    ]);

    expect(report.hasExclusions).toBe(true);
    expect(report.lineCount).toBe(2);
    // 5 units short plus 2 units over: the magnitude excluded, not the net.
    expect(report.units).toBe(7);
    expect(report.message).toContain('2 lines have no cost on record');
    expect(report.message).toContain('7 units');
  });

  it('stays silent when every variance carries a cost', () => {
    const report = detectMissingCostLines([counted({ counted_qty: 8, expected_qty: 10 })]);
    expect(report).toEqual({ lineCount: 0, units: 0, hasExclusions: false, message: null });
  });

  it('ignores uncounted and matched lines, which contribute nothing either way', () => {
    const report = detectMissingCostLines([
      line({ unit_cost: null }),
      counted({ line_id: 'l-match', counted_qty: 10, expected_qty: 10, unit_cost: null, cost_impact: null })
    ]);
    expect(report.hasExclusions).toBe(false);
  });

  it('reads singular for one line', () => {
    const report = detectMissingCostLines([counted({ counted_qty: 9, expected_qty: 10, unit_cost: null, cost_impact: null })]);
    expect(report.message).toBe('1 line has no cost on record (1 unit) and is not included in this figure.');
  });
});

describe('varianceTotals', () => {
  const lines = [
    counted({ line_id: 'l-1', counted_qty: 8, expected_qty: 10 }), // -2 @ 48.00 = -96.0000
    counted({ line_id: 'l-2', counted_qty: 5, expected_qty: 4, unit_cost: '12.5000' }), // +1 = +12.5000
    counted({ line_id: 'l-3', counted_qty: 3, expected_qty: 3 }), // matched
    line({ line_id: 'l-4' }), // uncounted
    counted({ line_id: 'l-5', counted_qty: 0, expected_qty: 4, unit_cost: null, cost_impact: null }) // zero-cost item
  ];

  it('reproduces the server summary field for field', () => {
    const totals = varianceTotals(lines);
    expect(totals).toMatchObject({
      total_lines: 5,
      counted_lines: 4,
      uncounted_lines: 1,
      lines_with_variance: 3,
      net_variance_units: -5,
      shrinkage_units: 6,
      overage_units: 1
    });
  });

  it('sums money as integers, so the total is reconcilable to the cent', () => {
    // -96.0000 + 12.5000, and the zero-cost line contributes nothing — which is
    // exactly what the backend's net_cost_impact does too.
    expect(varianceTotals(lines).net_cost_impact).toBe('-83.5000');
    expect(varianceTotals(lines).netCostImpactText).toContain('83.50');
  });

  it('carries the exclusion report alongside the total it does not explain', () => {
    const totals = varianceTotals(lines);
    // The units say -5 while the money only accounts for the three costed lines:
    // the gap is the zero-cost item, and the report is how the UI says so.
    expect(totals.missingCost.hasExclusions).toBe(true);
    expect(totals.missingCost.lineCount).toBe(1);
    expect(totals.missingCost.units).toBe(4);
  });

  it('leaves the money total NULL when no line carried a cost, rather than 0.0000', () => {
    const noCost = varianceTotals([counted({ counted_qty: 8, expected_qty: 10, unit_cost: null, cost_impact: null })]);
    expect(noCost.net_cost_impact).toBeNull();
    expect(noCost.netCostImpactText).toBe(EM_DASH);
    // "We have no money figure" is not "the money nets to zero".
    expect(noCost.net_cost_impact).not.toBe('0.0000');
  });

  it('reports a real 0.0000 when costed variances cancel out', () => {
    const cancelled = varianceTotals([
      counted({ line_id: 'a', counted_qty: 8, expected_qty: 10 }),
      counted({ line_id: 'b', counted_qty: 12, expected_qty: 10 })
    ]);
    expect(cancelled.net_cost_impact).toBe('0.0000');
    expect(cancelled.net_cost_impact).not.toBeNull();
  });

  it('handles an empty grid, which is a legal count', () => {
    const empty = varianceTotals([]);
    expect(empty).toMatchObject({ total_lines: 0, lines_with_variance: 0, net_variance_units: 0, net_cost_impact: null });
  });

  it('accumulates through parseMoneyUnits, so a fifth decimal is TRUNCATED and not rounded into the total', () => {
    // The 48.0000/12.5000 fixtures above are exactly representable in binary, so a
    // float accumulator passes them; this one does not. `Number('-1.23456')` summed
    // and rendered with toFixed(4) rounds to -1.2346, which is a rounding decision the
    // module deliberately refuses to make — the API emits exactly four decimals, and a
    // fifth is a shape change to notice rather than to absorb.
    const totals = varianceTotals([
      counted({ line_id: 'fifth', counted_qty: 9, expected_qty: 10, unit_cost: '1.2345', cost_impact: '-1.23456' }),
      counted({ line_id: 'plain', counted_qty: 9, expected_qty: 10, unit_cost: '0.1000', cost_impact: '-0.1000' })
    ]);

    expect(totals.net_cost_impact).toBe('-1.3345');
    // The float-and-round answer, which is off by a hundredth of a cent per line and
    // makes the total un-reconcilable against the ledger.
    expect(totals.net_cost_impact).not.toBe('-1.3346');
  });

  it('skips a cost figure it cannot parse instead of turning the whole total into NaN', () => {
    // A float accumulator reads an unparseable figure as NaN and every other line's
    // money vanishes behind it. The integer path treats it the way it treats an absent
    // cost: excluded from the total, which stays exact for the lines that had one.
    const totals = varianceTotals([
      counted({ line_id: 'good', counted_qty: 8, expected_qty: 10, unit_cost: '48.0000' }),
      counted({ line_id: 'garbage', counted_qty: 9, expected_qty: 10, unit_cost: '1.0000', cost_impact: '1,234.5000' })
    ]);

    expect(totals.net_cost_impact).toBe('-96.0000');
    expect(totals.netCostImpactText).not.toContain('NaN');
    expect(totals.net_variance_units).toBe(-3);
  });
});

describe('parseMoneyUnits and formatMoneyUnits', () => {
  it('round-trips 4dp strings through integers with no float drift', () => {
    expect(parseMoneyUnits('48.0000')).toBe(480000);
    expect(parseMoneyUnits('-0.1000')).toBe(-1000);
    expect(parseMoneyUnits('0.0000')).toBe(0);
    expect(formatMoneyUnits(480000)).toBe('48.0000');
    expect(formatMoneyUnits(-1000)).toBe('-0.1000');
    expect(formatMoneyUnits(-500)).toBe('-0.0500');
  });

  it('sums the classic float trap exactly', () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004; in ten-thousandths it is 3000.
    const units = (parseMoneyUnits('0.1000') ?? 0) + (parseMoneyUnits('0.2000') ?? 0);
    expect(units).toBe(3000);
    expect(formatMoneyUnits(units)).toBe('0.3000');
  });

  it('returns null for an absent or unparseable value so it can render as an em dash', () => {
    expect(parseMoneyUnits(null)).toBeNull();
    expect(parseMoneyUnits('')).toBeNull();
    expect(parseMoneyUnits('n/a')).toBeNull();
    expect(formatMoneyUnits(null)).toBeNull();
  });

  it('drops digits past the fourth decimal instead of guessing a rounding rule', () => {
    // This API emits exactly four; a fifth would be a shape change worth noticing.
    expect(parseMoneyUnits('1.23456')).toBe(12345);
  });

  it('truncates a fractional unit count rather than printing a second decimal point', () => {
    // Units are ten-thousandths and integral by construction, but any future caller
    // that takes a SHARE of a cost (a landed-cost split, a per-item allocation) hands
    // in a fraction. Without the truncation the fraction lands in the padded remainder
    // and the function returns '1.2345.6' — a string no money field can read.
    expect(formatMoneyUnits(12345.6)).toBe('1.2345');
    expect(formatMoneyUnits(12345.6)).not.toContain('.6');
    expect(formatMoneyUnits(-12345.6)).toBe('-1.2345');
  });
});

describe('sortVarianceRows', () => {
  const rows = buildVarianceRows([
    counted({ line_id: 'match', name: 'Matched', counted_qty: 10, expected_qty: 10 }),
    counted({ line_id: 'small', name: 'Small loss', counted_qty: 9, expected_qty: 10 }),
    line({ line_id: 'never', name: 'Never counted' }),
    counted({ line_id: 'big', name: 'Big loss', counted_qty: 1, expected_qty: 10 }),
    counted({ line_id: 'over', name: 'Overage', counted_qty: 13, expected_qty: 10 })
  ]);

  it('puts the worst shrinkage first', () => {
    const order = sortVarianceRows(rows).map((row) => row.line_id);
    expect(order.slice(0, 3)).toEqual(['big', 'small', 'over']);
  });

  it('does NOT sort an uncounted line as if its variance were zero', () => {
    // Uncounted is an open question and ranks above the matched majority; treating
    // it as 0 would file it with the lines that were checked and found fine.
    const order = sortVarianceRows(rows).map((row) => row.line_id);
    expect(order.indexOf('never')).toBeLessThan(order.indexOf('match'));
    expect(order).toEqual(['big', 'small', 'over', 'never', 'match']);
  });

  it('ranks by money when asked, with unknown cost last inside its bucket', () => {
    const mixed = buildVarianceRows([
      counted({ line_id: 'cheap', name: 'Cheap', counted_qty: 0, expected_qty: 9, unit_cost: '1.0000' }),
      counted({ line_id: 'dear', name: 'Dear', counted_qty: 9, expected_qty: 10, unit_cost: '500.0000' }),
      counted({ line_id: 'unknown', name: 'Unknown cost', counted_qty: 0, expected_qty: 20, unit_cost: null, cost_impact: null })
    ]);
    const order = sortVarianceRows(mixed, 'worst_cost').map((row) => row.line_id);

    // -500.00 beats -9.00; the 20-unit loss with no cost cannot be ranked at all,
    // so it goes last rather than being treated as harmless 0.00.
    expect(order).toEqual(['dear', 'cheap', 'unknown']);
  });

  it('does not mutate the array it was given', () => {
    const before = rows.map((row) => row.line_id);
    sortVarianceRows(rows);
    expect(rows.map((row) => row.line_id)).toEqual(before);
  });
});

// --- create, list -----------------------------------------------------------

describe('toCountCreatePayload', () => {
  const draft = (over: Partial<CountDraft> = {}): CountDraft => ({ ...emptyCountDraft(), ...over });

  it('always sends notes as a STRING, because {"notes": null} is a 400', () => {
    expect(toCountCreatePayload(draft({ notes: '  full stocktake  ' })).notes).toBe('full stocktake');
    // An empty textarea bound straight to state is exactly how null gets there.
    expect(toCountCreatePayload(draft({ notes: null as unknown as string })).notes).toBe('');
    expect(toCountCreatePayload(draft()).notes).toBe('');
  });

  it('always sends scope_filter as an OBJECT, because anything else is a 500', () => {
    expect(toCountCreatePayload(draft()).scope_filter).toEqual({});
    expect(toCountCreatePayload(draft({ scopeFilter: ['Tops'] as unknown as CountDraft['scopeFilter'] })).scope_filter).toEqual({});
    expect(toCountCreatePayload(draft({ scopeFilter: null as unknown as CountDraft['scopeFilter'] })).scope_filter).toEqual({});
  });

  it('drops a non-UUID product_id, which is a 500 on the server', () => {
    const bad = toCountCreatePayload(draft({ scope: 'filter', scopeFilter: { productId: '42' } }));
    expect(bad.scope_filter).not.toHaveProperty('product_id');

    const good = toCountCreatePayload(draft({ scope: 'filter', scopeFilter: { productId: PRODUCT_ID } }));
    expect(good.scope_filter).toEqual({ product_id: PRODUCT_ID });
  });

  it('omits location_id rather than sending "" — a malformed one is a 500', () => {
    expect(toCountCreatePayload(draft({ locationId: '' }))).not.toHaveProperty('location_id');
    expect(toCountCreatePayload(draft({ locationId: null }))).not.toHaveProperty('location_id');
    expect(toCountCreatePayload(draft({ locationId: 'default' }))).not.toHaveProperty('location_id');
    expect(toCountCreatePayload(draft({ locationId: LOCATION_ID })).location_id).toBe(LOCATION_ID);
  });

  it('omits a blank reference so the backend allocates SC-000001', () => {
    expect(toCountCreatePayload(draft({ reference: '   ' }))).not.toHaveProperty('reference');
    expect(toCountCreatePayload(draft({ reference: ' Q3-RAIL-2 ' })).reference).toBe('Q3-RAIL-2');
  });

  it('carries the filter scope’s criteria and ignores them on an "all" count', () => {
    const filtered = toCountCreatePayload(
      draft({ scope: 'filter', scopeFilter: { category: 'Tops', search: 'linen', productId: PRODUCT_ID, withStockOnly: true } })
    );
    expect(filtered.scope_filter).toEqual({ category: 'Tops', search: 'linen', product_id: PRODUCT_ID, with_stock_only: true });

    // Scope 'all' counts everything; a leftover filter in state must not travel.
    const all = toCountCreatePayload(draft({ scope: 'all', scopeFilter: { category: 'Tops' } }));
    expect(all.scope_filter).toEqual({});
  });

  it('falls back to "all" for an unrecognised scope rather than sending a 400', () => {
    expect(toCountCreatePayload(draft({ scope: 'rail' as CountDraft['scope'] })).scope).toBe('all');
  });

  it('reports a narrowed scope whose filter came out EMPTY as "all", because that is what the server will do', () => {
    // The quiet wrong answer, and the worst of the three traps here: the backend does
    // not reject {scope: 'category', scope_filter: {}} — `_scoped_items` skips a filter
    // it cannot find and stocktakes the whole location, while the count on screen says
    // it was scoped to one rail. validateCountDraft is the gate, and a caller can
    // simply not call it, so the payload itself must stop lying.
    const emptyCategory = toCountCreatePayload(draft({ scope: 'category', scopeFilter: {} }));
    expect(emptyCategory.scope).toBe('all');
    expect(emptyCategory.scope).not.toBe('category');
    expect(emptyCategory.scope_filter).toEqual({});

    // Same trap through the filter scope: nothing selected narrows nothing.
    expect(toCountCreatePayload(draft({ scope: 'filter', scopeFilter: { search: '   ' } })).scope).toBe('all');
    // A blank category with a real one selected is unaffected — this must not disarm
    // the narrowing itself.
    const real = toCountCreatePayload(draft({ scope: 'category', scopeFilter: { category: 'Tops' } }));
    expect(real).toMatchObject({ scope: 'category', scope_filter: { category: 'Tops' } });
    expect(toCountCreatePayload(draft({ scope: 'filter', scopeFilter: { withStockOnly: true } })).scope).toBe('filter');
  });

  it('survives a garbage scopeFilter on a NARROWED scope, where the key-by-key rebuild actually runs', () => {
    // The 'all' cases above short-circuit before the filter is read, so they never
    // exercise this: `null.category` throws, and a list or a string has to flatten to
    // {} rather than travel — anything but an object is a 500 server-side. The STRING is
    // the sharp one, and the reason a nullish `?? {}` is NOT good enough here:
    // `'Tops'.search` is String.prototype.search, so the search criterion becomes a
    // function and `.trim()` throws inside the builder.
    expect(
      toCountCreatePayload(draft({ scope: 'filter', scopeFilter: null as unknown as CountDraft['scopeFilter'] })).scope_filter
    ).toEqual({});
    expect(
      toCountCreatePayload(draft({ scope: 'category', scopeFilter: ['Tops'] as unknown as CountDraft['scopeFilter'] })).scope_filter
    ).toEqual({});
    expect(
      toCountCreatePayload(draft({ scope: 'filter', scopeFilter: 'Tops' as unknown as CountDraft['scopeFilter'] })).scope_filter
    ).toEqual({});
  });

  it('sends an over-long reference verbatim, because a 400 naming the field beats a silent rewrite', () => {
    // 65+ characters is a CharField(max_length=64) 400 — {"reference": ["Ensure this
    // field has no more than 64 characters."]} — which parseApiError renders as it
    // stands. Truncating would silently rename the user's stocktake and omitting would
    // silently auto-allocate SC-000001; both quietly do something else. This is the one
    // place the builder deliberately does NOT defend, and validateCountDraft is the gate.
    const long = 'x'.repeat(70);
    expect(toCountCreatePayload(draft({ reference: long })).reference).toBe(long);
    expect(toCountCreatePayload(draft({ reference: long })).reference).toHaveLength(70);
    expect(validateCountDraft(draft({ reference: long })).valid).toBe(false);
  });
});

describe('validateCountDraft', () => {
  const draft = (over: Partial<CountDraft> = {}): CountDraft => ({ ...emptyCountDraft(), ...over });

  it('accepts the default draft — a full count of the default location', () => {
    expect(validateCountDraft(draft()).valid).toBe(true);
  });

  it('refuses a category scope with no category, which would QUIETLY count everything', () => {
    // The backend does not fail here; it skips the filter. The user would get a
    // whole-location stocktake believing they scoped it to one rail.
    const result = validateCountDraft(draft({ scope: 'category' }));
    expect(result.valid).toBe(false);
    expect(result.errors.scope).toContain('every item at the location');

    expect(validateCountDraft(draft({ scope: 'category', scopeFilter: { category: 'Tops' } })).valid).toBe(true);
  });

  it('rejects a reference longer than the 64-char field', () => {
    expect(validateCountDraft(draft({ reference: 'x'.repeat(65) })).errors.reference).toContain('64');
    expect(validateCountDraft(draft({ reference: 'x'.repeat(64) })).valid).toBe(true);
  });

  it('rejects a non-UUID location or style id before the server 500s on it', () => {
    expect(validateCountDraft(draft({ locationId: 'downtown' })).errors.locationId).toBeTruthy();
    expect(validateCountDraft(draft({ locationId: LOCATION_ID })).valid).toBe(true);
    expect(validateCountDraft(draft({ scope: 'filter', scopeFilter: { productId: '42' } })).errors.productId).toBeTruthy();
  });
});

describe('toCountListParams and toCountListQueryString', () => {
  it('omits location_id entirely instead of sending a blank or an "all" sentinel', () => {
    // A malformed location_id is a 500 on the list endpoint, so '' and 'all' must
    // never reach it.
    expect(toCountListParams({ locationId: '' })).toEqual({});
    expect(toCountListParams({ locationId: 'all' })).toEqual({});
    expect(toCountListParams({ locationId: null })).toEqual({});
    expect(toCountListParams({ locationId: LOCATION_ID })).toEqual({ location_id: LOCATION_ID });
  });

  it('drops an unknown status, which the endpoint answers with a 400', () => {
    expect(toCountListParams({ statuses: ['open', 'in_progress', 'review', 'open'] })).toEqual({ status: ['open', 'review'] });
    expect(toCountListParams({ statuses: [] })).toEqual({});
  });

  it('repeats the status key, because axios’s default "status[]=" is invisible to getlist', () => {
    // The backend reads request.GET.getlist("status"); axios 1.x would serialise
    // the array as status[]=open&status[]=review and the filter would silently
    // vanish, returning every count.
    const query = toCountListQueryString({ statuses: ['open', 'review'], locationId: LOCATION_ID });
    expect(query).toBe(`status=open&status=review&location_id=${LOCATION_ID}`);
    expect(query).not.toContain('status[]');
    expect(query).not.toContain('%5B%5D');
  });

  it('produces an empty string when nothing is filtered', () => {
    expect(toCountListQueryString()).toBe('');
  });
});

// --- failure copy -----------------------------------------------------------

describe('explainApplyFailure', () => {
  it('explains that "requested 14" is the VARIANCE, not something the user typed', () => {
    const explanation = explainApplyFailure(
      err(409, {
        detail: 'Insufficient stock for Linen Shirt at Downtown: requested 14, only 9 available.',
        hint: 'Stock moved since the count was taken. Re-open a fresh count so the variance is measured against current levels.'
      })
    );

    expect(explanation.isStockMoved).toBe(true);
    expect(explanation.isIllegalTransition).toBe(false);
    expect(explanation.summary).toContain('requested 14');
    expect(explanation.clarification).toContain('size of the variance');
    // Retrying is pointless and nothing was written — both worth saying, because
    // the natural reaction to a 409 is to press the button again.
    expect(explanation.clarification).toContain('keep failing');
    expect(explanation.hint).toContain('Re-open a fresh count');
  });

  it('tells the illegal-transition 409 apart by allowed_from, not by status code', () => {
    const explanation = explainApplyFailure(
      err(409, { detail: "Cannot apply in status 'open'. Allowed from: review.", status: 'open', allowed_from: ['review'] })
    );

    expect(explanation.isIllegalTransition).toBe(true);
    expect(explanation.isStockMoved).toBe(false);
    expect(explanation.allowedFrom).toEqual(['review']);
    expect(explanation.clarification).toBe(APPLY_NEEDS_REVIEW_NOTE);
  });

  it('adds no clarification to an ordinary failure', () => {
    const explanation = explainApplyFailure(err(500, { detail: 'Server error.' }));
    expect(explanation.clarification).toBeNull();
    expect(explanation.summary).toBe('Server error.');
  });

  it('surfaces per-entry blockers from an entries 409 through the shared parser', () => {
    const explanation = explainApplyFailure(
      err(409, {
        error: '1 entr(y/ies) could not be recorded.',
        detail: [
          {
            line_id: null,
            lookup: 'ghost-barcode',
            reason: 'not_in_count',
            detail: 'No line in this count matches that id, SKU or barcode.'
          }
        ]
      })
    );
    expect(explanation.parsed.rows).toHaveLength(1);
    expect(explanation.parsed.rows[0].message).toContain('No line in this count matches');
    expect(explanation.summary).toContain('could not be recorded');
  });
});

describe('countStatusColor', () => {
  it('does not paint review the same as applied — review still needs a decision', () => {
    expect(countStatusColor('review')).not.toBe(countStatusColor('applied'));
    expect(countStatusColor('applied')).toBe('success');
  });

  it('leaves a cancelled count neutral rather than red — nothing was written', () => {
    expect(countStatusColor('cancelled')).toBe('default');
  });

  it('falls back to default for a status it does not know', () => {
    expect(countStatusColor('reopened')).toBe('default');
  });
});

describe('describeCountScope', () => {
  it('names the category a category count was scoped to', () => {
    expect(describeCountScope({ scope: 'category', scope_filter: { category: 'Dresses' } })).toBe('Category: Dresses');
  });

  // THE QUIET WRONG ANSWER. The server skips a criterion it cannot find, so this
  // count stocktook the whole location while claiming to be scoped to one rail.
  it('says a category count with no category counted everything', () => {
    const described = describeCountScope({ scope: 'category', scope_filter: {} });

    expect(described).toContain('none set');
    expect(described).toContain('every item');
  });

  it('lists the criteria a filter count actually carried', () => {
    const described = describeCountScope({
      scope: 'filter',
      scope_filter: { category: 'Tops', search: 'linen', product_id: 'b6d1f0c2-1111-2222-3333-444455556666', with_stock_only: true }
    });

    expect(described).toContain('category Tops');
    expect(described).toContain('linen');
    expect(described).toContain('one style');
    expect(described).toContain('with stock on hand');
  });

  it('says a filter count with nothing set counted everything', () => {
    expect(describeCountScope({ scope: 'filter', scope_filter: { search: '   ' } })).toContain('every item');
  });

  it('tolerates a missing or malformed scope_filter and echoes an unknown scope', () => {
    expect(describeCountScope({ scope: 'all' })).toBe('All items');
    expect(describeCountScope({ scope: 'category', scope_filter: null })).toContain('none set');
    expect(describeCountScope({ scope: 'by_rail' })).toBe('by_rail');
  });
});

describe('the copy helpers', () => {
  // Each of these exists because the behaviour it describes looks like a bug. A
  // later tidy-up that shortens them into pleasantries would take the answer out,
  // so the load-bearing clause is pinned.
  it('explains WHY expected quantities disagree with live stock, not just that they do', () => {
    expect(EXPECTED_SNAPSHOT_NOTE).toContain('snapshotted');
    expect(EXPECTED_SNAPSHOT_NOTE).toContain('phantom shrinkage');
  });

  it('says a note can be replaced but not removed', () => {
    expect(NOTE_OVERWRITE_ONLY_NOTE).toContain('not removed');
    expect(NOTE_OVERWRITE_ONLY_NOTE).toContain('non-empty');
  });

  it('names the admin-only actions rather than leaving a floor counter guessing', () => {
    ['entering quantities', 'review', 'applying', 'cancelling'].forEach((phrase) => {
      expect(NON_ADMIN_NOTICE).toContain(phrase);
    });
  });

  it('tells the caller to reload when an envelope withheld the lines', () => {
    expect(LINES_NOT_RETURNED_NOTE).toContain('Reload');
  });
});
