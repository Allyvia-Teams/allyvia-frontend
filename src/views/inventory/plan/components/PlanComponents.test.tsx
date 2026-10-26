// Static renders of the plan page's components (no DOM here; the repo's precedent is renderToStaticMarkup).
// They pin what each audience sees: her memo carries Record, Exclude and See the numbers and citable chunks;
// the share link carries none of them. And the chat's cards and rail as she meets them.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { ChatCard, SharedMemo } from 'api/buying.api';

import { chatReducer, initialChat, type CardState } from '../chat';
import { ownerMemoView } from '../memo';
import { DRESS, DRESS_TRACE, live, memoResponse, PLAN_ID, planDetail, STORE } from '../planFixtures';
import { recordState } from '../record';
import { emptyChips } from '../selection';
import { sharedMemoView } from '../sharedMemo';
import CardActions from './CardActions';
import ChatRail from './ChatRail';
import ConfirmCard from './ConfirmCard';
import ItemCard from './ItemCard';
import Memo from './Memo';

vi.mock('utils/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn() }
}));
vi.mock('./TraceExplorer', () => ({ default: () => null }));

const API = 'http://localhost:8000/api/v1/';

const ownerView = () => {
  const response = memoResponse();
  return { response, view: ownerMemoView(response, planDetail().lines, API) };
};

const sharedPayload = (): SharedMemo => ({
  version: 1,
  audience: 'shared',
  as_of: '2027-02-28',
  plan: {
    name: 'Spring 27',
    season_label: 'SS27',
    store: 'Main',
    target_date: '2027-03-01',
    window_start: '2027-04-05',
    window_end: '2027-06-27'
  },
  cover: 'Eight styles for spring.',
  basis: 'The store band, measured.',
  totals: {
    units: { amount: '88', unit: 'units', low: null, high: null },
    expected_revenue: { amount: '8400.00', unit: 'usd', low: null, high: null }
  },
  months: { sentence: 'April leads.', value: null, rows: [{ sentence: 'April: about $14,000.00 expected.', value: null, details: [] }] },
  items: [
    {
      name: 'Wrap Dress',
      brand: 'Meadow',
      picture: null,
      chips: { taxonomy: ['clothing', 'dresses'], attributes: {}, colours: [] },
      sizes: ['S', 'M', 'L'],
      status: 'recommended',
      flags: [],
      fit: 'fits',
      number: { amount: '40', unit: 'units', low: '34', high: '49' },
      split: { S: 10, M: 20, L: 10 },
      why: 'Dresses ran a quarter of April here.'
    }
  ],
  carried: [],
  caveats: ['One PDF page had no prices.']
});

describe('ItemCard', () => {
  it('draws the number with its range, the sizes in the size order, the why, and no action of its own', () => {
    const { view } = ownerView();
    const dress = view.items.find((c) => c.lineId === DRESS)!;
    const html = renderToStaticMarkup(<ItemCard card={dress} />);
    expect(html).toContain('Wrap Dress');
    expect(html).toContain('>40<');
    expect(html).toContain('range 34–49');
    expect(html.indexOf('>S<')).toBeLessThan(html.indexOf('>M<'));
    expect(html.indexOf('>M<')).toBeLessThan(html.indexOf('>L<'));
    expect(html).toContain(`id="${dress.domId}"`);
    expect(html).toContain(`data-anchor="${dress.why!.anchor}"`);
    expect(html).not.toContain('Record');
    expect(html).not.toContain('Exclude');
  });
});

