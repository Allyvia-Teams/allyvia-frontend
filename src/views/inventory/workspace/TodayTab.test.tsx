// Today, rendered statically: the health strip from the three sources, the
// queue banded Order now / This week / Watch by joining the agent rows to the
// reorder inbox, the supplier bundle line, the collapsed inbox section and the
// footer. The cards' controller is mocked ready; the lists are seeded into the
// query cache because effects (and so fetches) never run under SSR.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentOngoingItem, PendingRecommendation } from 'api/agent.api';
import type { InventorySummary } from 'types/analytics';
import { pendingRec } from 'ui-component/agent/recommendationFixtures';

vi.mock('utils/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const snack = vi.hoisted(() => ({ enqueue: vi.fn() }));
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: snack.enqueue, closeSnackbar: vi.fn() }) }));

const adapter = vi.hoisted(() => ({
  getInsightDetail: vi.fn(async () => ({ rationale: { narrative: '', steps: [] }, facts: [], signalCount: 0 })),
  dismissInsight: vi.fn(async () => undefined)
}));
vi.mock('features/insights/adapter', () => adapter);

const reorderApi = vi.hoisted(() => ({ createPurchaseOrdersFromSuggestions: vi.fn(), listReorderSuggestions: vi.fn() }));
vi.mock('api/inventoryReorder.api', () => reorderApi);

const role = vi.hoisted(() => ({ type: 'admin' as string | undefined }));
vi.mock('store', () => ({
  useSelector: (select: (state: unknown) => unknown) => select({ auth: { currentRole: { role_type: role.type } } })
}));

const hook = vi.hoisted(() => ({ state: {} as Record<string, unknown>, source: null as unknown }));
vi.mock('features/insights/useRecommendationCards', () => ({
  default: (source: unknown) => {
    hook.source = source;
    return hook.state;
  }
}));

vi.mock('views/inventory/ReorderInbox', () => ({
  default: ({ embedded, onChanged }: { embedded?: boolean; onChanged?: () => void }) => (
    <div data-reorder-inbox={String(Boolean(embedded))} data-reorder-inbox-onchanged={typeof onChanged} />
  )
}));

import { payloadFromAgent } from 'features/insights/fromAgent';
import type { RecommendationCardsSource } from 'features/insights/useRecommendationCards';
import { sectorPendingQueryKey } from 'ui-component/agent/useSectorRecommendations';

import { PO_ATTENTION_QUERY_KEY } from '../tabs';
import { bundleLine, TODAY_INBOX_QUERY_KEY, TODAY_OVERVIEW_QUERY_KEY, todayOnOrderQueryKey } from '../today';
import TodayTab from './TodayTab';

const S_CRIT = '11111111-1111-4111-8111-111111111111';
const S_WARN = '22222222-2222-4222-8222-222222222222';
const PLAN = '44444444-4444-4444-8444-444444444444';
const reorderSignal = (suggestionId: string) => ({ origin: 'inventory_reorder', category: 'restock', suggestion_id: suggestionId });

const rows: PendingRecommendation[] = [
  pendingRec({
    id: 'r-crit',
    rec_type: 'reorder',
    recommendation_text: 'Reorder the dress. Two days left.',
    signal_sources: reorderSignal(S_CRIT)
  }),
  pendingRec({
    id: 'r-warn',
    rec_type: 'reorder',
    recommendation_text: 'Reorder the cami. Ten days left.',
    signal_sources: reorderSignal(S_WARN)
  }),
  pendingRec({
    id: 'r-plan',
    rec_type: null,
    recommendation_text: 'Your spring plan is ready. Open it.',
    signal_sources: { origin: 'buying', kind: 'buy_plan_ready', plan_id: PLAN }
  })
];

const suggestion = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  status: 'suggested',
  name: 'Linen dress',
  location_id: 'loc',
  location_name: 'Downtown',
  supplier_id: 's1',
  supplier_name: 'Northwind',
  forecast_stockout_date: '2026-11-09',
  days_until_stockout: 2,
  lead_time_days: 7,
  suggested_qty: 12,
  ...overrides
});

