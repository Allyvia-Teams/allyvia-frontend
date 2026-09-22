import { describe, expect, it } from 'vitest';

import type { BuyingRound, PerkEvent, PromotionRule } from 'api/innerCircle.api';
import { monthDay } from 'ui-component/frame/frame';
import {
  channelSentenceFor,
  inviteListEmptyMessage,
  OUTREACH_CHANNEL_SENTENCE,
  OUTREACH_CHANNEL_SENTENCE_NO_TILL
} from 'ui-component/inner-circle/outreachChannel';

import {
  ballotRows,
  buildOutreachRows,
  deleteConfirmCopy,
  filterRows,
  inviteResultMessage,
  inviteConfirmCopy,
  isManagedElsewhere,
  isPerk,
  isPromotion,
  isRound,
  kindCounts,
  MIN_BALLOT_OPTIONS,
  oneOf,
  OUTREACH_KINDS,
  outreachLoadError,
  outreachSearchParams,
  outreachSources,
  perkRowActions,
  prefillFor,
  rowBody,
  shortDate,
  statusChip,
  statusFor,
  suggestedPromotionIds,
  SUGGESTED_CHIP_LABEL,
  truncation,
  truncationLabel,
  voteRowActions,
  type SuggestedCardLike
} from './outreachRows';

/**
 * TIMEZONE RULE FOR EVERY DATE IN THIS FILE. An expectation must never be
 * computed with the function under test — `shortDate(x)` on both sides of an
 * assertion passes whatever `shortDate` does — and a `Z` fixture near
 * midnight renders a different day either side of Greenwich. So: local-wall
 * fixtures with NO `Z` and no offset (`'2026-09-20T12:00:00'`, noon, hours
 * from any boundary) asserted against hardcoded literals, or — where a real
 * instant is the point — an instant BUILT from local parts
 * (`new Date(2026, 8, 30, 14, 5).toISOString()`) whose local rendering is
 * therefore known. Proven under `TZ=America/New_York` and
 * `TZ=Pacific/Auckland`.
 */

const promo = (over: Partial<PromotionRule> = {}): PromotionRule => ({
  id: 'p1',
  name: 'Vault 10%',
  description: '',
  tier_scope: 'vault',
  top_n: null,
  discount_pct: '10.00',
  cadence_days: 30,
  code_valid_days: 14,
  trigger_type: 'manual',
  is_active: false,
  codes_issued: 0,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...over
});

const perk = (over: Partial<PerkEvent> = {}): PerkEvent => ({
  id: 'k1',
  title: 'Preview',
  description: '',
  perk_type: 'early_access',
  eligible_scope: 'tier',
  top_n: 10,
  tier: 'vault',
  capacity: 14,
  event_date: '2026-10-01T18:00:00Z',
  location: '',
  status: 'draft',
  invite_count: 0,
  response_counts: { invited: 0, interested: 0, booked: 0, declined: 0 },
  created_at: '2026-09-02T00:00:00Z',
  updated_at: '2026-09-02T00:00:00Z',
  ...over
});

const round = (over: Partial<BuyingRound> = {}): BuyingRound => ({
  id: 'r1',
  title: 'Which knit?',
  description: '',
  options: [],
  eligible_scope: 'top_n',
  top_n: 25,
  tier: null,
  status: 'open',
  closes_at: '2026-09-20T00:00:00Z',
  opened_at: null,
  closed_at: null,
  winning_option_index: null,
  fulfilled_item: null,
  invite_count: 25,
  vote_count: 9,
  is_accepting_votes: true,
  created_at: '2026-09-03T00:00:00Z',
  updated_at: '2026-09-03T00:00:00Z',
  ...over
});

describe('statusFor — one case per source status', () => {
  it.each<[string, unknown, string]>([
    ['promotion inactive, no codes', promo(), 'draft'],
    ['promotion active', promo({ is_active: true }), 'live'],
    ['promotion inactive with codes', promo({ codes_issued: 8 }), 'ended'],
    // A managed welcome perk keeps Live/Draft and never reads Ended: it is
    // not something the owner switched off, and "Ended" would invite a fix.
    ['promotion network_welcome, active', promo({ trigger_type: 'network_welcome', is_active: true }), 'live'],
    ['promotion network_welcome, inactive with codes', promo({ trigger_type: 'network_welcome', codes_issued: 8 }), 'draft'],
    ['perk draft', perk(), 'draft'],
    ['perk inviting', perk({ status: 'inviting' }), 'live'],
    ['perk closed', perk({ status: 'closed' }), 'ended'],
    ['round draft', round({ status: 'draft' }), 'draft'],
    ['round open', round(), 'live'],
    // `status` is still "open" here; the backend has already stopped taking
    // votes. Reading `status` alone put a Live chip on a dead ballot.
    ['round open but past its close date', round({ is_accepting_votes: false }), 'ended'],
    ['round closed', round({ status: 'closed' }), 'ended']
  ])('%s', (_l, obj, expected) => {
    expect(statusFor(obj as never).status).toBe(expected);
  });
});

