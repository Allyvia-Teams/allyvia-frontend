// views/inventory/ruleProposals.ts
//
// Reviewing the rules suggested from the owner's notes, as pure functions (owner trust T7). One review table serves
// Inventory > Buying > Vendors (vendor rules) and Settings > Store rules (store rules); RuleProposalsReview.tsx
// renders what this file decides.
//
// The rules this file holds:
//   * a field that would overwrite a DIFFERENT value the vendor already has starts unticked;
//   * only ticked fields are sent, so an unticked field is never written;
//   * a vendor rule whose vendor was not matched by name needs a choice (one of the vendors, or a new one with a
//     name) before Confirm is enabled;
//   * the screen says "Suggested from your notes", never how the suggestion was made.

import type {
  ConfirmStoreRulePayload,
  ConfirmVendorRulePayload,
  RuleProposal,
  RuleProposalKind,
  VendorRuleField,
  VendorRuleValue
} from 'api/ruleProposals.api';

import { REORDER_POLICY_OPTIONS, emptyRulesDraft, rulesErrors, type ReorderPolicy, type VendorRulesDraft } from './vendorRules';

export const REVIEW_TITLE = 'Suggested from your notes';
export const REVIEW_BLURB: Record<RuleProposalKind, string> = {
  vendor_rule:
    'Each line is something said in your notes about a vendor. Check the words, tick what to save, and confirm. Nothing changes until you do.',
  store_rule:
    'Each line is a store rule from your notes. Check the sentence and the category, and confirm to add it to your rules, or dismiss it.'
};
export const MAX_STATEMENT_CHARS = 300;
/** The picker's value for "New vendor". */
export const NEW_VENDOR = '__new__';

export const reviewButtonLabel = (count: number): string | null => (count > 0 ? `Review suggested rules (${count})` : null);

/** The six vendor fields in the order the vendor form shows them. */
export const VENDOR_FIELD_ORDER: VendorRuleField[] = [
  'description',
  'min_order_units',
  'min_order_value',
  'reorder_policy',
  'order_ahead_days',
  'season_cover_days'
];

export const VENDOR_FIELD_LABELS: Record<VendorRuleField, string> = {
  description: 'What they sell',
  min_order_units: 'Minimum order, units',
  min_order_value: 'Minimum order, value',
  reorder_policy: 'Can you reorder?',
  order_ahead_days: 'Order this far ahead, days',
  season_cover_days: 'One order lasts, days'
};

const POLICY_WORDS: Record<string, string> = Object.fromEntries(REORDER_POLICY_OPTIONS.map((o) => [o.value, o.label]));

const isUnset = (key: VendorRuleField, value: VendorRuleValue | undefined): boolean =>
  value === null || value === undefined || value === '' || (key === 'reorder_policy' && value === 'unknown');

const same = (key: VendorRuleField, a: VendorRuleValue | undefined, b: VendorRuleValue | undefined): boolean => {
  if (isUnset(key, a) || isUnset(key, b)) return isUnset(key, a) && isUnset(key, b);
  if (key === 'description' || key === 'reorder_policy') return String(a).trim() === String(b).trim();
  return Number(a) === Number(b);
};

/** A value in store words: "150 days", "$500.00", "One order per season". */
export const valueText = (key: VendorRuleField, value: VendorRuleValue | undefined): string => {
  if (isUnset(key, value)) return 'Not set';
  switch (key) {
    case 'min_order_units':
      return `${Number(value).toLocaleString('en-US')} ${Number(value) === 1 ? 'unit' : 'units'}`;
    case 'min_order_value':
      return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'reorder_policy':
      return POLICY_WORDS[String(value)] ?? String(value);
    case 'order_ahead_days':
    case 'season_cover_days':
      return `${Number(value).toLocaleString('en-US')} ${Number(value) === 1 ? 'day' : 'days'}`;
    default:
      return String(value);
  }
};

export interface FieldDraft {
  key: VendorRuleField;
  label: string;
  /** What is being typed (a select's value for the policy). */
  value: string;
  ticked: boolean;
  /** "Now: 50 units" when the vendor has a different value today, else null. */
  current: string | null;
}

export type VendorChoice = { mode: 'matched' | 'existing'; supplierId: string } | { mode: 'new'; name: string } | { mode: 'none' };

export interface ReviewDraft {
  kind: RuleProposalKind;
  fields: FieldDraft[];
  vendor: VendorChoice;
  statement: string;
  categoryKey: string;
}

type CurrentValues = Partial<Record<VendorRuleField, VendorRuleValue>>;

const fieldDrafts = (proposal: RuleProposal, current: CurrentValues | null, typed?: FieldDraft[]): FieldDraft[] =>
  VENDOR_FIELD_ORDER.filter((key) => key in proposal.fields).map((key) => {
    const proposed = proposal.fields[key];
    const kept = typed?.find((f) => f.key === key);
    const value = kept ? kept.value : proposed === null || proposed === undefined ? '' : String(proposed);
    const now = current ? current[key] : undefined;
    const differs = current !== null && !isUnset(key, now) && !same(key, proposed, now);
    return { key, label: VENDOR_FIELD_LABELS[key], value, ticked: !differs, current: differs ? `Now: ${valueText(key, now)}` : null };
  });

