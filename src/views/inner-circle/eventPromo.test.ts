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
  eventChannelSentence,
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
  notificationMayNotArrive,
  offerPreviewCaption,
  promotionDeleteErrorMessage,
  promotionSaveErrorMessage,
  segmentSummary,
  suggestedOfferId
} from './eventPromo';
import { OUTREACH_CHANNEL_SENTENCE_EVENT } from 'ui-component/inner-circle/outreachChannel';

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
      textLocked: false,
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

  it('a draft whose days have certainly passed cannot be switched on', () => {
    expect(eventFormLocks(rule(), '2026-10-31', { activating: true })).toMatchObject({
      canSave: false,
      saveBlockedReason: 'Its days have passed, so it can’t be switched on now.'
    });
  });

  it('the day after its last day is the STORE’s call, not the browser’s — the save is allowed and the server decides', () => {
    // The window is the store's local days and "today" is the browser's. A
    // browser a few hours ahead of the store reads the 30th while the store is
    // still on the 29th, so the client must not refuse what the server would
    // accept; one day of margin covers every zone pair.
    expect(eventFormLocks(rule(), '2026-10-30', { activating: true })).toMatchObject({ canSave: true, saveBlockedReason: null });
  });

  // Review round 3 (C1/C4/C5/C9/C10/C11/C13/C14): round 2 locked EVERY
  // prepared draft opened from the table, so a draft whose card was dismissed
  // or lapsed could be changed nowhere, and its sentence promised a switch the
  // row refuses and a card that may be gone. The lock now follows the row's
  // own mark: held while its suggestion is open on This week or the cards have
  // not loaded (fail safe), and lifted when no card is open.
  it('from the table, a draft whose suggestion is open on This week is changed from there', () => {
    expect(eventFormLocks(rule(), '2026-10-20', { activating: false, tableMark: true })).toEqual({
      locked: true,
      textLocked: true,
      lockReason: 'Its suggestion is open in This week: change it and switch it on from there.',
      canSave: false,
      saveBlockedReason: null
    });
  });

  it('from the table, while This week’s suggestions have not loaded, nothing can be changed yet', () => {
    expect(eventFormLocks(rule(), '2026-10-20', { activating: false, tableMark: null })).toEqual({
      locked: true,
      textLocked: true,
      lockReason: 'This week’s suggestions haven’t loaded yet, so it can’t be changed here for now.',
      canSave: false,
      saveBlockedReason: null
    });
  });

  it('from the table, a draft with no open card (dismissed, lapsed or snoozed) is editable — nothing else can change it', () => {
    expect(eventFormLocks(rule(), '2026-10-20', { activating: false, tableMark: false })).toEqual({
      locked: false,
      textLocked: false,
      lockReason: null,
      canSave: true,
      saveBlockedReason: null
    });
  });

  it('no lock sentence offers a switch-on the dialog does not have', () => {
    for (const mark of [true, null, false] as const) {
      const reason = eventFormLocks(rule(), '2026-10-20', { activating: false, tableMark: mark }).lockReason ?? '';
      expect(reason).not.toMatch(/as it is|Here you can/);
    }
  });

  it('from This week the draft is editable, and a live promo’s name stays editable from the table', () => {
    expect(eventFormLocks(rule(), '2026-10-20', { activating: true })).toMatchObject({ locked: false, textLocked: false });
    for (const mark of [true, null, false] as const) {
      expect(eventFormLocks(live(), '2026-10-20', { activating: false, tableMark: mark })).toMatchObject({
        locked: true,
        textLocked: false,
        lockReason: 'This promo is on or has issued codes, so its discount and dates are fixed.',
        canSave: true
      });
    }
  });

  // Review round 3 (C7): the switch-on is judged on the window THIS SAVE
  // sends, not the stored one — otherwise dates moved into the past keep an
  // enabled Switch on that can only answer 409 window_ended.
  it('switching on is judged on the window the save sends', () => {
    const past = { valid_from: '2026-10-10', valid_to: '2026-10-12' };
    const ahead = { valid_from: '2026-10-27', valid_to: '2026-10-29' };
    expect(eventFormLocks(rule(), '2026-10-22', { activating: true, window: past })).toMatchObject({
      canSave: false,
      saveBlockedReason: 'Its days have passed, so it can’t be switched on now.'
    });
    expect(eventFormLocks(rule(past), '2026-10-22', { activating: true, window: ahead })).toMatchObject({
      canSave: true,
      saveBlockedReason: null
    });
    // A fixed rule's dates are never sent, so its STORED window is judged.
    expect(eventFormLocks(live(past), '2026-10-22', { activating: true, window: ahead }).canSave).toBe(false);
  });

  it('a text-locked form sends nothing; a date-locked one never sends discount or dates', () => {
    const form = { ...eventFormState(rule()), discount_pct: '20', valid_to: '2026-10-30', name: 'Renamed', description: 'x' };
    expect(eventRulePatch(form, rule(), { activate: false, locked: true, textLocked: true })).toEqual({});
    expect(eventRulePatch(form, rule(), { activate: false, locked: true })).toEqual({ name: 'Renamed', description: 'x' });
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

  it('a LIVE rule never reads as a draft — not on the margin day, not without a window (review round 2)', () => {
    // The browser is on the 30th, the store still on the 29th: the server
    // switched it on, and the owner must not be told to go and switch it on.
    expect(eventNextStep(live(), '2026-10-30')).toBe('Live — codes are in members’ tiles until Oct 29.');
    expect(eventNextStep(live({ valid_from: null, valid_to: null }), '2026-10-30')).toBe('Live — codes are in members’ tiles.');
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
    ['draft past its window', rule(), '2026-10-31', false],
    ['live', live(), '2026-10-20', false],
    ['live past its window', live(), '2026-10-31', false],
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
    expect(view(rule(), '2026-10-31')).toEqual([false, 'Its days have passed — it can’t go out now', true, null]);
    // The day after its last day is ambiguous across zones: the switch stays the server's call.
    expect(view(rule(), '2026-10-30')).toEqual([true, null, true, null]);
    expect(view(live(), '2026-10-20')).toEqual([true, null, false, 'This promo is on — switch it off to withdraw it']);
    expect(view(live(), '2026-10-31')).toEqual([
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

  it('while This week’s suggestions are unknown, a draft is not switched on from here (fail safe)', () => {
    const a = eventRowActions(rule(), '2026-10-20', { suggested: null });
    expect(a.canToggle).toBe(false);
    expect(a.switchBlockedReason).toBe('This week’s suggestions haven’t loaded — switch it on once they have');
    // A live promo can still be withdrawn: that never depends on the card.
    expect(eventRowActions(live(), '2026-10-20', { suggested: null }).canToggle).toBe(true);
  });

  it('the switch says what turning it will do', () => {
    expect(eventRowActions(rule(), '2026-10-20', { suggested: false }).switchTooltip).toBe('Draft — switch on to send it');
    expect(eventRowActions(live(), '2026-10-20', { suggested: false }).switchTooltip).toBe('Live — switch off to withdraw it');
  });
});

describe('confirm copy', () => {
  // C13: activation QUEUES the offer; the overnight send delivers it, and
  // suppresses it once the window has closed. "Now" was a promise the system
  // does not keep.
  it('switching on before the window: notified overnight, code works on its days, final', () => {
    expect(eventSwitchOnConfirm(rule(), '2026-10-20')).toEqual({
      heading: 'Switch this promo on?',
      body: 'Members in its group get a notification with the overnight send, and their code works Oct 27 – Oct 29, 2026. Once it is on, its discount and dates are fixed; switching it off later withdraws the codes for good.'
    });
  });

  it('switching on inside the window: the code is in their tile now, the notification comes overnight', () => {
    expect(eventSwitchOnConfirm(rule(), '2026-10-28').body).toBe(
      'Members in its group find their code in their Inner Circle tile right away and get a notification with the overnight send; it works until Oct 29. Once it is on, its discount and dates are fixed; switching it off later withdraws the codes for good.'
    );
  });

  it('on the margin day (the browser past its last day, the store perhaps not) it says what can and cannot happen', () => {
    expect(eventSwitchOnConfirm(rule(), '2026-10-30').body).toBe(
      'Its last day is today at the store or has just passed: if it is still on, members find the code in their Inner Circle tile right away, but may not get a notification — the overnight send skips a promo whose last day has ended at the store. If its days are over at the store, it won’t switch on and nothing is sent. Once it is on, its discount and dates are fixed; switching it off later withdraws the codes for good.'
    );
  });

  // Review round 3 (C6): the browser's day is not the store's, and the
  // overnight send runs at a fixed hour — so on the last day a notification
  // is UNCERTAIN, never promised and never ruled out.
  it('notificationMayNotArrive — on its last day and after, a notification is not assured', () => {
    expect(notificationMayNotArrive(rule(), '2026-10-20')).toBe(false);
    expect(notificationMayNotArrive(rule(), '2026-10-28')).toBe(false);
    expect(notificationMayNotArrive(rule(), '2026-10-29')).toBe(true);
    expect(notificationMayNotArrive(rule(), '2026-10-30')).toBe(true);
    expect(notificationMayNotArrive(rule({ valid_to: null }), '2026-10-30')).toBe(false);
  });

  it('switching on on its LAST day says a notification may not reach them', () => {
    expect(eventSwitchOnConfirm(rule(), '2026-10-29').body).toBe(
      'Today is its last day: members in its group find the code in their Inner Circle tile right away, but may not get a notification — the overnight send skips a promo whose last day has ended at the store. Once it is on, its discount and dates are fixed; switching it off later withdraws the codes for good.'
    );
  });

  it('no switch-on copy rules a notification out for certain', () => {
    for (const today of ['2026-10-20', '2026-10-28', '2026-10-29', '2026-10-30']) {
      expect(eventSwitchOnConfirm(rule(), today).body).not.toMatch(/no notification goes out/);
    }
  });

  it('switching off is a withdrawal', () => {
    expect(eventWithdrawConfirm('Concert promo')).toEqual({
      heading: 'Withdraw this promo?',
      body: '“Concert promo” stops now: members’ unused codes stop working, and it can’t be switched on again. Codes already used at the till stay as they are.'
    });
  });

  it('deleting a suggested draft says the suggestion goes too', () => {
    expect(eventDeleteConfirm('Concert promo', { suggested: true })).toEqual({
      heading: 'Delete this event promo?',
      body: '“Concert promo” and its unsent message will be removed, and its suggestion leaves This week. Nothing has gone to members.'
    });
  });

  it('with This week not loaded, deleting says its suggestion goes too if it is there (review round 3, C3)', () => {
    expect(eventDeleteConfirm('Concert promo', { suggested: null }).body).toBe(
      '“Concert promo” and its unsent message will be removed, and its suggestion leaves This week if it is still there. Nothing has gone to members.'
    );
  });

  it('deleting a draft whose card is gone does not mention a suggestion', () => {
    expect(eventDeleteConfirm('Concert promo', { suggested: false }).body).toBe(
      '“Concert promo” and its unsent message will be removed. Nothing has gone to members.'
    );
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
      'Queued when it is switched on and delivered with the overnight send, with the promo’s discount and dates filled in at that moment.'
    );
    expect(offerPreviewCaption({ status: 'sent', sent_at: new Date(2026, 9, 21, 15, 0).toISOString() }, 'loaded')).toBe(
      'Queued for members on Oct 21.'
    );
    expect(offerPreviewCaption(null, 'missing')).toBe(
      'No message goes out with this promo; members find the code in their Inner Circle tile.'
    );
    expect(offerPreviewCaption(null, 'unavailable')).toBe('The message preview could not be loaded.');
    // On its last day (or after) the queued message may not be delivered.
    expect(offerPreviewCaption({ status: 'draft', sent_at: null }, 'loaded', { mayNotDeliver: true })).toBe(
      'May not be delivered if it is switched on now: the overnight send skips a promo whose last day has ended at the store. Members find the code in their Inner Circle tile.'
    );
  });
});

// Review round 3 (C2/C8/C12): round 2 made the dialog honest on the last day
// and left the card one click earlier promising a notification.
describe('the event channel sentence — honest on its last day, on the card and in the dialog', () => {
  const LAST_DAY =
    'Members with the app see it in their Inner Circle tile, but on its last day a notification may not reach them; the code works at the till only on the promo’s days.';
  it('before its last day it is the event sentence; on its last day and after it says a notification may not arrive', () => {
    expect(eventChannelSentence('2026-10-29', '2026-10-28')).toBe(OUTREACH_CHANNEL_SENTENCE_EVENT);
    expect(eventChannelSentence('2026-10-29', '2026-10-29')).toBe(LAST_DAY);
    expect(eventChannelSentence('2026-10-29', '2026-10-30')).toBe(LAST_DAY);
  });

  it('a missing or malformed last day reads as the plain event sentence', () => {
    expect(eventChannelSentence(undefined, '2026-10-30')).toBe(OUTREACH_CHANNEL_SENTENCE_EVENT);
    expect(eventChannelSentence('2026-10-29T00:00:00Z', '2026-10-30')).toBe(OUTREACH_CHANNEL_SENTENCE_EVENT);
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
