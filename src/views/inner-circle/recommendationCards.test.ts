import { describe, expect, it } from 'vitest';

import {
  buildPostureLine,
  caseRows,
  cardKindLabel,
  costRow,
  EMPTY_COPY,
  formatMoney,
  healthRow,
  innerCircleHandoffLabel,
  reasonCopy,
  sortCards,
  type CardLike,
  type PostureHealth
} from './recommendationCards';

/**
 * `health(over)` mirrors the wire shape exactly, and `over` is spread at the
 * TOP LEVEL — so passing `inputs: {...}` REPLACES the whole `inputs` object
 * rather than merging into it. That is deliberate: it is how the "a missing
 * runway is omitted" test below produces an `inputs` with no `runway_days`
 * key at all, rather than one explicitly set to undefined.
 */
const health = (over: Partial<PostureHealth> = {}): PostureHealth => ({
  score: 74,
  tier: 'green',
  mode: 'growth',
  provisional: false,
  components: {},
  inputs: { trajectory_yoy: 0.09, runway_days: 210, repeat_share: 0.31 },
  projection: { label: 'grow', net_12: '1.00', cash_end: '1.00', cash_estimated: false },
  reasons: [],
  as_of: '2026-09-18',
  ...over
});

describe('buildPostureLine', () => {
  it('growth', () => {
    const line = buildPostureLine(health());
    expect(line.chip).toBe('Growth mode');
    expect(line.tone).toBe('success');
    expect(line.text).toBe(
      'Revenue is up 9% on last year, you have about 210 days of cash, and 31% of active customers came back this year. Suggestions below lean into that.'
    );
  });

  it('save', () => {
    const line = buildPostureLine(health({ tier: 'red', mode: 'save', inputs: { trajectory_yoy: -0.06, runway_days: 38 } }));
    expect(line.chip).toBe('Save mode');
    expect(line.tone).toBe('error');
    expect(line.text).toContain('down 6%');
    expect(line.text).toContain('38 days');
    expect(line.text).toContain('without spending cash up front');
  });

  it('save — the exact sentence, not merely a superstring match', () => {
    // The `toContain` checks above are the brief's; this pins the whole
    // sentence so the parts-join arithmetic (comma vs "and", no trailing
    // Oxford comma at two items) cannot silently drift.
    const line = buildPostureLine(health({ tier: 'red', mode: 'save', inputs: { trajectory_yoy: -0.06, runway_days: 38 } }));
    expect(line.text).toBe(
      'Revenue is down 6% on last year and you have about 38 days of cash. Suggestions below protect cash and bring members back without spending cash up front.'
    );
  });

  it('zero trajectory reads as flat, not "up 0%" or "down 0%"', () => {
    const line = buildPostureLine(health({ inputs: { trajectory_yoy: 0, runway_days: 90 } }));
    expect(line.text).toContain('Revenue is flat on last year');
  });

  it('provisional says how many signals and what is missing', () => {
    const line = buildPostureLine(
      health({
        provisional: true,
        components: { trajectory: 60, customer_engine: 50 },
        reasons: ['expenses_unobserved', 'inventory_unavailable']
      })
    );
    expect(line.caveat).toBe('based on 2 of 5 signals');
    expect(line.caveatTooltip).toBe('Missing: expenses not observed, inventory ledger unavailable');
  });

  it('covers all seven backend reasons with named copy', () => {
    const line = buildPostureLine(
      health({
        provisional: true,
        components: { trajectory: 60 },
        reasons: [
          'expenses_unobserved',
          'inventory_unavailable',
          'customer_engine_unavailable',
          'trajectory_provisional_under_13_months',
          'no_prior_revenue',
          'green_capped_no_profitability',
          'profitability_unavailable'
        ]
      })
    );
    expect(line.caveatTooltip).toBe(
      'Missing: expenses not observed, inventory ledger unavailable, customer history too thin, under 13 months of history, no prior-year revenue, profitability not observed, so not green, profitability not observed'
    );
  });

  it('an unrecognised reason is humanised, never dropped', () => {
    expect(reasonCopy('some_new_reason')).toBe('some new reason');
    const line = buildPostureLine(health({ provisional: true, components: { trajectory: 60 }, reasons: ['some_new_reason'] }));
    expect(line.caveatTooltip).toBe('Missing: some new reason');
  });

  it('a missing runway is omitted, not printed as 0 days', () => {
    const line = buildPostureLine(health({ inputs: { trajectory_yoy: 0.02 } }));
    expect(line.text).not.toMatch(/\d+ days/);
  });

  it('a missing trajectory or repeat share is omitted the same way', () => {
    const line = buildPostureLine(health({ inputs: { runway_days: 45 } }));
    expect(line.text).not.toMatch(/on last year/);
    expect(line.text).not.toMatch(/came back this year/);
    expect(line.text).toContain('45 days of cash');
  });

  it('no score at all', () => {
    expect(buildPostureLine(health({ score: null, tier: null, mode: null })).chip).toBe('Not enough data yet');
    expect(buildPostureLine(health({ score: null, tier: null, mode: null })).tone).toBe('neutral');
  });

  it('a yellow tier in growth mode keeps the growth chip but warns', () => {
    const line = buildPostureLine(health({ tier: 'yellow', mode: 'growth' }));
    expect(line.chip).toBe('Growth mode');
    expect(line.tone).toBe('warning');
  });

  it('not provisional carries no caveat', () => {
    const line = buildPostureLine(health({ provisional: false }));
    expect(line.caveat).toBeUndefined();
    expect(line.caveatTooltip).toBeUndefined();
  });
});

