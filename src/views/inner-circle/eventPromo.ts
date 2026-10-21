// Imported from the module, never the `ui-component/frame` barrel: the barrel
// re-exports Panel and friends, which pull in MUI, and this file's tests run
// in vitest's plain `node` environment. Same rule `outreachRows.ts` follows.
import { isoWindowLabel, monthDay } from 'ui-component/frame/frame';

// `import type` ONLY — that module reads `import.meta.env` at load time.
import type { EventPromoPatch, PromotionRule, TargetedOfferPreview } from 'api/innerCircle.api';

/**
 * `eventPromo.ts` — the pure seam for E6, the merchant side of an EVENT PROMO.
 *
 * E5 writes an `event_promo` card for a store's next busy event day, and behind
 * it a rule Allyvia prepared: inactive, windowed (the days its codes work) and
 * segmented (the members it reaches were chosen by what THEY said they are
 * interested in). The card arrives on the `discount` wire kind, so without this
 * seam it ran down the win-back path end to end — and that path cannot carry
 * it:
 *
 * - `PromotionDialog` narrows `segment`→`vault` and `event`→`manual` and PATCHes
 *   every field, which the backend refuses ("audience is fixed");
 * - a 404 on the rule opens a CREATE path, which would mint a plain Vault
 *   discount, the wrong audience, no window, no floor;
 * - the till sentence promises "everyone else" a code only app members get;
 * - and "Live" says nothing about a window that opens next week.
 *
 * This file imports NEITHER `outreachRows` NOR `recommendationCards`: both of
 * those import it, and a cycle between seams is a load-order bug waiting for a
 * refactor. Every function is pure over plain objects; nothing fetches.
 *
 * PRIVACY (design N3, rule E5): stores pick ATTRIBUTES, never people. Nothing
 * here renders a member id, a count below the floor, or the internal `store_*`
 * keys a narrowed segment carries.
 */

export const EVENT_PROMO_REC_TYPE = 'event_promo';
const EVENT_TRIGGER = 'event';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * An event card is the `event_promo` rec type ON the `discount` wire kind.
 *
 * The kind half is not redundant: the accept endpoint checks
 * `outreach_kind == card.kind`, and only the `discount` composer edits a
 * promotion rule. A malformed card naming the rec type on another kind would
 * otherwise open the wrong dialog.
 */
export function isEventPromoCard(card: { kind: string; rec_type?: string | null }): boolean {
  return card.kind === 'discount' && card.rec_type === EVENT_PROMO_REC_TYPE;
}

/**
 * The rule Allyvia prepared for an event promo. A plain boolean, not a type
 * guard: every caller already holds a `PromotionRule`, and a guard would
 * narrow the other branch to `never`.
 */
export function isEventRule(rule: { trigger_type?: string } | null | undefined): boolean {
  return !!rule && rule.trigger_type === EVENT_TRIGGER;
}

/** A card prefill describing an event promo (it carries the event it is for). */
export function isEventPromoPrefill(prefill: Record<string, unknown> | null | undefined): boolean {
  const event = prefill?.event;
  return typeof event === 'object' && event !== null && !Array.isArray(event);
}

// ---------------------------------------------------------------------------
// Dates — calendar days, never instants
// ---------------------------------------------------------------------------

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A real `YYYY-MM-DD` calendar day, and nothing else: not an instant, not a
 * day that does not exist. The window is the STORE's local days, and the
 * moment one of these goes through `new Date('2026-10-27')` it becomes UTC
 * midnight — Oct 26 in New York.
 */
export function isYmd(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = YMD.exec(value);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Today's LOCAL calendar day as `YYYY-MM-DD`. Injectable so every status test
 * names its day; the default is the browser's clock.
 *
 * The browser's day, not the store's: the window is in the store's zone, and
 * nothing on this wire names it. The two agree for a merchant at their own
 * store, and where they do not (an owner abroad) the server is authoritative —
 * a switch-on it refuses comes back as a 409 this seam translates.
 */
export function localTodayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "Oct 27" from a `YYYY-MM-DD`, parsed as a LOCAL day; '' for anything else. */
export function localDayLabel(ymd: unknown): string {
  if (!isYmd(ymd)) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return monthDay(new Date(y, m - 1, d));
}

/** The local day after `ymd` (a valid `YYYY-MM-DD`), as `YYYY-MM-DD`. */
function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return localTodayISO(new Date(y, m - 1, d + 1));
}