const inbox = {
  items: [suggestion(S_CRIT), suggestion(S_WARN, { name: 'Cami', days_until_stockout: 10 })],
  totalUnitsSuggested: 24,
  policy: null
};

const overview: InventorySummary = {
  total_items: 120,
  total_value: 158400,
  total_cost_value: 66812.5,
  average_profit_margin: 58,
  average_profit_margin_estimated: false,
  margin_uncosted_value: 0,
  low_stock_count: 6,
  out_of_stock_count: 2,
  active_items_count: 118,
  inactive_items_count: 2,
  taxable_items_count: 120,
  non_taxable_items_count: 0
};

const ongoing: AgentOngoingItem = {
  type: 'reorder',
  target_skus: ['LS-1'],
  text: 'Linen shirt keeps running low.',
  days_outstanding: 12,
  first_surfaced_at: '2026-10-25T06:00:00Z'
};

type Seed = { inbox?: 'ready' | 'loading' | 'error'; overview?: boolean; onOrder?: boolean | 'error'; orders?: boolean; ongoing?: boolean };

const render = (url = '/inventory', seed: Seed = {}) => {
  const client = new QueryClient();
  client.setQueryData(sectorPendingQueryKey('inventory'), { recommendations: rows, ongoing: seed.ongoing ? [ongoing] : [], alerts: [] });
  if (seed.inbox === 'ready' || seed.inbox === undefined) client.setQueryData(TODAY_INBOX_QUERY_KEY, inbox);
  // A read that failed: the cache holds the error (a fetch never runs under SSR).
  const fail = (queryKey: readonly unknown[]) => {
    const query = client.getQueryCache().build(client, { queryKey });
    query.setState({ status: 'error', error: new Error('boom'), fetchStatus: 'idle' });
  };
  if (seed.inbox === 'error') fail(TODAY_INBOX_QUERY_KEY);
  if (seed.overview) client.setQueryData(TODAY_OVERVIEW_QUERY_KEY, { summary: overview });
  if (seed.onOrder === true) client.setQueryData(todayOnOrderQueryKey(null), { items: [], total_units: 84 });
  if (seed.onOrder === 'error') fail(todayOnOrderQueryKey(null));
  if (seed.orders) {
    client.setQueryData(PO_ATTENTION_QUERY_KEY, [
      { id: 'p1', status: 'submitted', expected_at: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) },
      { id: 'p2', status: 'submitted', expected_at: null }
    ]);
  }
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <TodayTab />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const stripStyles = (html: string): string => html.replace(/<style[^>]*>[^<]*<\/style>/g, '');
const text = (html: string): string => stripStyles(html).replace(/<[^>]+>/g, '');

/** The inbox section's aria-expanded, read off the button that carries its title. */
const sectionExpanded = (html: string): string | null =>
  stripStyles(html).match(/aria-expanded="(true|false)"[^>]*><h2[^>]*>All reorder suggestions/)?.[1] ?? null;

const noop = () => undefined;
const ready = () => {
  hook.state = {
    load: { status: 'ready', payload: payloadFromAgent(rows) },
    dismissedIds: [],
    pendingDismissal: null,
    actedIds: [],
    openIds: [],
    details: {},
    askAvailable: false,
    retry: noop,
    onPrimary: noop,
    onDismiss: noop,
    onDismissReason: noop,
    onUndo: noop,
    onCommitDismissal: noop,
    onRationale: noop,
    onRetryDetail: noop,
    onAsk: noop
  };
};

beforeEach(() => {
  ready();
  role.type = 'admin';
  snack.enqueue.mockClear();
  adapter.getInsightDetail.mockClear();
  adapter.dismissInsight.mockClear();
  reorderApi.createPurchaseOrdersFromSuggestions.mockReset();
});

