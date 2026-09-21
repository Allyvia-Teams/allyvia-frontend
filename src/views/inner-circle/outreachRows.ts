import type { BuyingRound, BuyingRoundScope, PerkEligibleScope, PerkEvent, PromotionRule } from 'api/innerCircle.api';
import { isoToLocalInput } from 'ui-component/inner-circle/dateInput';
import { OUTREACH_CHANNEL_SENTENCE } from 'ui-component/inner-circle/outreachChannel';
import { tierLabel } from 'ui-component/inner-circle/tierLabel';

import type { OutreachKind, OutreachStatus } from './navigation';

/**
 * `outreachRows.ts` — the pure seam Task 4.2's Outreach table renders from:
 * flattening discounts (`PromotionRule`), events/perks (`PerkEvent`) and
 * style votes (`BuyingRound`) into one row shape, the one status table
 * shared by all three sources, the kinds vocabulary the "New" menu and the
 * filter chips both read, counts/filters over the flattened rows, and the
 * dialog-prefill mapping a recommendation (or "duplicate this") hands to
 * whichever create dialog it targets.
 *
 * `api/innerCircle.api` is imported with `import type` ONLY — that module
 * reads `import.meta.env` at load time and this file's tests run under
 * vitest's plain `node` environment (no DOM), so a value import would blow
 * up on the very first line. Everything here is a pure function: no
 * fetching, no React, no MUI — nothing rendered is testable in this file.
 */

/** A row's status is never `'all'` — that value exists only on the filter, not on a row. */
export type OutreachRowStatus = Exclude<OutreachStatus, 'all'>;

export interface OutreachRow {
  key: string;
  kind: OutreachKind;
  id: string;
  title: string;
  audience: string;
  status: OutreachRowStatus;
  statusDetail: string;
  /**
   * The SORT key, and only that. It falls back to `created_at` so every row
   * has somewhere to sit in the order — which is exactly why it must never
   * be rendered as a date the owner reads as meaning something: a perk with
   * no date set would show the day it was created.
   */
  when: string | null;
  /**
   * The event's own date, or null when there isn't one. Separate from `when`
   * on purpose: this one is safe to display, because its absence is absence
   * rather than a fallback. Null for discounts and votes, neither of which
   * has a date the row should carry.
   */
  eventDate: string | null;
  source: 'promotion' | 'perk' | 'round';
  /**
   * Always `false` for now. Session 5 decides whether a row can be traced
   * back to an accepted recommendation (via an `adoption` link, if the
   * serializer ever exposes one) — until then every row here was hand-made
   * by the owner, and this field stays false rather than being removed, so
   * Task 4.2 has a stable key to read.
   */
  fromRecommendation: boolean;
}

// ---------------------------------------------------------------------------
// Kinds vocabulary — what the "New" menu and the filter chips both read.
// ---------------------------------------------------------------------------

export interface OutreachKindInfo {
  kind: OutreachKind;
  label: string;
  description: string;
}

export const OUTREACH_KINDS: OutreachKindInfo[] = [
  {
    kind: 'discount',
    label: 'Give a discount',
    description: 'A code for a tier or your top spenders, in their tile and at the till'
  },
  {
    kind: 'event',
    label: 'Invite to an event or perk',
    description: 'Preview night, early access, a gift; members RSVP in the app'
  },
  {
    kind: 'vote',
    label: 'Ask what to stock',
    description: 'Members vote in the app on what you buy next'
  }
];

export function kindLabel(kind: OutreachKind): string {
  return OUTREACH_KINDS.find((k) => k.kind === kind)?.label ?? kind;
}

// ---------------------------------------------------------------------------
// statusFor — ONE switch over the source, discriminated structurally.
// ---------------------------------------------------------------------------

type OutreachSource = PromotionRule | PerkEvent | BuyingRound;

export interface StatusResult {
  status: OutreachRowStatus;
  statusDetail: string;
}

/**
 * The three structural predicates every consumer shares. Exported because the
 * composer narrows the row's source object with exactly the same test
 * `statusFor` uses — two definitions of "which kind of thing is this" would
 * be two chances to disagree, and the composer's cast would be silent.
 */
export function isPromotion(source: OutreachSource): source is PromotionRule {
  return 'discount_pct' in source;
}

