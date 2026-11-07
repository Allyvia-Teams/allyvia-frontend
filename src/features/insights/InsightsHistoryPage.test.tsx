import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// `store` reaches utils/axios -> utils/mockApi, which cannot load under vitest.
vi.mock('store', () => ({ useSelector: () => undefined }));

import { HISTORY_NOTE, historyRows } from './history';
import { InsightsHistoryView, type HistoryLoad } from './InsightsHistoryPage';
import { INSIGHTS_MOCK } from './mock/insights.mock';
import { memoryStorage } from './testing/memoryStorage';
import { readVisitRecord, recordActed, recordDismissed, VISIT_RECORD_KEY } from './visitRecord';

const stripStyles = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
const render = (load: HistoryLoad) =>
  stripStyles(
    renderToStaticMarkup(
      <MemoryRouter>
        <InsightsHistoryView load={load} fallbackStoreName="Acme" onRetry={() => undefined} formatTime={(at) => `t${at}`} />
      </MemoryRouter>
    )
  );
const AT = INSIGHTS_MOCK.refreshedAt;
const loadFrom = (storage: ReturnType<typeof memoryStorage>): HistoryLoad => ({
  status: 'ready',
  storeName: INSIGHTS_MOCK.storeName,
  rows: historyRows(readVisitRecord(storage, AT), INSIGHTS_MOCK.recommendations)
});

describe('InsightsHistoryView', () => {
  it('renders the rows of a seeded session record under the note, with a Back to Insights link', () => {
    const storage = memoryStorage();
    recordActed(storage, AT, 'rec-saturday-shift', 1);
    recordDismissed(storage, AT, { id: 'rec-spring-deposit', reason: 'already_doing_it' }, 2);
    const html = render(loadFrom(storage));

    expect(html).toContain(HISTORY_NOTE);
    expect(HISTORY_NOTE).toBe('Showing actions from this visit. Full history arrives when the outcome ledger is connected.');
    expect(html).toMatch(/<a[^>]*href="\/insights"[^>]*>Back to Insights<\/a>/);
    const headers = [...html.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map((m) => m[1]);
    expect(headers).toEqual(['Date', 'Category', 'Title', 'Impact', 'Outcome']);
    const rows = [...html.matchAll(/data-history-row="([^"]+)"/g)].map((m) => m[1]);
    expect(rows).toEqual(['rec-spring-deposit', 'rec-saturday-shift']);
    expect(html).toContain('>t2<');
    expect(html).toContain('Dismissed · Already did this');
    expect(html).toContain('>Acted on<');
    expect(html).toContain('$4,200 kept on hand in Nov');
  });

  it('scrolls the table inside its own container', () => {
    const storage = memoryStorage();
    recordActed(storage, AT, 'rec-saturday-shift', 1);
    expect(render(loadFrom(storage))).toMatch(/class="MuiTableContainer-root[^"]*"[^>]*data-history-table/);
  });

  it('renders an empty history with the note for an empty or corrupt record', () => {
    for (const storage of [memoryStorage(), memoryStorage({ [VISIT_RECORD_KEY]: '{oops' })]) {
      const html = render(loadFrom(storage));
      expect(html).toContain(HISTORY_NOTE);
      expect(html).toContain('data-history-empty');
      expect(html).not.toContain('<table');
    }
  });
});
