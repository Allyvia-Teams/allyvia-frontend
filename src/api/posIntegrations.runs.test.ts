import { beforeEach, describe, expect, it, vi } from 'vitest';

// See posIntegrations.oauth.test.ts: utils/axios cannot load under node, so the
// transport is mocked and the request itself is asserted.
const get = vi.fn();

vi.mock('utils/axios', () => ({
  default: {
    get: (...args: unknown[]) => get(...args)
  }
}));

import { listRuns } from './posIntegrations.api';

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: [] });
});

describe('listRuns', () => {
  it('asks for one connection’s merchant imports only', async () => {
    await listRuns('conn-1', { kind: 'initial' });

    const [url, config] = get.mock.calls[0];
    expect(url).toBe('/integrations/runs/');
    expect(config).toEqual({ params: { connection: 'conn-1', kind: 'initial' } });
  });

  it('keeps the unfiltered request when no kind is asked for', async () => {
    await listRuns('conn-1');
    expect(get.mock.calls[0][1]).toEqual({ params: { connection: 'conn-1' } });

    await listRuns();
    expect(get.mock.calls[1][1]).toEqual({ params: undefined });
  });
});