describe('buildOutreachRows', () => {
  it('flattens three sources into one shape sorted by when desc', () => {
    const rows = buildOutreachRows([promo()], [perk()], [round()]);
    // when: promotion.updated_at 2026-09-01, perk.event_date 2026-10-01, round.closes_at 2026-09-20
    // sorted descending by `when`: event (10-01) > vote (09-20) > discount (09-01)
    expect(rows.map((r) => r.kind)).toEqual(['event', 'vote', 'discount']);
  });

  it('audience wording', () => {
    const rows = buildOutreachRows([promo({ tier_scope: 'top_n', top_n: 25 })], [perk()], [round()]);
    expect(rows.find((r) => r.kind === 'discount')?.audience).toBe('Top 25 by spend');
    expect(rows.find((r) => r.kind === 'event')?.audience).toBe('Vault');
  });

  it('statusDetail names the figure that matters', () => {
    const rows = buildOutreachRows(
      [promo({ is_active: true, codes_issued: 8 })],
      [perk({ status: 'inviting', invite_count: 12, response_counts: { invited: 12, interested: 1, booked: 4, declined: 0 } })],
      [round()]
    );
    expect(rows.find((r) => r.kind === 'discount')?.statusDetail).toBe('8 codes issued');
    expect(rows.find((r) => r.kind === 'event')?.statusDetail).toBe('12 invited · 4 booked');
    // Anchored: unanchored, this also passes for "19 votes".
    expect(rows.find((r) => r.kind === 'vote')?.statusDetail).toMatch(/^9 votes · closes /);
  });

  it('marks nothing by default — an absent card list means no marks, never "none"', () => {
    const rows = buildOutreachRows([promo()], [perk()], [round()]);
    expect(rows.every((r) => r.fromRecommendation === false)).toBe(true);
    // And the option, passed empty, is the same table.
    const withEmpty = buildOutreachRows([promo()], [perk()], [round()], { suggestedPromotionIds: new Set() });
    expect(withEmpty).toEqual(rows);
  });

  it('sorts equal, absent and unparseable `when` values stably, never crashing', () => {
    // Three promotions sharing one `updated_at`, then a row whose `when` is
    // unparseable and one whose `when` is empty — both sort last (-Infinity)
    // and keep their input order relative to each other.
    const rows = buildOutreachRows(
      [
        promo({ id: 'a', name: 'A', updated_at: '2026-09-01T12:00:00' }),
        promo({ id: 'b', name: 'B', updated_at: '2026-09-01T12:00:00' }),
        promo({ id: 'c', name: 'C', updated_at: 'not-a-date' }),
        promo({ id: 'd', name: 'D', updated_at: '' }),
        promo({ id: 'e', name: 'E', updated_at: '2026-09-02T12:00:00' })
      ],
      [],
      []
    );
    expect(rows.map((r) => r.title)).toEqual(['E', 'A', 'B', 'C', 'D']);
  });
});

describe('statusDetail — the exact words of every branch', () => {
  it('a LIVE discount that reached nobody says so, rather than restating the offer', () => {
    // 0 codes on a live rule means nobody was eligible. "10% off" would hide
    // that behind a number that never moves.
    expect(statusFor(promo({ is_active: true, codes_issued: 0 })).statusDetail).toBe('0 codes issued');
  });

  it('a DRAFT discount describes the offer, because it has no reach yet', () => {
    expect(statusFor(promo({ is_active: false, codes_issued: 0, discount_pct: '10.00' })).statusDetail).toBe('10% off');
  });

  it('an ENDED discount reports the reach it had', () => {
    expect(statusFor(promo({ is_active: false, codes_issued: 8 })).statusDetail).toBe('8 codes issued');
  });

  it('the count is ISSUED, never "in tiles" — it is cumulative, and the tense has to match', () => {
    // `codes_issued` is Count("codes"): every code ever minted, expired and
    // redeemed included. "in tiles" is a claim about right now, and on an
    // Ended rule whose codes have all lapsed it is simply false.
    const live = statusFor(promo({ is_active: true, codes_issued: 8 })).statusDetail;
    const ended = statusFor(promo({ is_active: false, codes_issued: 8 })).statusDetail;
    [live, ended].forEach((detail) => {
      expect(detail).toBe('8 codes issued');
      expect(detail).not.toMatch(/in tiles/);
    });
  });

  it('counts are singular at one', () => {
    expect(statusFor(promo({ is_active: true, codes_issued: 1 })).statusDetail).toBe('1 code issued');
    expect(statusFor(round({ status: 'closed', vote_count: 1 })).statusDetail).toBe('1 vote · closed');
  });

  it('a perk nobody has been invited to yet', () => {
    expect(statusFor(perk({ status: 'draft' })).statusDetail).toBe('Not sent yet');
  });

  it('a round that has not opened, and one that has closed', () => {
    expect(statusFor(round({ status: 'draft' })).statusDetail).toBe('Not opened yet');
    expect(statusFor(round({ status: 'closed', vote_count: 9 })).statusDetail).toBe('9 votes · closed');
  });

  it('a draft round with is_accepting_votes false is still draft, not ended', () => {
    // `is_accepting_votes` is `status == "open" and (...)` on the backend, so
    // the only wire-consistent way a non-open round carries `false` here is
    // a draft that has never been opened. The `!is_accepting_votes` arm in
    // `statusForRound` must apply ONLY to the `open` case — hoisting it above
    // the draft check would read a never-opened ballot as "voting ended",
    // telling the owner to pick a winner for a round nobody has voted in.
    expect(statusFor(round({ status: 'draft', is_accepting_votes: false })).status).toBe('draft');
    expect(statusFor(round({ status: 'draft', is_accepting_votes: false })).statusDetail).toBe('Not opened yet');
  });

  it('an open round with no closing date says that, rather than leaving the clause off', () => {
    expect(statusFor(round({ status: 'open', closes_at: null, vote_count: 9 })).statusDetail).toBe('9 votes · no close date');
  });

  it('an open round with a closing date names it', () => {
    // Local noon, hardcoded expectation: computing it with `shortDate` would
    // assert nothing about `shortDate`, and a `Z` fixture renders a different
    // day either side of Greenwich.
    expect(statusFor(round({ status: 'open', closes_at: '2026-09-20T12:00:00', vote_count: 9 })).statusDetail).toBe(
      '9 votes · closes Sep 20'
    );
  });

  it('a round past its close date says voting ENDED and what is left to do, not "closes" in the future', () => {
    // status is still `open`; is_accepting_votes is what the backend actually
    // enforces. "closes Sep 20" — future tense, past date — beside a Live
    // chip, on a ballot nobody can answer, was the defect.
    const detail = statusFor(round({ status: 'open', is_accepting_votes: false, closes_at: '2026-09-20T12:00:00', vote_count: 9 }));
    expect(detail).toEqual({ status: 'ended', statusDetail: '9 votes · voting ended Sep 20 — pick a winner' });
    expect(detail.statusDetail).not.toMatch(/closes/);
  });

  it('a round past its close date with no close date on the row drops the date, not the sentence', () => {
    // The backend cannot produce this pair today (a null closes_at is what
    // keeps is_accepting_votes true), which is exactly why it is pinned: the
    // sentence must not read "voting ended undefined" if it ever does.
    expect(statusFor(round({ status: 'open', is_accepting_votes: false, closes_at: null, vote_count: 9 })).statusDetail).toBe(
      '9 votes · voting ended — pick a winner'
    );
  });

  it('a CLOSED round keeps its own wording — the ended-by-clock case is a different sentence', () => {
    expect(statusFor(round({ status: 'closed', is_accepting_votes: false, vote_count: 9 })).statusDetail).toBe('9 votes · closed');
  });
});

