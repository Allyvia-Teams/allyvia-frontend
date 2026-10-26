// Her Record on a card (Inventory › Plan, buy planner B9): `PUT …/lines/<id>/decision/`.
//
// The decision is recorded against the revision she was shown (`against_revision`), and the server refuses a
// stale one (409 "Ours moved to N since this card; record again."). The memo and the lines come from two
// GETs, so a run landing between them could pair a card's number with the next revision; Record is enabled
// only when the card and the line's revision agree (the same trace, the same number, the same status) and
// otherwise the page refetches both first, once per state of disagreement (`disagreement`), so a disagreement
// that persists never loops. A card that needs a price, or is not sized, is not recorded against an older
// revision. The revision is sent explicitly (null with none: leaving it out is a 400), the number as a JSON
// integer, and her note pre-filled and sent as she typed it (an empty note would erase hers; the server keeps a
// note verbatim).

import type { DecisionBody, Line, Live } from 'api/buying.api';

import type { CardView, MemoView } from './memo';

export interface RecordState {
  enabled: boolean;
  refetch: boolean;
  againstRevision: number | null;
  prefill: { qty: string; note: string; decided: boolean };
  /** Why Record is off for a reason the page cannot fix by reading again, or null. */
  blocked: string | null;
}

/** Statuses whose card is not recorded against the line's revision (the revision may be from before). */
const NOT_SIZED = new Set(['needs_price', 'unsized']);
const NEEDS_PRICE = 'Give it a retail price and re-size before you record a number.';

const traceOf = (card: CardView): string | null => {
  const c = card.why?.citable;
  return c && 'trace_id' in c ? c.trace_id : null;
};

export const recordState = (card: CardView, line: Line | undefined, live: Live): RecordState => {
  const prefill = {
    qty: line?.decision ? String(line.decision.owner_qty) : '',
    note: line?.decision?.note ?? '',
    decided: Boolean(line?.decision)
  };
  if (!live.actions.decide || !line || card.lineId !== line.id) {
    return { enabled: false, refetch: false, againstRevision: null, prefill, blocked: null };
  }
  const rev = line.revision;
  const shown = card.figure?.amount ?? null;
  if (!rev) {
    // A card showing a number for a line with no revision was read from another state.
    if (shown !== null) return { enabled: false, refetch: true, againstRevision: null, prefill, blocked: null };
    return { enabled: true, refetch: false, againstRevision: null, prefill, blocked: null };
  }
  if (NOT_SIZED.has(card.status)) return { enabled: false, refetch: false, againstRevision: null, prefill, blocked: NEEDS_PRICE };
  const agrees =
    traceOf(card) === rev.trace_id &&
    (shown === null ? rev.suggested_qty === null : Number(shown) === rev.suggested_qty) &&
    (card.status === rev.status || (card.status === 'cut' && rev.status === 'cut'));
  if (!agrees) return { enabled: false, refetch: true, againstRevision: rev.revision, prefill, blocked: null };
  return { enabled: true, refetch: false, againstRevision: rev.revision, prefill, blocked: null };
};

/** One key per state of disagreement between the memo's cards and the plan's lines (null when they agree): the
 * page reads both again once per key, so a disagreement that persists is read once, never in a loop. */
export const disagreement = (view: MemoView, lines: ReadonlyMap<string, Line>, live: Live): string | null => {
  const keys = [...view.items, ...view.carried]
    .filter((card) => card.lineId && recordState(card, lines.get(card.lineId), live).refetch)
    .map((card) => `${card.key}@${lines.get(card.lineId as string)?.revision?.revision ?? 'none'}`)
    .sort();
  return keys.length ? keys.join(',') : null;
};

const WHOLE = /^\d+$/;

export const decisionBody = (
  qtyText: string,
  note: string,
  againstRevision: number | null
): { ok: true; body: DecisionBody } | { ok: false; error: string } => {
  const text = qtyText.trim();
  if (!WHOLE.test(text)) return { ok: false, error: 'Type a whole number of units.' };
  const qty = Number(text);
  if (qty > 100000) return { ok: false, error: 'That is more than 100,000 units.' };
  return { ok: true, body: { owner_qty: qty, against_revision: againstRevision, note, via: 'memo' } };
};

export const recordOutcome = (response: { recorded: boolean }): string =>
  response.recorded ? 'Recorded. The order uses your number.' : 'Nothing changed: that is already your number.';

interface ErrorLike {
  response?: { status?: number; data?: { detail?: unknown; code?: unknown } };
}

/** The server's sentence; a 409 (stale, closed, excluded, busy) means the card should be read again. */
export const recordError = (error: unknown): { refetch: boolean; sentence: string } => {
  const response = (error as ErrorLike)?.response;
  if (!response) return { refetch: false, sentence: 'That did not reach the server. Try again.' };
  const detail = typeof response.data?.detail === 'string' ? response.data.detail : null;
  return { refetch: response.status === 409, sentence: detail || 'The server refused that. Read the card again and retry.' };
};
