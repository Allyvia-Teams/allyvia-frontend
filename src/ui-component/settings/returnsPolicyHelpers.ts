import { DEFAULT_REFUND_POLICY_RULES, type RefundPolicyRules } from 'api/refundPolicy';

/**
 * The returns-policy form and its conversions to and from the wire (ALL-69).
 *
 * Pure, and tested, because every number here is a rule a clerk will enforce
 * at a counter. The wire speaks basis points and minor units; the admin reads
 * percentages and dollars. A rounding slip in between is not a display bug —
 * it is a $50 refund refused for being $0.01 over a threshold the owner never
 * set, or a 12.5% fee quietly saved as 12.49%.
 *
 * Text inputs are held as strings (the RegisterSettingsForm precedent), so a
 * half-typed value never becomes a NaN that saves as 0.
 */

export interface ReturnsPolicyForm {
  window_days: string;
  receipt_required: boolean;
  /** As the admin reads it: "12.5" for 1250 bps. */
  restocking_fee_percent: string;
  /**
   * Dollars. BLANK means null on the wire — no refund ever needs approval.
   * "0" means 0 — every refund does. The two are different rules, and the
   * conversion must never collapse one into the other.
   */
  approval_threshold_dollars: string;
  allow_cross_location: boolean;
  /** Category NAMES — the string the policy check compares a line's category against. */
  final_sale_categories: string[];
  /** Not edited on this screen; carried through so a PUT cannot wipe it. */
  category_window_days: Record<string, number>;
}

export type ReturnsPolicyField = 'window_days' | 'restocking_fee_percent' | 'approval_threshold_dollars';
export type ReturnsPolicyErrors = Partial<Record<ReturnsPolicyField, string>>;

// --- unit conversions -------------------------------------------------------

/** 1250 -> 12.5. Exact for any integer bps: division by 100 has a finite decimal. */
export const bpsToPercent = (bps: number): number => bps / 100;

/**
 * 12.5 -> 1250. `Math.round` is here ONLY to scrub float noise (0.29 * 100 is
 * 28.999999999999996 in IEEE 754); it must never be asked to round intent,
 * which is why `validateReturnsPolicy` refuses more than two decimal places.
 */
export const percentToBps = (percent: number): number => Math.round(percent * 100);

/** 1999 -> 19.99. */
export const minorToDollars = (minor: number): number => minor / 100;

/** 19.99 -> 1999 (19.99 * 100 is 1998.9999999999998; the round scrubs that). */
export const dollarsToMinor = (dollars: number): number => Math.round(dollars * 100);

/** Whether a decimal string has at most `places` digits after the point. */
export const hasAtMostDecimals = (raw: string, places: number): boolean => {
  const [, fraction = ''] = raw.trim().split('.');
  return fraction.length <= places;
};

// --- wire <-> form ----------------------------------------------------------

/** A number for a text input: never "null", never float noise. */
const numberField = (value: number | null | undefined): string => (value == null ? '' : String(value));

export const returnsPolicyForm = (rules: RefundPolicyRules): ReturnsPolicyForm => ({
  window_days: numberField(rules.window_days),
  receipt_required: rules.receipt_required,
  restocking_fee_percent: numberField(bpsToPercent(rules.restocking_fee_bps)),
  approval_threshold_dollars: rules.approval_threshold_minor == null ? '' : numberField(minorToDollars(rules.approval_threshold_minor)),
  allow_cross_location: rules.allow_cross_location,
  final_sale_categories: [...(rules.final_sale_categories ?? [])],
  category_window_days: { ...(rules.category_window_days ?? {}) }
});

/** The form for a store with no policy yet — the documented defaults. */
export const defaultReturnsPolicyForm = (): ReturnsPolicyForm => returnsPolicyForm(DEFAULT_REFUND_POLICY_RULES);

const LABELS: Record<ReturnsPolicyField, string> = {
  window_days: 'Return window',
  restocking_fee_percent: 'Restocking fee',
  approval_threshold_dollars: 'Approval threshold'
};

export const RESTOCKING_FEE_PERCENT_MAX = 100;