describe('TodayTab', () => {
  it('bands the cards Order now, This week, Watch in that order, each under its own heading', () => {
    const html = render();
    const orderNow = html.indexOf('>Order now<');
    const thisWeek = html.indexOf('>This week<');
    const watch = html.indexOf('>Watch<');
    expect(orderNow).toBeGreaterThan(-1);
    expect(orderNow).toBeLessThan(thisWeek);
    expect(thisWeek).toBeLessThan(watch);
    expect(html.indexOf('data-rec-id="r-crit"')).toBeGreaterThan(orderNow);
    expect(html.indexOf('data-rec-id="r-crit"')).toBeLessThan(thisWeek);
    expect(html.indexOf('data-rec-id="r-warn"')).toBeGreaterThan(thisWeek);
    expect(html.indexOf('data-rec-id="r-warn"')).toBeLessThan(watch);
    expect(html.indexOf('data-rec-id="r-plan"')).toBeGreaterThan(watch);
    expect(html).not.toContain('sorting…');
  });

  it('offers the supplier bundle under Order now in bundleLine’s words', () => {
    const withTwo = { ...inbox, items: [suggestion(S_CRIT), suggestion(S_WARN, { name: 'Cami', days_until_stockout: 1 })] };
    const client = new QueryClient();
    client.setQueryData(sectorPendingQueryKey('inventory'), { recommendations: rows, ongoing: [], alerts: [] });
    client.setQueryData(TODAY_INBOX_QUERY_KEY, withTwo);
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/inventory']}>
          <TodayTab />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const line = bundleLine({
      supplierId: 's1',
      supplierName: 'Northwind',
      locationId: 'loc',
      suggestionIds: [S_CRIT, S_WARN],
      covered: 2,
      total: 2
    });
    expect(line).toBe('Draft the 2 Northwind lines as one purchase order');
    expect(html).toContain(`>${line}<`);
    expect(html.indexOf(line)).toBeLessThan(html.indexOf('>Watch<'));
  });

  it('renders no bundle when only one Order-now row names the supplier', () => {
    expect(render()).not.toContain('as one purchase order');
  });

  it('titles the collapsed inbox section with the inbox count and mounts the inbox embedded, told how to refresh the banding', () => {
    const html = render();
    expect(html).toContain('All reorder suggestions (2)');
    expect(html).toContain('data-reorder-inbox="true"');
    expect(html).toContain('data-reorder-inbox-onchanged="function"');
    expect(sectionExpanded(html)).toBe('false');
  });

  it('opens the inbox section when the URL focuses a suggestion', () => {
    expect(sectionExpanded(render('/inventory?tab=today&suggestion=abc'))).toBe('true');
    expect(sectionExpanded(render('/inventory?tab=today&status=dismissed'))).toBe('true');
  });

  it('never shows a member the Open Plan line', () => {
    expect(render()).toContain('>Open Plan</a>');
    role.type = 'member';
    const html = render();
    expect(html).not.toContain('Open Plan');
    expect(html).not.toContain('href="/inventory/plan"');
  });

  it('links the footer to the inbox’s dismissed filter', () => {
    const html = render();
    expect(html).toContain('Dismissed this week');
    expect(html).toMatch(/href="\/inventory\?tab=today&(amp;)?status=dismissed"/);
  });

  it('says sorting… on every heading while the inbox is loading, with every card under This week', () => {
    const html = render('/inventory', { inbox: 'loading' });
    expect(html).toContain('This week · sorting…');
    expect(html).not.toContain('>Order now');
    expect(html).not.toContain('>Watch');
    expect(html).toContain('data-rec-id="r-crit"');
    expect(html).not.toContain('as one purchase order');
    expect(html).toContain('All reorder suggestions<');
  });

  it('with the inbox read failed, every card sits under This week and no bundle renders', () => {
    const html = render('/inventory', { inbox: 'error' });
    expect(html).toContain('>This week<');
    expect(html).not.toContain('sorting');
    expect(html).not.toContain('>Order now');
    expect(html).not.toContain('>Watch');
    expect(html).toContain('data-rec-id="r-plan"');
    expect(html).not.toContain('as one purchase order');
  });

  it('reads the health strip from the loaded sources, — with Retry for a failed one, a skeleton for one still loading', () => {
    const html = render('/inventory', { overview: true, onOrder: 'error' });
    const strip = text(html);
    expect(strip).toContain('Low stock6');
    expect(strip).toContain('Out of stock2');
    expect(strip).toContain('Value at cost$66,812.50');
    expect(strip).toContain('On order—Retry');
    expect(html.split('>Retry<').length - 1).toBe(1);
    // The open-order list is still loading: no figure, no 0.
    expect(html).toContain('Arriving this week');
    expect(strip).not.toMatch(/Arriving this week[0-9—]/);
  });

  it('counts arrivals from the open orders and names the undated ones', () => {
    const strip = text(render('/inventory', { orders: true }));
    expect(strip).toContain('Arriving this week1');
    expect(strip).toContain('1 with no date');
  });

  it('renders the ongoing digest at the foot of the queue only when there is one', () => {
    const html = render('/inventory', { ongoing: true });
    expect(html).toContain('data-testid="ongoing-digest"');
    expect(html).toContain('Linen shirt keeps running low.');
    expect(html.indexOf('data-rec-id="r-plan"')).toBeLessThan(html.indexOf('data-testid="ongoing-digest"'));
    expect(render()).not.toContain('data-testid="ongoing-digest"');
  });

  it('shows skeletons while the cards load and Could-not-load + Retry on error', () => {
    hook.state = { ...hook.state, load: { status: 'loading' } };
    expect(render()).toContain('aria-busy="true"');
    hook.state = { ...hook.state, load: { status: 'error' } };
    const html = render();
    expect(html).toContain('Could not load recommendations.');
    expect(html).toContain('Retry');
  });

  it('labels a card whose live suggestion has a supplier "Draft purchase order", the rest "Review"', () => {
    const html = stripStyles(render());
    const button = (id: string) => (html.match(new RegExp(`data-rec-id="${id}"[\\s\\S]*?<button[^>]*>([^<]*)</button>`)) ?? [])[1];
    expect(button('r-crit')).toBe('Draft purchase order');
    expect(button('r-warn')).toBe('Draft purchase order');
    expect(button('r-plan')).toBe('Review');
    const noSupplier = { ...inbox, items: inbox.items.map((s) => ({ ...s, supplier_id: null })) };
    const client = new QueryClient();
    client.setQueryData(sectorPendingQueryKey('inventory'), { recommendations: rows, ongoing: [], alerts: [] });
    client.setQueryData(TODAY_INBOX_QUERY_KEY, noSupplier);
    const bare = stripStyles(
      renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/inventory']}>
            <TodayTab />
          </MemoryRouter>
        </QueryClientProvider>
      )
    );
    expect((bare.match(/data-rec-id="r-crit"[\s\S]*?<button[^>]*>([^<]*)<\/button>/) ?? [])[1]).toBe('Review');
  });

  describe('the controller’s source', () => {
    const source = () => {
      render();
      return hook.source as RecommendationCardsSource;
    };
    const card = (id: string) => payloadFromAgent(rows).recommendations.find((rec) => rec.id === id)!;

    it('reads the inventory sector’s rows into the payload', async () => {
      const payload = await source().fetchPayload();
      expect(payload.recommendations.map((rec) => rec.id)).toEqual(['r-crit', 'r-warn', 'r-plan']);
    });

    it('fetches details and sends dismissals to the live agent, whatever the Insights flag says', async () => {
      const s = source();
      await s.fetchDetail('r-crit');
      expect(adapter.getInsightDetail).toHaveBeenCalledWith('r-crit', { mode: 'live' });
      await s.dismiss('r-crit', 'not_relevant');
      expect(adapter.dismissInsight).toHaveBeenCalledWith('r-crit', 'not_relevant', { mode: 'live' });
    });

    it('leaves a card without a live, supplied suggestion to the generic flow', async () => {
      await expect(source().primary!(card('r-plan'))).resolves.toBe(false);
      expect(reorderApi.createPurchaseOrdersFromSuggestions).not.toHaveBeenCalled();
    });

    it('drafts from the card’s suggestion, and a failed draft is said out loud and not marked acted', async () => {
      reorderApi.createPurchaseOrdersFromSuggestions.mockRejectedValueOnce(new Error('500'));
      await expect(source().primary!(card('r-crit'))).rejects.toThrow();
      expect(reorderApi.createPurchaseOrdersFromSuggestions).toHaveBeenCalledWith({ suggestion_ids: [S_CRIT] });
      expect(snack.enqueue).toHaveBeenCalledWith('Could not draft that purchase order.', { variant: 'error' });
    });
  });
});