describe('isManagedElsewhere — the welcome perk belongs to another surface', () => {
  it('is true only for a network_welcome trigger', () => {
    expect(isManagedElsewhere(promo({ trigger_type: 'network_welcome' }))).toBe(true);
    expect(isManagedElsewhere(promo({ trigger_type: 'manual' }))).toBe(false);
    expect(isManagedElsewhere(promo({ trigger_type: 'winback' }))).toBe(false);
    expect(isManagedElsewhere(promo({ trigger_type: 'birthday' }))).toBe(false);
    expect(isManagedElsewhere(promo({ trigger_type: 'new_inventory' }))).toBe(false);
  });

  it('says where the rule IS configured instead of reporting a reach the owner cannot change', () => {
    const detail = statusFor(promo({ trigger_type: 'network_welcome', is_active: true, codes_issued: 8 }));
    expect(detail).toEqual({ status: 'live', statusDetail: 'Welcome perk · managed in network settings' });
    expect(detail.statusDetail).not.toMatch(/issued|% off/);
  });

  it('an inactive welcome perk reads Draft, never Ended — nobody switched it off here', () => {
    expect(statusFor(promo({ trigger_type: 'network_welcome', is_active: false, codes_issued: 8 })).status).toBe('draft');
  });
});

describe('kindCounts and filterRows', () => {
  it('counts respect the status filter, chips overlap nothing', () => {
    const rows = buildOutreachRows([promo(), promo({ id: 'p2', is_active: true })], [perk()], []);
    expect(kindCounts(rows, 'all')).toEqual({ discount: 2, event: 1, vote: 0 });
    expect(kindCounts(rows, 'live')).toEqual({ discount: 1, event: 0, vote: 0 });
  });

  it('filters to the RIGHT row, not merely to one row', () => {
    // `toHaveLength(1)` alone passes for a filter that returns the wrong
    // single row, which is the failure that would actually reach an owner.
    const rows = buildOutreachRows(
      [promo({ id: 'p1', name: 'Draft rule' }), promo({ id: 'p2', name: 'Live rule', is_active: true })],
      [perk()],
      []
    );
    expect(filterRows(rows, { status: 'live', kind: null, query: '' }).map((r) => r.key)).toEqual(['discount:p2']);
    expect(filterRows(rows, { status: 'all', kind: 'event', query: 'prev' }).map((r) => r.key)).toEqual(['event:k1']);
    expect(filterRows(rows, { status: 'all', kind: null, query: 'draft' }).map((r) => r.key)).toEqual(['discount:p1']);
    // Status AND kind AND query compose, rather than the last one winning.
    expect(filterRows(rows, { status: 'draft', kind: 'discount', query: 'live' })).toEqual([]);
  });

  it('EACH of the three terms decides on its own', () => {
    // Every case above had a second term that could carry it — deleting the
    // kind clause outright left them all green (measured). So one case per
    // term, with the other two wide open, or the filter is only ever proven
    // by whichever clause happens to be narrowest.
    const rows = buildOutreachRows(
      [promo({ id: 'p1', name: 'Draft rule' }), promo({ id: 'p2', name: 'Live rule', is_active: true })],
      [perk()],
      []
    );
    const keys = (f: Parameters<typeof filterRows>[1]) =>
      filterRows(rows, f)
        .map((r) => r.key)
        .sort();

    // kind alone: same status, no query.
    expect(keys({ status: 'all', kind: 'discount', query: '' })).toEqual(['discount:p1', 'discount:p2']);
    expect(keys({ status: 'all', kind: 'event', query: '' })).toEqual(['event:k1']);
    // status alone: both kinds present in the result set, no query.
    expect(keys({ status: 'draft', kind: null, query: '' })).toEqual(['discount:p1', 'event:k1']);
    // query alone: matches across kinds, no status or kind narrowing.
    expect(keys({ status: 'all', kind: null, query: 'rule' })).toEqual(['discount:p1', 'discount:p2']);
    // The unfiltered table is all three rows, so none of the above is
    // passing because the input was already narrow.
    expect(keys({ status: 'all', kind: null, query: '' })).toEqual(['discount:p1', 'discount:p2', 'event:k1']);
  });
});

describe('suggestedPromotionIds — the rules the recommender already created', () => {
  // `id` is not part of `SuggestedCardLike` — the predicate never reads it —
  // but the fixtures below distinguish two cards by it, so the test's own
  // shape carries it alongside.
  type Card = SuggestedCardLike & { id: string };
  const card = (over: Partial<Card> = {}): Card => ({
    id: 'rec-1',
    kind: 'discount',
    prefill: { promotion_rule_id: 'p1' },
    ...over
  });

  it('collects the promotion_rule_id off every open discount card', () => {
    const ids = suggestedPromotionIds([card(), card({ id: 'rec-2', prefill: { promotion_rule_id: 'p2' } })]);
    expect([...ids].sort()).toEqual(['p1', 'p2']);
  });

  it('ignores the kinds that pre-create nothing', () => {
    expect(suggestedPromotionIds([card({ kind: 'event' }), card({ kind: 'vote' }), card({ kind: null })]).size).toBe(0);
  });

  it('ignores a card with no rule id, and never coerces a non-string into one', () => {
    // `String(undefined)` is "undefined" — an id that matches nothing and
    // looks like it did.
    const ids = suggestedPromotionIds([
      card({ prefill: {} }),
      card({ prefill: null }),
      card({ prefill: { promotion_rule_id: null } }),
      card({ prefill: { promotion_rule_id: 42 } }),
      card({ prefill: { promotion_rule_id: '' } })
    ]);
    expect(ids.size).toBe(0);
  });

  it('is empty for an empty list — which is also what a failed fetch produces', () => {
    expect(suggestedPromotionIds([]).size).toBe(0);
  });
});