export const validateReturnsPolicy = (form: ReturnsPolicyForm): ReturnsPolicyErrors => {
  const errors: ReturnsPolicyErrors = {};

  const days = form.window_days.trim();
  if (days === '') errors.window_days = `${LABELS.window_days} is required.`;
  else if (!Number.isInteger(Number(days)) || Number(days) < 0)
    errors.window_days = `${LABELS.window_days} must be a whole number of days, 0 or more.`;

  const fee = form.restocking_fee_percent.trim();
  if (fee === '') errors.restocking_fee_percent = `${LABELS.restocking_fee_percent} is required — use 0 for none.`;
  else if (!Number.isFinite(Number(fee)) || Number(fee) < 0 || Number(fee) > RESTOCKING_FEE_PERCENT_MAX)
    errors.restocking_fee_percent = `${LABELS.restocking_fee_percent} must be between 0 and ${RESTOCKING_FEE_PERCENT_MAX}%.`;
  // Basis points resolve to 0.01%; a third decimal would be rounded away,
  // and a rule the owner typed must not be saved as a different rule.
  else if (!hasAtMostDecimals(fee, 2))
    errors.restocking_fee_percent = `${LABELS.restocking_fee_percent} can have at most two decimal places (0.01%).`;

  const threshold = form.approval_threshold_dollars.trim();
  if (threshold !== '') {
    if (!Number.isFinite(Number(threshold)) || Number(threshold) < 0)
      errors.approval_threshold_dollars = `${LABELS.approval_threshold_dollars} must be 0 or more, or blank for none.`;
    else if (!hasAtMostDecimals(threshold, 2))
      errors.approval_threshold_dollars = `${LABELS.approval_threshold_dollars} must be whole cents.`;
  }

  return errors;
};

/**
 * The FULL rule set for a PUT. Every one of the seven fields, every time: the
 * serializer defaults whatever is omitted, so a body missing
 * `category_window_days` would erase every per-category window on save.
 *
 * Returns null while the form is invalid — the card gates Save on validation,
 * and a caller that reached here anyway must not get a half-converted policy.
 */
export const returnsPolicyRules = (form: ReturnsPolicyForm): RefundPolicyRules | null => {
  if (Object.keys(validateReturnsPolicy(form)).length > 0) return null;
  const threshold = form.approval_threshold_dollars.trim();
  return {
    window_days: Number(form.window_days.trim()),
    category_window_days: { ...form.category_window_days },
    receipt_required: form.receipt_required,
    restocking_fee_bps: percentToBps(Number(form.restocking_fee_percent.trim())),
    approval_threshold_minor: threshold === '' ? null : dollarsToMinor(Number(threshold)),
    allow_cross_location: form.allow_cross_location,
    final_sale_categories: [...form.final_sale_categories]
  };
};

const sortedCategories = (form: ReturnsPolicyForm) => [...form.final_sale_categories].sort();

export const returnsPolicyDirty = (form: ReturnsPolicyForm, original: ReturnsPolicyForm): boolean =>
  form.window_days.trim() !== original.window_days.trim() ||
  form.receipt_required !== original.receipt_required ||
  form.restocking_fee_percent.trim() !== original.restocking_fee_percent.trim() ||
  form.approval_threshold_dollars.trim() !== original.approval_threshold_dollars.trim() ||
  form.allow_cross_location !== original.allow_cross_location ||
  JSON.stringify(sortedCategories(form)) !== JSON.stringify(sortedCategories(original));

// --- copy -------------------------------------------------------------------

const dollars = (minor: number) => `$${(minor / 100).toFixed(2)}`;

/**
 * What the threshold means, in words — because null and 0 look alike in a
 * blank-or-zero text field and are opposite rules.
 */
export const describeApprovalThreshold = (minor: number | null): string => {
  if (minor == null) return 'No refund needs manager approval.';
  if (minor === 0) return 'Every refund needs manager approval.';
  return `Refunds of ${dollars(minor)} or more need manager approval.`;
};

export const describeRestockingFee = (bps: number): string =>
  bps <= 0 ? 'No restocking fee.' : `${bpsToPercent(bps)}% is withheld from each refund.`;

export const describeWindow = (days: number): string =>
  days === 0
    ? 'Returns are accepted on the day of purchase only.'
    : `Returns are accepted for ${days} day${days === 1 ? '' : 's'} after purchase.`;
