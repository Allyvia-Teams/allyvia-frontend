import { describe, expect, it } from 'vitest';

import type { Answer, ChatCard } from 'api/buying.api';

import {
  chatReducer,
  citationLabel,
  citationTarget,
  confirmRequest,
  errorSentence,
  initialChat,
  isKillSwitch,
  type ChatState
} from './chat';
import { ownerMemoView } from './memo';
import {
  card,
  DRESS,
  DRESS_TRACE,
  hex,
  memoResponse,
  MONTH_TRACE,
  OLD,
  PLAN_ID,
  planDetail,
  traceChunk,
  treeChunk,
  value
} from './planFixtures';

const BASE = 'http://127.0.0.1:8069/api/v1/';
const view = ownerMemoView(memoResponse(), planDetail().lines, BASE);

const decisionCard: ChatCard = {
  kind: 'decision',
  line_id: DRESS,
  line: 'Wrap Dress',
  sentence: 'Record 48 as your number for the Wrap Dress (ours 40).',
  before: { qty: 40, source: 'planner' },
  after: { qty: 48 },
  confirm: {
    method: 'PUT',
    path: `/api/v1/buy/plans/${PLAN_ID}/lines/${DRESS}/decision/`,
    body: { owner_qty: 48, against_revision: 3, via: 'chat', note: '', message_id: 'm-owner-1' }
  }
};

const whatIf: ChatCard = {
  kind: 'whatif',
  line_id: DRESS,
  line: 'Wrap Dress',
  sentence: '40 → 46 at 70% sell-through.',
  before: { qty: 40, low: 34, high: 49, revision: 3, trace_id: DRESS_TRACE },
  after: { qty: 46, low: 40, high: 55 },
  confirm: null,
  overrides: { target_sell_through: '0.700' },
  trace_id: 'hyp-trace-1',
  record: {
    sentence: 'Record 46 as your number.',
    confirm: {
      method: 'PUT',
      path: `/api/v1/buy/plans/${PLAN_ID}/lines/${DRESS}/decision/`,
      body: { owner_qty: 46, against_revision: 3, via: 'chat', note: '', message_id: 'm-owner-2' }
    }
  }
};

const answer = (extra: Partial<Answer> = {}): Answer => ({
  answer: 'Dresses were 20% of April last year; at 80% that is 40.',
  citations: [{ trace_id: DRESS_TRACE, key: 'line.qty' }],
  proposals: [decisionCard],
  quick_replies: ['Higher', 'Lower'],
  conversation_id: 'conv-1',
  message_id: 'm-assistant-1',
  refused: false,
  ...extra
});

const afterAnswer = (): ChatState => {
  let s = chatReducer(initialChat(), { type: 'sent', text: 'why 40 and not 55', chips: ['Wrap Dress · Buy 40'] });
  s = chatReducer(s, { type: 'answered', answer: answer() });
  return s;
};

describe('the chat: messages and the conversation', () => {
  it('appends her message, then the answer with its citations, cards and quick replies, and keeps the conversation id', () => {
    let s = chatReducer(initialChat(), { type: 'sent', text: 'why 40 and not 55', chips: ['Wrap Dress · Buy 40'] });
    expect(s.pending).toBe(true);
    expect(s.messages[0]).toMatchObject({ role: 'owner', text: 'why 40 and not 55', chips: ['Wrap Dress · Buy 40'] });
    s = chatReducer(s, { type: 'answered', answer: answer() });
    expect(s.pending).toBe(false);
    expect(s.conversationId).toBe('conv-1');
    expect(s.messages[1]).toMatchObject({
      role: 'assistant',
      citations: [{ trace_id: DRESS_TRACE, key: 'line.qty' }],
      quickReplies: ['Higher', 'Lower']
    });
    expect(s.messages[1].cards[0]).toMatchObject({ status: 'proposed', sentence: null, note: '' });
  });

  it('drops the conversation id when the server no longer has it, and says why', () => {
    let s = afterAnswer();
    s = chatReducer(s, { type: 'sent', text: 'and now?', chips: [] });
    s = chatReducer(s, { type: 'failed', error: { response: { status: 404, data: { detail: 'Conversation not found.' } } } });
    expect(s.conversationId).toBeNull();
    expect(s.error).toBe('Conversation not found.');
    expect(s.pending).toBe(false);
  });
});