describe('fromRecommendation — a pre-created rule is not a Draft the owner wrote', () => {
  const suggestedRows = () =>
    buildOutreachRows([promo({ id: 'p1', name: 'Welcome back' }), promo({ id: 'p2', name: 'Mine' })], [], [], {
      suggestedPromotionIds: new Set(['p1'])
    });

  it('marks only the rule the card names', () => {
    const rows = suggestedRows();
    expect(rows.find((r) => r.id === 'p1')?.fromRecommendation).toBe(true);
    expect(rows.find((r) => r.id === 'p2')?.fromRecommendation).toBe(false);
  });

  it('says where to accept it, instead of reporting a reach an inactive rule cannot have', () => {
    // Every pre-created rule is inactive, so its honest detail would be
    // "0 codes issued" — which reads as a live offer that reached nobody.
    const row = suggestedRows().find((r) => r.id === 'p1');
    expect(row?.statusDetail).toBe('Suggested in This week — accept it there');
    expect(row?.statusDetail).not.toMatch(/codes issued/);
  });

  it('leaves an unsuggested row exactly as it was', () => {
    expect(suggestedRows().find((r) => r.id === 'p2')?.statusDetail).toBe('10% off');
  });

  it('never marks an event or a vote — neither kind has a pre-created row to match', () => {
    // The ids are promotion ids; a perk or round sharing one by coincidence
    // must still not be marked.
    const rows = buildOutreachRows([], [perk({ id: 'p1' })], [round({ id: 'p1' })], { suggestedPromotionIds: new Set(['p1']) });
    expect(rows.every((r) => r.fromRecommendation === false)).toBe(true);
  });

  it('the chip label is one constant, not a string typed twice', () => {
    expect(SUGGESTED_CHIP_LABEL).toBe('Suggested');
  });
});

describe('OUTREACH_KINDS', () => {
  it('is the three plain-words entries in order', () => {
    expect(OUTREACH_KINDS.map((k) => [k.kind, k.label])).toEqual([
      ['discount', 'Give a discount'],
      ['event', 'Invite to an event or perk'],
      ['vote', 'Ask what to stock']
    ]);
  });
});

describe('prefillFor', () => {
  it('maps a discount prefill to PromotionDialog form keys', () => {
    expect(
      prefillFor('discount', {
        name: 'Welcome back, Regular',
        tier_scope: 'regular',
        trigger_type: 'winback',
        discount_pct: '15',
        code_valid_days: 14,
        cadence_days: 30
      })
    ).toEqual({
      name: 'Welcome back, Regular',
      tier_scope: 'regular',
      trigger_type: 'winback',
      discount_pct: '15',
      code_valid_days: '14',
      cadence_days: '30'
    });
  });

  it('maps an event prefill, converting the ISO date to the input format', () => {
    // The instant is BUILT from local parts, so its local rendering is known
    // in any timezone — and the expectation is a literal, not another call
    // to the conversion under test.
    const instant = new Date(2026, 8, 30, 14, 5).toISOString();
    const out = prefillFor('event', {
      title: 'Vault preview',
      perk_type: 'early_access',
      eligible_scope: 'tier',
      tier: 'vault',
      capacity: 14,
      event_date: instant,
      location: ''
    });
    expect(out.perk_type).toBe('early_access');
    expect(out.capacity).toBe('14');
    expect(out.event_date).toBe('2026-09-30T14:05');
  });

  it('converts a vote closing time the same way', () => {
    const instant = new Date(2026, 8, 30, 9, 0).toISOString();
    expect(prefillFor('vote', { closes_at: instant }).closes_at).toBe('2026-09-30T09:00');
  });

  it('passes a ballot through as an ARRAY — the one prefill field that is not a string', () => {
    // The style-vote card's whole payload depends on this branch, and it was
    // only ever called with `null`. Stringifying it would hand the dialog
    // "[object Object],[object Object]".
    const options = [{ label: 'Wool', image_url: null }, { label: 'Linen' }];
    const out = prefillFor('vote', { title: 'Which knit?', options });
    expect(Array.isArray(out.options)).toBe(true);
    expect(out.options).toEqual(options);
    expect(out.title).toBe('Which knit?');
  });

  it('drops an `options` value that is not an array, rather than stringifying it', () => {
    expect(prefillFor('vote', { options: 'Wool' }).options).toBeUndefined();
    expect(prefillFor('vote', { options: null }).options).toBeUndefined();
  });

  it('drops a null value instead of stringifying it as the literal "null"', () => {
    // `String(null)` is "null", which lands in a TextField as four visible
    // characters the owner then has to delete.
    const out = prefillFor('discount', { name: null, top_n: null, discount_pct: undefined, cadence_days: 30 });
    expect(out).toEqual({ cadence_days: '30' });
    expect('name' in out).toBe(false);
    expect('top_n' in out).toBe(false);
  });

  it('keeps a zero and an empty string — they are values, not absences', () => {
    expect(prefillFor('discount', { top_n: 0, discount_pct: '' })).toEqual({ top_n: '0', discount_pct: '' });
  });

  it('null prefill gives an empty object', () => {
    expect(prefillFor('vote', null)).toEqual({});
  });

  it('ignores keys the form does not have', () => {
    expect(prefillFor('discount', { promotion_rule_id: 'x' } as never)).toEqual({});
  });
});

describe('isPromotion / isPerk / isRound — the shared structural discrimination', () => {
  it('tells the three sources apart', () => {
    expect(isPromotion(promo())).toBe(true);
    expect(isPromotion(perk())).toBe(false);
    expect(isPromotion(round())).toBe(false);
    expect(isPerk(perk())).toBe(true);
    expect(isPerk(promo())).toBe(false);
    expect(isPerk(round())).toBe(false);
    expect(isRound(round())).toBe(true);
    expect(isRound(promo())).toBe(false);
    expect(isRound(perk())).toBe(false);
  });

  it('agrees with the status table — whatever isPromotion claims, statusFor read the same way', () => {
    // A promotion with codes issued is `ended`; a perk never can be for that
    // reason. If the predicate and statusFor ever discriminated differently,
    // a perk would take the promotion branch and this would read `draft`.
    expect(statusFor(promo({ codes_issued: 3 })).status).toBe('ended');
    expect(statusFor(perk({ status: 'inviting' })).status).toBe('live');
  });
});