export function isPerk(source: OutreachSource): source is PerkEvent {
  return 'perk_type' in source;
}

export function isRound(source: OutreachSource): source is BuyingRound {
  return !isPromotion(source) && !isPerk(source);
}

/** `10.00` → `10`, `8.50` → `8.5` — trims the trailing zeros a decimal-string percent carries. */
function trimPercent(pct: string): string {
  const n = Number(pct);
  return Number.isNaN(n) ? pct : String(n);
}

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/** "Sep 20" — the one short-date formatting in this module. */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * The figure that matters depends on the status, not on the count alone. A
 * LIVE rule always reports its reach — `0 codes in tiles` on a live rule is
 * the fact the owner most needs, because it means nobody was eligible, and
 * showing "10% off" there would hide it behind a number that never moves.
 * Only a DRAFT (inactive, never issued) describes the offer instead, since it
 * has no reach to report yet.
 */
function statusForPromotion(rule: PromotionRule): StatusResult {
  const codes = rule.codes_issued;
  const reach = `${codes} ${pluralize(codes, 'code', 'codes')} in tiles`;
  if (rule.is_active) return { status: 'live', statusDetail: reach };
  if (codes > 0) return { status: 'ended', statusDetail: reach };
  return { status: 'draft', statusDetail: `${trimPercent(rule.discount_pct)}% off` };
}

function statusForPerk(perk: PerkEvent): StatusResult {
  const { invited, booked } = perk.response_counts;
  const statusDetail = invited === 0 ? 'Not sent yet' : `${invited} invited · ${booked} booked`;
  const status: OutreachRowStatus = perk.status === 'inviting' ? 'live' : perk.status === 'closed' ? 'ended' : 'draft';
  return { status, statusDetail };
}

function statusForRound(round: BuyingRound): StatusResult {
  const votes = `${round.vote_count} ${pluralize(round.vote_count, 'vote', 'votes')}`;
  if (round.status === 'draft') return { status: 'draft', statusDetail: 'Not opened yet' };
  if (round.status === 'closed') return { status: 'ended', statusDetail: `${votes} · closed` };
  const statusDetail = round.closes_at ? `${votes} · closes ${shortDate(round.closes_at)}` : `${votes} · no close date`;
  return { status: 'live', statusDetail };
}

/**
 * The single status table, shared by discounts, events/perks and votes.
 * Discriminated structurally (a `PromotionRule` has `discount_pct`, a
 * `PerkEvent` has `perk_type`, everything else here is a `BuyingRound`) so
 * one switch serves all three call sites — `buildOutreachRows` reuses it
 * rather than re-deriving status per row.
 */
export function statusFor(source: OutreachSource): StatusResult {
  if (isPromotion(source)) return statusForPromotion(source);
  if (isPerk(source)) return statusForPerk(source);
  return statusForRound(source);
}

// ---------------------------------------------------------------------------
// audience — who a row reaches, in plain words.
// ---------------------------------------------------------------------------

function audienceForPromotion(rule: PromotionRule): string {
  if (rule.tier_scope === 'top_n') return `Top ${rule.top_n ?? 0} by spend`;
  return tierLabel(rule.tier_scope) ?? 'All members';
}

function audienceForScope(scope: PerkEligibleScope | BuyingRoundScope, topN: number, tier: string | null): string {
  switch (scope) {
    case 'top_n':
      return `Top ${topN} by spend`;
    case 'tier':
      return tierLabel(tier) ?? 'All members';
    default:
      return 'All members';
  }
}

// ---------------------------------------------------------------------------
// buildOutreachRows — flatten the three sources, sorted by `when` descending.
// ---------------------------------------------------------------------------