/**
 * Past its last day in EVERY zone, not just the browser's (review C3/C5/C8).
 *
 * The window is the STORE's local days and `today` is the browser's: an owner
 * a few hours ahead of the store reads the 30th while the store is still on the
 * 29th, and a block on the browser's day would refuse what the server accepts.
 * No two zones are more than a day apart, so one day of margin makes the
 * client's refusal certain; inside that day the switch stays the server's call
 * (its 409 `window_ended` comes back translated). STATUS still reads by the
 * browser's day — a label may be a day early; a refusal may not.
 */
function certainlyPast(validTo: string | null | undefined, today: string): boolean {
  return isYmd(validTo) && today > nextDay(validTo);
}

/** "Oct 27 – Oct 29, 2026", or '' unless both ends are real days. */
function windowText(from: unknown, to: unknown): string {
  return isYmd(from) && isYmd(to) ? isoWindowLabel(from, to) : '';
}

function pluralCodes(n: number): string {
  return `${n} ${n === 1 ? 'code' : 'codes'}`;
}

/** `10.00` → `10`, `8.50` → `8.5`. */
function trimPercent(pct: string): string {
  const n = Number(pct);
  return Number.isNaN(n) ? pct : String(n);
}

// ---------------------------------------------------------------------------
// The rule's state, and the row status it reads as
// ---------------------------------------------------------------------------

export type EventRuleState = 'draft' | 'draft_past' | 'live_before' | 'live_inside' | 'live_past' | 'withdrawn';

type WindowedRule = Pick<PromotionRule, 'is_active' | 'codes_issued' | 'valid_from' | 'valid_to'>;

/**
 * Where an event rule stands on `today`. Both ends of the window are
 * INCLUSIVE (the codes work on the last day). `null` when the rule has no
 * usable window — the caller then falls back to the generic promotion status
 * rather than inventing one.
 *
 * Inactive WITH codes is a withdrawal, whatever the day: the only way an event
 * rule gets codes is by being switched on, and switching it off voids them
 * (E5: "withdrawal is a state", never reversible). Nothing on the backend turns
 * a rule off when its window ends, so a LIVE rule past its last day stays
 * `is_active` for ever — the clock is what says it ended.
 */
export function eventRuleState(rule: WindowedRule, today: string): EventRuleState | null {
  const from = rule.valid_from;
  const to = rule.valid_to;
  if (!isYmd(from) || !isYmd(to) || from > to) return null;
  if (!rule.is_active) {
    if (rule.codes_issued > 0) return 'withdrawn';
    return today > to ? 'draft_past' : 'draft';
  }
  if (today < from) return 'live_before';
  if (today > to) return 'live_past';
  return 'live_inside';
}

export interface EventRuleStatus {
  status: 'draft' | 'live' | 'ended';
  statusDetail: string;
}

/**
 * The Outreach row status for an event rule — called from INSIDE
 * `outreachRows.statusFor`'s promotion branch, so the table still has one
 * status switch. "Live" always carries the code count AND the end date, and
 * before the window opens it says when it opens: "Live" alone, on a promo
 * whose codes do not work for another week, would be read as "members can use
 * it now".
 */
export function eventRuleStatus(rule: WindowedRule, today: string): EventRuleStatus | null {
  const state = eventRuleState(rule, today);
  if (!state) return null;
  const reach = `${pluralCodes(rule.codes_issued)} issued`;
  const opens = localDayLabel(rule.valid_from);
  const ends = localDayLabel(rule.valid_to);
  switch (state) {
    case 'draft':
      return { status: 'draft', statusDetail: windowText(rule.valid_from, rule.valid_to) };
    case 'draft_past':
      return { status: 'ended', statusDetail: `Not switched on · ended ${ends}` };
    case 'live_before':
      return { status: 'live', statusDetail: `${reach} · opens ${opens} · ends ${ends}` };
    case 'live_inside':
      return { status: 'live', statusDetail: `${reach} · ends ${ends}` };
    case 'live_past':
      return { status: 'ended', statusDetail: `${reach} · ended ${ends}` };
    default:
      return { status: 'ended', statusDetail: `Withdrawn · ${reach}` };
  }
}

