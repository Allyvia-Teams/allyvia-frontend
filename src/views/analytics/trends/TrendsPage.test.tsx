import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';

// The chart is client-only: the markup test needs what the page hands it, not apex's DOM.
vi.mock('react-apexcharts', () => ({
  default: (props: { series: Array<{ name: string; data: unknown[] }> }) => (
    <div data-testid="chart" data-series={props.series.map((s) => s.name).join('|')} />
  )
}));
// The page reaches the store and the API through utils/axios, which cannot load under vitest's node environment.
vi.mock('store', () => ({ useSelector: () => undefined, dispatch: vi.fn() }));
vi.mock('api/timeline.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('api/timeline.api')>()),
  TimelineAPI: { get: vi.fn() }
}));
vi.mock('api/inventoryStock.api', () => ({ listLocations: vi.fn() }));

import { ALL, SENTENCES, STORE_NOT_PROVEN, STORE_OK, payload } from './trendsFixtures';
import { DAY_PANEL_PROMPT } from './DayPanel';
import { EMPTY_RANGE, LOAD_FAILED, TrendsPageView, type TrendsPageViewProps } from './TrendsPage';
import { DEFAULT_LINES } from './trendsView';
import { defaultRange } from './trendsRange';
import { pickStore, storeChoices } from './trendsStore';

const choices = storeChoices([
  { id: 'store-1', name: 'Bloomington', is_default: true, is_active: true },
  { id: 'store-2', name: 'Oklahoma', is_default: false, is_active: true }
]);

const base = (over: Partial<TrendsPageViewProps> = {}): TrendsPageViewProps => ({
  status: 'ready',
  payload: STORE_OK,
  range: defaultRange('2026-11-18'),
  today: '2026-11-18',
  onRange: vi.fn(),
  pick: pickStore(choices, null, true),
  choices,
  onStore: vi.fn(),
  chosenLines: [...DEFAULT_LINES],
  onLines: vi.fn(),
  selectedDate: null,
  onSelectDate: vi.fn(),
  ...over
});

const render = (props: TrendsPageViewProps) =>
  renderToStaticMarkup(
    <ThemeProvider theme={createTheme()}>
      <MemoryRouter>
        <TrendsPageView {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );

const BANNED = /\b(band|vintage|gate|precedent|signal)\b/i;

describe('the Trends page, rendered', () => {
  it('loading: a skeleton, no chart, no error', () => {
    const html = render(base({ status: 'loading', payload: undefined }));
    expect(html).toContain('Loading the trends');
    expect(html).not.toContain('data-testid="chart"');
    expect(html).not.toContain(LOAD_FAILED);
  });

  it('error: the sentence and a Retry', () => {
    const html = render(base({ status: 'error', payload: undefined, message: 'Ask for 400 days or fewer at a time.', onRetry: vi.fn() }));
    expect(html).toContain('Ask for 400 days or fewer at a time.');
    expect(html).toContain('Retry');
    expect(html).not.toContain('data-testid="chart"');
  });

  it('with a proven forecast: the expected range is a series and no sentence is printed', () => {
    const html = render(base());
    expect(html).toContain('data-series="Expected range|Expected|Last year|Sales|Weather"');
    expect(html).not.toContain(SENTENCES.not_proven_yet);
    expect(html).not.toContain(SENTENCES.ok);
    expect(html).toContain(DAY_PANEL_PROMPT);
  });

  it('without a proven forecast: a complete chart and the server sentence, once', () => {
    const html = render(base({ payload: STORE_NOT_PROVEN }));
    expect(html).toContain('data-series="Last year|Sales|Weather"');
    expect(html.split(SENTENCES.not_proven_yet).length - 1).toBe(1);
    expect(html).not.toContain('Expected range|');
  });

  it('all stores: no weather, no range, the pick-a-store sentence, and All stores in the picker', () => {
    const html = render(base({ payload: ALL, pick: pickStore(choices, 'all', true) }));
    expect(html).toContain('data-series="Last year|Sales"');
    expect(html).toContain(SENTENCES.pick_a_store);
    expect(html).toContain('All stores');
  });

  it('a one-store company has no picker', () => {
    const one = choices.slice(0, 1);
    const html = render(base({ choices: one, pick: pickStore(one, null, true) }));
    expect(html).not.toContain('aria-label="Store"');
    expect(render(base())).toContain('aria-label="Store"');
  });

  it('a chosen day opens its sentences in the panel', () => {
    const html = render(base({ selectedDate: '2026-11-22' }));
    expect(html).toContain('Yesterday we expected about $448. Now about $313, because the weather forecast changed.');
    expect(html).toContain('Sunday, November 22, 2026');
  });

  it('an empty range says so instead of drawing', () => {
    const empty = payload({
      days: [{ date: '2026-11-08', revenue: null, revenue_last_year: null, weather: null, events: [], band: null, changed: null }]
    });
    const html = render(base({ payload: empty }));
    expect(html).toContain(EMPTY_RANGE);
    expect(html).not.toContain('data-testid="chart"');
  });

  it('a range ahead with no sales yet still draws its forecast and says there are no sales', () => {
    const ahead = payload({ days: STORE_OK.days.filter((d) => d.date >= '2026-11-18').map((d) => ({ ...d, revenue: null })) });
    const html = render(base({ payload: ahead }));
    expect(html).toContain('data-testid="chart"');
    expect(html).toContain(EMPTY_RANGE);
  });

  it('links Back to Analytics and names the store and window', () => {
    const html = render(base());
    expect(html).toContain('Back to Analytics');
    expect(html).toContain('href="/analytics"');
    expect(html).toContain('Bloomington');
  });

  it('says none of the words the owner should not meet', () => {
    for (const props of [base(), base({ payload: STORE_NOT_PROVEN }), base({ payload: ALL }), base({ selectedDate: '2026-11-22' })]) {
      expect(render(props).replace(/<[^>]+>/g, ' ')).not.toMatch(BANNED);
    }
  });
});
