import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `store` reaches utils/axios -> utils/mockApi, which cannot load under vitest.
vi.mock('store', () => ({ useSelector: () => undefined }));
vi.mock('api/health.api', () => ({ useHealth: () => ({ view: null, identity: undefined }) }));
const dismissInsight = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('./adapter', async (importOriginal) => ({ ...(await importOriginal<typeof import('./adapter')>()), dismissInsight }));

import { INITIAL_DISMISS_STATE, runDismissAction, type DismissAction, type DismissState } from './dismissals';
import { DISMISS_FAILED_MESSAGE, sendFinalDismissal, type SendDismissalDeps } from './dismissSend';
import ModePill from './components/ModePill';
import { InsightsPageView, LOAD_ERROR_MESSAGE, type InsightsPageViewProps } from './InsightsPage';
import { INSIGHTS_MOCK } from './mock/insights.mock';
import { memoryStorage } from './testing/memoryStorage';
import { readVisitRecord, type RecordStorage } from './visitRecord';

const noop = () => undefined;

// Emotion inlines <style> tags next to each styled element in static markup;
// drop them so the assertions see only the rendered elements.
const stripStyles = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

const render = (overrides: Partial<InsightsPageViewProps> = {}) =>
  stripStyles(
    renderToStaticMarkup(
      <MemoryRouter>
        <InsightsPageView
          load={{ status: 'ready', payload: INSIGHTS_MOCK }}
          fallbackStoreName="Acme Corporation"
          dismissedIds={[]}
          pendingDismissal={null}
          filter="all"
          onFilter={noop}
          onRetry={noop}
          onPrimary={noop}
          onDismiss={noop}
          onDismissReason={noop}
          onUndo={noop}
          onCommitDismissal={noop}
          onRationale={noop}
          openIds={[]}
          details={{}}
          askAvailable={false}
          onRetryDetail={noop}
          onAsk={noop}
          actedIds={[]}
          {...overrides}
        />
      </MemoryRouter>
    )
  );

const listedIds = (html: string) => [...html.matchAll(/data-rec-id="([^"]+)"/g)].map((m) => m[1]);

const readyDetail = (id: string) => {
  const r = INSIGHTS_MOCK.recommendations.find((rec) => rec.id === id)!;
  return { status: 'ready' as const, detail: { rationale: r.rationale, facts: r.facts, signalCount: r.signalCount } };
};

