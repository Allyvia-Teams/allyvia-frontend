import { describe, expect, it } from 'vitest';

import {
  DayEntry,
  ENABLE_CHECKLIST,
  PAYOUT_FEE_NOT_VERIFIED,
  POSTING_LOG_MAX_PAGE_SIZE,
  POSTING_STATUSES,
  PREVIEW_ONLY_NOTE,
  PostingLine,
  PostingRow,
  PostingSettings,
  PurposeRow,
  QBAccountRef,
  REQUIRED_BY_KIND,
  RETRY_AMENDS_NOTE,
  SuggestionsResponse,
  TIPS_NOT_MODELLED,
  buildJournalRows,
  canDisablePosting,
  canRetry,
  cogsIsUnderstated,
  cogsSkippedNote,
  cogsSkippedSentence,
  createActionLabel,
  dayDrillQuery,
  dayEntryState,
  dayEntryView,
  deletedAccountRows,
  describeBalance,
  describeCreateMissing,
  describeDayDrillGap,
  describeDayMode,
  describeMissingLink,
  describePostingStatus,
  describeRetryOutcome,
  describeToggleTarget,
  filterAccounts,
  formatCents,
  formatSignedCents,
  groupAccounts,
  isCalendarDate,
  isUuid,
  isoDateOf,
  journalTotals,
  kindReadiness,
  mappingRows,
  mappingState,
  mappingStateLabel,
  mappingStateTone,
  parseMappingConflict,
  payoutDisclosure,
  payoutTotalsView,
  planAcceptAll,
  postingKindLabel,
  postingLogFilterIssues,
  postingLogQuery,
  postingStatusColor,
  postingStatusLabel,
  purposeLabel,
  qboObjectUrl,
  singleMappingPayload,
  summarizePostingError,
  tipsDisclosure,
  toCents,
  toggleGate
} from './qbPosting';
import { EM_DASH } from './stockFormat';

// ---------------------------------------------------------------------------
// Fixtures, shaped exactly like qb/posting_views.py's payloads.
// ---------------------------------------------------------------------------

const LOCATION_ID = '11111111-2222-4333-8444-555555555555';

const account = (over: Partial<QBAccountRef> = {}): QBAccountRef => ({
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  qb_id: '84',
  name: 'Sales of Product Income',
  fully_qualified_name: 'Income:Sales of Product Income',
  account_type: 'Income',
  account_sub_type: 'SalesOfProductIncome',
  active: true,
  ...over
});

/** A mapped purpose row. */
const mapped = (purpose: string, over: Partial<PurposeRow> = {}): PurposeRow => ({
  purpose,
  label: purposeLabel(purpose),
  account: account({ id: `acct-${purpose}`, name: `QBO ${purpose}`, fully_qualified_name: `QBO ${purpose}` }),
  mapped: true,
  mapping_exists: true,
  account_deleted: false,
  required_by_kinds: (['sales_summary', 'cogs_journal', 'payout_deposit'] as const).filter((kind) =>
    (REQUIRED_BY_KIND[kind] as string[]).includes(purpose)
  ),
  required: (['sales_summary', 'cogs_journal', 'payout_deposit'] as const).some((kind) =>
    (REQUIRED_BY_KIND[kind] as string[]).includes(purpose)
  ),
  creatable: false,
  ...over
});

/** Never mapped: no row, no account. */
const unmapped = (purpose: string, over: Partial<PurposeRow> = {}): PurposeRow =>
  mapped(purpose, { account: null, mapped: false, mapping_exists: false, account_deleted: false, ...over });

/**
 * THE THIRD STATE: the mapping row survived, the QuickBooks account did not.
 * `qb_account` is SET_NULL and the QB webhook hard-deletes QBAccount rows.
 */
const deleted = (purpose: string, over: Partial<PurposeRow> = {}): PurposeRow =>
  mapped(purpose, { account: null, mapped: false, mapping_exists: true, account_deleted: true, ...over });

