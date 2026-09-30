import { describe, expect, it } from 'vitest';

import type { PrecedentsDay, PrecedentsEvent, PrecedentsMonth, PrecedentsWeather } from 'api/precedents.api';

import { holidayMarks, macroSentence, spendWindows, weatherSeries } from './precedentsOverlays';

function wx(score: string | null, forecast = false): PrecedentsWeather {
  return {
    score,
    score_version: 1,
    score_reason: score === null ? 'missing_input' : '',
    forecast,
    temp_high_f: '80.0',
    temp_low_f: '60.0',
    precip_mm: '0.0',
    snow_cm: '0.0',
    wind_max_kmh: '10.0',
    alerts: [],
    alerts_covered: false
  };
}

const EMPTY_MACRO = {
  available: false,
  reason: 'not_ingested',
  month: '2026-08',
  mode: 'observe' as const,
  basis: '',
  category_nominal_yoy_pct: null,
  category_real_yoy_pct: null,
  apparel_inflation_yoy_pct: null,
  vintage_date: null,
  latest_period_start: null
};

function month(days: Partial<PrecedentsDay>[], extra: Partial<PrecedentsMonth> = {}, m = 8): PrecedentsMonth {
  const n = new Date(Date.UTC(2026, m, 0)).getUTCDate();
  return {
    scope: { level: 'location', location_id: 'okc', label: 'Oklahoma' },
    year: 2026,
    month: m,
    currency: 'USD',
    built_at: null,
    weather_note: null,
    windows: [],
    macro: EMPTY_MACRO,
    days: Array.from({ length: n }, (_, i) => ({
      date: `2026-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
      revenue: null,
      tickets: null,
      units: null,
      refunds: null,
      cogs: null,
      gross_profit: null,
      observed: false,
      excluded_from_learning: false,
      is_outlier: false,
      built: false,
      weather: null,
      calendar: [],
      baseline: null,
      ...(days[i] ?? {})
    })),
    ...extra
  };
}

describe('weatherSeries', () => {
  it('is a gap where there is no row or no score — never a zero', () => {
    const s = weatherSeries(month([{ weather: wx('8.5') }, { weather: wx(null) }, {}, { weather: wx('0.0') }]));
    expect(s.actual.slice(0, 4)).toEqual([8.5, null, null, 0]);
    expect(s.actual).toHaveLength(31);
  });

  it('splits the forecast into its own dashed line that joins the last actual', () => {
    const s = weatherSeries(
      month([{ weather: wx('7.0') }, { weather: wx('6.0') }, { weather: wx('5.0', true) }, { weather: wx('4.0', true) }])
    );
    expect(s.actual.slice(0, 4)).toEqual([7, 6, null, null]);
    expect(s.forecast.slice(0, 4)).toEqual([null, 6, 5, 4]);
    expect(s.hasForecast).toBe(true);
  });

  it('says when a month has no weather at all', () => {
    expect(weatherSeries(month([])).hasAny).toBe(false);
  });
});

describe('spendWindows', () => {
  const win = (start: string, end: string, name = 'Christmas shopping'): PrecedentsEvent => ({
    kind: 'spend_window',
    key: 'christmas',
    name,
    window_start: start,
    window_end: end
  });

  it('gives 1-based day ranges clipped to the month', () => {
    const m = month([], { windows: [win('2026-11-27', '2026-11-30', 'Black Friday weekend'), win('2026-12-10', '2026-12-24')] }, 12);
    expect(spendWindows(m)).toEqual([{ from: 10, to: 24, name: 'Christmas shopping' }]);
    const nov = month([], { windows: [win('2026-11-27', '2026-12-01', 'Black Friday weekend')] }, 11);
    expect(spendWindows(nov)).toEqual([{ from: 27, to: 30, name: 'Black Friday weekend' }]);
  });
});

describe('holidayMarks', () => {
  it('lists each holiday once, on its day', () => {
    const holiday: PrecedentsEvent = {
      kind: 'holiday',
      key: 'labor-day',
      name: 'Labor Day',
      window_start: '2026-09-07',
      window_end: '2026-09-07'
    };
    const m = month([], {}, 9);
    m.days[6].calendar = [holiday];
    expect(holidayMarks(m)).toEqual([{ day: 7, name: 'Labor Day' }]);
  });
});

describe('macroSentence', () => {
  it('reads the national reference in plain words, with its observe-only caveat', () => {
    const m = month([], {
      macro: {
        ...EMPTY_MACRO,
        available: true,
        reason: null,
        category_nominal_yoy_pct: '3.10',
        category_real_yoy_pct: '1.20',
        apparel_inflation_yoy_pct: '1.88'
      }
    });
    expect(macroSentence(m)).toBe(
      'US clothing-store sales were up 3.1% on a year earlier (up 1.2% after apparel prices rose 1.9%) — a national reference, not this store.'
    );
  });

  it('asks for the country rather than calling a blank one unsupported', () => {
    expect(macroSentence(month([], { macro: { ...EMPTY_MACRO, reason: 'country_unknown' } }))).toBe(
      "Add the company's country in Settings to see the national reference."
    );
  });

  it('is silent when nothing is ingested and honest when the month is not published', () => {
    expect(macroSentence(month([]))).toBeNull();
    expect(macroSentence(month([], { macro: { ...EMPTY_MACRO, reason: 'not_yet_published' } }))).toBe(
      "The national reference for this month isn't published yet."
    );
  });
});