// ---------------------------------------------------------------------------
// Who it reaches — attribute words only
// ---------------------------------------------------------------------------

/** A plain category word ("clothing", "home goods") — never an id, a date or a number. */
const CATEGORY_WORD = /^[a-z][a-z &-]{0,39}$/i;

const NO_GROUP_WORDS = 'The member group it was written for';

/** "clothing" / "clothing or shoes" / "clothing, shoes or beauty". */
function orList(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}

/**
 * Who an event promo reaches, in the words its members used. The segment is
 * `ConsumerProfile.categories` — what members SAID they are interested in, not
 * what they bought — hence "interested in", never "who shop for".
 *
 * Reads `categories` and nothing else. A narrowed segment (behind the backend's
 * store-narrowing setting, off by default) also carries `store_id`,
 * `store_before` and `store_recorded_before`; their PRESENCE adds a fixed
 * clause, their VALUES are never printed. Any category entry that is not a
 * plain word is dropped rather than shown.
 */
export function segmentSummary(segment: unknown): string {
  if (typeof segment !== 'object' || segment === null || Array.isArray(segment)) return NO_GROUP_WORDS;
  const record = segment as Record<string, unknown>;
  const raw = Array.isArray(record.categories) ? record.categories : [];
  const words: string[] = [];
  raw.forEach((entry) => {
    if (typeof entry !== 'string') return;
    const word = entry.trim().toLowerCase();
    if (CATEGORY_WORD.test(word) && !words.includes(word)) words.push(word);
  });
  if (words.length === 0) return NO_GROUP_WORDS;
  const narrowed = typeof record.store_id === 'string' && record.store_id.length > 0;
  return `Members interested in ${orList(words)}${narrowed ? ' who have shopped at this store' : ''}`;
}

/**
 * The card's facts line: when the codes work, and which of the STORE's own
 * categories sold on those days last season. Two vocabularies on purpose and
 * labelled apart — the card speaks the store's words ("dresses"), the dialog's
 * "Who gets it" speaks the members' ("clothing").
 */
export function eventCardFacts(prefill: Record<string, unknown> | null | undefined): string[] {
  if (!prefill) return [];
  const facts: string[] = [];
  const window = windowText(prefill.valid_from, prefill.valid_to);
  if (window) facts.push(`Codes work ${window}`);
  const names = Array.isArray(prefill.categories)
    ? prefill.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim())
    : [];
  if (names.length > 0) facts.push(`Categories: ${names.join(', ')}`);
  return facts;
}

// ---------------------------------------------------------------------------
// The event dialog's form
// ---------------------------------------------------------------------------

export interface EventRuleForm {
  name: string;
  description: string;
  discount_pct: string;
  valid_from: string;
  valid_to: string;
}

/** The stored rule, always: an event promo is never created by hand, so there is no prefill to lay over it. */
export function eventFormState(rule: PromotionRule): EventRuleForm {
  return {
    name: rule.name,
    description: rule.description ?? '',
    discount_pct: trimPercent(rule.discount_pct),
    valid_from: isYmd(rule.valid_from) ? rule.valid_from : '',
    valid_to: isYmd(rule.valid_to) ? rule.valid_to : ''
  };
}

/** On, or has issued codes: the backend then refuses any change to the discount or the dates. */
export function eventRuleLocked(rule: Pick<PromotionRule, 'is_active' | 'codes_issued'>): boolean {
  return rule.is_active || rule.codes_issued > 0;
}

function discountValid(pct: string): boolean {
  if (pct.trim() === '') return false;
  const n = Number(pct);
  return Number.isFinite(n) && n > 0 && n <= 100;
}

