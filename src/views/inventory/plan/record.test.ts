import { describe, expect, it } from 'vitest';

import { ownerMemoView } from './memo';
import { card, DRESS, DRESS_TRACE, hex, line, live, memoResponse, planDetail, revision, treeChunk, value } from './planFixtures';
import { decisionBody, disagreement, disagreementKey, recordError, recordOutcome, recordState, refetchOnce } from './record';

const BASE = 'http://127.0.0.1:8069/api/v1/';
const dressView = (response = memoResponse()) => ownerMemoView(response, planDetail().lines, BASE).items[0];

describe('recordState: her Record, only against the number she sees', () => {
  it("is enabled when the card, the line's revision and the status agree, against that revision", () => {
    const lines = planDetail().lines;
    const s = recordState(dressView(), lines[0], live());
    expect(s).toMatchObject({ enabled: true, refetch: false, againstRevision: 3 });
  });

  it('asks for a refetch when the card was read from another revision (another trace, another number, another status)', () => {
    const v = dressView();
    expect(recordState(v, line(DRESS, 'Wrap Dress', { revision: revision('another-trace', 40) }), live()).refetch).toBe(true);
    expect(recordState(v, line(DRESS, 'Wrap Dress', { revision: revision(DRESS_TRACE, 46) }), live()).refetch).toBe(true);
    expect(recordState(v, line(DRESS, 'Wrap Dress', { revision: revision(DRESS_TRACE, 40, { status: 'hold' }) }), live()).refetch).toBe(
      true
    );
  });

  it("on a cut line compares the cut figure, which is the cut revision's number", () => {
    const cut = card(DRESS, 'Wrap Dress', DRESS_TRACE, '53', {
      status: 'cut',
      cut: treeChunk(`memo.line.${hex(DRESS)}.cut`, 'Cut to 30 from 53.'),
      split: { ...treeChunk(`memo.line.${hex(DRESS)}.sizes`, 'S 8, M 14, L 8.', value('30')), split: { S: 8, M: 14, L: 8 } }
    });
    const v = ownerMemoView(memoResponse({ cards: [cut] }), [], BASE).items[0];
    const l = line(DRESS, 'Wrap Dress', { revision: revision(DRESS_TRACE, 30, { status: 'cut', cut_from: 53 }) });
    expect(recordState(v, l, live())).toMatchObject({ enabled: true, refetch: false });
  });

  it('is off on a frozen plan, with no line or no revision against nothing (explicit null)', () => {
    expect(
      recordState(dressView(), planDetail().lines[0], live({ actions: { decide: false, edit: false, share: true, link: true } })).enabled
    ).toBe(false);
    expect(recordState(dressView(), undefined, live()).enabled).toBe(false);
    // A card that shows a number while its line has no revision was read from another state: read both again.
    expect(recordState(dressView(), line(DRESS, 'Wrap Dress'), live())).toMatchObject({ enabled: false, refetch: true });
    const bare = ownerMemoView(memoResponse({ cards: [card(DRESS, 'Wrap Dress', DRESS_TRACE, null, { status: 'unsized' })] }), [], BASE)
      .items[0];
    expect(recordState(bare, line(DRESS, 'Wrap Dress'), live())).toMatchObject({ enabled: true, againstRevision: null });
  });

  it('a line that needs a price is not recorded against an older revision, and asks for nothing (no refetch loop)', () => {
    const unpriced = ownerMemoView(
      memoResponse({ cards: [card(DRESS, 'Wrap Dress', DRESS_TRACE, null, { status: 'needs_price' })] }),
      [],
      BASE
    ).items[0];
    const l = line(DRESS, 'Wrap Dress', { revision: revision(DRESS_TRACE, 40), needs_price: true, intended_price: null });
    const s = recordState(unpriced, l, live());
    expect(s).toMatchObject({ enabled: false, refetch: false });
    expect(s.blocked).toBe(
      'Its number was sized at a price it no longer has. Give it a retail price and re-size before you record a number.'
    );
  });

  it('a card read as unpriced or unsized while its line is priced and sized was read before the run: read again', () => {
    for (const status of ['needs_price', 'unsized'] as const) {
      const stale = ownerMemoView(memoResponse({ cards: [card(DRESS, 'Wrap Dress', DRESS_TRACE, null, { status })] }), [], BASE).items[0];
      const l = line(DRESS, 'Wrap Dress', { revision: revision(DRESS_TRACE, 40) });
      expect(recordState(stale, l, live()), status).toMatchObject({ enabled: false, refetch: true, blocked: null });
    }
  });

  it('pre-fills her number and her note (an empty note would erase hers)', () => {
    const decided = line(DRESS, 'Wrap Dress', {
      revision: revision(DRESS_TRACE, 40),
      decision: {
        owner_qty: 48,
        by_size: null,
        note: 'the rep says best seller',
        via: 'memo',
        decided_by_email: 'o@x.test',
        decided_at: '2027-02-28T16:00:00Z',
        against: { revision: 3, qty: 40, trace_id: DRESS_TRACE },
        moved: false,
        moved_sentence: null
      }
    });
    expect(recordState(dressView(), decided, live()).prefill).toEqual({ qty: '48', note: 'the rep says best seller', decided: true });
    expect(recordState(dressView(), planDetail().lines[0], live()).prefill).toEqual({ qty: '', note: '', decided: false });
  });
});