describe('InsightsPageView', () => {
  it('keeps two cards open at once, each with its own panel', () => {
    const html = render({
      openIds: ['rec-mara-reorder', 'rec-spring-deposit'],
      details: { 'rec-mara-reorder': readyDetail('rec-mara-reorder'), 'rec-spring-deposit': readyDetail('rec-spring-deposit') }
    });
    expect(html.match(/>Hide rationale</g)).toHaveLength(2);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(2);
    expect(html).toContain('Built from 6 signals · last checked 7:02 AM');
    expect(html).toContain('Built from 5 signals');
  });

  it('shows the breadcrumb, title and subtitle from the payload', () => {
    const html = render();
    expect(html).toContain('Juniper &amp; Rye');
    expect(html).toContain('<h1');
    expect(html).toContain('5 recommendations for this week · refreshed today at 7:02 AM');
  });

  it('falls back to the app’s company name when the payload has none', () => {
    const html = render({ load: { status: 'ready', payload: { ...INSIGHTS_MOCK, storeName: '' } } });
    expect(html).toContain('Acme Corporation');
  });

  it('subtracts dismissed recs from the subtitle and the chips, keeping the emptied chip at 0', () => {
    const html = render({ dismissedIds: ['rec-linen-markdown'] });
    expect(html).toContain('4 recommendations for this week');
    expect(html).toMatch(/data-chip="all"[^>]*>All<span[^>]*>4<\/span>/);
    expect(html).toMatch(/data-chip="pricing"[^>]*>Pricing<span[^>]*>0<\/span>/);
    expect(listedIds(html)).not.toContain('rec-linen-markdown');
  });

  it('renders the chips with counts, All pressed by default', () => {
    const html = render();
    const chips = [...html.matchAll(/aria-pressed="(true|false)"[^>]*data-chip="([^"]+)"/g)].map((m) => `${m[2]}:${m[1]}`);
    expect(chips).toEqual(['all:true', 'inventory:false', 'pricing:false', 'staffing:false', 'inner_circle:false', 'cash:false']);
    expect(html).toMatch(/data-chip="all"[^>]*>All<span[^>]*>5<\/span>/);
    expect(html).toMatch(/data-chip="inner_circle"[^>]*>Inner Circle<span[^>]*>1<\/span>/);
  });

  it('renders a card per rec, by impact, and only the linen dresses under Pricing', () => {
    const html = render();
    expect(listedIds(html)).toEqual([
      'rec-spring-deposit',
      'rec-linen-markdown',
      'rec-inner-circle-invite',
      'rec-mara-reorder',
      'rec-saturday-shift'
    ]);
    expect(html.match(/<section[^>]*aria-labelledby="insight-[^"]+-title"/g)).toHaveLength(5);
    const pricing = render({ filter: 'pricing' });
    expect(listedIds(pricing)).toEqual(['rec-linen-markdown']);
    expect(pricing).toMatch(/aria-pressed="true"[^>]*data-chip="pricing"/);
  });

  it('says nothing is left in a category whose cards are all dismissed', () => {
    const html = render({ filter: 'inventory', dismissedIds: ['rec-mara-reorder'] });
    expect(html).toContain('Nothing left in Inventory this week.');
    expect(html).toMatch(/aria-pressed="true"[^>]*data-chip="inventory"[^>]*>Inventory<span[^>]*>0<\/span>/);
    expect(listedIds(html)).toEqual([]);
  });

  it('says you are caught up once all five are dismissed, whatever the filter', () => {
    const all = INSIGHTS_MOCK.recommendations.map((r) => r.id);
    for (const filter of ['all', 'cash'] as const) {
      const html = render({ filter, dismissedIds: all });
      expect(html).toContain('You are caught up. New recommendations arrive each morning.');
      expect(html).toContain('0 recommendations for this week');
    }
  });

  it('shows the undo toast for the pending dismissal, with the three reasons and the chosen one pressed', () => {
    expect(render()).not.toContain('data-dismiss-toast');
    const html = render({
      dismissedIds: ['rec-saturday-shift'],
      pendingDismissal: {
        id: 'rec-saturday-shift',
        title: 'Add a second associate Saturday, 11 AM to 3 PM',
        reason: 'already_doing_it',
        focusUndo: false
      }
    });
    expect(html).toContain('data-dismiss-toast="rec-saturday-shift"');
    expect(html).toContain('Dismissed Add a second associate Saturday, 11 AM…');
    const reasons = [...html.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*data-reason="([^"]+)"/g)].map((m) => `${m[2]}:${m[1]}`);
    expect(reasons).toEqual(['not_relevant:false', 'already_doing_it:true', 'data_looks_wrong:false']);
    expect(html).toMatch(/<button[^>]*>Undo/);
  });

  it('shows the payload mode as a read-only label', () => {
    const save = render();
    expect(save).toContain('Save mode');
    expect(save).toContain('data-mode="save"');
    const growth = render({ load: { status: 'ready', payload: { ...INSIGHTS_MOCK, mode: 'growth' } } });
    expect(growth).toContain('Growth mode');
    expect(growth).toContain('data-mode="growth"');
  });

  it('shows the mode it is given over the payload, and no pill when given null', () => {
    expect(render({ shownMode: 'growth' })).toContain('data-mode="growth"');
    expect(render({ shownMode: null })).not.toContain('data-mode');
  });

  it('has no mode-change prop on the view', () => {
    const props: InsightsPageViewProps = {} as InsightsPageViewProps;
    expect('modeOverride' in props).toBe(false);
    // @ts-expect-error the view takes no mode props any more
    const bad: InsightsPageViewProps['onModeChange'] = undefined;
    expect(bad).toBeUndefined();
  });

  it('renders the mode pill with no button, menu or popup', () => {
    const pill = stripStyles(renderToStaticMarkup(<ModePill mode="growth" />));
    expect(pill).toContain('Growth mode');
    expect(pill).not.toMatch(/<button|role="button"|role="menu|aria-haspopup|aria-expanded/);
    expect(pill).not.toContain('change mode');
  });

  it('renders View history as an enabled link to /insights/history', () => {
    const html = render();
    expect(html).toMatch(/<a[^>]*href="\/insights\/history"[^>]*>View history/);
    expect(html).not.toMatch(/disabled=""[^>]*>View history/);
    expect(html).not.toContain('Coming soon');
  });

  it('moves acted cards to the bottom, by impact among themselves, and keeps the counts', () => {
    const html = render({ actedIds: ['rec-saturday-shift', 'rec-spring-deposit', 'rec-linen-markdown'] });
    expect(listedIds(html)).toEqual([
      'rec-inner-circle-invite',
      'rec-mara-reorder',
      'rec-spring-deposit',
      'rec-linen-markdown',
      'rec-saturday-shift'
    ]);
    expect(html.match(/data-acted="true"/g)).toHaveLength(3);
    expect(html).toContain('5 recommendations for this week');
    expect(html).toMatch(/data-chip="all"[^>]*>All<span[^>]*>5<\/span>/);
    expect(html).toMatch(/data-chip="staffing"[^>]*>Staffing<span[^>]*>1<\/span>/);
  });

  it('still dismisses an acted card', () => {
    const html = render({ actedIds: ['rec-saturday-shift'], dismissedIds: ['rec-saturday-shift'] });
    expect(listedIds(html)).not.toContain('rec-saturday-shift');
    expect(html).toContain('4 recommendations for this week');
  });

  it('shows three skeleton cards in the card frame while loading', () => {
    const loading = render({ load: { status: 'loading' } });
    expect(loading).toContain('data-insights-loading');
    expect(loading).toContain('aria-busy="true"');
    expect(loading.match(/data-card-skeleton/g)).toHaveLength(3);
    // Nine pieces each: icon tile, four text lines, impact figure and label, two footer buttons. Card-shaped, not a row.
    expect(loading.match(/class="MuiSkeleton-root/g)).toHaveLength(3 * 9);
    expect(loading).not.toContain('data-insights-list');
    expect(loading).not.toContain('data-rec-id');
  });

  it('shows a card-shaped error panel with Retry when getInsights fails', () => {
    const error = render({ load: { status: 'error' } });
    expect(LOAD_ERROR_MESSAGE).toBe("We couldn't load this week's recommendations.");
    expect(error).toContain('role="alert"');
    expect(error).toContain('We couldn&#x27;t load this week&#x27;s recommendations.');
    expect(error).toMatch(/<button[^>]*>Retry/);
    expect(error).not.toContain('data-chip');
  });
});

describe('category chips', () => {
  it('name each chip with its count, since the badge text runs into the label', () => {
    const html = render();
    expect(html).toContain('aria-label="All, 5 recommendations"');
    expect(html).toContain('aria-label="Inventory, 1 recommendation"');
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*data-chip-count[^>]*>1<\/span>/);
  });
});

describe('dismiss through the container path', () => {
  afterEach(() => dismissInsight.mockClear());

  const shift = INSIGHTS_MOCK.recommendations.find((r) => r.id === 'rec-saturday-shift')!;
  const AT = INSIGHTS_MOCK.refreshedAt;
  const deps = (overrides: Partial<SendDismissalDeps> = {}): SendDismissalDeps => ({
    dismiss: dismissInsight,
    storage: memoryStorage(),
    refreshedAt: AT,
    onFailed: noop,
    notify: noop,
    ...overrides
  });
  const run = (actions: DismissAction[]) =>
    actions.reduce(
      (state, action) => runDismissAction(state, action, (final) => void sendFinalDismissal(final, deps())),
      INITIAL_DISMISS_STATE
    );

  it('sends dismissInsight with the chosen reason when the toast times out', () => {
    run([
      { type: 'dismiss', rec: shift },
      { type: 'reason', reason: 'already_doing_it' },
      { type: 'commit', id: shift.id }
    ]);
    expect(dismissInsight).toHaveBeenCalledTimes(1);
    expect(dismissInsight).toHaveBeenCalledWith('rec-saturday-shift', 'already_doing_it');
  });

  it('sends nothing on Undo, and no reason when none was picked', () => {
    run([{ type: 'dismiss', rec: shift }, { type: 'undo' }]);
    expect(dismissInsight).not.toHaveBeenCalled();
    run([
      { type: 'dismiss', rec: shift },
      { type: 'commit', id: shift.id }
    ]);
    expect(dismissInsight).toHaveBeenCalledWith('rec-saturday-shift', undefined);
  });

  it('puts the card back at its position, drops it from the visit record and toasts when the send fails', async () => {
    const linen = INSIGHTS_MOCK.recommendations.find((r) => r.id === 'rec-linen-markdown')!;
    const before = listedIds(render());
    expect(before.indexOf(linen.id)).toBe(1); // second in impact order: not a card that would land last anyway

    const storage: RecordStorage = memoryStorage();
    const notify = vi.fn();
    let state: DismissState = INITIAL_DISMISS_STATE;
    const sends: Promise<unknown>[] = [];
    const dispatch = (action: DismissAction) => {
      state = runDismissAction(state, action, (final) => {
        sends.push(
          sendFinalDismissal(final, {
            dismiss: () => Promise.reject(new Error('503')),
            storage,
            refreshedAt: AT,
            notify,
            onFailed: (id) => dispatch({ type: 'failed', id })
          })
        );
      });
    };

    dispatch({ type: 'dismiss', rec: linen });
    dispatch({ type: 'reason', reason: 'not_relevant' });
    dispatch({ type: 'commit', id: linen.id });
    // Final: off the list and in the record, until the send settles.
    expect(listedIds(render({ dismissedIds: state.dismissedIds }))).not.toContain(linen.id);
    expect(readVisitRecord(storage, AT).dismissed.map((e) => e.id)).toEqual([linen.id]);

    await expect(Promise.all(sends)).resolves.toEqual(['failed']);
    expect(state).toEqual(INITIAL_DISMISS_STATE);
    expect(listedIds(render({ dismissedIds: state.dismissedIds }))).toEqual(before);
    expect(readVisitRecord(storage, AT).dismissed).toEqual([]);
    // One toast, no Undo: notify takes a message and nothing else.
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(DISMISS_FAILED_MESSAGE);
    expect(DISMISS_FAILED_MESSAGE).toBe("Couldn't dismiss. Try again.");
  });

  it('keeps the card off the list and in the record when the send succeeds', async () => {
    const storage = memoryStorage();
    const onFailed = vi.fn();
    const notify = vi.fn();
    await expect(sendFinalDismissal({ id: shift.id, reason: null }, deps({ storage, onFailed, notify }))).resolves.toBe('sent');
    expect(readVisitRecord(storage, AT).dismissed.map((e) => e.id)).toEqual([shift.id]);
    expect(onFailed).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
