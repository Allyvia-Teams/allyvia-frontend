import { describe, expect, it } from 'vitest';

import { EM_DASH } from './stockFormat';
import {
  LandedPreviewLine,
  PoDraft,
  PurchaseOrderLine,
  ReceiveDraftRow,
  buildPoCreatePayload,
  buildPoPatchPayload,
  buildReceivePayload,
  canPoAction,
  describeLineProgress,
  describeOpenPos,
  describePurchasingError,
  describeVendorLink,
  formatCost,
  formatExpectedAt,
  formatMoney,
  isDuplicateSupplierName,
  isFullyReceived,
  isUuid,
  lineCostDisplay,
  lineOutstanding,
  lineReceivedPercent,
  mergeSupplierResponse,
  moneyCents,
  onOrderQuery,
  poActionsFor,
  poStatusColor,
  poStatusLabel,
  previewLandedCosts,
  purchaseOrderListQuery,
  readMoney,
  receiptProgress,
  receiveAllRows,
  receiveConflict,
  sortSuppliersByName,
  supplierListQuery,
  supplierNameError,
  validatePoDraft
} from './purchasing';

const UUID_A = '11111111-2222-3333-4444-555555555555';
const UUID_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------
describe('readMoney', () => {
  it('reads the string and the JSON-number shapes to the SAME exact value', () => {
    // Every endpoint sends money as a string except POST …/receive/, which
    // bypasses the serializer and sends numbers. One screen sees both.
    expect(readMoney('24.5000').scaled).toBe(readMoney(24.5).scaled);
    expect(formatCost('24.5000')).toBe(formatCost(24.5));
    expect(formatMoney('1234.5000')).toBe(formatMoney(1234.5));
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });

  it('treats "0.00" as a known zero, not as absent', () => {
    // "0.00" is a truthy string, and a `||` fallback on it is the classic way a
    // real zero becomes an em dash — or worse, becomes 1 somewhere downstream.
    expect(readMoney('0.00').known).toBe(true);
    expect(moneyCents('0.00')).toBe(0);
    expect(moneyCents('0.00')).not.toBeNull();
    expect(formatMoney('0.00')).toBe('$0.00');
  });

  it('treats the JSON NUMBER 0 as a known zero too, which a falsy check would not', () => {
    // POST …/receive/ sends money as numbers, and a zero-value line takes a zero
    // share of the pool — so `landed_unit_cost: 0.0` is a real landed cost that
    // arrived, not a missing one. `if (!value)` catches 0 as well as '' and null,
    // which is the null-vs-zero conflation this whole reader exists to prevent.
    expect(readMoney(0).known).toBe(true);
    expect(moneyCents(0)).toBe(0);
    expect(moneyCents(0)).not.toBeNull();
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(0)).not.toBe(EM_DASH);
    expect(formatCost(0)).toBe('$0.0000');
  });

  it('reports unknown for null, blank and garbage so display can em-dash it', () => {
    expect(readMoney(null).cents).toBeNull();
    expect(readMoney(undefined).cents).toBeNull();
    expect(readMoney('').cents).toBeNull();
    expect(readMoney('not money').cents).toBeNull();
    expect(readMoney(Number.NaN).cents).toBeNull();
    expect(readMoney(Number.POSITIVE_INFINITY).cents).toBeNull();
  });

  it('rounds halves AWAY FROM ZERO, matching the backend rather than Math.round', () => {
    // Python's ROUND_HALF_UP is away-from-zero. Math.round(-0.5) is 0, which
    // would put the client and the server a cent apart on any credit.
    expect(moneyCents('0.005')).toBe(1);
    expect(moneyCents('-0.005')).toBe(-1);
    expect(moneyCents('-0.005')).not.toBe(0);
  });
});

describe('formatMoney and formatCost', () => {
  it('renders an unknown amount as an em dash, never as 0.00', () => {
    expect(formatMoney(null)).toBe(EM_DASH);
    expect(formatCost(null)).toBe(EM_DASH);
    expect(formatMoney(null)).not.toBe('$0.00');
  });

  it('keeps all four decimals of a landed cost, which 2dp rounding would destroy', () => {
    // A buyer reconciling against a freight invoice is looking at exactly these
    // digits; stockFormat.formatUnitCost would show $22.35 and lose the argument.
    expect(formatCost('22.3456')).toBe('$22.3456');
    expect(formatCost('22.3456')).not.toBe('$22.35');
    expect(formatMoney('22.3456')).toBe('$22.35');
  });

  it('groups thousands and puts the sign outside the symbol', () => {
    expect(formatMoney('1234567.89')).toBe('$1,234,567.89');
    expect(formatMoney(-5)).toBe('-$5.00');
    expect(formatMoney(-5)).not.toBe('$-5.00');
  });
});

// ---------------------------------------------------------------------------
// Status vocabulary
// ---------------------------------------------------------------------------
describe('poStatusLabel and poStatusColor', () => {
  it('reads as English, and de-slugs an unknown status instead of hiding it', () => {
    expect(poStatusLabel('partially_received')).toBe('Partially received');
    expect(poStatusLabel('cancelled')).toBe('Cancelled');
    expect(poStatusLabel('shipped_direct')).toBe('Shipped direct');
    expect(poStatusLabel('')).toBe(EM_DASH);
  });

  it('does not make a part-delivered order look as settled as a complete one', () => {
    expect(poStatusColor('partially_received')).toBe('warning');
    expect(poStatusColor('received')).toBe('success');
    expect(poStatusColor('partially_received')).not.toBe(poStatusColor('received'));
    expect(poStatusColor('anything_new')).toBe('default');
  });
});

