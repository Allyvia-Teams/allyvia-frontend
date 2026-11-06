// The dashboard's single slot, rendered statically from a hand-built state.
// Pins the F1 surfacing rules: one row even when handed several (the backend
// ranks; the client never re-sorts), the swap X, the by-sector caption, and
// the two new messages.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import { pendingRec } from 'ui-component/agent/recommendationFixtures';
import { RecommendationCard } from './RecommendationCard';
import type { RecommendationsState } from './useRecommendations';

const baseState = (overrides: Partial<RecommendationsState> = {}): RecommendationsState =>
  ({
    recommendations: [],
    alerts: [],
    innerCirclePending: 0,
    remainingBySector: {},
    totalLive: undefined,
    isLoading: false,
    isError: false,
    listError: null,
    refetch: vi.fn(),
    generate: vi.fn(),
    working: false,
    polling: false,
    statusText: '',
    generateFailed: false,
    notSurfacedReason: null,
    alreadyGenerated: false,
    dismiss: vi.fn(),
    dismissing: false,
    dismissFailed: false,
    dismissedSome: false,
    ...overrides
  }) as RecommendationsState;

const render = (state: RecommendationsState) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <RecommendationCard state={state} />
      </MemoryRouter>
    </QueryClientProvider>
  );

const first = pendingRec({ id: 'p-1', recommendation_text: 'First pick. Ranked top.', urgency_score: 0.2, sector: 'finance' });
const second = pendingRec({ id: 'p-2', recommendation_text: 'Second pick. More urgent.', urgency_score: 1 });

describe('RecommendationCard (dashboard slot)', () => {
  it('renders only the first row as returned, never re-sorting by urgency', () => {
    const html = render(baseState({ recommendations: [first, second] }));
    expect(html).toContain('First pick.');
    expect(html).not.toContain('Second pick.');
    expect(html.split('aria-label="Dismiss and show the next recommendation"').length - 1).toBe(1);
  });

  it('captions the other live rows by sector, taking the shown row out of its own', () => {
    const html = render(baseState({ recommendations: [first], remainingBySector: { inventory: 3, staffing: 1, finance: 1, general: 2 } }));
    expect(html).toContain('3 more in Inventory');
    expect(html).toContain('1 in Scheduling');
    expect(html).not.toContain('in Finance');
    expect(html).toContain('href="/inventory/insights?tab=recommendations"');
    expect(html).toContain('href="/scheduling"');
  });

  it('shows no caption against a backend without remaining_by_sector', () => {
    const html = render(baseState({ recommendations: [first] }));
    expect(html).not.toContain('data-testid="remaining-by-sector"');
  });

  it('says so when generate found today’s recommendation already there, keeping the row', () => {
    const html = render(baseState({ recommendations: [first], alreadyGenerated: true }));
    expect(html).toContain('Today&#x27;s recommendation is already here.');
    expect(html).toContain('First pick.');
  });

  it('says "Finding the next one" in the note while dismissing', () => {
    const html = render(baseState({ recommendations: [first], dismissing: true }));
    expect(html).toContain('Finding the next one');
  });

  it('after the last row is dismissed: the last-one message with Run again', () => {
    const html = render(baseState({ recommendations: [], dismissedSome: true }));
    expect(html).toContain('That was the last one for today.');
    expect(html).toContain('Run again');
    expect(html).not.toContain('Nothing surfaced yet');
  });
});