const ALL_PURPOSES = [
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

/** Build a settings payload whose purposes are all mapped except those named. */
const settingsFixture = (
  options: {
    enabled?: boolean;
    connected?: boolean;
    unmapped?: string[];
    deleted?: string[];
    omitServerHints?: boolean;
  } = {}
): PostingSettings => {
  const unmappedSet = new Set(options.unmapped ?? []);
  const deletedSet = new Set(options.deleted ?? []);
  const purposes = ALL_PURPOSES.map((purpose) => {
    if (deletedSet.has(purpose)) return deleted(purpose);
    if (unmappedSet.has(purpose)) return unmapped(purpose);
    return mapped(purpose);
  });

  const enableBlockers = purposes
    .filter((row) => row.required && !row.mapped)
    .map((row) => ({
      purpose: String(row.purpose),
      purpose_label: row.label,
      required_by_kinds: row.required_by_kinds,
      reason: row.account_deleted ? 'account_deleted' : 'unmapped',
      detail: `${row.label} has no QuickBooks account mapped.`
    }))
    .sort((a, b) => a.purpose.localeCompare(b.purpose));

  const kinds = (['sales_summary', 'cogs_journal', 'payout_deposit'] as const).map((kind) => {
    const required = REQUIRED_BY_KIND[kind] as string[];
    const missing = required.filter((purpose) => unmappedSet.has(purpose) || deletedSet.has(purpose));
    return {
      kind,
      label: postingKindLabel(kind),
      required_purposes: required,
      missing_purposes: missing,
      mappings_complete: missing.length === 0,
      can_post: Boolean((options.enabled ?? true) && (options.connected ?? true) && missing.length === 0),
      blockers: missing.length
        ? [{ code: 'mappings_incomplete', detail: `Unmapped purpose(s): ${missing.join(', ')}.`, purposes: missing }]
        : []
    };
  });

  const base: PostingSettings = {
    qb_posting_enabled: options.enabled ?? true,
    quickbooks: { connected: options.connected ?? true, realm_id: '4620816365', access_token_valid: true, refresh_token_valid: true },
    purposes,
    kinds,
    missing_purposes: enableBlockers.map((row) => row.purpose),
    enable_blockers: enableBlockers,
    can_enable: (options.connected ?? true) && enableBlockers.length === 0,
    warnings: [],
    disclosures: { payout_deposit: PAYOUT_FEE_NOT_VERIFIED }
  };
  if (options.omitServerHints) {
    // The panel must work from `purposes` alone while a response is in flight.
    return { ...base, kinds: [], enable_blockers: [], missing_purposes: [], can_enable: false };
  }
  return base;
};

const line = (over: Partial<PostingLine> = {}): PostingLine => ({
  account_name: 'Stripe Clearing',
  account_qb_id: '91',
  purposes: ['stripe_clearing'],
  posting_type: 'Debit',
  debit: '105.00',
  credit: null,
  amount: '105.00',
  description: 'Card takings 2026-08-04',
  ...over
});

/**
 * The real sales-summary shape: subtotal 100.00, discount 5.00, tax 10.00, so
 * POSSale.total is 105.00 and the DISCOUNT CONTRA LINE is what makes the sides
 * meet (debits 105 + 5 = credits 100 + 10).
 */
const SALES_LINES: PostingLine[] = [
  line({
    account_name: 'Stripe Clearing',
    purposes: ['stripe_clearing'],
    posting_type: 'Debit',
    debit: '105.00',
    credit: null,
    amount: '105.00'
  }),
  line({
    account_name: 'Discounts Given',
    account_qb_id: '77',
    purposes: ['discounts'],
    posting_type: 'Debit',
    debit: '5.00',
    credit: null,
    amount: '5.00',
    description: 'Discounts given 2026-08-04'
  }),
  line({
    account_name: 'Sales of Product Income',
    account_qb_id: '84',
    purposes: ['sales_income'],
    posting_type: 'Credit',
    debit: null,
    credit: '100.00',
    amount: '100.00',
    description: 'Sales 2026-08-04'
  }),
  line({
    account_name: 'Sales Tax Payable',
    account_qb_id: '89',
    purposes: ['sales_tax_liability'],
    posting_type: 'Credit',
    debit: null,
    credit: '10.00',
    amount: '10.00',
    description: 'Sales tax collected 2026-08-04'
  })
];

const salesEntry = (over: Partial<DayEntry> = {}): DayEntry => ({
  kind: 'sales_summary',
  label: 'Daily sales summary',
  composed: true,
  unavailable_reason: null,
  missing_purposes: [],
  object_type: 'JournalEntry',
  txn_date: '2026-08-04',
  private_note: 'Allyvia daily sales summary — Downtown — 2026-08-04. 3 sale(s).',
  lines: SALES_LINES,
  debit_total: '110.00',
  credit_total: '110.00',
  balanced: true,
  totals: {
    sales: 3,
    subtotal: '100.00',
    tax: '10.00',
    discount: '5.00',
    card_total: '105.00',
    cash_total: '0.00',
    tips: '0.00',
    tips_note: 'POSSale carries no tip column in this schema; the tips line is omitted rather than invented.',
    entry_total: '110.00'
  },
  notes: ['POSSale carries no tip column in this schema; the tips line is omitted rather than invented.'],
  posting: null,
  ...over
});

const cogsEntry = (over: Partial<DayEntry> = {}): DayEntry => ({
  kind: 'cogs_journal',
  label: 'Daily COGS journal',
  composed: true,
  unavailable_reason: null,
  missing_purposes: [],
  object_type: 'JournalEntry',
  txn_date: '2026-08-04',
  private_note: 'Allyvia daily COGS — Downtown — 2026-08-04. 4 movement(s) costed.',
  lines: [
    line({
      account_name: 'Cost of Goods Sold',
      account_qb_id: '80',
      purposes: ['cogs_expense'],
      posting_type: 'Debit',
      debit: '60.00',
      credit: null,
      amount: '60.00'
    }),
    line({
      account_name: 'Inventory Asset',
      account_qb_id: '81',
      purposes: ['inventory_asset'],
      posting_type: 'Credit',
      debit: null,
      credit: '60.00',
      amount: '60.00'
    })
  ],
  debit_total: '60.00',
  credit_total: '60.00',
  balanced: true,
  totals: { cogs: '60.00', movements_costed: 4, movements_skipped_null_cost: 0, units_skipped_null_cost: 0 },
  notes: [],
  posting: null,
  cogs_total: '60.00',
  movements_skipped_null_cost: 0,
  units_skipped_null_cost: 0,
  ...over
});

const postingRow = (over: Partial<PostingRow> = {}): PostingRow => ({
  id: 'cccccccc-dddd-4eee-8fff-000000000000',
  posting_date: '2026-08-04',
  location_id: LOCATION_ID,
  location_name: 'Downtown',
  kind: 'sales_summary',
  kind_label: 'Daily sales summary',
  status: 'posted',
  status_label: 'Posted',
  qb_object_type: 'JournalEntry',
  qb_object_id: '1042',
  attempts: 1,
  error: '',
  trigger: 'cron:daily',
  performed_by_email: '',
  stripe_payout_id: null,
  totals: {},
  skipped_reason: null,
  refused: null,
  notes: [],
  posted_at: '2026-08-05T02:10:00Z',
  created_at: '2026-08-05T02:09:00Z',
  updated_at: '2026-08-05T02:10:00Z',
  ...over
});

const conflict = (status: number, body: unknown) => ({ response: { status, data: body } });

// ===========================================================================
// 1. THE THREE HONESTY STRINGS
// ===========================================================================

describe('the payout fee figure is presented as derived, never as reconciled', () => {
  it('says the fee is derived, that the sum therefore proves nothing, and what would verify it', () => {
    // Each clause is load-bearing. "Derived" without "so the sum proves nothing"
    // invites a reader to check gross = fees + net and conclude it was verified;
    // saying it is unverified without naming the missing input reads as a shrug
    // rather than as a known gap with a known fix.
    expect(PAYOUT_FEE_NOT_VERIFIED).toContain('DERIVED');
    expect(PAYOUT_FEE_NOT_VERIFIED).toContain('gross = fees + net always holds');
    expect(PAYOUT_FEE_NOT_VERIFIED).toContain('proves nothing');
    expect(PAYOUT_FEE_NOT_VERIFIED).toContain('NOT independently reconciled');
    expect(PAYOUT_FEE_NOT_VERIFIED).toContain('balance-transaction sync');
    expect(PAYOUT_FEE_NOT_VERIFIED).toContain('net exceeding gross');
  });

  it('never claims the payout reconciled, for any input — the flag is not derived from the numbers', () => {
    // fees === gross - net for every payout the composer can produce, so a
    // component that computed `gross - fees - net === 0` would light up a
    // verification badge on an unverified figure. `reconciled` is hard false.
    const identity = payoutTotalsView({ gross: '1000.00', fees: '29.30', net: '970.70', payments_in_window: 12 });
    expect(identity.reconciled).toBe(false);
    expect(identity.grossCents! - identity.feesCents! - identity.netCents!).toBe(0); // the identity holds…
    expect(identity.reconciled).not.toBe(true); // …and still proves nothing.

    const nonsense = payoutTotalsView({ gross: '1.00', fees: '0.00', net: '1.00' });
    expect(nonsense.reconciled).toBe(false);
  });

  it('names the derivation in words beside the figures', () => {
    const view = payoutTotalsView({ gross: '1000.00', fees: '29.30', net: '970.70' });
    expect(view.derivation).toBe('fees = gross captured in the window − payout net');
    expect(view.gross).toBe('$1,000.00');
    expect(view.fees).toBe('$29.30');
    expect(view.net).toBe('$970.70');
  });

  it('prefers the backend disclosure verbatim so one wording change lands everywhere', () => {
    const serverWording = 'Server says: these fees are derived and not reconciled.';
    expect(payoutDisclosure({ disclosures: { payout_deposit: serverWording } })).toBe(serverWording);
    expect(payoutTotalsView({}, serverWording).disclosure).toBe(serverWording);
    // …and falls back rather than showing nothing.
    expect(payoutDisclosure(null)).toBe(PAYOUT_FEE_NOT_VERIFIED);
    expect(payoutDisclosure({ disclosures: { payout_deposit: '   ' } })).toBe(PAYOUT_FEE_NOT_VERIFIED);
  });

  it('renders an unparseable payout total as an em dash, not as zero', () => {
    const view = payoutTotalsView({ gross: null, fees: undefined, net: 'n/a' });
    expect(view.gross).toBe(EM_DASH);
    expect(view.fees).toBe(EM_DASH);
    expect(view.net).toBe(EM_DASH);
    expect(view.net).not.toBe('$0.00');
  });
});

describe('tips are shown as an absence, never as a 0.00 line', () => {
  it("carries the composer's own tips_note through verbatim", () => {
    const entry = salesEntry();
    expect(tipsDisclosure(entry)).toBe(entry.totals.tips_note);
  });

  it('states the absence even when nothing composed and there is no totals payload to carry it', () => {
    const nothing = salesEntry({ composed: false, unavailable_reason: 'nothing_to_post', lines: [], totals: {}, notes: [] });
    const note = tipsDisclosure(nothing);
    expect(note).toBe(TIPS_NOT_MODELLED);
    expect(note).toContain('an absence, not a zero');
  });

  it('keeps the clause that stops a reader inferring "no tips were taken"', () => {
    expect(TIPS_NOT_MODELLED).toContain('no tip column');
    expect(TIPS_NOT_MODELLED).toContain('an absence, not a zero');
    expect(TIPS_NOT_MODELLED).toContain('not recorded anywhere');
  });

  it('composes no tips line at all — totals.tips is 0.00 and there is deliberately no row for it', () => {
    // The composer writes tips: "0.00" into totals. If a renderer read that key
    // and drew a line, the entry would claim zero tips were taken. Nothing in
    // the composed lines mentions tips, and the view surfaces the note instead.
    const view = dayEntryView(salesEntry())!;
    expect(salesEntry().totals.tips).toBe('0.00');
    expect(view.rows.some((row) => row.purposes.includes('tips_liability'))).toBe(false);
    expect(view.notes.join(' ')).toContain('no tip column');
  });

  it('attaches the tips note only to the sales summary, not to every entry', () => {
    expect(tipsDisclosure(cogsEntry())).toBeNull();
  });
});

describe('null-cost movements are reported as missing, never valued at zero', () => {
  it('shows the skipped count and says the movements are excluded rather than zero-valued', () => {
    const entry = cogsEntry({ movements_skipped_null_cost: 3, units_skipped_null_cost: 7 });
    const note = cogsSkippedNote(entry)!;
    expect(note).toContain('3 stock movement(s)');
    expect(note).toContain('7 unit(s)');
    expect(note).toContain('NOT valued at zero');
    expect(note).toContain('understates cost of goods sold');
    expect(cogsIsUnderstated(entry)).toBe(true);
  });

  it('survives the day that matters most: every movement lacked a cost, so nothing composed', () => {
    // This is the case the backend puts the counters on the ENTRY for. With the
    // journal composing to nothing, `totals` is empty — reading the count from
    // totals would silently drop it exactly when COGS is most wrong.
    const entry = cogsEntry({
      composed: false,
      unavailable_reason: 'nothing_to_post',
      lines: [],
      totals: {},
      cogs_total: undefined,
      movements_skipped_null_cost: 4,
      units_skipped_null_cost: 9,
      notes: []
    });
    const view = dayEntryView(entry)!;
    expect(cogsSkippedNote(entry)).toContain('4 stock movement(s)');
    expect(view.notes.join(' ')).toContain('9 unit(s)');
    // …and the COGS total is unknown, not zero.
    expect(view.cogsTotal).toBe(EM_DASH);
    expect(view.cogsTotal).not.toBe('$0.00');
  });

  it('stays silent when nothing was skipped, so the caveat keeps its meaning', () => {
    expect(cogsSkippedNote(cogsEntry())).toBeNull();
    expect(cogsIsUnderstated(cogsEntry())).toBe(false);
  });

  it('does not double-print the note the backend already attached', () => {
    const sentence = cogsSkippedSentence(2, 5);
    const entry = cogsEntry({ movements_skipped_null_cost: 2, units_skipped_null_cost: 5, notes: [sentence] });
    const occurrences = dayEntryView(entry)!.notes.filter((note) => note === sentence).length;
    expect(occurrences).toBe(1);
  });
});

// ===========================================================================
// 2. THE MAPPING PANEL STATE MACHINE
// ===========================================================================

describe('the mapping panel has three states, because a deleted account is not an unmapped purpose', () => {
  it('distinguishes mapped / unmapped / mapped-but-account-deleted', () => {
    expect(mappingState(mapped('sales_income'))).toBe('mapped');
    expect(mappingState(unmapped('sales_income'))).toBe('unmapped');
    expect(mappingState(deleted('sales_income'))).toBe('account_deleted');
  });

  it('reads the deleted state from the row surviving without an account, not from the flag alone', () => {
    // qb_account is SET_NULL and qb/events/handlers.py hard-deletes QBAccount on
    // a QuickBooks webhook, so `mapping_exists && !account` IS the deleted case.
    // A payload that forgot `account_deleted` must still not report "unmapped".
    const flagless = { account: null, mapped: false, mapping_exists: true, account_deleted: false };
    expect(mappingState(flagless)).toBe('account_deleted');
    expect(mappingState(flagless)).not.toBe('unmapped');
  });

  it('tones a deleted account as an error and an unmapped optional purpose as neutral', () => {
    expect(mappingStateTone('account_deleted', true)).toBe('error');
    expect(mappingStateTone('account_deleted', false)).toBe('error');
    expect(mappingStateTone('mapped', true)).toBe('success');
    expect(mappingStateTone('unmapped', true)).toBe('warning');
    // `refunds` is required by no kind — a warning there is noise that trains
    // people to ignore warnings.
    expect(mappingStateTone('unmapped', false)).toBe('default');
  });

  it('says the account was deleted IN QUICKBOOKS and which kinds that stops', () => {
    const rows = mappingRows(settingsFixture({ deleted: ['stripe_clearing'] }));
    const row = rows.find((entry) => entry.purpose === 'stripe_clearing')!;
    expect(row.state).toBe('account_deleted');
    expect(row.stateLabel).toBe('Account deleted in QuickBooks');
    expect(row.detail).toContain('deleted in QuickBooks');
    expect(row.blockedKinds).toEqual(expect.arrayContaining(['sales_summary', 'payout_deposit']));
    expect(deletedAccountRows(settingsFixture({ deleted: ['stripe_clearing'] })).map((entry) => entry.purpose)).toEqual([
      'stripe_clearing'
    ]);
  });

  it('renders a missing account name as an em dash rather than an empty cell', () => {
    const row = mappingRows(settingsFixture({ unmapped: ['cash_on_hand'] })).find((entry) => entry.purpose === 'cash_on_hand')!;
    expect(row.accountName).toBe(EM_DASH);
    expect(mappingStateLabel(row.state)).toBe('Not mapped');
  });

  it('keeps all eleven purposes in the backend declaration order', () => {
    expect(mappingRows(settingsFixture()).map((row) => row.purpose)).toEqual(ALL_PURPOSES);
  });

  it('de-slugs a purpose this build has not heard of instead of printing Unknown', () => {
    expect(purposeLabel('gift_card_liability')).toBe('Gift card liability');
    expect(purposeLabel('sales_income')).toBe('Sales income');
    expect(purposeLabel('')).toBe(EM_DASH);
  });
});

describe('which kinds can run right now, and what is stopping the rest', () => {
  it('matches the server required_purposes for every kind — a drift tripwire', () => {
    // The toggle is gated on QBAccountMapping.REQUIRED_BY_KIND. If the backend
    // adds a required purpose and this constant does not, the panel would permit
    // something the API refuses. This test fails first.
    const settings = settingsFixture();
    settings.kinds.forEach((kind) => {
      expect(kind.required_purposes).toEqual(REQUIRED_BY_KIND[kind.kind as keyof typeof REQUIRED_BY_KIND]);
    });
  });

  it('blocks only the kinds that need the missing purpose, and lets the others run', () => {
    // cogs_expense is required by the COGS journal alone; sales and payouts are
    // unaffected and must keep posting.
    const readiness = kindReadiness(settingsFixture({ unmapped: ['cogs_expense'] }));
    const byKind = new Map(readiness.map((kind) => [kind.kind, kind]));
    expect(byKind.get('cogs_journal')!.canPost).toBe(false);
    expect(byKind.get('cogs_journal')!.missingPurposes).toEqual(['cogs_expense']);
    expect(byKind.get('sales_summary')!.canPost).toBe(true);
    expect(byKind.get('payout_deposit')!.canPost).toBe(true);
  });

  it('blocks two kinds from one shared purpose', () => {
    // stripe_clearing is required by BOTH the sales summary and the payout
    // deposit, which is exactly why the mapping panel lists kinds per purpose.
    const readiness = kindReadiness(settingsFixture({ deleted: ['stripe_clearing'] }));
    const blocked = readiness.filter((kind) => !kind.canPost).map((kind) => kind.kind);
    expect(blocked.sort()).toEqual(['payout_deposit', 'sales_summary']);
  });

  it('names the deleted-account reason in the kind sentence, not just "not mapped"', () => {
    const readiness = kindReadiness(settingsFixture({ deleted: ['cogs_expense'] }));
    const cogs = readiness.find((kind) => kind.kind === 'cogs_journal')!;
    expect(cogs.sentence).toContain('account deleted in QuickBooks');
    expect(cogs.missing[0].state).toBe('account_deleted');
  });

  it('reports the flag being off separately from a mapping problem', () => {
    const readiness = kindReadiness(settingsFixture({ enabled: false }));
    readiness.forEach((kind) => {
      expect(kind.mappingsComplete).toBe(true);
      expect(kind.canPost).toBe(false);
      expect(kind.sentence).toContain('switched off');
    });
  });

  it('works from the purpose rows alone when the server sent no kinds array', () => {
    const readiness = kindReadiness(settingsFixture({ unmapped: ['bank_deposit'], omitServerHints: true }));
    expect(readiness.map((kind) => kind.kind)).toEqual(['sales_summary', 'cogs_journal', 'payout_deposit']);
    expect(readiness.find((kind) => kind.kind === 'payout_deposit')!.missingPurposes).toEqual(['bank_deposit']);
  });
});

// ===========================================================================
// 3. THE TOGGLE GATE
// ===========================================================================

describe('the posting toggle may only be switched on when every required mapping exists', () => {
  it('refuses to enable and NAMES the unmapped purpose', () => {
    const settings = settingsFixture({ enabled: false, unmapped: ['sales_income'] });
    const gate = toggleGate(settings);
    expect(gate.canEnable).toBe(false);
    expect(gate.missingPurposes).toContain('sales_income');
    expect(gate.sentence).toContain('cannot be switched on');
    expect(gate.sentence).toContain('Sales income');

    const decision = describeToggleTarget(settings, true);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Sales income');
    expect(decision.missingPurposes).toContain('sales_income');
  });

  it('refuses on a MAPPED-BUT-DELETED account and says the account was deleted', () => {
    // The row exists, so a two-state panel would show it as mapped and offer the
    // switch — and the PATCH would 409. The completeness check fails here, and
    // correctly so: the account is gone and a human must choose another.
    const settings = settingsFixture({ enabled: false, deleted: ['stripe_fees'] });
    const gate = toggleGate(settings);
    expect(gate.canEnable).toBe(false);
    expect(gate.sentence).toContain('Stripe fees');
    expect(gate.sentence).toContain('QuickBooks account was deleted');
  });

  it('allows enabling once everything required is mapped', () => {
    const gate = toggleGate(settingsFixture({ enabled: false }));
    expect(gate.canEnable).toBe(true);
    expect(gate.sentence).toContain('can be switched on');
    expect(describeToggleTarget(settingsFixture({ enabled: false }), true).allowed).toBe(true);
  });

  it('ignores unmapped OPTIONAL purposes — refunds and tips block nothing', () => {
    const gate = toggleGate(settingsFixture({ enabled: false, unmapped: ['refunds', 'tips_liability', 'discounts'] }));
    expect(gate.canEnable).toBe(true);
    expect(gate.missingPurposes).toEqual([]);
  });

  it('refuses when QuickBooks is not connected, even with every mapping in place', () => {
    const gate = toggleGate(settingsFixture({ enabled: false, connected: false }));
    expect(gate.canEnable).toBe(false);
    expect(gate.sentence).toContain('not connected to QuickBooks');
  });

  it('ALWAYS allows disabling — switching off is never blocked by the state that made you want to', () => {
    expect(canDisablePosting()).toBe(true);
    const broken = settingsFixture({ enabled: true, unmapped: ['sales_income'], deleted: ['stripe_clearing'] });
    const off = describeToggleTarget(broken, false);
    expect(off.allowed).toBe(true);
    expect(off.reason).toContain('always allowed');
    // And it must not smuggle the enable blockers into the off path.
    expect(off.missingPurposes).toEqual([]);
  });

  it('stays closed while the settings have not loaded, rather than defaulting to permitted', () => {
    expect(toggleGate(null).canEnable).toBe(false);
    expect(toggleGate(undefined).canEnable).toBe(false);
    expect(describeToggleTarget(null, true).allowed).toBe(false);
  });

  it('takes the more restrictive answer when the server and the purpose rows disagree', () => {
    // A stale can_enable:true with a purpose row that is plainly unmapped must
    // not open the switch: the PATCH would 409 and the operator would learn
    // about it as a conflict instead of as a sentence.
    const settings = settingsFixture({ enabled: false, unmapped: ['cash_on_hand'] });
    settings.can_enable = true;
    expect(toggleGate(settings).canEnable).toBe(false);
  });

  it('derives the blockers itself when the server sent none, so the switch is right before the first PATCH', () => {
    const settings = settingsFixture({ enabled: false, unmapped: ['inventory_asset'], omitServerHints: true });
    const gate = toggleGate(settings);
    expect(gate.canEnable).toBe(false);
    expect(gate.missingPurposes).toEqual(['inventory_asset']);
    expect(gate.sentence).toContain('Inventory asset');
  });

  it('spells out the human steps before software writes into real books', () => {
    expect(ENABLE_CHECKLIST.length).toBeGreaterThan(3);
    expect(ENABLE_CHECKLIST.join(' ')).toContain('SANDBOX');
    expect(ENABLE_CHECKLIST.join(' ')).toContain('No sandbox round-trip has been run');
  });
});

describe('the fail-closed conflict bodies are read per purpose', () => {
  it('reads the 409 mappings_incomplete blocker list, one entry per purpose', () => {
    const parsed = parseMappingConflict(
      conflict(409, {
        error: 'Cannot enable QuickBooks posting: 2 required account mapping(s) are missing.',
        code: 'mappings_incomplete',
        detail: [
          {
            purpose: 'cash_on_hand',
            purpose_label: 'Cash on hand',
            required_by_kinds: ['sales_summary'],
            reason: 'unmapped',
            detail: 'Cash on hand has no QuickBooks account mapped.'
          },
          {
            purpose: 'stripe_fees',
            purpose_label: 'Stripe fees',
            required_by_kinds: ['payout_deposit'],
            reason: 'account_deleted',
            detail: 'the mapped QuickBooks account no longer exists'
          }
        ],
        missing_purposes: ['cash_on_hand', 'stripe_fees']
      })
    );
    expect(parsed.code).toBe('mappings_incomplete');
    expect(parsed.missingPurposes).toEqual(['cash_on_hand', 'stripe_fees']);
    // Matched by PURPOSE, never by array position: the backend appends only the
    // purposes that failed, so index 0 is not row 0 of anything submitted.
    expect(parsed.purposes.find((row) => row.purpose === 'stripe_fees')!.reason).toBe('account_deleted');
  });

  it('reads the 400 invalid_mappings body from the PUT, which is all-or-nothing', () => {
    const parsed = parseMappingConflict(
      conflict(400, {
        error: '1 mapping(s) could not be saved; nothing was changed.',
        code: 'invalid_mappings',
        detail: [
          {
            purpose: 'sales_income',
            purpose_label: 'Sales income',
            reason: 'account_not_found',
            detail: 'No such QuickBooks account for this company.'
          }
        ]
      })
    );
    expect(parsed.code).toBe('invalid_mappings');
    expect(parsed.summary).toContain('nothing was changed');
    expect(parsed.purposes[0].reason).toBe('account_not_found');
    // No missing_purposes key on this body — fall back to the purposes named.
    expect(parsed.missingPurposes).toEqual(['sales_income']);
  });

  it('reads the not-connected 409 without inventing missing purposes', () => {
    const parsed = parseMappingConflict(
      conflict(409, { error: 'Merths is not connected to QuickBooks.', code: 'quickbooks_not_connected', detail: [] })
    );
    expect(parsed.code).toBe('quickbooks_not_connected');
    expect(parsed.purposes).toEqual([]);
    expect(parsed.missingPurposes).toEqual([]);
  });

  it('falls back to a sentence rather than showing nothing when the body is unusable', () => {
    expect(parseMappingConflict(new Error('boom')).summary).toContain('could not be saved');
    expect(parseMappingConflict(conflict(500, '<html>500</html>')).code).toBe('unknown');
  });
});

// ===========================================================================
// 4. SUGGESTION ACCEPTANCE
// ===========================================================================

const suggestionsFixture = (over: Partial<SuggestionsResponse> = {}): SuggestionsResponse => ({
  suggestions: [
    {
      purpose: 'sales_income',
      label: 'Sales income',
      found: true,
      already_mapped: false,
      why: 'account_type=Income/SalesOfProductIncome',
      account: account({ id: 'sugg-income', name: 'Sales of Product Income' })
    },
    {
      purpose: 'cash_on_hand',
      label: 'Cash on hand',
      found: true,
      already_mapped: false,
      why: "name~'cash'",
      account: account({ id: 'sugg-cash', name: 'Cash on Hand', account_type: 'Bank' })
    },
    { purpose: 'stripe_fees', label: 'Stripe fees', found: false, already_mapped: false, why: 'no_match', account: null }
  ],
  accounts: [account(), account({ id: 'acct-bank', name: 'Cash on Hand', account_type: 'Bank', qb_id: '35' })],
  suggested_count: 2,
  ...over
});

describe('accepting suggestions never silently overwrites a mapping a human set', () => {
  it('fills only the gaps and leaves an existing mapping alone', () => {
    // sales_income is already mapped by hand; the suggester even says so. The
    // guess is a guess and the operator's choice is evidence.
    const settings = settingsFixture({ unmapped: ['cash_on_hand'] });
    const suggestions = suggestionsFixture();
    suggestions.suggestions[0].already_mapped = true;

    const plan = planAcceptAll(suggestions, settings);
    expect(Object.keys(plan.assignments)).toEqual(['cash_on_hand']);
    expect(plan.assignments.sales_income).toBeUndefined();
    expect(plan.skipped.find((row) => row.purpose === 'sales_income')!.reason).toBe('already_mapped');
    expect(plan.changeCount).toBe(1);
  });

  it('overwrites an existing mapping only when the caller asks explicitly, and says so loudly', () => {
    const settings = settingsFixture();
    const plan = planAcceptAll(suggestionsFixture(), settings, { overwriteExisting: true });
    expect(Object.keys(plan.assignments).sort()).toEqual(['cash_on_hand', 'sales_income']);
    expect(plan.sentence).toContain('OVERWRITE');
    // …and without the flag, nothing changes at all.
    const conservative = planAcceptAll(suggestionsFixture(), settings);
    expect(conservative.assignments).toEqual({});
    expect(conservative.changeCount).toBe(0);
    expect(conservative.sentence).toContain('No mappings will change.');
  });

  it('skips a purpose with no suggestion instead of clearing it to null', () => {
    // `found: false` means the chart had nothing plausible. Sending null would
    // erase a mapping the operator never asked to erase.
    const plan = planAcceptAll(suggestionsFixture(), settingsFixture({ unmapped: ['stripe_fees'] }));
    expect('stripe_fees' in plan.assignments).toBe(false);
    expect(plan.skipped.find((row) => row.purpose === 'stripe_fees')!.reason).toBe('no_suggestion');
    expect(plan.sentence).toContain('had no suggestion');
  });

  it('DOES accept over a mapping whose QuickBooks account was deleted — that is a repair, not an overwrite', () => {
    // A deleted-account row fails the completeness check, so leaving it alone
    // would leave the company unable to post. It is counted separately so the
    // confirmation can say what is being replaced.
    const plan = planAcceptAll(suggestionsFixture(), settingsFixture({ deleted: ['sales_income'] }));
    expect(plan.assignments.sales_income).toBe('sugg-income');
    expect(plan.repairCount).toBe(1);
    expect(plan.sentence).toContain('account was deleted');
  });

  it('states the exact number it will change rather than promising "accept all"', () => {
    const plan = planAcceptAll(suggestionsFixture(), settingsFixture({ unmapped: ['sales_income', 'cash_on_hand', 'stripe_fees'] }));
    expect(plan.changeCount).toBe(2);
    expect(plan.sentence).toContain('2 mapping(s) will change.');
    expect(plan.sentence).toContain('1 had no suggestion');
  });

  it('is a no-op on an empty or missing payload', () => {
    expect(planAcceptAll(null, settingsFixture()).assignments).toEqual({});
    expect(planAcceptAll({ suggestions: [], accounts: [], suggested_count: 0 }, null).changeCount).toBe(0);
  });

  it('builds a single-row PUT body, and lets null mean a deliberate clear', () => {
    expect(singleMappingPayload('discounts', 'acct-1')).toEqual({ discounts: 'acct-1' });
    expect(singleMappingPayload('discounts', null)).toEqual({ discounts: null });
  });
});

describe('the account dropdown', () => {
  it('groups by account type in the order the server sent, without re-sorting', () => {
    const accounts = [
      account({ id: '1', name: 'Sales', account_type: 'Income' }),
      account({ id: '2', name: 'Other Income', account_type: 'Income' }),
      account({ id: '3', name: 'Chequing', account_type: 'Bank' })
    ];
    const groups = groupAccounts(accounts);
    expect(groups.map((group) => group.accountType)).toEqual(['Income', 'Bank']);
    expect(groups[0].accounts.map((entry) => entry.id)).toEqual(['1', '2']);
  });

  it('puts untyped accounts in a named bucket rather than under a blank heading', () => {
    expect(groupAccounts([account({ account_type: '' })])[0].accountType).toBe('Other');
  });

  it('searches the fields an operator would type, including the QuickBooks id', () => {
    const accounts = [
      account({ id: '1', name: 'Sales of Product Income', qb_id: '84' }),
      account({ id: '2', name: 'Chequing', account_type: 'Bank', qb_id: '35' })
    ];
    expect(filterAccounts(accounts, 'bank').map((entry) => entry.id)).toEqual(['2']);
    expect(filterAccounts(accounts, '84').map((entry) => entry.id)).toEqual(['1']);
    expect(filterAccounts(accounts, '  ').length).toBe(2);
  });
});

describe('creating the accounts a merchant does not have', () => {
  it('describes a dry run in the conditional and a real run in the past tense', () => {
    const dry = describeCreateMissing({
      dry_run: true,
      results: [],
      would_create: ['stripe_fees', 'tips_liability'],
      created: [],
      not_creatable: [],
      still_missing: ['stripe_fees']
    });
    expect(dry).toContain('2 account(s) would be created');
    expect(dry).not.toContain('were created');

    const real = describeCreateMissing({
      dry_run: false,
      results: [],
      would_create: [],
      created: ['stripe_fees'],
      not_creatable: [],
      still_missing: []
    });
    expect(real).toContain('1 account(s) were created');
    expect(real).toContain('No required mappings are missing.');
  });

  it('names the purposes that cannot be bootstrapped and the ones still missing', () => {
    const text = describeCreateMissing({
      dry_run: true,
      results: [],
      would_create: [],
      created: [],
      not_creatable: ['sales_income'],
      still_missing: ['sales_income', 'cash_on_hand']
    });
    expect(text).toContain('Sales income');
    expect(text).toContain('Cash on hand');
    expect(text).toContain('2 required mapping(s) still missing');
  });

  it('labels every action the service can return, and de-slugs one it cannot', () => {
    expect(createActionLabel('reused_remote')).toBe('Found in QuickBooks and reused');
    expect(createActionLabel('skipped_not_creatable')).toBe('Cannot be created automatically');
    expect(createActionLabel('renamed_remote')).toBe('Renamed remote');
  });
});

// ===========================================================================
// 5. MONEY AS INTEGER CENTS
// ===========================================================================

describe('money is parsed to integer cents, never through a float', () => {
  it('parses decimal strings exactly', () => {
    expect(toCents('105.00')).toBe(10500);
    expect(toCents('0.01')).toBe(1);
    expect(toCents('19.99')).toBe(1999);
    expect(toCents('-40.00')).toBe(-4000);
    expect(toCents('1234')).toBe(123400);
  });

  it('avoids the float error that a Number()-based parser would introduce', () => {
    // Number('19.99') * 100 is 1998.9999999999998; truncating that gives 1998,
    // a cent short on every such line, and a column of them puts a journal out.
    expect(Math.trunc(Number('19.99') * 100)).toBe(1998);
    expect(toCents('19.99')).toBe(1999);
  });

  it('sums exactly where floats do not', () => {
    const cents = ['0.10', '0.20'].map(toCents).reduce<number>((sum, value) => sum + (value ?? 0), 0);
    expect(cents).toBe(30);
    expect(formatCents(cents)).toBe('$0.30');
    expect(0.1 + 0.2).not.toBe(0.3); // the reason this module exists
  });

  it('rounds beyond two places half away from zero, matching Python ROUND_HALF_UP', () => {
    expect(toCents('1.005')).toBe(101);
    expect(toCents('-1.005')).toBe(-101);
    expect(toCents('1.004')).toBe(100);
  });

  it('returns null for anything that is not money — never a confident zero', () => {
    expect(toCents(null)).toBeNull();
    expect(toCents(undefined)).toBeNull();
    expect(toCents('')).toBeNull();
    expect(toCents('n/a')).toBeNull();
    expect(toCents('1,234.56')).toBeNull(); // a grouped string is not a Decimal
    expect(toCents(Number.NaN)).toBeNull();
    expect(toCents('105.00')).not.toBeNull();
  });

  it('formats from the integer parts, with grouping and a signed variant', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(123456789)).toBe('$1,234,567.89');
    expect(formatCents(-500)).toBe('-$5.00');
    expect(formatCents(null)).toBe(EM_DASH);
    expect(formatSignedCents(500)).toBe('+$5.00');
    expect(formatSignedCents(-500)).toBe('-$5.00');
    expect(formatSignedCents(0)).toBe('$0.00');
  });
});

