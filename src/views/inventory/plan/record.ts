// Her Record on a card (Inventory › Plan, buy planner B9): `PUT …/lines/<id>/decision/`.
//
// The decision is recorded against the revision she was shown (`against_revision`), and the server refuses a
// stale one (409 "Ours moved to N since this card; record again."). The memo and the lines come from two
// GETs, so a run landing between them could pair a card's number with the next revision; Record is enabled
// only when the card and the line's revision agree (the same trace, the same number, the same status) and
// otherwise the page refetches both first. The revision is sent explicitly (null with none: leaving it out is
// a 400), the number as a JSON integer, and her note pre-filled (an empty note would erase hers).

import type { DecisionBody, Line, Live } from 'api/buying.api';

import type { CardView } from './memo';

export interface RecordState {
  enabled: boolean;
  refetch: boolean;
  againstRevision: number | null;
  prefill: { qty: string; note: string; decided: boolean };
}

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
    return { enabled: false, refetch: false, againstRevision: null, prefill };
  }
  const rev = line.revision;
  if (!rev) return { enabled: true, refetch: false, againstRevision: null, prefill };
  const shown = card.figure?.amount ?? null;
  const agrees =
    traceOf(card) === rev.trace_id &&
    (shown === null ? rev.suggested_qty === null : Number(shown) === rev.suggested_qty) &&
    (card.status === rev.status || (card.status === 'cut' && rev.status === 'cut'));
  if (!agrees) return { enabled: false, refetch: true, againstRevision: rev.revision, prefill };
  return { enabled: true, refetch: false, againstRevision: rev.revision, prefill };
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
  return { ok: true, body: { owner_qty: qty, against_revision: againstRevision, note: note.trim(), via: 'memo' } };
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
