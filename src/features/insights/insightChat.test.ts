import { describe, expect, it } from 'vitest';

import type { InsightChatAnswerMessage, InsightChatListing, InsightChatTurn } from 'api/insightChat.api';

import {
  UP_TO_THREE,
  attachCard,
  attachState,
  canSend,
  chatLoadFailed,
  chatLoaded,
  counterText,
  detachCard,
  detachMissing,
  errorSentence,
  initialChatState,
  newConversation,
  readChatOpen,
  refChips,
  resetForStore,
  sendFailed,
  sendStarted,
  sendSucceeded,
  setDraft,
  setOpen,
  sourceWord,
  userMessageLabels,
  writeChatOpen,
  type AttachedCard,
  type ChatState
} from './insightChat';
import { memoryStorage } from './testing/memoryStorage';

const card = (n: number): AttachedCard => ({ id: `pending-${n}`, recommendationId: `rec-${n}`, title: `Card ${n}` });

const ready = (over: Partial<ChatState> = {}): ChatState => ({
  ...chatLoaded(initialChatState(), { scope: 'company', location: null, conversation_id: null, messages: [] }),
  ...over
});

const answer = (over: Partial<InsightChatAnswerMessage> = {}): InsightChatAnswerMessage => ({
  id: 'a1',
  role: 'assistant',
  text: 'The plan orders 13 units. There are 5 on the shelf.',
  created_at: '2026-11-17T10:00:00Z',
  refused: false,
  sentences: [
    {
      text: 'The plan orders 13 units.',
      refs: [{ ref: 'r1', said: 'Units to order', figure: '13 units', source: { trace: 'reorder', key: 'reorder.qty', card: 'rec-1' } }]
    }
  ],
  ...over
});

const turn = (message = answer()): InsightChatTurn => ({
  scope: 'company',
  location: null,
  conversation_id: 'c1',
  user_message: { id: 'u1', role: 'user', text: 'Why 13?', created_at: '2026-11-17T10:00:00Z', recommendation_ids: ['rec-1'] },
  message
});

const httpError = (status: number, data: unknown = {}) => ({ response: { status, data } });