// ===========================================================================
// 6. THE DAY-DRILL JOURNAL TABLE
// ===========================================================================

describe('the journal table sums debits and credits as integer cents and reports the balance', () => {
  it('balances the real sales summary and shows both totals', () => {
    const totals = journalTotals(buildJournalRows(SALES_LINES));
    expect(totals.debitCents).toBe(11000);
    expect(totals.creditCents).toBe(11000);
    expect(totals.balanced).toBe(true);
    expect(totals.differenceCents).toBe(0);
    expect(describeBalance(totals)).toContain('This entry balances.');
  });

  it('THE DISCOUNT CONTRA LINE IS WHAT MAKES IT BALANCE: dropping it leaves it out by exactly the discount', () => {
    // POSSale.total is already net of discount while sales income is credited
    // GROSS (pre-discount subtotal), so without the contra line the debits fall
    // short by the discount. This is the reachable mistake the balance check is
    // protecting against — not a decoration on a construction that cannot fail.
    const discountCents = toCents('5.00')!;
    const withoutDiscount = SALES_LINES.filter((entry) => !entry.purposes.includes('discounts'));
    const totals = journalTotals(buildJournalRows(withoutDiscount));

    expect(totals.balanced).toBe(false);
    expect(totals.differenceCents).toBe(-discountCents);
    expect(Math.abs(totals.differenceCents!)).toBe(discountCents);
    expect(totals.debitCents).toBe(10500);
    expect(totals.creditCents).toBe(11000);
    expect(describeBalance(totals)).toContain('out by -$5.00');
    expect(describeBalance(totals)).toContain('QuickBooks will reject');
  });

  it('reports the imbalance SIGNED, so the missing side is identifiable', () => {
    const creditHeavy = journalTotals(
      buildJournalRows([
        line({ debit: '10.00', credit: null, posting_type: 'Debit' }),
        line({ debit: null, credit: '12.00', posting_type: 'Credit' })
      ])
    );
    expect(creditHeavy.differenceCents).toBe(-200);
    const debitHeavy = journalTotals(
      buildJournalRows([
        line({ debit: '12.00', credit: null, posting_type: 'Debit' }),
        line({ debit: null, credit: '10.00', posting_type: 'Credit' })
      ])
    );
    expect(debitHeavy.differenceCents).toBe(200);
    expect(debitHeavy.difference).toBe('+$2.00');
  });

  it('says a Deposit has no balance to check rather than ticking a meaningless 0 = 0', () => {
    // Deposit lines carry no PostingType, so both sides sum to zero. Reporting
    // "balanced" there would put a tick beside a document that was never a
    // two-sided journal entry.
    const depositRows = buildJournalRows([
      line({ posting_type: '', debit: null, credit: null, amount: '1000.00', account_name: 'Stripe Clearing' }),
      line({ posting_type: '', debit: null, credit: null, amount: '-29.30', account_name: 'Stripe Fees' })
    ]);
    const totals = journalTotals(depositRows);
    expect(totals.balanced).toBeNull();
    expect(totals.balanced).not.toBe(true);
    expect(totals.unsidedCount).toBe(2);
    expect(totals.unsidedCents).toBe(97070);
    expect(totals.difference).toBe(EM_DASH);
    expect(describeBalance(totals)).toContain('not a two-sided journal entry');
  });

  it('counts a line whose money it could not parse instead of treating it as zero', () => {
    const rows = buildJournalRows([line({ posting_type: '', debit: null, credit: null, amount: 'unknown' })]);
    expect(rows[0].amountCents).toBeNull();
    expect(rows[0].amount).toBe(EM_DASH);
    expect(journalTotals(rows).unparsedCount).toBe(1);
  });

  it('labels each line with the purposes it serves, keeping both when an account serves two', () => {
    const rows = buildJournalRows([line({ purposes: ['discounts', 'refunds'] })]);
    expect(rows[0].purposeLabels).toEqual(['Discounts given', 'Refunds']);
  });

  it('handles an empty line list without claiming a balance', () => {
    const totals = journalTotals([]);
    expect(totals.balanced).toBeNull();
    expect(totals.debitTotal).toBe('$0.00');
  });
});

