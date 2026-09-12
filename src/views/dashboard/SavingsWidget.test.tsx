import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SavingsWidget } from './SavingsWidget';

const state = vi.hoisted(() => ({ data: {} as Record<string, unknown> | undefined, isError: false }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: state.data, isLoading: false, isError: state.isError, refetch: () => undefined })
}));
vi.mock('api/agent.api', () => ({ AgentAPI: { Savings: {} } }));

describe('verified savings display', () => {
  it('withholds a positive total until the server launch gate clears', () => {
    state.data = {
      window: 'ytd',
      realized_total_dollars: '987.65',
      recommendation_count: 1,
      by_type: {},
      by_signal: {},
      gate: { met: false, verified_recommendations: 1, required: 3 }
    };
    const html = renderToStaticMarkup(<SavingsWidget />);
    expect(html).not.toContain('$988');
    // The rail card still names the figure it is withholding and how far the gate is.
    expect(html).toContain('$0');
    expect(html).toContain('1 of 3 recommendations verified');
    expect(html).toContain('role="progressbar"');
  });

  it('shows the total, its window and its count once the gate is met', () => {
    state.data = {
      window: 'ytd',
      realized_total_dollars: '987.65',
      recommendation_count: 4,
      by_type: { reorder: '600.00', staffing: '387.65' },
      by_signal: {},
      gate: { met: true, verified_recommendations: 4, required: 3 }
    };
    const html = renderToStaticMarkup(<SavingsWidget />);
    expect(html).toContain('$988');
    expect(html).toContain('verified · year to date');
    expect(html).toContain('From 4 recommendations you acted on.');
    expect(html).not.toContain('role="progressbar"');
  });

  it('keeps its seat and says so when the ledger cannot be loaded', () => {
    state.data = undefined;
    state.isError = true;
    const html = renderToStaticMarkup(<SavingsWidget />);
    expect(html).toContain('Verified savings');
    expect(html).toContain('load verified savings');
    expect(html).toContain('Retry');
    expect(html).not.toContain('$0');
    state.isError = false;
  });
});
