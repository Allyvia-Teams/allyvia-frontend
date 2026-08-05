import { describe, expect, it } from 'vitest';

import type { COGSData, GrossProfitData, ProfitAndLossData } from 'types/finance';

import {
  formatDeltaLabel,
  formatPercent,
  formatRatio,
  marginOf,
  normalizeCOGSDetail,
  normalizeGrossProfitDetail,
  normalizeProfitAndLoss,
  ratioOf,
  toNum
} from './financeFormat';

describe('toNum', () => {
  it('passes finite numbers through', () => {
    expect(toNum(12.5)).toBe(12.5);
    expect(toNum(-86)).toBe(-86);
    expect(toNum(0)).toBe(0);
  });

  it('coerces decimal strings — including the truthy "0.00" trap', () => {
    expect(toNum('0.00')).toBe(0);
    expect(toNum('-4500.00')).toBe(-4500);
    expect(toNum('1214.00')).toBe(1214);
  });

  it('maps null, undefined, empty and garbage to 0', () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum('')).toBe(0);
    expect(toNum('abc')).toBe(0);
  });

  it('never returns a non-finite number', () => {
    expect(toNum(NaN)).toBe(0);
    expect(toNum(Infinity)).toBe(0);
    expect(toNum(-Infinity)).toBe(0);
    expect(toNum('Infinity')).toBe(0);
  });
});

describe('formatPercent', () => {
  it('renders an em dash for null, undefined and non-finite values', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
    expect(formatPercent(NaN)).toBe('—');
    expect(formatPercent(Infinity)).toBe('—');
    expect(formatPercent(-Infinity)).toBe('—');
  });

  it('formats finite values to one decimal place by default', () => {
    expect(formatPercent(85.1729)).toBe('85.2%');
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(-40.24)).toBe('-40.2%');
  });

  it('honours the digits argument', () => {
    expect(formatPercent(85.1729, 2)).toBe('85.17%');
    expect(formatPercent(12, 0)).toBe('12%');
  });
});

describe('marginOf', () => {
  it('is null when the denominator is zero or negative — even as a string', () => {
    expect(marginOf('-4500.00', '0.00')).toBeNull();
    expect(marginOf(100, 0)).toBeNull();
    expect(marginOf(100, -10)).toBeNull();
    expect(marginOf(null, null)).toBeNull();
  });

  it('renders the design doc scenario as an em dash, never -Infinity%', () => {
    // { total_income: "0.00", net_income: "-4500.00" } — RC4's live bug
    expect(formatPercent(marginOf('-4500.00', '0.00'))).toBe('—');
  });

  it('computes percentages from numbers or decimal strings', () => {
    expect(marginOf(1034, 1214)).toBeCloseTo(85.1729, 3);
    expect(marginOf('154.00', '214.00')).toBeCloseTo(71.9626, 3);
    expect(marginOf(-86, 214)).toBeCloseTo(-40.1869, 3);
  });
});

describe('ratioOf', () => {
  it('is null when the denominator is zero or negative — even as a string', () => {
    expect(ratioOf(120, 0)).toBeNull();
    expect(ratioOf(120, '0.00')).toBeNull();
    expect(ratioOf(120, -4)).toBeNull();
    expect(ratioOf(null, undefined)).toBeNull();
  });

  it('computes plain quotients from numbers or decimal strings', () => {
    expect(ratioOf(1520, 40)).toBe(38);
    expect(ratioOf('1520.00', '40')).toBe(38);
    expect(ratioOf(0, 40)).toBe(0);
    expect(ratioOf(-86, 40)).toBeCloseTo(-2.15, 5);
  });

  it('renders the empty-inventory average as an em dash via formatRatio', () => {
    // The old tile computed (Number(value) || 0) / (Number(qoh) || 1) — a fake
    // per-unit price equal to the whole inventory value when QOH is 0.
    expect(formatRatio(ratioOf(1520, 0))).toBe('—');
    expect(formatRatio(ratioOf(1520, 40))).toBe('38.00');
  });
});

describe('formatRatio', () => {
  it('renders an em dash for null and non-finite values', () => {
    expect(formatRatio(null)).toBe('—');
    expect(formatRatio(undefined)).toBe('—');
    expect(formatRatio(NaN)).toBe('—');
  });

  it('formats to two decimal places by default', () => {
    expect(formatRatio(1.6667)).toBe('1.67');
    expect(formatRatio(0)).toBe('0.00');
  });
});

