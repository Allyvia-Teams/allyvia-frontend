import { describe, expect, it } from 'vitest';

import { ownerMemoView } from './memo';
import { DRESS, DRESS_TRACE, memoResponse, MONTH_TRACE, planDetail, TOP } from './planFixtures';
import { addChips, chipLabel, contextFor, emptyChips, MAX_CONTEXT, removeChip, selectedChunks } from './selection';

const v = ownerMemoView(memoResponse(), planDetail().lines, 'http://127.0.0.1:8069/api/v1/');
const dress = v.items[0];
const top = v.items[1];

describe('selection: what a selection brings into the chat', () => {
  it('a selection spanning two paragraphs brings both anchors', () => {
    const chunks = selectedChunks(v, [dress.why!.anchor, dress.fit!.anchor]);
    expect(contextFor(chunks)).toEqual([
      { trace_id: DRESS_TRACE, key: 'line.qty' },
      { trace_id: DRESS_TRACE, key: 'line.fit' }
    ]);
  });

  it("a card's memo chunk brings its line; a month row its node; a read-time chunk brings nothing", () => {
    const chunks = selectedChunks(v, [dress.price!.anchor, v.months.rows[0].row.anchor, v.totals[0].chunk.anchor, v.cover!.anchor]);
    expect(contextFor(chunks)).toEqual([{ line_id: DRESS }, { trace_id: MONTH_TRACE, key: 'plan.month.2027_04' }]);
  });

  it('dedupes, ignores anchors it does not know, and keeps at most 20', () => {
    const chunks = selectedChunks(v, [dress.why!.anchor, dress.why!.anchor, 'nothing:here', top.price!.anchor, top.splitChunk!.anchor]);
    expect(contextFor(chunks)).toEqual([{ trace_id: DRESS_TRACE, key: 'line.qty' }, { line_id: TOP }]);
    expect(MAX_CONTEXT).toBe(20);
  });
});

describe('chips: they stay until she removes them and go with every turn', () => {
  it('adds a chip per citable chunk, once, and says when there is nothing to add', () => {
    let state = addChips(emptyChips(), selectedChunks(v, [dress.why!.anchor]), v);
    expect(state.chips.map((c) => c.anchor)).toEqual([dress.why!.anchor]);
    state = addChips(state, selectedChunks(v, [dress.why!.anchor]), v);
    expect(state.chips).toHaveLength(1);
    expect(state.notice).toBe('Already in the chat');
    const none = addChips(state, selectedChunks(v, [v.totals[0].chunk.anchor]), v);
    expect(none.chips).toHaveLength(1);
    expect(none.notice).toBe('The assistant cannot read that part of the memo yet.');
  });

  it('removes a chip by its anchor and keeps the rest', () => {
    let state = addChips(emptyChips(), selectedChunks(v, [dress.why!.anchor, top.price!.anchor]), v);
    state = removeChip(state, dress.why!.anchor);
    expect(state.chips.map((c) => c.entry)).toEqual([{ line_id: TOP }]);
  });

  it('caps the chips at 20', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      anchor: `t${i}:line.qty`,
      domId: `d${i}`,
      sentence: `s${i}`,
      value: null,
      citable: { trace_id: `t${i}`, key: 'line.qty' },
      lineId: null
    }));
    const state = addChips(emptyChips(), many, v);
    expect(state.chips).toHaveLength(20);
    expect(state.notice).toBe('The chat takes at most 20 pieces of the memo at a time.');
  });

  it("labels a chip with the card's name and the start of the sentence", () => {
    expect(chipLabel(dress.why!, v)).toBe('Wrap Dress · Buy 40 units: the reason.');
    expect(chipLabel({ ...dress.why!, sentence: 'x'.repeat(80) }, v).length).toBeLessThanOrEqual(60);
  });
});
