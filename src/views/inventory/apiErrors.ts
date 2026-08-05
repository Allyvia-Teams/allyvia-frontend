// views/inventory/apiErrors.ts
//
// One reader for the inventory API's error bodies, because there are eleven
// shapes and guessing wrong shows the user nothing.
//
// This module exists because of what the endpoints actually return, verified by
// probing the running backend rather than by reading serializers:
//
//   `body.lines` (POs and transfers) can be FOUR different things:
//     1. ["This field is required."]                       — key omitted; array of STRINGS
//     2. {"non_field_errors": ["This list may not be empty."]} — []; an OBJECT
//     3. [{}, {"qty": ["..."]}, {}]                        — DRF field errors, INDEX-ALIGNED
//                                                            with {} for each valid row
//     4. [{"index": 1, "inventory_item_id": 99, "detail": "No such item…"}]
//                                                          — resolve errors: ONE element
//                                                            carrying its own row index
//   `body.entries` (stock counts) has the same 1/2/3 shapes.
//
//   A 409 is one of THREE bodies, and they must be told apart by KEY PRESENCE,
//   never by the status code:
//     a. {"error": "<summary>", "detail": [{line_id, lookup, reason, detail}]}  — detail is an ARRAY
//     b. {"detail": "<string>", "status": "…", "allowed_from": [...]}           — detail is a STRING
//     c. {"detail": "<string>", "hint": "<string>"}                            — no status, no error
//
// Shape 3 is the one that bites hardest: a renderer that assumes `lines[0]` is
// the offending row will blame row 1 for row 2's error, and one that reads
// `lines[i].qty` will show nothing when the error is keyed `line_id` instead.

export interface RowError {
  /**
   * Which submitted row this belongs to, 0-based — MEANINGFUL ONLY for the DRF
   * field-error shapes, which are index-aligned with what was sent.
   *
   * For a 409 blocker it is merely the blocker's own position and does NOT
   * identify the submitted row: the backend appends a blocker only for entries
   * that FAILED, so `detail[]` is a subset of what was sent. Blaming
   * `submitted[rows[0].index]` paints the wrong row red. Match on `lineId` or
   * `lookup` instead — that is what they are for.
   */
  index: number;
  /** Field name when the backend keyed it, else null for whole-row errors. */
  field: string | null;
  message: string;
  /** From a 409 blocker: which line it is about. Null on every other shape. */
  lineId: string | null;
  /** From a 409 blocker: the scanned string the server could not match. */
  lookup: string | null;
  /** From a 409 blocker: the machine-readable cause (over_receipt, not_in_count, …). */
  reason: string | null;
  /** True when this came from a 409 blocker, so `index` must not be trusted as a row. */
  isBlocker: boolean;
}

/** Every field a RowError needs beyond the three that always exist. */
const plainRow = (index: number, field: string | null, message: string): RowError => ({
  index,
  field,
  message,
  lineId: null,
  lookup: null,
  reason: null,
  isBlocker: false
});

export interface ParsedApiError {
  /** One line fit for an Alert. Never empty. */
  summary: string;
  /** Per-row errors, index-aligned with what the client submitted. */
  rows: RowError[];
  /** The remediation sentence the backend supplies on some 409s. */
  hint: string | null;
  /** Present on an illegal-transition 409: the statuses the action IS legal from. */
  allowedFrom: string[] | null;
  /** The current server-side status on an illegal-transition 409. */
  currentStatus: string | null;
  /** True when the body carried nothing usable and `summary` is our fallback. */
  isFallback: boolean;
}

type Body = Record<string, unknown> | undefined;

const asBody = (err: unknown): Body => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : undefined;
};

export const statusOf = (err: unknown): number | null => (err as { response?: { status?: number } })?.response?.status ?? null;

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((entry) => typeof entry === 'string');

