// views/inventory/qbPosting.ts
//
// The QuickBooks write-back UI's rules, as pure functions. No React, no axios —
// the transport is api/qbPosting.api.ts and carries no logic.
//
// WHAT THIS SCREEN IS AND WHY IT IS WRITTEN DEFENSIVELY
//
// A merchant is about to let software write journal entries into their books,
// and their accountant will screenshot the day drill-down. So every figure here
// either reconstructs from the bytes the backend sent or renders as an em dash;
// nothing is inferred, averaged or rounded into existence.
//
// THREE THINGS THIS FILE REFUSES TO SAY, because the data cannot support them.
// Each has a constant, each has a test pinning the load-bearing clause, and none
// of them is decoration:
//
//   1. THE PAYOUT DEPOSIT IS NOT RECONCILED. `fees` is DERIVED as
//      `gross - net`, so `net + fees == gross` holds for every possible input —
//      the "reconciliation guard" the design asked for can never fire and is
//      deliberately absent in the backend (`qb/posting.py`, and
//      `test_the_sum_check_is_an_identity_and_is_deliberately_absent` pins the
//      reasoning). The only reachable refusal is `net > gross`. Verifying the
//      split needs an INDEPENDENT fee figure — a Stripe balance-transaction
//      sync, which this schema does not have. Nothing here may call it checked.
//
//   2. TIPS ARE NOT MODELLED on POSSale, so the sales summary omits the tips
//      line. A "Tips 0.00" row would be a fabrication: it would read as "no
//      tips were taken" when the truth is "tips are not recorded anywhere". The
//      composer's own `tips_note` is carried through verbatim.
//
//   3. NULL-COST MOVEMENTS ARE MISSING, NOT ZERO. `StockMovement.unit_cost` is
//      null when the cost was unknown, and the COGS composer SKIPS AND COUNTS
//      those rather than valuing them at zero (a zero would silently understate
//      COGS and overstate margin). The count must be on screen — including on a
//      day where every movement lacked a cost, which is exactly the day the
//      journal composes to nothing and the count would otherwise vanish.
//
// Money is summed AS INTEGER CENTS. Debits and credits come off the wire as
// decimal STRINGS (Django Decimals) and an accountant reads the totals beside
// the lines; `0.1 + 0.2` is the reason this file has `toCents` instead of
// `Number()`. `toNum` from utils/financeFormat is deliberately NOT used for
// money here — it maps null to a confident 0, which is right for a chart and
// wrong for a ledger.

import { EM_DASH } from './stockFormat';

// ---------------------------------------------------------------------------
// The wire shapes
//
// Declared here rather than imported from api/qbPosting.api.ts: a test that
// imports an api module fails collection outright (axios -> mockApi ->
// sessionStorage at module load). Every field name below was read from
// backend/app/qb/posting_views.py and posting_serializers.py.
// ---------------------------------------------------------------------------

export type PostingPurpose =
  | 'sales_income'
  | 'discounts'
  | 'refunds'
  | 'sales_tax_liability'
  | 'tips_liability'
  | 'stripe_clearing'
  | 'stripe_fees'
  | 'cash_on_hand'
  | 'bank_deposit'
  | 'cogs_expense'
  | 'inventory_asset';

export type PostingKind = 'sales_summary' | 'cogs_journal' | 'payout_deposit';

export type PostingStatus = 'pending' | 'posted' | 'failed' | 'amended' | 'skipped';

export interface QBAccountRef {
  id: string;
  qb_id: string;
  name: string;
  fully_qualified_name: string;
  account_type: string;
  account_sub_type: string;
  active: boolean;
}

/** One row of the mapping panel, from `GET /posting-settings/`. */
export interface PurposeRow {
  purpose: PostingPurpose | string;
  label: string;
  account: QBAccountRef | null;
  mapped: boolean;
  /** A QBAccountMapping row exists — with `mapped` false it means the FK is NULL. */
  mapping_exists: boolean;
  /** The mapping survived but the account did not. See `mappingState`. */
  account_deleted: boolean;
  required_by_kinds: string[];
  required: boolean;
  creatable: boolean;
}

export interface KindBlocker {
  code: string;
  detail: string;
  purposes?: string[];
}

export interface KindRow {
  kind: PostingKind | string;
  label: string;
  required_purposes: string[];
  missing_purposes: string[];
  mappings_complete: boolean;
  can_post: boolean;
  blockers: KindBlocker[];
}

export interface EnableBlocker {
  purpose: PostingPurpose | string;
  purpose_label: string;
  required_by_kinds: string[];
  reason: 'unmapped' | 'account_deleted' | string;
  detail: string;
}

export interface PostingSettings {
  qb_posting_enabled: boolean;
  quickbooks: {
    connected: boolean;
    realm_id: string;
    access_token_valid: boolean;
    refresh_token_valid: boolean;
  };
  purposes: PurposeRow[];
  kinds: KindRow[];
  missing_purposes: string[];
  enable_blockers: EnableBlocker[];
  can_enable: boolean;
  warnings: Array<{ code: string; detail: string }>;
  disclosures?: { payout_deposit?: string };
}

export interface MappingSuggestion {
  purpose: PostingPurpose | string;
  label: string;
  /** False means the chart had nothing plausible — NOT "a suggestion is pending". */
  found: boolean;
  already_mapped: boolean;
  why: string;
  account: QBAccountRef | null;
}

export interface SuggestionsResponse {
  suggestions: MappingSuggestion[];
  accounts: QBAccountRef[];
  suggested_count: number;
}

/** One journal line as `_render_lines` emits it: money is a STRING or null. */
export interface PostingLine {
  account_name: string;
  account_qb_id: string;
  purposes: string[];
  /** Blank for Deposit lines — a Deposit is not a two-sided journal entry. */
  posting_type: string;
  debit: string | null;
  credit: string | null;
  amount: string;
  description: string;
}

