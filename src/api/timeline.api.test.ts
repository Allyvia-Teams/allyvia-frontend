import { beforeEach, describe, expect, it, vi } from 'vitest';

// utils/axios reads localStorage at load and cannot be imported under vitest's node environment.
const get = vi.fn();
vi.mock('utils/axios', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { TimelineAPI, isStoreRefused, timelineHeaders, timelineRefusal } from './timeline.api';

beforeEach(() => get.mockReset().mockResolvedValue({ data: { days: [] } }));

describe('TimelineAPI.get', () => {
  it('sends the store as X-Location-Id and the range as the query', async () => {
    await TimelineAPI.get({ start: '2026-08-20', end: '2027-01-17', locationId: 'store-1' });
    expect(get).toHaveBeenCalledWith('/precedents/timeline/', {
      params: { start: '2026-08-20', end: '2027-01-17' },
      headers: { 'X-Location-Id': 'store-1' }
    });
  });

  it('sends no header for all stores', async () => {
    for (const locationId of [null, undefined, '']) {
      get.mockClear();
      await TimelineAPI.get({ start: 'a', end: 'b', locationId });
      expect(get.mock.calls[0][1].headers).toEqual({});
    }
    expect(timelineHeaders(null)).toEqual({});
  });
});

describe('refusals', () => {
  it('reads the server sentence from a 400', () => {
    expect(timelineRefusal({ response: { status: 400, data: { detail: 'Ask for 400 days or fewer at a time.' } } })).toBe(
      'Ask for 400 days or fewer at a time.'
    );
    expect(timelineRefusal({ response: { status: 500, data: { detail: 'x' } } })).toBeNull();
    expect(timelineRefusal(new Error('network'))).toBeNull();
  });

  it('reads a 404 as a store this role does not have', () => {
    expect(isStoreRefused({ response: { status: 404 } })).toBe(true);
    expect(isStoreRefused({ response: { status: 500 } })).toBe(false);
  });
});
