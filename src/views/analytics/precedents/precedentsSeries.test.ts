import { describe, expect, it } from 'vitest';

import type { PrecedentsDay, PrecedentsMonth } from 'api/precedents.api';

import {
  daySeries,
  daysInMonth,
  defaultMonth,
  gapSentence,
  isolatedPoints,
  latestOccurrence,
  moneyFormatter,
  monthLabel,
  observedSummary,
  shiftMonth,
  storeOptions,
  unobservedGaps
} from './precedentsSeries';

function day(date: string, revenue: string | null, observed = revenue !== null): PrecedentsDay {
  return {
    date,
    revenue,
    tickets: revenue === null ? null : 1,
    units: revenue === null ? null : 1,
    refunds: revenue === null ? null : '0.00',
    cogs: null,
    gross_profit: null,
    observed,
    excluded_from_learning: false,
    is_outlier: false,
    built: true,
    weather: null,
    calendar: [],
    baseline: null
  };
}

function month(year: number, m: number, values: Record<number, string | null>): PrecedentsMonth {
  const n = daysInMonth(year, m);
  const days = Array.from({ length: n }, (_, i) => {
    const d = i + 1;
    const iso = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return day(iso, d in values ? values[d] : null);
  });
  return {
    scope: { level: 'company', location_id: null, label: 'Edit and Co' },
    year,
    month: m,
    currency: 'USD',
    built_at: null,
    weather_note: null,
    windows: [],
    macro: {
      available: false,
      reason: 'not_ingested',
      month: '2026-08',
      mode: 'observe',
      basis: '',
      category_nominal_yoy_pct: null,
      category_real_yoy_pct: null,
      apparel_inflation_yoy_pct: null,
      vintage_date: null,
      latest_period_start: null
    },
    days
  };
}

describe('daysInMonth', () => {
  it('knows February, leap Februaries and thirty-day months', () => {
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 6)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('daySeries', () => {
  it('has one slot per calendar day, and an unobserved day is a gap, never a zero', () => {
    const series = daySeries(month(2026, 6, { 1: '120.50', 2: null, 3: '0.00' }));
    expect(series).toHaveLength(30);
    expect(series[0]).toBe(120.5);
    expect(series[1]).toBeNull();
    expect(series[2]).toBe(0);
    expect(series[29]).toBeNull();
  });

  it('treats a revenue on a day marked unobserved as a gap too', () => {
    const m = month(2026, 6, {});
    m.days[4] = day('2026-06-05', '10.00', false);
    expect(daySeries(m)[4]).toBeNull();
  });

  it('pads a short payload to the calendar and places days by date, not by index', () => {
    const m = month(2026, 12, {});
    m.days = [day('2026-12-25', '300.00')];
    const series = daySeries(m);
    expect(series).toHaveLength(31);
    expect(series[24]).toBe(300);
    expect(series.filter((v) => v !== null)).toEqual([300]);
  });

  it('reads an unparseable figure as unknown rather than zero', () => {
    const m = month(2026, 6, { 1: 'n/a' });
    expect(daySeries(m)[0]).toBeNull();
  });
});

describe('unobservedGaps', () => {
  it('returns the runs of unobserved days as inclusive 1-based ranges', () => {
    const gaps = unobservedGaps(month(2026, 6, { 1: '1.00', 2: '1.00', 5: '1.00', 30: '1.00' }));
    expect(gaps).toEqual([
      { from: 3, to: 4 },
      { from: 6, to: 29 }
    ]);
  });

  it('is the whole month when nothing was observed', () => {
    expect(unobservedGaps(month(2027, 2, {}))).toEqual([{ from: 1, to: 28 }]);
  });
});

describe('isolatedPoints', () => {
  it('marks an observed day with gaps on both sides — a line cannot draw a single point', () => {
    expect(isolatedPoints([null, 5, null, 3, 4, null, 7])).toEqual([1, 6]);
  });
});

describe('observedSummary', () => {
  it('counts observed days and totals only what was observed', () => {
    expect(observedSummary(month(2026, 6, { 1: '10.00', 2: '0.00', 3: null }))).toEqual({ observed: 2, total: 30, revenue: 10 });
  });
});

describe('monthLabel and shiftMonth', () => {
  it('names the month and steps across year boundaries', () => {
    expect(monthLabel(2026, 12)).toBe('December 2026');
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('gapSentence', () => {
  it('names the gaps in plain words and is silent when there are none', () => {
    expect(gapSentence([])).toBeNull();
    expect(gapSentence([{ from: 4, to: 4 }])).toBe('Day 4: no sales source covered it, so the line breaks rather than reading zero.');
    expect(
      gapSentence([
        { from: 3, to: 4 },
        { from: 6, to: 29 }
      ])
    ).toBe('Days 3–4 and 6–29: no sales source covered them, so the line breaks rather than reading zero.');
  });
});

describe('month defaults', () => {
  it('opens on the last complete month', () => {
    expect(defaultMonth(new Date(2026, 8, 30))).toEqual({ year: 2026, month: 8 });
    expect(defaultMonth(new Date(2026, 0, 3))).toEqual({ year: 2025, month: 12 });
  });

  it('jumps to the latest June or December that is not in the future', () => {
    expect(latestOccurrence(6, new Date(2026, 8, 30))).toEqual({ year: 2026, month: 6 });
    expect(latestOccurrence(12, new Date(2026, 8, 30))).toEqual({ year: 2025, month: 12 });
    expect(latestOccurrence(6, new Date(2026, 5, 10))).toEqual({ year: 2026, month: 6 });
  });
});

describe('moneyFormatter', () => {
  it('formats in the payload currency and never throws on a bad code', () => {
    expect(moneyFormatter('USD')(1234.5)).toBe('$1,235');
    expect(moneyFormatter('nope')(12)).toBe('12');
  });
});

describe('storeOptions', () => {
  it('keeps active physical stores and puts All first', () => {
    const options = storeOptions([
      { id: 'a', name: 'Oklahoma', is_active: true, kind: 'store' },
      { id: 'b', name: 'Web', is_active: true, kind: 'online' },
      { id: 'c', name: 'Closed', is_active: false, kind: 'store' },
      { id: 'd', name: 'Bloomington', is_active: true }
    ]);
    expect(options).toEqual([
      { value: '', label: 'All stores' },
      { value: 'd', label: 'Bloomington' },
      { value: 'a', label: 'Oklahoma' }
    ]);
  });
});
