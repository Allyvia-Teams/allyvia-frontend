import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The slice imports the QuickBooks client, which pulls in axios and session
// storage; the reducer never calls it.
vi.mock('api/qb', () => ({ default: {} }));

import reducer, { fetchAllSyncStatus, initializeSyncFromCallback } from './syncProgress';
import type { SyncStatuses } from './syncProgress';

const QUEUED_AT = new Date('2026-11-11T12:00:00Z');

const fulfilled = (payload: SyncStatuses) => ({ type: fetchAllSyncStatus.fulfilled.type, payload });

const queued = () => reducer(undefined, initializeSyncFromCallback(['Account', 'Customer']));

describe('syncProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(QUEUED_AT);
  });
  afterEach(() => vi.useRealTimers());

  it('counts entities from the response, not a constant', () => {
    const state = reducer(
      undefined,
      fulfilled({
        Account: { status: 'completed', count: 1 },
        Customer: { status: 'in_progress', processed: 3 },
        Item: { status: 'pending' }
      })
    );
    expect(state.totalEntities).toBe(3);
    expect(state.completedCount).toBe(1);
    expect(state.isAnySyncing).toBe(true);
  });

  it('advances and clears as the status is re-read', () => {
    let state = queued();
    expect(state.totalEntities).toBe(2);
    state = reducer(state, fulfilled({ Account: { status: 'in_progress', processed: 5 }, Customer: { status: 'pending' } }));
    expect(state.isAnySyncing).toBe(true);
    expect(state.completedCount).toBe(0);
    state = reducer(
      state,
      fulfilled({
        Account: { status: 'completed', count: 5, completed_at: '2026-11-11T12:01:00Z' },
        Customer: { status: 'completed', count: 9, completed_at: '2026-11-11T12:02:00Z' }
      })
    );
    expect(state.completedCount).toBe(2);
    expect(state.isAnySyncing).toBe(false);
  });

  it('keeps a queued entity through a pending reading, or a completion from before the queue', () => {
    const state = reducer(
      queued(),
      fulfilled({ Account: { status: 'pending' }, Customer: { status: 'completed', count: 9, completed_at: '2026-11-10T08:00:00Z' } })
    );
    expect(state.statuses.Account.status).toBe('queued');
    expect(state.statuses.Customer.status).toBe('queued');
    expect(state.completedCount).toBe(0);
    expect(state.isAnySyncing).toBe(true);
  });

  it('lets a queued entity go once the server has not started it for 30 minutes', () => {
    const state = queued();
    vi.setSystemTime(new Date(QUEUED_AT.getTime() + 31 * 60 * 1000));
    const next = reducer(state, fulfilled({ Account: { status: 'pending' }, Customer: { status: 'pending' } }));
    expect(next.isAnySyncing).toBe(false);
  });
});
