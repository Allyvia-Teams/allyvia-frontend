import { describe, expect, it } from 'vitest';

import type { PromotionRule } from 'api/innerCircle.api';

import {
  activationRefusalMessage,
  canManageCompanySettings,
  companySaveErrorMessage,
  EVENT_PROMO_REMOVED,
  EVENT_PROMOS_OFF_CAPTION,
  EVENT_PROMOS_ON_CAPTION,
  eventCardFacts,
  eventDeleteConfirm,
  eventFormLocks,
  eventFormState,
  eventFormValid,
  eventNextStep,
  eventPromosSwitchView,
  eventRowActions,
  eventRuleLocked,
  eventRulePatch,
  eventRuleState,
  eventRuleStatus,
  eventSetupFailure,
  eventSetupPlan,
  eventSwitchedOnMessage,
  eventSwitchOnConfirm,
  eventWithdrawConfirm,
  isEventPromoCard,
  isEventPromoPrefill,
  isEventRule,
  isYmd,
  localDayLabel,
  localTodayISO,
  offerPreviewCaption,
  promotionDeleteErrorMessage,
  promotionSaveErrorMessage,
  segmentSummary,
  suggestedOfferId
} from './eventPromo';

/**
 * TIMEZONE RULE (outreachRows.test.ts's, restated): every window date here is
 * a bare YYYY-MM-DD, which is a LOCAL calendar day, and every expectation is
 * a hardcoded literal. `new Date('2026-10-27')` would be UTC midnight — the
 * 26th in New York — which is the exact defect `localDayLabel` exists to
 * avoid, so this file is run under TZ=America/New_York and Pacific/Auckland
 * too.
 */

const rule = (over: Partial<PromotionRule> = {}): PromotionRule => ({
  id: 'p1',
  name: '"Riverside concert" Thu Oct 29: offer dresses to members',
  description: '',
  tier_scope: 'segment',
  top_n: null,
  discount_pct: '10.00',
  cadence_days: 30,
  code_valid_days: 14,
  trigger_type: 'event',
  is_active: false,
  codes_issued: 0,
  valid_from: '2026-10-27',
  valid_to: '2026-10-29',
  segment: { categories: ['clothing'] },
  store: 'loc-1',
  created_at: '2026-10-20T12:00:00',
  updated_at: '2026-10-20T12:00:00',
  ...over
});

const live = (over: Partial<PromotionRule> = {}) => rule({ is_active: true, codes_issued: 15, ...over });

describe('identity', () => {
  it('an event card is the event rec type on the discount wire kind', () => {
    expect(isEventPromoCard({ kind: 'discount', rec_type: 'event_promo' })).toBe(true);
    expect(isEventPromoCard({ kind: 'discount', rec_type: 'member_winback' })).toBe(false);
    expect(isEventPromoCard({ kind: 'discount' })).toBe(false);
    // A malformed card naming the rec type on another kind is not one: the
    // accept must send the card's own kind, and only `discount` has a composer
    // that edits a promotion rule.
    expect(isEventPromoCard({ kind: 'event', rec_type: 'event_promo' })).toBe(false);
  });

  it('an event rule is the event trigger', () => {
    expect(isEventRule(rule())).toBe(true);
    expect(isEventRule(rule({ trigger_type: 'winback' }))).toBe(false);
    expect(isEventRule(null)).toBe(false);
    expect(isEventRule(undefined)).toBe(false);
  });

  it('an event prefill carries its event object', () => {
    expect(isEventPromoPrefill({ event: { key: 'phq:1' }, valid_from: '2026-10-27' })).toBe(true);
    expect(isEventPromoPrefill({ name: 'Welcome back' })).toBe(false);
    expect(isEventPromoPrefill({ event: 'phq:1' })).toBe(false);
    expect(isEventPromoPrefill(null)).toBe(false);
  });
});

