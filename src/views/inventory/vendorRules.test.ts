import { describe, expect, it } from 'vitest';

import {
  emptyRulesDraft,
  REORDER_POLICY_OPTIONS,
  rulesDraftFrom,
  rulesErrors,
  rulesSummary,
  toPayload,
  type VendorRulesFields
} from './vendorRules';

const none: VendorRulesFields = {
  description: '',
  min_order_units: null,
  min_order_value: null,
  reorder_policy: 'unknown',
  order_ahead_days: null,
  season_cover_days: null
};

describe('rulesSummary', () => {
  it('is empty when nothing is set', () => {
    expect(rulesSummary(none)).toBe('');
  });

  it('reads each field alone', () => {
    expect(rulesSummary({ ...none, min_order_units: 100 })).toBe('Min 100 units.');
    expect(rulesSummary({ ...none, min_order_units: 1 })).toBe('Min 1 unit.');
    expect(rulesSummary({ ...none, min_order_value: '2500.00' })).toBe('Min $2,500.');
    expect(rulesSummary({ ...none, min_order_value: '2500.50' })).toBe('Min $2,500.50.');
    expect(rulesSummary({ ...none, reorder_policy: 'seasonal' })).toBe('One order per season.');
    expect(rulesSummary({ ...none, reorder_policy: 'anytime' })).toBe('Reorder any time.');
    expect(rulesSummary({ ...none, order_ahead_days: 150 })).toBe('Order 150 days ahead.');
    expect(rulesSummary({ ...none, order_ahead_days: 1 })).toBe('Order 1 day ahead.');
    expect(rulesSummary({ ...none, season_cover_days: 90 })).toBe('One order lasts 90 days.');
  });

  it('says nothing for a policy the owner is not sure of', () => {
    expect(rulesSummary({ ...none, reorder_policy: 'unknown', order_ahead_days: 30 })).toBe('Order 30 days ahead.');
  });

  it('puts the two minimums in one sentence', () => {
    expect(rulesSummary({ ...none, min_order_units: 100, min_order_value: '2500.00' })).toBe('Min 100 units and $2,500.');
  });

  it('reads all of them together, in the table order', () => {
    expect(
      rulesSummary({
        description: 'Linen and denim',
        min_order_units: 100,
        min_order_value: null,
        reorder_policy: 'seasonal',
        order_ahead_days: 150,
        season_cover_days: 120
      })
    ).toBe('Min 100 units. One order per season. Order 150 days ahead. One order lasts 120 days.');
  });

  it('does not print a zero as a rule', () => {
    expect(rulesSummary({ ...none, min_order_units: 0, min_order_value: '0.00', order_ahead_days: 0, season_cover_days: 0 })).toBe('');
  });

  it('keeps the description out of the one line', () => {
    expect(rulesSummary({ ...none, description: 'Linen and denim' })).toBe('');
  });

  it('tolerates a payload from before the rules existed', () => {
    expect(rulesSummary({} as VendorRulesFields)).toBe('');
  });
});

describe('toPayload', () => {
  it('sends null, never 0, for an empty number field', () => {
    expect(toPayload(emptyRulesDraft())).toEqual({
      description: '',
      min_order_units: null,
      min_order_value: null,
      reorder_policy: 'unknown',
      order_ahead_days: null,
      season_cover_days: null
    });
    expect(toPayload({ ...emptyRulesDraft(), min_order_units: '   ', order_ahead_days: '' }).min_order_units).toBeNull();
  });

  it('keeps a typed zero as 0, apart from empty', () => {
    const payload = toPayload({
      ...emptyRulesDraft(),
      min_order_units: '0',
      min_order_value: '0',
      order_ahead_days: '0',
      season_cover_days: '0'
    });
    expect(payload.min_order_units).toBe(0);
    expect(payload.min_order_value).toBe('0');
    expect(payload.order_ahead_days).toBe(0);
    expect(payload.season_cover_days).toBe(0);
  });

  it('carries every field when all are set', () => {
    expect(
      toPayload({
        description: '  Linen and denim ',
        min_order_units: '100',
        min_order_value: '2500.50',
        reorder_policy: 'seasonal',
        order_ahead_days: '150',
        season_cover_days: '120'
      })
    ).toEqual({
      description: 'Linen and denim',
      min_order_units: 100,
      min_order_value: '2500.50',
      reorder_policy: 'seasonal',
      order_ahead_days: 150,
      season_cover_days: 120
    });
  });

  it('refuses to build a payload from an invalid draft rather than send a guess', () => {
    expect(() => toPayload({ ...emptyRulesDraft(), min_order_units: 'abc' })).toThrow();
  });
});

describe('rulesDraftFrom', () => {
  it('shows a null as an empty field and a value as text', () => {
    expect(rulesDraftFrom(none)).toEqual(emptyRulesDraft());
    expect(rulesDraftFrom({ ...none, min_order_units: 100, min_order_value: '2500.00', order_ahead_days: 0 })).toMatchObject({
      min_order_units: '100',
      min_order_value: '2500.00',
      order_ahead_days: '0'
    });
  });

  it('round-trips through the payload', () => {
    const supplier: VendorRulesFields = {
      description: 'Linen',
      min_order_units: 40,
      min_order_value: '900.00',
      reorder_policy: 'anytime',
      order_ahead_days: 21,
      season_cover_days: null
    };
    expect(toPayload(rulesDraftFrom(supplier))).toEqual({ ...supplier, min_order_value: '900.00' });
  });
});

describe('rulesErrors', () => {
  it('accepts empty and valid values', () => {
    expect(rulesErrors(emptyRulesDraft())).toEqual({});
    expect(rulesErrors({ ...emptyRulesDraft(), min_order_units: '100', min_order_value: '2500.50', order_ahead_days: '730' })).toEqual({});
  });

  it('names each bad field', () => {
    const errors = rulesErrors({
      ...emptyRulesDraft(),
      min_order_units: '1.5',
      min_order_value: '-1',
      order_ahead_days: '731',
      season_cover_days: 'x'
    });
    expect(Object.keys(errors).sort()).toEqual(['min_order_units', 'min_order_value', 'order_ahead_days', 'season_cover_days']);
  });

  it('refuses more than two decimal places on the value', () => {
    expect(rulesErrors({ ...emptyRulesDraft(), min_order_value: '10.123' }).min_order_value).toBeTruthy();
  });
});

describe('policy options', () => {
  it('uses the three words from the form, in order, over the API values', () => {
    expect(REORDER_POLICY_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ['unknown', 'Not sure'],
      ['anytime', 'Any time'],
      ['seasonal', 'One order per season']
    ]);
  });
});
