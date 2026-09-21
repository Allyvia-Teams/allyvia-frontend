import { describe, expect, it } from 'vitest';

import type { BuyingRound, PerkEvent, PromotionRule } from 'api/innerCircle.api';
import { isoToLocalInput } from 'ui-component/inner-circle/dateInput';

import {
  ballotRows,
  buildOutreachRows,
  deleteConfirmCopy,
  filterRows,
  inviteResultMessage,
  inviteConfirmCopy,
  isPerk,
  isPromotion,
  isRound,
  kindCounts,
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
  truncation,
  voteRowActions
} from './outreachRows';

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
    ['perk draft', perk(), 'draft'],
    ['perk inviting', perk({ status: 'inviting' }), 'live'],
    ['perk closed', perk({ status: 'closed' }), 'ended'],
    ['round draft', round({ status: 'draft' }), 'draft'],
    ['round open', round(), 'live'],
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
    expect(rows.find((r) => r.kind === 'discount')?.statusDetail).toBe('8 codes in tiles');
    expect(rows.find((r) => r.kind === 'event')?.statusDetail).toBe('12 invited · 4 booked');
    // Anchored: unanchored, this also passes for "19 votes".
    expect(rows.find((r) => r.kind === 'vote')?.statusDetail).toMatch(/^9 votes · closes /);
  });
});

describe('statusDetail — the exact words of every branch', () => {
  it('a LIVE discount that reached nobody says so, rather than restating the offer', () => {
    // 0 codes on a live rule means nobody was eligible. "10% off" would hide
    // that behind a number that never moves.
    expect(statusFor(promo({ is_active: true, codes_issued: 0 })).statusDetail).toBe('0 codes in tiles');
  });

  it('a DRAFT discount describes the offer, because it has no reach yet', () => {
    expect(statusFor(promo({ is_active: false, codes_issued: 0, discount_pct: '10.00' })).statusDetail).toBe('10% off');
  });

  it('an ENDED discount reports the reach it had', () => {
    expect(statusFor(promo({ is_active: false, codes_issued: 8 })).statusDetail).toBe('8 codes in tiles');
  });

  it('counts are singular at one', () => {
    expect(statusFor(promo({ is_active: true, codes_issued: 1 })).statusDetail).toBe('1 code in tiles');
    expect(statusFor(round({ status: 'closed', vote_count: 1 })).statusDetail).toBe('1 vote · closed');
  });

  it('a perk nobody has been invited to yet', () => {
    expect(statusFor(perk({ status: 'draft' })).statusDetail).toBe('Not sent yet');
  });

  it('a round that has not opened, and one that has closed', () => {
    expect(statusFor(round({ status: 'draft' })).statusDetail).toBe('Not opened yet');
    expect(statusFor(round({ status: 'closed', vote_count: 9 })).statusDetail).toBe('9 votes · closed');
  });

  it('an open round with no closing date says that, rather than leaving the clause off', () => {
    expect(statusFor(round({ status: 'open', closes_at: null, vote_count: 9 })).statusDetail).toBe('9 votes · no close date');
  });

  it('an open round with a closing date names it', () => {
    expect(statusFor(round({ status: 'open', closes_at: '2026-09-20T00:00:00Z', vote_count: 9 })).statusDetail).toBe(
      `9 votes · closes ${shortDate('2026-09-20T00:00:00Z')}`
    );
  });
});

describe('kindCounts and filterRows', () => {
  it('counts respect the status filter, chips overlap nothing', () => {
    const rows = buildOutreachRows([promo(), promo({ id: 'p2', is_active: true })], [perk()], []);
    expect(kindCounts(rows, 'all')).toEqual({ discount: 2, event: 1, vote: 0 });
    expect(kindCounts(rows, 'live')).toEqual({ discount: 1, event: 0, vote: 0 });
    expect(filterRows(rows, { status: 'live', kind: null, query: '' })).toHaveLength(1);
    expect(filterRows(rows, { status: 'all', kind: 'event', query: 'prev' })).toHaveLength(1);
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
    const out = prefillFor('event', {
      title: 'Vault preview',
      perk_type: 'early_access',
      eligible_scope: 'tier',
      tier: 'vault',
      capacity: 14,
      event_date: '2026-09-30T18:00:00Z',
      location: ''
    });
    expect(out.perk_type).toBe('early_access');
    expect(out.capacity).toBe('14');
    expect(out.event_date).toBe(isoToLocalInput('2026-09-30T18:00:00Z'));
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
  it('keys on the same string buildOutreachRows mints', () => {
    const rows = buildOutreachRows([promo()], [perk()], [round()]);
    const sources = outreachSources([promo()], [perk()], [round()]);
    rows.forEach((row) => {
      expect(sources[row.key]).toBeDefined();
      expect(sources[row.key].kind).toBe(row.kind);
    });
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
  it('sums shown and total across the three responses', () => {
    const result = truncation([
      { count: 4, results: [1, 2, 3, 4] },
      { count: 2, results: [1, 2] },
      { count: 1, results: [1] }
    ]);
    expect(result).toEqual({ shown: 7, total: 7, truncated: false });
  });

  it('is truncated when one response is short of its own count', () => {
    const result = truncation([
      { count: 100, results: new Array(60).fill(0) },
      { count: 3, results: [1, 2, 3] },
      { count: 0, results: [] }
    ]);
    expect(result).toEqual({ shown: 63, total: 103, truncated: true });
  });

  it('asks the question per response, not of the summed totals', () => {
    // A server that reported more rows than it counted would make the sums
    // agree while one response was genuinely short — `total > shown` reads
    // that as whole, and the table would silently drop rows.
    const result = truncation([
      { count: 2, results: [1] },
      { count: 1, results: [1, 2] }
    ]);
    expect(result.shown).toBe(result.total);
    expect(result.truncated).toBe(true);
  });

  it('survives an absent response — still loading, or failed — without throwing', () => {
    expect(() => truncation([undefined, null])).not.toThrow();
    expect(truncation([undefined, null, { count: 2, results: [1, 2] }])).toEqual({ shown: 2, total: 2, truncated: false });
  });

  it('is not truncated for three empty responses', () => {
    expect(truncation([{ count: 0, results: [] }])).toEqual({ shown: 0, total: 0, truncated: false });
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
    expect(actions.openBlockedReason).toBe('Add at least 2 options before voting can open');
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

  it('a reason is present exactly when the control is disabled — for ALL THREE controls', () => {
    const cases = [
      round({ status: 'draft', options: [{ label: 'A' }, { label: 'B' }] }),
      round({ status: 'draft', options: [] }),
      round({ status: 'open' }),
      round({ status: 'closed' })
    ];
    cases.forEach((r) => {
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

  it('says so plainly when nobody new was invited', () => {
    expect(inviteResultMessage(0)).toBe('Nobody new to invite — everyone eligible is already on the list.');
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

  it('pads up to the minimum so the ballot opens valid', () => {
    expect(ballotRows([{ label: 'Only one' }], 2)).toHaveLength(2);
    expect(ballotRows([], 2)).toHaveLength(2);
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
    const iso = '2026-09-20T18:30:00Z';
    const expected = new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    expect(shortDate(iso)).toBe(expected);
  });
});

describe('rowBody — the row second line', () => {
  const eventRow = (over: Partial<PerkEvent> = {}) => buildOutreachRows([], [perk(over)], [])[0];

  it('an event carries its date — the field an owner scans an events list for', () => {
    const row = eventRow({ event_date: '2026-10-01T12:00:00' });
    expect(rowBody(row)).toBe(`Invite to an event or perk · Vault · ${shortDate('2026-10-01T12:00:00')}`);
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