/** Whether Save can be pressed. Locked fields are not sent, so a value in them blocks nothing. */
export function eventFormValid(form: EventRuleForm, options: { locked: boolean }): boolean {
  if (form.name.trim().length === 0) return false;
  if (options.locked) return true;
  return discountValid(form.discount_pct) && isYmd(form.valid_from) && isYmd(form.valid_to) && form.valid_from <= form.valid_to;
}

/**
 * The PATCH an event promo's dialog sends: ONLY what the owner changed, plus
 * `is_active: true` when this save switches it on.
 *
 * Never an audience or trigger key — `tier_scope`, `top_n`, `trigger_type`,
 * `segment`, `store`, `cadence_days`, `code_valid_days` — whatever the form
 * holds: the members were chosen with their count, and a changed scope is
 * refused. Once the rule is on (or has codes) its discount and dates are fixed,
 * so a locked rule drops them too. `'10'` and `'10.00'` are the same discount.
 */
export function eventRulePatch(
  form: EventRuleForm,
  rule: PromotionRule,
  options: { activate: boolean; locked?: boolean }
): EventPromoPatch {
  const patch: EventPromoPatch = {};
  const name = form.name.trim();
  if (name !== rule.name) patch.name = name;
  const description = form.description.trim();
  if (description !== (rule.description ?? '')) patch.description = description;
  // `locked` is the dialog's own (`eventFormLocks`), which also holds a
  // suggested draft's fields; the rule's state is the floor under it.
  if (!(options.locked ?? false) && !eventRuleLocked(rule)) {
    if (Number(form.discount_pct) !== Number(rule.discount_pct)) patch.discount_pct = String(Number(form.discount_pct));
    if (form.valid_from !== rule.valid_from) patch.valid_from = form.valid_from;
    if (form.valid_to !== rule.valid_to) patch.valid_to = form.valid_to;
  }
  if (options.activate && !rule.is_active) patch.is_active = true;
  return patch;
}

export const EVENT_LOCKED_SENTENCE = 'This promo is on or has issued codes, so its discount and dates are fixed.';
const SUGGESTED_LOCK_SENTENCE = 'Its suggestion is still open in This week — change its discount and dates there.';
const WITHDRAWN_SENTENCE = 'This promo was withdrawn. Its codes stopped working and it can’t be switched on again.';
const PAST_SENTENCE = 'Its days have passed, so it can’t be switched on now.';

export interface EventFormLocks {
  locked: boolean;
  lockReason: string | null;
  canSave: boolean;
  saveBlockedReason: string | null;
}

/**
 * What the dialog lets the owner do. Switching on (`activating`, the This-week
 * path) is refused up front for a withdrawn rule and for one whose days have
 * passed — the backend would answer 409 `withdrawn` / `window_ended`, and a
 * button that can only fail is worse than one that says why it is off. Editing
 * the name from Outreach stays possible either way.
 */
export function eventFormLocks(rule: PromotionRule, today: string, options: { activating: boolean; suggested?: boolean }): EventFormLocks {
  const fixed = eventRuleLocked(rule);
  // A SUGGESTED draft opened from Outreach keeps its discount and dates
  // (review C4/C10/C12): its card on This week states them — the "Codes work"
  // line, the cost at that discount — and is never rewritten, so an edit here
  // would leave the card describing a promo that no longer exists. They are
  // changed from This week, where the accept then retires the card.
  const suggestedLock = !fixed && !options.activating && !!options.suggested;
  const state = eventRuleState(rule, today);
  let saveBlockedReason: string | null = null;
  if (options.activating) {
    if (state === 'withdrawn') saveBlockedReason = WITHDRAWN_SENTENCE;
    else if ((state === 'draft_past' || state === 'live_past') && certainlyPast(rule.valid_to, today)) saveBlockedReason = PAST_SENTENCE;
  }
  return {
    locked: fixed || suggestedLock,
    lockReason: fixed ? EVENT_LOCKED_SENTENCE : suggestedLock ? SUGGESTED_LOCK_SENTENCE : null,
    canSave: saveBlockedReason === null,
    saveBlockedReason
  };
}

// ---------------------------------------------------------------------------
// Errors — every body shape the backend sends, as one sentence
// ---------------------------------------------------------------------------

const NOTHING_SAVED = 'Nothing was sent and nothing was saved.';

