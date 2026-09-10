import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SavingsWidget } from './SavingsWidget';

const state = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: state.data, isLoading: false, isError: false }) }));
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
  });
});