describe('oneOf — a prefill value is kept only when the form offers it', () => {
  const SCOPES = ['vault', 'regular', 'shopper', 'top_n'] as const;

  it('keeps a value that is one of the options', () => {
    expect(oneOf('top_n', SCOPES)).toBe('top_n');
    expect(oneOf('vault', SCOPES)).toBe('vault');
  });

  it('drops a value the form has no option for, so the default survives', () => {
    expect(oneOf('platinum', SCOPES)).toBeUndefined();
    expect(oneOf('', SCOPES)).toBeUndefined();
  });

  it('drops null and undefined', () => {
    expect(oneOf(undefined, SCOPES)).toBeUndefined();
    expect(oneOf(null, SCOPES)).toBeUndefined();
  });
});

describe('outreachSources — row key back to the object it came from', () => {
  it('keys on the same string buildOutreachRows mints, and holds NOTHING else', () => {
    const rows = buildOutreachRows([promo()], [perk()], [round()]);
    const sources = outreachSources([promo()], [perk()], [round()]);
    rows.forEach((row) => {
      expect(sources[row.key]).toBeDefined();
      expect(sources[row.key].kind).toBe(row.kind);
    });
    // Both directions. Every row resolves AND the map invents no key of its
    // own — a stray entry is a row the table can never render but the index
    // claims to know, and the one-directional check could not see it.
    expect(Object.keys(sources).sort()).toEqual(rows.map((r) => r.key).sort());
    expect(Object.keys(sources).sort()).toEqual(['discount:p1', 'event:k1', 'vote:r1']);
  });

  it('carries the object itself, discriminated by kind', () => {
    const sources = outreachSources([promo({ id: 'p9', name: 'Nine' })], [], []);
    const entry = sources['discount:p9'];
    expect(entry.kind).toBe('discount');
    if (entry.kind === 'discount') expect(entry.promotion.name).toBe('Nine');
  });

  it('is empty for empty inputs', () => {
    expect(outreachSources([], [], [])).toEqual({});
  });
});

describe('truncation — does the table hold everything the server has', () => {
  it('sums fetched and total across the three responses', () => {
    const result = truncation([
      { count: 4, results: [1, 2, 3, 4] },
      { count: 2, results: [1, 2] },
      { count: 1, results: [1] }
    ]);
    expect(result).toEqual({ fetched: 7, total: 7, truncated: false });
  });

  it('is truncated when one response is short of its own count', () => {
    const result = truncation([
      { count: 100, results: new Array(60).fill(0) },
      { count: 3, results: [1, 2, 3] },
      { count: 0, results: [] }
    ]);
    expect(result).toEqual({ fetched: 63, total: 103, truncated: true });
  });

  it('asks the question per response, not of the summed totals', () => {
    // A server that reported more rows than it counted would make the sums
    // agree while one response was genuinely short — `total > fetched` reads
    // that as whole, and the table would silently drop rows.
    const result = truncation([
      { count: 2, results: [1] },
      { count: 1, results: [1, 2] }
    ]);
    expect(result.fetched).toBe(result.total);
    expect(result.truncated).toBe(true);
  });

  it('survives an absent response — still loading, or failed — without throwing', () => {
    expect(() => truncation([undefined, null])).not.toThrow();
    expect(truncation([undefined, null, { count: 2, results: [1, 2] }])).toEqual({ fetched: 2, total: 2, truncated: false });
  });

  it('is not truncated for three empty responses', () => {
    expect(truncation([{ count: 0, results: [] }])).toEqual({ fetched: 0, total: 0, truncated: false });
  });

  it('the footer says what was LOADED, never what is showing', () => {
    // The figure is a sum over the three responses and knows nothing about
    // the filters, so "Showing 150 of 214" beside three visible rows was
    // false. "150 of 214 loaded" is true whatever the filters are doing.
    const label = truncationLabel({ fetched: 150, total: 214, truncated: true });
    expect(label).toBe('150 of 214 loaded');
    expect(label).not.toMatch(/showing/i);
  });
});

describe('outreachSearchParams — filters in the URL', () => {
  it('preserves tab and everything else already there', () => {
    const next = outreachSearchParams(new URLSearchParams('tab=outreach&recordId=abc'), { status: 'live' });
    expect(next.get('tab')).toBe('outreach');
    expect(next.get('recordId')).toBe('abc');
    expect(next.get('status')).toBe('live');
  });

  it('drops status when it is the default, rather than writing status=all', () => {
    const next = outreachSearchParams(new URLSearchParams('tab=outreach&status=draft'), { status: 'all' });
    expect(next.has('status')).toBe(false);
    expect(next.get('tab')).toBe('outreach');
  });

  it('drops kind when it is cleared', () => {
    const next = outreachSearchParams(new URLSearchParams('tab=outreach&kind=vote'), { kind: null });
    expect(next.has('kind')).toBe(false);
  });

  it('touches only the keys named in the patch', () => {
    const next = outreachSearchParams(new URLSearchParams('tab=outreach&status=live&kind=event'), { kind: 'discount' });
    expect(next.get('status')).toBe('live');
    expect(next.get('kind')).toBe('discount');
  });

  it('does not mutate the params it was handed', () => {
    const current = new URLSearchParams('tab=outreach&status=live');
    outreachSearchParams(current, { status: 'all', kind: 'vote' });
    expect(current.get('status')).toBe('live');
    expect(current.has('kind')).toBe(false);
  });
});

describe('statusChip — the three words and their weight', () => {
  it('reads Draft, Live, Ended, and only Live carries colour', () => {
    expect(statusChip('draft')).toEqual({ label: 'Draft', color: 'default', variant: 'outlined', tone: 'default' });
    expect(statusChip('live')).toEqual({ label: 'Live', color: 'success', variant: 'filled', tone: 'success' });
    expect(statusChip('ended')).toEqual({ label: 'Ended', color: 'default', variant: 'filled', tone: 'muted' });
  });
});

