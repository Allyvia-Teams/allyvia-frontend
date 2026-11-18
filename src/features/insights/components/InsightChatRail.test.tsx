import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  attachCard,
  chatLoaded,
  initialChatState,
  sendFailed,
  sendStarted,
  setDraft,
  type ChatState,
  type LogMessage
} from '../insightChat';
import InsightChatRail, { type InsightChatRailProps } from './InsightChatRail';

const noop = () => undefined;
const stripStyles = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

const base = (): ChatState => chatLoaded(initialChatState(true), { scope: 'company', location: null, conversation_id: 'c1', messages: [] });

const render = (state: ChatState, over: Partial<InsightChatRailProps> = {}) =>
  stripStyles(
    renderToStaticMarkup(
      <InsightChatRail
        state={state}
        titleOf={(id) => (id === 'rec-1' ? 'Reorder the Mara cable-knit sweater in M and L before Saturday' : null)}
        cardOnPage={(id) => (id === 'rec-1' ? 'pending-1' : null)}
        onCite={noop}
        onDraft={noop}
        onSend={noop}
        onRetry={noop}
        onNew={noop}
        onDetach={noop}
        onClose={noop}
        {...over}
      />
    )
  );

const withMessages = (messages: LogMessage[], over: Partial<ChatState> = {}): ChatState => ({ ...base(), messages, ...over });

const answerWithTwoRefs: LogMessage = {
  key: 'a1',
  role: 'assistant',
  text: 'The plan orders 13 units. Your store rule holds it to one vendor.',
  refused: false,
  sentences: [
    {
      text: 'The plan orders 13 units.',
      refs: [{ ref: 'r1', said: 'Units to order', figure: '13 units', source: { trace: 'reorder', key: 'reorder.qty', card: 'rec-1' } }]
    },
    {
      text: 'Your store rule holds it to one vendor.',
      refs: [
        { ref: 'r2', said: 'One vendor per order', figure: null, source: { table: 'agent.BusinessLearning', read: 'store_rules' } },
        { ref: 'r1', said: 'Units to order', figure: '13 units', source: { trace: 'reorder', key: 'reorder.qty', card: 'rec-1' } }
      ]
    }
  ]
};

