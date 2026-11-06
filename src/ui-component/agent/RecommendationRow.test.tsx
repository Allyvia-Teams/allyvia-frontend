// Static renders of the shared row (no DOM in this repo; renderToStaticMarkup
// is the precedent). Pins the one behaviour the move added: a row with
// onDismiss carries the swap X and drops FeedbackControls' own reason-chip X;
// a row without it is exactly the old row.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import RecommendationRow from './RecommendationRow';
import { pendingRec } from './recommendationFixtures';

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  );

const SWAP_X = 'aria-label="Dismiss and show the next recommendation"';
const REASON_X = 'aria-label="Dismiss recommendation"';

describe('RecommendationRow', () => {
  it('with onDismiss: one X, the swap one, beside thumbs and snooze', () => {
    const html = render(<RecommendationRow rec={pendingRec()} onDismiss={() => undefined} />);
    expect(html).toContain(SWAP_X);
    expect(html).not.toContain(REASON_X);
    expect(html).toContain('aria-label="Mark recommendation useful"');
    expect(html).toContain('aria-label="Mark recommendation not useful"');
    expect(html).toContain('aria-label="Snooze recommendation"');
    expect(html).toContain('Reorder the linen shirt.');
  });

  it('without onDismiss: the old row, reason-chip X and no swap X', () => {
    const html = render(<RecommendationRow rec={pendingRec()} />);
    expect(html).toContain(REASON_X);
    expect(html).not.toContain(SWAP_X);
  });

  it('disables the swap X while a dismissal is in flight, and only then', () => {
    const swapButton = (html: string) => html.slice(html.lastIndexOf('<button', html.indexOf(SWAP_X)), html.indexOf(SWAP_X));
    expect(swapButton(render(<RecommendationRow rec={pendingRec()} onDismiss={() => undefined} dismissing />))).toContain('disabled');
    expect(swapButton(render(<RecommendationRow rec={pendingRec()} onDismiss={() => undefined} />))).not.toContain('disabled');
  });
});
