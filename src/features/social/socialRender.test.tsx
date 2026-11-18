import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// utils/axios cannot load under vitest's node environment.
vi.mock('api/social.api', () => ({ default: {}, SocialAPI: {} }));

import type { SocialProposal } from 'api/social.api';
import { InstagramCardView } from './InstagramCard';
import { PostEventsReviewView } from './PostEventsReview';
import { cardState } from './socialEvents';

const connection = {
  provider: 'instagram' as const,
  username: 'mirthmarket',
  connected_at: null,
  last_pulled_at: null,
  to_review: 0,
  configured: true
};

const proposal = (over: Partial<SocialProposal> = {}): SocialProposal => ({
  id: 'p1',
  status: 'proposed',
  kind: 'sale',
  kind_label: 'Sale',
  start_date: '2026-11-21',
  end_date: '2026-11-22',
  location_id: null,
  location_name: null,
  quote: '20% off all knitwear',
  post: {
    posted_at: '2026-11-12T15:02:11+00:00',
    caption: 'Winter Sale! 20% off all knitwear this weekend.',
    permalink: 'https://www.instagram.com/p/x/'
  },
  decided_by_email: null,
  decided_at: null,
  ...over
});

const card = (state: ReturnType<typeof cardState>) =>
  renderToStaticMarkup(<InstagramCardView state={state} onConnect={vi.fn()} onDisconnect={vi.fn()} />);

describe('the Instagram card renders each state', () => {
  it('renders nothing when hidden', () => {
    expect(card(cardState({ status: 404 }))).toBe('');
  });

  it('connect, connected, reconnect, not set up', () => {
    expect(card(cardState({ data: { ...connection, status: 'disconnected', username: null } }))).toContain('Connect Instagram');
    const on = card(cardState({ data: { ...connection, status: 'connected' } }));
    expect(on).toContain('Connected as @mirthmarket.');
    expect(on).toContain('Disconnect');
    expect(card(cardState({ data: { ...connection, status: 'needs_reconnect' } }))).toContain('Reconnect');
    const unset = card(cardState({ data: { ...connection, status: 'disconnected', configured: false } }));
    expect(unset).toContain('not set up on this server yet');
    expect(unset).not.toContain('<button');
  });
});

describe('the review list', () => {
  const view = (rows: SocialProposal[], status: 'loading' | 'error' | 'ready' = 'ready') =>
    renderToStaticMarkup(
      <PostEventsReviewView
        rows={rows}
        stores={[{ id: 'store-1', name: 'Uptown' }]}
        status={status}
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        onWithdraw={vi.fn()}
      />
    );

  it('shows the post, its highlighted words, a link to it, and Confirm and Dismiss', () => {
    const html = view([proposal()]);
    expect(html).toContain('Suggested from your posts.');
    expect(html).toContain('<mark');
    expect(html).toContain('20% off all knitwear</mark>');
    expect(html).toContain('href="https://www.instagram.com/p/x/"');
    expect(html).toContain('Confirm');
    expect(html).toContain('Dismiss');
    expect(html).not.toMatch(/proposal|\bAI\b|\bmodel\b/i);
    // An empty store reads "Every store", never a blank field (found on the walk).
    expect(html).toMatch(/>Every store</);
  });

  it('turns Confirm off and says why when the dates are not valid', () => {
    const html = view([proposal({ start_date: '2026-11-23', end_date: '2026-11-21' })]);
    expect(html).toContain('The last day is before the first.');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Confirm<\/button>/);
  });

  it('lists confirmed events with Withdraw', () => {
    const html = view([proposal({ status: 'confirmed', location_name: 'Uptown' })]);
    expect(html).toContain('Sale, Sat, Nov 21, 2026 to Sun, Nov 22, 2026, at Uptown.');
    expect(html).toContain('Withdraw');
    expect(html).toContain('Nothing to review right now.');
  });

  it('loads and fails without a blank page', () => {
    expect(view([], 'error')).toContain('the events from your posts');
    expect(view([], 'loading')).toContain('MuiSkeleton');
  });
});