describe('InsightChatRail', () => {
  it('is titled Ask Allyvia, with New conversation and a collapse button', () => {
    const html = render(base());
    expect(html).toContain('aria-label="Ask Allyvia"');
    expect(html).toContain('>New conversation<');
    expect(html).toContain('aria-label="Collapse the chat"');
    expect(html).toContain('data-chat-empty');
  });

  it('shows her message with the cards she attached as small labels', () => {
    const html = render(withMessages([{ key: 'u1', role: 'user', text: 'Why 13?', recommendationIds: ['rec-1', 'rec-9'] }]));
    expect(html).toContain('Why 13?');
    expect(html).toContain('Reorder the Mara cable-knit sweater in…');
    expect(html).toContain('An earlier recommendation');
    expect(html).not.toContain('data-chat-empty');
  });

  it('draws an answer with two distinct figures: the one whose card is on the page is a button, the other is plain text', () => {
    const html = render(withMessages([answerWithTwoRefs]));
    expect(html).toContain('The plan orders 13 units. Your store rule holds it to one vendor.');
    expect(html.match(/data-ref-chip/g)).toHaveLength(2); // r1 cited twice is one chip
    expect(html).toContain('>13 units<');
    expect(html).toContain('>Store rule<');
    expect(html.match(/data-ref-card="pending-1"/g)).toHaveLength(1);
    expect(html.match(/role="button"/g)).toHaveLength(1); // only the figure with a card
    expect(html).toContain('aria-label="Show the recommendation for 13 units"');
  });

  it('a fact from one of her documents is a "Document" chip that opens the document', () => {
    const lease = { table: 'documents.Document', id: 'doc-1', name: 'Elm Street lease.pdf', passage: 0 };
    const answer: LogMessage = {
      key: 'a2',
      role: 'assistant',
      text: 'Your lease says rent is due on the 1st of each month.',
      refused: false,
      sentences: [
        {
          text: 'Your lease says rent is due on the 1st of each month.',
          refs: [{ ref: 'r4', said: 'From Elm Street lease.pdf: Rent is due on the 1st of each month.', figure: '1st', source: lease }]
        }
      ]
    };
    const html = render(withMessages([answer]), { onOpenDocument: noop });
    expect(html).toContain('>Document<');
    expect(html).toContain('data-ref-document="doc-1"');
    expect(html.match(/role="button"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Open the document: Elm Street lease.pdf: Rent is due on the 1st of each month."');
    // Without an opener it is plain text, like any chip with nowhere to go.
    const plain = render(withMessages([answer]));
    expect(plain).toContain('>Document<');
    expect(plain).not.toContain('role="button"');
  });

  it('a figure whose card is not on the page is not a button', () => {
    const html = render(withMessages([answerWithTwoRefs]), { cardOnPage: () => null });
    expect(html.match(/data-ref-chip/g)).toHaveLength(2);
    expect(html).not.toContain('data-ref-card');
    expect(html).not.toContain('role="button"');
  });

  it('shows a refused answer as it is, with one quiet line under it', () => {
    const html = render(
      withMessages([{ key: 'a2', role: 'assistant', text: "I can't back that up from your data yet.", refused: true, sentences: [] }])
    );
    expect(html).toContain('I can&#x27;t back that up from your data yet.');
    expect(html.match(/data-chat-refused-hint/g)).toHaveLength(1);
    expect(html).toContain('Try attaching the recommendation you are asking about.');
    expect(html).not.toContain('data-chat-refs');
  });

  it('an ordinary answer has no refused line', () => {
    expect(render(withMessages([answerWithTwoRefs]))).not.toContain('data-chat-refused-hint');
  });

  it('a pending turn: her message is in the log, a progress line shows, the input is editable and Send waits', () => {
    const started = sendStarted(setDraft(base(), 'Why 13?'), { message: 'Why 13?', recommendationIds: [] });
    const html = render(setDraft(started, 'And the next?'));
    expect(html).toContain('data-chat-pending');
    expect(html).toContain('Looking at your numbers…');
    expect(html).toContain('Why 13?');
    expect(html).toMatch(/<textarea[^>]*aria-label="Ask Allyvia"/);
    expect(html).not.toMatch(/<textarea[^>]*disabled/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Send"/);
  });

  it('a failed send keeps her text in the input and shows the sentence with Retry', () => {
    const request = { message: 'Why 13?', recommendationIds: ['rec-1'] };
    const started = sendStarted(base(), request);
    const html = render(sendFailed(started, started.epoch, request, { response: { status: 429, data: {} } }));
    expect(html).toContain('data-chat-error');
    expect(html).toContain('Give it a minute, then ask again.');
    expect(html).toContain('>Retry<');
    expect(html).toContain('>Why 13?</textarea>');
  });

  it('an error with no held send has no Retry', () => {
    const html = render({ ...base(), error: 'Something went wrong. Try again.' });
    expect(html).toContain('data-chat-error');
    expect(html).not.toContain('>Retry<');
  });

  it('shows the attached cards as removable chips and the notice', () => {
    const attached = attachCard(base(), { id: 'pending-1', recommendationId: 'rec-1', title: 'Reorder the Mara sweater' });
    const html = render({ ...attached, notice: 'Up to 3 at a time' });
    expect(html).toContain('aria-label="In this chat"');
    expect(html).toContain('Reorder the Mara sweater');
    expect(html).toContain('MuiChip-deleteIcon');
    expect(html).toContain('Up to 3 at a time');
  });

  it('shows the character counter from 400 and not before', () => {
    expect(render(setDraft(base(), 'x'.repeat(399)))).not.toContain('data-chat-counter');
    const html = render(setDraft(base(), 'x'.repeat(420)));
    expect(html).toContain('data-chat-counter');
    expect(html).toContain('420 / 500');
    expect(html).toContain('maxLength="500"');
  });

  it('says plainly when the earlier messages did not load', () => {
    expect(render({ ...base(), loadError: true })).toContain('Your earlier messages did not load');
  });

  it('never says AI, model, ref, citation or tool on screen', () => {
    const request = { message: 'Why 13?', recommendationIds: ['rec-1'] };
    const failed = sendFailed(sendStarted(base(), request), 0, request, { response: { status: 503, data: {} } });
    const text = [render(withMessages([answerWithTwoRefs])), render(failed), render({ ...base(), loadError: true })]
      .join(' ')
      .replace(/<[^>]*>/g, ' ');
    expect(text).not.toMatch(/\b(AI|model|refs?|citations?|tool)\b/i);
  });
});