/**
 * The 409 an activation refusal answers: `{count: null, minimum, reason}`.
 * Each says what happened AND that nothing went out — the activation is one
 * transaction, so the owner's other edits in the same save were rolled back
 * too. `count` is NEVER read: a below-floor count is the one number the
 * merchant surface must not see.
 */
const ACTIVATION_REFUSAL: Record<string, (minimum: number | null) => string> = {
  below_floor: (minimum) =>
    minimum !== null
      ? `Fewer than ${minimum} members match this promo right now, so it can’t go out. ${NOTHING_SAVED}`
      : `Too few members match this promo right now, so it can’t go out. ${NOTHING_SAVED}`,
  window_ended: () => `Its days have passed, so it can’t be switched on. ${NOTHING_SAVED}`,
  withdrawn: () => 'This promo was withdrawn and can’t be switched on again. Nothing was sent.',
  segment_invalid: () => `The group this promo was written for is no longer valid, so it can’t go out. ${NOTHING_SAVED}`,
  not_event_rule: () => `This promo can’t be switched on this way. ${NOTHING_SAVED}`,
  already_sent: () => 'Its message has already gone out, so it can’t be sent again. Nothing new was sent.'
};

/** The activation refusal's sentence, or null when `body` is not one. Unknown reasons fall back to plain words. */
export function activationRefusalMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.reason !== 'string' || record.reason.length === 0) return null;
  const minimum = typeof record.minimum === 'number' && Number.isFinite(record.minimum) ? record.minimum : null;
  const known = ACTIVATION_REFUSAL[record.reason];
  if (known) return known(minimum);
  return `Couldn’t switch it on (${record.reason.replace(/_/g, ' ')}). ${NOTHING_SAVED}`;
}

interface HttpErrorLike {
  response?: { status?: number; data?: unknown };
}

function responseOf(error: unknown): { status: number | null; data: unknown } {
  const response = (error as HttpErrorLike | null)?.response;
  if (!response) return { status: null, data: undefined };
  return { status: typeof response.status === 'number' ? response.status : null, data: response.data };
}

/**
 * The first readable message in a DRF error body. The backend answers in
 * several shapes for the same rule — `{field: [msg]}` from the serializer,
 * `{field: msg}` from the view's under-lock re-check, a bare string, a list,
 * `non_field_errors`, `detail` — and every one of them must read as the
 * sentence it carries, not as "[object Object]".
 */
function firstMessage(data: unknown): string | null {
  if (typeof data === 'string') {
    const text = data.trim();
    return text && !text.startsWith('<') ? text : null;
  }
  if (Array.isArray(data)) {
    for (const entry of data) {
      const found = firstMessage(entry);
      if (found) return found;
    }
    return null;
  }
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    const ordered = ['non_field_errors', 'detail', ...Object.keys(record).filter((k) => k !== 'non_field_errors' && k !== 'detail')];
    for (const key of ordered) {
      const found = firstMessage(record[key]);
      if (found) return found;
    }
  }
  return null;
}

export const EVENT_PROMO_GONE = 'This promo is gone — its event may have moved. Nothing was sent.';

/** Any failed save of an event promo, as one sentence. */
export function promotionSaveErrorMessage(error: unknown): string {
  const { status, data } = responseOf(error);
  if (status === null) return 'Couldn’t reach Allyvia — nothing was saved.';
  if (status === 409) return activationRefusalMessage(data) ?? firstMessage(data) ?? 'Couldn’t save that promo — try again.';
  if (status === 404) return EVENT_PROMO_GONE;
  if (status === 403) return 'You don’t have permission to change this promo.';
  if (status === 400) return firstMessage(data) ?? 'Couldn’t save that promo — try again.';
  return 'Couldn’t save that promo — try again.';
}

const DELETE_REFUSAL: Record<string, string> = {
  event_promo_live: 'This promo is on, so it can’t be deleted. Switch it off to withdraw it.',
  event_promo_withdrawn: 'A withdrawn promo stays as the record of the codes it issued.'
};