describe('loading', () => {
  it('a first read that works makes the chat available and lists the conversation', () => {
    const listing: InsightChatListing = {
      scope: 'company',
      location: null,
      conversation_id: 'c1',
      messages: [{ id: 'u1', role: 'user', text: 'Hi', created_at: 'x', recommendation_ids: [] }, answer()]
    };
    const state = chatLoaded(initialChatState(), listing);
    expect(state.availability).toBe('available');
    expect(state.conversationId).toBe('c1');
    expect(state.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('404 and 403 mean the chat does not exist for her', () => {
    expect(chatLoadFailed(initialChatState(), httpError(404)).availability).toBe('unavailable');
    expect(chatLoadFailed(initialChatState(), httpError(403)).availability).toBe('unavailable');
  });

  it('any other failure keeps the rail and says the conversation did not load', () => {
    const state = chatLoadFailed(initialChatState(), httpError(500));
    expect(state.availability).toBe('available');
    expect(state.loadError).toBe(true);
    expect(chatLoadFailed(initialChatState(), new Error('network')).loadError).toBe(true);
  });
});

describe('sending', () => {
  it('puts her message in the log at once and clears the input, with the send held for retry', () => {
    const state = sendStarted(setDraft(ready({ attached: [card(1)] }), 'Why 13?'), { message: 'Why 13?', recommendationIds: ['rec-1'] });
    expect(state.pending).toBe(true);
    expect(state.draft).toBe('');
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({ role: 'user', text: 'Why 13?', recommendationIds: ['rec-1'] });
  });

  it('sending clears a leftover notice such as "Up to 3 at a time"', () => {
    const state = sendStarted(ready({ notice: UP_TO_THREE }), { message: 'Why?', recommendationIds: [] });
    expect(state.notice).toBeNull();
  });

  it('the input stays editable while the turn is pending', () => {
    const state = setDraft(sendStarted(ready(), { message: 'Why?', recommendationIds: [] }), 'And the next one?');
    expect(state.draft).toBe('And the next one?');
    expect(canSend(state)).toBe(false); // but Send waits
  });

  it('an answer replaces her local message with the stored one and adds the reply', () => {
    const started = sendStarted(ready(), { message: 'Why 13?', recommendationIds: ['rec-1'] });
    const state = sendSucceeded(started, started.epoch, turn());
    expect(state.pending).toBe(false);
    expect(state.conversationId).toBe('c1');
    expect(state.messages.map((m) => ('id' in m ? m.id : m.key))).toEqual(['u1', 'a1']);
  });

  it('a failed send keeps her text in the input and says why, with the send held for Retry', () => {
    const request = { message: 'Why 13?', recommendationIds: ['rec-1'] };
    const started = sendStarted(setDraft(ready(), 'Why 13?'), request);
    const state = sendFailed(started, started.epoch, request, httpError(429));
    expect(state.draft).toBe('Why 13?');
    expect(state.error).toBe('Give it a minute, then ask again.');
    expect(state.failed).toEqual(request);
    expect(state.pending).toBe(false);
    expect(state.messages).toHaveLength(0);
  });

  it('a failed send does not overwrite what she has typed since', () => {
    const request = { message: 'Why 13?', recommendationIds: [] };
    const started = setDraft(sendStarted(ready(), request), 'A different question');
    const state = sendFailed(
      started,
      started.epoch,
      request,
      httpError(503, { detail: 'The assistant is not available right now; try again in a minute.' })
    );
    expect(state.draft).toBe('A different question');
    expect(state.failed).toEqual(request);
  });

  it('starting another send clears the old error and the held send', () => {
    const request = { message: 'Why 13?', recommendationIds: [] };
    const started = sendStarted(ready(), request);
    const failed = sendFailed(started, started.epoch, request, httpError(429));
    const again = sendStarted(failed, request);
    expect(again.error).toBeNull();
    expect(again.failed).toBeNull();
  });

  it('a reply for another store, arriving late, changes nothing', () => {
    const started = sendStarted(ready(), { message: 'Why?', recommendationIds: [] });
    const moved = resetForStore(started);
    expect(sendSucceeded(moved, started.epoch, turn())).toBe(moved);
    expect(sendFailed(moved, started.epoch, { message: 'Why?', recommendationIds: [] }, httpError(500))).toBe(moved);
  });

  it('Send needs text, no pending turn, a working chat, and at most 500 characters', () => {
    expect(canSend(ready())).toBe(false);
    expect(canSend(setDraft(ready(), '   '))).toBe(false);
    expect(canSend(setDraft(ready(), 'Why?'))).toBe(true);
    expect(canSend(setDraft(ready(), 'x'.repeat(500)))).toBe(true);
    expect(canSend(setDraft(ready(), 'x'.repeat(501)))).toBe(false);
    expect(canSend(setDraft(initialChatState(), 'Why?'))).toBe(false);
  });

  it('the counter shows from 400 characters', () => {
    expect(counterText(399)).toBeNull();
    expect(counterText(400)).toBe('400 / 500');
    expect(counterText(500)).toBe('500 / 500');
  });
});

describe('attaching cards', () => {
  it('takes up to three, once each', () => {
    let state = ready();
    state = attachCard(state, card(1));
    state = attachCard(state, card(2));
    state = attachCard(state, card(2));
    state = attachCard(state, card(3));
    expect(state.attached.map((c) => c.recommendationId)).toEqual(['rec-1', 'rec-2', 'rec-3']);
  });

  it('refuses a fourth with "Up to 3 at a time"', () => {
    const full = [1, 2, 3].reduce((s, n) => attachCard(s, card(n)), ready());
    const state = attachCard(full, card(4));
    expect(state.attached).toHaveLength(3);
    expect(state.attached.map((c) => c.recommendationId)).not.toContain('rec-4');
    expect(state.notice).toBe(UP_TO_THREE);
    expect(UP_TO_THREE).toBe('Up to 3 at a time');
  });

  it('says in advance whether a card would attach', () => {
    const full = [1, 2, 3].reduce((s, n) => attachCard(s, card(n)), ready());
    expect(attachState(full, 'rec-2')).toBe('already');
    expect(attachState(full, 'rec-4')).toBe('full');
    expect(attachState(ready(), 'rec-4')).toBe('ok');
  });

  it('detaches one card, or every card the page no longer shows', () => {
    const state = [1, 2, 3].reduce((s, n) => attachCard(s, card(n)), ready({ notice: UP_TO_THREE }));
    expect(detachCard(state, 'rec-2').attached.map((c) => c.recommendationId)).toEqual(['rec-1', 'rec-3']);
    expect(detachCard(state, 'rec-2').notice).toBeNull();
    expect(detachMissing(state, new Set(['pending-1', 'pending-3'])).attached.map((c) => c.id)).toEqual(['pending-1', 'pending-3']);
    expect(detachMissing(state, new Set(['pending-1', 'pending-2', 'pending-3']))).toBe(state);
  });
});

describe('new conversation and store changes', () => {
  it('a new conversation clears the messages and keeps the attached cards', () => {
    const state = newConversation(
      sendSucceeded(sendStarted(attachCard(ready(), card(1)), { message: 'Why?', recommendationIds: ['rec-1'] }), 0, turn()),
      { scope: 'company', location: null, conversation_id: 'c2', messages: [] }
    );
    expect(state.messages).toEqual([]);
    expect(state.conversationId).toBe('c2');
    expect(state.attached).toHaveLength(1);
  });

  it('switching store forgets the conversation and the attached cards, and asks again', () => {
    const state = resetForStore(attachCard(setOpen(setDraft(ready(), 'Draft'), true), card(1)));
    expect(state.availability).toBe('unknown');
    expect(state.messages).toEqual([]);
    expect(state.attached).toEqual([]);
    expect(state.open).toBe(true);
    expect(state.draft).toBe('Draft');
    expect(state.epoch).toBe(1);
  });
});

describe('error words', () => {
  it.each([
    [400, { code: 'message' }, 'Your question needs 1 to 500 characters of plain text.'],
    [400, { code: 'recommendation_ids' }, 'Up to 3 recommendations at a time.'],
    [400, { code: 'user' }, 'Sign in again to use Ask Allyvia.'],
    [400, { code: 'something_new', detail: 'Words from the server.' }, 'Words from the server.'],
    [403, {}, 'Only an owner or an admin can ask Allyvia.'],
    [404, { detail: 'Recommendation not found.' }, 'That recommendation is no longer available.'],
    [429, {}, 'Give it a minute, then ask again.'],
    [
      503,
      { detail: 'The assistant is not available right now; try again in a minute.' },
      'The assistant is not available right now; try again in a minute.'
    ],
    [503, {}, 'Ask Allyvia is not available right now. Try again in a minute.'],
    [500, {}, 'Something went wrong. Try again.']
  ])('%i %j', (status, data, sentence) => {
    expect(errorSentence(httpError(status, data))).toBe(sentence);
  });

  it('a timeout and a lost connection each have their own words', () => {
    expect(errorSentence({ code: 'ECONNABORTED', message: 'timeout of 75000ms exceeded' })).toBe(
      'That is taking longer than it should. Try again in a moment.'
    );
    expect(errorSentence({ message: 'Network Error' })).toBe('That did not reach Allyvia. Check your connection and try again.');
    expect(errorSentence(undefined)).toBe('That did not reach Allyvia. Check your connection and try again.');
  });

  it('never says AI, model, ref, citation or tool', () => {
    const all = [
      UP_TO_THREE,
      ...[400, 403, 404, 429, 503, 500].map((s) => errorSentence(httpError(s))),
      errorSentence({ code: 'ECONNABORTED' }),
      errorSentence(undefined)
    ];
    for (const sentence of all) expect(sentence).not.toMatch(/\b(AI|model|refs?|citations?|tool)\b/i);
  });
});

describe('ref chips', () => {
  const onPage = (map: Record<string, string>) => (recommendationId: string) => map[recommendationId] ?? null;

  it('labels a chip with the figure when there is one, else a short source word', () => {
    const message = answer({
      sentences: [
        {
          text: 'a',
          refs: [
            { ref: 'r1', said: 'Units to order', figure: '13 units', source: { card: 'rec-1' } },
            {
              ref: 'r2',
              said: 'No supplier has more than 12',
              figure: null,
              source: { table: 'agent.BusinessLearning', read: 'store_rules' }
            },
            { ref: 'r3', said: 'Reading', figure: null, source: { read: 'agent.health', field: 'score', store: null } },
            { ref: 'r4', said: 'Day', figure: null, source: { read: 'precedents.outlook', store: 's', date: 'd', part: 'p' } },
            { ref: 'r5', said: 'Minimum', figure: null, source: { table: 'inventory.Supplier', id: '1', field: 'minimum', card: 'rec-1' } }
          ]
        }
      ]
    });
    const chips = refChips(message, onPage({ 'rec-1': 'pending-1' }));
    expect(chips.map((c) => c.label)).toEqual(['13 units', 'Store rule', 'Business health', 'Upcoming days', 'Vendor']);
    expect(chips[0].tooltip).toBe('Units to order');
  });

  it('a chip is a button only when its card is on the page', () => {
    const message = answer({
      sentences: [
        {
          text: 'a',
          refs: [
            { ref: 'r1', said: null, figure: '13 units', source: { card: 'rec-1' } },
            { ref: 'r2', said: null, figure: '4 units', source: { card: 'rec-9' } },
            { ref: 'r3', said: null, figure: null, source: { table: 'agent.BusinessLearning' } },
            { ref: 'r4', said: null, figure: '5 units', source: { card: null } }
          ]
        }
      ]
    });
    const chips = refChips(message, onPage({ 'rec-1': 'pending-1' }));
    expect(chips.map((c) => c.cardId)).toEqual(['pending-1', null, null, null]);
  });

  it('the same reference cited twice is one chip', () => {
    const ref = { ref: 'r1', said: 'Units', figure: '13 units', source: { card: 'rec-1' } };
    const message = answer({
      sentences: [
        { text: 'a', refs: [ref] },
        { text: 'b', refs: [ref, { ...ref, ref: 'r2', figure: '5 units' }] }
      ]
    });
    expect(refChips(message, onPage({})).map((c) => c.label)).toEqual(['13 units', '5 units']);
  });

  it('says a source word for each kind of source', () => {
    expect(sourceWord({ table: 'agent.BusinessLearning' })).toBe('Store rule');
    expect(sourceWord({ table: 'inventory.Supplier' })).toBe('Vendor');
    expect(sourceWord({ read: 'agent.health' })).toBe('Business health');
    expect(sourceWord({ read: 'precedents.outlook' })).toBe('Upcoming days');
    expect(sourceWord({ card: 'rec-1' })).toBe('This recommendation');
    expect(sourceWord({})).toBe('Your data');
  });
});

describe('her message labels', () => {
  it('names the cards she attached, by their short titles, and says so when a card has left the page', () => {
    const labels = userMessageLabels(['rec-1', 'rec-2'], (id) =>
      id === 'rec-1' ? 'Reorder the Mara cable-knit sweater in M and L before Saturday' : null
    );
    expect(labels).toEqual(['Reorder the Mara cable-knit sweater in…', 'An earlier recommendation']);
    expect(userMessageLabels([], () => null)).toEqual([]);
  });
});

describe('open or collapsed', () => {
  it('is remembered per browser, and collapsed when storage says nothing or fails', () => {
    const storage = memoryStorage();
    expect(readChatOpen(storage)).toBe(false);
    writeChatOpen(true, storage);
    expect(readChatOpen(storage)).toBe(true);
    writeChatOpen(false, storage);
    expect(readChatOpen(storage)).toBe(false);
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    };
    expect(readChatOpen(broken)).toBe(false);
    expect(() => writeChatOpen(true, broken)).not.toThrow();
    expect(readChatOpen(null)).toBe(false);
  });
});
