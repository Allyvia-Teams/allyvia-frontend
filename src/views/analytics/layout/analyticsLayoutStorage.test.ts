import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import {
  ANALYTICS_LAYOUT_STORAGE_KEY,
  SAVE_DEBOUNCE_MS,
  getDefaultLayouts,
  loadStoredLayouts,
  resetRemoteSaveDebounce,
  saveStoredLayouts,
  scheduleRemoteLayoutSave,
  type StoredAnalyticsLayouts
} from './analyticsLayoutStorage';
import { sanitizeLayouts } from './analyticsLayoutRules';
import type { LayoutV2 } from './layoutModel';

const { layoutSaveMock } = vi.hoisted(() => ({
  layoutSaveMock: vi.fn().mockResolvedValue({})
}));

vi.mock('api/analytics.api', () => ({
  AnalyticsAPI: {
    Layout: {
      get: vi.fn().mockResolvedValue({}),
      save: layoutSaveMock
    }
  }
}));

// vitest runs in the node environment here, so stand up the minimum of the
// storage API these helpers touch.
function installStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear()
  });
  return data;
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

function idsOf(layout: LayoutV2) {
  return layout.widgets.map((entry) => entry.id);
}

beforeEach(() => {
  installStorage();
  resetRemoteSaveDebounce();
  layoutSaveMock.mockClear();
  layoutSaveMock.mockResolvedValue({});
  vi.useRealTimers();
});

afterEach(() => {
  resetRemoteSaveDebounce();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('analytics layout cache (ALL-144 shared devices + ALL-250 LayoutV2)', () => {
  it('round-trips a LayoutV2 layout for the signed-in user', () => {
    installStorage({ email: 'owner@example.com' });

    const layouts = sampleLayouts({ financial: layoutV2(['financial-kpis'], 'half') });
    saveStoredLayouts(layouts);

    expect(loadStoredLayouts().financial).toEqual({
      version: 2,
      widgets: [{ id: 'financial-kpis', w: 'half' }]
    });
  });

  // The reason the layout is stored server-side at all: a kiosk is shared, so
  // a cache with no owner check would hand the next person the previous
  // person's arrangement.
  it('ignores a cache written by a different user', () => {
    installStorage({ email: 'first@example.com' });
    saveStoredLayouts(sampleLayouts({ financial: layoutV2(['financial-kpis']) }));

    installStorage({
      email: 'second@example.com',
      [ANALYTICS_LAYOUT_STORAGE_KEY]: JSON.stringify({
        owner: 'first@example.com',
        layouts: sampleLayouts({ financial: layoutV2(['financial-kpis']) })
      })
    });

    expect(loadStoredLayouts()).toEqual(getDefaultLayouts());
  });

  it('discards a pre-envelope cache that records no owner', () => {
    installStorage({
      email: 'owner@example.com',
      [ANALYTICS_LAYOUT_STORAGE_KEY]: JSON.stringify({ financial: ['financial-kpis'] })
    });

    expect(loadStoredLayouts()).toEqual(getDefaultLayouts());
  });

  it('returns defaults when nothing is cached', () => {
    expect(loadStoredLayouts()).toEqual(getDefaultLayouts());
  });

  it('returns defaults for malformed JSON rather than throwing', () => {
    installStorage({ email: 'owner@example.com', [ANALYTICS_LAYOUT_STORAGE_KEY]: '{not json' });

    expect(loadStoredLayouts()).toEqual(getDefaultLayouts());
  });

  it('upgrades a v1 string[] envelope to LayoutV2 on load', () => {
    installStorage({
      email: 'owner@example.com',
      [ANALYTICS_LAYOUT_STORAGE_KEY]: JSON.stringify({
        owner: 'owner@example.com',
        layouts: { ...DEFAULT_LAYOUTS, financial: ['financial-kpis'] }
      })
    });

    const loaded = loadStoredLayouts();
    expect(loaded.financial.version).toBe(2);
    expect(loaded.financial.widgets).toEqual([{ id: 'financial-kpis', w: 'full' }]);
  });

  it('drops stale widget ids held in the cache (via normalizeLayout / sanitize)', () => {
    installStorage({
      email: 'owner@example.com',
      [ANALYTICS_LAYOUT_STORAGE_KEY]: JSON.stringify({
        owner: 'owner@example.com',
        layouts: { financial: ['financial-kpis', 'widget-removed-last-release'] }
      })
    });

    expect(idsOf(loadStoredLayouts().financial)).toEqual(['financial-kpis']);
  });

  it('survives storage being unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    });

    expect(loadStoredLayouts()).toEqual(getDefaultLayouts());
    expect(() => saveStoredLayouts(getDefaultLayouts())).not.toThrow();
  });
});

describe('layout migration + remote save (ALL-250 on ALL-144 API)', () => {
  it('sanitizeLayouts migrates a legacy unscoped v1 payload into LayoutV2', () => {
    const resolved = sanitizeLayouts({
      financial: ['financial-kpis', 'financial-trends-chart']
    });

    expect(resolved.financial.version).toBe(2);
    expect(resolved.financial.widgets).toEqual([
      { id: 'financial-kpis', w: 'full' },
      { id: 'financial-trends-chart', w: 'full' }
    ]);
  });

  it('stale widget id is filtered out by normalizeLayout via sanitizeLayouts', () => {
    const withStale = {
      financial: ['financial-kpis', 'stale-widget-id', 'financial-trends-chart'],
      inventory: ['gone-widget'],
      employee: ['employee-kpis'],
      crm: [],
      overview: ['overview-kpi-cards', 'not-a-real-widget']
    };

    const sanitized = sanitizeLayouts(withStale);

    expect(idsOf(sanitized.financial)).toEqual(['financial-kpis', 'financial-trends-chart']);
    expect(idsOf(sanitized.inventory)).toEqual([]);
    expect(idsOf(sanitized.overview)).toEqual(['overview-kpi-cards']);
    expect(sanitized.crm).toEqual({ version: 2, widgets: [] });
  });

  it('saving layout calls AnalyticsAPI.Layout.save debounced', async () => {
    vi.useFakeTimers();

    const first = sampleLayouts({ financial: layoutV2(['financial-kpis']) });
    const second = sampleLayouts({ financial: layoutV2(['financial-kpis', 'financial-trends-chart']) });

    scheduleRemoteLayoutSave(first);
    scheduleRemoteLayoutSave(second);

    expect(layoutSaveMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 1);
    expect(layoutSaveMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(layoutSaveMock).toHaveBeenCalledTimes(1);
    expect(layoutSaveMock).toHaveBeenCalledWith(second);
  });
});