/** Unparseable or absent dates sort last, never crash the sort. */
function parseWhen(when: string | null): number {
  if (!when) return -Infinity;
  const parsed = Date.parse(when);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

function rowForPromotion(rule: PromotionRule): OutreachRow {
  const { status, statusDetail } = statusFor(rule);
  return {
    key: `discount:${rule.id}`,
    kind: 'discount',
    id: rule.id,
    title: rule.name,
    audience: audienceForPromotion(rule),
    status,
    statusDetail,
    when: rule.updated_at,
    eventDate: null,
    source: 'promotion',
    fromRecommendation: false
  };
}

function rowForPerk(perk: PerkEvent): OutreachRow {
  const { status, statusDetail } = statusFor(perk);
  return {
    key: `event:${perk.id}`,
    kind: 'event',
    id: perk.id,
    title: perk.title,
    audience: audienceForScope(perk.eligible_scope, perk.top_n, perk.tier),
    status,
    statusDetail,
    when: perk.event_date ?? perk.created_at,
    eventDate: perk.event_date,
    source: 'perk',
    fromRecommendation: false
  };
}

function rowForRound(round: BuyingRound): OutreachRow {
  const { status, statusDetail } = statusFor(round);
  return {
    key: `vote:${round.id}`,
    kind: 'vote',
    id: round.id,
    title: round.title,
    audience: audienceForScope(round.eligible_scope, round.top_n, round.tier),
    status,
    statusDetail,
    when: round.closes_at ?? round.created_at,
    eventDate: null,
    source: 'round',
    fromRecommendation: false
  };
}

/**
 * Flattens the three sources into one row shape, sorted by `when`
 * descending (most recently relevant first). Equal or unparseable `when`
 * values keep their original relative order — the sort is decorated with
 * the input index rather than relying on engine sort stability.
 */
export function buildOutreachRows(promotions: PromotionRule[], perks: PerkEvent[], rounds: BuyingRound[]): OutreachRow[] {
  const rows: OutreachRow[] = [...promotions.map(rowForPromotion), ...perks.map(rowForPerk), ...rounds.map(rowForRound)];
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => parseWhen(b.row.when) - parseWhen(a.row.when) || a.index - b.index)
    .map(({ row }) => row);
}

// ---------------------------------------------------------------------------
// kindCounts / filterRows — the filter chips, and what they show.
// ---------------------------------------------------------------------------

export interface OutreachKindCounts {
  discount: number;
  event: number;
  vote: number;
}

/** `'all'` matches every status; anything else matches only that exact row status. */
export function kindCounts(rows: OutreachRow[], status: OutreachStatus): OutreachKindCounts {
  const matches = (row: OutreachRow) => status === 'all' || row.status === status;
  return {
    discount: rows.filter((row) => row.kind === 'discount' && matches(row)).length,
    event: rows.filter((row) => row.kind === 'event' && matches(row)).length,
    vote: rows.filter((row) => row.kind === 'vote' && matches(row)).length
  };
}

export interface OutreachRowFilter {
  status: OutreachStatus;
  kind: OutreachKind | null;
  query: string;
}

export function filterRows(rows: OutreachRow[], filter: OutreachRowFilter): OutreachRow[] {
  const query = filter.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter.status !== 'all' && row.status !== filter.status) return false;
    if (filter.kind && row.kind !== filter.kind) return false;
    if (query && !row.title.toLowerCase().includes(query)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// prefillFor — the dialog-prefill mapping.
// ---------------------------------------------------------------------------

export interface PromotionPrefill {
  name?: string;
  description?: string;
  tier_scope?: string;
  top_n?: string;
  discount_pct?: string;
  cadence_days?: string;
  code_valid_days?: string;
  trigger_type?: string;
}

export interface PerkPrefill {
  title?: string;
  description?: string;
  perk_type?: string;
  eligible_scope?: string;
  top_n?: string;
  tier?: string;
  capacity?: string;
  event_date?: string;
  location?: string;
  status?: string;
}

export interface VotePrefill {
  title?: string;
  description?: string;
  /** Passed through untouched when it is an array — this is the one non-string field. */
  options?: unknown[];
  eligible_scope?: string;
  top_n?: string;
  tier?: string;
  closes_at?: string;
}

const PROMOTION_KEYS = [
  'name',
  'description',
  'tier_scope',
  'top_n',
  'discount_pct',
  'cadence_days',
  'code_valid_days',
  'trigger_type'
] as const;

const PERK_KEYS = [
  'title',
  'description',
  'perk_type',
  'eligible_scope',
  'top_n',
  'tier',
  'capacity',
  'event_date',
  'location',
  'status'
] as const;

const VOTE_KEYS = ['title', 'description', 'options', 'eligible_scope', 'top_n', 'tier', 'closes_at'] as const;

/** The two keys `isoToLocalInput` must run a string value through before it lands on the form. */
const DATE_KEYS = new Set<string>(['event_date', 'closes_at']);

export function prefillFor(kind: 'discount', payload: Record<string, unknown> | null): PromotionPrefill;
export function prefillFor(kind: 'event', payload: Record<string, unknown> | null): PerkPrefill;
export function prefillFor(kind: 'vote', payload: Record<string, unknown> | null): VotePrefill;
/**
 * Maps a recommendation (or "duplicate this row") payload to the create
 * dialog's own form keys, stringifying every value the form expects as a
 * string. Unknown keys are dropped, a `null`/`undefined` value is dropped
 * (not stringified as the literal "null"), and `options` (the style-vote
 * ballot) passes through untouched as an array rather than being
 * stringified — it is the one field the dialogs hold as structured data.
 */
export function prefillFor(kind: OutreachKind, payload: Record<string, unknown> | null): PromotionPrefill | PerkPrefill | VotePrefill {
  if (!payload) return {};
  const keys: readonly string[] = kind === 'discount' ? PROMOTION_KEYS : kind === 'event' ? PERK_KEYS : VOTE_KEYS;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = payload[key];
    if (value === null || value === undefined) continue;
    if (key === 'options') {
      if (Array.isArray(value)) out.options = value;
      continue;
    }
    out[key] = DATE_KEYS.has(key) && typeof value === 'string' ? isoToLocalInput(value) : String(value);
  }
  return out as PromotionPrefill | PerkPrefill | VotePrefill;
}

