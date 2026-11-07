import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real thunk and reducers, driven against a fake backend. The API module is
// mocked whole, so nothing here touches axios or web storage.
const getInventoryItems = vi.fn();
vi.mock('api/inventory.api', () => ({
  getInventoryItems: (...args: unknown[]) => getInventoryItems(...args),
  getSummary: vi.fn(),
  getTrends: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  getItemDetails: vi.fn(),
  getItemByBarcode: vi.fn(),
  uploadCsvV1: vi.fn(),
  downloadCsvTemplateV1: vi.fn()
}));

const { default: inventoryReducer, fetchInventoryItems } = await import('./inventory');

const COMPANY = 'company-a';
const PAGE = 100;

function row(id: number) {
  return { id, name: `Item ${id}`, sku: `SKU-${id}`, quantity_on_hand: 1, unit_price: '10.00', cost_price: '4.00', is_active: true };
}

/** `total` rows served 100 a page; each page waits for `gate(page)` if given. */
function serve(total: number, gate?: (page: number) => Promise<void>) {
  const pages = Math.ceil(total / PAGE);
  getInventoryItems.mockImplementation(async (_company: string, page: number) => {
    if (gate) await gate(page);
    const start = (page - 1) * PAGE;
    const items = Array.from({ length: Math.max(0, Math.min(PAGE, total - start)) }, (_, i) => row(start + i));
    return { items, pagination: { total_items: total, total_pages: pages, has_next: page < pages } };
  });
}

function makeStore() {
  const auth = (state = { currentRole: { company_id: COMPANY } }) => state;
  return configureStore({
    reducer: combineReducers({ inventory: inventoryReducer, auth }),
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false })
  });
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  getInventoryItems.mockReset();
});

describe('fetchInventoryItems (the All Items walk)', () => {
  it('loads every page and records the catalogue size', async () => {
    serve(650);
    const store = makeStore();
    await store.dispatch(fetchInventoryItems());
    const state = store.getState().inventory;
    expect(state.items).toHaveLength(650);
    expect(state.itemsTotal).toBe(650);
    expect(state.itemsWalking).toBe(false);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('shows page 1 while the rest are still loading', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    serve(650, (page) => (page === 1 ? Promise.resolve() : held));
    const store = makeStore();
    const walk = store.dispatch(fetchInventoryItems());
    await tick();
    await tick();
    const mid = store.getState().inventory;
    expect(mid.items).toHaveLength(100);
    expect(mid.itemsTotal).toBe(650);
    expect(mid.itemsWalking).toBe(true);
    release();
    await walk;
    expect(store.getState().inventory.items).toHaveLength(650);
  });

  it('keeps the previous full list on screen during a revisit instead of shrinking to page 1', async () => {
    serve(650);
    const store = makeStore();
    await store.dispatch(fetchInventoryItems());
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    serve(650, (page) => (page === 1 ? Promise.resolve() : held));
    const walk = store.dispatch(fetchInventoryItems({ reuseInFlight: true }));
    await tick();
    await tick();
    expect(store.getState().inventory.items).toHaveLength(650);
    release();
    await walk;
  });

  it('a page-mount dispatch reuses the walk already running instead of starting a second', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    serve(300, () => held);
    const store = makeStore();
    const first = store.dispatch(fetchInventoryItems({ reuseInFlight: true }));
    const second = store.dispatch(fetchInventoryItems({ reuseInFlight: true }));
    await tick();
    expect(getInventoryItems).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(store.getState().inventory.items).toHaveLength(300);
  });

  it('a refresh (no reuse) starts a fresh walk, and the superseded walk cannot overwrite it', async () => {
    let releaseOld!: () => void;
    const oldHeld = new Promise<void>((resolve) => (releaseOld = resolve));
    // A one-page catalogue for the stale walk, so its result (100 rows) differs
    // from the fresh one's (300) whatever the mock is serving when it resumes.
    serve(100, () => oldHeld);
    const store = makeStore();
    const stale = store.dispatch(fetchInventoryItems({ reuseInFlight: true }));
    await tick();
    serve(300);
    await store.dispatch(fetchInventoryItems());
    expect(store.getState().inventory.items).toHaveLength(300);
    releaseOld();
    await stale;
    expect(store.getState().inventory.items).toHaveLength(300);
    expect(store.getState().inventory.itemsTotal).toBe(300);
  });

  it('an aborted walk (the page was left) clears loading and reports no error', async () => {
    const never = new Promise<void>(() => undefined);
    serve(6000, () => never);
    const store = makeStore();
    const walk = store.dispatch(fetchInventoryItems({ reuseInFlight: true }));
    walk.abort();
    await walk;
    const state = store.getState().inventory;
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.itemsWalking).toBe(false);
  });

  it('a real failure still lands in error, as before (ALL-103)', async () => {
    getInventoryItems.mockRejectedValue(new Error('Network Error'));
    const store = makeStore();
    await store.dispatch(fetchInventoryItems());
    const state = store.getState().inventory;
    expect(state.error).toBe('Network Error');
    expect(state.loading).toBe(false);
    expect(state.itemsWalking).toBe(false);
  });
});