/** A failed delete of an event promo, as one sentence. */
export function promotionDeleteErrorMessage(error: unknown): string {
  const { status, data } = responseOf(error);
  if (status === 404) return 'This promo is already gone.';
  if (status === 409 && typeof data === 'object' && data !== null) {
    const reason = (data as Record<string, unknown>).reason;
    if (typeof reason === 'string' && DELETE_REFUSAL[reason]) return DELETE_REFUSAL[reason];
  }
  return 'Couldn’t delete that — try again.';
}

// ---------------------------------------------------------------------------
// This week — Set it up, and what happens after
// ---------------------------------------------------------------------------

/** Said when an event card's prepared rule cannot be found. Never followed by a create. */
export const EVENT_PROMO_REMOVED = 'This event promo was removed — its event may have moved. Nothing was sent.';

export type EventSetupPlan = { action: 'fetch'; ruleId: string; offerId: string | null } | { action: 'refuse'; message: string };

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** The linked offer's id from a card prefill, or null. */
export function suggestedOfferId(prefill: Record<string, unknown> | null | undefined): string | null {
  return nonEmptyString(prefill?.targeted_offer_id);
}

/**
 * Set it up on an EVENT card: fetch the rule Allyvia prepared, or refuse.
 *
 * NEVER a create path. The win-back card's fallback opens a blank create form
 * when its rule is gone; for an event card that form would make an ordinary
 * Vault discount — no window, no group, no floor — and the backend refuses to
 * create an event rule anyway. A card with no rule id is one whose event moved
 * (the nightly retires those), so it says so.
 */
export function eventSetupPlan(card: { prefill?: Record<string, unknown> | null }): EventSetupPlan {
  const ruleId = nonEmptyString(card.prefill?.promotion_rule_id);
  if (!ruleId) return { action: 'refuse', message: EVENT_PROMO_REMOVED };
  return { action: 'fetch', ruleId, offerId: suggestedOfferId(card.prefill) };
}

/** A failed rule fetch: a 404 refuses with the sentence; anything else is an ordinary, retryable error. */
export function eventSetupFailure(error: unknown): { action: 'refuse'; message: string } | { action: 'error' } {
  return responseOf(error).status === 404 ? { action: 'refuse', message: EVENT_PROMO_REMOVED } : { action: 'error' };
}

/**
 * The step left after accepting an event card, from the SAVED rule. "Live —
 * codes are on their way" (the win-back line) is false for a promo whose codes
 * do not appear for a week: the push goes now, the code shows on its first day.
 */
export function eventNextStep(rule: PromotionRule, today: string): string {
  const state = eventRuleState(rule, today);
  const opens = localDayLabel(rule.valid_from);
  const ends = localDayLabel(rule.valid_to);
  if (state === 'live_before') return `Live — members’ codes appear in their tiles on ${opens} and work until ${ends}.`;
  if (state === 'live_inside') return `Live — codes are in members’ tiles until ${ends}.`;
  return 'Saved as a draft — switch it on from Outreach.';
}

// ---------------------------------------------------------------------------
// Outreach rows — the switch, delete, and what each says
// ---------------------------------------------------------------------------

export interface EventRowActions {
  canToggle: boolean;
  /** Why the switch is off — null exactly when `canToggle`. */
  switchBlockedReason: string | null;
  canDelete: boolean;
  /** Why delete is off — null exactly when `canDelete`. */
  deleteBlockedReason: string | null;
  /** What turning the switch will do, when it can be turned. */
  switchTooltip: string;
}

const ISSUED_RECORD = 'A promo that issued codes stays as their record';

/**
 * Which of an event row's controls are live. Every control stays drawn and
 * says why when it is off (Session 4's rule for the vote row).
 *
 * A SUGGESTED draft — its card still open on This week — cannot be switched on
 * here. Switching on sends members a notification, and accepting the card is
 * what records the outcome the ALL-152 ledger follows; doing it from the table
 * would send the push and leave the suggestion dangling. This is the one place
 * an event row departs from Session 4's "suggested is decoration": the
 * decoration never hides the row, but it does route the send.
 */