describe('one day-drill entry, read honestly', () => {
  it('classifies every state the backend can return', () => {
    expect(dayEntryState(salesEntry())).toBe('composed');
    expect(dayEntryState(salesEntry({ composed: false, unavailable_reason: 'mappings_incomplete' }))).toBe('mappings_incomplete');
    expect(dayEntryState(salesEntry({ composed: false, unavailable_reason: 'nothing_to_post' }))).toBe('nothing_to_post');
    expect(dayEntryState(salesEntry({ composed: false, unavailable_reason: 'refused' }))).toBe('refused');
    expect(dayEntryState(salesEntry({ composed: false, unavailable_reason: 'error' }))).toBe('error');
    expect(dayEntryState(null)).toBe('unknown');
  });

  it('names the unmapped purposes when a kind could not be composed', () => {
    const view = dayEntryView(
      cogsEntry({
        composed: false,
        unavailable_reason: 'mappings_incomplete',
        missing_purposes: ['cogs_expense', 'inventory_asset'],
        lines: [],
        totals: {}
      })
    )!;
    expect(view.headline).toContain('Cost of goods sold');
    expect(view.headline).toContain('Inventory asset');
    expect(view.rows).toEqual([]);
  });

  it('says nothing-to-post rather than showing an entry of zero', () => {
    const view = dayEntryView(salesEntry({ composed: false, unavailable_reason: 'nothing_to_post', lines: [], totals: {}, notes: [] }))!;
    expect(view.headline).toContain('nothing to post');
    expect(view.headline).toContain('rather than an entry of zero');
    expect(view.totals.balanced).toBeNull();
  });

  it('carries a reconciliation refusal through with its discrepancy', () => {
    const view = dayEntryView(
      salesEntry({
        composed: false,
        unavailable_reason: 'refused',
        lines: [],
        refused: { error: 'net 120.00 exceeds gross captured 100.00', discrepancy: '-20.00' },
        notes: ['net 120.00 exceeds gross captured 100.00']
      })
    )!;
    expect(view.headline).toContain('net 120.00 exceeds gross captured 100.00');
  });

  it('does not congratulate a composed entry that does not balance', () => {
    const view = dayEntryView(salesEntry({ lines: SALES_LINES.filter((entry) => !entry.purposes.includes('discounts')) }))!;
    expect(view.headline).toContain('does NOT balance');
    expect(view.headline).toContain('-$5.00');
  });

  it("keeps the server's own balanced flag so a disagreement with our arithmetic is visible", () => {
    const view = dayEntryView(salesEntry({ balanced: true, lines: SALES_LINES.filter((entry) => !entry.purposes.includes('discounts')) }))!;
    expect(view.serverBalanced).toBe(true);
    expect(view.totals.balanced).toBe(false);
  });

  it('reads the COGS total from the entry, and as an em dash when there is none', () => {
    expect(dayEntryView(cogsEntry())!.cogsTotal).toBe('$60.00');
    // cogs_total IS totals["cogs"] server-side, so the fallback is the same
    // number by another name; only when BOTH are absent is the total unknown.
    expect(dayEntryView(cogsEntry({ cogs_total: null }))!.cogsTotal).toBe('$60.00');
    const unknown = dayEntryView(cogsEntry({ cogs_total: null, totals: {} }))!;
    expect(unknown.cogsTotal).toBe(EM_DASH);
    expect(unknown.cogsTotal).not.toBe('$0.00');
  });
});