describe('voteRowActions — what a style vote can do next', () => {
  it('a draft with two options can open, and nothing else', () => {
    const actions = voteRowActions(round({ status: 'draft', options: [{ label: 'A' }, { label: 'B' }] }));
    expect(actions).toEqual({
      canOpen: true,
      canInvite: false,
      canClose: false,
      openBlockedReason: null,
      inviteBlockedReason: 'Open voting first',
      closeBlockedReason: 'Open voting first'
    });
  });

  it('a draft with one option cannot open, and says why', () => {
    const actions = voteRowActions(round({ status: 'draft', options: [{ label: 'A' }] }));
    expect(actions.canOpen).toBe(false);
    // Built from the shared constant, not typed again: the row's stated rule
    // and the dialog's validation gate are now the same number, and the test
    // must fail if they stop being.
    expect(actions.openBlockedReason).toBe(`Add at least ${MIN_BALLOT_OPTIONS} options before voting can open`);
    expect(actions.openBlockedReason).toBe('Add at least 2 options before voting can open');
  });

  it('one option short of the minimum is blocked; the minimum itself opens', () => {
    const options = Array.from({ length: MIN_BALLOT_OPTIONS }, (_v, i) => ({ label: `Option ${i}` }));
    expect(voteRowActions(round({ status: 'draft', options })).canOpen).toBe(true);
    expect(voteRowActions(round({ status: 'draft', options: options.slice(0, -1) })).canOpen).toBe(false);
  });

  it('an open round can invite and close but not re-open', () => {
    const actions = voteRowActions(round({ status: 'open', options: [{ label: 'A' }, { label: 'B' }] }));
    expect(actions).toEqual({
      canOpen: false,
      canInvite: true,
      canClose: true,
      openBlockedReason: 'Voting is already open',
      inviteBlockedReason: null,
      closeBlockedReason: null
    });
  });

  it('a closed round can do none of the three', () => {
    const actions = voteRowActions(round({ status: 'closed', options: [{ label: 'A' }, { label: 'B' }] }));
    expect(actions).toEqual({
      canOpen: false,
      canInvite: false,
      canClose: false,
      openBlockedReason: 'This round is closed',
      inviteBlockedReason: 'This round is closed',
      closeBlockedReason: 'This round is closed'
    });
  });

  it('a round past its close date can still be CLOSED but can no longer be invited to', () => {
    // Invite and Close part company here. `status` is still open, so gating
    // both on that offered members a ballot the backend refuses — while
    // closing is the one action the round is actually waiting for.
    const actions = voteRowActions(round({ status: 'open', is_accepting_votes: false, options: [{ label: 'A' }, { label: 'B' }] }));
    expect(actions).toEqual({
      canOpen: false,
      canInvite: false,
      canClose: true,
      openBlockedReason: 'Voting is already open',
      inviteBlockedReason: 'Voting has ended',
      closeBlockedReason: null
    });
  });

  it('every control, in every state, and the reason it gives — the whole table at once', () => {
    // The previous version of this test compared two halves of one return
    // value (`reason === null` against `can…`), which a constant satisfies:
    // it asserted self-consistency, not behaviour. This names the expected
    // value of all six fields in all five states, so a constant return fails
    // on the first row and a swapped reason fails on the row it was swapped
    // into.
    const draftReady = round({ status: 'draft', options: [{ label: 'A' }, { label: 'B' }] });
    const draftThin = round({ status: 'draft', options: [] });
    const open = round({ status: 'open' });
    const pastClose = round({ status: 'open', is_accepting_votes: false });
    const closed = round({ status: 'closed' });

    const table: Array<[string, BuyingRound, [boolean, boolean, boolean], [string | null, string | null, string | null]]> = [
      ['draft with enough options', draftReady, [true, false, false], [null, 'Open voting first', 'Open voting first']],
      [
        'draft with too few',
        draftThin,
        [false, false, false],
        ['Add at least 2 options before voting can open', 'Open voting first', 'Open voting first']
      ],
      ['open and accepting', open, [false, true, true], ['Voting is already open', null, null]],
      ['open but past its close date', pastClose, [false, false, true], ['Voting is already open', 'Voting has ended', null]],
      ['closed', closed, [false, false, false], ['This round is closed', 'This round is closed', 'This round is closed']]
    ];

    table.forEach(([label, r, [canOpen, canInvite, canClose], [openReason, inviteReason, closeReason]]) => {
      expect({ label, ...voteRowActions(r) }).toEqual({
        label,
        canOpen,
        canInvite,
        canClose,
        openBlockedReason: openReason,
        inviteBlockedReason: inviteReason,
        closeBlockedReason: closeReason
      });
    });

    // And the biconditional still holds across all five, which is the rule
    // the component's `blockable` helper relies on.
    table.forEach(([, r]) => {
      const actions = voteRowActions(r);
      expect(actions.openBlockedReason === null).toBe(actions.canOpen);
      expect(actions.inviteBlockedReason === null).toBe(actions.canInvite);
      expect(actions.closeBlockedReason === null).toBe(actions.canClose);
    });
  });

  it('a draft says what to do first; a closed round says it is over', () => {
    const draft = voteRowActions(round({ status: 'draft', options: [{ label: 'A' }, { label: 'B' }] }));
    expect(draft.inviteBlockedReason).toBe('Open voting first');
    expect(draft.closeBlockedReason).toBe('Open voting first');
    const closed = voteRowActions(round({ status: 'closed' }));
    expect(closed.inviteBlockedReason).toBe('This round is closed');
    expect(closed.closeBlockedReason).toBe('This round is closed');
  });
});

describe('perkRowActions — inviting to an event', () => {
  it('a draft or inviting event can still invite', () => {
    expect(perkRowActions(perk({ status: 'draft' })).canInvite).toBe(true);
    expect(perkRowActions(perk({ status: 'inviting' })).canInvite).toBe(true);
  });

  it('a closed event cannot, and says why', () => {
    expect(perkRowActions(perk({ status: 'closed' }))).toEqual({ canInvite: false, inviteBlockedReason: 'This event is closed' });
  });
});