/**
 * Keeps a prefill value only when it is one of the options the form actually
 * offers. A prefill arrives from a recommendation payload or an older row, so
 * an unknown enum value is data, not a type error: dropping it leaves the
 * form's own default in place, where assigning it would put a value in a
 * `Select` that has no matching `MenuItem` and render the control blank.
 * The vocabulary is passed in because it belongs to the dialog's option list
 * — a copy here would be a second place to keep in step.
 */
export function oneOf<T extends string>(value: string | undefined | null, allowed: readonly T[]): T | undefined {
  if (value == null) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export interface BallotRow {
  label: string;
  image_url: string;
}

/**
 * A prefilled style-vote ballot, made safe for a controlled form. `options` is
 * the one prefill field that is not a string, so it is rebuilt row by row: a
 * non-string `label` put straight into a `TextField` makes React warn and the
 * field stop accepting input, which looks like a broken dialog rather than a
 * malformed suggestion. Rows that are not objects are dropped, and the result
 * is padded out to `minimum` so the ballot always opens with enough rows to
 * be valid. Returns null when there is nothing to prefill, which is how the
 * caller tells "no ballot offered" from "an empty one".
 */
export function ballotRows(options: unknown, minimum: number): BallotRow[] | null {
  if (!Array.isArray(options)) return null;
  const rows: BallotRow[] = [];
  options.forEach((value) => {
    if (typeof value !== 'object' || value === null) return;
    const record = value as Record<string, unknown>;
    rows.push({
      label: typeof record.label === 'string' ? record.label : '',
      image_url: typeof record.image_url === 'string' ? record.image_url : ''
    });
  });
  while (rows.length < minimum) rows.push({ label: '', image_url: '' });
  return rows;
}

// ---------------------------------------------------------------------------
// Source index — the row's key back to the object the dialogs and actions need.
// ---------------------------------------------------------------------------

export type OutreachRowSource =
  | { kind: 'discount'; promotion: PromotionRule }
  | { kind: 'event'; perk: PerkEvent }
  | { kind: 'vote'; round: BuyingRound };

/**
 * `row.key` → the object it was built from, discriminated so a consumer never
 * casts. Keyed on the SAME `${kind}:${id}` string `buildOutreachRows` mints,
 * which is what makes a row's `key` a usable handle rather than a render id.
 */
export function outreachSources(promotions: PromotionRule[], perks: PerkEvent[], rounds: BuyingRound[]): Record<string, OutreachRowSource> {
  const out: Record<string, OutreachRowSource> = {};
  promotions.forEach((promotion) => {
    out[`discount:${promotion.id}`] = { kind: 'discount', promotion };
  });
  perks.forEach((perk) => {
    out[`event:${perk.id}`] = { kind: 'event', perk };
  });
  rounds.forEach((round) => {
    out[`vote:${round.id}`] = { kind: 'vote', round };
  });
  return out;
}

// ---------------------------------------------------------------------------
// Truncation — "Showing 60 of 214", and when to say it at all.
// ---------------------------------------------------------------------------

export interface OutreachPage {
  count: number;
  results: unknown[];
}

export interface TruncationResult {
  shown: number;
  total: number;
  truncated: boolean;
}

/**
 * Whether the three list responses between them hold everything the server
 * has. `truncated` is per-response — one page short of its own `count` means
 * the table is incomplete even when the other two are whole, and a table that
 * silently omits rows is the ALL-103 defect in a different costume. An absent
 * response (still loading, or failed) contributes nothing rather than being
 * read as an empty result set.
 */
export function truncation(pages: Array<OutreachPage | undefined | null>): TruncationResult {
  let shown = 0;
  let total = 0;
  let truncated = false;
  pages.forEach((page) => {
    if (!page) return;
    shown += page.results.length;
    total += page.count;
    if (page.count > page.results.length) truncated = true;
  });
  return { shown, total, truncated };
}

/**
 * What to say when one or more of the three lists did not load. A failed
 * fetch must never read as an empty table (ALL-103): the rows that DID arrive
 * are still worth showing, so a partial failure says the table is incomplete
 * rather than blanking the destination, and a total failure says so plainly.
 * Returns null exactly when everything loaded.
 */
export function outreachLoadError(failedKinds: OutreachKind[]): string | null {
  if (failedKinds.length === 0) return null;
  if (failedKinds.length >= OUTREACH_KINDS.length) return 'Outreach could not be loaded.';
  return 'Some outreach could not be loaded, so this table is incomplete.';
}

// ---------------------------------------------------------------------------
// URL filters — status and kind live in the query string.
// ---------------------------------------------------------------------------

export interface OutreachParamsPatch {
  status?: OutreachStatus;
  kind?: OutreachKind | null;
}

/**
 * The next query string for a filter change. Everything already there is
 * preserved — `tab=outreach` above all, without which the change navigates
 * away from the destination it was made on — and a default is DROPPED rather
 * than written, so the URL a shared link carries says only what was chosen.
 * Only the keys named in `patch` are touched.
 */
export function outreachSearchParams(current: URLSearchParams, patch: OutreachParamsPatch): URLSearchParams {
  const next = new URLSearchParams(current);
  if ('status' in patch) {
    if (!patch.status || patch.status === 'all') next.delete('status');
    else next.set('status', patch.status);
  }
  if ('kind' in patch) {
    if (!patch.kind) next.delete('kind');
    else next.set('kind', patch.kind);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Row chrome and per-kind action availability.
// ---------------------------------------------------------------------------

export interface StatusChip {
  label: string;
  color: 'success' | 'default';
  variant: 'filled' | 'outlined';
  tone: 'success' | 'default' | 'muted';
}

/** The words and the weight a status wears in the table: Draft / Live / Ended. */
export function statusChip(status: OutreachRowStatus): StatusChip {
  switch (status) {
    case 'live':
      return { label: 'Live', color: 'success', variant: 'filled', tone: 'success' };
    case 'ended':
      return { label: 'Ended', color: 'default', variant: 'filled', tone: 'muted' };
    default:
      return { label: 'Draft', color: 'default', variant: 'outlined', tone: 'default' };
  }
}

/** A ballot the members can choose between needs at least two things on it. */
export const MIN_BALLOT_OPTIONS = 2;

export interface VoteRowActions {
  canOpen: boolean;
  canInvite: boolean;
  canClose: boolean;
  /** Why "Open voting" is unavailable — null exactly when `canOpen` is true. */
  openBlockedReason: string | null;
  /** Why "Invite eligible members" is unavailable — null exactly when `canInvite` is true. */
  inviteBlockedReason: string | null;
  /** Why "Close" is unavailable — null exactly when `canClose` is true. */
  closeBlockedReason: string | null;
}

/**
 * Which of a style vote's controls are live. Every control is drawn on every
 * row (one table, uniform rows) and disabled with a reason rather than hidden,
 * so the owner can see what a round could do next instead of inferring it from
 * a button's absence.
 *
 * EVERY control carries its own reason, not just the first one. A disabled
 * button with nothing to say is worse than a hidden one: it shows there is
 * something here to do and refuses to say why you cannot.
 */
export function voteRowActions(round: BuyingRound): VoteRowActions {
  const enoughOptions = round.options.length >= MIN_BALLOT_OPTIONS;
  const isDraft = round.status === 'draft';
  const isOpen = round.status === 'open';
  const closed = round.status === 'closed';
  const openBlockedReason = isDraft
    ? enoughOptions
      ? null
      : `Add at least ${MIN_BALLOT_OPTIONS} options before voting can open`
    : isOpen
      ? 'Voting is already open'
      : 'This round is closed';
  const whileNotOpen = closed ? 'This round is closed' : 'Open voting first';
  return {
    canOpen: isDraft && enoughOptions,
    canInvite: isOpen,
    canClose: isOpen,
    openBlockedReason,
    inviteBlockedReason: isOpen ? null : whileNotOpen,
    closeBlockedReason: isOpen ? null : whileNotOpen
  };
}

export interface PerkRowActions {
  canInvite: boolean;
  /** Why inviting is unavailable — null exactly when `canInvite` is true. */
  inviteBlockedReason: string | null;
}

export function perkRowActions(perk: PerkEvent): PerkRowActions {
  if (perk.status === 'closed') return { canInvite: false, inviteBlockedReason: 'This event is closed' };
  return { canInvite: true, inviteBlockedReason: null };
}

/**
 * What an invite run actually did, in the channel that now exists. The old
 * copy promised "invitation emails await your approval in Approvals" — that
 * path was retired in Session 1 and the Approvals tab deleted in Session 3,
 * so the sentence described a queue the owner could no longer open.
 */
export function inviteResultMessage(invited: number): string {
  if (invited === 0) return 'Nobody new to invite — everyone eligible is already on the list.';
  return `${invited} ${pluralize(invited, 'member', 'members')} invited — it is in their Inner Circle tile now.`;
}

/**
 * The row's second line. Kind and audience always; for an event, its date as
 * well — the field an owner scans an events list for, and one the card this
 * table replaces used to show.
 *
 * It reads `eventDate`, NEVER `when`. `when` is the sort key and falls back to
 * `created_at`, so a perk with no date set would render the day it was made in
 * the slot the owner reads as the event date — a real date, plausibly recent,
 * and wrong. `eventDate` is null when there is no date, which is the fact.
 *
 * Discounts and votes carry no date here: a discount has none worth a row, and
 * a vote already says "closes …" in its statusDetail.
 */
export function rowBody(row: OutreachRow): string {
  const parts = [kindLabel(row.kind), row.audience];
  if (row.eventDate) parts.push(shortDate(row.eventDate));
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Confirmation copy — what a destructive or sending action says before it runs.
// ---------------------------------------------------------------------------

export interface ConfirmCopy {
  heading: string;
  body: string;
}

/**
 * Per-kind delete confirmation. In the seam because picking the wrong branch —
 * a round offered the perk's warning, so nobody is told their votes are about
 * to go — is a real defect that no render-free gate would otherwise catch.
 */
export function deleteConfirmCopy(kind: OutreachKind, title: string): ConfirmCopy {
  switch (kind) {
    case 'discount':
      return { heading: 'Delete this promotion?', body: `“${title}” will be removed. Codes already issued are not affected.` };
    case 'event':
      return { heading: 'Delete this perk?', body: `“${title}” and its invite list will be removed.` };
    default:
      return { heading: 'Delete this round?', body: `“${title}”, its voter list and every vote cast will be removed.` };
  }
}

/**
 * The invite confirmation's first line: who is being added, to which list.
 * It says only that. What happens next — where the thing shows up — is the
 * channel sentence, which has exactly one wording and one home; the dialog
 * renders `OUTREACH_CHANNEL_SENTENCE` beneath this rather than paraphrasing
 * it into a fourth near-twin.
 */
export function inviteConfirmCopy(kind: OutreachKind, title: string, audience: string): ConfirmCopy {
  const list = kind === 'vote' ? 'voter' : 'invite';
  return {
    heading: 'Invite eligible members?',
    body: `${audience} will be added to the ${list} list for “${title}”.`
  };
}

/** Re-exported so a consumer of the confirmation copy has one import, not two. */
export { OUTREACH_CHANNEL_SENTENCE };