describe('the day banner distinguishes preview from live', () => {
  const drill = (over: Record<string, unknown> = {}) => ({
    date: '2026-08-04',
    location: { id: LOCATION_ID, name: 'Downtown' },
    qb_posting_enabled: true,
    quickbooks_connected: true,
    preview_only: false,
    entries: [],
    payout_postings: [],
    ...over
  });

  it('says nothing was sent when posting is off', () => {
    expect(describeDayMode(drill({ qb_posting_enabled: false, preview_only: true }))).toBe(PREVIEW_ONLY_NOTE);
    expect(PREVIEW_ONLY_NOTE).toContain('Nothing has been sent to QuickBooks');
  });

  it('leads with the connection problem when QuickBooks is not connected', () => {
    expect(describeDayMode(drill({ quickbooks_connected: false }))).toContain('not connected to QuickBooks');
  });

  it('says these are the real entries when posting is on', () => {
    expect(describeDayMode(drill())).toContain('posting is on');
  });
});

// ===========================================================================
// 7. THE POSTING LOG
// ===========================================================================

describe('posting status vocabulary', () => {
  it('labels every status the model defines', () => {
    expect(postingStatusLabel('pending')).toBe('Pending');
    expect(postingStatusLabel('posted')).toBe('Posted');
    expect(postingStatusLabel('failed')).toBe('Failed');
    expect(postingStatusLabel('amended')).toBe('Amended');
    expect(postingStatusLabel('skipped')).toBe('Skipped (nothing to post)');
  });

  it('de-slugs an unrecognised status rather than printing "Unknown"', () => {
    expect(postingStatusLabel('partially_voided')).toBe('Partially voided');
    expect(postingStatusLabel('partially_voided')).not.toBe('Unknown');
    expect(postingStatusLabel('')).toBe(EM_DASH);
  });

  it('colours amended as a warning and skipped as neutral, not as failures', () => {
    expect(postingStatusColor('posted')).toBe('success');
    expect(postingStatusColor('failed')).toBe('error');
    // An amendment succeeded, but something changed after the day first posted —
    // an accountant reconciling that day has to notice.
    expect(postingStatusColor('amended')).toBe('warning');
    // "Nothing sold that day" is normal; a red chip there trains people to
    // ignore red.
    expect(postingStatusColor('skipped')).toBe('default');
    expect(postingStatusColor('skipped')).not.toBe('error');
    expect(postingStatusColor('pending')).toBe('info');
    expect(postingStatusColor('who_knows')).toBe('default');
  });

  it('explains an amendment as an amendment and never as a second entry', () => {
    expect(describePostingStatus(postingRow({ status: 'amended' }))).toContain('not a second entry');
    expect(describePostingStatus(postingRow({ status: 'skipped', skipped_reason: 'nothing to post for this day' }))).toContain(
      'nothing to post'
    );
    expect(describePostingStatus(postingRow({ status: 'failed', attempts: 3 }))).toContain('3 attempt(s)');
    expect(describePostingStatus(postingRow({ status: 'failed' }))).toContain('Nothing was posted');
  });

  it('labels kinds, de-slugging one it has not heard of', () => {
    expect(postingKindLabel('sales_summary')).toBe('Daily sales summary');
    expect(postingKindLabel('payout_deposit')).toBe('Payout deposit');
    expect(postingKindLabel('vendor_bill')).toBe('Vendor bill');
  });

  it('enumerates every status the model defines, so a filter chip exists for each', () => {
    expect([...POSTING_STATUSES].sort()).toEqual(['amended', 'failed', 'pending', 'posted', 'skipped']);
    // Each one has a label of its own: a chip labelled by the de-slug fallback
    // would mean the vocabulary drifted from the model.
    POSTING_STATUSES.forEach((status) => {
      expect(postingStatusLabel(status)).not.toBe(status);
    });
  });

  it('offers exactly the statuses the query builder accepts, so no chip can filter nothing', () => {
    // The failure this pins: a status listed for the UI but dropped by
    // `postingLogQuery` shows the operator "Amended" in the picker while the
    // table quietly returns every row — worse than an empty table, because it
    // reads as data.
    POSTING_STATUSES.forEach((status) => {
      expect(postingLogQuery({ statuses: [status] })).toBe(`status=${status}`);
    });
    expect(postingLogQuery({ statuses: ['reconciled'] })).toBe('');
  });
});

