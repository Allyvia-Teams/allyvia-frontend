// Inventory Insights > Recommendations, rendered statically with the sector
// hook mocked: rows in the order returned, each with the swap X; the empty,
// error and ongoing-digest states; and (U7) the one line toward Plan, shown
// only to the roles the menu shows Plan to.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentOngoingItem } from 'api/agent.api';
import type { SectorRecommendationsState } from 'ui-component/agent/useSectorRecommendations';

vi.mock('utils/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const role = vi.hoisted(() => ({ type: 'admin' as string | undefined }));
vi.mock('store', () => ({
  useSelector: (select: (state: unknown) => unknown) => select({ auth: { currentRole: { role_type: role.type } } })
}));

const hook = vi.hoisted(() => ({ state: {} as Record<string, unknown>, surface: '' }));
vi.mock('ui-component/agent/useSectorRecommendations', () => ({
  useSectorRecommendations: (surface: string) => {
    hook.surface = surface;
    return hook.state;
  }
}));

import { pendingRec } from 'ui-component/agent/recommendationFixtures';
import InventoryRecommendationsView from './InventoryRecommendationsView';

const setState = (overrides: Partial<SectorRecommendationsState> = {}) => {
  hook.state = {
    recommendations: [],
    ongoing: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    dismiss: vi.fn(),
    dismissing: false,
    dismissFailed: false,
    ...overrides
  };
};

const render = () =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <InventoryRecommendationsView />
      </MemoryRouter>
    </QueryClientProvider>
  );

const ongoing: AgentOngoingItem = {
  type: 'reorder',
  target_skus: ['LS-1'],
  text: 'Linen shirt keeps running low.',
  days_outstanding: 12,
  first_surfaced_at: '2026-10-25T06:00:00Z'
};

beforeEach(() => {
  setState();
  role.type = 'admin';
});

describe('InventoryRecommendationsView', () => {
  it('asks for the inventory surface', () => {
    render();
    expect(hook.surface).toBe('inventory');
  });

  it('lists every row in the order returned, each with the swap X', () => {
    setState({
      recommendations: [
        pendingRec({ id: 'a', recommendation_text: 'Alpha row. First.' }),
        pendingRec({ id: 'b', recommendation_text: 'Bravo row. Second.' })
      ]
    });
    const html = render();
    expect(html.indexOf('Alpha row.')).toBeGreaterThan(-1);
    expect(html.indexOf('Alpha row.')).toBeLessThan(html.indexOf('Bravo row.'));
    expect(html.split('aria-label="Dismiss and show the next recommendation"').length - 1).toBe(2);
    expect(html).toContain('Updated overnight');
  });

  it('empty: says so and links to the reorder inbox', () => {
    const html = render();
    expect(html).toContain('No inventory recommendations right now. The reorder inbox lists every suggestion the engine made.');
    expect(html).toContain('href="/inventory?tab=today"');
  });

  it('error: the Couldn’t-load + Retry pattern, never the empty copy', () => {
    setState({ isError: true, error: new Error('Request failed with status code 500') });
    const html = render();
    expect(html).toContain('load your recommendations right now.');
    expect(html).toContain('Retry');
    expect(html).not.toContain('No inventory recommendations');
  });

  it('renders the ongoing digest at the foot only when there is one', () => {
    setState({ recommendations: [pendingRec()], ongoing: [ongoing] });
    const html = render();
    expect(html).toContain('data-testid="ongoing-digest"');
    expect(html).toContain('Linen shirt keeps running low.');
    expect(html).toContain('12 days outstanding');
    expect(html.indexOf('Reorder the linen shirt.')).toBeLessThan(html.indexOf('data-testid="ongoing-digest"'));

    setState({ recommendations: [pendingRec()], ongoing: [] });
    expect(render()).not.toContain('data-testid="ongoing-digest"');
  });

  it('points an admin at Plan in one line under the header, above the rows', () => {
    setState({ recommendations: [pendingRec({ id: 'a', recommendation_text: 'Alpha row. First.' })] });
    const html = render();
    expect(html).toContain('Planning a whole season?');
    expect(html).toContain('href="/inventory/plan"');
    expect(html).toContain('>Open Plan</a>');
    expect(html.indexOf('Planning a whole season?')).toBeLessThan(html.indexOf('Alpha row.'));
  });

  it('keeps the Plan line on the empty and error states too', () => {
    expect(render()).toContain('href="/inventory/plan"');
    setState({ isError: true, error: new Error('boom') });
    expect(render()).toContain('href="/inventory/plan"');
  });

  it('never shows a member the Plan line, which would only meet a 403', () => {
    role.type = 'member';
    setState({ recommendations: [pendingRec()] });
    const html = render();
    expect(html).not.toContain('Planning a whole season?');
    expect(html).not.toContain('href="/inventory/plan"');
  });

  it('shows the digest under an empty list too', () => {
    setState({ ongoing: [ongoing] });
    const html = render();
    expect(html).toContain('No inventory recommendations right now.');
    expect(html).toContain('data-testid="ongoing-digest"');
  });
});