export interface PostingRow {
  id: string;
  posting_date: string;
  location_id: string | null;
  location_name: string | null;
  kind: PostingKind | string;
  kind_label: string;
  status: PostingStatus | string;
  status_label: string;
  qb_object_type: string;
  qb_object_id: string;
  attempts: number;
  error: string;
  trigger: string;
  performed_by_email: string;
  stripe_payout_id: string | null;
  totals: Record<string, unknown>;
  skipped_reason: string | null;
  refused: Record<string, unknown> | null;
  notes: string[];
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostingsPage {
  items: PostingRow[];
  pagination: {
    current_page: number;
    page_size: number;
    max_page_size: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_previous: boolean;
  };
  disclosures?: { payout_deposit?: string };
}

/** The compact posting reference embedded in a day-drill entry. */
export interface DayPostingSummary {
  id: string;
  status: PostingStatus | string;
  status_label: string;
  qb_object_type: string;
  qb_object_id: string;
  attempts: number;
  error: string;
  trigger: string;
  posted_at: string | null;
  updated_at: string;
}

export interface DayEntry {
  kind: PostingKind | string;
  label: string;
  composed: boolean;
  unavailable_reason: string | null;
  missing_purposes: string[];
  object_type: string | null;
  txn_date: string | null;
  private_note: string;
  lines: PostingLine[];
  debit_total: string;
  credit_total: string;
  balanced: boolean | null;
  totals: Record<string, unknown>;
  notes: string[];
  posting: DayPostingSummary | null;
  /** COGS entry only. Present even when nothing composed — that is the point. */
  cogs_total?: string | null;
  movements_skipped_null_cost?: number;
  units_skipped_null_cost?: number;
  refused?: { error?: string; discrepancy?: string | null; detail?: Record<string, unknown> };
}

export interface DayDrill {
  date: string;
  location: { id: string; name: string };
  qb_posting_enabled: boolean;
  quickbooks_connected: boolean;
  preview_only: boolean;
  entries: DayEntry[];
  payout_postings: PostingRow[];
  disclosures?: { payout_deposit?: string };
}

// ---------------------------------------------------------------------------
// THE THREE HONESTY STRINGS
//
// Each is asserted clause-by-clause in qbPosting.test.ts. If a future edit
// softens one of these, the test names say what was lost and why it mattered.
// ---------------------------------------------------------------------------

/**
 * Attached wherever a payout's gross/fees/net is shown.
 *
 * The claim this refuses to make is "reconciled". `fees` is derived as
 * `gross - net`, so `net + fees == gross` is an identity — it proves nothing
 * about whether either figure is right. Only an independent fee figure (a
 * Stripe balance-transaction sync, which `StripePayout` has no column for) could
 * verify the split.
 */
export const PAYOUT_FEE_NOT_VERIFIED =
  'Stripe fees here are DERIVED as (gross captured in the window − payout net), not read from Stripe. ' +
  'Because fees is defined that way, gross = fees + net always holds, so the sum proves nothing and this ' +
  'deposit is NOT independently reconciled. The only check that can fail is net exceeding gross. ' +
  'Verifying the split needs an independent fee figure from a Stripe balance-transaction sync, which is not ' +
  'stored today. Treat the fee as an estimate.';

/**
 * The absence of tips, stated as an absence.
 *
 * A "Tips 0.00" line would read as "no tips were taken". The truth is that
 * POSSale has no tip column at all, so the composer omits the line.
 */
export const TIPS_NOT_MODELLED =
  'POSSale carries no tip column in this schema, so no tips line is posted. This is an absence, not a zero — ' +
  'tips taken in store are not recorded anywhere in this ledger.';

/**
 * The skipped-null-cost sentence. Takes the counts because a count of movements
 * with no wording is a number nobody can act on, and wording with no count is a
 * disclaimer nobody believes.
 */
export const cogsSkippedSentence = (movements: number, units: number): string =>
  `${movements} stock movement(s) (${units} unit(s)) had no recorded cost and are EXCLUDED from this COGS ` +
  'journal. They are NOT valued at zero — they are missing, so this total understates cost of goods sold.';

/** Shown whenever the day drill-down is rendered with posting switched off. */
export const PREVIEW_ONLY_NOTE =
  'QuickBooks posting is switched off, so this is a preview of what WOULD post. Nothing has been sent to QuickBooks.';

/**
 * What a human must do before this writes into real books, in order.
 *
 * Step 3 is not optional caution: no sandbox round-trip has ever been run
 * against QuickBooks from this codebase — every QBO HTTP call in the test suite
 * is mocked, which proves the composition and nothing about the wire.
 */
export const ENABLE_CHECKLIST: string[] = [
  'Map every required account, including any whose QuickBooks account was deleted.',
  'Open a day in the drill-down and read the composed lines — this is what will be sent.',
  'Run a dry-run posting for that day and check the payload against your books.',
  'Point at a QuickBooks SANDBOX realm first. No sandbox round-trip has been run from this codebase; every QuickBooks call in the tests is mocked.',
  'Only then enable posting against the real realm.'
];

export const NON_ADMIN_QB_NOTICE =
  'You can view QuickBooks posting settings, mappings and the posting log, but changing them — the on/off ' +
  'switch, account mappings, creating accounts and retrying a posting — is limited to admins.';

// ---------------------------------------------------------------------------
// Purposes and kinds
// ---------------------------------------------------------------------------

/** Every purpose, in the backend's declaration order (`QBAccountMapping.PURPOSES`). */
export const POSTING_PURPOSES: PostingPurpose[] = [
  'sales_income',
  'discounts',
  'refunds',
  'sales_tax_liability',
  'tips_liability',
  'stripe_clearing',
  'stripe_fees',
  'cash_on_hand',
  'bank_deposit',
  'cogs_expense',
  'inventory_asset'
];

const PURPOSE_LABELS: Record<PostingPurpose, string> = {
  sales_income: 'Sales income',
  discounts: 'Discounts given',
  refunds: 'Refunds',
  sales_tax_liability: 'Sales tax payable',
  tips_liability: 'Tips payable',
  stripe_clearing: 'Stripe clearing (undeposited card funds)',
  stripe_fees: 'Stripe fees',
  cash_on_hand: 'Cash on hand',
  bank_deposit: 'Bank account for payouts',
  cogs_expense: 'Cost of goods sold',
  inventory_asset: 'Inventory asset'
};

/**
 * De-slug rather than print "Unknown". A purpose this build has not heard of
 * should read as "Gift card liability", not vanish behind a placeholder — the
 * same rule stockFormat.ts uses for movement reasons.
 */
export const purposeLabel = (purpose: string): string => {
  const known = PURPOSE_LABELS[purpose as PostingPurpose];
  if (known) return known;
  return deslug(purpose);
};

export const POSTING_KINDS: PostingKind[] = ['sales_summary', 'cogs_journal', 'payout_deposit'];

const KIND_LABELS: Record<PostingKind, string> = {
  sales_summary: 'Daily sales summary',
  cogs_journal: 'Daily COGS journal',
  payout_deposit: 'Payout deposit'
};

export const postingKindLabel = (kind: string): string => KIND_LABELS[kind as PostingKind] ?? deslug(kind);

/**
 * Which purposes each kind cannot post without.
 *
 * Mirrors `QBAccountMapping.REQUIRED_BY_KIND`. Held locally so the panel can
 * explain a blocked kind before any request comes back, but the SERVER'S list
 * wins wherever a payload provides one (`kindReadiness`), and a test asserts the
 * two agree so a backend change surfaces as a red test rather than as a UI that
 * quietly permits something the API refuses.
 */
export const REQUIRED_BY_KIND: Record<PostingKind, PostingPurpose[]> = {
  sales_summary: ['sales_income', 'sales_tax_liability', 'stripe_clearing', 'cash_on_hand'],
  cogs_journal: ['cogs_expense', 'inventory_asset'],
  payout_deposit: ['stripe_clearing', 'stripe_fees', 'bank_deposit']
};

/** `{purpose: [kind, ...]}`, derived from REQUIRED_BY_KIND rather than restated. */
export const kindsRequiringPurpose = (purpose: string): PostingKind[] =>
  POSTING_KINDS.filter((kind) => (REQUIRED_BY_KIND[kind] as string[]).includes(purpose));

function deslug(value: string): string {
  const cleaned = (value || '').replace(/_/g, ' ').trim();
  if (!cleaned) return EM_DASH;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ---------------------------------------------------------------------------
// The mapping panel's state machine
// ---------------------------------------------------------------------------

/**
 * THREE states, not two.
 *
 * `account_deleted` is real and reachable: `QBAccountMapping.qb_account` is
 * SET_NULL because `qb/events/handlers.py` HARD-DELETES QBAccount rows when
 * QuickBooks sends a webhook. So an operator can map an account on Monday and
 * find the mapping row intact on Tuesday with nothing on the end of it. It
 * correctly fails the completeness check, and it must NOT render as "not
 * mapped": the operator did choose an account, and the fix is different — they
 * have to know their chart of accounts changed underneath them.
 */
export type MappingState = 'mapped' | 'unmapped' | 'account_deleted';

/**
 * Derived from the account and the row's existence rather than from the
 * `account_deleted` flag alone, so a payload that omits one field still lands in
 * the right state.
 */
export const mappingState = (row: Pick<PurposeRow, 'account' | 'mapped' | 'mapping_exists' | 'account_deleted'>): MappingState => {
  if (row.account) return 'mapped';
  if (row.mapping_exists || row.account_deleted) return 'account_deleted';
  return 'unmapped';
};

export type MappingTone = 'success' | 'error' | 'warning' | 'default';

const STATE_LABELS: Record<MappingState, string> = {
  mapped: 'Mapped',
  unmapped: 'Not mapped',
  account_deleted: 'Account deleted in QuickBooks'
};

export const mappingStateLabel = (state: MappingState): string => STATE_LABELS[state];

/**
 * An unmapped OPTIONAL purpose is not an error — nothing is blocked by it — so
 * it stays neutral. A deleted account is always an error: something that used to
 * work has stopped.
 */
export const mappingStateTone = (state: MappingState, required: boolean): MappingTone => {
  if (state === 'account_deleted') return 'error';
  if (state === 'mapped') return 'success';
  return required ? 'warning' : 'default';
};

export interface MappingRowView {
  purpose: string;
  label: string;
  state: MappingState;
  stateLabel: string;
  tone: MappingTone;
  account: QBAccountRef | null;
  accountName: string;
  required: boolean;
  creatable: boolean;
  /** Kinds that require this purpose — from the server's list when it sent one. */
  requiredByKinds: string[];
  /** Kinds this row is CURRENTLY blocking. Empty once it is mapped. */
  blockedKinds: string[];
  /** One sentence naming the state and its consequence. */
  detail: string;
}

const describeMappingRow = (row: PurposeRow, state: MappingState, blockedKinds: string[]): string => {
  const label = row.label || purposeLabel(String(row.purpose));
  const blocked = blockedKinds.map(postingKindLabel).join(', ');
  if (state === 'mapped') {
    return `${label} posts to ${row.account?.fully_qualified_name || row.account?.name || 'a QuickBooks account'}.`;
  }
  if (state === 'account_deleted') {
    const consequence = blocked ? ` ${blocked} cannot post until another account is chosen.` : '';
    return `${label} was mapped, but the QuickBooks account has since been deleted in QuickBooks.${consequence}`;
  }
  if (blocked) {
    return `${label} has no QuickBooks account mapped, so ${blocked} cannot post.`;
  }
  return `${label} has no QuickBooks account mapped. No posting kind requires it, so nothing is blocked.`;
};

/** One view row per purpose, in the backend's declaration order. */
export const mappingRows = (settings: PostingSettings | null | undefined): MappingRowView[] => {
  const rows = settings?.purposes ?? [];
  return rows.map((row) => {
    const state = mappingState(row);
    // Prefer the server's own list: it is what the toggle is actually gated on.
    const requiredByKinds = row.required_by_kinds?.length ? row.required_by_kinds : kindsRequiringPurpose(String(row.purpose));
    const required = row.required ?? requiredByKinds.length > 0;
    const blockedKinds = state === 'mapped' ? [] : requiredByKinds;
    return {
      purpose: String(row.purpose),
      label: row.label || purposeLabel(String(row.purpose)),
      state,
      stateLabel: mappingStateLabel(state),
      tone: mappingStateTone(state, required),
      account: row.account ?? null,
      accountName: row.account?.fully_qualified_name || row.account?.name || EM_DASH,
      required,
      creatable: Boolean(row.creatable),
      requiredByKinds,
      blockedKinds,
      detail: describeMappingRow(row, state, blockedKinds)
    };
  });
};

/** Rows whose account vanished from QuickBooks — the state that needs its own banner. */
export const deletedAccountRows = (settings: PostingSettings | null | undefined): MappingRowView[] =>
  mappingRows(settings).filter((row) => row.state === 'account_deleted');

// ---------------------------------------------------------------------------
// Which kinds can run right now
// ---------------------------------------------------------------------------

export interface KindReadiness {
  kind: string;
  label: string;
  requiredPurposes: string[];
  missingPurposes: string[];
  /** Missing purposes with the reason each is missing, for a per-row message. */
  missing: Array<{ purpose: string; label: string; state: MappingState }>;
  mappingsComplete: boolean;
  canPost: boolean;
  blockers: KindBlocker[];
  /** Plain sentence: either "will post nightly" or exactly what stops it. */
  sentence: string;
}

const blockerSentence = (kind: KindReadiness, enabled: boolean, connected: boolean): string => {
  const reasons: string[] = [];
  if (!connected) reasons.push('this company is not connected to QuickBooks');
  if (!enabled) reasons.push('QuickBooks posting is switched off');
  if (kind.missing.length > 0) {
    const named = kind.missing
      .map((row) => (row.state === 'account_deleted' ? `${row.label} (account deleted in QuickBooks)` : row.label))
      .join(', ');
    reasons.push(`${kind.missing.length} account mapping(s) are missing: ${named}`);
  }
  if (reasons.length === 0) return `${kind.label} will post on the nightly run.`;
  return `${kind.label} cannot post: ${reasons.join('; ')}.`;
};

/**
 * Per-kind readiness, computed from the purpose rows so it is right even before
 * a `kinds[]` array arrives, and reconciled with the server's when it does.
 *
 * Missing purposes come from the SERVER when it named them; the derivation is
 * the fallback. They agree today — `test_local_required_by_kind_matches_the_server`
 * pins it — and if they ever stop agreeing, the server is right.
 */
export const kindReadiness = (settings: PostingSettings | null | undefined): KindReadiness[] => {
  const rows = mappingRows(settings);
  const byPurpose = new Map(rows.map((row) => [row.purpose, row]));
  const enabled = Boolean(settings?.qb_posting_enabled);
  const connected = Boolean(settings?.quickbooks?.connected);
  const serverKinds = new Map((settings?.kinds ?? []).map((kind) => [String(kind.kind), kind]));

  const kinds = settings?.kinds?.length ? settings.kinds.map((kind) => String(kind.kind)) : (POSTING_KINDS as string[]);

  return kinds.map((kind) => {
    const server = serverKinds.get(kind);
    const requiredPurposes = server?.required_purposes?.length
      ? server.required_purposes
      : ((REQUIRED_BY_KIND[kind as PostingKind] ?? []) as string[]);
    const derivedMissing = requiredPurposes.filter((purpose) => byPurpose.get(purpose)?.state !== 'mapped');
    const missingPurposes = server?.missing_purposes ?? derivedMissing;
    const missing = missingPurposes.map((purpose) => {
      const row = byPurpose.get(purpose);
      return {
        purpose,
        label: row?.label ?? purposeLabel(purpose),
        state: row?.state ?? ('unmapped' as MappingState)
      };
    });
    const readiness: KindReadiness = {
      kind,
      label: server?.label || postingKindLabel(kind),
      requiredPurposes,
      missingPurposes,
      missing,
      mappingsComplete: missing.length === 0,
      canPost: Boolean(enabled && connected && missing.length === 0),
      blockers: server?.blockers ?? [],
      sentence: ''
    };
    readiness.sentence = blockerSentence(readiness, enabled, connected);
    return readiness;
  });
};

// ---------------------------------------------------------------------------
// The toggle gate
// ---------------------------------------------------------------------------

export interface ToggleGate {
  /** True only when QuickBooks is connected AND every required mapping exists. */
  canEnable: boolean;
  connected: boolean;
  enabled: boolean;
  missingPurposes: string[];
  blockers: EnableBlocker[];
  /** Why the switch cannot be turned on, naming every missing purpose. */
  sentence: string;
}

const blockerLabel = (blocker: EnableBlocker): string => {
  const label = blocker.purpose_label || purposeLabel(String(blocker.purpose));
  return blocker.reason === 'account_deleted' ? `${label} (its QuickBooks account was deleted)` : label;
};

/**
 * Derive the enable blockers from the purpose rows when the server did not send
 * a list — the panel must be able to grey the switch out before the first PATCH
 * comes back with a 409.
 */
const derivedEnableBlockers = (settings: PostingSettings | null | undefined): EnableBlocker[] =>
  mappingRows(settings)
    .filter((row) => row.required && row.state !== 'mapped')
    .map((row) => ({
      purpose: row.purpose,
      purpose_label: row.label,
      required_by_kinds: row.requiredByKinds,
      reason: row.state === 'account_deleted' ? 'account_deleted' : 'unmapped',
      detail: row.detail
    }))
    .sort((a, b) => String(a.purpose).localeCompare(String(b.purpose)));

/**
 * THE GATE. `qb_posting_enabled` may only be switched ON when every required
 * mapping exists; DISABLING IS ALWAYS ALLOWED, because switching off must never
 * be blocked by the state that made you want to switch off.
 *
 * `can_enable` from the server is authoritative when present. The derivation
 * exists so the UI is never more permissive than the API while a response is in
 * flight — if either says no, the answer is no.
 */
export const toggleGate = (settings: PostingSettings | null | undefined): ToggleGate => {
  const connected = Boolean(settings?.quickbooks?.connected);
  const enabled = Boolean(settings?.qb_posting_enabled);
  const blockers = settings?.enable_blockers?.length ? settings.enable_blockers : derivedEnableBlockers(settings);
  const missingPurposes = settings?.missing_purposes?.length ? settings.missing_purposes : blockers.map((row) => String(row.purpose));

  const serverSaysYes = settings?.can_enable;
  const derivedYes = connected && blockers.length === 0;
  const canEnable = Boolean(settings) && derivedYes && serverSaysYes !== false;

  let sentence: string;
  if (canEnable) {
    sentence = 'Every required account is mapped, so QuickBooks posting can be switched on.';
  } else if (!settings) {
    sentence = 'QuickBooks posting settings have not loaded yet.';
  } else if (!connected) {
    sentence = 'This company is not connected to QuickBooks, so posting cannot be switched on. Connect QuickBooks first.';
  } else if (blockers.length > 0) {
    sentence =
      `QuickBooks posting cannot be switched on: ${blockers.length} required account mapping(s) are missing — ` +
      `${blockers.map(blockerLabel).join(', ')}.`;
  } else {
    // can_enable === false with nothing named: report the refusal rather than
    // overriding it with our own optimism.
    sentence = 'QuickBooks refused to enable posting for this company. Refresh the settings to see why.';
  }

  return { canEnable, connected, enabled, missingPurposes, blockers, sentence };
};

/** Disabling is never gated. Stated as a function so a caller cannot forget it. */
export const canDisablePosting = (): boolean => true;

export interface ToggleDecision {
  allowed: boolean;
  reason: string;
  /** Purposes to highlight in the panel when the answer is no. */
  missingPurposes: string[];
}

/** "Can I set the flag to `next`?" — the one call a toggle handler needs. */
export const describeToggleTarget = (settings: PostingSettings | null | undefined, next: boolean): ToggleDecision => {
  if (!next) {
    return {
      allowed: true,
      reason: 'Switching QuickBooks posting off is always allowed. Nothing already posted is removed from QuickBooks.',
      missingPurposes: []
    };
  }
  const gate = toggleGate(settings);
  return { allowed: gate.canEnable, reason: gate.sentence, missingPurposes: gate.missingPurposes };
};

// ---------------------------------------------------------------------------
// Reading the fail-closed conflict bodies
// ---------------------------------------------------------------------------

export interface MappingConflict {
  code: string;
  summary: string;
  /**
   * One entry per purpose. NOTE the house rule: this array is a SUBSET keyed by
   * purpose, so its index is not the index of anything you submitted — match on
   * `purpose`.
   */
  purposes: Array<{ purpose: string; label: string; reason: string; detail: string }>;
  missingPurposes: string[];
}

const bodyOf = (err: unknown): Record<string, unknown> | null => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
};

export const statusOf = (err: unknown): number | null => (err as { response?: { status?: number } })?.response?.status ?? null;

/**
 * Read the 409 `mappings_incomplete` / `quickbooks_not_connected` from PATCH,
 * and the 400 `invalid_mappings` from PUT. Both are per-PURPOSE, which is the
 * unit the panel renders — a flat "invalid input" leaves the operator guessing
 * which of eleven rows is wrong.
 */
export const parseMappingConflict = (err: unknown): MappingConflict => {
  const body = bodyOf(err);
  const code = typeof body?.code === 'string' ? body.code : 'unknown';
  const summary =
    (typeof body?.error === 'string' && body.error) ||
    (typeof body?.detail === 'string' && body.detail) ||
    'QuickBooks posting settings could not be saved.';

  const detail = Array.isArray(body?.detail) ? (body?.detail as unknown[]) : [];
  const purposes = detail
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => {
      const purpose = String(entry.purpose ?? '');
      return {
        purpose,
        label: typeof entry.purpose_label === 'string' && entry.purpose_label ? entry.purpose_label : purposeLabel(purpose),
        reason: typeof entry.reason === 'string' ? entry.reason : 'unmapped',
        detail: typeof entry.detail === 'string' ? entry.detail : ''
      };
    });

