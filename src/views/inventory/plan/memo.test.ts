import { describe, expect, it } from 'vitest';

import { figureText, MISSING, ownerMemoView, SECTION_ORDER } from './memo';
import {
  card,
  DRESS,
  DRESS_TRACE,
  hex,
  memoResponse,
  MONTH_TRACE,
  node,
  OLD,
  planDetail,
  TOP,
  TOP_TRACE,
  traceChunk,
  treeChunk,
  value
} from './planFixtures';

const BASE = 'http://127.0.0.1:8069/api/v1/';
const view = (response = memoResponse(), lines = planDetail().lines) => ownerMemoView(response, lines, BASE);

describe("ownerMemoView: every section, in the payload's order", () => {
  it("renders the sections in order and keeps the plan's own facts", () => {
    const v = view();
    expect(v.order).toEqual(SECTION_ORDER);
    expect(SECTION_ORDER).toEqual(['cover', 'totals', 'months', 'items', 'carried', 'excluded', 'caveats', 'notes']);
    expect(v.title).toBe('Spring 27');
    expect(v.store).toBe('Main');
    expect(v.cover?.sentence).toBe('Spring 27 for Main: order by 1 Mar 2027, selling 5 Apr to 27 Jun 2027.');
    expect(v.basis?.sentence).toBe('The forecast is measured but unproven here.');
  });

  it("labels the totals from the summary tree's own nodes, and adds company cash only when posture came", () => {
    const v = view();
    expect(v.totals.map((t) => t.label)).toEqual(['Units', 'At cost', 'Expected revenue', 'Expected margin']);
    expect(v.totals[2].chunk.value).toEqual(value('8400.00', 'usd', '7100.00', '9800.00'));
    expect(v.totals.some((t) => t.label === 'Company cash')).toBe(false);
    const withPosture = view(
      memoResponse({
        posture: {
          root: 'posture.company',
          nodes: {
            'posture.company': node('posture.company', 'The company', null, ['posture.cash']),
            'posture.cash': node('posture.cash', 'Company cash', value('42300.00', 'usd'), [], {
              sentence: 'About $42,300.00, estimated from takings.'
            })
          }
        }
      })
    );
    const cash = withPosture.totals.find((t) => t.label === 'Company cash');
    expect(cash?.chunk.sentence).toBe('About $42,300.00, estimated from takings.');
    expect(cash?.chunk.citable).toBeNull();
  });

  it("names each month from its key and keeps the details' sentences", () => {
    const v = view();
    expect(v.months.rows.map((r) => r.name)).toEqual(['April', 'May']);
    expect(v.months.rows[0].details.map((d) => d.sentence)).toEqual(['Dresses were 20% of April last year.']);
    expect(v.months.root?.sentence).toBe('The window, month by month.');
  });

  it("keeps the excluded lines, the server's caveats and her notes", () => {
    const v = view();
    expect(v.excluded).toEqual([{ lineId: OLD, name: 'Old Scarf', excludedAt: '2027-02-20T10:00:00Z' }]);
    expect(v.caveats.map((c) => c.sentence)).toEqual(['The store’s revenue forecast is measured but unproven here.']);
    expect(v.notes).toEqual({
      planNote: 'Keep the dresses light.',
      lines: [{ lineId: DRESS, name: 'Wrap Dress', note: 'the rep says best seller' }]
    });
  });
});

