import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { PrecedentsMonth } from 'api/precedents.api';

const state = vi.hoisted(() => ({
  month: undefined as PrecedentsMonth | undefined,
  monthError: false,
  storesError: false,
  chartSeries: [] as unknown[]
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
  default: ({ series }: { series: unknown[] }) => {
    state.chartSeries = series;
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
      calendar: null,
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
