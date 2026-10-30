// The chat rail's state (Inventory › Plan, buy planner B9; design §8 as B6 built it).
//
// - Every turn sends the conversation id back (a new conversation starts with no history, and the server's
//   pointing rule reads this turn's context and the conversation's last messages). A "Conversation not found."
//   drops it.
// - A card is a proposal; only her Confirm writes, through the card's own call (`confirm: {method, path,
//   body}`), sent exactly as the server wrote it with the path made relative to the API base. The one thing she
//   adds is her note on a decision card, which fills only `body.note` (B6: the chat never authors her note).
// - A card moves proposed → confirming → confirmed only on the endpoint's 2xx. Any 409 but busy ENDS it with the
//   server's sentence (stale, closed, excluded, or a run refused with no code: the card's revision is fixed when it
//   is proposed, so retrying cannot succeed); busy, a 5xx or a network failure puts it back to proposed.
// - A card's note is her recorded note on that line until she types on the card (the server's body carries an
//   empty note, and a decision replaces the note whole: confirming as written would erase hers). It follows her
//   recorded note as it changes (`notes`, and `noteFor` at Confirm time); once she types, hers is sent as typed.
// - The server cites only her own messages. Her message this turn is known by the id its cards carry (a decision's
//   or a what-if Record's body names it); a message the page cannot place is cited nowhere.
// - A what-if card records nothing; its optional Record is its own decision call.

import type { Answer, ChatCard, Citation, ContextEntry } from 'api/buying.api';

import { relativeApiPath } from './apiPath';
import type { MemoView } from './memo';

export type CardStatus = 'proposed' | 'confirming' | 'confirmed' | 'dismissed' | 'ended';

export interface CardState {
  card: ChatCard;
  status: CardStatus;
  sentence: string | null;
  note: string;
  /** She typed on the card's note: hers stays, whatever her recorded note becomes. */
  noteEdited: boolean;
}

export interface ChatMessage {
  localId: string;
  role: 'owner' | 'assistant';
  text: string;
  chips: string[];
  citations: Citation[];
  cards: CardState[];
  quickReplies: string[];
  refused: boolean;
  /** The server's id: an answer's from the answer; her message's from the cards of the answer to it (the server
   * cites only her messages, and names this turn's in a decision's or a what-if Record's body). */
  serverId: string | null;
}

export interface ChatState {
  conversationId: string | null;
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  nextId: number;
}

export type ChatAction =
  | { type: 'sent'; text: string; chips: string[] }
  | { type: 'answered'; answer: Answer; notes?: Record<string, string> }
  | { type: 'failed'; error: unknown }
  | { type: 'confirming'; localId: string; index: number }
  | { type: 'confirmed'; localId: string; index: number }
  | { type: 'confirmFailed'; localId: string; index: number; error: unknown }
  | { type: 'dismissed'; localId: string; index: number }
  | { type: 'note'; localId: string; index: number; note: string }
  | { type: 'notes'; notes: Record<string, string> };

export const initialChat = (): ChatState => ({ conversationId: null, messages: [], pending: false, error: null, nextId: 1 });

interface ErrorLike {
  code?: string;
  message?: string;
  response?: { status?: number; data?: { detail?: unknown; code?: unknown }; headers?: Record<string, unknown> };
}

const detailOf = (error: unknown): string | null => {
  const detail = (error as ErrorLike)?.response?.data?.detail;
  return typeof detail === 'string' && detail.trim() ? detail : null;
};

const statusOf = (error: unknown): number | null => (error as ErrorLike)?.response?.status ?? null;
const codeOf = (error: unknown): string | null => {
  const code = (error as ErrorLike)?.response?.data?.code;
  return typeof code === 'string' ? code : null;
};

