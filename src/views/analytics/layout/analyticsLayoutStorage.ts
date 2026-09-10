import type { AxiosInstance } from 'axios';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import { WIDGET_DEFINITIONS } from '../registry/widgetDefinitions';
import type { AnalyticsTab, AnalyticsTabLayout } from '../registry/types';

export const ANALYTICS_LAYOUT_STORAGE_KEY = 'allyvia_analytics_layout_v1';
export const ANALYTICS_WIDGETS_LAYOUT_KEY = 'analytics_widgets_v1';
export const SERVER_SAVE_DEBOUNCE_MS = 1000;

const PREFERENCES_PATH = '/user/preferences/';

/** Same IDs as ANALYTICS_WIDGET_REGISTRY; definitions stay import-safe for unit tests. */
const VALID_WIDGET_IDS = new Set(WIDGET_DEFINITIONS.map((definition) => definition.id));
const ANALYTICS_TABS = Object.keys(DEFAULT_LAYOUTS) as AnalyticsTab[];

export type StoredAnalyticsLayouts = Record<AnalyticsTab, AnalyticsTabLayout>;

export type PreferencesApiClient = Pick<AxiosInstance, 'get' | 'patch'>;

function sanitizeLayout(layout: unknown): AnalyticsTabLayout {
  if (!Array.isArray(layout)) {
    return [];
  }

  return layout.filter((widgetId): widgetId is string => typeof widgetId === 'string' && VALID_WIDGET_IDS.has(widgetId));
}

export function sanitizeStoredLayouts(partial: Partial<Record<AnalyticsTab, unknown>>): StoredAnalyticsLayouts {
  const layouts = getDefaultLayouts();

  for (const tab of ANALYTICS_TABS) {
    if (partial[tab] !== undefined) {
      layouts[tab] = sanitizeLayout(partial[tab]);
    }
  }

  return layouts;
}

function hasAnyTab(partial: Partial<Record<AnalyticsTab, unknown>>): boolean {
  return ANALYTICS_TABS.some((tab) => partial[tab] !== undefined);
}

export function getDefaultLayouts(): StoredAnalyticsLayouts {
  return {
    financial: [...DEFAULT_LAYOUTS.financial],
    inventory: [...DEFAULT_LAYOUTS.inventory],
    employee: [...DEFAULT_LAYOUTS.employee],
    crm: [...DEFAULT_LAYOUTS.crm],
    overview: [...DEFAULT_LAYOUTS.overview]
  };
}

/** Returns null when localStorage has no saved layout. */
export function loadLayoutsFromLocalStorage(): StoredAnalyticsLayouts | null {
  try {
    const raw = localStorage.getItem(ANALYTICS_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<Record<AnalyticsTab, unknown>>;
    if (!hasAnyTab(parsed)) {
      return null;
    }

    return sanitizeStoredLayouts(parsed);
  } catch {
    return null;
  }
}

/** Back-compat helper: localStorage layout or defaults. */
export function loadStoredLayouts(): StoredAnalyticsLayouts {
  return loadLayoutsFromLocalStorage() ?? getDefaultLayouts();
}

export function saveStoredLayouts(layouts: StoredAnalyticsLayouts): void {
  try {
    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

/**
 * Fetches GET /user/preferences/ and reads dashboard_layout.analytics_widgets_v1.
 * Returns null when the nested key is missing.
 */
export async function loadLayoutFromServer(apiClient: PreferencesApiClient): Promise<StoredAnalyticsLayouts | null> {
  try {
    const { data } = await apiClient.get(PREFERENCES_PATH);
    const nested = data?.dashboard_layout?.[ANALYTICS_WIDGETS_LAYOUT_KEY];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
      return null;
    }

    const partial = nested as Partial<Record<AnalyticsTab, unknown>>;
    if (!hasAnyTab(partial)) {
      return null;
    }

    return sanitizeStoredLayouts(partial);
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingServerLayout: StoredAnalyticsLayouts | null = null;

/** Test helper to clear the debounce timer between cases. */
export function resetServerSaveDebounce(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingServerLayout = null;
}

/**
 * PATCH /user/preferences/ with dashboard_layout.analytics_widgets_v1.
 * Debounced by 1000ms so rapid add/remove does not spam the API.
 */
export function saveLayoutToServer(layout: StoredAnalyticsLayouts, apiClient: PreferencesApiClient): void {
  pendingServerLayout = layout;

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    const layoutToSave = pendingServerLayout;
    pendingServerLayout = null;
    saveTimer = null;

    if (!layoutToSave) {
      return;
    }

    void apiClient
      .patch(PREFERENCES_PATH, {
        dashboard_layout: {
          [ANALYTICS_WIDGETS_LAYOUT_KEY]: layoutToSave
        }
      })
      .catch(() => {
        // Persistence failures should not break the UI; localStorage remains source of truth offline.
      });
  }, SERVER_SAVE_DEBOUNCE_MS);
}

/**
 * Server → localStorage → defaults. Stale widget IDs are filtered in sanitizeStoredLayouts.
 */
export async function resolveInitialLayouts(apiClient: PreferencesApiClient): Promise<StoredAnalyticsLayouts> {
  const fromServer = await loadLayoutFromServer(apiClient);
  if (fromServer) {
    return fromServer;
  }

  const fromLocal = loadLayoutsFromLocalStorage();
  if (fromLocal) {
    return fromLocal;
  }

  return getDefaultLayouts();
}
