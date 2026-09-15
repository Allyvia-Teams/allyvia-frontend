import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_LAYOUT_COMPANY_FALLBACK,
  ANALYTICS_LAYOUT_STORAGE_KEY,
  ANALYTICS_LAYOUT_STORAGE_KEY_LEGACY,
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
import type { LayoutV2 } from './layoutModel';

const COMPANY_ID = 'company_test_1';

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

function layoutV2(ids: string[], width: LayoutV2['widgets'][number]['w'] = 'full'): LayoutV2 {
  return {
    version: 2,
    widgets: ids.map((id) => ({ id, w: width }))
  };
}

function sampleLayouts(overrides: Partial<StoredAnalyticsLayouts> = {}): StoredAnalyticsLayouts {
  return {
    ...getDefaultLayouts(),
    ...overrides
  };
}

describe('analytics layout persistence (ALL-250 company-scoped v2)', () => {
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
      financial: layoutV2(['financial-kpis'])
    });

    const apiClient: PreferencesApiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          dashboard_layout: {
            [ANALYTICS_WIDGETS_LAYOUT_KEY]: {
              [COMPANY_ID]: serverLayouts
            }
          }
        }
      }),
      patch: vi.fn()
    };

    localStorage.setItem(
      ANALYTICS_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        [COMPANY_ID]: sampleLayouts({ financial: layoutV2(['financial-trends-chart']) })
      })
    );

    const resolved = await resolveInitialLayouts(apiClient, COMPANY_ID);

    expect(apiClient.get).toHaveBeenCalledWith('/user/preferences/');
    expect(resolved.financial.widgets.map((entry) => entry.id)).toEqual(['financial-kpis']);
    expect(resolved.financial.widgets.map((entry) => entry.id)).not.toContain('financial-trends-chart');
  });

  it('test_falls_back_to_localstorage_when_server_returns_null', async () => {
    const localLayouts = sampleLayouts({
      inventory: layoutV2(['inventory-kpis', 'inventory-treemap'])
    });
    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify({ [COMPANY_ID]: localLayouts }));

    const apiClient: PreferencesApiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          dashboard_layout: {}
        }
      }),
      patch: vi.fn()
    };

    const resolved = await resolveInitialLayouts(apiClient, COMPANY_ID);

    expect(resolved.inventory.widgets.map((entry) => entry.id)).toEqual(['inventory-kpis', 'inventory-treemap']);
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

    expect(loadLayoutsFromLocalStorage(COMPANY_ID)).toBeNull();

    const resolved = await resolveInitialLayouts(apiClient, COMPANY_ID);

    expect(resolved).toEqual(getDefaultLayouts());
  });

  it('test_stale_widget_id_is_filtered_out', async () => {
    const withStale = {
      financial: ['financial-kpis', 'stale-widget-id', 'financial-trends-chart'],
      inventory: ['gone-widget'],
      employee: ['employee-kpis'],
      crm: [],
      overview: ['overview-kpi-cards', 'not-a-real-widget']
    };

    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY_LEGACY, JSON.stringify(withStale));

    const fromLocal = loadLayoutsFromLocalStorage(COMPANY_ID);
    expect(fromLocal?.financial.widgets.map((entry) => entry.id)).toEqual(['financial-kpis', 'financial-trends-chart']);
    expect(fromLocal?.inventory.widgets.map((entry) => entry.id)).toEqual([]);
    expect(fromLocal?.overview.widgets.map((entry) => entry.id)).toEqual(['overview-kpi-cards']);

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

    const fromServer = await loadLayoutFromServer(apiClient, COMPANY_ID);
    expect(fromServer?.financial.widgets.map((entry) => entry.id)).toEqual(['financial-kpis', 'financial-trends-chart']);
    expect(fromServer?.inventory.widgets.map((entry) => entry.id)).toEqual([]);

    expect(
      sanitizeStoredLayouts({
        financial: ['financial-kpis', 'deleted-id']
      }).financial.widgets.map((entry) => entry.id)
    ).toEqual(['financial-kpis']);
  });

  it('test_saving_layout_calls_server_debounced', async () => {
    vi.useFakeTimers();

    const get = vi.fn().mockResolvedValue({
      data: {
        dashboard_layout: {
          theme_extra: true,
          [ANALYTICS_WIDGETS_LAYOUT_KEY]: {
            other_company: sampleLayouts()
          }
        }
      }
    });
    const patch = vi.fn().mockResolvedValue({ data: {} });
    const apiClient: PreferencesApiClient = { get, patch };

    const first = sampleLayouts({ financial: layoutV2(['financial-kpis']) });
    const second = sampleLayouts({ financial: layoutV2(['financial-kpis', 'financial-trends-chart']) });

    saveLayoutToServer(first, apiClient, COMPANY_ID);
    saveLayoutToServer(second, apiClient, COMPANY_ID);

    expect(patch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SERVER_SAVE_DEBOUNCE_MS - 1);
    expect(patch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    await Promise.resolve();

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith('/user/preferences/', {
      dashboard_layout: {
        theme_extra: true,
        [ANALYTICS_WIDGETS_LAYOUT_KEY]: {
          other_company: sampleLayouts(),
          [COMPANY_ID]: second
        }
      }
    });
  });

  it('migrates legacy unscoped server payload into LayoutV2', async () => {
    const apiClient: PreferencesApiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          dashboard_layout: {
            [ANALYTICS_WIDGETS_LAYOUT_KEY]: {
              financial: ['financial-kpis', 'financial-trends-chart']
            }
          }
        }
      }),
      patch: vi.fn()
    };

    const resolved = await loadLayoutFromServer(apiClient, ANALYTICS_LAYOUT_COMPANY_FALLBACK);
    expect(resolved?.financial.version).toBe(2);
    expect(resolved?.financial.widgets).toEqual([
      { id: 'financial-kpis', w: 'full' },
      { id: 'financial-trends-chart', w: 'full' }
    ]);
  });
});
