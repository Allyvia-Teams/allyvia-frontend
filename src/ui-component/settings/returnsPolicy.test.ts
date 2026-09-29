import { describe, expect, it } from 'vitest';

import { DEFAULT_REFUND_POLICY_RULES, REFUND_POLICY_RULE_FIELDS, type RefundPolicyRules } from 'api/refundPolicy';
import {
  bpsToPercent,
  defaultReturnsPolicyForm,
  describeApprovalThreshold,
  describeRestockingFee,
  describeWindow,
  dollarsToMinor,
  hasAtMostDecimals,
  minorToDollars,
  percentToBps,
  returnsPolicyDirty,
  returnsPolicyForm,
  returnsPolicyRules,
  validateReturnsPolicy,
  type ReturnsPolicyForm
} from './returnsPolicyHelpers';

const rules = (over: Partial<RefundPolicyRules> = {}): RefundPolicyRules => ({ ...DEFAULT_REFUND_POLICY_RULES, ...over });

const form = (over: Partial<ReturnsPolicyForm> = {}): ReturnsPolicyForm => ({ ...defaultReturnsPolicyForm(), ...over });

describe('basis points <-> percent', () => {
  it('reads 1250 bps as 12.5%', () => {
    expect(bpsToPercent(1250)).toBe(12.5);
  });

  it('writes 12.5% as 1250 bps', () => {
    expect(percentToBps(12.5)).toBe(1250);
  });

  // The rounding slip the brief warns about: 0.29 * 100 is 28.999999999999996
  // in IEEE 754. Saved as 28 bps, a 0.29% fee becomes 0.28%.
  it('does not lose a basis point to float noise', () => {
    expect(percentToBps(0.29)).toBe(29);
    expect(percentToBps(33.33)).toBe(3333);
    expect(percentToBps(0.07)).toBe(7);
  });

  it('round-trips every two-decimal percent exactly', () => {
    for (let bps = 0; bps <= 10_000; bps += 1) {
      expect(percentToBps(bpsToPercent(bps))).toBe(bps);
    }
  });

  it('shows a percent without float noise', () => {
    expect(String(bpsToPercent(3333))).toBe('33.33');
    expect(String(bpsToPercent(1))).toBe('0.01');
  });

  it('covers the whole legal range', () => {
    expect(percentToBps(0)).toBe(0);
    expect(percentToBps(100)).toBe(10_000);
  });
});

describe('minor units <-> dollars', () => {
  it('reads 1999 as 19.99', () => {
    expect(minorToDollars(1999)).toBe(19.99);
  });

  // 19.99 * 100 is 1998.9999999999998. Truncated, a $19.99 threshold would
  // save as $19.98 and refuse a refund of exactly $19.99.
  it('does not lose a cent to float noise', () => {
    expect(dollarsToMinor(19.99)).toBe(1999);
    expect(dollarsToMinor(0.07)).toBe(7);
    expect(dollarsToMinor(1.1)).toBe(110);
  });

  it('round-trips every cent value up to $500 exactly', () => {
    for (let minor = 0; minor <= 50_000; minor += 1) {
      expect(dollarsToMinor(minorToDollars(minor))).toBe(minor);
    }
  });
});

describe('hasAtMostDecimals', () => {
  it('accepts whole numbers and two places', () => {
    expect(hasAtMostDecimals('12', 2)).toBe(true);
    expect(hasAtMostDecimals('12.5', 2)).toBe(true);
    expect(hasAtMostDecimals('12.50', 2)).toBe(true);
  });

  it('refuses a third decimal place', () => {
    expect(hasAtMostDecimals('12.345', 2)).toBe(false);
  });
});

