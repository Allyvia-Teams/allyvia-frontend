import { describe, expect, it } from 'vitest';

import { ownerMemoView } from './memo';
import { card, DRESS, DRESS_TRACE, hex, line, live, memoResponse, planDetail, revision, treeChunk, value } from './planFixtures';
import { decisionBody, recordError, recordOutcome, recordState } from './record';

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
    const unsized = recordState(dressView(), line(DRESS, 'Wrap Dress'), live());
    expect(unsized).toMatchObject({ enabled: true, againstRevision: null });
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

describe('decisionBody: an integer, her note, the revision she saw', () => {
  it('sends a JSON integer and an explicit revision', () => {
    expect(decisionBody('48', ' the rep says ', 3)).toEqual({
      ok: true,
      body: { owner_qty: 48, against_revision: 3, note: 'the rep says', via: 'memo' }
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