  const missingRaw = body?.missing_purposes;
  const missingPurposes = Array.isArray(missingRaw) ? missingRaw.map(String) : purposes.map((row) => row.purpose);

  return { code, summary, purposes, missingPurposes };
};

// ---------------------------------------------------------------------------
// Suggestion acceptance
// ---------------------------------------------------------------------------

export interface SuggestionChange {
  purpose: string;
  label: string;
  accountId: string;
  accountName: string;
  /** What it is replacing: null for an unmapped purpose. */
  replacesAccountName: string | null;
  /** True when this fixes a mapping whose QuickBooks account was deleted. */
  repairsDeleted: boolean;
  why: string;
}

export interface SuggestionSkip {
  purpose: string;
  label: string;
  reason: 'no_suggestion' | 'already_mapped';
  detail: string;
}

export interface AcceptAllPlan {
  /** The body for `savePostingMappings`. Empty when there is nothing to do. */
  assignments: Record<string, string>;
  changes: SuggestionChange[];
  skipped: SuggestionSkip[];
  changeCount: number;
  /** How many changes REPLACE an existing (broken) mapping rather than fill a gap. */
  repairCount: number;
  /** Explicit about how many mappings the button will change. Never "Accept all". */
  sentence: string;
}

/**
 * Build the accept-all assignment dict.
 *
 * THREE RULES, all of them load-bearing:
 *
 *   1. A purpose with no suggestion is SKIPPED, not mapped to nothing. `found:
 *      false` means the chart of accounts had nothing plausible; sending null
 *      would clear a mapping the operator never asked to clear.
 *
 *   2. A MAPPING A HUMAN ALREADY SET IS NEVER SILENTLY OVERWRITTEN. Auto-suggest
 *      guesses from account names and types; the operator's choice is evidence
 *      and the guess is not. Overwriting requires `overwriteExisting: true` at
 *      the call site, which is a deliberate act with its own confirmation.
 *
 *   3. A mapping whose ACCOUNT WAS DELETED is not a human choice that still
 *      stands — it is a broken row that fails the completeness check — so
 *      accepting a suggestion there is a repair and happens by default. It is
 *      counted separately so the confirmation can say so.
 */