describe('the confirm card: proposed → confirming → confirmed | dismissed | ended', () => {
  const id = (s: ChatState) => s.messages[1].localId;

  it("moves to confirmed only on the endpoint's 2xx", () => {
    let s = afterAnswer();
    s = chatReducer(s, { type: 'confirming', localId: id(s), index: 0 });
    expect(s.messages[1].cards[0].status).toBe('confirming');
    s = chatReducer(s, { type: 'confirmed', localId: id(s), index: 0 });
    expect(s.messages[1].cards[0].status).toBe('confirmed');
  });

  it("a stale, closed or excluded 409 ends the card with the server's sentence (the card's revision is fixed)", () => {
    for (const code of ['stale', 'closed', 'excluded']) {
      let s = afterAnswer();
      s = chatReducer(s, { type: 'confirming', localId: id(s), index: 0 });
      s = chatReducer(s, {
        type: 'confirmFailed',
        localId: id(s),
        index: 0,
        error: { response: { status: 409, data: { detail: `Refused: ${code}.`, code } } }
      });
      expect(s.messages[1].cards[0]).toMatchObject({ status: 'ended', sentence: `Refused: ${code}.` });
    }
  });

  it('any other 409 ends the card too (a run refused on a frozen plan carries no code); only busy is retried', () => {
    let s = afterAnswer();
    s = chatReducer(s, { type: 'confirming', localId: id(s), index: 0 });
    s = chatReducer(s, {
      type: 'confirmFailed',
      localId: id(s),
      index: 0,
      error: { response: { status: 409, data: { detail: 'This plan is frozen; it is not re-sized any more.' } } }
    });
    expect(s.messages[1].cards[0]).toMatchObject({ status: 'ended', sentence: 'This plan is frozen; it is not re-sized any more.' });
  });

  it('busy, a 5xx or a network failure goes back to proposed with the sentence', () => {
    let s = afterAnswer();
    s = chatReducer(s, { type: 'confirming', localId: id(s), index: 0 });
    s = chatReducer(s, {
      type: 'confirmFailed',
      localId: id(s),
      index: 0,
      error: { response: { status: 409, data: { detail: 'Busy; try again.', code: 'busy' } } }
    });
    expect(s.messages[1].cards[0]).toMatchObject({ status: 'proposed', sentence: 'Busy; try again.' });
    s = chatReducer(s, { type: 'confirming', localId: id(s), index: 0 });
    s = chatReducer(s, { type: 'confirmFailed', localId: id(s), index: 0, error: new Error('Network Error') });
    expect(s.messages[1].cards[0]).toMatchObject({ status: 'proposed', sentence: 'That did not reach the server. Try again.' });
  });

  it('dismisses only a proposed card, and a confirmed card stays confirmed', () => {
    let s = afterAnswer();
    s = chatReducer(s, { type: 'dismissed', localId: id(s), index: 0 });
    expect(s.messages[1].cards[0].status).toBe('dismissed');
    s = chatReducer(s, { type: 'confirming', localId: id(s), index: 0 });
    expect(s.messages[1].cards[0].status).toBe('dismissed');
  });
});

