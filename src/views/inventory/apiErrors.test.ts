import { describe, expect, it } from 'vitest';

import {
  blockerForLine,
  blockersByLineId,
  isIllegalTransition,
  mayHavePartiallySaved,
  parseApiError,
  parseRowErrors,
  rowErrorsByIndex,
  statusOf,
  unattachedBlockers
} from './apiErrors';

/** Shape an axios error the way the interceptor delivers it. */
const httpError = (status: number, data: unknown) => ({ response: { status, data } });

describe('parseRowErrors — the four shapes of `lines`/`entries`', () => {
  it('reads an array of STRINGS as a whole-submission message, not as row 0', () => {
    // Sent when the key is omitted entirely. Treating it as a row error would
    // paint the first row red for a mistake that belongs to the request.
    const { rows, messages } = parseRowErrors(['This field is required.']);
    expect(rows).toEqual([]);
    expect(messages).toEqual(['This field is required.']);
  });

  it('reads the non_field_errors OBJECT as a whole-submission message', () => {
    // Sent when the array was empty. DRF wraps ListSerializer-level errors under
    // the field name, so this is an object where the sibling shapes are arrays.
    const { rows, messages } = parseRowErrors({ non_field_errors: ['This list may not be empty.'] });
    expect(rows).toEqual([]);
    expect(messages).toEqual(['This list may not be empty.']);
  });

  it('keeps DRF field errors INDEX-ALIGNED, so row 2 is blamed for row 2', () => {
    // THE trap: the array is positional with {} for every valid row. Reading
    // errors[0] would blame the first row for the second row's mistake.
    const { rows } = parseRowErrors([{}, { qty_ordered: ['Ensure this value is greater than or equal to 1.'] }, {}]);
    expect(rows).toHaveLength(1);
    expect(rows[0].index).toBe(1);
    expect(rows[0].field).toBe('qty_ordered');
    // Specifically NOT index 0, which is what a naive reader reports.
    expect(rows[0].index).not.toBe(0);
  });

  it('trusts the explicit `index` on a resolve error rather than its position', () => {
    // Resolve errors are a ONE-element array carrying their own row number, so
    // position 0 is meaningless here — the offending row is 1.
    const { rows } = parseRowErrors([{ index: 1, inventory_item_id: 99999999, detail: 'No such item for this company.' }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].index).toBe(1);
    expect(rows[0].message).toBe('No such item for this company.');
    expect(rows[0].index).not.toBe(0);
  });

  it('keys an error under whatever field the backend used, including line_id', () => {
    // A non-UUID line_id keys under line_id, not qty. A renderer reading only
    // `.qty` displays nothing for this case.
    const { rows } = parseRowErrors([{ line_id: ['Must be a valid UUID.'] }]);
    expect(rows[0].field).toBe('line_id');
  });

  it('returns nothing for shapes it does not recognise rather than throwing', () => {
    expect(parseRowErrors(undefined)).toEqual({ rows: [], messages: [] });
    expect(parseRowErrors(null)).toEqual({ rows: [], messages: [] });
    expect(parseRowErrors(42)).toEqual({ rows: [], messages: [] });
  });
});

describe('parseApiError — the three 409 bodies', () => {
  it('reads the per-blocker 409, where `detail` is an ARRAY', () => {
    const parsed = parseApiError(
      httpError(409, {
        error: '1 entr(y/ies) could not be recorded.',
        detail: [
          {
            line_id: null,
            lookup: 'NOPE',
            reason: 'not_in_count',
            detail: 'No line in this count matches that id, SKU or barcode.'
          }
        ]
      }),
      'entries'
    );
    expect(parsed.summary).toContain('could not be recorded');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].message).toContain('No line in this count matches');
    expect(parsed.isFallback).toBe(false);
  });

  it('reads the illegal-transition 409, where the same `detail` key is a STRING', () => {
    // The key that was an array above is a string here. Branching on the status
    // code alone cannot tell these apart.
    const parsed = parseApiError(
      httpError(409, {
        detail: "Cannot apply in status 'open'. Allowed from: review.",
        status: 'open',
        allowed_from: ['review']
      })
    );
    expect(parsed.summary).toContain('Cannot apply');
    expect(parsed.allowedFrom).toEqual(['review']);
    expect(parsed.currentStatus).toBe('open');
    expect(isIllegalTransition(parsed)).toBe(true);
    expect(parsed.rows).toEqual([]);
  });

  it('reads the retry-guidance 409 and keeps the hint separate from the summary', () => {
    // The hint is the only actionable sentence; burying it in the summary loses
    // the instruction that the count must be re-opened.
    const parsed = parseApiError(
      httpError(409, {
        detail: 'Insufficient stock for Linen Shirt at Main: requested 20, only 2 available.',
        hint: 'Stock moved since the count was taken. Re-open a fresh count so the variance is measured against current levels.'
      })
    );
    expect(parsed.summary).toContain('Insufficient stock');
    expect(parsed.hint).toContain('Re-open a fresh count');
    expect(isIllegalTransition(parsed)).toBe(false);
  });

  it('does not claim an illegal transition when allowed_from is absent', () => {
    const parsed = parseApiError(httpError(409, { detail: 'Something else.' }));
    expect(parsed.allowedFrom).toBeNull();
    expect(isIllegalTransition(parsed)).toBe(false);
  });
});

