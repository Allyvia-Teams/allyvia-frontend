// The Insights chat's calls, run for InsightsPage (owner trust T11). Every decision is insightChat.ts's; this
// hook only holds the state, makes the three requests and hands the page one object.
//
// The state lives in a ref as well as in React state, so a handler that runs right after another (attach, then
// send) reads what the first one wrote rather than last render's copy. A reply is applied only if the store has
// not changed since it was asked (insightChat.ts `epoch`).
//
// api/insightChat.api is imported when used, not at the top: it pulls in utils/axios, which cannot load in the
// page's static-render tests (the adapter does the same for agent.api).

import { useCallback, useEffect, useRef, useState } from 'react';

import { askMessage } from './askAbout';
import {
  attachCard,
  attachState,
  canSend,
  chatLoadFailed,
  chatLoaded,
  detachCard,
  detachMissing,
  errorSentence,
  initialChatState,
  MAX_MESSAGE_CHARS,
  newConversation,
  readChatOpen,
  resetForStore,
  sendFailed,
  sendStarted,
  sendSucceeded,
  setDraft,
  setOpen,
  writeChatOpen,
  type AttachedCard,
  type ChatState
} from './insightChat';
import type { Recommendation } from './types';

const api = () => import('api/insightChat.api').then((m) => m.InsightChatAPI);

export interface InsightChatControls {
  state: ChatState;
  /** The rail exists for this person: the first read worked (never in mock mode). */
  available: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDraft: (text: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onNew: () => void;
  onAttach: (rec: Recommendation) => void;
  onDetach: (recommendationId: string) => void;
  /** "Ask about this": attach, open, and send the question at once. */
  onAsk: (rec: Recommendation) => void;
  /** The ids of the cards the page lists now; any attached card not among them is detached. */
  syncCards: (ids: ReadonlySet<string>) => void;
}

const asAttached = (rec: Recommendation): AttachedCard | null =>
  rec.recommendationId ? { id: rec.id, recommendationId: rec.recommendationId, title: rec.title } : null;

/**
 * @param live       false in mock mode (and off): the chat does not exist, and nothing is requested.
 * @param locationId the store from `?location_id=`, sent as X-Location-Id; a change loads that store's conversation.
 * @param wide       the viewport shows the rail as a column; only then is open or collapsed remembered.
 */
export default function useInsightChat({
  live,
  locationId,
  wide
}: {
  live: boolean;
  locationId: string | null;
  wide: boolean;
}): InsightChatControls {
  const [state, setState] = useState<ChatState>(() => initialChatState(wide && readChatOpen()));
  const stateRef = useRef(state);
  const locationRef = useRef(locationId);
  locationRef.current = locationId;

  const update = useCallback((next: (s: ChatState) => ChatState) => {
    stateRef.current = next(stateRef.current);
    setState(stateRef.current);
  }, []);

  // Read the conversation once, and again for each store. The first read doubles as "does the chat exist".
  const seenLocation = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!live) {
      update((s) => chatLoadFailed(s, { response: { status: 404 } }));
      return undefined;
    }
    if (seenLocation.current !== undefined && seenLocation.current !== locationId) update(resetForStore);
    seenLocation.current = locationId;
    const epoch = stateRef.current.epoch;
    let cancelled = false;
    api()
      .then((chat) => chat.get(locationId))
      .then((listing) => {
        if (!cancelled && stateRef.current.epoch === epoch) update((s) => chatLoaded(s, listing));
      })
      .catch((error: unknown) => {
        if (!cancelled && stateRef.current.epoch === epoch) update((s) => chatLoadFailed(s, error));
      });
    return () => {
      cancelled = true;
    };
  }, [live, locationId, update]);

  const send = useCallback(
    (message: string, recommendationIds?: string[]) => {
      const current = stateRef.current;
      if (current.pending || current.availability !== 'available') return;
      const request = { message, recommendationIds: recommendationIds ?? current.attached.map((c) => c.recommendationId) };
      const epoch = current.epoch;
      update((s) => sendStarted(s, request));
      api()
        .then((chat) => chat.send({ message: request.message, recommendation_ids: request.recommendationIds }, locationRef.current))
        .then((turn) => update((s) => sendSucceeded(s, epoch, turn)))
        .catch((error: unknown) => update((s) => sendFailed(s, epoch, request, error)));
    },
    [update]
  );

  const open = useCallback(
    (next: boolean) => {
      update((s) => setOpen(s, next));
      if (wide) writeChatOpen(next);
    },
    [update, wide]
  );

  const syncCards = useCallback((ids: ReadonlySet<string>) => update((s) => detachMissing(s, ids)), [update]);

  return {
    state,
    available: state.availability === 'available',
    onOpen: () => open(true),
    onClose: () => open(false),
    onDraft: (text) => update((s) => setDraft(s, text)),
    onSend: () => {
      const s = stateRef.current;
      if (canSend(s)) send(s.draft.trim());
    },
    onRetry: () => {
      const failed = stateRef.current.failed;
      if (failed) send(failed.message, failed.recommendationIds);
    },
    onNew: () => {
      if (stateRef.current.pending) return;
      const epoch = stateRef.current.epoch;
      api()
        .then((chat) => chat.startNew(locationRef.current))
        .then((fresh) => {
          if (stateRef.current.epoch === epoch) update((s) => newConversation(s, fresh));
        })
        .catch((error: unknown) => {
          if (stateRef.current.epoch === epoch) update((s) => ({ ...s, error: errorSentence(error), failed: null }));
        });
    },
    onAttach: (rec) => {
      const card = asAttached(rec);
      if (!card) return;
      update((s) => attachCard(s, card));
      open(true);
    },
    onDetach: (recommendationId) => update((s) => detachCard(s, recommendationId)),
    onAsk: (rec) => {
      const card = asAttached(rec);
      if (!card) return;
      const refused = attachState(stateRef.current, card.recommendationId) === 'full';
      update((s) => attachCard(s, card));
      open(true);
      if (refused) return;
      // A turn is still running: the question waits in the input rather than being lost.
      const question = askMessage(rec.title).slice(0, MAX_MESSAGE_CHARS);
      if (stateRef.current.pending) update((s) => setDraft(s, question));
      else send(question);
    },
    syncCards
  };
}