export function eventRowActions(rule: PromotionRule, today: string, options: { suggested: boolean | null }): EventRowActions {
  const state = eventRuleState(rule, today);
  let switchBlockedReason: string | null = null;
  let deleteBlockedReason: string | null = null;
  // `suggested: null` = This week's cards have not loaded (or failed). The
  // marks are decoration everywhere else, but here they route a SEND: while
  // they are unknown a draft is not switched on from the table (fail safe).
  const draftOn =
    options.suggested === null
      ? 'This week’s suggestions haven’t loaded — switch it on once they have'
      : options.suggested
        ? 'Set it up from This week, where its suggestion is'
        : null;
  switch (state) {
    case 'draft':
      switchBlockedReason = draftOn;
      break;
    case 'draft_past':
      // Ended by the browser's day; refused only once it is past in every zone.
      switchBlockedReason = certainlyPast(rule.valid_to, today) ? 'Its days have passed — it can’t go out now' : draftOn;
      break;
    case 'live_before':
    case 'live_inside':
      deleteBlockedReason = 'This promo is on — switch it off to withdraw it';
      break;
    case 'live_past':
      if (certainlyPast(rule.valid_to, today)) switchBlockedReason = 'Its days are over — its codes have expired';
      deleteBlockedReason = ISSUED_RECORD;
      break;
    case 'withdrawn':
      switchBlockedReason = 'Withdrawn — its codes stopped working and it can’t be switched on again';
      deleteBlockedReason = ISSUED_RECORD;
      break;
    default:
      // No usable window: the backend still decides; nothing to block on here.
      break;
  }
  return {
    canToggle: switchBlockedReason === null,
    switchBlockedReason,
    canDelete: deleteBlockedReason === null,
    deleteBlockedReason,
    switchTooltip: rule.is_active ? 'Live — switch off to withdraw it' : 'Draft — switch on to send it'
  };
}

export interface EventConfirmCopy {
  heading: string;
  body: string;
}

const FINAL_CLAUSE = 'Once it is on, its discount and dates are fixed; switching it off later withdraws the codes for good.';

/**
 * Switching on, said as the system will do it (review C13). Activation mints
 * the codes and QUEUES the offer; the overnight send delivers the notification
 * and suppresses it once the window has closed. So the notification is never
 * "now": before the window it arrives overnight; inside the window the code is
 * in the tile at once and the notification follows overnight; on the LAST day
 * no notification goes out at all, and the owner is told so before choosing.
 */
export function eventSwitchOnConfirm(rule: PromotionRule, today: string): EventConfirmCopy {
  const heading = 'Switch this promo on?';
  const from = rule.valid_from;
  const to = rule.valid_to;
  if (isYmd(from) && isYmd(to) && today >= from && today <= to) {
    if (today === to) {
      return {
        heading,
        body: `Today is its last day: members in its group find the code in their Inner Circle tile right away, but no notification goes out — notifications are sent overnight, after it ends. ${FINAL_CLAUSE}`
      };
    }
    return {
      heading,
      body: `Members in its group find their code in their Inner Circle tile right away and get a notification with the overnight send; it works until ${localDayLabel(to)}. ${FINAL_CLAUSE}`
    };
  }
  const window = windowText(from, to);
  const when = window ? ` works ${window}` : ' works on its days';
  return {
    heading,
    body: `Members in its group get a notification with the overnight send, and their code${when}. ${FINAL_CLAUSE}`
  };
}

/** Switching off is a withdrawal: irreversible, and it says so. */
export function eventWithdrawConfirm(title: string): EventConfirmCopy {
  return {
    heading: 'Withdraw this promo?',
    body: `“${title}” stops now: members’ unused codes stop working, and it can’t be switched on again. Codes already used at the till stay as they are.`
  };
}

/**
 * Deleting a draft takes its unsent message with it, and — when its card is
 * still open — the suggestion too (the backend dismisses the card). A draft
 * whose card was dismissed or lapsed has no suggestion to mention (review C17).
 */
export function eventDeleteConfirm(title: string, options: { suggested: boolean } = { suggested: false }): EventConfirmCopy {
  const suggestion = options.suggested ? ', and its suggestion leaves This week' : '';
  return {
    heading: 'Delete this event promo?',
    body: `“${title}” and its unsent message will be removed${suggestion}. Nothing has gone to members.`
  };
}