/** Flatten DRF's `{field: [msg, …]}` into RowErrors for one row index. */
const fieldErrorsToRows = (value: Record<string, unknown>, index: number): RowError[] => {
  const out: RowError[] = [];
  Object.entries(value).forEach(([field, messages]) => {
    // The resolve-error shape carries its own bookkeeping keys; they are not fields.
    if (field === 'index' || field === 'detail') return;
    const list = Array.isArray(messages) ? messages : [messages];
    list.forEach((message) => out.push(plainRow(index, field, String(message))));
  });
  return out;
};

/**
 * Read a per-row error array (`lines` or `entries`) in any of its four shapes.
 *
 * Returns `{rows, messages}` — `messages` holds errors that belong to the whole
 * submission rather than to a row (shapes 1 and 2), so the caller can put them in
 * the summary instead of hunting for a row to attach them to.
 */
export const parseRowErrors = (value: unknown): { rows: RowError[]; messages: string[] } => {
  // Shape 2: an object keyed non_field_errors (sent an empty array).
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const messages: string[] = [];
    Object.values(value as Record<string, unknown>).forEach((entry) => {
      (Array.isArray(entry) ? entry : [entry]).forEach((message) => messages.push(String(message)));
    });
    return { rows: [], messages };
  }

  if (!Array.isArray(value)) return { rows: [], messages: [] };

  // Shape 1: array of strings (the key itself was missing).
  if (isStringArray(value)) return { rows: [], messages: value };

  const rows: RowError[] = [];
  const messages: string[] = [];

  value.forEach((entry, position) => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;

    // Shape 4: a resolve error carrying its OWN row index. There is one element
    // and `position` is meaningless — trust `index`.
    if (typeof record.index === 'number') {
      const detail = typeof record.detail === 'string' ? record.detail : 'Could not resolve this row.';
      rows.push(plainRow(record.index, null, detail));
      const extra = fieldErrorsToRows(record, record.index);
      // Non-field keys on a resolve error (e.g. inventory_item_id) are echoes of
      // what was sent, not errors — surface them only if they carry arrays.
      extra.filter((row) => Array.isArray(record[row.field as string])).forEach((row) => rows.push(row));
      return;
    }

    // Shape 3: index-aligned DRF field errors, {} for each valid row.
    if (Object.keys(record).length === 0) return;
    rows.push(...fieldErrorsToRows(record, position));
  });

  return { rows, messages };
};

const FALLBACK = 'The request failed. Please try again.';

/**
 * Turn any inventory-API error into something renderable.
 *
 * `rowKey` names the per-row array to look for — `"lines"` for POs and
 * transfers, `"entries"` for stock counts. Passing the wrong one is not fatal:
 * both are checked, the named one first.
 */
