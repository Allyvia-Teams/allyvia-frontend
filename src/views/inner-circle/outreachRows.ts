import type { BuyingRound, BuyingRoundScope, PerkEligibleScope, PerkEvent, PromotionRule } from 'api/innerCircle.api';
import { isoToLocalInput } from 'ui-component/inner-circle/dateInput';
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
  when: string | null;
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

function isPromotion(source: OutreachSource): source is PromotionRule {
  return 'discount_pct' in source;
}

function isPerk(source: OutreachSource): source is PerkEvent {
  return 'perk_type' in source;
}

/** `10.00` → `10`, `8.50` → `8.5` — trims the trailing zeros a decimal-string percent carries. */
function trimPercent(pct: string): string {
  const n = Number(pct);
  return Number.isNaN(n) ? pct : String(n);
}

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function shortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusForPromotion(rule: PromotionRule): StatusResult {
  const codes = rule.codes_issued;
  const statusDetail = codes > 0 ? `${codes} ${pluralize(codes, 'code', 'codes')} in tiles` : `${trimPercent(rule.discount_pct)}% off`;
  if (rule.is_active) return { status: 'live', statusDetail };
  if (codes > 0) return { status: 'ended', statusDetail };
  return { status: 'draft', statusDetail };
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
