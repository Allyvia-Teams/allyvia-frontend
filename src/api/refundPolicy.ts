/**
 * The store's return rules — the wire shape of `GET/PUT pos/refund-policy`.
 *
 * Mirrors `stripe_integration/serializers.py::RefundPolicySerializer` field
 * for field. In its own axios-free module (like `refundDispositions.ts`) so the
 * pure form<->wire conversions can import it inside a unit test.
 *
 * Two facts about the PUT that shape every caller:
 *
 * 1. The serializer applies a DEFAULT to every rule field the body omits, and
 *    the view writes all seven. A partial PUT is therefore not a partial
 *    update — it silently resets whatever was left out. Always send the whole
 *    policy, including `category_window_days`, which no screen edits yet.
 *
 * 2. `version` is read-only and the server bumps it only when a rule actually
 *    changed, so past rulings keep pointing at the rules that produced them.
 */

export interface RefundPolicyRules {
  /** Days after purchase a return is accepted. */
  window_days: number;
  /** Per-category overrides of `window_days`, keyed by category NAME. */
  category_window_days: Record<string, number>;
  /** Whether refunding to the original card or cash needs a receipt. */
  receipt_required: boolean;
  /** Basis points withheld from every refund. 1250 is 12.5%. 0..10000. */
  restocking_fee_bps: number;
  /**
   * Refunds at or above this (minor units) park for manager approval.
   * `null` means no refund ever needs approval; `0` means every refund does.
   */
  approval_threshold_minor: number | null;
  /** Whether a sale may be returned at a location other than the one that sold it. */
  allow_cross_location: boolean;
  /**
   * Categories that may never be returned, by category NAME — the same string
   * `pos/categories/` serves as both `id` and `name`, and the string the policy
   * check compares a line's category against.
   */
  final_sale_categories: string[];
}

export interface RefundPolicy extends RefundPolicyRules {
  version: number;
  updated_at: string;
}

/** The PUT response adds which rule fields actually changed (empty on a no-op). */
export interface RefundPolicyWriteResult extends RefundPolicy {
  changed: string[];
}

/** Every rule field, in one place, so a PUT can never leave one out. */
export const REFUND_POLICY_RULE_FIELDS: (keyof RefundPolicyRules)[] = [
  'window_days',
  'category_window_days',
  'receipt_required',
  'restocking_fee_bps',
  'approval_threshold_minor',
  'allow_cross_location',
  'final_sale_categories'
];

/**
 * The documented defaults (ALL-69): 30 days, receipt required, no fee, no
 * approval threshold. Identical to the serializer's own defaults, so creating
 * a policy from these is the same as creating one from an empty body — but
 * spelled out here so the "Create default policy" button says exactly what it
 * is about to write.
 */
export const DEFAULT_REFUND_POLICY_RULES: RefundPolicyRules = {
  window_days: 30,
  category_window_days: {},
  receipt_required: true,
  restocking_fee_bps: 0,
  approval_threshold_minor: null,
  allow_cross_location: true,
  final_sale_categories: []
};