describe('parseApiError — plain field errors', () => {
  it('surfaces top-level DRF field errors with their field names', () => {
    const parsed = parseApiError(httpError(400, { expected_at: ['Date has wrong format. Use one of these formats instead: YYYY-MM-DD.'] }));
    expect(parsed.summary).toContain('expected_at');
    expect(parsed.summary).toContain('YYYY-MM-DD');
  });

  it('surfaces the role-header 400, which uses `error` where everything else uses `detail`', () => {
    const parsed = parseApiError(httpError(400, { error: 'X-Role-ID header is required' }));
    expect(parsed.summary).toBe('X-Role-ID header is required');
  });

  it('surfaces the duplicate-name 400, which is a 400 and not a 409', () => {
    const parsed = parseApiError(httpError(400, { name: ["A supplier named 'Acme' already exists."] }));
    expect(parsed.summary).toContain('already exists');
  });

  it('falls back to a readable sentence when the body carries nothing usable', () => {
    // A 500 with an HTML error page, or a network failure with no response.
    expect(parseApiError(httpError(500, '<html>…</html>')).isFallback).toBe(true);
    expect(parseApiError(new Error('Network Error')).isFallback).toBe(true);
    expect(parseApiError(httpError(500, '<html>…</html>')).summary).toBeTruthy();
  });

  it('synthesises a summary when there are row errors but no top-level message', () => {
    const parsed = parseApiError(httpError(400, { lines: [{}, { qty: ['Too big'] }] }));
    expect(parsed.summary).toContain('1 row');
    expect(parsed.rows).toHaveLength(1);
  });
});

describe('blocker matching — by line_id, NEVER by position', () => {
  // The backend appends a blocker only for entries that FAILED, so detail[] is a
  // SUBSET of what was sent. This is the single easiest way to blame the wrong row.
  const submitted = ['line-A', 'line-B', 'line-C'];
  const err = httpError(409, {
    error: '1 line(s) could not be received.',
    detail: [{ line_id: 'line-B', lookup: null, reason: 'over_receipt', detail: 'Only 2 outstanding on this line.' }]
  });

  it('finds the blocker for the line it actually names', () => {
    const parsed = parseApiError(err);
    const blocker = blockerForLine(parsed, 'line-B');
    expect(blocker?.reason).toBe('over_receipt');
    expect(blockerForLine(parsed, 'line-A')).toBeNull();
  });

  it('proves position would blame the WRONG line', () => {
    // Guard against a future "simplification" back to index-based matching:
    // blocker index 0 refers to line-B, but submitted[0] is line-A.
    const parsed = parseApiError(err);
    expect(parsed.rows[0].index).toBe(0);
    expect(submitted[parsed.rows[0].index]).toBe('line-A');
    expect(parsed.rows[0].lineId).toBe('line-B');
    expect(submitted[parsed.rows[0].index]).not.toBe(parsed.rows[0].lineId);
  });

  it('marks blockers so `index` is not mistaken for a submitted row', () => {
    expect(parseApiError(err).rows[0].isBlocker).toBe(true);
    // A DRF field error is the opposite: its index IS the submitted row.
    expect(parseApiError(httpError(400, { lines: [{}, { qty: ['x'] }] })).rows[0].isBlocker).toBe(false);
  });

  it('keys blockers by line and keeps unattached ones separate', () => {
    const scanErr = httpError(409, {
      error: '2 entr(y/ies) could not be recorded.',
      detail: [
        { line_id: 'line-B', lookup: null, reason: 'over_receipt', detail: 'nope' },
        // An unmatched scan has no line to attach to — only the scanned string.
        { line_id: null, lookup: 'NOPE-123', reason: 'not_in_count', detail: 'No line matches that barcode.' }
      ]
    });
    const parsed = parseApiError(scanErr, 'entries');
    expect([...blockersByLineId(parsed).keys()]).toEqual(['line-B']);
    expect(unattachedBlockers(parsed)).toHaveLength(1);
    expect(unattachedBlockers(parsed)[0].lookup).toBe('NOPE-123');
  });
});

describe('rowErrorsByIndex', () => {
  it('groups by submitted row so a grid can paint each cell', () => {
    const parsed = parseApiError(
      httpError(400, {
        lines: [{ qty: ['a'], unit_cost: ['b'] }, {}, { qty: ['c'] }]
      })
    );
    const grouped = rowErrorsByIndex(parsed);
    expect(grouped.get(0)).toHaveLength(2);
    expect(grouped.get(1)).toBeUndefined();
    expect(grouped.get(2)).toHaveLength(1);
  });
});

describe('mayHavePartiallySaved', () => {
  it('flags a lines-400 as needing a refetch, because the header fields DID save', () => {
    // PATCH /transfers/{id}/ saves notes/from/to BEFORE resolving lines, and the
    // resolver returns a 400 Response instead of raising — so the surrounding
    // atomic block commits the header change anyway. Treating this 400 as
    // "nothing happened" desyncs the form from the server permanently.
    const err = httpError(400, { lines: [{ index: 0, detail: 'No such item for this company.' }] });
    expect(mayHavePartiallySaved(err, parseApiError(err))).toBe(true);
  });

  it('does not demand a refetch for a header-only 400, where nothing was written', () => {
    const err = httpError(400, { to_location_id: ['Must be a valid UUID.'] });
    expect(mayHavePartiallySaved(err, parseApiError(err))).toBe(false);
  });

  it('does not demand a refetch for a 409, which never partially writes', () => {
    const err = httpError(409, { error: 'blocked', detail: [{ detail: 'nope' }] });
    expect(mayHavePartiallySaved(err, parseApiError(err))).toBe(false);
  });
});

describe('statusOf', () => {
  it('reads the status when present and null otherwise', () => {
    expect(statusOf(httpError(409, {}))).toBe(409);
    expect(statusOf(new Error('boom'))).toBeNull();
  });
});
