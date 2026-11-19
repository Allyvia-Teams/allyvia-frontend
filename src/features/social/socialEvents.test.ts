import { describe, expect, it } from 'vitest';

import type { SocialConnection, SocialProposal } from 'api/social.api';

import * as seam from './socialEvents';
import {
  DISCONNECT_CONFIRM,
  KINDS,
  REVIEW_TITLE,
  SUGGESTED_LINE,
  canConfirm,
  captionParts,
  cardState,
  confirmBody,
  confirmedLine,
  datesLine,
  draftOf,
  draftProblem,
  reviewLink,
  reviewLists,
  trendsLink
} from './socialEvents';

const CAPTION = 'Our Winter Sale is here! This Saturday Nov 21 and Sunday Nov 22, 20% off all knitwear in store. See you there.';

const row = (over: Partial<SocialProposal> = {}): SocialProposal => ({
  id: 'p1',
  status: 'proposed',
  kind: 'sale',
  kind_label: 'Sale',
  start_date: '2026-11-21',
  end_date: '2026-11-22',
  location_id: null,
  location_name: null,
  quote: 'This Saturday Nov 21 and Sunday Nov 22, 20% off all knitwear in store.',
  post: { posted_at: '2026-11-12T15:02:11+00:00', caption: CAPTION, permalink: 'https://www.instagram.com/p/FixtureWinterSale/' },
  decided_by_email: null,
  decided_at: null,
  ...over
});

const connection = (over: Partial<SocialConnection> = {}): SocialConnection => ({
  provider: 'instagram',
  status: 'connected',
  username: 'mirthmarket',
  connected_at: '2026-11-18T12:00:00+00:00',
  last_pulled_at: null,
  to_review: 0,
  configured: true,
  ...over
});

describe('counts and the Trends link', () => {
  it('names how many are waiting, and nothing at zero', () => {
    expect(reviewLink(3)).toBe('Events from your posts (3 to review)');
    expect(reviewLink(1)).toBe('Events from your posts (1 to review)');
    expect(reviewLink(0)).toBeNull();
    expect(reviewLink(undefined)).toBeNull();
  });

  it('keeps a plain link while connected so a confirmed event can be withdrawn, and none otherwise', () => {
    expect(trendsLink(connection({ to_review: 2 }))).toBe('Events from your posts (2 to review)');
    expect(trendsLink(connection())).toBe(REVIEW_TITLE);
    expect(trendsLink(connection({ status: 'needs_reconnect' }))).toBe(REVIEW_TITLE);
    expect(trendsLink(connection({ status: 'disconnected' }))).toBeNull();
    expect(trendsLink(connection({ status: 'disconnected', to_review: 4 }))).toBe('Events from your posts (4 to review)');
    expect(trendsLink(undefined)).toBeNull();
  });

  it('lists suggestions by first day and confirmed ones newest first, never the dismissed', () => {
    const lists = reviewLists([
      row({ id: 'b', start_date: '2026-12-01', end_date: '2026-12-01' }),
      row({ id: 'a' }),
      row({ id: 'c', status: 'confirmed', start_date: '2026-10-08', end_date: '2026-10-08' }),
      row({ id: 'd', status: 'confirmed', start_date: '2026-11-20', end_date: '2026-11-20' }),
      row({ id: 'e', status: 'dismissed' })
    ]);
    expect(lists.toReview.map((r) => r.id)).toEqual(['a', 'b']);
    expect(lists.confirmed.map((r) => r.id)).toEqual(['d', 'c']);
  });
});

describe('her edits are what Confirm sends', () => {
  it('starts from the suggestion', () => {
    expect(draftOf(row())).toEqual({ kind: 'sale', start: '2026-11-21', end: '2026-11-22', locationId: '' });
    expect(draftOf(row({ location_id: 'store-1' })).locationId).toBe('store-1');
  });

  it('carries the kind, the dates and the store she chose', () => {
    expect(confirmBody({ kind: 'trunk_show', start: '2026-11-27', end: '2026-11-28', locationId: 'store-2' })).toEqual({
      kind: 'trunk_show',
      start_date: '2026-11-27',
      end_date: '2026-11-28',
      location_id: 'store-2'
    });
    expect(confirmBody({ ...draftOf(row()), locationId: '' }).location_id).toBeNull();
  });

  it('keeps Confirm off while the dates are not valid, and says why', () => {
    const ok = draftOf(row());
    expect(canConfirm(ok)).toBe(true);
    expect(draftProblem({ ...ok, start: '' })).toBe('Give a first and a last day.');
    expect(draftProblem({ ...ok, end: '2026-02-31' })).toBe('Give a first and a last day.');
    expect(draftProblem({ ...ok, start: '2026-11-23' })).toBe('The last day is before the first.');
    expect(draftProblem({ ...ok, end: '2026-12-22' })).toBe('An event can last at most 31 days.');
    expect(canConfirm({ ...ok, end: '2026-12-22' })).toBe(false);
    expect(canConfirm({ ...ok, end: '2026-12-21' })).toBe(true); // Nov 21 to Dec 21 is 31 days, the server's limit
    expect(canConfirm({ ...ok, end: ok.start })).toBe(true);
  });
});