describe('disagreement: one key per state of disagreement, so the page reads again once and never loops', () => {
  it('is null when every card agrees, and names each disagreeing card with the revision it disagrees with', () => {
    const response = memoResponse();
    const view = ownerMemoView(response, planDetail().lines, BASE);
    const agree = new Map(planDetail().lines.map((l) => [l.id, l]));
    expect(disagreement(view, agree, response.live)).toBeNull();
    const moved = new Map(agree);
    moved.set(DRESS, line(DRESS, 'Wrap Dress', { revision: revision('newer-trace', 46, { revision: 4 }) }));
    expect(disagreement(view, moved, response.live)).toBe(`${DRESS}@4`);
  });
});

describe('refetchOnce: the page reads again once per card and revision', () => {
  it('says yes while any key is new, then no; never for none', () => {
    const tried = new Set<string>();
    expect(refetchOnce(tried, [])).toBe(false);
    expect(refetchOnce(tried, [`${DRESS}@4`])).toBe(true);
    expect(refetchOnce(tried, [`${DRESS}@4`])).toBe(false);
    expect(refetchOnce(tried, [`${DRESS}@4`, `${DRESS}@5`])).toBe(true);
    expect(tried.has(`${DRESS}@5`)).toBe(true);
  });

  it("names a card's key the way disagreement does, so the card can say it was read again", () => {
    const response = memoResponse();
    const view = ownerMemoView(response, planDetail().lines, BASE);
    const moved = line(DRESS, 'Wrap Dress', { revision: revision('newer-trace', 46, { revision: 4 }) });
    expect(disagreementKey(view.items[0], moved)).toBe(`${DRESS}@4`);
    expect(disagreementKey(view.items[0], undefined)).toBe(`${DRESS}@none`);
  });
});

describe('decisionBody: an integer, her note, the revision she saw', () => {
  it('sends a JSON integer, an explicit revision and her note verbatim', () => {
    expect(decisionBody('48', ' the rep says ', 3)).toEqual({
      ok: true,
      body: { owner_qty: 48, against_revision: 3, note: ' the rep says ', via: 'memo' }
    });
    expect(decisionBody('0', '', null)).toEqual({ ok: true, body: { owner_qty: 0, against_revision: null, note: '', via: 'memo' } });
  });

  it('refuses what is not a whole number from 0 to 100,000', () => {
    for (const bad of ['', '4.5', '-1', '1e3', 'abc', '100001', ' ']) {
      expect(decisionBody(bad, '', 3).ok).toBe(false);
    }
  });
});

describe('the answer to a Record', () => {
  it('says nothing changed when the server recorded nothing', () => {
    expect(recordOutcome({ recorded: false })).toBe('Nothing changed: that is already your number.');
    expect(recordOutcome({ recorded: true })).toBe('Recorded. The order uses your number.');
  });

  it("a stale 409 asks for a refetch and says the server's sentence; any other refusal says its sentence", () => {
    const stale = { response: { status: 409, data: { detail: 'Ours moved to 46 since this card; record again.', code: 'stale' } } };
    expect(recordError(stale)).toEqual({ refetch: true, sentence: 'Ours moved to 46 since this card; record again.' });
    const closed = { response: { status: 409, data: { detail: 'This plan is frozen; it is not edited any more.', code: 'closed' } } };
    expect(recordError(closed)).toEqual({ refetch: true, sentence: 'This plan is frozen; it is not edited any more.' });
    const bad = { response: { status: 400, data: { detail: 'owner_qty must be a whole number.', code: 'owner_qty' } } };
    expect(recordError(bad)).toEqual({ refetch: false, sentence: 'owner_qty must be a whole number.' });
    expect(recordError(new Error('Network Error')).sentence).toBe('That did not reach the server. Try again.');
  });
});
