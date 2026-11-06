import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

// fetchInventoryItems loads the whole catalogue so the table can search and
// paginate client-side. It used to walk the pages one request at a time and
// show nothing until the last one landed: 65 serial requests, ~32s of an empty
// "No rows" table for a 6,482-item company on staging. Now page 1 says how many
// pages there are, the rest go out a few at a time, and the slice reports
// progress while they do.

vi.mock('api/inventory.api', () => ({
  getSummary: vi.fn(),
  getTrends: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  getItemDetails: vi.fn(),
  getItemByBarcode: vi.fn(),
  uploadCsvV1: vi.fn(),
  downloadCsvTemplateV1: vi.fn(),
  getInventoryItems: vi.fn()
}));

import { getInventoryItems } from 'api/inventory.api';
import inventoryReducer, { fetchInventoryItems, INVENTORY_FETCH_CONCURRENCY } from './inventory';

const mockedGet = vi.mocked(getInventoryItems);
const PAGE_SIZE = 100;

function makeStore() {
  return configureStore({
    reducer: {
      inventory: inventoryReducer,
      auth: () => ({ currentRole: { company_id: 'co-1' } })
    }
  });
}

function legacyItem(id: number) {
  return {
    id,
    name: `Item ${id}`,
    sku: `SKU-${id}`,
    description: '',
    quantity_on_hand: 1,
    unit_price: '10.00',
    cost_price: '4.00',
    is_active: true
  };
}

function pageResponse(page: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const count = Math.max(0, Math.min(PAGE_SIZE, totalItems - start));
  return {
    items: Array.from({ length: count }, (_, i) => legacyItem(start + i + 1)),
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_items: totalItems,
      page_size: PAGE_SIZE,
      has_next: page < totalPages,
      has_previous: page > 1
    }
  };
}

/** A server whose responses the test releases by hand, so it can see what is in flight. */
function deferredServer(totalItems: number) {
  const pending = new Map<number, () => void>();
  mockedGet.mockImplementation(
    (_company: string, page = 1) =>
      new Promise((resolve) => {
        pending.set(page, () => resolve(pageResponse(page, totalItems) as any));
      })
  );
  return {
    inFlight: () => [...pending.keys()].sort((a, b) => a - b),
    release(page: number) {
      const go = pending.get(page);
      if (!go) throw new Error(`page ${page} is not in flight`);
      pending.delete(page);
      go();
    }
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockedGet.mockReset();
});

describe('fetchInventoryItems', () => {
  it('makes one request when everything fits on the first page', async () => {
    mockedGet.mockImplementation(async (_c: string, page = 1) => pageResponse(page, 42) as any);
    const store = makeStore();

    await store.dispatch(fetchInventoryItems());

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('co-1', 1, PAGE_SIZE);
    const state = store.getState().inventory;
    expect(state.items).toHaveLength(42);
    expect(state.pagination.total_items).toBe(42);
    expect(state.itemsLoading).toBe(false);
  });

  it('requests the remaining pages concurrently, never more than the limit at once', async () => {
    const server = deferredServer(950); // 10 pages
    const store = makeStore();
    const done = store.dispatch(fetchInventoryItems());

    await flush();
    expect(server.inFlight()).toEqual([1]);
    server.release(1);
    await flush();

    // Pages 2.. go out together, capped.
    expect(server.inFlight()).toHaveLength(INVENTORY_FETCH_CONCURRENCY);
    expect(server.inFlight()[0]).toBe(2);

    // Finishing one lets the next start, keeping the window full.
    server.release(2);
    await flush();
    expect(server.inFlight()).toHaveLength(INVENTORY_FETCH_CONCURRENCY);

    while (server.inFlight().length) {
      // Release the newest first so pages complete out of order.
      server.release(server.inFlight().at(-1)!);
      await flush();
    }
    await done;

    expect(mockedGet).toHaveBeenCalledTimes(10);
    const state = store.getState().inventory;
    // Out-of-order arrivals still land in server order.
    expect(state.items.map((i) => i.id)).toEqual(Array.from({ length: 950 }, (_, i) => String(i + 1)));
    expect(state.pagination.total_items).toBe(950);
    expect(state.itemsLoading).toBe(false);
  });

  it('reports how many items have arrived while the rest are loading', async () => {
    const server = deferredServer(950);
    const store = makeStore();
    const done = store.dispatch(fetchInventoryItems());

    await flush();
    expect(store.getState().inventory.itemsLoading).toBe(true);
    expect(store.getState().inventory.itemsLoadProgress).toEqual({ loaded: 0, total: null });

    server.release(1);
    await flush();
    expect(store.getState().inventory.itemsLoadProgress).toEqual({ loaded: 100, total: 950 });

    server.release(3);
    await flush();
    expect(store.getState().inventory.itemsLoadProgress).toEqual({ loaded: 200, total: 950 });

    while (server.inFlight().length) {
      server.release(server.inFlight()[0]);
      await flush();
    }
    await done;
    expect(store.getState().inventory.itemsLoadProgress).toEqual({ loaded: 950, total: 950 });
  });

  it('stays loading while the summary call settles first', async () => {
    // `loading` is shared with the summary thunk, whose fulfilled clears it.
    // The table must key off its own flag or it shows "No rows" mid-load.
    const server = deferredServer(250);
    const store = makeStore();
    const done = store.dispatch(fetchInventoryItems());
    await flush();

    store.dispatch({ type: 'inventory/fetchSummary/fulfilled', payload: {} });
    expect(store.getState().inventory.loading).toBe(false);
    expect(store.getState().inventory.itemsLoading).toBe(true);

    while (server.inFlight().length) {
      server.release(server.inFlight()[0]);
      await flush();
    }
    await done;
    expect(store.getState().inventory.itemsLoading).toBe(false);
  });

  it('fails the whole load when any page fails, without leaving a partial table', async () => {
    mockedGet.mockImplementation(async (_c: string, page = 1) => {
      if (page === 4) throw new Error('boom');
      return pageResponse(page, 950) as any;
    });
    const store = makeStore();

    const result = await store.dispatch(fetchInventoryItems());

    expect(result.type).toBe('inventory/fetchItems/rejected');
    const state = store.getState().inventory;
    expect(state.items).toEqual([]);
    expect(state.itemsLoading).toBe(false);
    expect(state.error).toBe('boom');
  });

  it('ignores progress from a load that a newer one replaced', async () => {
    const server = deferredServer(950);
    const store = makeStore();
    const first = store.dispatch(fetchInventoryItems());
    await flush();
    server.release(1);
    await flush();
    expect(store.getState().inventory.itemsLoadProgress.loaded).toBe(100);

    // A refresh starts a second load; the first's pages are still in flight.
    const firstPending = server.inFlight();
    const second = store.dispatch(fetchInventoryItems());
    await flush();
    expect(store.getState().inventory.itemsLoadProgress).toEqual({ loaded: 0, total: null });

    server.release(firstPending[0]);
    await flush();
    expect(store.getState().inventory.itemsLoadProgress).toEqual({ loaded: 0, total: null });

    first.abort();
    second.abort();
  });
});
