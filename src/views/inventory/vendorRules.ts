// views/inventory/vendorRules.ts
//
// The rules an owner has agreed with a vendor, as pure functions (owner trust T5). The backend field
// names stay `Supplier.*`; only what the owner reads says "vendor".
//
// Numbers are numbers because the planner does arithmetic on them (design 4.2). An empty field is
// "not set" and travels as null; a typed 0 stays 0. The two are different facts.

export type ReorderPolicy = 'unknown' | 'anytime' | 'seasonal';

/** The six fields T4 added to a supplier. `min_order_value` is a decimal STRING on the wire. */
export interface VendorRulesFields {
  description: string;
  min_order_units: number | null;
  min_order_value: string | number | null;
  reorder_policy: ReorderPolicy;
  order_ahead_days: number | null;
  season_cover_days: number | null;
}

/** Everything is text while it is being typed. */
export interface VendorRulesDraft {
  description: string;
  min_order_units: string;
  min_order_value: string;
  reorder_policy: ReorderPolicy;
  order_ahead_days: string;
  season_cover_days: string;
}

export type VendorRulesPayload = VendorRulesFields & { min_order_value: string | null };

export const REORDER_POLICY_OPTIONS: ReadonlyArray<{ value: ReorderPolicy; label: string }> = [
  { value: 'unknown', label: 'Not sure' },
  { value: 'anytime', label: 'Any time' },
  { value: 'seasonal', label: 'One order per season' }
];

// The backend's ceilings (purchasing_serializers.py): two years of days, a 32-bit unit count, and a
// 12-digit decimal with two places.
const MAX_DAYS = 730;
const MAX_UNITS = 2_147_483_647;
const VALUE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export const emptyRulesDraft = (): VendorRulesDraft => ({
  description: '',
  min_order_units: '',
  min_order_value: '',
  reorder_policy: 'unknown',
  order_ahead_days: '',
  season_cover_days: ''
});

const asText = (value: string | number | null | undefined): string => (value === null || value === undefined ? '' : String(value));

export const rulesDraftFrom = (supplier: Partial<VendorRulesFields>): VendorRulesDraft => ({
  description: supplier.description ?? '',
  min_order_units: asText(supplier.min_order_units),
  min_order_value: asText(supplier.min_order_value),
  reorder_policy: supplier.reorder_policy ?? 'unknown',
  order_ahead_days: asText(supplier.order_ahead_days),
  season_cover_days: asText(supplier.season_cover_days)
});

const wholeNumberError = (raw: string, max: number, label: string): string | null => {
  const text = raw.trim();
  if (text === '') return null;
  if (!/^\d+$/.test(text)) return `${label}: whole number, zero or more`;
  if (Number(text) > max) return `${label}: at most ${max.toLocaleString('en-US')}`;
  return null;
};

export type VendorRulesErrors = Partial<Record<'min_order_units' | 'min_order_value' | 'order_ahead_days' | 'season_cover_days', string>>;

export const rulesErrors = (draft: VendorRulesDraft): VendorRulesErrors => {
  const errors: VendorRulesErrors = {};
  const units = wholeNumberError(draft.min_order_units, MAX_UNITS, 'Units');
  if (units) errors.min_order_units = units;
  const ahead = wholeNumberError(draft.order_ahead_days, MAX_DAYS, 'Days');
  if (ahead) errors.order_ahead_days = ahead;
  const cover = wholeNumberError(draft.season_cover_days, MAX_DAYS, 'Days');
  if (cover) errors.season_cover_days = cover;
  const value = draft.min_order_value.trim();
  if (value !== '' && !VALUE_PATTERN.test(value)) errors.min_order_value = 'Amount, zero or more, up to two decimals';
  return errors;
};

const nullable = (raw: string): number | null => (raw.trim() === '' ? null : Number(raw.trim()));

/** The six fields for a create or a PATCH. Throws on an invalid draft: callers gate on `rulesErrors`. */
export const toPayload = (draft: VendorRulesDraft): VendorRulesPayload => {
  if (Object.keys(rulesErrors(draft)).length > 0) throw new Error('Vendor rules are not valid');
  const value = draft.min_order_value.trim();
  return {
    description: draft.description.trim(),
    min_order_units: nullable(draft.min_order_units),
    min_order_value: value === '' ? null : value,
    reorder_policy: draft.reorder_policy,
    order_ahead_days: nullable(draft.order_ahead_days),
    season_cover_days: nullable(draft.season_cover_days)
  };
};

const positive = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const plural = (n: number, one: string, many: string): string => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

const dollars = (n: number): string => {
  const text = n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  // 2,500.5 reads as money only with both places.
  return `$${/\.\d$/.test(text) ? `${text}0` : text}`;
};

/** One short line for the vendors table, or '' when nothing is set. Zero is not a rule. */
export const rulesSummary = (supplier: Partial<VendorRulesFields>): string => {
  const parts: string[] = [];
  const units = positive(supplier.min_order_units);
  const value = positive(supplier.min_order_value);
  if (units !== null && value !== null) parts.push(`Min ${plural(units, 'unit', 'units')} and ${dollars(value)}.`);
  else if (units !== null) parts.push(`Min ${plural(units, 'unit', 'units')}.`);
  else if (value !== null) parts.push(`Min ${dollars(value)}.`);
  if (supplier.reorder_policy === 'seasonal') parts.push('One order per season.');
  if (supplier.reorder_policy === 'anytime') parts.push('Reorder any time.');
  const ahead = positive(supplier.order_ahead_days);
  if (ahead !== null) parts.push(`Order ${plural(ahead, 'day', 'days')} ahead.`);
  const cover = positive(supplier.season_cover_days);
  if (cover !== null) parts.push(`One order lasts ${plural(cover, 'day', 'days')}.`);
  return parts.join(' ');
};
