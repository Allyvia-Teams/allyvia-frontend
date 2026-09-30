import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { PrecedentsMonth } from 'api/precedents.api';

const state = vi.hoisted(() => ({
  month: undefined as PrecedentsMonth | undefined,
  monthError: false,
  storesError: false,
  chartSeries: [] as unknown[],
  chartProps: {} as Record<string, unknown>
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) =>
    queryKey[1] === 'stores'
      ? {
          data: state.storesError ? undefined : [{ id: 'okc', name: 'Oklahoma', is_active: true }],
          isLoading: false,
          isError: state.storesError
        }
      : { data: state.month, isLoading: false, isError: state.monthError, refetch: () => undefined }
}));
vi.mock('api/precedents.api', () => ({ getPrecedentsMonth: vi.fn() }));
vi.mock('api/inventoryStock.api', () => ({ listLocations: vi.fn() }));
vi.mock('./PrecedentsChart', () => ({
  default: (props: { series: unknown[] }) => {
    state.chartSeries = props.series;
    state.chartProps = props as unknown as Record<string, unknown>;
    return <div data-testid="chart" />;
  }
}));

import PrecedentsPage from './PrecedentsPage';

function month(values: (string | null)[]): PrecedentsMonth {
  return {
    scope: { level: 'company', location_id: null, label: 'Edit and Co' },
    year: 2026,
    month: 8,
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
    days: values.map((revenue, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      revenue,
      tickets: revenue === null ? null : 1,
      units: null,
      refunds: null,
      cogs: null,
      gross_profit: null,
      observed: revenue !== null,
      excluded_from_learning: false,
      is_outlier: false,
      built: true,
      weather: null,
      calendar: [],
      baseline: null
    }))
  };
}

describe('Precedents page', () => {
  it('draws the line with gaps, names them, and says how many days were observed', () => {
    const values: (string | null)[] = Array.from({ length: 31 }, () => '100.00');
    values[9] = null;
    state.month = month(values);
    const html = renderToStaticMarkup(<PrecedentsPage />);
    expect(html).toContain('Precedents');
    expect(html).toContain('Edit and Co');
    expect(html).toContain('30 of 31 days observed');
    expect(html).toContain('Day 10: no sales source covered it');
    expect(html).toContain('Revenue (clean daily POS)');
    expect(state.chartSeries[9]).toBeNull();
    expect(state.chartSeries[0]).toBe(100);
    // All stores first, then the store the list returned.
    expect(html).toContain('All stores');
  });

  it('says a month nothing covered is empty, not a month of zeros', () => {
    state.month = month(Array.from({ length: 31 }, () => null));
    const html = renderToStaticMarkup(<PrecedentsPage />);
    expect(html).toContain('not a month of zeros');
    expect(html).not.toContain('data-testid="chart"');
  });

  it('offers a retry when the month fails, and warns when the store list does', () => {
    state.month = undefined;
    state.monthError = true;
    state.storesError = true;
    const html = renderToStaticMarkup(<PrecedentsPage />);
    expect(html).toContain('could not be loaded');
    expect(html).toContain('Retry');
    expect(html).toContain('only All stores is available');
    state.monthError = false;
    state.storesError = false;
  });
});

describe('Precedents page — weather, windows, macro (P4)', () => {
  it('shows the weather legend, the spend window and the macro sentence when the month has them', () => {
    const values: (string | null)[] = Array.from({ length: 31 }, () => '100.00');
    const m = month(values);
    m.scope = { level: 'location', location_id: 'okc', label: 'Oklahoma' };
    m.days[3].weather = {
      score: '6.5',
      score_version: 1,
      score_reason: '',
      forecast: false,
      temp_high_f: '90.0',
      temp_low_f: '70.0',
      precip_mm: '12.0',
      snow_cm: '0.0',
      wind_max_kmh: '20.0',
      alerts: [],
      alerts_covered: false
    };
    m.windows = [
      { kind: 'spend_window', key: 'back_to_school', name: 'Back to school', window_start: '2026-08-01', window_end: '2026-08-31' }
    ];
    m.macro = {
      ...m.macro,
      available: true,
      reason: null,
      category_nominal_yoy_pct: '2.00',
      category_real_yoy_pct: null,
      apparel_inflation_yoy_pct: null
    };
    state.month = m;
    const html = renderToStaticMarkup(<PrecedentsPage />);
    expect(html).toContain('Weather score (season-relative, 0–10)');
    expect(html).toContain('Spend window');
    expect(html).toContain('US clothing-store sales were up 2.0% on a year earlier — a national reference, not this store.');
    const weather = state.chartProps.weather as { actual: (number | null)[] };
    expect(weather.actual[3]).toBe(6.5);
    expect(weather.actual[4]).toBeNull();
    expect(state.chartProps.windows).toEqual([{ from: 1, to: 31, name: 'Back to school' }]);
  });

  it('still draws a month with weather but no observed sales — the line is the data there is', () => {
    const m = month(Array.from({ length: 31 }, () => null));
    m.scope = { level: 'location', location_id: 'okc', label: 'Oklahoma' };
    m.days[0].weather = {
      score: '8.0',
      score_version: 1,
      score_reason: '',
      forecast: false,
      temp_high_f: '40.0',
      temp_low_f: '30.0',
      precip_mm: '0.0',
      snow_cm: '0.0',
      wind_max_kmh: '10.0',
      alerts: [],
      alerts_covered: false
    };
    state.month = m;
    const html = renderToStaticMarkup(<PrecedentsPage />);
    expect(html).toContain('data-testid="chart"');
    expect(html).not.toContain('not a month of zeros');
    expect(html).toContain('Days 1–31: no sales source covered them');
    expect(html).not.toContain('Revenue (clean daily POS)');
  });

  it('explains why All stores has no weather line in a multi-store company', () => {
    const m = month(Array.from({ length: 31 }, () => '100.00'));
    m.weather_note = 'Weather is per store: choose a store to see its weather line.';
    state.month = m;
    const html = renderToStaticMarkup(<PrecedentsPage />);
    expect(html).toContain('Weather is per store');
    expect(html).not.toContain('Weather score (season-relative');
  });
});