describe('the caption with her words highlighted', () => {
  it('marks the quote inside the caption', () => {
    const parts = captionParts(CAPTION, row().quote);
    expect(parts.map((p) => p.quoted)).toEqual([false, true, false]);
    expect(parts.map((p) => p.text).join('')).toBe(CAPTION);
    expect(parts[1].text).toBe('This Saturday Nov 21 and Sunday Nov 22, 20% off all knitwear in store.');
  });

  it('matches across case and spacing and keeps the caption as written', () => {
    const caption = 'Trunk show with   Juniper Knits\nnext Friday.';
    const parts = captionParts(caption, 'trunk show with juniper knits next friday');
    expect(parts[0]).toEqual({ text: 'Trunk show with   Juniper Knits\nnext Friday', quoted: true });
    expect(parts.map((p) => p.text).join('')).toBe(caption);
  });

  it('shows the caption plainly when the words are not found', () => {
    expect(captionParts(CAPTION, 'nothing like this')).toEqual([{ text: CAPTION, quoted: false }]);
    expect(captionParts(CAPTION, '')).toEqual([{ text: CAPTION, quoted: false }]);
  });
});

describe('dates and the confirmed list', () => {
  it('reads as days, one or a run', () => {
    expect(datesLine('2026-11-20', '2026-11-20')).toBe('Fri, Nov 20, 2026');
    expect(datesLine('2026-11-21', '2026-11-22')).toBe('Sat, Nov 21, 2026 to Sun, Nov 22, 2026');
    expect(confirmedLine(row({ status: 'confirmed' }))).toBe('Sale, Sat, Nov 21, 2026 to Sun, Nov 22, 2026, every store.');
    expect(confirmedLine(row({ status: 'confirmed', kind: 'trunk_show', location_name: 'Uptown' }))).toBe(
      'Trunk show, Sat, Nov 21, 2026 to Sun, Nov 22, 2026, at Uptown.'
    );
  });
});

describe('the Instagram card', () => {
  it('hides itself while the server switch is off or the role cannot use it', () => {
    expect(cardState({ status: 404 })).toEqual({ kind: 'hidden' });
    expect(cardState({ status: 403 })).toEqual({ kind: 'hidden' });
  });

  it('loads, then fails gently', () => {
    expect(cardState({ loading: true })).toEqual({ kind: 'loading' });
    expect(cardState({ status: 500 })).toEqual({ kind: 'error' });
  });

  it('offers Connect, names the connected account, asks for a reconnect, and says when it is not set up', () => {
    expect(cardState({ data: connection({ status: 'disconnected', username: null }) })).toMatchObject({
      kind: 'connect',
      button: 'Connect Instagram'
    });
    expect(cardState({ data: connection() })).toEqual({ kind: 'connected', line: 'Connected as @mirthmarket.', button: 'Disconnect' });
    expect(cardState({ data: connection({ status: 'needs_reconnect' }) })).toMatchObject({ kind: 'reconnect', button: 'Reconnect' });
    expect(cardState({ data: connection({ status: 'disconnected', configured: false }) })).toEqual({
      kind: 'not_set_up',
      line: 'Instagram is not set up on this server yet.'
    });
  });
});

describe('the words', () => {
  it('never say AI, model or proposal, and carry no em dash', () => {
    const strings: string[] = [SUGGESTED_LINE, REVIEW_TITLE, DISCONNECT_CONFIRM, ...KINDS.map((k) => k.label)];
    for (const state of [
      cardState({ data: connection({ status: 'disconnected' }) }),
      cardState({ data: connection() }),
      cardState({ data: connection({ status: 'needs_reconnect' }) }),
      cardState({ data: connection({ configured: false, status: 'disconnected' }) })
    ]) {
      if ('line' in state) strings.push(state.line);
      if ('button' in state) strings.push(state.button);
    }
    strings.push(String(seam.LONGEST_DAYS), confirmedLine(row()), draftProblem({ ...draftOf(row()), start: '' }) ?? '');
    for (const text of strings) {
      expect(text).not.toMatch(/\bAI\b|\bmodel\b|proposal|—/i);
    }
    expect(SUGGESTED_LINE).toBe('Suggested from your posts.');
  });
});