describe("confirmRequest: exactly the card's call, only her note from her", () => {
  it("sends the card's method, its path made relative and its body as written", () => {
    expect(confirmRequest(decisionCard, undefined, BASE, PLAN_ID)).toEqual({
      method: 'PUT',
      url: `/buy/plans/${PLAN_ID}/lines/${DRESS}/decision/`,
      data: { owner_qty: 48, against_revision: 3, via: 'chat', note: '', message_id: 'm-owner-1' }
    });
  });

  it('fills only body.note from her note, verbatim (the server keeps notes as written)', () => {
    const req = confirmRequest(decisionCard, ' the rep says ', BASE, PLAN_ID);
    expect(req?.data).toEqual({ owner_qty: 48, against_revision: 3, via: 'chat', note: ' the rep says ', message_id: 'm-owner-1' });
  });

  it('a card starts with her recorded note, so confirming it never erases hers', () => {
    let s = chatReducer(initialChat(), { type: 'sent', text: 'record 50', chips: [] });
    s = chatReducer(s, {
      type: 'answered',
      answer: answer({ proposals: [decisionCard, whatIf] }),
      notes: { [DRESS]: 'rep says best seller' }
    });
    const [decision, hypothetical] = s.messages[1].cards;
    expect(decision.note).toBe('rep says best seller');
    expect(hypothetical.note).toBe('rep says best seller');
    expect(confirmRequest(decision.card, decision.note, BASE, PLAN_ID)?.data.note).toBe('rep says best seller');
    expect(confirmRequest(hypothetical.card, hypothetical.note, BASE, PLAN_ID, 'record')?.data.note).toBe('rep says best seller');
  });

  it('a what-if confirms nothing; its Record is its own decision call', () => {
    expect(confirmRequest(whatIf, undefined, BASE, PLAN_ID)).toBeNull();
    expect(confirmRequest(whatIf, undefined, BASE, PLAN_ID, 'record')?.data).toEqual({
      owner_qty: 46,
      against_revision: 3,
      via: 'chat',
      note: '',
      message_id: 'm-owner-2'
    });
  });

  it('refuses a path outside this plan', () => {
    const elsewhere = { ...decisionCard, confirm: { ...decisionCard.confirm!, path: '/api/v1/role/' } };
    expect(confirmRequest(elsewhere, undefined, BASE, PLAN_ID)).toBeNull();
  });
});