export const planAcceptAll = (
  suggestions: SuggestionsResponse | null | undefined,
  settings: PostingSettings | null | undefined,
  options: { overwriteExisting?: boolean } = {}
): AcceptAllPlan => {
  const rows = mappingRows(settings);
  const byPurpose = new Map(rows.map((row) => [row.purpose, row]));
  const assignments: Record<string, string> = {};
  const changes: SuggestionChange[] = [];
  const skipped: SuggestionSkip[] = [];

  (suggestions?.suggestions ?? []).forEach((suggestion) => {
    const purpose = String(suggestion.purpose);
    const label = suggestion.label || purposeLabel(purpose);
    const current = byPurpose.get(purpose);
    const state = current?.state ?? 'unmapped';

    if (!suggestion.found || !suggestion.account?.id) {
      skipped.push({
        purpose,
        label,
        reason: 'no_suggestion',
        detail: `${label}: nothing in the chart of accounts matched, so it is left for you to choose.`
      });
      return;
    }

    // Rule 2 — an intact human-set mapping is preserved. `already_mapped` is the
    // suggester's own word for "this is what you already chose".
    const humanSet = state === 'mapped' || (suggestion.already_mapped && state !== 'account_deleted');
    if (humanSet && !options.overwriteExisting) {
      skipped.push({
        purpose,
        label,
        reason: 'already_mapped',
        detail: `${label} is already mapped to ${current?.accountName ?? 'an account'} and is left unchanged.`
      });
      return;
    }

    assignments[purpose] = suggestion.account.id;
    changes.push({
      purpose,
      label,
      accountId: suggestion.account.id,
      accountName: suggestion.account.fully_qualified_name || suggestion.account.name,
      replacesAccountName: state === 'mapped' ? (current?.accountName ?? null) : null,
      repairsDeleted: state === 'account_deleted',
      why: suggestion.why || ''
    });
  });

  const repairCount = changes.filter((change) => change.repairsDeleted).length;
  const overwriteCount = changes.filter((change) => change.replacesAccountName !== null).length;

  const parts: string[] = [];
  if (changes.length === 0) {
    parts.push('No mappings will change.');
  } else {
    parts.push(`${changes.length} mapping(s) will change.`);
  }
  if (repairCount > 0) parts.push(`${repairCount} replace a mapping whose QuickBooks account was deleted.`);
  if (overwriteCount > 0) parts.push(`${overwriteCount} OVERWRITE a mapping you set yourself.`);
  const alreadyMapped = skipped.filter((row) => row.reason === 'already_mapped').length;
  if (alreadyMapped > 0) parts.push(`${alreadyMapped} already mapped and left alone.`);
  const noSuggestion = skipped.filter((row) => row.reason === 'no_suggestion').length;
  if (noSuggestion > 0) parts.push(`${noSuggestion} had no suggestion and still need choosing.`);

  return {
    assignments,
    changes,
    skipped,
    changeCount: changes.length,
    repairCount,
    sentence: parts.join(' ')
  };
};

/** The PUT body for one dropdown change. `null` clears the mapping deliberately. */
export const singleMappingPayload = (purpose: string, accountId: string | null): Record<string, string | null> => ({
  [purpose]: accountId
});

// ---------------------------------------------------------------------------
// The account dropdown
// ---------------------------------------------------------------------------

export interface AccountGroup {
  accountType: string;
  accounts: QBAccountRef[];
}

/**
 * Group the chart of accounts for a searchable dropdown, PRESERVING the server's
 * order (it sorts by account_type then name) rather than re-sorting. Accounts
 * with no type land in one clearly-named bucket instead of an empty heading.
 */