describe('dates are local calendar days, never instants', () => {
  it('isYmd accepts a real calendar day and nothing else', () => {
    expect(isYmd('2026-10-27')).toBe(true);
    expect(isYmd('2028-02-29')).toBe(true);
    expect(isYmd('2026-02-29')).toBe(false);
    expect(isYmd('2026-13-01')).toBe(false);
    expect(isYmd('2026-10-27T00:00:00Z')).toBe(false);
    expect(isYmd('27/10/2026')).toBe(false);
    expect(isYmd('')).toBe(false);
    expect(isYmd(null)).toBe(false);
    expect(isYmd(20261027)).toBe(false);
  });

  it('localTodayISO reads the local wall date, zero-padded', () => {
    expect(localTodayISO(new Date(2026, 9, 5, 0, 1))).toBe('2026-10-05');
    expect(localTodayISO(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });

  it('localDayLabel parses YYYY-MM-DD as a local day (the New York trap)', () => {
    expect(localDayLabel('2026-10-27')).toBe('Oct 27');
    expect(localDayLabel('2026-01-01')).toBe('Jan 1');
    expect(localDayLabel('2026-10-27T00:00:00Z')).toBe('');
    expect(localDayLabel(null)).toBe('');
  });
});

describe('eventRuleState — before, inside and after the window, inclusive ends', () => {
  it.each<[string, Partial<PromotionRule>, string, string | null]>([
    ['draft before its window', {}, '2026-10-20', 'draft'],
    ['draft on its first day', {}, '2026-10-27', 'draft'],
    ['draft on its last day', {}, '2026-10-29', 'draft'],
    ['draft the day after', {}, '2026-10-30', 'draft_past'],
    ['live before its window', { is_active: true, codes_issued: 15 }, '2026-10-26', 'live_before'],
    ['live on its first day', { is_active: true, codes_issued: 15 }, '2026-10-27', 'live_inside'],
    ['live on its last day', { is_active: true, codes_issued: 15 }, '2026-10-29', 'live_inside'],
    ['live the day after', { is_active: true, codes_issued: 15 }, '2026-10-30', 'live_past'],
    ['off with codes is withdrawn, whatever the day', { is_active: false, codes_issued: 15 }, '2026-10-20', 'withdrawn'],
    ['withdrawn after its window too', { is_active: false, codes_issued: 15 }, '2026-11-20', 'withdrawn'],
    ['no window → not an event state', { valid_from: null }, '2026-10-20', null],
    ['a malformed window → not an event state', { valid_to: '2026-10-29T00:00:00Z' }, '2026-10-20', null],
    ['an inverted window → not an event state', { valid_from: '2026-10-30' }, '2026-10-20', null]
  ])('%s', (_label, over, today, expected) => {
    expect(eventRuleState(rule(over), today)).toBe(expected);
  });

  it('a one-day window is inside on that day and past the next', () => {
    const oneDay = rule({ is_active: true, codes_issued: 3, valid_from: '2026-10-29', valid_to: '2026-10-29' });
    expect(eventRuleState(oneDay, '2026-10-29')).toBe('live_inside');
    expect(eventRuleState(oneDay, '2026-10-30')).toBe('live_past');
  });
});

describe('eventRuleStatus — the Outreach row status for an event rule', () => {
  it.each<[string, Partial<PromotionRule>, string, string, string]>([
    ['draft, before', {}, '2026-10-20', 'draft', 'Oct 27 – Oct 29, 2026'],
    ['draft, on its last day', {}, '2026-10-29', 'draft', 'Oct 27 – Oct 29, 2026'],
    ['draft, past', {}, '2026-10-30', 'ended', 'Not switched on · ended Oct 29'],
    ['live, before', { is_active: true, codes_issued: 15 }, '2026-10-21', 'live', '15 codes issued · opens Oct 27 · ends Oct 29'],
    ['live, inside', { is_active: true, codes_issued: 15 }, '2026-10-28', 'live', '15 codes issued · ends Oct 29'],
    ['live, past', { is_active: true, codes_issued: 15 }, '2026-10-30', 'ended', '15 codes issued · ended Oct 29'],
    ['withdrawn', { is_active: false, codes_issued: 15 }, '2026-10-28', 'ended', 'Withdrawn · 15 codes issued'],
    ['one code is singular', { is_active: true, codes_issued: 1 }, '2026-10-28', 'live', '1 code issued · ends Oct 29']
  ])('%s', (_label, over, today, status, detail) => {
    expect(eventRuleStatus(rule(over), today)).toEqual({ status, statusDetail: detail });
  });

  it('a one-day window reads as one date', () => {
    expect(eventRuleStatus(rule({ valid_from: '2026-10-29', valid_to: '2026-10-29' }), '2026-10-20')?.statusDetail).toBe('Oct 29, 2026');
  });

  it('returns null when the rule has no usable window, so the generic status applies', () => {
    expect(eventRuleStatus(rule({ valid_from: null, valid_to: null }), '2026-10-20')).toBeNull();
  });
});

describe('segmentSummary — attribute words only, never a person and never a store id', () => {
  it('names the consumer categories', () => {
    expect(segmentSummary({ categories: ['clothing'] })).toBe('Members interested in clothing');
    expect(segmentSummary({ categories: ['clothing', 'shoes'] })).toBe('Members interested in clothing or shoes');
    expect(segmentSummary({ categories: ['clothing', 'shoes', 'beauty'] })).toBe('Members interested in clothing, shoes or beauty');
  });

  it('drops anything that is not a plain category word, and duplicates', () => {
    expect(segmentSummary({ categories: ['clothing', 7, null, '', 'clothing', 'a1b2-uuid-like-0f'] })).toBe(
      'Members interested in clothing'
    );
  });

  it('a narrowed segment adds a clause and NEVER prints the internal store keys', () => {
    const narrowed = {
      categories: ['clothing'],
      store_id: '7f574f71-07b6-4f59-95db-2528c76d8628',
      store_before: '2026-10-20T12:00:00Z',
      store_recorded_before: '2026-10-20T12:00:01Z'
    };
    const summary = segmentSummary(narrowed);
    expect(summary).toBe('Members interested in clothing who have shopped at this store');
    expect(summary).not.toMatch(/7f574f71|2026/);
  });

  it('falls back to a plain sentence when nothing usable is there', () => {
    expect(segmentSummary(null)).toBe('The member group it was written for');
    expect(segmentSummary({})).toBe('The member group it was written for');
    expect(segmentSummary({ categories: 'clothing' })).toBe('The member group it was written for');
    expect(segmentSummary('clothing')).toBe('The member group it was written for');
  });
});

describe('eventCardFacts — the window and the store categories', () => {
  const prefill = { valid_from: '2026-10-27', valid_to: '2026-10-29', categories: ['dresses', 'tops'], event: { key: 'phq:1' } };

  it('says when the codes work and which of the store categories', () => {
    expect(eventCardFacts(prefill)).toEqual(['Codes work Oct 27 – Oct 29, 2026', 'Categories: dresses, tops']);
  });

  it('omits a fact it cannot state', () => {
    expect(eventCardFacts({ ...prefill, valid_to: undefined })).toEqual(['Categories: dresses, tops']);
    expect(eventCardFacts({ ...prefill, categories: [] })).toEqual(['Codes work Oct 27 – Oct 29, 2026']);
    expect(eventCardFacts(null)).toEqual([]);
  });

  it('never prints an id from the prefill', () => {
    const noisy = { ...prefill, promotion_rule_id: 'rule-uuid', targeted_offer_id: 'offer-uuid', store_id: 'loc-uuid' };
    expect(eventCardFacts(noisy).join(' ')).not.toMatch(/uuid/);
  });
});

describe('the event form — existing wins, and the patch never touches the audience', () => {
  it('seeds from the stored rule', () => {
    expect(eventFormState(rule())).toEqual({
      name: '"Riverside concert" Thu Oct 29: offer dresses to members',
      description: '',
      discount_pct: '10',
      valid_from: '2026-10-27',
      valid_to: '2026-10-29'
    });
  });

  it('a rule is locked once it is on or has issued codes', () => {
    expect(eventRuleLocked(rule())).toBe(false);
    expect(eventRuleLocked(rule({ is_active: true }))).toBe(true);
    expect(eventRuleLocked(rule({ codes_issued: 2 }))).toBe(true);
  });

  it('an unchanged draft switched on sends exactly is_active', () => {
    expect(eventRulePatch(eventFormState(rule()), rule(), { activate: true })).toEqual({ is_active: true });
  });

  it('sends only the fields the owner changed', () => {
    const form = { ...eventFormState(rule()), name: 'Concert promo', discount_pct: '15', valid_from: '2026-10-28' };
    expect(eventRulePatch(form, rule(), { activate: true })).toEqual({
      name: 'Concert promo',
      discount_pct: '15',
      valid_from: '2026-10-28',
      is_active: true
    });
  });

  it("'10' and '10.00' are the same discount", () => {
    expect(eventRulePatch({ ...eventFormState(rule()), discount_pct: '10.0' }, rule(), { activate: false })).toEqual({});
  });

  it('without activation there is no is_active key', () => {
    expect(eventRulePatch({ ...eventFormState(rule()), description: 'For the concert' }, rule(), { activate: false })).toEqual({
      description: 'For the concert'
    });
  });

  it('a locked rule drops discount and date changes, and never re-sends is_active', () => {
    const form = { ...eventFormState(live()), discount_pct: '20', valid_to: '2026-10-30', name: 'Renamed' };
    expect(eventRulePatch(form, live(), { activate: true })).toEqual({ name: 'Renamed' });
  });

  it('NEVER carries an audience or trigger key, whatever the form holds', () => {
    const hostile = { ...eventFormState(rule()), tier_scope: 'vault', trigger_type: 'manual', top_n: '10', segment: {}, store: 'x' };
    const forbidden = ['tier_scope', 'top_n', 'trigger_type', 'cadence_days', 'code_valid_days', 'segment', 'store'];
    [rule(), live()].forEach((r) => {
      [true, false].forEach((activate) => {
        const patch = eventRulePatch(hostile as never, r, { activate });
        forbidden.forEach((key) => expect(patch).not.toHaveProperty(key));
      });
    });
  });

  it('validates the window and the discount only while they are editable', () => {
    const form = eventFormState(rule());
    expect(eventFormValid(form, { locked: false })).toBe(true);
    expect(eventFormValid({ ...form, name: '  ' }, { locked: false })).toBe(false);
    expect(eventFormValid({ ...form, valid_from: '2026-10-30' }, { locked: false })).toBe(false);
    expect(eventFormValid({ ...form, valid_to: '' }, { locked: false })).toBe(false);
    expect(eventFormValid({ ...form, discount_pct: '0' }, { locked: false })).toBe(false);
    expect(eventFormValid({ ...form, discount_pct: '101' }, { locked: false })).toBe(false);
    expect(eventFormValid({ ...form, discount_pct: 'ten' }, { locked: false })).toBe(false);
    // Locked fields are not sent, so a stale value in them blocks nothing.
    expect(eventFormValid({ ...form, discount_pct: '101' }, { locked: true })).toBe(true);
  });
});

describe('eventFormLocks — what the dialog lets the owner do', () => {
  it('a draft is editable and can be switched on', () => {
    expect(eventFormLocks(rule(), '2026-10-20', { activating: true })).toEqual({
      locked: false,
      lockReason: null,
      canSave: true,
      saveBlockedReason: null
    });
  });

  it('a live rule says its discount and dates are fixed', () => {
    const locks = eventFormLocks(live(), '2026-10-20', { activating: false });
    expect(locks.locked).toBe(true);
    expect(locks.lockReason).toBe('This promo is on or has issued codes, so its discount and dates are fixed.');
    expect(locks.canSave).toBe(true);
  });

  it('a withdrawn rule cannot be switched on, but its name can still be edited', () => {
    const withdrawn = rule({ codes_issued: 15 });
    expect(eventFormLocks(withdrawn, '2026-10-20', { activating: true })).toMatchObject({
      canSave: false,
      saveBlockedReason: 'This promo was withdrawn. Its codes stopped working and it can’t be switched on again.'
    });
    expect(eventFormLocks(withdrawn, '2026-10-20', { activating: false }).canSave).toBe(true);
  });

  it('a draft whose days have passed cannot be switched on', () => {
    expect(eventFormLocks(rule(), '2026-10-30', { activating: true })).toMatchObject({
      canSave: false,
      saveBlockedReason: 'Its days have passed, so it can’t be switched on now.'
    });
  });
});

describe('activation refusals become sentences, and never print the count', () => {
  it.each<[string, string]>([
    ['below_floor', 'Fewer than 10 members match this promo right now, so it can’t go out. Nothing was sent and nothing was saved.'],
    ['window_ended', 'Its days have passed, so it can’t be switched on. Nothing was sent and nothing was saved.'],
    ['withdrawn', 'This promo was withdrawn and can’t be switched on again. Nothing was sent.'],
    [
      'segment_invalid',
      'The group this promo was written for is no longer valid, so it can’t go out. Nothing was sent and nothing was saved.'
    ],
    ['not_event_rule', 'This promo can’t be switched on this way. Nothing was sent and nothing was saved.'],
    ['already_sent', 'Its message has already gone out, so it can’t be sent again. Nothing new was sent.']
  ])('%s', (reason, copy) => {
    expect(activationRefusalMessage({ count: null, minimum: 10, reason })).toBe(copy);
  });

  it('a count, were one ever sent, is never printed', () => {
    const copy = activationRefusalMessage({ count: 7, minimum: 10, reason: 'below_floor' });
    expect(copy).not.toMatch(/7/);
  });

  it('a missing minimum still makes a sentence', () => {
    expect(activationRefusalMessage({ reason: 'below_floor' })).toBe(
      'Too few members match this promo right now, so it can’t go out. Nothing was sent and nothing was saved.'
    );
  });

  it('an unknown reason falls back to plain words', () => {
    expect(activationRefusalMessage({ count: null, minimum: 10, reason: 'quota_exceeded' })).toBe(
      'Couldn’t switch it on (quota exceeded). Nothing was sent and nothing was saved.'
    );
  });

  it('is null for a body that is not an activation refusal', () => {
    expect(activationRefusalMessage({ detail: 'x' })).toBeNull();
    expect(activationRefusalMessage('x')).toBeNull();
    expect(activationRefusalMessage(null)).toBeNull();
  });
});

const httpError = (status: number | undefined, data?: unknown) =>
  status === undefined ? new Error('Network Error') : { response: { status, data } };

describe('promotionSaveErrorMessage — every body shape the backend sends', () => {
  it('a 409 activation refusal', () => {
    expect(promotionSaveErrorMessage(httpError(409, { count: null, minimum: 10, reason: 'withdrawn' }))).toBe(
      'This promo was withdrawn and can’t be switched on again. Nothing was sent.'
    );
  });

  it('a 400 field list, a 400 bare field string, a bare string, and non-field errors', () => {
    const msg = 'An event promo’s audience is fixed; it was chosen with its count.';
    expect(promotionSaveErrorMessage(httpError(400, { tier_scope: [msg] }))).toBe(msg);
    expect(promotionSaveErrorMessage(httpError(400, { tier_scope: msg }))).toBe(msg);
    expect(promotionSaveErrorMessage(httpError(400, msg))).toBe(msg);
    expect(promotionSaveErrorMessage(httpError(400, [msg]))).toBe(msg);
    expect(promotionSaveErrorMessage(httpError(400, { non_field_errors: [msg] }))).toBe(msg);
    expect(promotionSaveErrorMessage(httpError(400, { detail: msg }))).toBe(msg);
  });

  it('a 404 says the promo is gone, not "Not found."', () => {
    expect(promotionSaveErrorMessage(httpError(404, { detail: 'Not found.' }))).toBe(
      'This promo is gone — its event may have moved. Nothing was sent.'
    );
  });

  it('a 403, an empty 400, a 500 and no response at all', () => {
    expect(promotionSaveErrorMessage(httpError(403, { detail: 'nope' }))).toBe('You don’t have permission to change this promo.');
    expect(promotionSaveErrorMessage(httpError(400, {}))).toBe('Couldn’t save that promo — try again.');
    expect(promotionSaveErrorMessage(httpError(500, '<html>'))).toBe('Couldn’t save that promo — try again.');
    expect(promotionSaveErrorMessage(httpError(undefined))).toBe('Couldn’t reach Allyvia — nothing was saved.');
  });
});

describe('promotionDeleteErrorMessage', () => {
  it('names each refusal', () => {
    expect(promotionDeleteErrorMessage(httpError(409, { detail: 'x', reason: 'event_promo_live' }))).toBe(
      'This promo is on, so it can’t be deleted. Switch it off to withdraw it.'
    );
    expect(promotionDeleteErrorMessage(httpError(409, { detail: 'x', reason: 'event_promo_withdrawn' }))).toBe(
      'A withdrawn promo stays as the record of the codes it issued.'
    );
    expect(promotionDeleteErrorMessage(httpError(404))).toBe('This promo is already gone.');
    expect(promotionDeleteErrorMessage(httpError(500))).toBe('Couldn’t delete that — try again.');
  });
});

describe('eventNextStep — said from the SAVED rule, naming its window', () => {
  it('before the window, inside it, and when it did not go live', () => {
    expect(eventNextStep(live(), '2026-10-21')).toBe('Live — members’ codes appear in their tiles on Oct 27 and work until Oct 29.');
    expect(eventNextStep(live(), '2026-10-28')).toBe('Live — codes are in members’ tiles until Oct 29.');
    expect(eventNextStep(rule(), '2026-10-21')).toBe('Saved as a draft — switch it on from Outreach.');
  });
});

describe('Set it up on an event card — fetch the pre-created rule, never create one', () => {
  const card = (prefill: Record<string, unknown> | null) => ({ id: 'rec', kind: 'discount' as const, rec_type: 'event_promo', prefill });

  it('fetches the rule (and names the offer) when the card carries them', () => {
    expect(eventSetupPlan(card({ promotion_rule_id: 'r1', targeted_offer_id: 'o1' }))).toEqual({
      action: 'fetch',
      ruleId: 'r1',
      offerId: 'o1'
    });
    expect(eventSetupPlan(card({ promotion_rule_id: 'r1' }))).toEqual({ action: 'fetch', ruleId: 'r1', offerId: null });
  });

  it('refuses, with a sentence, when there is no rule to fetch', () => {
    expect(eventSetupPlan(card({}))).toEqual({ action: 'refuse', message: EVENT_PROMO_REMOVED });
    expect(eventSetupPlan(card(null))).toEqual({ action: 'refuse', message: EVENT_PROMO_REMOVED });
    expect(eventSetupPlan(card({ promotion_rule_id: 42 }))).toEqual({ action: 'refuse', message: EVENT_PROMO_REMOVED });
  });

  it('a 404 refuses; anything else is an ordinary error', () => {
    expect(eventSetupFailure(httpError(404))).toEqual({ action: 'refuse', message: EVENT_PROMO_REMOVED });
    expect(eventSetupFailure(httpError(500))).toEqual({ action: 'error' });
    expect(eventSetupFailure(httpError(undefined))).toEqual({ action: 'error' });
  });

  it('suggestedOfferId reads a non-empty string id only', () => {
    expect(suggestedOfferId({ targeted_offer_id: 'o1' })).toBe('o1');
    expect(suggestedOfferId({ targeted_offer_id: '' })).toBeNull();
    expect(suggestedOfferId({ targeted_offer_id: 3 })).toBeNull();
    expect(suggestedOfferId(null)).toBeNull();
  });
});

describe('eventRowActions — each reason is null exactly when its control is enabled', () => {
  const cases: Array<[string, PromotionRule, string, boolean]> = [
    ['draft', rule(), '2026-10-20', false],
    ['suggested draft', rule(), '2026-10-20', true],
    ['draft past its window', rule(), '2026-10-30', false],
    ['live', live(), '2026-10-20', false],
    ['live past its window', live(), '2026-10-30', false],
    ['withdrawn', rule({ codes_issued: 15 }), '2026-10-20', false]
  ];

  it.each(cases)('%s keeps the biconditional', (_label, r, today, suggested) => {
    const actions = eventRowActions(r, today, { suggested });
    expect(actions.switchBlockedReason === null).toBe(actions.canToggle);
    expect(actions.deleteBlockedReason === null).toBe(actions.canDelete);
  });

  it('the table', () => {
    const view = (r: PromotionRule, today: string, suggested = false) => {
      const a = eventRowActions(r, today, { suggested });
      return [a.canToggle, a.switchBlockedReason, a.canDelete, a.deleteBlockedReason];
    };
    expect(view(rule(), '2026-10-20')).toEqual([true, null, true, null]);
    expect(view(rule(), '2026-10-20', true)).toEqual([false, 'Set it up from This week, where its suggestion is', true, null]);
    expect(view(rule(), '2026-10-30')).toEqual([false, 'Its days have passed — it can’t go out now', true, null]);
    expect(view(live(), '2026-10-20')).toEqual([true, null, false, 'This promo is on — switch it off to withdraw it']);
    expect(view(live(), '2026-10-30')).toEqual([
      false,
      'Its days are over — its codes have expired',
      false,
      'A promo that issued codes stays as their record'
    ]);
    expect(view(rule({ codes_issued: 15 }), '2026-10-20')).toEqual([
      false,
      'Withdrawn — its codes stopped working and it can’t be switched on again',
      false,
      'A promo that issued codes stays as their record'
    ]);
  });

  it('the switch says what turning it will do', () => {
    expect(eventRowActions(rule(), '2026-10-20', { suggested: false }).switchTooltip).toBe('Draft — switch on to send it');
    expect(eventRowActions(live(), '2026-10-20', { suggested: false }).switchTooltip).toBe('Live — switch off to withdraw it');
  });
});

describe('confirm copy', () => {
  it('switching on names the window and that it is final', () => {
    expect(eventSwitchOnConfirm(rule())).toEqual({
      heading: 'Switch this promo on?',
      body: 'Members in its group get a notification now, and their code works Oct 27 – Oct 29, 2026. Once it is on, its discount and dates are fixed; switching it off later withdraws the codes for good.'
    });
  });

  it('switching off is a withdrawal', () => {
    expect(eventWithdrawConfirm('Concert promo')).toEqual({
      heading: 'Withdraw this promo?',
      body: '“Concert promo” stops now: members’ unused codes stop working, and it can’t be switched on again. Codes already used at the till stay as they are.'
    });
  });

  it('deleting a draft says the suggestion goes too', () => {
    expect(eventDeleteConfirm('Concert promo')).toEqual({
      heading: 'Delete this event promo?',
      body: '“Concert promo” and its unsent message will be removed, and its suggestion leaves This week. Nothing has gone to members.'
    });
  });

  it('the switch-on result is the code count', () => {
    expect(eventSwitchedOnMessage(15)).toBe('Switched on — 15 codes issued.');
    expect(eventSwitchedOnMessage(1)).toBe('Switched on — 1 code issued.');
    expect(eventSwitchedOnMessage(undefined)).toBe('Switched on.');
  });
});

describe('the message preview caption', () => {
  it('a draft offer is rewritten at switch-on; a sent one names its day; a missing one says so', () => {
    expect(offerPreviewCaption({ status: 'draft', sent_at: null }, 'loaded')).toBe(
      'Sent when it is switched on, with the promo’s discount and dates filled in at that moment.'
    );
    expect(offerPreviewCaption({ status: 'sent', sent_at: new Date(2026, 9, 21, 15, 0).toISOString() }, 'loaded')).toBe(
      'Sent to members on Oct 21.'
    );
    expect(offerPreviewCaption(null, 'missing')).toBe(
      'No message goes out with this promo; members find the code in their Inner Circle tile.'
    );
    expect(offerPreviewCaption(null, 'unavailable')).toBe('The message preview could not be loaded.');
  });
});

describe('the Settings switch', () => {
  it('only an admin or an owner may change it', () => {
    expect(canManageCompanySettings('admin')).toBe(true);
    expect(canManageCompanySettings('owner')).toBe(true);
    expect(canManageCompanySettings('ADMIN')).toBe(true);
    expect(canManageCompanySettings('manager')).toBe(false);
    expect(canManageCompanySettings(undefined)).toBe(false);
  });

  it('is hidden while loading and when the backend does not send the field', () => {
    expect(eventPromosSwitchView(undefined, 'admin', { saving: false }).visible).toBe(false);
    expect(eventPromosSwitchView({}, 'admin', { saving: false }).visible).toBe(false);
  });

  it('reads the field, and says what each position means', () => {
    expect(eventPromosSwitchView({ event_promos_enabled: true }, 'admin', { saving: false })).toEqual({
      visible: true,
      checked: true,
      disabled: false,
      disabledReason: null,
      caption: EVENT_PROMOS_ON_CAPTION
    });
    expect(eventPromosSwitchView({ event_promos_enabled: false }, 'admin', { saving: false }).caption).toBe(EVENT_PROMOS_OFF_CAPTION);
    expect(EVENT_PROMOS_OFF_CAPTION).toBe(
      'Off — no new event promo suggestions from the next run. Promos and suggestions you already have stay as they are.'
    );
  });

  it('a non-admin sees it disabled with the reason; a save in flight disables it', () => {
    expect(eventPromosSwitchView({ event_promos_enabled: false }, 'manager', { saving: false })).toMatchObject({
      disabled: true,
      disabledReason: 'Only an admin can change this.'
    });
    expect(eventPromosSwitchView({ event_promos_enabled: false }, 'admin', { saving: true })).toMatchObject({
      disabled: true,
      disabledReason: null
    });
  });

  it('a 403 says who may change it; anything else asks to retry', () => {
    expect(companySaveErrorMessage(httpError(403))).toBe('Only an admin can change this.');
    expect(companySaveErrorMessage(httpError(500))).toBe('Couldn’t save that — try again.');
  });
});