/** The sentence a failed ask or confirm shows: the server's own where it gave one. */
export const errorSentence = (error: unknown): string => {
  const e = error as ErrorLike;
  if (!e?.response) {
    if (e?.code === 'ECONNABORTED' || /timeout/i.test(e?.message || '')) return 'The assistant did not answer in time. Try asking again.';
    return 'That did not reach the server. Try again.';
  }
  if (e.response.status === 429) {
    const raw = e.response.headers?.['retry-after'];
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds > 0) {
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      return `You have asked a lot this hour. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    }
    return 'You have asked a lot this hour. Try again later.';
  }
  return detailOf(error) || 'The assistant could not answer that. Try again.';
};

/** `GET ask/` answering 404: the assistant is switched off here (an environment-wide switch). */
export const isKillSwitch = (error: unknown): boolean => statusOf(error) === 404;

const updateCard = (state: ChatState, localId: string, index: number, fn: (c: CardState) => CardState): ChatState => ({
  ...state,
  messages: state.messages.map((m) => (m.localId === localId ? { ...m, cards: m.cards.map((c, i) => (i === index ? fn(c) : c)) } : m))
});

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'sent': {
      const message: ChatMessage = {
        localId: `m${state.nextId}`,
        role: 'owner',
        text: action.text,
        chips: action.chips,
        citations: [],
        cards: [],
        quickReplies: [],
        refused: false,
        serverId: null
      };
      return { ...state, messages: [...state.messages, message], pending: true, error: null, nextId: state.nextId + 1 };
    }
    case 'answered': {
      const a = action.answer;
      const ownerId = (a.proposals || [])
        .map((card) => (card.kind === 'whatif' ? card.record?.confirm?.body : card.confirm?.body)?.message_id)
        .find((id): id is string => typeof id === 'string' && id !== '');
      const asked = state.messages.map((m) => m.role).lastIndexOf('owner');
      const message: ChatMessage = {
        localId: `m${state.nextId}`,
        role: 'assistant',
        text: a.answer,
        chips: [],
        citations: a.citations || [],
        cards: (a.proposals || []).map((card) => ({
          card,
          status: 'proposed' as const,
          sentence: null,
          note: (card.line_id && action.notes?.[card.line_id]) || '',
          noteEdited: false
        })),
        quickReplies: a.quick_replies || [],
        refused: Boolean(a.refused),
        serverId: a.message_id || null
      };
      return {
        ...state,
        conversationId: a.conversation_id || state.conversationId,
        messages: [...state.messages.map((m, i) => (i === asked && ownerId && !m.serverId ? { ...m, serverId: ownerId } : m)), message],
        pending: false,
        error: null,
        nextId: state.nextId + 1
      };
    }
    case 'failed': {
      const lost = statusOf(action.error) === 404 && detailOf(action.error) === 'Conversation not found.';
      return { ...state, pending: false, error: errorSentence(action.error), conversationId: lost ? null : state.conversationId };
    }
    case 'confirming':
      return updateCard(state, action.localId, action.index, (c) =>
        c.status === 'proposed' ? { ...c, status: 'confirming', sentence: null } : c
      );
    case 'confirmed':
      return updateCard(state, action.localId, action.index, (c) =>
        c.status === 'confirming' ? { ...c, status: 'confirmed', sentence: null } : c
      );
    case 'confirmFailed':
      return updateCard(state, action.localId, action.index, (c) => {
        if (c.status !== 'confirming') return c;
        const ends = statusOf(action.error) === 409 && codeOf(action.error) !== 'busy';
        return { ...c, status: ends ? 'ended' : 'proposed', sentence: errorSentence(action.error) };
      });
    case 'dismissed':
      return updateCard(state, action.localId, action.index, (c) => (c.status === 'proposed' ? { ...c, status: 'dismissed' } : c));
    case 'note':
      return updateCard(state, action.localId, action.index, (c) => ({ ...c, note: action.note, noteEdited: true }));
    case 'notes':
      return {
        ...state,
        messages: state.messages.map((m) => ({
          ...m,
          cards: m.cards.map((c) =>
            c.noteEdited || c.status !== 'proposed' || !c.card.line_id ? c : { ...c, note: action.notes[c.card.line_id] ?? '' }
          )
        }))
      };
    default:
      return state;
  }
};

/** The note a card confirms with: hers if she typed on it, else her recorded note on the line now. */
export const noteFor = (state: CardState, notes: Record<string, string>): string =>
  state.noteEdited || !state.card.line_id ? state.note : (notes[state.card.line_id] ?? '');

export interface ConfirmRequest {
  method: 'PUT' | 'PATCH' | 'POST' | 'DELETE';
  url: string;
  data: Record<string, unknown>;
}

/**
 * The call a card's Confirm makes: the card's own method, path (relative to the API base, this plan's only)
 * and body, with only `body.note` from her. `which: 'record'` is a what-if's Record (its own decision call).
 * Null when there is nothing to confirm or the path is not this plan's.
 */
export const confirmRequest = (
  card: ChatCard,
  note: string | undefined,
  apiBase: string,
  planId: string,
  which: 'confirm' | 'record' = 'confirm'
): ConfirmRequest | null => {
  const call = which === 'record' ? card.record?.confirm : card.confirm;
  if (!call) return null;
  const url = relativeApiPath(call.path, apiBase, planId);
  if (!url) return null;
  const data: Record<string, unknown> = { ...(call.body || {}) };
  if (note !== undefined && 'note' in data && (card.kind === 'decision' || which === 'record')) data.note = note;
  return { method: call.method, url, data };
};

const FIELD_WORDS: Record<string, string> = {
  intended_price: 'retail price',
  cost: 'cost',
  suggested_qty: 'our number',
  low_qty: 'the low end',
  high_qty: 'the high end',
  by_size: 'the sizes',
  qty_used: 'the number used',
  used_by_size: 'the sizes used',
  owner_qty: 'your number',
  against_qty: 'ours when you decided',
  cut: 'the budget cut',
  moved: 'what moved',
  what_if: 'the what-if',
  note: 'your note'
};

export const citationLabel = (c: Citation): string => {
  if ('message_id' in c) return 'your message';
  if ('line_id' in c) return FIELD_WORDS[c.field] ?? c.field;
  return c.key;
};

export type CitationTarget =
  | { kind: 'chunk'; domId: string }
  | { kind: 'card'; domId: string; cardKey: string; openKey: string | null }
  | { kind: 'rail'; localId: string; index: number }
  | { kind: 'message'; localId: string };

type Slot = 'why' | 'splitChunk' | 'price' | 'decision' | 'cut' | 'moved';

const FIELD_CHUNK: Record<string, Slot> = {
  suggested_qty: 'why',
  low_qty: 'why',
  high_qty: 'why',
  qty_used: 'why',
  by_size: 'splitChunk',
  used_by_size: 'splitChunk',
  intended_price: 'price',
  cost: 'price',
  owner_qty: 'decision',
  against_qty: 'decision',
  cut: 'cut',
  moved: 'moved'
};

/** The chunk a line's fact names on its card. On a cut card our number is the cut (the trace's line.qty holds the
 * number before the cut, and the cut revision's sizes are the split's); the number and the sizes used are hers
 * once she decided, else ours (the cut on a cut card). */
const slotFor = (field: string, card: { isCut: boolean; cut: unknown; decision: unknown }): Slot | undefined => {
  const cut = card.isCut && card.cut;
  if (field === 'suggested_qty' && cut) return 'cut';
  if (field === 'qty_used') return card.decision ? 'decision' : cut ? 'cut' : 'why';
  if (field === 'used_by_size' && card.decision) return 'decision';
  return FIELD_CHUNK[field];
};

const whatIfCard = (messages: ChatMessage[], match: (c: ChatCard) => boolean): CitationTarget | null => {
  for (let m = messages.length - 1; m >= 0; m -= 1) {
    const index = messages[m].cards.findIndex((c) => c.card.kind === 'whatif' && match(c.card));
    if (index >= 0) return { kind: 'rail', localId: messages[m].localId, index };
  }
  return null;
};

/** Where a citation takes her: a chunk of the memo, a card (with See the numbers at a deeper node), a card in
 * the rail, a message we hold, or nowhere. */
export const citationTarget = (c: Citation, view: MemoView, messages: ChatMessage[], _fromLocalId?: string): CitationTarget | null => {
  const cards = [...view.items, ...view.carried];
  if ('message_id' in c) {
    // The server cites her messages only; one the page has not learned the id of (no card named it, or another
    // conversation's) goes nowhere.
    const held = messages.find((m) => m.role === 'owner' && m.serverId && m.serverId === c.message_id);
    return held ? { kind: 'message', localId: held.localId } : null;
  }
  if ('line_id' in c) {
    const card = cards.find((x) => x.lineId === c.line_id);
    if (card) {
      if (c.field === 'what_if')
        return (
          whatIfCard(messages, (x) => x.line_id === c.line_id) ?? { kind: 'card', domId: card.domId, cardKey: card.key, openKey: null }
        );
      const slot = slotFor(c.field, card);
      const chunk = slot ? card[slot] : null;
      if (chunk) return { kind: 'chunk', domId: chunk.domId };
      return { kind: 'card', domId: card.domId, cardKey: card.key, openKey: null };
    }
    const excluded = view.excludedDomIds[c.line_id];
    return excluded ? { kind: 'chunk', domId: excluded } : null;
  }
  const exact = view.anchors[`${c.trace_id}:${c.key}`];
  if (exact) return { kind: 'chunk', domId: exact.domId };
  const lineId = Object.keys(view.lineTraces).find((id) => view.lineTraces[id] === c.trace_id);
  if (lineId) {
    const card = cards.find((x) => x.lineId === lineId);
    if (card) return { kind: 'card', domId: card.domId, cardKey: card.key, openKey: c.key };
  }
  if (c.key.startsWith('plan.month.')) {
    const row = view.months.rows.find((r) => r.key === c.key);
    if (row) return { kind: 'chunk', domId: row.row.domId };
  }
  return whatIfCard(messages, (x) => x.trace_id === c.trace_id);
};

/** The context a turn sends: what her chips name. */
export const turnContext = (chips: { entry: ContextEntry }[]): ContextEntry[] => chips.map((c) => c.entry);
