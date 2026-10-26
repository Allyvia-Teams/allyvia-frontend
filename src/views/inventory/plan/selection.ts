// What a selection on the memo brings into the chat (Inventory › Plan, buy planner B9; design §10's
// "Add to chat ⌘L").
//
// A selection is a set of chunk anchors (the page reads them off the DOM: a clicked chunk, or every chunk a
// text selection touches, in order). Each citable chunk becomes a context entry the chat endpoint takes
// (`{trace_id, key}` or `{line_id}`, at most 20); a chunk the chat cannot read yet (cover, totals, caveats)
// brings nothing. The chips stay until she removes them and go with every turn: "Make it 48" points at no
// style unless one is in the context or named in the message.

import type { ContextEntry } from 'api/buying.api';

import type { ChunkView, MemoView } from './memo';

export const MAX_CONTEXT = 20;

const entryKey = (entry: ContextEntry) => ('trace_id' in entry ? `t:${entry.trace_id}:${entry.key}` : `l:${entry.line_id}`);

/** Every chunk of the memo, by anchor (cards, months, cover, totals, caveats). */
const allChunks = (view: MemoView): Map<string, ChunkView> => {
  const map = new Map<string, ChunkView>();
  const add = (c: ChunkView | null | undefined) => {
    if (c) map.set(c.anchor, c);
  };
  add(view.cover);
  add(view.basis);
  view.totals.forEach((t) => add(t.chunk));
  add(view.months.root);
  view.months.rows.forEach((r) => {
    add(r.row);
    r.details.forEach(add);
  });
  [...view.items, ...view.carried].forEach((card) => {
    [card.why, card.splitChunk, card.price, card.fit, card.cut, card.decision, card.moved, ...card.notes, ...card.owner].forEach(add);
  });
  view.caveats.forEach(add);
  return map;
};

/** The chunks named by these anchors, in the given order; unknown anchors are skipped. */
export const selectedChunks = (view: MemoView, anchors: string[]): ChunkView[] => {
  const map = allChunks(view);
  return anchors.map((a) => map.get(a)).filter((c): c is ChunkView => c !== undefined);
};

/** The context the chat endpoint takes: citable chunks only, deduped, at most 20. */
export const contextFor = (chunks: ChunkView[]): ContextEntry[] => {
  const seen = new Set<string>();
  const out: ContextEntry[] = [];
  chunks.forEach((c) => {
    if (!c.citable) return;
    const key = entryKey(c.citable);
    if (seen.has(key) || out.length >= MAX_CONTEXT) return;
    seen.add(key);
    out.push(c.citable);
  });
  return out;
};

export interface ContextChip {
  anchor: string;
  label: string;
  entry: ContextEntry;
}

export interface ChipsState {
  chips: ContextChip[];
  notice: string | null;
}

export const emptyChips = (): ChipsState => ({ chips: [], notice: null });

const LABEL_MAX = 60;

export const chipLabel = (chunk: ChunkView, view: MemoView): string => {
  const card = chunk.lineId ? [...view.items, ...view.carried].find((c) => c.lineId === chunk.lineId) : null;
  const text = (chunk.sentence || '').replace(/\s+/g, ' ').trim();
  const raw = card ? `${card.name} · ${text}` : text || 'A figure';
  return raw.length > LABEL_MAX ? `${raw.slice(0, LABEL_MAX - 1)}…` : raw;
};

export const addChips = (state: ChipsState, chunks: ChunkView[], view: MemoView): ChipsState => {
  const citable = chunks.filter((c) => c.citable);
  if (citable.length === 0) return { ...state, notice: 'The assistant cannot read that part of the memo yet.' };
  const have = new Set(state.chips.map((c) => entryKey(c.entry)));
  const chips = [...state.chips];
  let duplicate = false;
  let capped = false;
  citable.forEach((c) => {
    const key = entryKey(c.citable as ContextEntry);
    if (have.has(key)) {
      duplicate = true;
      return;
    }
    if (chips.length >= MAX_CONTEXT) {
      capped = true;
      return;
    }
    have.add(key);
    chips.push({ anchor: c.anchor, label: chipLabel(c, view), entry: c.citable as ContextEntry });
  });
  const notice = capped
    ? 'The chat takes at most 20 pieces of the memo at a time.'
    : duplicate && chips.length === state.chips.length
      ? 'Already in the chat'
      : null;
  return { chips, notice };
};

export const removeChip = (state: ChipsState, anchor: string): ChipsState => ({
  chips: state.chips.filter((c) => c.anchor !== anchor),
  notice: null
});
