// The Insights chat's state and rules (owner trust T11), pure. InsightsPage owns the calls (useInsightChat.ts
// runs them) and InsightChatRail draws; this file decides what each call's outcome does to the conversation, the
// attached cards, the draft and the words on screen.
//
// `import type` only from api/insightChat.api: the real module pulls in utils/axios, which dies on sessionStorage
// under vitest.
//
// Copy rule: plain store words. Never "AI", "model", "ref", "citation" or "tool" on screen.

import type {
  InsightChatAnswerMessage,
  InsightChatListing,
  InsightChatFresh,
  InsightChatSource,
  InsightChatTurn
} from 'api/insightChat.api';

import { shortTitle } from './insightsView';
import { readSectionOpen, writeSectionOpen } from './sectionState';

export const MAX_MESSAGE_CHARS = 500;
export const MAX_ATTACHED = 3;
export const COUNTER_FROM = 400;

export const UP_TO_THREE = 'Up to 3 at a time';
export const REFUSED_HINT = 'Try attaching the recommendation you are asking about.';
export const EARLIER_CARD = 'An earlier recommendation';

// --- state ----------------------------------------------------------------------

/** `unknown` until the first read answers; `unavailable` (404 or 403) means no rail and no button change. */
export type Availability = 'unknown' | 'available' | 'unavailable';

/** A card she has put in the chat: the page's id for it and the Recommendation id the server takes. */
export interface AttachedCard {
  id: string;
  recommendationId: string;
  title: string;
}

export interface SendRequest {
  message: string;
  recommendationIds: string[];
}

export type LogMessage =
  | { key: string; role: 'user'; text: string; recommendationIds: string[]; local?: boolean }
  | { key: string; role: 'assistant'; text: string; refused: boolean; sentences: InsightChatAnswerMessage['sentences'] };

export interface ChatState {
  availability: Availability;
  /** The first read failed for a reason other than "not there": the rail shows, the conversation did not load. */
  loadError: boolean;
  conversationId: string | null;
  messages: LogMessage[];
  pending: boolean;
  /** The sentence for the last failed send. */
  error: string | null;
  /** The send that failed, for Retry. */
  failed: SendRequest | null;
  attached: AttachedCard[];
  /** A quiet line under the cards ("Up to 3 at a time"). */
  notice: string | null;
  draft: string;
  open: boolean;
  /** Bumps when the store changes, so a late reply for the old store is dropped. */
  epoch: number;
}

export const initialChatState = (open = false): ChatState => ({
  availability: 'unknown',
  loadError: false,
  conversationId: null,
  messages: [],
  pending: false,
  error: null,
  failed: null,
  attached: [],
  notice: null,
  draft: '',
  open,
  epoch: 0
});

const logFrom = (messages: InsightChatListing['messages']): LogMessage[] =>
  messages.map((m) =>
    m.role === 'user'
      ? { key: m.id, role: 'user', text: m.text, recommendationIds: m.recommendation_ids ?? [] }
      : { key: m.id, role: 'assistant', text: m.text, refused: !!m.refused, sentences: m.sentences ?? [] }
  );

const statusOf = (error: unknown): number | undefined => (error as { response?: { status?: number } } | null | undefined)?.response?.status;

// --- availability ------------------------------------------------------------------

export const chatLoaded = (state: ChatState, listing: InsightChatListing): ChatState => ({
  ...state,
  availability: 'available',
  loadError: false,
  conversationId: listing.conversation_id,
  messages: logFrom(listing.messages)
});

/** 404 (switched off) and 403 (a member) mean the chat does not exist for her; anything else is a bad moment. */
export const chatLoadFailed = (state: ChatState, error: unknown): ChatState => {
  const status = statusOf(error);
  if (status === 404 || status === 403) return { ...state, availability: 'unavailable', loadError: false, open: false };
  return { ...state, availability: 'available', loadError: true };
};

// --- sending -------------------------------------------------------------------------

export const canSend = (state: ChatState): boolean => {
  const text = state.draft.trim();
  return state.availability === 'available' && !state.pending && text.length > 0 && state.draft.length <= MAX_MESSAGE_CHARS;
};

export const counterText = (length: number): string | null => (length >= COUNTER_FROM ? `${length} / ${MAX_MESSAGE_CHARS}` : null);