/** The starting draft for one row. */
export const reviewDraft = (proposal: RuleProposal): ReviewDraft => {
  if (proposal.kind === 'store_rule') {
    return {
      kind: 'store_rule',
      fields: [],
      vendor: { mode: 'none' },
      statement: String(proposal.fields.statement ?? ''),
      categoryKey: proposal.fields.category_key ? String(proposal.fields.category_key) : ''
    };
  }
  return {
    kind: 'vendor_rule',
    fields: fieldDrafts(proposal, proposal.current),
    vendor: proposal.supplier_id ? { mode: 'matched', supplierId: proposal.supplier_id } : { mode: 'none' },
    statement: '',
    categoryKey: ''
  };
};

/**
 * The reviewer picked a vendor for an unmatched row (an existing one, or "New vendor"). An existing vendor's values
 * today decide the ticks exactly as a matched one's do; what was typed into a field is kept.
 */
export const chooseVendor = (
  draft: ReviewDraft,
  proposal: RuleProposal,
  value: string,
  vendors: ReadonlyArray<{ id: string; name: string } & CurrentValues>
): ReviewDraft => {
  if (value === NEW_VENDOR) {
    const name = draft.vendor.mode === 'new' ? draft.vendor.name : (proposal.spoken_name ?? '');
    return { ...draft, vendor: { mode: 'new', name }, fields: fieldDrafts(proposal, null, draft.fields) };
  }
  if (!value) return { ...draft, vendor: { mode: 'none' }, fields: fieldDrafts(proposal, null, draft.fields) };
  const vendor = vendors.find((v) => v.id === value);
  const current: CurrentValues = {};
  for (const key of VENDOR_FIELD_ORDER) current[key] = vendor ? (vendor[key] ?? null) : null;
  return { ...draft, vendor: { mode: 'existing', supplierId: value }, fields: fieldDrafts(proposal, current, draft.fields) };
};

/** The vendor picker's options for an unmatched row: the close names first, then the rest, then a new vendor. */
export const vendorOptions = (
  proposal: RuleProposal,
  vendors: ReadonlyArray<{ id: string; name: string }>
): Array<{ value: string; label: string }> => {
  const close = proposal.suggestions.map((s) => ({ value: s.id, label: s.name }));
  const closeIds = new Set(close.map((o) => o.value));
  const rest = [...vendors]
    .filter((v) => !closeIds.has(v.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((v) => ({ value: v.id, label: v.name }));
  return [...close, ...rest, { value: NEW_VENDOR, label: 'New vendor' }];
};

const fieldsAsRulesDraft = (fields: FieldDraft[]): VendorRulesDraft => {
  const draft = emptyRulesDraft();
  for (const field of fields) {
    if (!field.ticked) continue;
    if (field.key === 'reorder_policy') draft.reorder_policy = field.value as ReorderPolicy;
    else draft[field.key] = field.value;
  }
  return draft;
};

/** One sentence per ticked field that cannot be saved as typed (the vendor form's own limits). */
export const fieldErrors = (draft: ReviewDraft): Partial<Record<VendorRuleField, string>> => {
  const errors: Partial<Record<VendorRuleField, string>> = { ...rulesErrors(fieldsAsRulesDraft(draft.fields)) };
  for (const field of draft.fields) {
    if (field.ticked && field.key !== 'description' && field.value.trim() === '') errors[field.key] = 'Enter a value or untick it';
  }
  return errors;
};

/** Why Confirm is not available yet, or null when it is. */
export const confirmBlocker = (draft: ReviewDraft): string | null => {
  if (draft.kind === 'store_rule') {
    const text = draft.statement.trim();
    if (!text) return 'Write the rule in a sentence.';
    if (text.length > MAX_STATEMENT_CHARS) return `Keep the rule to ${MAX_STATEMENT_CHARS} characters or fewer.`;
    return null;
  }
  if (draft.vendor.mode === 'none') return 'Choose the vendor this is about.';
  if (draft.vendor.mode === 'new' && !draft.vendor.name.trim()) return 'Give the new vendor a name.';
  if (!draft.fields.some((f) => f.ticked)) return 'Tick at least one thing to save.';
  if (Object.keys(fieldErrors(draft)).length > 0) return 'Fix the highlighted values.';
  return null;
};

const wireValue = (field: FieldDraft): VendorRuleValue => {
  const text = field.value.trim();
  switch (field.key) {
    case 'description':
      return text;
    case 'reorder_policy':
    case 'min_order_value':
      return text;
    default:
      return Number(text);
  }
};

/** What Confirm sends: the ticked fields only, and the vendor. Throws when Confirm is not available. */
export const confirmPayload = (draft: ReviewDraft): ConfirmVendorRulePayload | ConfirmStoreRulePayload => {
  const blocker = confirmBlocker(draft);
  if (blocker) throw new Error(blocker);
  if (draft.kind === 'store_rule') {
    return { fields: { statement: draft.statement.trim(), category_key: draft.categoryKey || null } };
  }
  const fields: ConfirmVendorRulePayload['fields'] = {};
  for (const field of draft.fields) if (field.ticked) fields[field.key] = wireValue(field);
  if (draft.vendor.mode === 'new') return { fields, create_vendor: true, name: draft.vendor.name.trim() };
  if (draft.vendor.mode === 'none') throw new Error('Choose the vendor this is about.');
  return { fields, supplier_id: draft.vendor.supplierId };
};

/** The vendor line of a row: "About Northwind" or "Said as "Juniper Knits". Which vendor is this?". */
export const vendorLine = (proposal: RuleProposal): string =>
  proposal.supplier_name ? `About ${proposal.supplier_name}` : `Said as "${proposal.spoken_name ?? ''}". Which vendor is this?`;

/** A server refusal in words. */
export const serverMessage = (data: unknown, fallback = 'Could not save that.'): string => {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.detail === 'string') return record.detail;
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
};