describe('citations: where each lands', () => {
  const messages = afterAnswer().messages;

  it("a node on a card's trace lands on that chunk; a deeper node opens See the numbers at it", () => {
    expect(citationTarget({ trace_id: DRESS_TRACE, key: 'line.qty' }, view, messages)).toEqual({
      kind: 'chunk',
      domId: view.items[0].why!.domId
    });
    expect(citationTarget({ trace_id: DRESS_TRACE, key: 'line.r_cat' }, view, messages)).toEqual({
      kind: 'card',
      domId: view.items[0].domId,
      cardKey: DRESS,
      openKey: 'line.r_cat'
    });
  });

  it('a month node lands on its row', () => {
    expect(citationTarget({ trace_id: MONTH_TRACE, key: 'plan.month.2027_04' }, view, messages)).toEqual({
      kind: 'chunk',
      domId: view.months.rows[0].row.domId
    });
  });

  it("a line's fact lands on the card's chunk for that field, an excluded line on its row", () => {
    expect(citationTarget({ line_id: DRESS, field: 'suggested_qty' }, view, messages)).toEqual({
      kind: 'chunk',
      domId: view.items[0].why!.domId
    });
    expect(citationTarget({ line_id: DRESS, field: 'intended_price' }, view, messages)).toEqual({
      kind: 'chunk',
      domId: view.items[0].price!.domId
    });
    expect(citationTarget({ line_id: DRESS, field: 'by_size' }, view, messages)).toEqual({
      kind: 'chunk',
      domId: view.items[0].splitChunk!.domId
    });
    expect(citationTarget({ line_id: DRESS, field: 'note' }, view, messages)).toEqual({
      kind: 'card',
      domId: view.items[0].domId,
      cardKey: DRESS,
      openKey: null
    });
    expect(citationTarget({ line_id: OLD, field: 'cost' }, view, messages)).toEqual({ kind: 'chunk', domId: view.excludedDomIds[OLD] });
  });

  it('on a cut card our number is the cut; on a decided card the number used is hers', () => {
    const cutCard = card(DRESS, 'Wrap Dress', DRESS_TRACE, '53', {
      status: 'cut',
      cut: traceChunk(DRESS_TRACE, 'line.cut', 'Cut to 30 to fit the budget.'),
      decision: treeChunk(`memo.line.${hex(DRESS)}.decision`, 'You: 48 units.')
    });
    cutCard.split = { ...cutCard.split!, value: value('30') };
    const v = ownerMemoView(memoResponse({ cards: [cutCard] }), planDetail().lines, BASE);
    const c = v.items[0];
    expect(citationTarget({ line_id: DRESS, field: 'suggested_qty' }, v, messages)).toEqual({ kind: 'chunk', domId: c.cut!.domId });
    expect(citationTarget({ line_id: DRESS, field: 'qty_used' }, v, messages)).toEqual({ kind: 'chunk', domId: c.decision!.domId });
    expect(citationTarget({ line_id: DRESS, field: 'low_qty' }, v, messages)).toEqual({ kind: 'chunk', domId: c.why!.domId });
  });

  it('a what-if trace lands on its card in the rail, a message we hold on its bubble, anything else nowhere', () => {
    let s = afterAnswer();
    s = chatReducer(s, { type: 'sent', text: 'what if we sold through at 70%', chips: [] });
    s = chatReducer(s, {
      type: 'answered',
      answer: answer({ proposals: [whatIf], citations: [{ trace_id: 'hyp-trace-1', key: 'line.qty' }] })
    });
    expect(citationTarget({ trace_id: 'hyp-trace-1', key: 'line.qty' }, view, s.messages)).toEqual({
      kind: 'rail',
      localId: s.messages[3].localId,
      index: 0
    });
    // Her own messages have no server id on the page; a message we hold by its server id is the only target.
    expect(citationTarget({ message_id: 'x' }, view, s.messages, s.messages[3].localId)).toBeNull();
    expect(citationTarget({ message_id: 'm-assistant-1' }, view, s.messages, s.messages[3].localId)).toEqual({
      kind: 'message',
      localId: s.messages[1].localId
    });
    expect(citationTarget({ trace_id: 'unknown', key: 'line.qty' }, view, s.messages)).toBeNull();
  });

  it('labels citations with the node key, the field in words, or "your message"', () => {
    expect(citationLabel({ trace_id: DRESS_TRACE, key: 'line.qty' })).toBe('line.qty');
    expect(citationLabel({ line_id: DRESS, field: 'intended_price' })).toBe('retail price');
    expect(citationLabel({ message_id: 'x' })).toBe('your message');
  });
});

describe("errors: the server's sentences", () => {
  it("says the server's 400 and 503 sentences, a wait on 429, and a timeout in words", () => {
    expect(
      errorSentence({ response: { status: 400, data: { detail: 'Ask about this plan in under 2,000 characters.', code: 'message' } } })
    ).toBe('Ask about this plan in under 2,000 characters.');
    expect(errorSentence({ response: { status: 503, data: { detail: 'The assistant is not available right now.' } } })).toBe(
      'The assistant is not available right now.'
    );
    expect(errorSentence({ response: { status: 429, data: {}, headers: { 'retry-after': '120' } } })).toBe(
      'You have asked a lot this hour. Try again in 2 minutes.'
    );
    // Rounded up, so she never comes back too early; never "0 minutes".
    expect(errorSentence({ response: { status: 429, data: {}, headers: { 'retry-after': '90' } } })).toBe(
      'You have asked a lot this hour. Try again in 2 minutes.'
    );
    expect(errorSentence({ response: { status: 429, data: {}, headers: { 'retry-after': '30' } } })).toBe(
      'You have asked a lot this hour. Try again in 1 minute.'
    );
    expect(errorSentence({ code: 'ECONNABORTED', message: 'timeout of 75000ms exceeded' })).toBe(
      'The assistant did not answer in time. Try asking again.'
    );
  });

  it('a 404 from GET ask/ is the kill switch', () => {
    expect(isKillSwitch({ response: { status: 404, data: { detail: 'Not found.' } } })).toBe(true);
    expect(isKillSwitch({ response: { status: 403, data: { detail: 'Admin role required for this company' } } })).toBe(false);
  });
});