/** The switch-on result, from the PATCH response's own count. */
export function eventSwitchedOnMessage(codesIssued: number | null | undefined): string {
  if (typeof codesIssued !== 'number' || !Number.isFinite(codesIssued)) return 'Switched on.';
  return `Switched on — ${pluralCodes(codesIssued)} issued.`;
}

export const EVENT_WITHDRAWN_MESSAGE = 'Withdrawn — its codes no longer work.';

// ---------------------------------------------------------------------------
// The message preview
// ---------------------------------------------------------------------------

export const OFFER_PREVIEW_HEADING = 'The message members get';

export type OfferPreviewStatus = 'loaded' | 'missing' | 'unavailable';

/**
 * The caption under the linked offer's words. A draft offer is RE-RENDERED
 * from the rule at switch-on (E5's `offer_copy`), so the words shown are a
 * preview, not a promise; a missing one means no message goes out at all.
 */
export function offerPreviewCaption(offer: Pick<TargetedOfferPreview, 'status' | 'sent_at'> | null, status: OfferPreviewStatus): string {
  if (status === 'missing') return 'No message goes out with this promo; members find the code in their Inner Circle tile.';
  if (status === 'unavailable' || !offer) return 'The message preview could not be loaded.';
  if (offer.status === 'sent') {
    const sent = offer.sent_at ? new Date(offer.sent_at) : null;
    // `sent_at` is the ACTIVATION — when the offer was queued — not delivery.
    return sent && !Number.isNaN(sent.getTime()) ? `Queued for members on ${monthDay(sent)}.` : 'Queued for members.';
  }
  return 'Queued when it is switched on and delivered with the overnight send, with the promo’s discount and dates filled in at that moment.';
}

// ---------------------------------------------------------------------------
// The Settings switch — event_promos_enabled
// ---------------------------------------------------------------------------

export const EVENT_PROMOS_TITLE = 'Event-driven promos';
export const EVENT_PROMOS_DESCRIPTION = 'Suggest a members’ discount in This week ahead of busy local event days near your store.';
export const EVENT_PROMOS_ON_CAPTION = 'On — the next nightly run (or Refresh suggestions) can suggest one.';
export const EVENT_PROMOS_OFF_CAPTION =
  'Off — no new event promo suggestions from the next run. Promos and suggestions you already have stay as they are.';
const ADMIN_ONLY = 'Only an admin can change this.';

/**
 * Admin OR owner. The backend's `Role.is_admin` is "admin or above", and
 * `utils/role.ts` has no owner rank — `hasPermission(owner, ADMIN)` scores the
 * owner 0 and locks them out of their own setting.
 */
export function canManageCompanySettings(roleType: string | null | undefined): boolean {
  const role = String(roleType ?? '').toLowerCase();
  return role === 'admin' || role === 'owner';
}

export interface EventPromosSwitchView {
  visible: boolean;
  checked: boolean;
  disabled: boolean;
  disabledReason: string | null;
  caption: string;
}

/**
 * The switch's state. HIDDEN — not shown as "off" — while the company is
 * loading and when the backend does not send the field at all (a frontend
 * deployed ahead of E5): an "off" switch over a field that does not exist is a
 * statement about a setting nobody can change.
 */
export function eventPromosSwitchView(
  company: { event_promos_enabled?: unknown } | null | undefined,
  roleType: string | null | undefined,
  options: { saving: boolean }
): EventPromosSwitchView {
  const present = !!company && typeof company.event_promos_enabled === 'boolean';
  const checked = present && company?.event_promos_enabled === true;
  const allowed = canManageCompanySettings(roleType);
  return {
    visible: present,
    checked,
    disabled: !allowed || options.saving,
    disabledReason: allowed ? null : ADMIN_ONLY,
    caption: checked ? EVENT_PROMOS_ON_CAPTION : EVENT_PROMOS_OFF_CAPTION
  };
}

/** A failed save of the switch. */
export function companySaveErrorMessage(error: unknown): string {
  return responseOf(error).status === 403 ? ADMIN_ONLY : 'Couldn’t save that — try again.';
}
