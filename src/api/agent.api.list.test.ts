import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());
vi.mock('utils/axios', () => ({ default: { get } }));

import { AgentAPI } from './agent.api';

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: { recommendations: [] } });
});

describe('AgentAPI.Recommendations.list', () => {
  it('a bare call is exactly the old request: no params, no headers', async () => {
    await AgentAPI.Recommendations.list();
    expect(get).toHaveBeenCalledWith('/agent/recommendations/pending/', undefined);
  });

  it('keeps sending surface and limit as query params', async () => {
    await AgentAPI.Recommendations.list({ surface: 'dashboard', limit: 1 });
    expect(get).toHaveBeenCalledWith('/agent/recommendations/pending/', { params: { surface: 'dashboard', limit: 1 } });
  });

  it('sends one store as X-Location-Id, and only when there is one', async () => {
    await AgentAPI.Recommendations.list({ locationId: 'store-1' });
    expect(get).toHaveBeenLastCalledWith('/agent/recommendations/pending/', { headers: { 'X-Location-Id': 'store-1' } });
    await AgentAPI.Recommendations.list({ surface: 'inventory', locationId: 'store-1' });
    expect(get).toHaveBeenLastCalledWith('/agent/recommendations/pending/', {
      params: { surface: 'inventory' },
      headers: { 'X-Location-Id': 'store-1' }
    });
  });
});