describe('Memo: her memo against the share link', () => {
  it('her memo: citable chunks and, through the page, Record, Exclude and See the numbers on every card', () => {
    const { response, view } = ownerView();
    const lines = new Map(planDetail().lines.map((l) => [l.id, l]));
    const html = renderToStaticMarkup(
      <Memo
        view={view}
        slotsFor={(card) => ({
          actions: (
            <CardActions
              card={card}
              record={recordState(card, lines.get(card.lineId!), response.live)}
              busy={false}
              message={null}
              canEdit
              canSee
              seeOpen={false}
              onRecord={() => undefined}
              onUseOurs={() => undefined}
              onExclude={() => undefined}
              onSeeNumbers={() => undefined}
            />
          )
        })}
      />
    );
    expect(html).toContain('data-citable="true"');
    expect(html.match(/>Record</g)?.length).toBe(2);
    expect(html.match(/>Exclude</g)?.length).toBe(2);
    expect(html.match(/>See the numbers</g)?.length).toBe(2);
    expect(html).toContain('Old Scarf');
  });

  it('the share link: the same memo shape, with nothing citable and nothing to act on', () => {
    const html = renderToStaticMarkup(<Memo view={sharedMemoView(sharedPayload(), API)} showAll />);
    expect(html).toContain('Wrap Dress');
    expect(html).toContain('Dresses ran a quarter of April here.');
    expect(html).toContain('Fits');
    expect(html).not.toContain('data-citable');
    for (const word of ['Record', 'Exclude', 'See the numbers', 'Use ours', 'Include', 'Create draft POs'])
      expect(html).not.toContain(word);
  });

  it('shows the first eight items with Show all, and every item once asked', () => {
    const { view } = ownerView();
    const many = {
      ...view,
      items: Array.from({ length: 10 }, (_, i) => ({ ...view.items[0], key: `k${i}`, name: `Style ${i}`, domId: `d${i}` }))
    };
    const collapsed = renderToStaticMarkup(<Memo view={many} onShowAll={() => undefined} />);
    expect(collapsed).toContain('Style 7');
    expect(collapsed).not.toContain('Style 8');
    expect(collapsed).toContain('Show all 10');
    expect(renderToStaticMarkup(<Memo view={many} showAll onShowAll={() => undefined} />)).toContain('Style 9');
  });
});

describe('CardActions', () => {
  it('pre-fills her number and note, offers Use ours once she decided, and hides Exclude without the edit right', () => {
    const { response, view } = ownerView();
    const dress = view.items.find((c) => c.lineId === DRESS)!;
    const decided = planDetail().lines[0];
    decided.decision = {
      owner_qty: 46,
      by_size: null,
      note: 'Bigger run',
      via: 'memo',
      decided_by_email: 'o@x.test',
      decided_at: '2027-03-01T10:00:00Z',
      against: { revision: 3, qty: 40, trace_id: DRESS_TRACE },
      moved: false,
      moved_sentence: null
    };
    const html = renderToStaticMarkup(
      <CardActions
        card={dress}
        record={recordState(dress, decided, response.live)}
        busy={false}
        message={{ tone: 'info', text: 'Recorded. The order uses your number.' }}
        canEdit={false}
        canSee
        seeOpen
        onRecord={() => undefined}
        onUseOurs={() => undefined}
        onExclude={() => undefined}
        onSeeNumbers={() => undefined}
      />
    );
    expect(html).toContain('value="46"');
    expect(html).toContain('value="Bigger run"');
    expect(html).toContain('Use ours');
    expect(html).toContain('Recorded. The order uses your number.');
    expect(html).toContain('Hide the numbers');
    expect(html).not.toContain('Exclude');
  });
});

const decisionCard = (): ChatCard => ({
  kind: 'decision',
  line_id: DRESS,
  line: 'Wrap Dress',
  sentence: 'Set your number for Wrap Dress to 48.',
  before: { qty: 40, source: 'planner' },
  after: { qty: 48 },
  confirm: {
    method: 'PUT',
    path: `/api/v1/buy/plans/${PLAN_ID}/lines/${DRESS}/decision/`,
    body: { owner_qty: 48, against_revision: 3, note: '', via: 'chat' }
  }
});

const whatIf = (): ChatCard => ({
  kind: 'whatif',
  line_id: DRESS,
  line: 'Wrap Dress',
  sentence: 'At 70% sell-through Wrap Dress would be 46.',
  before: { qty: 40, low: 34, high: 49 },
  after: { qty: 46, low: 39, high: 56 },
  confirm: null,
  trace_id: DRESS_TRACE,
  record: {
    sentence: 'Record 46 as your number.',
    confirm: { method: 'PUT', path: `/api/v1/buy/plans/${PLAN_ID}/lines/${DRESS}/decision/`, body: { owner_qty: 46, note: '' } }
  }
});

const state = (card: ChatCard, extra: Partial<CardState> = {}): CardState => ({
  card,
  status: 'proposed',
  sentence: null,
  note: '',
  ...extra
});

