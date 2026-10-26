// Her Record on a card (Inventory › Plan, buy planner B9): `PUT …/lines/<id>/decision/`.
//
// The decision is recorded against the revision she was shown (`against_revision`), and the server refuses a
// stale one (409 "Ours moved to N since this card; record again."). The memo and the lines come from two
// GETs, so a run landing between them could pair a card's number with the next revision; Record is enabled
// only when the card and the line's revision agree (the same trace, the same number, the same status) and
// otherwise the page refetches both first, once per card and revision (`refetchOnce`), so a disagreement that
// persists never loops. A card read as unpriced or unsized while its line is priced and sized was read before the
// run: read again. A line that needs a price while it has a revision was sized at a price it no longer has: it is
// not recorded against that number (with no revision there is no number of ours, and her number is recorded
// against nothing). The revision is sent explicitly (null with none: leaving it out is a 400), the number as a JSON
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

/** A card's statuses that say the memo read the line before it had a revision or a price. */
const NOT_SIZED = new Set(['needs_price', 'unsized']);
const PRICE_GONE = 'Its number was sized at a price it no longer has. Give it a retail price and re-size before you record a number.';

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
  if (line.needs_price || line.intended_price === null) {
    return { enabled: false, refetch: false, againstRevision: null, prefill, blocked: PRICE_GONE };
  }
  if (NOT_SIZED.has(card.status)) return { enabled: false, refetch: true, againstRevision: rev.revision, prefill, blocked: null };
  const agrees =
    traceOf(card) === rev.trace_id &&
    (shown === null ? rev.suggested_qty === null : Number(shown) === rev.suggested_qty) &&
    (card.status === rev.status || (card.status === 'cut' && rev.status === 'cut'));
  if (!agrees) return { enabled: false, refetch: true, againstRevision: rev.revision, prefill, blocked: null };
  return { enabled: true, refetch: false, againstRevision: rev.revision, prefill, blocked: null };
};

/** A card's key against its line's revision: the page reads again once per key. */
export const disagreementKey = (card: CardView, line: Line | undefined): string => `${card.key}@${line?.revision?.revision ?? 'none'}`;

/** The keys of every card that disagrees with its line, sorted (empty when they all agree). */
export const disagreementKeys = (view: MemoView, lines: ReadonlyMap<string, Line>, live: Live): string[] =>
  [...view.items, ...view.carried]
    .filter((card) => card.lineId && recordState(card, lines.get(card.lineId), live).refetch)
    .map((card) => disagreementKey(card, lines.get(card.lineId as string)))
    .sort();

/** One key per state of disagreement between the memo's cards and the plan's lines (null when they agree). */
export const disagreement = (view: MemoView, lines: ReadonlyMap<string, Line>, live: Live): string | null => {
  const keys = disagreementKeys(view, lines, live);
  return keys.length ? keys.join(',') : null;
};

/** True while any key is new (and remembers them): a disagreement that persists is read once, never in a loop. */
export const refetchOnce = (tried: Set<string>, keys: string[]): boolean => {
  const fresh = keys.filter((key) => !tried.has(key));
  fresh.forEach((key) => tried.add(key));
  return fresh.length > 0;
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