describe('cards', () => {
  const card = (over: Partial<CardLike> = {}): CardLike => ({
    id: 'x',
    kind: 'event',
    cases: {
      downside: { amount: '1100.00', assumption: 'if 3 of 14 come' },
      base: { amount: '2900.00', assumption: 'if 6 of 14 come' },
      upside: { amount: '5200.00', assumption: 'if 9 come and bring one guest each' }
    },
    cost: { amount: null, label: 'drinks and staffing', owner_input: true },
    expected_health_delta: 1,
    confidence: 'high',
    expected_value_dollars: '2900.00',
    ...over
  });

  it('sorts by base desc then confidence', () => {
    expect(
      sortCards([card({ id: 'a', expected_value_dollars: '100.00' }), card({ id: 'b' }), card({ id: 'c', confidence: 'low' })]).map(
        (c) => c.id
      )
    ).toEqual(['b', 'c', 'a']);
  });

  it('ties on both value and confidence break by id ascending, stably', () => {
    const input = [card({ id: 'z' }), card({ id: 'a' }), card({ id: 'm' })];
    expect(sortCards(input).map((c) => c.id)).toEqual(['a', 'm', 'z']);
  });

  it('does not mutate the array it is given', () => {
    const input = [card({ id: 'b' }), card({ id: 'a', expected_value_dollars: '1.00' })];
    const before = input.map((c) => c.id);
    sortCards(input);
    expect(input.map((c) => c.id)).toEqual(before);
  });

  it('falls back to the base case amount when expected_value_dollars is absent', () => {
    expect(
      sortCards([
        card({
          id: 'lo',
          expected_value_dollars: null,
          cases: {
            downside: { amount: '0', assumption: '' },
            base: { amount: '10.00', assumption: '' },
            upside: { amount: '0', assumption: '' }
          }
        }),
        card({
          id: 'hi',
          expected_value_dollars: null,
          cases: {
            downside: { amount: '0', assumption: '' },
            base: { amount: '999.00', assumption: '' },
            upside: { amount: '0', assumption: '' }
          }
        })
      ]).map((c) => c.id)
    ).toEqual(['hi', 'lo']);
  });

  it('case rows format money and keep the sentence verbatim', () => {
    expect(caseRows(card())).toEqual([
      { label: 'Downside', amount: '+$1,100', assumption: 'if 3 of 14 come' },
      { label: 'Base', amount: '+$2,900', assumption: 'if 6 of 14 come' },
      { label: 'Upside', amount: '+$5,200', assumption: 'if 9 come and bring one guest each' }
    ]);
  });

  it('cost row: owner input, an amount, or nothing', () => {
    expect(costRow(card())).toEqual({ label: 'Cost', amount: 'your input', assumption: 'drinks and staffing' });
    expect(costRow(card({ cost: { amount: '60.00', label: '10% off, paid only when a code is redeemed', owner_input: false } }))).toEqual({
      label: 'Cost',
      amount: '~$60',
      assumption: '10% off, paid only when a code is redeemed'
    });
    expect(costRow(card({ cost: null }))).toBeNull();
  });

  it('health row hidden when null', () => {
    expect(healthRow(card())).toEqual({ label: 'Health', amount: '+1 point', assumption: 'at the base case' });
    expect(healthRow(card({ expected_health_delta: null }))).toBeNull();
    expect(healthRow(card({ expected_health_delta: -3 }))?.amount).toBe('−3 points');
  });

  it('kind labels are the Outreach vocabulary', () => {
    expect(cardKindLabel('event')).toBe('Invite to an event or perk');
    expect(cardKindLabel('perk-settings')).toBe('Adjust a network perk');
  });

  it('empty copy is the agreed sentence', () => {
    expect(EMPTY_COPY).toBe("Nothing worth suggesting this week. Your members look steady; we'll check again tonight.");
  });
});

describe('formatMoney — the guarded currency formatter', () => {
  it('formats a normal currency with thousands separators, no decimals', () => {
    expect(formatMoney(1100, 'USD')).toBe('$1,100');
  });

  it('never throws on an unrecognised currency code, and falls back to plain formatting', () => {
    // 'XXXX' is not a valid ISO 4217 code — Intl.NumberFormat throws a
    // RangeError constructing the formatter. The guard must swallow it,
    // exactly as inventoryKpis.ts's excludedStockAtRetail does, rather than
    // letting a bad currency blank the whole card in render.
    expect(() => formatMoney(1100, 'XXXX')).not.toThrow();
    expect(formatMoney(1100, 'XXXX')).toBe('$1100');
  });
});

describe('innerCircleHandoffLabel — the Dashboard pointer', () => {
  it('is singular at exactly one', () => {
    expect(innerCircleHandoffLabel(1)).toBe('1 Inner Circle suggestion');
  });

  it('is plural at every other count the row can render', () => {
    expect(innerCircleHandoffLabel(2)).toBe('2 Inner Circle suggestions');
    expect(innerCircleHandoffLabel(14)).toBe('14 Inner Circle suggestions');
  });

  it('pluralises zero, which the caller never renders — the rule, not the caller, is what is pinned here', () => {
    // The Dashboard hides the row below 1, so this case is unreachable today.
    // It is asserted anyway: "0 Inner Circle suggestion" is what a naive
    // `n === 1 ? … : …` inversion would produce, and a test that only ever
    // sees 1 and 2 cannot tell the two implementations apart.
    expect(innerCircleHandoffLabel(0)).toBe('0 Inner Circle suggestions');
  });
});