describe('poActionsFor', () => {
  it('offers edit and submit on a draft only, because the supplier has it after that', () => {
    expect(poActionsFor('draft')).toEqual({ edit: true, submit: true, cancel: true, receive: false });
    expect(poActionsFor('submitted').edit).toBe(false);
    expect(poActionsFor('submitted').submit).toBe(false);
  });

  it('withholds cancel once anything has been received, where the 409 is unavoidable', () => {
    // partially_received is not in the endpoint's allowed_from list, and the
    // friendlier "already received N units" message cannot be reached over HTTP —
    // so there is no copy to soften the failure with. Hide the button.
    expect(canPoAction('partially_received', 'cancel')).toBe(false);
    expect(canPoAction('partially_received', 'receive')).toBe(true);
    expect(canPoAction('submitted', 'cancel')).toBe(true);
  });

  it('offers receive only where the endpoint accepts it', () => {
    expect(canPoAction('draft', 'receive')).toBe(false);
    expect(canPoAction('submitted', 'receive')).toBe(true);
    expect(canPoAction('received', 'receive')).toBe(false);
    expect(canPoAction('cancelled', 'receive')).toBe(false);
  });

  it('offers nothing at all on a terminal status', () => {
    expect(poActionsFor('received')).toEqual({ edit: false, submit: false, cancel: false, receive: false });
    expect(poActionsFor('cancelled')).toEqual({ edit: false, submit: false, cancel: false, receive: false });
  });
});