describe('wire -> form', () => {
  it('shows bps as a percent and minor units as dollars', () => {
    const f = returnsPolicyForm(rules({ restocking_fee_bps: 1250, approval_threshold_minor: 5000 }));
    expect(f.restocking_fee_percent).toBe('12.5');
    expect(f.approval_threshold_dollars).toBe('50');
  });

  it('shows a null threshold as blank, not as "null" or "0"', () => {
    expect(returnsPolicyForm(rules({ approval_threshold_minor: null })).approval_threshold_dollars).toBe('');
  });

  it('shows a zero threshold as "0", distinct from blank', () => {
    expect(returnsPolicyForm(rules({ approval_threshold_minor: 0 })).approval_threshold_dollars).toBe('0');
  });

  it('copies the category windows it does not edit', () => {
    const f = returnsPolicyForm(rules({ category_window_days: { Shoes: 14 } }));
    expect(f.category_window_days).toEqual({ Shoes: 14 });
  });

  it('does not share array or object identity with the source', () => {
    const src = rules({ final_sale_categories: ['Clearance'], category_window_days: { Shoes: 14 } });
    const f = returnsPolicyForm(src);
    f.final_sale_categories.push('Swimwear');
    f.category_window_days.Hats = 7;
    expect(src.final_sale_categories).toEqual(['Clearance']);
    expect(src.category_window_days).toEqual({ Shoes: 14 });
  });
});

describe('form -> wire', () => {
  it('converts percent to bps and dollars to minor units', () => {
    const r = returnsPolicyRules(form({ restocking_fee_percent: '12.5', approval_threshold_dollars: '19.99' }));
    expect(r?.restocking_fee_bps).toBe(1250);
    expect(r?.approval_threshold_minor).toBe(1999);
  });

  it('sends a blank threshold as null — no approvals', () => {
    expect(returnsPolicyRules(form({ approval_threshold_dollars: '' }))?.approval_threshold_minor).toBeNull();
  });

  it('sends "0" as 0 — every refund needs approval — never as null', () => {
    expect(returnsPolicyRules(form({ approval_threshold_dollars: '0' }))?.approval_threshold_minor).toBe(0);
  });

  // The PUT semantics that make this the most important test in the file:
  // the serializer defaults every field the body omits.
  it('always sends every one of the seven rule fields', () => {
    const r = returnsPolicyRules(form());
    expect(r).not.toBeNull();
    REFUND_POLICY_RULE_FIELDS.forEach((field) => expect(r).toHaveProperty(field));
    expect(Object.keys(r!).sort()).toEqual([...REFUND_POLICY_RULE_FIELDS].sort());
  });

  it('carries category windows through untouched, so a save cannot erase them', () => {
    const r = returnsPolicyRules(returnsPolicyForm(rules({ category_window_days: { Shoes: 14, Hats: 7 } })));
    expect(r?.category_window_days).toEqual({ Shoes: 14, Hats: 7 });
  });

  it('round-trips a full policy without drift', () => {
    const original = rules({
      window_days: 45,
      receipt_required: false,
      restocking_fee_bps: 333,
      approval_threshold_minor: 12_345,
      allow_cross_location: false,
      final_sale_categories: ['Clearance', 'Swimwear'],
      category_window_days: { Shoes: 14 }
    });
    expect(returnsPolicyRules(returnsPolicyForm(original))).toEqual(original);
  });

  it('refuses to produce rules from an invalid form', () => {
    expect(returnsPolicyRules(form({ window_days: '' }))).toBeNull();
    expect(returnsPolicyRules(form({ restocking_fee_percent: '101' }))).toBeNull();
  });

  it('matches the documented defaults for a brand-new policy', () => {
    expect(returnsPolicyRules(defaultReturnsPolicyForm())).toEqual({
      window_days: 30,
      category_window_days: {},
      receipt_required: true,
      restocking_fee_bps: 0,
      approval_threshold_minor: null,
      allow_cross_location: true,
      final_sale_categories: []
    });
  });
});