describe('inviteResultMessage — what the invite actually did', () => {
  it('names the channel that exists, never an email queue', () => {
    const message = inviteResultMessage(3);
    expect(message).toBe('3 members invited — it is in their Inner Circle tile now.');
    expect(message).not.toMatch(/email|approval/i);
  });

  it('is singular for one member', () => {
    expect(inviteResultMessage(1)).toBe('1 member invited — it is in their Inner Circle tile now.');
  });

  it('names BOTH reasons a zero can mean, rather than guessing one', () => {
    // A zero means already-invited OR membership-declined. "everyone
    // eligible is already on the list" asserted the first, and while the
    // backend was also dropping everyone without an email it was routinely
    // the wrong one — on exactly the members the tile channel exists for.
    const message = inviteResultMessage(0);
    expect(message).toBe('No one new to invite — everyone in scope is already invited or has declined.');
    expect(message).toMatch(/declined/);
    expect(message).not.toMatch(/email|approval/i);
  });
});

describe('ballotRows — a prefilled ballot made safe for a controlled form', () => {
  it('keeps the labels and image URLs it was given', () => {
    expect(ballotRows([{ label: 'Wool', image_url: 'https://x/1.png' }, { label: 'Linen' }], 2)).toEqual([
      { label: 'Wool', image_url: 'https://x/1.png' },
      { label: 'Linen', image_url: '' }
    ]);
  });

  it('replaces a non-string label with an empty string, never passing it through', () => {
    // A number in a controlled TextField makes React warn and the field stops
    // accepting input — a broken-looking dialog from a malformed suggestion.
    const rows = ballotRows([{ label: 42 }, { label: null, image_url: 7 }], 2);
    expect(rows).toEqual([
      { label: '', image_url: '' },
      { label: '', image_url: '' }
    ]);
    rows?.forEach((row) => {
      expect(typeof row.label).toBe('string');
      expect(typeof row.image_url).toBe('string');
    });
  });

  it('drops entries that are not objects', () => {
    expect(ballotRows(['Wool', 3, null, { label: 'Linen' }], 1)).toEqual([{ label: 'Linen', image_url: '' }]);
  });

  it('pads up to the minimum with EMPTY rows, keeping the ones it was given', () => {
    // Length alone passes for padding with copies of row 0, which would put
    // "Only one" on the ballot twice and look like a duplicated suggestion.
    expect(ballotRows([{ label: 'Only one' }], 2)).toEqual([
      { label: 'Only one', image_url: '' },
      { label: '', image_url: '' }
    ]);
    expect(ballotRows([], 2)).toEqual([
      { label: '', image_url: '' },
      { label: '', image_url: '' }
    ]);
  });

  it('pads to the shared minimum, not to a number typed here', () => {
    expect(ballotRows([], MIN_BALLOT_OPTIONS)).toHaveLength(MIN_BALLOT_OPTIONS);
  });

  it('does not truncate a ballot that is already longer than the minimum', () => {
    expect(ballotRows([{ label: 'a' }, { label: 'b' }, { label: 'c' }], 2)).toHaveLength(3);
  });

  it('returns null for a missing ballot — "none offered" is not "an empty one"', () => {
    expect(ballotRows(undefined, 2)).toBeNull();
    expect(ballotRows(null, 2)).toBeNull();
    expect(ballotRows('Wool', 2)).toBeNull();
  });
});

describe('outreachLoadError — a failed fetch never reads as an empty table', () => {
  it('is null when everything loaded', () => {
    expect(outreachLoadError([])).toBeNull();
  });

  it('says the table is incomplete when only some lists failed, so the rows that arrived still show', () => {
    expect(outreachLoadError(['event'])).toBe('Some outreach could not be loaded, so this table is incomplete.');
    expect(outreachLoadError(['event', 'vote'])).toBe('Some outreach could not be loaded, so this table is incomplete.');
  });

  it('says so plainly when every list failed', () => {
    expect(outreachLoadError(['discount', 'event', 'vote'])).toBe('Outreach could not be loaded.');
  });

  it('counts "every list" against the kinds vocabulary, not a hardcoded three', () => {
    expect(outreachLoadError(OUTREACH_KINDS.map((k) => k.kind))).toBe('Outreach could not be loaded.');
  });
});

describe('shortDate — the format itself, not just its composition', () => {
  it('renders a short month and day', () => {
    // Local noon, so the assertion cannot slip a day in any timezone — the
    // Session 3 weekday bug in a different costume.
    expect(shortDate('2026-09-20T12:00:00')).toBe('Sep 20');
    expect(shortDate('2026-01-05T12:00:00')).toBe('Jan 5');
  });

  it('renders a real instant in local time, which is what a closing time is', () => {
    // The instant is built from local parts, so it is 12:00 local in every
    // timezone and the expectation can be the literal it must produce. The
    // previous version recomputed the expectation with `shortDate`'s own
    // body, which asserted nothing at all.
    expect(shortDate(new Date(2026, 8, 20, 12).toISOString())).toBe('Sep 20');
  });

  it('is the frame formatter, not a second copy of it', () => {
    // Not a correctness check — `monthDay` IS `shortDate`'s implementation
    // now. It is a re-duplication guard: forking this back into its own
    // `toLocaleDateString` call is how the table and the page frame start
    // rendering the same day differently.
    const instant = new Date(2026, 0, 5, 12).toISOString();
    expect(shortDate(instant)).toBe(monthDay(new Date(instant)));
  });
});

describe('inviteListEmptyMessage — the invite-list empty state', () => {
  it('names the tile, never an email or an approval queue', () => {
    (['event', 'vote'] as const).forEach((kind) => {
      const message = inviteListEmptyMessage(kind);
      expect(message).toMatch(/Inner Circle tile/);
      expect(message).not.toMatch(/email|approval|draft/i);
      // The drawers both said "on the perk card" / "on the round card", and
      // Session 3 deleted every card in this feature.
      expect(message).not.toMatch(/card/i);
    });
  });

  it('names the thing being invited to, and differs only in that noun', () => {
    expect(inviteListEmptyMessage('event')).toMatch(/this perk/);
    expect(inviteListEmptyMessage('vote')).toMatch(/this round/);
    expect(inviteListEmptyMessage('event').replace('perk', 'round')).toBe(inviteListEmptyMessage('vote'));
  });

  it('the channel sentence it sits beside still has exactly one wording', () => {
    expect(OUTREACH_CHANNEL_SENTENCE).toMatch(/Inner Circle tile/);
    expect(OUTREACH_CHANNEL_SENTENCE).not.toMatch(/email|approval/i);
  });
});