describe('the QuickBooks link-out only exists when it can work', () => {
  it('links a JournalEntry and a Deposit by their QuickBooks id', () => {
    expect(qboObjectUrl(postingRow())).toBe('https://qbo.intuit.com/app/journal?txnId=1042');
    expect(qboObjectUrl(postingRow({ qb_object_type: 'Deposit', qb_object_id: '77' }))).toBe('https://qbo.intuit.com/app/deposit?txnId=77');
  });

  it('returns NULL rather than a dead link when the id or the type is missing', () => {
    // A dead link on the screen an accountant is using to verify a figure reads
    // as "the entry is there" right up until it 404s.
    expect(qboObjectUrl(postingRow({ qb_object_id: '' }))).toBeNull();
    expect(qboObjectUrl(postingRow({ qb_object_type: '' }))).toBeNull();
    expect(qboObjectUrl(postingRow({ qb_object_type: '   ', qb_object_id: '   ' }))).toBeNull();
    expect(qboObjectUrl(null)).toBeNull();
    expect(qboObjectUrl(undefined)).toBeNull();
  });

  it('returns null for an object type it has no path for, instead of guessing one', () => {
    expect(qboObjectUrl(postingRow({ qb_object_type: 'Invoice', qb_object_id: '5' }))).toBeNull();
  });

  it('points at the sandbox host when asked, because a sandbox id on the production host is a dead link', () => {
    expect(qboObjectUrl(postingRow(), { environment: 'sandbox' })).toBe('https://sandbox.qbo.intuit.com/app/journal?txnId=1042');
  });

  it('escapes the id rather than pasting it into a URL', () => {
    expect(qboObjectUrl(postingRow({ qb_object_id: '10 42' }))).toContain('txnId=10%2042');
  });

  it('says WHY there is no link, and says nothing when there is one', () => {
    expect(describeMissingLink(postingRow())).toBeNull();
    expect(describeMissingLink(postingRow({ qb_object_id: '' }))).toContain('Nothing was created in QuickBooks');
    expect(describeMissingLink(postingRow({ qb_object_type: '' }))).toContain('no object type');
    expect(describeMissingLink(postingRow({ qb_object_type: 'Invoice' }))).toContain('Invoice');
  });
});