export const groupAccounts = (accounts: QBAccountRef[] | null | undefined): AccountGroup[] => {
  const groups: AccountGroup[] = [];
  const index = new Map<string, AccountGroup>();
  (accounts ?? []).forEach((account) => {
    const key = account.account_type?.trim() || 'Other';
    let group = index.get(key);
    if (!group) {
      group = { accountType: key, accounts: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.accounts.push(account);
  });
  return groups;
};

/** Substring search over the fields an operator would actually type. */
export const filterAccounts = (accounts: QBAccountRef[] | null | undefined, term: string): QBAccountRef[] => {
  const needle = (term ?? '').trim().toLowerCase();
  if (!needle) return [...(accounts ?? [])];
  return (accounts ?? []).filter((account) =>
    [account.name, account.fully_qualified_name, account.account_type, account.account_sub_type, account.qb_id]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(needle))
  );
};

// ---------------------------------------------------------------------------
// Creating the accounts a merchant does not have
// ---------------------------------------------------------------------------

export interface CreateMissingResult {
  purpose: string;
  label: string;
  action: 'created' | 'reused_local' | 'reused_remote' | 'would_create' | 'skipped_not_creatable' | string;
  account: QBAccountRef | null;
}

export interface CreateMissingResponse {
  dry_run: boolean;
  results: CreateMissingResult[];
  would_create: string[];
  created: string[];
  not_creatable: string[];
  still_missing: string[];
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Created in QuickBooks',
  reused_local: 'Already mapped here',
  reused_remote: 'Found in QuickBooks and reused',
  would_create: 'Would be created',
  skipped_not_creatable: 'Cannot be created automatically'
};

export const createActionLabel = (action: string): string => ACTION_LABELS[action] ?? deslug(action);

/**
 * The confirmation sentence for the create-missing action.
 *
 * A dry run and a real run are described in different tenses on purpose: this
 * writes rows into a customer's chart of accounts, and "3 accounts were created"
 * must never be shown for a plan that created nothing.
 */
export const describeCreateMissing = (response: CreateMissingResponse | null | undefined): string => {
  if (!response) return 'No account-creation plan has been run yet.';
  const parts: string[] = [];
  if (response.dry_run) {
    const count = response.would_create?.length ?? 0;
    parts.push(count === 0 ? 'Nothing would be created in QuickBooks.' : `${count} account(s) would be created in QuickBooks.`);
  } else {
    const count = response.created?.length ?? 0;
    parts.push(count === 0 ? 'No accounts were created in QuickBooks.' : `${count} account(s) were created in QuickBooks.`);
  }
  const notCreatable = response.not_creatable?.length ?? 0;
  if (notCreatable > 0) {
    parts.push(
      `${notCreatable} cannot be created automatically and must be chosen from your existing accounts: ` +
        `${response.not_creatable.map(purposeLabel).join(', ')}.`
    );
  }
  const stillMissing = response.still_missing?.length ?? 0;
  if (stillMissing > 0) {
    parts.push(`${stillMissing} required mapping(s) still missing: ${response.still_missing.map(purposeLabel).join(', ')}.`);
  } else {
    parts.push('No required mappings are missing.');
  }
  return parts.join(' ');
};

// ---------------------------------------------------------------------------
// Money, as integer cents
// ---------------------------------------------------------------------------

const MONEY_RE = /^-?\d+(?:\.\d+)?$/;

/**
 * A decimal money STRING to integer cents, or null when it is not money.
 *
 * Parsed from the digits, never via `Number(value) * 100`: `19.99 * 100` is
 * 1998.9999999999998 in IEEE 754, and a column of those summed and floored is
 * how a journal ends up a cent out. Rounding beyond two places is half-away-
 * from-zero, matching Python's `ROUND_HALF_UP` on Decimal.
 *
 * Null means "not a number I can trust", which renders as an em dash. It does
 * NOT mean zero — that distinction is the whole reason this returns null.
 */
export const toCents = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // A JSON number has already lost exactness; convert once, never sum floats.
    if (!Number.isFinite(value)) return null;
    return toCents(value.toFixed(4));
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!MONEY_RE.test(trimmed)) return null;

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ''] = unsigned.split('.');
  const twoPlaces = `${fraction}00`.slice(0, 2);
  const remainder = fraction.slice(2);

  let cents = Number(whole) * 100 + Number(twoPlaces);
  if (remainder && remainder.charCodeAt(0) >= '5'.charCodeAt(0)) {
    cents += 1;
  }
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
};

/**
 * Integer cents as money, built from the integer parts.
 *
 * Not `(cents / 100).toLocaleString({style: 'currency'})`: that reintroduces the
 * float this function exists to avoid, on the one number an accountant will read
 * most carefully. Grouping comes from `toLocaleString` on the WHOLE part, which
 * is an integer and therefore exact.
 */