describe("cards: the number is the node's, never invented", () => {
  it("shows the line's number with its range, its sizes in the line's order, and its sentences", () => {
    const dress = view().items[0];
    expect(dress.figure).toEqual({ amount: '40', unit: 'units', low: '34', high: '49' });
    expect(dress.isCut).toBe(false);
    expect(dress.split).toEqual([
      { size: 'S', qty: 10 },
      { size: 'M', qty: 20 },
      { size: 'L', qty: 10 }
    ]);
    expect(dress.why?.sentence).toBe('Buy 40 units: the reason.');
    expect(dress.price?.sentence).toBe('Retail $120.00, cost $48.00: a 60% margin.');
    expect(dress.fit?.sentence).toBe('46 customers bought dresses at about this price here.');
    expect(dress.picture).toBe(`http://127.0.0.1:8069/api/v1/buy/images/${DRESS}/abcdefabcdef-card.webp`);
    expect(dress.chips).toEqual(['clothing › dresses', 'midi', 'sage']);
  });

  it("on a cut line the big number is the cut's split total, with no range (the cut chunk is a flag)", () => {
    const cut = card(DRESS, 'Wrap Dress', DRESS_TRACE, '53', {
      status: 'cut',
      cut: treeChunk(`memo.line.${hex(DRESS)}.cut`, 'Cut to 30 from 53 to fit your $2,500.00 budget.'),
      split: { ...treeChunk(`memo.line.${hex(DRESS)}.sizes`, 'S 8, M 14, L 8.', value('30')), split: { S: 8, M: 14, L: 8 } }
    });
    const v = view(memoResponse({ cards: [cut] }));
    expect(v.items[0].figure).toEqual({ amount: '30', unit: 'units', low: null, high: null });
    expect(v.items[0].isCut).toBe(true);
    expect(v.items[0].cut?.sentence).toBe('Cut to 30 from 53 to fit your $2,500.00 budget.');
    // A cut line must carry its cut figure: without one it is the dash and the caveat, never 0.
    const noFigure = { ...cut, split: { ...cut.split!, value: null } };
    const w = view(memoResponse({ cards: [noFigure] }));
    expect(w.items[0]).toMatchObject({ figure: null, missing: true });
    expect(w.missingCaveat).toBe(true);
  });

  it('a sized card missing its number shows the dash and one caveat, never 0', () => {
    const broken = card(DRESS, 'Wrap Dress', DRESS_TRACE, '40', { number: null });
    const v = view(memoResponse({ cards: [broken] }));
    expect(v.items[0].figure).toBeNull();
    expect(v.items[0].missing).toBe(true);
    expect(v.missingCaveat).toBe(true);
    expect(figureText(v.items[0].figure)).toBe(MISSING);
    expect(MISSING).toBe('—');
  });

  it('chunks null by design raise no caveat: a style with no price, one not sized yet, one with too little history', () => {
    const cards = [
      card(DRESS, 'Wrap Dress', DRESS_TRACE, null, { status: 'needs_price', price: null }),
      card(TOP, 'Silk Cami', TOP_TRACE, null, {
        status: 'insufficient',
        number: traceChunk(TOP_TRACE, 'line.qty', 'Not sized: not enough history yet.', value(null))
      })
    ];
    const v = view(memoResponse({ cards }));
    expect(v.missingCaveat).toBe(false);
    expect(v.items.map((c) => c.missing)).toEqual([false, false]);
    expect(v.items[1].why?.sentence).toBe('Not sized: not enough history yet.');
    expect(v.items[1].figure).toBeNull();
  });

  it("keeps her decision's sentence, the moved sentence and her note", () => {
    const decided = card(DRESS, 'Wrap Dress', DRESS_TRACE, '40', {
      decision: { ...treeChunk(`memo.line.${hex(DRESS)}.decision`, 'You: 48 units.', value('48')), split: { S: 12, M: 24, L: 12 } },
      moved: treeChunk(`memo.line.${hex(DRESS)}.moved`, 'Ours moved to 46 since you decided.'),
      note: 'the rep says best seller'
    });
    const c = view(memoResponse({ cards: [decided] })).items[0];
    expect(c.decision?.sentence).toBe('You: 48 units.');
    expect(c.moved?.sentence).toBe('Ours moved to 46 since you decided.');
    expect(c.note).toBe('the rep says best seller');
  });
});

describe('anchors: what can be added to the chat, and where a citation lands', () => {
  it("a trace chunk carries its {trace_id, key}; a card's memo chunk carries its line; cover, totals and caveats carry nothing", () => {
    const v = view();
    const dress = v.items[0];
    expect(dress.why?.anchor).toBe(`${DRESS_TRACE}:line.qty`);
    expect(dress.why?.citable).toEqual({ trace_id: DRESS_TRACE, key: 'line.qty' });
    expect(dress.price?.anchor).toBe(`tree:memo:memo.line.${hex(DRESS)}.price`);
    expect(dress.price?.citable).toEqual({ line_id: DRESS });
    expect(v.cover?.citable).toBeNull();
    expect(v.totals[0].chunk.citable).toBeNull();
    expect(v.caveats[0].citable).toBeNull();
    expect(v.months.rows[0].row.citable).toEqual({ trace_id: MONTH_TRACE, key: 'plan.month.2027_04' });
    // The rule is the section's, not the ref's kind: a cover citing a stored node is still not for the chat.
    const response = memoResponse();
    const cover = response.memo.sections.find((s) => s.kind === 'cover') as { cover: { ref: unknown } };
    cover.cover.ref = { trace_id: MONTH_TRACE, key: 'plan.cover' };
    expect(view(response).cover?.citable).toBeNull();
  });

  it('indexes every chunk by anchor, with a dom id and its card', () => {
    const v = view();
    const entry = v.anchors[`${DRESS_TRACE}:line.qty`];
    expect(entry).toMatchObject({ lineId: DRESS, cardKey: DRESS });
    expect(entry.domId).toMatch(/^plan-c-[A-Za-z0-9_-]+$/);
    expect(v.anchors[`${MONTH_TRACE}:plan.month.2027_04`].domId).toBe(v.months.rows[0].row.domId);
    expect(v.lineTraces).toEqual({ [DRESS]: DRESS_TRACE, [TOP]: TOP_TRACE });
  });

  it('dom ids are unique across the memo', () => {
    const ids = Object.values(view().anchors).map((a) => a.domId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('figureText', () => {
  it('prints units, money and a range from the node, and the dash for nothing', () => {
    expect(figureText({ amount: '1234', unit: 'units', low: null, high: null })).toBe('1,234');
    expect(figureText({ amount: '8400.00', unit: 'usd', low: '7100.00', high: '9800.00' })).toBe('$8,400.00 ($7,100.00–$9,800.00)');
    expect(figureText(null)).toBe('—');
    expect(figureText({ amount: null, unit: 'units', low: null, high: null })).toBe('—');
  });
});