// ---------------------------------------------------------------------------
// Which cost figure is real
// ---------------------------------------------------------------------------
describe('lineCostDisplay', () => {
  it('labels the pre-receipt figure a PROJECTION, because feeding it to a margin report is fiction', () => {
    const display = lineCostDisplay({ landed_unit_cost: null, projected_landed_unit_cost: '24.7500' });
    expect(display.isProjection).toBe(true);
    expect(display.label).toBe('Projected landed unit cost');
    expect(display.text).toBe('$24.7500');
  });

  it('switches to the actual the moment one exists', () => {
    const display = lineCostDisplay({ landed_unit_cost: '24.8100', projected_landed_unit_cost: '24.7500' });
    expect(display.isProjection).toBe(false);
    expect(display.text).toBe('$24.8100');
  });

  it('reads the receive endpoint’s JSON-number landed cost as an actual, not as absent', () => {
    // The response that CREATES the actual is the one that sends it as a number.
    const display = lineCostDisplay({ landed_unit_cost: 24.81, projected_landed_unit_cost: '24.7500' });
    expect(display.isProjection).toBe(false);
    expect(display.text).toBe('$24.8100');
  });

  it('calls a landed cost of exactly 0 an ACTUAL, not a projection', () => {
    // A free-sample line takes a zero share of the pool, so the receive endpoint
    // answers with the JSON number 0. Reading that as absent falls through to the
    // projection and labels a figure the warehouse already booked as a forecast —
    // which is how a projection ends up in a margin report as an actual.
    const display = lineCostDisplay({ landed_unit_cost: 0, projected_landed_unit_cost: '0.0000' });
    expect(display.isProjection).toBe(false);
    expect(display.label).toBe('Landed unit cost');
    expect(display.label).not.toBe('Projected landed unit cost');
    expect(display.text).toBe('$0.0000');
  });

  it('em-dashes when neither figure exists rather than showing a confident zero', () => {
    const display = lineCostDisplay({ landed_unit_cost: null, projected_landed_unit_cost: null });
    expect(display.text).toBe(EM_DASH);
    expect(display.isProjection).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Receipt progress
// ---------------------------------------------------------------------------
describe('receipt progress', () => {
  const lines = [
    { qty_ordered: 10, qty_received: 3 },
    { qty_ordered: 5, qty_received: 5 }
  ];

  it('reports what is still outstanding per line and across the order', () => {
    expect(lineOutstanding(lines[0])).toBe(7);
    expect(lineOutstanding(lines[1])).toBe(0);

    const progress = receiptProgress(lines);
    expect(progress).toMatchObject({ ordered: 15, received: 8, outstanding: 7, anyReceived: true, fullyReceived: false });
  });

  it('never reports a negative outstanding, even if the wire over-received', () => {
    // Nothing should produce this, but "-2 outstanding" on a table is worse than
    // a clamp, and the backend's own qty_outstanding clamps the same way.
    expect(lineOutstanding({ qty_ordered: 5, qty_received: 7 })).toBe(0);
  });

  it('leaves the percentage UNDEFINED when nothing was ordered, rather than NaN or 100', () => {
    expect(lineReceivedPercent({ qty_ordered: 0, qty_received: 0 })).toBeNull();
    expect(receiptProgress([]).percent).toBeNull();
    expect(receiptProgress([]).percent).not.toBeNaN();
    expect(receiptProgress([]).percent).not.toBe(100);
  });

  it('does not call an order with no lines "fully received"', () => {
    // It has nothing to complete; calling it complete would mark an empty draft
    // as done and hide it from the open-orders list.
    expect(isFullyReceived([])).toBe(false);
    expect(isFullyReceived([{ qty_ordered: 4, qty_received: 4 }])).toBe(true);
  });

  it('describes a line in words for a table cell', () => {
    expect(describeLineProgress(lines[0])).toBe('3 of 10 received, 7 outstanding');
    expect(describeLineProgress(lines[1])).toBe('5 of 5 received');
  });
});

// ---------------------------------------------------------------------------
// Landed-cost preview
// ---------------------------------------------------------------------------
describe('previewLandedCosts', () => {
  const line = (key: string, qtyOrdered: number, unitCost: string): LandedPreviewLine => ({ key, qtyOrdered, unitCost });
  const noFees = { shipping: '0.00', duty: '0.00', other_fees: '0.00' };
  const sumCents = (shares: Array<{ shareCents: number }>) => shares.reduce((total, share) => total + share.shareCents, 0);

  it('weights the pool by ordered VALUE, so freight does not split per unit', () => {
    // $400 freight across 10 coats at $200 and 10 pairs of socks at $5. Per-unit
    // would put $20 on every item and make the socks cost $25 — five times their
    // price — while flattering the coats.
    const preview = previewLandedCosts([line('coats', 10, '200.0000'), line('socks', 10, '5.0000')], {
      shipping: '400.00',
      duty: '0.00',
      other_fees: '0.00'
    });

    expect(preview.shareByKey.get('coats')?.projectedLandedUnitCost).toBe('239.0240');
    expect(preview.shareByKey.get('socks')?.projectedLandedUnitCost).toBe('5.9760');
    expect(preview.shareByKey.get('socks')?.projectedLandedUnitCost).not.toBe('25.0000');
    expect(sumCents(preview.shares)).toBe(40000);
  });

  it('gives the REMAINDER cent to the largest line by value, so the shares sum to the pool exactly', () => {
    // $1.00 over five $1 lines and one $2 line: 14+14+14+14+14+29 = 99. The
    // missing cent is not dropped — dropping it understates cost of goods by a
    // cent per receipt, forever.
    const preview = previewLandedCosts(
      [
        line('a', 1, '1.0000'),
        line('b', 1, '1.0000'),
        line('c', 1, '1.0000'),
        line('d', 1, '1.0000'),
        line('e', 1, '1.0000'),
        line('big', 1, '2.0000')
      ],
      { shipping: '1.00', duty: '0.00', other_fees: '0.00' }
    );

    expect(sumCents(preview.shares)).toBe(100);
    expect(sumCents(preview.shares)).not.toBe(99);
    expect(preview.shareByKey.get('big')?.shareCents).toBe(30);
    expect(preview.shareByKey.get('big')?.carriesRemainder).toBe(true);
    expect(preview.shareByKey.get('a')?.carriesRemainder).toBe(false);
  });

  it('takes the EXCESS cent back off the largest line when rounding overshoots', () => {
    // Six equal lines and $1.00: each rounds up to 17, summing to 102. The
    // remainder is negative here, and a preview that only ever added would
    // present a pool two cents larger than the one being invoiced.
    const preview = previewLandedCosts(
      [
        line('a', 1, '10.0000'),
        line('b', 1, '10.0000'),
        line('c', 1, '10.0000'),
        line('d', 1, '10.0000'),
        line('e', 1, '10.0000'),
        line('f', 1, '10.0000')
      ],
      { shipping: '1.00', duty: '0.00', other_fees: '0.00' }
    );

    expect(sumCents(preview.shares)).toBe(100);
    expect(sumCents(preview.shares)).not.toBe(102);
    // All values tie, so the backend's tie-break — the greatest id string — picks 'f'.
    expect(preview.shareByKey.get('f')?.shareCents).toBe(15);
    expect(preview.shareByKey.get('a')?.shareCents).toBe(17);
  });

  it('sums the three fee fields in exact cents, not in floats', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in IEEE754. A pool that has to reconcile
    // against three invoice lines cannot be assembled that way.
    const preview = previewLandedCosts([line('a', 1, '10.0000')], { shipping: '0.10', duty: '0.20', other_fees: '0.00' });
    expect(preview.poolCents).toBe(30);
    expect(preview.pool).toBe('0.30');

    // 0.1 + 0.2 is the FORGIVING case: it overshoots, so even a float pool that
    // truncates lands on 30. These are the figures that expose one — Number('0.29')
    // is 0.28999999999999998, and ×100 truncated is 28. A freight charge of 29p
    // reported as 28p is a cent the buyer cannot find in either total.
    const pennies = previewLandedCosts([line('a', 1, '10.0000')], { shipping: '0.29', duty: '0.00', other_fees: '0.00' });
    expect(pennies.poolCents).toBe(29);
    expect(pennies.poolCents).not.toBe(28);
    expect(pennies.pool).toBe('0.29');
    expect(pennies.pool).not.toBe('0.28');

    // And across two fields, where the float sum lands BELOW the exact one
    // (0.58 + 0.29 = 0.8699999999999999).
    const twoFees = previewLandedCosts([line('a', 1, '10.0000')], { shipping: '0.58', duty: '0.29', other_fees: '0.00' });
    expect(twoFees.poolCents).toBe(87);
    expect(twoFees.poolCents).not.toBe(86);
    expect(twoFees.pool).toBe('0.87');
  });

  it('reports goods and total value at 4dp, mirroring the derived fields', () => {
    const preview = previewLandedCosts([line('coats', 10, '200.0000'), line('socks', 10, '5.0000')], {
      shipping: '400.00',
      duty: '0.00',
      other_fees: '0.00'
    });
    expect(preview.goodsValue).toBe('2050.0000');
    expect(preview.totalValue).toBe('2450.0000');
  });

  it('survives an empty line list, which is what a brand-new PO form renders first', () => {
    // The fees fields exist before any line does, so the preview runs against
    // zero rows on every new order. A reduce with no seed would throw here.
    const preview = previewLandedCosts([], { shipping: '400.00', duty: '0.00', other_fees: '0.00' });
    expect(preview.shares).toEqual([]);
    expect(preview.goodsValue).toBe('0.0000');
    expect(preview.totalValue).toBe('400.0000');
    expect(preview.poolCents).toBe(40000);
  });

  it('gives every line zero on a free-sample order instead of dividing by zero', () => {
    const preview = previewLandedCosts([line('sample', 5, '0.0000')], { shipping: '50.00', duty: '0.00', other_fees: '0.00' });
    expect(preview.shares[0].shareCents).toBe(0);
    expect(preview.shares[0].projectedLandedUnitCost).toBe('0.0000');
    expect(preview.shares[0].projectedLandedUnitCost).not.toContain('NaN');
  });

  it('leaves the unit cost alone when there is no pool to spread', () => {
    const preview = previewLandedCosts([line('a', 3, '12.3456')], noFees);
    expect(preview.shares[0].projectedLandedUnitCost).toBe('12.3456');
    expect(preview.shares[0].carriesRemainder).toBe(false);
    expect(preview.pool).toBe('0.00');
  });

  it('does not divide by a zero quantity on a half-typed row', () => {
    const preview = previewLandedCosts([line('typing', 0, '10.0000'), line('real', 5, '10.0000')], {
      shipping: '10.00',
      duty: '0.00',
      other_fees: '0.00'
    });
    expect(preview.shareByKey.get('typing')?.projectedLandedUnitCost).toBe('10.0000');
    expect(sumCents(preview.shares)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Receiving
// ---------------------------------------------------------------------------
describe('buildReceivePayload', () => {
  type Line = Pick<PurchaseOrderLine, 'id' | 'sku'> & { qty_ordered: number; qty_received: number };
  const lines: Line[] = [
    { id: 'L1', sku: 'LS100-IVORY-S', qty_ordered: 10, qty_received: 3 },
    { id: 'L2', sku: 'LS100-IVORY-M', qty_ordered: 5, qty_received: 5 }
  ];
  const rows = (...entries: Array<[string, string]>): ReceiveDraftRow[] => entries.map(([lineId, qty]) => ({ lineId, qty }));

  it('sends the INCREMENT to receive now, not the new running total', () => {
    // qty accumulates onto qty_received server-side: 3 + 2 = 5. Sending 5 would
    // book 8 of 10 and lose three units into the ledger.
    const result = buildReceivePayload(rows(['L1', '2']), lines);
    expect(result.valid).toBe(true);
    expect(result.payload).toEqual({ lines: [{ line_id: 'L1', qty: 2 }] });
    expect(result.payload?.lines[0].qty).not.toBe(5);
  });

  it('AGGREGATES two rows for the same line instead of sending the id twice', () => {
    // Two cartons of one SKU is a normal way to key a delivery, and a repeated
    // line_id is a duplicate_line 409 that rejects the entire receipt.
    const result = buildReceivePayload(rows(['L1', '2'], ['L1', '3']), lines);
    expect(result.payload?.lines).toEqual([{ line_id: 'L1', qty: 5 }]);
    expect(result.payload?.lines).not.toHaveLength(2);
  });

  it('validates the AGGREGATED quantity against outstanding, not each row alone', () => {
    // 4 and 5 are each under the 7 outstanding; together they are not.
    const result = buildReceivePayload(rows(['L1', '4'], ['L1', '5']), lines);
    expect(result.valid).toBe(false);
    expect(result.payload).toBeNull();
    expect(result.lineErrors.L1).toContain('7');
  });

  it('caps at outstanding client-side, naming the number, rather than provoking the 409', () => {
    // The over_receipt 409 writes NOTHING — one typo on line 38 of a delivery
    // discards the other 37 lines the user just keyed.
    const result = buildReceivePayload(rows(['L1', '8']), lines);
    expect(result.valid).toBe(false);
    expect(result.lineErrors.L1).toBe('Only 7 of 10 remain outstanding on this line.');
  });

  it('drops blank rows silently, because most rows on a receive form stay blank', () => {
    const result = buildReceivePayload(rows(['L1', ''], ['L2', '   ']), lines);
    expect(result.payload).toBeNull();
    expect(result.lineErrors).toEqual({});
    expect(result.error).toContain('at least one line');
  });

  it('refuses an empty submission in words instead of letting DRF answer allow_empty=False', () => {
    // The server's version of this is "lines: This list may not be empty.",
    // which tells a buyer nothing about what to do next.
    const result = buildReceivePayload([], lines);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Enter a quantity on at least one line — there is nothing to receive yet.');
  });

  it('treats a typed 0 as "not receiving this one", since 0 is INVALID at this endpoint', () => {
    // Unlike a stock adjustment, where 0 is merely pointless, qty 0 here is a
    // non_positive_quantity blocker that fails the whole receipt.
    const result = buildReceivePayload(rows(['L1', '0']), lines);
    expect(result.payload).toBeNull();
    expect(result.lineErrors.L1).toBeUndefined();
    expect(result.error).toContain('at least one line');
  });

  it('rejects a fractional or negative quantity at the field', () => {
    expect(buildReceivePayload(rows(['L1', '2.5']), lines).lineErrors.L1).toBe('Whole numbers only');
    expect(buildReceivePayload(rows(['L1', '-2']), lines).lineErrors.L1).toContain('cannot be negative');
  });

  it('flags a line that is not on this order, which is what a stale line uuid looks like', () => {
    // PATCHing lines rebuilds them all with new uuids, so a form left open across
    // an edit will hold ids the server has never heard of.
    const result = buildReceivePayload(rows(['L9', '1']), lines);
    expect(result.lineErrors.L9).toBe('This line is not on this purchase order.');
  });

  it('flags a line that is already complete rather than sending a guaranteed rejection', () => {
    const result = buildReceivePayload(rows(['L2', '1']), lines);
    expect(result.lineErrors.L2).toBe('This line is already fully received.');
    expect(result.payload).toBeNull();
  });

  it('sends nothing at all when one line is wrong, because the endpoint is all-or-nothing', () => {
    // Submitting the valid rows anyway would be a round trip that writes nothing
    // while looking like progress.
    const result = buildReceivePayload(rows(['L1', '2'], ['L2', '1']), lines);
    expect(result.valid).toBe(false);
    expect(result.payload).toBeNull();
    expect(result.error).toBe('Fix the highlighted lines before receiving.');
  });

  it('exposes the submitted ids in payload order, which a 409 blocker must be matched against by line_id', () => {
    // Blank rows are dropped and duplicates are folded, so this list is what the
    // server saw. It is NOT index-aligned with a 409's detail[] — see receiveConflict.
    const withGaps: Line[] = [...lines, { id: 'L3', sku: 'LS100-SLATE-S', qty_ordered: 4, qty_received: 0 }];
    const result = buildReceivePayload(rows(['L1', ''], ['L3', '1'], ['L1', '2']), withGaps);
    expect(result.submittedLineIds).toEqual(['L3', 'L1']);
    expect(result.payload?.lines.map((entry) => entry.line_id)).toEqual(['L3', 'L1']);
  });
});

describe('receiveConflict', () => {
  // Two lines sent, only the second rejected: _validate_receipts appends a blocker
  // for the failures alone, so detail[] has ONE element and its index 0 refers to
  // the blocker, not to the row. The client sent L3 first.
  const conflict = {
    response: {
      status: 409,
      data: {
        error: '1 line(s) cannot be received as requested.',
        detail: [{ line_id: 'L1', sku: 'LS100-IVORY-S', reason: 'over_receipt', detail: 'Only 7 of 10 remain outstanding on this line.' }]
      }
    }
  };

  it('paints the line the server NAMED, not the line sitting at the blocker’s index', () => {
    // Reading submittedLineIds[blocker.index] blames L3, which was fine, and leaves
    // the over-received quantity on L1 unmarked. The receipt wrote nothing, so the
    // user would retry the identical mistake.
    const result = receiveConflict(conflict, ['L3', 'L1']);
    expect(result.lineErrors).toEqual({ L1: 'Only 7 of 10 remain outstanding on this line.' });
    expect(result.lineErrors.L3).toBeUndefined();
    expect(result.stale).toBe(false);
    expect(result.summary).toContain('1 line(s) cannot be received');
  });

  it('does not attribute a blocker to a line this submission never sent', () => {
    // A blocker for a line we did not send means our copy of the PO predates
    // somebody else's edit: there is no row to paint, and retrying the same body
    // cannot help until the client refetches.
    const result = receiveConflict(conflict, ['L3']);
    expect(result.lineErrors).toEqual({});
    expect(result.stale).toBe(true);
    expect(result.unattributed).toEqual(['Only 7 of 10 remain outstanding on this line.']);
  });

  it('surfaces a blocker the server could not tie to a line at all', () => {
    // An unmatched lookup carries no line_id. Dropping it shows a failed receipt
    // with every row looking clean.
    const result = receiveConflict(
      {
        response: {
          status: 409,
          data: {
            error: '1 line(s) cannot be received as requested.',
            detail: [{ lookup: 'LS100-SLATE-XS', reason: 'unknown_line', detail: 'No line matches LS100-SLATE-XS.' }]
          }
        }
      },
      ['L1']
    );
    expect(result.lineErrors).toEqual({});
    expect(result.unattributed).toEqual(['No line matches LS100-SLATE-XS.']);
    expect(result.stale).toBe(false);
  });

  it('still says something when the failure was not a blocker body at all', () => {
    const result = receiveConflict(new Error('network'), ['L1']);
    expect(result.summary).toBeTruthy();
    expect(result.lineErrors).toEqual({});
    expect(result.unattributed).toEqual([]);
  });
});

describe('receiveAllRows', () => {
  it('prefills the outstanding balance and leaves finished lines blank', () => {
    const prefilled = receiveAllRows([
      { id: 'L1', qty_ordered: 10, qty_received: 3 },
      { id: 'L2', qty_ordered: 5, qty_received: 5 }
    ]);
    expect(prefilled).toEqual([
      { lineId: 'L1', qty: '7' },
      { lineId: 'L2', qty: '' }
    ]);
    // Not '10' — that would over-receive by the three already booked.
    expect(prefilled[0].qty).not.toBe('10');
  });
});

// ---------------------------------------------------------------------------
// Create / patch payloads
// ---------------------------------------------------------------------------
describe('formatExpectedAt', () => {
  /**
   * Run `body` with the timezone PINNED, because the assertions about local-vs-UTC
   * days are vacuous in the one timezone CI actually uses: under TZ=UTC a Date's
   * local day and its toISOString() day are the same day by definition, so the
   * naive `toISOString().slice(0, 10)` implementation passes there. Node applies a
   * runtime change to process.env.TZ, so the test supplies the timezone instead of
   * inheriting whatever the machine has.
   */
  const inTimeZone = <T>(zone: string, body: () => T): T => {
    const previous = process.env.TZ;
    process.env.TZ = zone;
    try {
      return body();
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  };

  it('uses the LOCAL calendar day, not a UTC slice that can shift the date', () => {
    // expected_at is a DateField. toISOString() on a late-evening pick west of
    // UTC lands on tomorrow; on an early-morning pick east of it, yesterday.
    // Both of these hold in every timezone.
    expect(formatExpectedAt(new Date(2026, 7, 6, 23, 30))).toBe('2026-08-06');
    expect(formatExpectedAt(new Date(2026, 7, 6, 0, 30))).toBe('2026-08-06');
  });

  it('keeps the picked day in a timezone where the UTC instant falls on another date', () => {
    // 11.30pm in New York is already the 7th in UTC; 12.30am in Tokyo is still the
    // 5th. An expected delivery date silently off by one is the bug nobody reports
    // and everybody works around, so both directions are pinned here rather than
    // left to whatever timezone the test runner happens to sit in.
    const newYorkEvening = inTimeZone('America/New_York', () => formatExpectedAt(new Date(2026, 7, 6, 23, 30)));
    expect(newYorkEvening).toBe('2026-08-06');
    expect(newYorkEvening).not.toBe('2026-08-07');

    const tokyoMorning = inTimeZone('Asia/Tokyo', () => formatExpectedAt(new Date(2026, 7, 6, 0, 30)));
    expect(tokyoMorning).toBe('2026-08-06');
    expect(tokyoMorning).not.toBe('2026-08-05');
  });

  it('trims a datetime string to its date part, which the DateField would 400 on', () => {
    expect(formatExpectedAt('2026-08-06T00:00:00Z')).toBe('2026-08-06');
    expect(formatExpectedAt('2026-08-06')).toBe('2026-08-06');
  });

  it('refuses a date that matches the FORMAT but is not a day on the calendar', () => {
    // date.fromisoformat('2026-02-30') raises, so the DateField answers with the
    // same "use YYYY-MM-DD" 400 it gives 'soon' — next to a field that already
    // holds a YYYY-MM-DD value, which reads as the server being broken.
    expect(formatExpectedAt('2026-02-30')).toBeNull();
    expect(formatExpectedAt('2026-02-30')).not.toBe('2026-02-30');
    expect(formatExpectedAt('2026-13-01')).toBeNull();
    expect(formatExpectedAt('2026-00-10')).toBeNull();
    expect(formatExpectedAt('2026-04-31')).toBeNull();
    expect(formatExpectedAt('2026-08-00')).toBeNull();
  });

  it('accepts 29 February in a leap year and refuses it in a common one', () => {
    // A guard that just capped the day at 30 would take the wrong one of these,
    // and a Feb-29 delivery date is entirely ordinary every fourth year.
    expect(formatExpectedAt('2028-02-29')).toBe('2028-02-29');
    expect(formatExpectedAt('2026-02-29')).toBeNull();
    // 2100 is divisible by 4 and is NOT a leap year.
    expect(formatExpectedAt('2100-02-29')).toBeNull();
    expect(formatExpectedAt('2000-02-29')).toBe('2000-02-29');
  });

  it('returns null for blank and unparseable input so the field can be cleared', () => {
    expect(formatExpectedAt(null)).toBeNull();
    expect(formatExpectedAt('')).toBeNull();
    expect(formatExpectedAt('next tuesday')).toBeNull();
    expect(formatExpectedAt(new Date('nope'))).toBeNull();
  });
});

describe('buildPoCreatePayload and buildPoPatchPayload', () => {
  // Spread, not `?? fallback`: a test that passes expectedAt: null must actually
  // see null. Coalescing it away is the same mistake this module exists to stop.
  const draft = (over: Partial<PoDraft> = {}): PoDraft => ({
    supplierId: UUID_A,
    destinationId: null,
    expectedAt: '2026-08-06',
    shipping: '',
    duty: '12.5',
    otherFees: '0',
    notes: '  ship to the back door  ',
    lines: [{ key: 'r1', inventoryItemId: 42, qtyOrdered: '10', unitCost: '24.5' }],
    ...over
  });

  it('normalises fees and costs to fixed-scale STRINGS so no float touches money', () => {
    const payload = buildPoCreatePayload(draft());
    expect(payload.shipping).toBe('0.00');
    expect(payload.duty).toBe('12.50');
    expect(payload.other_fees).toBe('0.00');
    expect(payload.lines[0].unit_cost).toBe('24.5000');
    expect(typeof payload.lines[0].unit_cost).toBe('string');
    expect(payload.notes).toBe('ship to the back door');
    expect(payload.lines[0]).toMatchObject({ inventory_item_id: 42, qty_ordered: 10 });
  });

  it('sends destination_id: null on CREATE but OMITS it on PATCH — the same value 400s there', () => {
    // POST's serializer allows null and the view falls back to the default
    // location. PATCH's does not: {"destination_id":["This field may not be
    // null."]} on a field the user never touched.
    const create = buildPoCreatePayload(draft({ destinationId: null }));
    expect(create.destination_id).toBeNull();

    const patch = buildPoPatchPayload(draft({ destinationId: null }), { linesChanged: false });
    expect(patch).not.toHaveProperty('destination_id');

    const patchWithDestination = buildPoPatchPayload(draft({ destinationId: UUID_B }), { linesChanged: false });
    expect(patchWithDestination).toHaveProperty('destination_id', UUID_B);
  });

  it('OMITS lines on PATCH unless the grid changed, because sending them rebuilds every uuid', () => {
    // "lines" is a wholesale replacement: existing rows are deleted and recreated
    // with fresh ids. A save that only edited the notes must not reissue them, or
    // an open receive dialog holding the old ids gets unknown_line for all of them.
    const untouched = buildPoPatchPayload(draft(), { linesChanged: false });
    expect(untouched).not.toHaveProperty('lines');

    const edited = buildPoPatchPayload(draft(), { linesChanged: true });
    expect(edited).toHaveProperty('lines');
    expect(edited.lines).toHaveLength(1);
  });

  it('omits po_number entirely when blank, letting the server allocate the next one', () => {
    expect(buildPoCreatePayload(draft())).not.toHaveProperty('po_number');
    expect(buildPoCreatePayload(draft({ poNumber: '  PO-000042 ' }))).toHaveProperty('po_number', 'PO-000042');
  });

  it('sends expected_at as a plain date, or null to clear it', () => {
    expect(buildPoCreatePayload(draft({ expectedAt: new Date(2026, 7, 6, 22, 0) })).expected_at).toBe('2026-08-06');
    expect(buildPoCreatePayload(draft({ expectedAt: null })).expected_at).toBeNull();
  });
});

describe('validatePoDraft', () => {
  const draft = (over: Partial<PoDraft> = {}): PoDraft => ({
    supplierId: UUID_A,
    destinationId: null,
    expectedAt: '2026-08-06',
    shipping: '120.00',
    duty: '',
    otherFees: '',
    notes: '',
    lines: [{ key: 'r1', inventoryItemId: 42, qtyOrdered: '10', unitCost: '24.50' }],
    ...over
  });

  it('accepts a well-formed draft', () => {
    expect(validatePoDraft(draft()).valid).toBe(true);
  });

  it('requires a supplier as a UUID, since a bad one is a 500 on the list endpoint', () => {
    expect(validatePoDraft(draft({ supplierId: '' })).errors.supplierId).toBeTruthy();
    expect(validatePoDraft(draft({ supplierId: '42' })).errors.supplierId).toBeTruthy();
  });

  it('refuses an empty order, which has nothing to submit', () => {
    const result = validatePoDraft(draft({ lines: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.lines).toContain('at least one line');
  });

  it('requires a variant and a quantity of at least 1 on every line', () => {
    expect(validatePoDraft(draft({ lines: [{ key: 'r1', inventoryItemId: null, qtyOrdered: '10', unitCost: '1' }] })).lineErrors.r1).toBe(
      'Choose a variant'
    );
    expect(validatePoDraft(draft({ lines: [{ key: 'r1', inventoryItemId: 7, qtyOrdered: '0', unitCost: '1' }] })).lineErrors.r1).toBe(
      'Order at least 1'
    );
    expect(validatePoDraft(draft({ lines: [{ key: 'r1', inventoryItemId: 7, qtyOrdered: '2.5', unitCost: '1' }] })).lineErrors.r1).toBe(
      'Order at least 1'
    );
  });

  it('treats a blank unit cost as zero but rejects a negative or unparseable one', () => {
    expect(validatePoDraft(draft({ lines: [{ key: 'r1', inventoryItemId: 7, qtyOrdered: '2', unitCost: '' }] })).valid).toBe(true);
    expect(
      validatePoDraft(draft({ lines: [{ key: 'r1', inventoryItemId: 7, qtyOrdered: '2', unitCost: 'abc' }] })).lineErrors.r1
    ).toContain('cost');
    expect(validatePoDraft(draft({ lines: [{ key: 'r1', inventoryItemId: 7, qtyOrdered: '2', unitCost: '-1' }] })).lineErrors.r1).toContain(
      'negative'
    );
  });

  it('accepts blank fees as zero — most orders have no duty — but not junk or negatives', () => {
    expect(validatePoDraft(draft({ shipping: '' })).valid).toBe(true);
    expect(validatePoDraft(draft({ duty: 'twelve' })).errors.duty).toBeTruthy();
    expect(validatePoDraft(draft({ otherFees: '-5' })).errors.otherFees).toContain('negative');
  });

  it('rejects a date it could not send', () => {
    expect(validatePoDraft(draft({ expectedAt: 'soon' })).errors.expectedAt).toBeTruthy();
    expect(validatePoDraft(draft({ expectedAt: null })).valid).toBe(true);
  });

  it('rejects a well-FORMED date that does not exist, which the DateField 400s on', () => {
    // '2026-02-30' passes a YYYY-MM-DD shape check and is still not a day. Left
    // valid, the payload builders send it and the save dies on a field the user
    // filled in correctly-looking.
    const result = validatePoDraft(draft({ expectedAt: '2026-02-30' }));
    expect(result.valid).toBe(false);
    expect(result.errors.expectedAt).toBeTruthy();
    expect(buildPoCreatePayload(draft({ expectedAt: '2026-02-30' })).expected_at).not.toBe('2026-02-30');
  });

  it('requires the destination to be a UUID, since a slug 400s the save', () => {
    // A location picker holding a slug ('main-store') is how this happens; the
    // UUIDField answers {"destination_id":["Must be a valid UUID."]} and on PATCH
    // that costs the whole edit.
    const result = validatePoDraft(draft({ destinationId: 'main-store' }));
    expect(result.valid).toBe(false);
    expect(result.errors.destinationId).toBe('Choose a destination');
    // null is the legitimate "use the company default", not a missing answer.
    expect(validatePoDraft(draft({ destinationId: null })).errors.destinationId).toBeUndefined();
    expect(validatePoDraft(draft({ destinationId: UUID_B })).valid).toBe(true);
  });

  it('refuses the same variant on two lines instead of letting the save 400', () => {
    // _resolve_lines rejects a repeated inventory_item_id ("This item appears more
    // than once…") and the unique constraint backs it up. On PATCH `lines` is a
    // wholesale replacement, so that 400 discards the entire grid the buyer keyed.
    const result = validatePoDraft(
      draft({
        lines: [
          { key: 'r1', inventoryItemId: 42, qtyOrdered: '1', unitCost: '1' },
          { key: 'r2', inventoryItemId: 42, qtyOrdered: '2', unitCost: '1' }
        ]
      })
    );
    expect(result.valid).toBe(false);
    // The LATER row is the one to delete, so it carries the message; the first row
    // holds a quantity the user still wants and must not be marked wrong.
    expect(result.lineErrors.r2).toBe('This variant is already on line 1 — combine the quantities into one line.');
    expect(result.lineErrors.r1).toBeUndefined();
  });

  it('does not merge duplicate variant rows the way a receipt merges duplicate lines', () => {
    // buildReceivePayload aggregates a repeated line id because two rows there are
    // two cartons of one thing. Two ORDER rows of one variant usually carry
    // different unit costs, so adding the quantities up would silently pick one of
    // those costs for the buyer. Refuse, do not merge.
    const lines = [
      { key: 'r1', inventoryItemId: 42, qtyOrdered: '1', unitCost: '10.00' },
      { key: 'r2', inventoryItemId: 42, qtyOrdered: '2', unitCost: '25.00' }
    ];
    expect(validatePoDraft(draft({ lines })).valid).toBe(false);
    expect(buildPoCreatePayload(draft({ lines })).lines).toHaveLength(2);
  });

  it('allows the same variant once per order, which is the normal case', () => {
    expect(
      validatePoDraft(
        draft({
          lines: [
            { key: 'r1', inventoryItemId: 42, qtyOrdered: '1', unitCost: '1' },
            { key: 'r2', inventoryItemId: 43, qtyOrdered: '2', unitCost: '1' }
          ]
        })
      ).valid
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------
describe('isUuid', () => {
  it('accepts a uuid and rejects the things that reach a filter from a stale URL', () => {
    expect(isUuid(UUID_A)).toBe(true);
    expect(isUuid('42')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(`${UUID_A}x`)).toBe(false);
  });
});

describe('purchaseOrderListQuery', () => {
  it('repeats ?status= rather than sending an array, which the view would not read', () => {
    // The view reads getlist('status'); axios would serialize an array as
    // status[]=draft and the filter would silently stop applying.
    const query = purchaseOrderListQuery({ statuses: ['draft', 'submitted'] });
    expect(query).toBe('status=draft&status=submitted');
    expect(query).not.toContain('%5B%5D');
  });

  it('OMITS a non-uuid supplier or location filter, because the view 500s on one', () => {
    // GET /purchase-orders/?supplier_id=42 feeds the raw value into filter() and
    // Django raises outside any handler. An unfiltered list is a page; a 500 is not.
    expect(purchaseOrderListQuery({ supplierId: '42' })).toBe('');
    expect(purchaseOrderListQuery({ supplierId: '42' })).not.toContain('supplier_id');
    expect(purchaseOrderListQuery({ locationId: 'main' })).toBe('');
    expect(purchaseOrderListQuery({ supplierId: UUID_A })).toBe(`supplier_id=${UUID_A}`);
  });

  it('drops an unknown status and de-duplicates the rest', () => {
    expect(purchaseOrderListQuery({ statuses: ['draft', 'bogus', 'draft'] })).toBe('status=draft');
  });

  it('is empty with no filters, so no bare ? is appended', () => {
    expect(purchaseOrderListQuery()).toBe('');
    expect(purchaseOrderListQuery({ statuses: [], supplierId: null, locationId: null })).toBe('');
  });
});

describe('onOrderQuery', () => {
  it('omits a non-uuid location, which is the same uncaught 500', () => {
    expect(onOrderQuery({ locationId: 'main' })).toBe('');
    expect(onOrderQuery({ locationId: UUID_B })).toBe(`location_id=${UUID_B}`);
    expect(onOrderQuery()).toBe('');
  });
});

describe('supplierListQuery', () => {
  it('OMITS include_inactive when off, because "false" would read as truthy-absent', () => {
    // The view widens only for 1/true/yes; every other value — 'false' and '0'
    // included — means active-only. Omitting is the only unambiguous form.
    expect(supplierListQuery({ includeInactive: false })).toBe('');
    expect(supplierListQuery({ includeInactive: false })).not.toContain('include_inactive');
    expect(supplierListQuery()).toBe('');
  });

  it('sends a value the view actually accepts when on', () => {
    expect(supplierListQuery({ includeInactive: true })).toBe('include_inactive=true');
  });
});

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
describe('sortSuppliersByName', () => {
  it('sorts client-side, because the annotated list endpoint arrives unordered', () => {
    // Meta.ordering is dropped once the view annotates Count() — it becomes a
    // GROUP BY, and the row order shuffles as soon as a PO exists.
    const sorted = sortSuppliersByName([{ name: 'Zephyr' }, { name: 'acme' }, { name: 'Bellweather' }]);
    expect(sorted.map((row) => row.name)).toEqual(['acme', 'Bellweather', 'Zephyr']);
  });

  it('does not mutate the array it was given', () => {
    const original = [{ name: 'B' }, { name: 'A' }];
    sortSuppliersByName(original);
    expect(original.map((row) => row.name)).toEqual(['B', 'A']);
  });
});

describe('describeOpenPos', () => {
  it('renders an UNKNOWN count as an em dash, never as "No open orders"', () => {
    // POST, PATCH, GET detail and DELETE all return open_po_count: null. Telling
    // a buyer a supplier has no open orders when it has four gets freight cancelled.
    expect(describeOpenPos(null)).toBe(EM_DASH);
    expect(describeOpenPos(undefined)).toBe(EM_DASH);
    expect(describeOpenPos(null)).not.toBe('No open orders');
  });

  it('says zero out loud when it really is zero', () => {
    expect(describeOpenPos(0)).toBe('No open orders');
    expect(describeOpenPos(1)).toBe('1 open order');
    expect(describeOpenPos(4)).toBe('4 open orders');
  });
});

describe('mergeSupplierResponse', () => {
  it('keeps the count the client already knew when a save response nulls it', () => {
    // Editing a phone number must not blank "4 open orders" out of the table.
    const merged = mergeSupplierResponse({ name: 'Acme', open_po_count: 4 }, { name: 'Acme Ltd', open_po_count: null });
    expect(merged).toEqual({ name: 'Acme Ltd', open_po_count: 4 });
  });

  it('accepts a real zero from a list refetch instead of resurrecting the old count', () => {
    // ?? and not ||: 0 is the answer here, not a missing value.
    expect(mergeSupplierResponse({ open_po_count: 4 }, { open_po_count: 0 }).open_po_count).toBe(0);
    expect(mergeSupplierResponse(null, { open_po_count: null }).open_po_count).toBeNull();
  });
});

describe('describeVendorLink', () => {
  it('names the accounting system a supplier is linked to', () => {
    expect(describeVendorLink({ qb_vendor_id: UUID_A, qb_vendor_name: 'Acme Textiles', square_vendor_id: null })).toBe(
      'Linked to QuickBooks: Acme Textiles'
    );
    expect(describeVendorLink({ qb_vendor_id: null, qb_vendor_name: null, square_vendor_id: UUID_B })).toBe('Linked to Square');
    expect(describeVendorLink({ qb_vendor_id: null, qb_vendor_name: null, square_vendor_id: null })).toBe('Not linked');
  });

  it('never prints a bare uuid at the user when the mirror row has lost its name', () => {
    const text = describeVendorLink({ qb_vendor_id: UUID_A, qb_vendor_name: '  ', square_vendor_id: null });
    expect(text).toBe('Linked to QuickBooks: unnamed vendor');
    expect(text).not.toContain(UUID_A);
  });

  it('reports both links when a supplier carries both', () => {
    expect(describeVendorLink({ qb_vendor_id: UUID_A, qb_vendor_name: 'Acme', square_vendor_id: UUID_B })).toBe(
      'Linked to QuickBooks: Acme · Linked to Square'
    );
  });
});

describe('supplierNameError', () => {
  const badRequest = (data: Record<string, unknown>) => ({ response: { status: 400, data } });

  it('finds the duplicate-name message on a 400, which is NOT the 409 it looks like', () => {
    // A handler watching for a conflict status shows the generic fallback and the
    // user never learns which field is wrong.
    const err = badRequest({ name: ["A supplier named 'Acme' already exists."] });
    expect(supplierNameError(err)).toBe("A supplier named 'Acme' already exists.");
    expect(isDuplicateSupplierName(err)).toBe(true);
  });

  it('distinguishes absent from blank, which are different messages on the same key', () => {
    expect(supplierNameError(badRequest({ name: ['This field is required.'] }))).toBe('This field is required.');
    expect(supplierNameError(badRequest({ name: ['This field may not be blank.'] }))).toBe('This field may not be blank.');
    expect(isDuplicateSupplierName(badRequest({ name: ['This field is required.'] }))).toBe(false);
  });

  it('stays out of the way of every other failure', () => {
    expect(supplierNameError(badRequest({ email: ['Enter a valid email address.'] }))).toBeNull();
    expect(supplierNameError({ response: { status: 409, data: { detail: 'Conflict' } } })).toBeNull();
    expect(supplierNameError(new Error('network'))).toBeNull();
  });
});

describe('describePurchasingError', () => {
  it('delegates to apiErrors so the eleven body shapes stay in one place', () => {
    const summary = describePurchasingError({
      response: {
        status: 409,
        data: {
          error: '1 line(s) cannot be received as requested.',
          detail: [
            {
              line_id: 'L1',
              sku: 'LS100-IVORY-S',
              reason: 'over_receipt',
              detail: 'Only 7 of 10 remain outstanding on this line.'
            }
          ]
        }
      }
    });
    expect(summary).toContain('1 line(s) cannot be received');
  });

  it('still says something when the body carried nothing usable', () => {
    expect(describePurchasingError(new Error('network'))).toBeTruthy();
  });
});
