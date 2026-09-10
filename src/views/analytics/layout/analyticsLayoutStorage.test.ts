import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import {
  ANALYTICS_LAYOUT_STORAGE_KEY,
  ANALYTICS_WIDGETS_LAYOUT_KEY,
  SERVER_SAVE_DEBOUNCE_MS,
  getDefaultLayouts,
  loadLayoutFromServer,
  loadLayoutsFromLocalStorage,
  resetServerSaveDebounce,
  resolveInitialLayouts,
  saveLayoutToServer,
  sanitizeStoredLayouts,
  type PreferencesApiClient,
  type StoredAnalyticsLayouts
} from './analyticsLayoutStorage';

function stubWebStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear()
  };
  (globalThis as any).localStorage = storage;
  return storage;
}

function sampleLayouts(overrides: Partial<StoredAnalyticsLayouts> = {}): StoredAnalyticsLayouts {
  return {
    ...getDefaultLayouts(),
    ...overrides
  };
}

describe('analytics layout persistence (ALL-144)', () => {
  beforeEach(() => {
    stubWebStorage();
    resetServerSaveDebounce();
    vi.useRealTimers();
  });

  afterEach(() => {
    resetServerSaveDebounce();
    vi.useRealTimers();
  });

  it('test_loads_from_server_on_mount', async () => {
    const serverLayouts = sampleLayouts({
      financial: ['financial-kpis']
    });

    const apiClient: PreferencesApiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          dashboard_layout: {
            [ANALYTICS_WIDGETS_LAYOUT_KEY]: serverLayouts
          }
        }
      }),
      patch: vi.fn()
    };

    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(sampleLayouts({ financial: ['financial-trends-chart'] })));

    const resolved = await resolveInitialLayouts(apiClient);

    expect(apiClient.get).toHaveBeenCalledWith('/user/preferences/');
    expect(resolved.financial).toEqual(['financial-kpis']);
    expect(resolved.financial).not.toContain('financial-trends-chart');
  });

  it('test_falls_back_to_localstorage_when_server_returns_null', async () => {
    const localLayouts = sampleLayouts({
      inventory: ['inventory-kpis', 'inventory-treemap']
    });
    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(localLayouts));

    const apiClient: PreferencesApiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          dashboard_layout: {}
        }
      }),
      patch: vi.fn()
    };

    const resolved = await resolveInitialLayouts(apiClient);

    expect(resolved.inventory).toEqual(['inventory-kpis', 'inventory-treemap']);
  });

  it('test_falls_back_to_default_when_both_empty', async () => {
    const apiClient: PreferencesApiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          dashboard_layout: {}
        }
      }),
      patch: vi.fn()
    };

    expect(loadLayoutsFromLocalStorage()).toBeNull();

    const resolved = await resolveInitialLayouts(apiClient);

    expect(resolved).toEqual(DEFAULT_LAYOUTS);
  });

  it('test_stale_widget_id_is_filtered_out', async () => {
    const withStale = {
      financial: ['financial-kpis', 'stale-widget-id', 'financial-trends-chart'],
      inventory: ['gone-widget'],
      employee: ['employee-kpis'],
      crm: [],
      overview: ['overview-kpi-cards', 'not-a-real-widget']
    };

    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(withStale));

    const fromLocal = loadLayoutsFromLocalStorage();
    expect(fromLocal?.financial).toEqual(['financial-kpis', 'financial-trends-chart']);
    expect(fromLocal?.inventory).toEqual([]);
    expect(fromLocal?.overview).toEqual(['overview-kpi-cards']);

    const apiClient: PreferencesApiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          dashboard_layout: {
            [ANALYTICS_WIDGETS_LAYOUT_KEY]: withStale
          }
        }
      }),
      patch: vi.fn()
    };

    const fromServer = await loadLayoutFromServer(apiClient);
    expect(fromServer?.financial).toEqual(['financial-kpis', 'financial-trends-chart']);
    expect(fromServer?.inventory).toEqual([]);

    expect(
      sanitizeStoredLayouts({
        financial: ['financial-kpis', 'deleted-id']
      }).financial
    ).toEqual(['financial-kpis']);
  });

  it('test_saving_layout_calls_server_debounced', async () => {
    vi.useFakeTimers();

    const patch = vi.fn().mockResolvedValue({ data: {} });
    const apiClient: PreferencesApiClient = {
      get: vi.fn(),
      patch
    };

    const first = sampleLayouts({ financial: ['financial-kpis'] });
    const second = sampleLayouts({ financial: ['financial-kpis', 'financial-trends-chart'] });

    saveLayoutToServer(first, apiClient);
    saveLayoutToServer(second, apiClient);

    expect(patch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SERVER_SAVE_DEBOUNCE_MS - 1);
    expect(patch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith('/user/preferences/', {
      dashboard_layout: {
        [ANALYTICS_WIDGETS_LAYOUT_KEY]: second
      }
    });
  });
});