export const formatCents = (cents: number | null | undefined): string => {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return EM_DASH;
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}$${whole.toLocaleString('en-US')}.${fraction}`;
};

/** The same, with an explicit sign — for a difference, where "+" and "−" differ. */
export const formatSignedCents = (cents: number | null | undefined): string => {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return EM_DASH;
  if (cents > 0) return `+${formatCents(cents)}`;
  return formatCents(cents);
};

// ---------------------------------------------------------------------------
// The day-drill journal-entry table
// ---------------------------------------------------------------------------

export interface JournalDisplayRow {
  accountName: string;
  accountQbId: string;
  purposes: string[];
  purposeLabels: string[];
  postingType: string;
  debitCents: number | null;
  creditCents: number | null;
  debit: string;
  credit: string;
  /** Signed amount for a Deposit line, where there is no debit/credit side. */
  amountCents: number | null;
  amount: string;
  description: string;
  /** True for a line that claims no side (Deposit). Excluded from both totals. */
  unsided: boolean;
}

export const buildJournalRows = (lines: PostingLine[] | null | undefined): JournalDisplayRow[] =>
  (lines ?? []).map((line) => {
    const debitCents = toCents(line.debit);
    const creditCents = toCents(line.credit);
    const unsided = debitCents === null && creditCents === null;
    return {
      accountName: line.account_name || EM_DASH,
      accountQbId: line.account_qb_id || '',
      purposes: line.purposes ?? [],
      purposeLabels: (line.purposes ?? []).map(purposeLabel),
      postingType: line.posting_type || '',
      debitCents,
      creditCents,
      debit: formatCents(debitCents),
      credit: formatCents(creditCents),
      amountCents: toCents(line.amount),
      amount: formatCents(toCents(line.amount)),
      description: line.description || '',
      unsided
    };
  });

export interface JournalTotals {
  debitCents: number;
  creditCents: number;
  debitTotal: string;
  creditTotal: string;
  /**
   * True/false for a two-sided journal entry; NULL when no line claims a side.
   *
   * A Deposit is not a journal entry — its lines carry no PostingType — so both
   * sides sum to zero and "balanced: true" would be a meaningless tick beside a
   * document that was never going to balance. Null says "not applicable".
   */
  balanced: boolean | null;
  /** debits − credits, signed. Zero when balanced, null when not applicable. */
  differenceCents: number | null;
  difference: string;
  /** Lines with no side at all (Deposit lines), and their signed total. */
  unsidedCount: number;
  unsidedCents: number;
  /** Lines whose money could not be parsed — never silently treated as zero. */
  unparsedCount: number;
}

/**
 * Sum a rendered journal AS INTEGER CENTS and report whether it balances.
 *
 * The imbalance is SIGNED and reported in full. "Does not balance" with no
 * figure is useless; the difference is what identifies the missing line — see
 * the discount-contra test, where dropping one line moves the difference by
 * exactly the discount.
 */
export const journalTotals = (rows: JournalDisplayRow[] | null | undefined): JournalTotals => {
  let debitCents = 0;
  let creditCents = 0;
  let unsidedCount = 0;
  let unsidedCents = 0;
  let unparsedCount = 0;
  let sidedCount = 0;

  (rows ?? []).forEach((row) => {
    if (row.debitCents !== null) {
      debitCents += row.debitCents;
      sidedCount += 1;
    }
    if (row.creditCents !== null) {
      creditCents += row.creditCents;
      sidedCount += 1;
    }
    if (row.unsided) {
      unsidedCount += 1;
      if (row.amountCents === null) unparsedCount += 1;
      else unsidedCents += row.amountCents;
    }
  });

  const applicable = sidedCount > 0;
  const differenceCents = applicable ? debitCents - creditCents : null;

  return {
    debitCents,
    creditCents,
    debitTotal: formatCents(debitCents),
    creditTotal: formatCents(creditCents),
    balanced: applicable ? debitCents === creditCents : null,
    differenceCents,
    difference: applicable ? formatSignedCents(differenceCents) : EM_DASH,
    unsidedCount,
    unsidedCents,
    unparsedCount
  };
};

/** The sentence under the totals row. Names the gap when there is one. */
export const describeBalance = (totals: JournalTotals): string => {
  if (totals.balanced === null) {
    return 'This is a Deposit, not a two-sided journal entry, so it has no debit/credit balance to check.';
  }
  if (totals.balanced) {
    return `Debits ${totals.debitTotal} = credits ${totals.creditTotal}. This entry balances.`;
  }
  return (
    `Debits ${totals.debitTotal} do NOT equal credits ${totals.creditTotal} — ` +
    `out by ${formatSignedCents(totals.differenceCents)}. QuickBooks will reject this entry.`
  );
};

// ---------------------------------------------------------------------------
// One day-drill entry, read honestly
// ---------------------------------------------------------------------------

export type DayEntryState = 'composed' | 'mappings_incomplete' | 'nothing_to_post' | 'refused' | 'error' | 'unknown';

export const dayEntryState = (entry: DayEntry | null | undefined): DayEntryState => {
  if (!entry) return 'unknown';
  if (entry.composed) return 'composed';
  const reason = entry.unavailable_reason;
  if (reason === 'mappings_incomplete' || reason === 'nothing_to_post' || reason === 'refused' || reason === 'error') {
    return reason;
  }
  return 'unknown';
};

/**
 * The composer's own words about tips, carried through VERBATIM when it sent
 * them.
 *
 * Restating them here would be a second source of truth for a claim about the
 * schema; the fallback exists only for the payloads that carry no totals at all
 * (nothing composed), where the absence still has to be stated.
 */
export const tipsDisclosure = (entry: DayEntry | null | undefined): string | null => {
  if (!entry || String(entry.kind) !== 'sales_summary') return null;
  const note = entry.totals?.tips_note;
  if (typeof note === 'string' && note.trim()) return note.trim();
  return TIPS_NOT_MODELLED;
};

/**
 * The skipped-null-cost note, or null when nothing was skipped.
 *
 * Read from the entry's OWN counters rather than from `totals`, because the
 * backend puts them on the entry precisely so they survive the case where the
 * journal composed to nothing — a day where every movement lacked a cost is the
 * day this matters most and the day `totals` is empty.
 */
export const cogsSkippedNote = (entry: DayEntry | null | undefined): string | null => {
  if (!entry || String(entry.kind) !== 'cogs_journal') return null;
  const movements = Number(entry.movements_skipped_null_cost ?? 0);
  if (!Number.isFinite(movements) || movements <= 0) return null;
  const units = Number(entry.units_skipped_null_cost ?? 0);
  return cogsSkippedSentence(movements, Number.isFinite(units) ? units : 0);
};

/** True when the COGS figure on screen is known to be incomplete. */
export const cogsIsUnderstated = (entry: DayEntry | null | undefined): boolean => cogsSkippedNote(entry) !== null;

export interface DayEntryView {
  kind: string;
  label: string;
  state: DayEntryState;
  rows: JournalDisplayRow[];
  totals: JournalTotals;
  /** The server's own balance flag, kept so a disagreement is visible. */
  serverBalanced: boolean | null;
  balanceSentence: string;
  objectType: string | null;
  txnDate: string | null;
  privateNote: string;
  missingPurposes: string[];
  /** Every note that must travel with this entry, de-duplicated, in order. */
  notes: string[];
  posting: DayPostingSummary | null;
  cogsTotalCents: number | null;
  cogsTotal: string;
  headline: string;
}

const unavailableHeadline = (entry: DayEntry, state: DayEntryState): string => {
  const label = entry.label || postingKindLabel(String(entry.kind));
  if (state === 'mappings_incomplete') {
    const named = (entry.missing_purposes ?? []).map(purposeLabel).join(', ');
    return `${label}: not composed — ${named || 'required accounts'} not mapped. Map them to see what would post.`;
  }
  if (state === 'nothing_to_post') {
    return `${label}: nothing to post for this day. No entry is created, rather than an entry of zero.`;
  }
  if (state === 'refused') {
    return `${label}: refused — ${entry.refused?.error ?? 'the composed entry did not reconcile'}.`;
  }
  if (state === 'error') {
    return `${label}: could not be composed. ${entry.notes?.[0] ?? ''}`.trim();
  }
  return `${label}: state unknown.`;
};

/**
 * Everything one drill-down entry needs, with the honesty notes attached.
 *
 * The notes are appended in a fixed order and de-duplicated, so the composer's
 * own `tips_note` (carried through verbatim) does not appear twice beside our
 * fallback, and so a screenshot always carries the same caveats in the same
 * place.
 */
export const dayEntryView = (entry: DayEntry | null | undefined): DayEntryView | null => {
  if (!entry) return null;
  const state = dayEntryState(entry);
  const rows = buildJournalRows(entry.lines);
  const totals = journalTotals(rows);
  // `cogs_total` IS `totals["cogs"]` server-side, so the fallback is the same
  // number by another name rather than a second opinion. Both absent means the
  // COGS total is UNKNOWN, which renders as an em dash — a day where every
  // movement lacked a cost must not read as $0.00 of cost of goods sold.
  const cogsTotalCents = toCents(entry.cogs_total ?? entry.totals?.cogs);

  const notes: string[] = [];
  (entry.notes ?? []).forEach((note) => {
    if (typeof note === 'string' && note.trim()) notes.push(note.trim());
  });
  const tips = tipsDisclosure(entry);
  if (tips) notes.push(tips);
  const skipped = cogsSkippedNote(entry);
  if (skipped) notes.push(skipped);

  return {
    kind: String(entry.kind),
    label: entry.label || postingKindLabel(String(entry.kind)),
    state,
    rows,
    totals,
    serverBalanced: entry.balanced ?? null,
    balanceSentence: state === 'composed' ? describeBalance(totals) : '',
    objectType: entry.object_type ?? null,
    txnDate: entry.txn_date ?? null,
    privateNote: entry.private_note ?? '',
    missingPurposes: entry.missing_purposes ?? [],
    notes: dedupe(notes),
    posting: entry.posting ?? null,
    cogsTotalCents,
    cogsTotal: formatCents(cogsTotalCents),
    headline: composedHeadline(entry, state, totals)
  };
};

/**
 * "Composed" is not the same claim as "will be accepted".
 *
 * A composed entry that does not balance is a real state — the backend's own
 * `_assert_balanced` is what usually catches it, but the drill-down renders
 * whatever it was handed — and the headline must not congratulate it.
 */
const composedHeadline = (entry: DayEntry, state: DayEntryState, totals: JournalTotals): string => {
  const label = entry.label || postingKindLabel(String(entry.kind));
  if (state !== 'composed') return unavailableHeadline(entry, state);
  if (totals.balanced === false) {
    return `${label} composed but does NOT balance — out by ${formatSignedCents(totals.differenceCents)}. QuickBooks will reject it.`;
  }
  return `${label} composed from your mapped accounts.`;
};

const dedupe = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    if (seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
};

/** The banner above the whole day: preview vs live, and whether QB is connected. */
export const describeDayMode = (drill: DayDrill | null | undefined): string => {
  if (!drill) return '';
  if (!drill.quickbooks_connected) {
    return 'This company is not connected to QuickBooks. Nothing can post; the lines below are a preview only.';
  }
  if (drill.preview_only || !drill.qb_posting_enabled) return PREVIEW_ONLY_NOTE;
  return 'QuickBooks posting is on. These are the entries this day posts, or has already posted.';
};

// ---------------------------------------------------------------------------
// Payout totals — derived, never "reconciled"
// ---------------------------------------------------------------------------

export interface PayoutTotalsView {
  grossCents: number | null;
  feesCents: number | null;
  netCents: number | null;
  gross: string;
  fees: string;
  net: string;
  paymentsInWindow: number | null;
  /**
   * ALWAYS FALSE. There is no independent fee figure to check against, so no
   * input can make this true. It is a field rather than an omission so that a
   * component reading it cannot accidentally render a tick.
   */
  reconciled: false;
  /** How `fees` came to exist, in one clause. */
  derivation: string;
  /** The full disclosure — the server's own wording when it sent one. */
  disclosure: string;
}

/**
 * Read a payout posting's totals for display.
 *
 * Deliberately does NOT compute `gross - fees - net` and show a tick when it is
 * zero: `fees` IS `gross - net`, so that check passes for every possible input
 * and would put a verification badge on an unverified number. See
 * PAYOUT_FEE_NOT_VERIFIED.
 */
export const payoutTotalsView = (totals: Record<string, unknown> | null | undefined, disclosure?: string | null): PayoutTotalsView => {
  const grossCents = toCents(totals?.gross);
  const feesCents = toCents(totals?.fees);
  const netCents = toCents(totals?.net);
  const payments = Number(totals?.payments_in_window);
  return {
    grossCents,
    feesCents,
    netCents,
    gross: formatCents(grossCents),
    fees: formatCents(feesCents),
    net: formatCents(netCents),
    paymentsInWindow: Number.isFinite(payments) ? payments : null,
    reconciled: false,
    derivation: 'fees = gross captured in the window − payout net',
    disclosure: disclosure?.trim() || PAYOUT_FEE_NOT_VERIFIED
  };
};

/** The disclosure to show, preferring the server's wording over our copy of it. */
export const payoutDisclosure = (source: { disclosures?: { payout_deposit?: string } } | null | undefined): string =>
  source?.disclosures?.payout_deposit?.trim() || PAYOUT_FEE_NOT_VERIFIED;

// ---------------------------------------------------------------------------
// The posting log
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<PostingStatus, string> = {
  pending: 'Pending',
  posted: 'Posted',
  failed: 'Failed',
  amended: 'Amended',
  skipped: 'Skipped (nothing to post)'
};

/**
 * Every status, DERIVED from the label map rather than restated beside it.
 *
 * `postingLogQuery` accepts exactly the keys of `STATUS_LABELS` and drops
 * anything else, so a hand-written second list would be one edit away from
 * offering a filter chip the query builder silently discards — the failure mode
 * where the picker says "Amended" and the table shows everything.
 */
export const POSTING_STATUSES: PostingStatus[] = Object.keys(STATUS_LABELS) as PostingStatus[];

/** De-slug an unknown status rather than printing "Unknown" — same rule as reasons. */
export const postingStatusLabel = (status: string): string => STATUS_LABELS[status as PostingStatus] ?? deslug(status);

export type PostingStatusColor = 'default' | 'info' | 'success' | 'error' | 'warning';

const STATUS_COLORS: Record<PostingStatus, PostingStatusColor> = {
  pending: 'info',
  posted: 'success',
  // An amendment is a success, but not the same success: something changed
  // after the day was first posted, and an accountant reconciling that day
  // needs to notice.
  amended: 'warning',
  failed: 'error',
  // Skipped is not a failure and must not be red: "nothing sold that day" is a
  // normal outcome, and a red chip beside it trains people to ignore red.
  skipped: 'default'
};

export const postingStatusColor = (status: string): PostingStatusColor => STATUS_COLORS[status as PostingStatus] ?? 'default';

/** One sentence for what a status means on this row. */
export const describePostingStatus = (row: Pick<PostingRow, 'status' | 'skipped_reason' | 'attempts'>): string => {
  switch (row.status) {
    case 'posted':
      return 'Posted to QuickBooks.';
    case 'amended':
      return 'Re-sent as an amendment to the entry already in QuickBooks — not a second entry.';
    case 'failed':
      return `Failed after ${row.attempts} attempt(s). Nothing was posted for this day.`;
    case 'skipped':
      return row.skipped_reason ? `Skipped: ${row.skipped_reason}.` : 'Skipped — there was nothing to post for this day.';
    case 'pending':
      return 'Composed but not yet sent to QuickBooks.';
    default:
      return postingStatusLabel(String(row.status));
  }
};

// ---------------------------------------------------------------------------
// The QuickBooks link-out
// ---------------------------------------------------------------------------

const QBO_PATHS: Record<string, string> = {
  JournalEntry: 'journal',
  Deposit: 'deposit'
};

export type QBOEnvironment = 'production' | 'sandbox';

/**
 * A deep link to the object in QuickBooks, or NULL.
 *
 * Null whenever the id or the type is missing, or the type is one this build
 * does not know a path for. A dead link on a screen an accountant is using to
 * verify a figure is worse than no link: it reads as "the entry is there" right
 * up until it 404s.
 *
 * The sandbox host is a separate parameter because no sandbox round-trip has
 * been run from this codebase — a sandbox posting linked to the production host
 * would be exactly the dead link this function exists to prevent.
 */
export const qboObjectUrl = (
  row: { qb_object_type?: string | null; qb_object_id?: string | null } | null | undefined,
  options: { environment?: QBOEnvironment } = {}
): string | null => {
  const type = (row?.qb_object_type ?? '').trim();
  const id = (row?.qb_object_id ?? '').trim();
  if (!id) return null;
  // One condition, not two: a blank type and a type this build has no path for
  // are the same answer here (`QBO_PATHS['']` is already undefined), and a
  // separate `!type` check would be a guard no test could falsify.
  const path = type ? QBO_PATHS[type] : undefined;
  if (!path) return null;
  const host = options.environment === 'sandbox' ? 'https://sandbox.qbo.intuit.com' : 'https://qbo.intuit.com';
  return `${host}/app/${path}?txnId=${encodeURIComponent(id)}`;
};

/** Why there is no link, for a tooltip. Null when there IS one. */
export const describeMissingLink = (
  row: { qb_object_type?: string | null; qb_object_id?: string | null; status?: string } | null | undefined
): string | null => {
  if (qboObjectUrl(row)) return null;
  const type = (row?.qb_object_type ?? '').trim();
  const id = (row?.qb_object_id ?? '').trim();
  if (!id) return 'Nothing was created in QuickBooks for this row, so there is nothing to open.';
  if (!type) return 'QuickBooks returned an id but no object type for this row, so a link cannot be built safely.';
  return `No QuickBooks link is known for a ${type}.`;
};

// ---------------------------------------------------------------------------
// Failure text
// ---------------------------------------------------------------------------

export interface PostingErrorSummary {
  /** One line for the collapsed row. Never empty when there is an error. */
  headline: string;
  /** The recorded text in full, for the expanded panel. */
  full: string;
  truncated: boolean;
  /** Coarse cause, for wording the retry button. */
  category: 'quickbooks_rejected' | 'quickbooks_unavailable' | 'mappings_incomplete' | 'posting_disabled' | 'unknown';
  /** Whether re-running has a reasonable chance of a different outcome. */
  retryWorthwhile: boolean;
}

const HEADLINE_MAX = 140;

/**
 * Summarise the error text recorded on a posting row.
 *
 * The stored text is whatever the executor caught — often a QuickBooks fault
 * with a stack of detail — so the row shows the first line and the panel shows
 * everything. Nothing is rewritten: an error an operator forwards to support has
 * to be the text we actually recorded.
 */
export const summarizePostingError = (error: string | null | undefined): PostingErrorSummary | null => {
  const full = (error ?? '').trim();
  if (!full) return null;

  const firstLine = full.split('\n')[0].trim() || full;
  const truncated = firstLine.length > HEADLINE_MAX;
  const headline = truncated ? `${firstLine.slice(0, HEADLINE_MAX).trimEnd()}…` : firstLine;

  const haystack = full.toLowerCase();
  let category: PostingErrorSummary['category'] = 'unknown';
  if (haystack.includes('unmapped') || haystack.includes('mapping')) category = 'mappings_incomplete';
  else if (haystack.includes('switched off') || haystack.includes('disabled')) category = 'posting_disabled';
  else if (
    haystack.includes('unavailable') ||
    haystack.includes('timed out') ||
    haystack.includes('429') ||
    haystack.includes('temporarily')
  )
    category = 'quickbooks_unavailable';
  else if (haystack.includes('quickbooks')) category = 'quickbooks_rejected';

  // A rejection will be rejected again until something changes; an outage will
  // not. Saying so stops an operator hammering retry against a terminal fault.
  const retryWorthwhile = category === 'quickbooks_unavailable' || category === 'unknown';

  return { headline, full, truncated, category, retryWorthwhile };
};

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

export const RETRY_AMENDS_NOTE =
  'Re-running amends the entry already in QuickBooks (its Id and SyncToken are sent as a sparse update). It never creates a second entry.';

export interface RetryDecision {
  allowed: boolean;
  reason: string;
  /** Purposes to highlight when the answer is no. */
  missingPurposes: string[];
}

/**
 * Predict the backend's fail-closed gate so a blocked retry is explained rather
 * than attempted.
 *
 * `assert_can_post` runs FIRST server-side and answers 409 with no HTTP, so this
 * changes nothing about safety — it changes whether the operator is told what to
 * fix or shown a conflict.
 */
export const canRetry = (row: Pick<PostingRow, 'kind'> | null | undefined, settings: PostingSettings | null | undefined): RetryDecision => {
  if (!row) return { allowed: false, reason: 'No posting selected.', missingPurposes: [] };
  if (!settings) return { allowed: false, reason: 'QuickBooks posting settings have not loaded yet.', missingPurposes: [] };
  if (!settings.quickbooks?.connected) {
    return { allowed: false, reason: 'This company is not connected to QuickBooks, so nothing can be re-sent.', missingPurposes: [] };
  }
  if (!settings.qb_posting_enabled) {
    return {
      allowed: false,
      reason: 'QuickBooks posting is switched off for this company, so a retry would be refused before any request is made.',
      missingPurposes: []
    };
  }
  const readiness = kindReadiness(settings).find((kind) => kind.kind === String(row.kind));
  if (readiness && !readiness.mappingsComplete) {
    return {
      allowed: false,
      reason: `${readiness.label} cannot be re-sent: ${readiness.missing.map((entry) => entry.label).join(', ')} not mapped.`,
      missingPurposes: readiness.missingPurposes
    };
  }
  return { allowed: true, reason: RETRY_AMENDS_NOTE, missingPurposes: [] };
};

export interface RetryOutcome {
  dry_run: boolean;
  amended: boolean;
  posting: PostingRow;
}

/** What actually happened, in the tense it happened in. */
export const describeRetryOutcome = (outcome: RetryOutcome | null | undefined): string => {
  if (!outcome?.posting) return 'The retry returned nothing to show.';
  const row = outcome.posting;
  const object = row.qb_object_type && row.qb_object_id ? `${row.qb_object_type} ${row.qb_object_id}` : 'the QuickBooks entry';
  if (outcome.dry_run) {
    return `Dry run only — nothing was sent to QuickBooks. Status is ${postingStatusLabel(String(row.status)).toLowerCase()}.`;
  }
  if (row.status === 'skipped') {
    return row.skipped_reason ? `Skipped: ${row.skipped_reason}. Nothing was sent.` : 'Skipped — there was nothing to post for this day.';
  }
  if (row.status === 'failed') {
    return `Still failing after ${row.attempts} attempt(s). Nothing was posted.`;
  }
  if (outcome.amended || row.status === 'amended') {
    return `Amended ${object} in QuickBooks. No duplicate entry was created.`;
  }
  return `Posted ${object} to QuickBooks.`;
};

// ---------------------------------------------------------------------------
// Query builders
//
// House rule from Session 7/8: validate and OMIT. Several list endpoints in this
// codebase turn a malformed uuid into an uncaught 500, and this one answers a
// clean 400 — but a stale bookmark should not be able to break the page either
// way, and an unfiltered table is a page while an error is not.
//
// `postingLogFilterIssues` exists because silently unfiltering is its own lie: a
// table that says "Downtown" in the picker while showing every location is worse
// than an empty one.
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): boolean => typeof value === 'string' && UUID_RE.test(value.trim());

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * A strict, zero-padded, real calendar date — the same rule insights.ts uses.
 *
 * Python's `date.fromisoformat` is strict, so "2026-1-1" and "2026-02-30" are
 * both 400s; the day is checked against the month because the second one parses
 * as a shape and exists in no calendar.
 */
export const isCalendarDate = (value: unknown): boolean => {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value.trim())) return false;
  const [year, month, day] = value.trim().split('-').map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
};

/**
 * "YYYY-MM-DD" in the BROWSER'S calendar day.
 *
 * Not `toISOString().slice(0, 10)`: that converts to UTC first, so at 19:00 in
 * New York a "today" default asks for a day that has not happened yet.
 */
export const isoDateOf = (date: Date): string => {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const POSTING_LOG_MAX_PAGE_SIZE = 200;
export const POSTING_LOG_DEFAULT_PAGE_SIZE = 50;

export interface PostingLogFilters {
  kinds?: string[];
  statuses?: string[];
  locationId?: string | null;
  start?: string | null;
  end?: string | null;
  page?: number;
  pageSize?: number;
}

const isValidRange = (start: string | null | undefined, end: string | null | undefined): boolean => {
  if (!isCalendarDate(start) || !isCalendarDate(end)) return true;
  return String(start).trim() <= String(end).trim();
};

/**
 * The query string for `GET /quickbooks/postings/`.
 *
 * Returns a STRING with repeated keys, not an object: `kind` and `status` are
 * read with `request.GET.getlist`, and axios 1.x would serialise an array as
 * `kind[]=…`, which that call ignores — the filter would appear to do nothing
 * while returning everything.
 */
export const postingLogQuery = (filters: PostingLogFilters = {}): string => {
  const params = new URLSearchParams();

  const seenKinds = new Set<string>();
  (filters.kinds ?? []).forEach((kind) => {
    if (!POSTING_KINDS.includes(kind as PostingKind) || seenKinds.has(kind)) return;
    seenKinds.add(kind);
    params.append('kind', kind);
  });

  const seenStatuses = new Set<string>();
  (filters.statuses ?? []).forEach((status) => {
    if (!(status in STATUS_LABELS) || seenStatuses.has(status)) return;
    seenStatuses.add(status);
    params.append('status', status);
  });

  if (isUuid(filters.locationId)) params.set('location_id', String(filters.locationId).trim());

  // A reversed range is a clean 400 server-side, so both ends are dropped rather
  // than sent; `postingLogFilterIssues` reports that it happened.
  const rangeOk = isValidRange(filters.start, filters.end);
  if (rangeOk && isCalendarDate(filters.start)) params.set('start', String(filters.start).trim());
  if (rangeOk && isCalendarDate(filters.end)) params.set('end', String(filters.end).trim());

  if (Number.isInteger(filters.page) && (filters.page as number) > 1) params.set('page', String(filters.page));
  if (Number.isInteger(filters.pageSize) && (filters.pageSize as number) > 0) {
    params.set('page_size', String(Math.min(filters.pageSize as number, POSTING_LOG_MAX_PAGE_SIZE)));
  }

  return params.toString();
};

/**
 * What the builder dropped, in words.
 *
 * Every omission above makes the table show MORE than the picker claims. The
 * screen has to say so, or the operator reads a company-wide log as one store's.
 */
export const postingLogFilterIssues = (filters: PostingLogFilters = {}): string[] => {
  const issues: string[] = [];
  (filters.kinds ?? []).forEach((kind) => {
    if (!POSTING_KINDS.includes(kind as PostingKind)) issues.push(`Ignored unknown posting kind "${kind}".`);
  });
  (filters.statuses ?? []).forEach((status) => {
    if (!(status in STATUS_LABELS)) issues.push(`Ignored unknown status "${status}".`);
  });
  if (filters.locationId && !isUuid(filters.locationId)) {
    issues.push('Ignored the location filter: it is not a valid id, so every location is shown.');
  }
  if (filters.start && !isCalendarDate(filters.start))
    issues.push(`Ignored the start date "${filters.start}": it is not a real calendar date.`);
  if (filters.end && !isCalendarDate(filters.end)) issues.push(`Ignored the end date "${filters.end}": it is not a real calendar date.`);
  if (!isValidRange(filters.start, filters.end)) {
    issues.push(`Ignored the date range: the start (${filters.start}) is after the end (${filters.end}), so no dates were filtered.`);
  }
  if (Number.isInteger(filters.pageSize) && (filters.pageSize as number) > POSTING_LOG_MAX_PAGE_SIZE) {
    issues.push(`Page size capped at ${POSTING_LOG_MAX_PAGE_SIZE}, the server's maximum.`);
  }
  return issues;
};

/**
 * The query for the day drill-down, or NULL when it cannot be built.
 *
 * Both parameters are REQUIRED server-side, so null means "do not call" rather
 * than "call unfiltered" — the opposite rule from the log, because an
 * unfiltered day has no meaning.
 */
export const dayDrillQuery = (params: { locationId?: string | null; date?: string | null }): string | null => {
  if (!isUuid(params.locationId) || !isCalendarDate(params.date)) return null;
  const query = new URLSearchParams();
  query.set('location_id', String(params.locationId).trim());
  query.set('date', String(params.date).trim());
  return query.toString();
};

/** Why the drill-down cannot be requested yet, for the empty state. */
export const describeDayDrillGap = (params: { locationId?: string | null; date?: string | null }): string | null => {
  if (dayDrillQuery(params)) return null;
  if (!isUuid(params.locationId) && !isCalendarDate(params.date)) return 'Choose a location and a day to see what posts.';
  if (!isUuid(params.locationId)) return 'Choose a location to see what posts for that day.';
  return 'Choose a day to see what posts for that location.';
};