describe('the recorded failure text is summarised without being rewritten', () => {
  it('shows the first line collapsed and keeps the full text for the panel', () => {
    const error =
      'QuickBooks rejected the JournalEntry.\nFault: 6240 Duplicate Document Number\nDetail: The document number you entered already exists.';
    const summary = summarizePostingError(error)!;
    expect(summary.headline).toBe('QuickBooks rejected the JournalEntry.');
    expect(summary.full).toBe(error);
    expect(summary.full).toContain('6240');
  });

  it('truncates a single very long line with an ellipsis and flags it', () => {
    const long = `QuickBooks fault: ${'x'.repeat(400)}`;
    const summary = summarizePostingError(long)!;
    expect(summary.truncated).toBe(true);
    expect(summary.headline.endsWith('…')).toBe(true);
    expect(summary.headline.length).toBeLessThan(long.length);
    // Nothing is lost — the full text is still there for support.
    expect(summary.full).toBe(long);
  });

  it('separates a transient outage from a terminal rejection so retry advice is honest', () => {
    expect(summarizePostingError('QuickBooks is temporarily unavailable (429).')!.retryWorthwhile).toBe(true);
    expect(summarizePostingError('QuickBooks rejected the entry: account is inactive.')!.category).toBe('quickbooks_rejected');
    expect(summarizePostingError('QuickBooks rejected the entry: account is inactive.')!.retryWorthwhile).toBe(false);
    expect(summarizePostingError('Unmapped purpose(s): cogs_expense.')!.category).toBe('mappings_incomplete');
  });

  it('returns null for a row that did not fail, so no empty panel is rendered', () => {
    expect(summarizePostingError('')).toBeNull();
    expect(summarizePostingError('   ')).toBeNull();
    expect(summarizePostingError(null)).toBeNull();
  });
});