/** Her message goes into the log at once and out of the input; if the send fails it comes back. */
export const sendStarted = (state: ChatState, request: SendRequest): ChatState => ({
  ...state,
  pending: true,
  error: null,
  failed: null,
  notice: null,
  draft: '',
  messages: [
    ...state.messages,
    {
      key: `local-${state.messages.length}`,
      role: 'user',
      text: request.message,
      recommendationIds: request.recommendationIds,
      local: true
    }
  ]
});

export const sendSucceeded = (state: ChatState, epoch: number, turn: InsightChatTurn): ChatState => {
  if (epoch !== state.epoch) return state;
  const kept = state.messages.filter((m) => !(m.role === 'user' && m.local));
  return {
    ...state,
    pending: false,
    conversationId: turn.conversation_id,
    messages: [
      ...kept,
      {
        key: turn.user_message.id,
        role: 'user',
        text: turn.user_message.text,
        recommendationIds: turn.user_message.recommendation_ids ?? []
      },
      {
        key: turn.message.id,
        role: 'assistant',
        text: turn.message.text,
        refused: !!turn.message.refused,
        sentences: turn.message.sentences ?? []
      }
    ]
  };
};

/** Her words go back in the input (unless she has typed something new meanwhile) and the sentence says why. */
export const sendFailed = (state: ChatState, epoch: number, request: SendRequest, error: unknown): ChatState => {
  if (epoch !== state.epoch) return state;
  return {
    ...state,
    pending: false,
    error: errorSentence(error),
    failed: request,
    draft: state.draft === '' ? request.message : state.draft,
    messages: state.messages.filter((m) => !(m.role === 'user' && m.local))
  };
};

export const setDraft = (state: ChatState, draft: string): ChatState => (draft === state.draft ? state : { ...state, draft });
export const setOpen = (state: ChatState, open: boolean): ChatState => (open === state.open ? state : { ...state, open });

// --- attached cards -----------------------------------------------------------------------

export const attachState = (state: ChatState, recommendationId: string): 'ok' | 'already' | 'full' => {
  if (state.attached.some((c) => c.recommendationId === recommendationId)) return 'already';
  return state.attached.length >= MAX_ATTACHED ? 'full' : 'ok';
};

export const attachCard = (state: ChatState, card: AttachedCard): ChatState => {
  const result = attachState(state, card.recommendationId);
  if (result === 'already') return state;
  if (result === 'full') return { ...state, notice: UP_TO_THREE };
  return { ...state, attached: [...state.attached, card], notice: null };
};

export const detachCard = (state: ChatState, recommendationId: string): ChatState => ({
  ...state,
  attached: state.attached.filter((c) => c.recommendationId !== recommendationId),
  notice: null
});

/** Detach every card whose page id is not in `present` (a dismissed card, or one the list no longer has). */
export const detachMissing = (state: ChatState, present: ReadonlySet<string>): ChatState => {
  const attached = state.attached.filter((c) => present.has(c.id));
  return attached.length === state.attached.length ? state : { ...state, attached, notice: null };
};

// --- new conversation, new store ---------------------------------------------------------------

export const newConversation = (state: ChatState, fresh: InsightChatFresh): ChatState => ({
  ...state,
  conversationId: fresh.conversation_id,
  messages: [],
  pending: false,
  error: null,
  failed: null,
  notice: null
});

/** Another store: its own conversation and its own cards. The open state and what she was typing stay. */
export const resetForStore = (state: ChatState): ChatState => ({
  ...initialChatState(state.open),
  draft: state.draft,
  epoch: state.epoch + 1
});

// --- the words ----------------------------------------------------------------------------------------

const NO_REACH = 'That did not reach Allyvia. Check your connection and try again.';
const TIMED_OUT = 'That is taking longer than it should. Try again in a moment.';
const BY_CODE: Record<string, string> = {
  message: 'Your question needs 1 to 500 characters of plain text.',
  recommendation_ids: 'Up to 3 recommendations at a time.',
  user: 'Sign in again to use Ask Allyvia.'
};

const bodyOf = (error: unknown): { detail?: unknown; code?: unknown } => {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
  return data && typeof data === 'object' ? (data as { detail?: unknown; code?: unknown }) : {};
};

