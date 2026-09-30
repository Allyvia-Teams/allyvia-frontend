import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('utils/axios', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { getPrecedentsMonth } from './precedents.api';

describe('getPrecedentsMonth', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: { days: [] } });
  });

  it('asks for the month relative to the API base', async () => {
    await getPrecedentsMonth(2026, 8);
    expect(get.mock.calls[0][0]).toBe('/precedents/month/');
    expect(get.mock.calls[0][1].params).toEqual({ year: 2026, month: 8 });
  });

  it('sends the store header only when a store is chosen', async () => {
    await getPrecedentsMonth(2026, 8, 'store-1');
    expect(get.mock.calls[0][1].headers).toEqual({ 'X-Location-Id': 'store-1' });
  });

  it('omits the header entirely for All stores — an empty value would be a 404', async () => {
    await getPrecedentsMonth(2026, 8, '');
    await getPrecedentsMonth(2026, 8, null);
    expect('X-Location-Id' in get.mock.calls[0][1].headers).toBe(false);
    expect('X-Location-Id' in get.mock.calls[1][1].headers).toBe(false);
  });
});