describe('rowBody — the row second line', () => {
  const eventRow = (over: Partial<PerkEvent> = {}) => buildOutreachRows([], [perk(over)], [])[0];

  it('an event carries its date — the field an owner scans an events list for', () => {
    // Local noon, literal expectation: `shortDate(...)` on both sides would
    // pass whatever `shortDate` did.
    const row = eventRow({ event_date: '2026-10-01T12:00:00' });
    expect(rowBody(row)).toBe('Invite to an event or perk · Vault · Oct 1');
  });

  it('an event with no date shows NO date — not the day it was created', () => {
    // The shape the API really produces: no `event_date`, a real `created_at`.
    // `when` falls back to that timestamp so the row has somewhere to sit in
    // the sort, and rendering it would put a plausible, recent, WRONG date
    // where the owner reads the event date.
    const row = eventRow({ event_date: null, created_at: '2026-09-20T12:00:00' });
    expect(row.when).toBe('2026-09-20T12:00:00');
    expect(row.eventDate).toBeNull();
    expect(rowBody(row)).toBe('Invite to an event or perk · Vault');
    expect(rowBody(row)).not.toMatch(/Sep|·\s*$/);
  });

  it('`when` and `eventDate` are different fields, and only one of them is for reading', () => {
    const dated = eventRow({ event_date: '2026-10-01T12:00:00', created_at: '2026-09-20T12:00:00' });
    expect(dated.when).toBe('2026-10-01T12:00:00');
    expect(dated.eventDate).toBe('2026-10-01T12:00:00');
    // A discount and a vote both have a `when` for the sort and no event date.
    expect(buildOutreachRows([promo()], [], [])[0].eventDate).toBeNull();
    expect(buildOutreachRows([], [], [round()])[0].eventDate).toBeNull();
    expect(buildOutreachRows([], [], [round()])[0].when).toBeTruthy();
  });

  it('a discount is unchanged — kind and audience only', () => {
    const row = buildOutreachRows([promo({ tier_scope: 'top_n', top_n: 25 })], [], [])[0];
    expect(rowBody(row)).toBe('Give a discount · Top 25 by spend');
  });

  it('a vote is unchanged — its closing date is already in statusDetail, not repeated here', () => {
    const row = buildOutreachRows([], [], [round()])[0];
    expect(rowBody(row)).toBe('Ask what to stock · Top 25 by spend');
    expect(row.statusDetail).toMatch(/closes /);
  });
});

describe('deleteConfirmCopy — the right warning for the right thing', () => {
  it('a discount names the codes already out', () => {
    expect(deleteConfirmCopy('discount', 'Vault 10%')).toEqual({
      heading: 'Delete this promotion?',
      body: '“Vault 10%” will be removed. Codes already issued are not affected.'
    });
  });

  it('an event names the invite list', () => {
    expect(deleteConfirmCopy('event', 'Preview')).toEqual({
      heading: 'Delete this perk?',
      body: '“Preview” and its invite list will be removed.'
    });
  });

  it('a vote warns that the votes go too — the branch nobody wants swapped', () => {
    expect(deleteConfirmCopy('vote', 'Which knit?')).toEqual({
      heading: 'Delete this round?',
      body: '“Which knit?”, its voter list and every vote cast will be removed.'
    });
  });

  it('every kind gets its own wording', () => {
    const bodies = OUTREACH_KINDS.map((k) => deleteConfirmCopy(k.kind, 'X').body);
    expect(new Set(bodies).size).toBe(OUTREACH_KINDS.length);
  });
});

describe('inviteConfirmCopy — who is added to which list', () => {
  it('a vote adds to the VOTER list', () => {
    expect(inviteConfirmCopy('vote', 'Which knit?', 'Top 25 by spend')).toEqual({
      heading: 'Invite eligible members?',
      body: 'Top 25 by spend will be added to the voter list for “Which knit?”.'
    });
  });

  it('an event adds to the INVITE list', () => {
    expect(inviteConfirmCopy('event', 'Preview', 'Vault').body).toBe('Vault will be added to the invite list for “Preview”.');
  });

  it('says nothing about the channel — that sentence has one wording and one home', () => {
    const body = inviteConfirmCopy('event', 'Preview', 'Vault').body;
    expect(body).not.toMatch(/notification|tile|till/i);
  });
});

describe('channelSentenceFor — the till clause only where there is something to redeem', () => {
  it('a discount keeps the verbatim sentence, till clause and all', () => {
    expect(channelSentenceFor('discount')).toBe(
      'Members with the app see it in their Inner Circle tile and get a notification; everyone else can still redeem it at the till.'
    );
    expect(channelSentenceFor('discount')).toBe(OUTREACH_CHANNEL_SENTENCE);
  });

  it('an event and a vote drop it, because there is no code to redeem', () => {
    // A member without the app cannot RSVP or vote at a till. The sentence
    // was written discount-shaped and then placed on all three kinds.
    expect(channelSentenceFor('event')).toBe('Members with the app see it in their Inner Circle tile and get a notification.');
    expect(channelSentenceFor('vote')).toBe(OUTREACH_CHANNEL_SENTENCE_NO_TILL);
  });

  it('the first clause — the constraint — is verbatim in both', () => {
    const shared = 'Members with the app see it in their Inner Circle tile and get a notification';
    expect(OUTREACH_CHANNEL_SENTENCE.startsWith(shared)).toBe(true);
    expect(OUTREACH_CHANNEL_SENTENCE_NO_TILL).toBe(`${shared}.`);
  });

  it('neither wording mentions email or a till where none exists', () => {
    expect(OUTREACH_CHANNEL_SENTENCE_NO_TILL).not.toMatch(/till|email/i);
  });
});