describe('retrying a posting amends rather than duplicating, and predicts the fail-closed gate', () => {
  it('says out loud that a retry amends the existing entry', () => {
    expect(RETRY_AMENDS_NOTE).toContain('sparse update');
    expect(RETRY_AMENDS_NOTE).toContain('never creates a second entry');
  });

  it('refuses before any request when posting is switched off', () => {
    // assert_can_post runs FIRST server-side and answers 409 with no HTTP; this
    // turns that conflict into a sentence.
    const decision = canRetry(postingRow(), settingsFixture({ enabled: false }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('switched off');
  });

  it("refuses with the missing purposes when the row's kind is not fully mapped", () => {
    const decision = canRetry(postingRow({ kind: 'cogs_journal' }), settingsFixture({ unmapped: ['inventory_asset'] }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Inventory asset');
    expect(decision.missingPurposes).toEqual(['inventory_asset']);
  });

  it('allows a retry for a kind that IS mapped even while another kind is blocked', () => {
    const settings = settingsFixture({ unmapped: ['cogs_expense'] });
    expect(canRetry(postingRow({ kind: 'sales_summary' }), settings).allowed).toBe(true);
    expect(canRetry(postingRow({ kind: 'cogs_journal' }), settings).allowed).toBe(false);
  });

  it('refuses when QuickBooks is not connected or nothing has loaded', () => {
    expect(canRetry(postingRow(), settingsFixture({ connected: false })).allowed).toBe(false);
    expect(canRetry(postingRow(), null).allowed).toBe(false);
    expect(canRetry(null, settingsFixture()).allowed).toBe(false);
  });

  it('reports a dry run as having sent nothing', () => {
    const text = describeRetryOutcome({ dry_run: true, amended: false, posting: postingRow({ status: 'pending' }) });
    expect(text).toContain('nothing was sent');
  });

  it('reports an amendment as an amendment, naming the object and denying a duplicate', () => {
    const text = describeRetryOutcome({ dry_run: false, amended: true, posting: postingRow({ status: 'amended' }) });
    expect(text).toContain('Amended JournalEntry 1042');
    expect(text).toContain('No duplicate entry was created');
  });

  it('reports a still-failing retry and a skipped day without claiming a post', () => {
    expect(describeRetryOutcome({ dry_run: false, amended: false, posting: postingRow({ status: 'failed', attempts: 2 }) })).toContain(
      'Still failing after 2'
    );
    expect(
      describeRetryOutcome({
        dry_run: false,
        amended: false,
        posting: postingRow({ status: 'skipped', skipped_reason: 'nothing to post for this day' })
      })
    ).toContain('Nothing was sent');
    expect(describeRetryOutcome(null)).toContain('returned nothing');
  });
});

// ===========================================================================
// 8. QUERY BUILDERS
// ===========================================================================

describe('the posting-log query omits junk rather than sending it', () => {
  it('repeats kind and status keys, because the view reads them with getlist', () => {
    // axios would serialise an array as `kind[]=…`, which getlist silently
    // ignores — the filter appears to do nothing while returning everything.
    const query = postingLogQuery({ kinds: ['sales_summary', 'cogs_journal'], statuses: ['failed', 'amended'] });
    expect(query).toBe('kind=sales_summary&kind=cogs_journal&status=failed&status=amended');
    expect(query).not.toContain('kind[]');
    expect(query).not.toContain('%5B%5D');
  });

  it('drops unknown kinds, unknown statuses and duplicates', () => {
    const query = postingLogQuery({ kinds: ['sales_summary', 'sales_summary', 'vendor_bill'], statuses: ['failed', 'exploded'] });
    expect(query).toBe('kind=sales_summary&status=failed');
  });

  it('omits a non-uuid location filter instead of 400ing the whole table', () => {
    expect(postingLogQuery({ locationId: 'all' })).toBe('');
    expect(postingLogQuery({ locationId: '' })).toBe('');
    expect(postingLogQuery({ locationId: LOCATION_ID })).toBe(`location_id=${LOCATION_ID}`);
  });

  it('omits dates that are not real calendar dates', () => {
    expect(postingLogQuery({ start: '2026-1-1' })).toBe('');
    expect(postingLogQuery({ start: '2026-02-30' })).toBe('');
    expect(postingLogQuery({ start: '2026-08-01', end: '2026-08-31' })).toBe('start=2026-08-01&end=2026-08-31');
  });

  it('drops a reversed range rather than sending the 400 the server would answer', () => {
    expect(postingLogQuery({ start: '2026-08-31', end: '2026-08-01' })).toBe('');
  });

  it('caps page_size at the server maximum and omits page 1', () => {
    expect(postingLogQuery({ pageSize: 1000 })).toBe(`page_size=${POSTING_LOG_MAX_PAGE_SIZE}`);
    expect(postingLogQuery({ page: 1 })).toBe('');
    expect(postingLogQuery({ page: 3, pageSize: 25 })).toBe('page=3&page_size=25');
  });

  it('SAYS what it dropped, because an unfiltered table that looks filtered is a lie', () => {
    const filters = {
      kinds: ['vendor_bill'],
      statuses: ['exploded'],
      locationId: 'all',
      start: '2026-13-01',
      end: 'yesterday',
      pageSize: 500
    };
    const issues = postingLogFilterIssues(filters);
    expect(issues.join(' ')).toContain('vendor_bill');
    expect(issues.join(' ')).toContain('exploded');
    expect(issues.join(' ')).toContain('every location is shown');
    expect(issues.join(' ')).toContain('2026-13-01');
    expect(issues.join(' ')).toContain('capped at 200');
    expect(postingLogFilterIssues({ start: '2026-08-31', end: '2026-08-01' }).join(' ')).toContain('start (2026-08-31) is after the end');
  });

  it('reports no issues for a clean filter set', () => {
    expect(postingLogFilterIssues({ kinds: ['cogs_journal'], locationId: LOCATION_ID, start: '2026-08-01', end: '2026-08-05' })).toEqual(
      []
    );
    expect(postingLogFilterIssues()).toEqual([]);
  });
});

describe('the day-drill query returns null rather than calling an endpoint that needs both parameters', () => {
  it('builds the query when both are valid', () => {
    expect(dayDrillQuery({ locationId: LOCATION_ID, date: '2026-08-04' })).toBe(`location_id=${LOCATION_ID}&date=2026-08-04`);
  });

  it('returns null — not a partial query — when either is unusable', () => {
    // Both are required server-side, so "call unfiltered" has no meaning here;
    // this is the opposite rule from the log on purpose.
    expect(dayDrillQuery({ locationId: LOCATION_ID, date: '' })).toBeNull();
    expect(dayDrillQuery({ locationId: 'all', date: '2026-08-04' })).toBeNull();
    expect(dayDrillQuery({})).toBeNull();
  });

  it('names which one is missing so the empty state is actionable', () => {
    expect(describeDayDrillGap({})).toContain('location and a day');
    expect(describeDayDrillGap({ date: '2026-08-04' })).toContain('Choose a location');
    expect(describeDayDrillGap({ locationId: LOCATION_ID })).toContain('Choose a day');
    expect(describeDayDrillGap({ locationId: LOCATION_ID, date: '2026-08-04' })).toBeNull();
  });
});

describe('date and id validation shared with the rest of the module', () => {
  it('accepts a uuid and rejects everything else', () => {
    expect(isUuid(LOCATION_ID)).toBe(true);
    expect(isUuid(LOCATION_ID.toUpperCase())).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it('rejects dates Python fromisoformat would reject, including impossible days', () => {
    expect(isCalendarDate('2026-08-04')).toBe(true);
    expect(isCalendarDate('2026-2-1')).toBe(false);
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2024-02-29')).toBe(true); // leap year
    expect(isCalendarDate('2026-08-04T00:00:00')).toBe(false);
  });

  it('formats a Date in the browser calendar day, not in UTC', () => {
    // toISOString().slice(0, 10) at 23:00 local in a positive-offset zone rolls
    // the day, so a "today" default would ask for a day that has not happened.
    const lateEvening = new Date(2026, 7, 4, 23, 30);
    expect(isoDateOf(lateEvening)).toBe('2026-08-04');
    expect(isoDateOf(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