describe('formatDeltaLabel', () => {
  it('renders an em dash for a new period or a missing delta', () => {
    expect(formatDeltaLabel(null)).toBe('—');
    expect(formatDeltaLabel(undefined)).toBe('—');
    expect(formatDeltaLabel(5.2, true)).toBe('—');
  });

  it('renders the neutral no-activity label when the value is zero and the delta is -100', () => {
    expect(formatDeltaLabel(-100, false, 0)).toBe('No activity this period');
  });

  it('keeps a real -100% when the current value is non-zero', () => {
    expect(formatDeltaLabel(-100, false, 500)).toBe('-100.0%');
  });

  it('signs positive deltas and formats to one decimal place', () => {
    expect(formatDeltaLabel(12.34)).toBe('+12.3%');
    expect(formatDeltaLabel(-3.24)).toBe('-3.2%');
    expect(formatDeltaLabel(0)).toBe('0.0%');
  });
});

const pnlPayload = {
  net_income: '-4500.00',
  net_operating_income: '-4500.00',
  gross_profit: '0.00',
  total_income: '0.00',
  total_expenses: '4500.00',
  operating_expenses: '4500.00',
  cost_of_goods_sold: '0.00',
  period: '2026-07-01 to 2026-07-31'
} as unknown as ProfitAndLossData;

describe('normalizeProfitAndLoss', () => {
  it('passes null through', () => {
    expect(normalizeProfitAndLoss(null)).toBeNull();
  });

  it('coerces every money field to a number', () => {
    const result = normalizeProfitAndLoss(pnlPayload)!;
    expect(result.net_income).toBe(-4500);
    expect(result.net_operating_income).toBe(-4500);
    expect(result.gross_profit).toBe(0);
    expect(result.total_income).toBe(0);
    expect(result.total_expenses).toBe(4500);
    expect(result.operating_expenses).toBe(4500);
    expect(result.cost_of_goods_sold).toBe(0);
    Object.entries(result).forEach(([key, value]) => {
      if (key !== 'period') expect(typeof value).toBe('number');
    });
  });

  it('defaults operating_expenses to 0 when an older backend omits it', () => {
    const withoutOpex = { ...(pnlPayload as any) };
    delete withoutOpex.operating_expenses;
    const result = normalizeProfitAndLoss(withoutOpex)!;
    expect(result.operating_expenses).toBe(0);
  });
});

describe('normalizeGrossProfitDetail', () => {
  const payload = {
    period: '2026-07-01 to 2026-07-31',
    revenue: '214.00',
    cost_of_goods_sold: '60.00',
    gross_profit: '154.00',
    gross_profit_margin: null,
    breakdown: {
      revenue_sources: [{ source: 'POS sales', amount: '214.00' }],
      cost_breakdown: [{ category: 'POS cost of goods', amount: '60.00' }]
    }
  } as unknown as GrossProfitData;

  it('passes null through', () => {
    expect(normalizeGrossProfitDetail(null)).toBeNull();
  });

  it('coerces top-level money to numbers and preserves a null margin', () => {
    const result = normalizeGrossProfitDetail(payload)!;
    expect(result.revenue).toBe(214);
    expect(result.cost_of_goods_sold).toBe(60);
    expect(result.gross_profit).toBe(154);
    expect(result.gross_profit_margin).toBeNull();
  });

  it('preserves a numeric margin and the breakdown rows untouched', () => {
    const withMargin = { ...payload, gross_profit_margin: 71.96 } as GrossProfitData;
    const result = normalizeGrossProfitDetail(withMargin)!;
    expect(result.gross_profit_margin).toBe(71.96);
    expect(result.breakdown).toEqual(payload.breakdown);
  });
});

describe('normalizeCOGSDetail', () => {
  it('passes null through and coerces total_cogs', () => {
    expect(normalizeCOGSDetail(null)).toBeNull();
    const payload = {
      period: '2026-07-01 to 2026-07-31',
      total_cogs: '180.00',
      breakdown: [{ category: 'Bills', amount: '120.00' }]
    } as unknown as COGSData;
    const result = normalizeCOGSDetail(payload)!;
    expect(result.total_cogs).toBe(180);
    expect(result.breakdown).toEqual(payload.breakdown);
  });
});