export const parseApiError = (err: unknown, rowKey: 'lines' | 'entries' = 'lines'): ParsedApiError => {
  const body = asBody(err);
  const result: ParsedApiError = {
    summary: '',
    rows: [],
    hint: null,
    allowedFrom: null,
    currentStatus: null,
    isFallback: false
  };

  if (!body) {
    return { ...result, summary: FALLBACK, isFallback: true };
  }

  const summaryParts: string[] = [];

  // 409 shape (a): {error, detail: [...]}. `error` is the summary and `detail` is
  // an ARRAY of blockers — the same key that is a STRING on the other two 409s.
  if (typeof body.error === 'string') summaryParts.push(body.error);

  if (Array.isArray(body.detail)) {
    body.detail.forEach((entry, position) => {
      if (!entry || typeof entry !== 'object') {
        summaryParts.push(String(entry));
        return;
      }
      const blocker = entry as Record<string, unknown>;
      const message = typeof blocker.detail === 'string' ? blocker.detail : JSON.stringify(blocker);
      // A blocker is appended only for entries that FAILED, so `position` is the
      // blocker's own index and NOT the index of the submitted row. Carry the
      // identifiers the server does provide so the caller can match on those.
      result.rows.push({
        index: position,
        field: null,
        message,
        lineId: typeof blocker.line_id === 'string' ? blocker.line_id : null,
        lookup: typeof blocker.lookup === 'string' ? blocker.lookup : null,
        reason: typeof blocker.reason === 'string' ? blocker.reason : null,
        isBlocker: true
      });
    });
  } else if (typeof body.detail === 'string') {
    summaryParts.push(body.detail);
  }

  // 409 shape (b): the illegal-transition body.
  if (Array.isArray(body.allowed_from)) result.allowedFrom = body.allowed_from.map(String);
  if (typeof body.status === 'string') result.currentStatus = body.status;

  // 409 shape (c): the retry-guidance body.
  if (typeof body.hint === 'string') result.hint = body.hint;

  // Per-row arrays. Check the named key first so a body carrying both is read
  // the way the caller intended.
  const keys: Array<'lines' | 'entries'> = rowKey === 'lines' ? ['lines', 'entries'] : ['entries', 'lines'];
  keys.forEach((key) => {
    if (!(key in body)) return;
    const { rows, messages } = parseRowErrors(body[key]);
    result.rows.push(...rows);
    summaryParts.push(...messages);
  });

  // Anything left is a plain DRF field error on the top-level object.
  Object.entries(body).forEach(([field, value]) => {
    if (['error', 'detail', 'hint', 'status', 'allowed_from', 'lines', 'entries'].includes(field)) return;
    if (isStringArray(value)) {
      summaryParts.push(`${field}: ${value.join(' ')}`);
    } else if (typeof value === 'string') {
      summaryParts.push(`${field}: ${value}`);
    }
  });

  if (summaryParts.length === 0 && result.rows.length > 0) {
    summaryParts.push(result.rows.length === 1 ? '1 row could not be saved.' : `${result.rows.length} rows could not be saved.`);
  }

  if (summaryParts.length === 0) {
    return { ...result, summary: FALLBACK, isFallback: true };
  }

  return { ...result, summary: summaryParts.join(' ') };
};

/** Row errors grouped by index, for painting a grid. */
export const rowErrorsByIndex = (parsed: ParsedApiError): Map<number, RowError[]> => {
  const map = new Map<number, RowError[]>();
  parsed.rows.forEach((row) => {
    const bucket = map.get(row.index);
    if (bucket) bucket.push(row);
    else map.set(row.index, [row]);
  });
  return map;
};

/**
 * The blocker for one line, matched by `line_id` rather than by position.
 *
 * Use this instead of indexing into what you submitted. The backend appends a
 * blocker only for entries that failed, so a submission of three lines whose
 * SECOND line is bad produces a one-element `detail[]` — and index 0 then points
 * at the first line, which was fine.
 */
export const blockerForLine = (parsed: ParsedApiError, lineId: string): RowError | null =>
  parsed.rows.find((row) => row.isBlocker && row.lineId === lineId) ?? null;

/** Blockers keyed by the line they name; lines the server did not identify are dropped. */
export const blockersByLineId = (parsed: ParsedApiError): Map<string, RowError> => {
  const map = new Map<string, RowError>();
  parsed.rows.forEach((row) => {
    if (row.isBlocker && row.lineId) map.set(row.lineId, row);
  });
  return map;
};

/** Blockers the server could not attach to a line — an unmatched scan, typically. */
export const unattachedBlockers = (parsed: ParsedApiError): RowError[] => parsed.rows.filter((row) => row.isBlocker && !row.lineId);

/**
 * True when this error means "you called the wrong endpoint for the current
 * status" — the client's state is stale and refetching is the fix.
 */
export const isIllegalTransition = (parsed: ParsedApiError): boolean => parsed.allowedFrom !== null && parsed.allowedFrom.length > 0;

/**
 * True when the server changed something before rejecting, so the client MUST
 * refetch rather than trust its local copy.
 *
 * PATCH /transfers/{id}/ saves the header fields BEFORE resolving lines, and its
 * line resolver RETURNS a 400 Response instead of raising — so the surrounding
 * `@transaction.atomic` commits the header changes anyway. A form that treats
 * that 400 as "nothing was saved" desyncs from the server permanently.
 */
export const mayHavePartiallySaved = (err: unknown, parsed: ParsedApiError): boolean => statusOf(err) === 400 && parsed.rows.length > 0;
