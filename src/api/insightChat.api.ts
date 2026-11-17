// The Insights chat (owner trust T10; backend/app/agent/insight_chat_views.py): the routes under
// `/api/v1/agent/insight-chat/`. One open conversation per person and store; up to three cards ride on a message.
//
// The store is the request's `X-Location-Id` (no header = the company view, or a list-grant role's first store;
// the response's `scope` says which). All three routes answer 404 while the server switch is off, and 403 for a
// member: the page reads either as "this chat does not exist for you".
//
// `recommendation_ids` are `Recommendation` ids: the pending list's `recommendation_id`, never its `id`.

import axiosServices from 'utils/axios';

const BASE = '/agent/insight-chat/';

/** A turn may take the server a minute (its model budget); the shared instance gives up at 20 s. */
export const INSIGHT_CHAT_TIMEOUT_MS = 75 * 1000;

export const MAX_MESSAGE_CHARS = 500;
export const MAX_ATTACHED = 3;

export type InsightChatScope = { scope: 'company'; location: null } | { scope: 'location'; location: { id: string; name: string } };

/**
 * Where a fact came from. Only `card` (the Recommendation id, whenever the fact came from a card) and the
 * fields the page names are read; the rest of the object is the server's, kept as sent.
 */
export interface InsightChatSource {
  card?: string | null;
  table?: string;
  read?: string;
  [key: string]: unknown;
}

export interface InsightChatRef {
  ref: string;
  /** The fact's label; a tooltip, never a sentence of the answer. */
  said: string | null;
  /** The exact text printed in the sentence; null for a fact with no figure. */
  figure: string | null;
  source: InsightChatSource;
}

export interface InsightChatSentence {
  text: string;
  refs: InsightChatRef[];
}

export interface InsightChatUserMessage {
  id: string;
  role: 'user';
  text: string;
  created_at: string;
  recommendation_ids: string[];
}

export interface InsightChatAnswerMessage {
  id: string;
  role: 'assistant';
  /** The sentences joined by a space. */
  text: string;
  created_at: string;
  refused: boolean;
  sentences: InsightChatSentence[];
}

export type InsightChatMessage = InsightChatUserMessage | InsightChatAnswerMessage;

export type InsightChatListing = InsightChatScope & {
  conversation_id: string | null;
  messages: InsightChatMessage[];
};

export type InsightChatTurn = InsightChatScope & {
  conversation_id: string;
  user_message: InsightChatUserMessage;
  message: InsightChatAnswerMessage;
};

export type InsightChatFresh = InsightChatScope & { conversation_id: string; messages: [] };

export interface InsightChatSend {
  message: string;
  recommendation_ids: string[];
}

const scoped = (locationId?: string | null) => (locationId ? { headers: { 'X-Location-Id': locationId } } : {});

export const InsightChatAPI = {
  /** The open conversation for this store, or an empty list. 404 or 403 means the chat is not there for her. */
  get: async (locationId?: string | null): Promise<InsightChatListing> => {
    const { data } = await axiosServices.get(BASE, scoped(locationId));
    return data;
  },

  send: async (payload: InsightChatSend, locationId?: string | null): Promise<InsightChatTurn> => {
    const { data } = await axiosServices.post(BASE, payload, { ...scoped(locationId), timeout: INSIGHT_CHAT_TIMEOUT_MS });
    return data;
  },

  /** Close the open conversation and start a fresh one (an empty open one is reused). */
  startNew: async (locationId?: string | null): Promise<InsightChatFresh> => {
    const { data } = await axiosServices.post(`${BASE}new/`, {}, scoped(locationId));
    return data;
  }
};