export const errorSentence = (error: unknown): string => {
  const status = statusOf(error);
  if (status === undefined) {
    const e = error as { code?: string; message?: string } | null | undefined;
    const timedOut = e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT' || /timeout/i.test(e?.message ?? '');
    return timedOut ? TIMED_OUT : NO_REACH;
  }
  const { detail, code } = bodyOf(error);
  if (status === 400) {
    if (typeof code === 'string' && BY_CODE[code]) return BY_CODE[code];
    return typeof detail === 'string' && detail ? detail : 'That could not be sent. Try again.';
  }
  if (status === 403) return 'Only an owner or an admin can ask Allyvia.';
  if (status === 404) return 'That recommendation is no longer available.';
  if (status === 429) return 'Give it a minute, then ask again.';
  if (status === 503)
    return typeof detail === 'string' && detail ? detail : 'Ask Allyvia is not available right now. Try again in a minute.';
  return 'Something went wrong. Try again.';
};

// --- the answer's figures ----------------------------------------------------------------------------------

export interface RefChip {
  key: string;
  /** The figure as printed in the sentence, else a short source word. */
  label: string;
  /** What the fact is, for the tooltip. */
  tooltip: string;
  /** The page's id for the card this came from, when that card is on the page; null makes it plain text. */
  cardId: string | null;
  /** The document this came from (owner trust T12): the chip opens it. */
  documentId: string | null;
}

/** A fact read out of one of her documents (owner trust T12): `{table: "documents.Document", id, name, passage}`. */
export const isDocumentSource = (source: InsightChatSource): boolean =>
  source.table === 'documents.Document' && typeof source.id === 'string' && !!source.id;

/** A short word for where a fact came from, for a fact with no figure of its own. */
export const sourceWord = (source: InsightChatSource): string => {
  if (source.table === 'documents.Document') return 'Document';
  if (source.table === 'agent.BusinessLearning') return 'Store rule';
  if (source.table === 'inventory.Supplier') return 'Vendor';
  if (source.read === 'agent.health') return 'Business health';
  if (source.read === 'precedents.outlook') return 'Upcoming days';
  if (source.card) return 'This recommendation';
  return 'Your data';
};

/** One chip per distinct reference across the answer's sentences, in order. */
export const refChips = (
  message: Pick<InsightChatAnswerMessage, 'sentences'>,
  cardOnPage: (recommendationId: string) => string | null
): RefChip[] => {
  const seen = new Set<string>();
  const chips: RefChip[] = [];
  for (const sentence of message.sentences ?? []) {
    for (const ref of sentence.refs ?? []) {
      if (seen.has(ref.ref)) continue;
      seen.add(ref.ref);
      const card = ref.source?.card;
      const source = ref.source ?? {};
      if (isDocumentSource(source)) {
        // A document's passage or figure: labelled "Document", the document's name beside the excerpt.
        const name = typeof source.name === 'string' ? source.name : '';
        const said = (ref.said ?? '').replace(/^From .*?: /, '');
        chips.push({
          key: ref.ref,
          label: 'Document',
          tooltip: name ? `${name}: ${said}` : said,
          cardId: null,
          documentId: source.id as string
        });
        continue;
      }
      chips.push({
        key: ref.ref,
        label: ref.figure || sourceWord(source),
        tooltip: ref.said ?? '',
        cardId: typeof card === 'string' && card ? cardOnPage(card) : null,
        documentId: null
      });
    }
  }
  return chips;
};

/** The small labels under her message: the short titles of the cards she attached. */
export const userMessageLabels = (recommendationIds: readonly string[], titleOf: (recommendationId: string) => string | null): string[] =>
  recommendationIds.map((id) => {
    const title = titleOf(id);
    return title ? shortTitle(title) : EARLIER_CARD;
  });

// --- open or collapsed, remembered per browser ----------------------------------------------------------

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const CHAT_SECTION = 'chat';

export const readChatOpen = (storage?: StorageLike | null): boolean =>
  storage === undefined ? readSectionOpen(CHAT_SECTION) : readSectionOpen(CHAT_SECTION, storage);

export const writeChatOpen = (open: boolean, storage?: StorageLike | null): void => {
  if (storage === undefined) writeSectionOpen(CHAT_SECTION, open);
  else writeSectionOpen(CHAT_SECTION, open, storage);
};