describe('ConfirmCard', () => {
  it('a decision card: the change before → after, her note, Confirm and Not now', () => {
    const html = renderToStaticMarkup(
      <ConfirmCard state={state(decisionCard())} onConfirm={() => undefined} onDismiss={() => undefined} onNote={() => undefined} />
    );
    expect(html).toContain('40 → 48');
    expect(html).toContain('Your note (optional)');
    expect(html).toContain('>Confirm<');
    expect(html).toContain('Not now');
  });

  it('a what-if card: dashed, says it is not saved, no Confirm, its own Record', () => {
    const html = renderToStaticMarkup(
      <ConfirmCard state={state(whatIf())} onConfirm={() => undefined} onDismiss={() => undefined} onNote={() => undefined} />
    );
    expect(html).toContain('What-if · not saved');
    expect(html).toContain('dashed');
    expect(html).toContain('40 (34–49) → 46 (39–56)');
    expect(html).not.toContain('>Confirm<');
    expect(html).toContain('>Record<');
    expect(html).toContain('Record 46 as your number.');
  });

  it("an ended card says the server's sentence and offers nothing", () => {
    const html = renderToStaticMarkup(
      <ConfirmCard
        state={state(decisionCard(), { status: 'ended', sentence: 'Ours moved to 46 since this card; record again.' })}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onNote={() => undefined}
      />
    );
    expect(html).toContain('Ours moved to 46 since this card; record again.');
    expect(html).not.toContain('>Confirm<');
    expect(html).toContain('This card no longer applies');
  });
});

describe('ChatRail', () => {
  const answered = () => {
    let s = chatReducer(initialChat(), { type: 'sent', text: 'Why 40?', chips: ['Wrap Dress · Dresses ran…'] });
    s = chatReducer(s, {
      type: 'answered',
      answer: {
        answer: 'Dresses took a quarter of April.',
        citations: [
          { trace_id: DRESS_TRACE, key: 'line.qty' },
          { line_id: DRESS, field: 'intended_price' }
        ],
        proposals: [decisionCard()],
        quick_replies: ['Higher', 'Lower'],
        conversation_id: 'c1',
        message_id: 'm1',
        refused: false
      }
    });
    return s;
  };

  it('a log of the turns, her context on her message, the citations by name, the card, and the quick replies', () => {
    const html = renderToStaticMarkup(
      <ChatRail
        state={answered()}
        chips={emptyChips()}
        offline={null}
        shortcutLabel="⌘L"
        onRemoveChip={() => undefined}
        onSend={() => undefined}
        onCite={() => undefined}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onNote={() => undefined}
      />
    );
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain('About: Wrap Dress · Dresses ran…');
    expect(html).toContain('>line.qty<');
    expect(html).toContain('>retail price<');
    expect(html).toContain('Set your number for Wrap Dress to 48.');
    expect(html).toContain('>Higher<');
    expect(html).toContain('press ⌘L');
  });

  it('switched off: says so in place of the input', () => {
    const html = renderToStaticMarkup(
      <ChatRail
        state={initialChat()}
        chips={emptyChips()}
        offline="The assistant is not switched on here."
        shortcutLabel="Ctrl L"
        onRemoveChip={() => undefined}
        onSend={() => undefined}
        onCite={() => undefined}
        onConfirm={() => undefined}
        onDismiss={() => undefined}
        onNote={() => undefined}
      />
    );
    expect(html).toContain('The assistant is not switched on here.');
    expect(html).not.toContain('aria-label="Ask about this plan" maxlength');
  });
});

describe('PlanPage, rendered from cached answers', () => {
  it('her sized plan: the memo, Export, Share and Re-size, Record on each card', async () => {
    const { default: PlanPage } = await import('./PlanPage');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(['buy-plan', PLAN_ID, STORE.id], { scope: 'location', location: STORE, plan: planDetail() });
    client.setQueryData(['buy-plan-memo', PLAN_ID, STORE.id], { scope: 'location', location: STORE, ...memoResponse({ live: live() }) });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/inventory/plan/${PLAN_ID}?location_id=${STORE.id}`]}>
          <Routes>
            <Route path="/inventory/plan/:planId" element={<PlanPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(html).toContain('Spring 27');
    expect(html).toContain('>Export<');
    expect(html).toContain('>Share<');
    expect(html).toContain('>Re-size<');
    expect(html.match(/>Record</g)?.length).toBe(2);
    expect(html).toContain(`href="/inventory/plan?location_id=${STORE.id}"`);
    expect(html).not.toContain('Drop your line sheet here');
  });

  it('an empty plan: the drop zone and Add styles, no memo', async () => {
    const { default: PlanPage } = await import('./PlanPage');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(['buy-plan', PLAN_ID, STORE.id], {
      scope: 'location',
      location: STORE,
      plan: planDetail({ lines: [], files: [] })
    });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/inventory/plan/${PLAN_ID}?location_id=${STORE.id}`]}>
          <Routes>
            <Route path="/inventory/plan/:planId" element={<PlanPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(html).toContain('Plan your next buy');
    expect(html).toContain('Drop your line sheet here');
    expect(html).toContain('data-testid="plan-drop-input"');
    expect(html).toContain('Add styles you already carry');
    expect(html).not.toContain('>Export<');
  });
});