describe('validateReturnsPolicy', () => {
  it('passes the defaults', () => {
    expect(validateReturnsPolicy(defaultReturnsPolicyForm())).toEqual({});
  });

  it('requires a whole number of days, 0 allowed', () => {
    expect(validateReturnsPolicy(form({ window_days: '' })).window_days).toMatch(/required/);
    expect(validateReturnsPolicy(form({ window_days: '7.5' })).window_days).toMatch(/whole number/);
    expect(validateReturnsPolicy(form({ window_days: '-1' })).window_days).toMatch(/0 or more/);
    expect(validateReturnsPolicy(form({ window_days: '0' })).window_days).toBeUndefined();
  });

  it('keeps the fee inside 0..100%', () => {
    expect(validateReturnsPolicy(form({ restocking_fee_percent: '100' }))).toEqual({});
    expect(validateReturnsPolicy(form({ restocking_fee_percent: '100.01' })).restocking_fee_percent).toMatch(/between 0 and 100/);
    expect(validateReturnsPolicy(form({ restocking_fee_percent: '-0.5' })).restocking_fee_percent).toMatch(/between 0 and 100/);
  });

  // Rounding must scrub float noise, never round intent: a third decimal
  // would be silently saved as a different rule.
  it('refuses a fee with more than two decimal places instead of rounding it', () => {
    expect(validateReturnsPolicy(form({ restocking_fee_percent: '12.345' })).restocking_fee_percent).toMatch(/two decimal/);
  });

  it('refuses a threshold that is not whole cents', () => {
    expect(validateReturnsPolicy(form({ approval_threshold_dollars: '19.999' })).approval_threshold_dollars).toMatch(/whole cents/);
    expect(validateReturnsPolicy(form({ approval_threshold_dollars: '-5' })).approval_threshold_dollars).toMatch(/0 or more/);
  });

  it('accepts a blank threshold', () => {
    expect(validateReturnsPolicy(form({ approval_threshold_dollars: '' }))).toEqual({});
  });
});

describe('returnsPolicyDirty', () => {
  it('is clean against itself', () => {
    const f = form();
    expect(returnsPolicyDirty(f, f)).toBe(false);
  });

  it('notices each field', () => {
    const base = form();
    expect(returnsPolicyDirty(form({ window_days: '14' }), base)).toBe(true);
    expect(returnsPolicyDirty(form({ receipt_required: false }), base)).toBe(true);
    expect(returnsPolicyDirty(form({ restocking_fee_percent: '5' }), base)).toBe(true);
    expect(returnsPolicyDirty(form({ approval_threshold_dollars: '50' }), base)).toBe(true);
    expect(returnsPolicyDirty(form({ allow_cross_location: false }), base)).toBe(true);
    expect(returnsPolicyDirty(form({ final_sale_categories: ['Clearance'] }), base)).toBe(true);
  });

  it('ignores the order categories were picked in', () => {
    expect(returnsPolicyDirty(form({ final_sale_categories: ['A', 'B'] }), form({ final_sale_categories: ['B', 'A'] }))).toBe(false);
  });

  it('ignores surrounding whitespace in a number field', () => {
    expect(returnsPolicyDirty(form({ window_days: ' 30 ' }), form({ window_days: '30' }))).toBe(false);
  });
});

describe('describing the rules in words', () => {
  it('keeps null and zero thresholds apart — they are opposite rules', () => {
    expect(describeApprovalThreshold(null)).toBe('No refund needs manager approval.');
    expect(describeApprovalThreshold(0)).toBe('Every refund needs manager approval.');
    expect(describeApprovalThreshold(5000)).toBe('Refunds of $50.00 or more need manager approval.');
  });

  it('describes the fee', () => {
    expect(describeRestockingFee(0)).toBe('No restocking fee.');
    expect(describeRestockingFee(1250)).toBe('12.5% is withheld from each refund.');
  });

  it('describes the window, including same-day-only', () => {
    expect(describeWindow(0)).toMatch(/day of purchase only/);
    expect(describeWindow(1)).toBe('Returns are accepted for 1 day after purchase.');
    expect(describeWindow(30)).toBe('Returns are accepted for 30 days after purchase.');
  });
});
