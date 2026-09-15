import type { AxiosInstance } from 'axios';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import { WIDGET_DEFINITIONS } from '../registry/widgetDefinitions';
import type { AnalyticsTab } from '../registry/types';
import { normalizeLayout, resetLayout, type LayoutV2, type WidgetRegistry } from './layoutModel';

export const ANALYTICS_LAYOUT_STORAGE_KEY = 'allyvia_analytics_layout_v2';
/** Legacy unscoped key from ALL-143/144 — read for migration only. */
export const ANALYTICS_LAYOUT_STORAGE_KEY_LEGACY = 'allyvia_analytics_layout_v1';
export const ANALYTICS_WIDGETS_LAYOUT_KEY = 'analytics_widgets_v1';
export const SERVER_SAVE_DEBOUNCE_MS = 1000;
export const ANALYTICS_LAYOUT_COMPANY_FALLBACK = 'default';

const PREFERENCES_PATH = '/user/preferences/';
const ANALYTICS_TABS = Object.keys(DEFAULT_LAYOUTS) as AnalyticsTab[];

export type StoredAnalyticsLayouts = Record<AnalyticsTab, LayoutV2>;

export type PreferencesApiClient = Pick<AxiosInstance, 'get' | 'patch'>;

export function getLayoutWidgetRegistry(): WidgetRegistry {
  return Object.fromEntries(WIDGET_DEFINITIONS.map((definition) => [definition.id, { defaultSize: definition.defaultSize }]));
}

function hasAnyTab(partial: Partial<Record<AnalyticsTab, unknown>>): boolean {
  return ANALYTICS_TABS.some((tab) => partial[tab] !== undefined);
}

/** True when the payload looks like per-tab layouts (v1 string[] or v2 objects). */
function isTabLayoutMap(value: unknown): value is Partial<Record<AnalyticsTab, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && hasAnyTab(value as Partial<Record<AnalyticsTab, unknown>>);
}

export function getDefaultLayouts(): StoredAnalyticsLayouts {
  const registry = getLayoutWidgetRegistry();
  return {
    financial: resetLayout(registry, DEFAULT_LAYOUTS.financial),
    inventory: resetLayout(registry, DEFAULT_LAYOUTS.inventory),
    employee: resetLayout(registry, DEFAULT_LAYOUTS.employee),
    crm: resetLayout(registry, DEFAULT_LAYOUTS.crm),
    overview: resetLayout(registry, DEFAULT_LAYOUTS.overview)
  };
}

/**
 * Normalize a raw per-tab payload (v1 string[] or LayoutV2) into StoredAnalyticsLayouts.
 */
export function sanitizeStoredLayouts(partial: Partial<Record<AnalyticsTab, unknown>>): StoredAnalyticsLayouts {
  const registry = getLayoutWidgetRegistry();
  const layouts = getDefaultLayouts();

  for (const tab of ANALYTICS_TABS) {
    if (partial[tab] !== undefined) {
      layouts[tab] = normalizeLayout(partial[tab], registry, DEFAULT_LAYOUTS[tab]);
    }
  }

  return layouts;
}

function extractCompanyScopedPayload(root: unknown, companyId: string): Partial<Record<AnalyticsTab, unknown>> | null {
  if (!root || typeof root !== 'object') {
    return null;
  }

  const record = root as Record<string, unknown>;

  // New shape: analytics_widgets_v1[companyId] = { financial: LayoutV2, ... }
  const scoped = record[companyId];
  if (isTabLayoutMap(scoped)) {
    return scoped;
  }

  // Legacy unscoped shape: analytics_widgets_v1 = { financial: string[] | LayoutV2, ... }
  if (isTabLayoutMap(record)) {
    return record;
  }

  return null;
}

/** Returns null when localStorage has no saved layout for this company. */
export function loadLayoutsFromLocalStorage(companyId: string = ANALYTICS_LAYOUT_COMPANY_FALLBACK): StoredAnalyticsLayouts | null {
  try {
    const raw = localStorage.getItem(ANALYTICS_LAYOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      const scoped = extractCompanyScopedPayload(parsed, companyId);
      if (scoped) {
        return sanitizeStoredLayouts(scoped);
      }
    }

    // Migrate legacy unscoped v1 key once.
    const legacyRaw = localStorage.getItem(ANALYTICS_LAYOUT_STORAGE_KEY_LEGACY);
    if (!legacyRaw) {
      return null;
    }

    const legacyParsed = JSON.parse(legacyRaw) as unknown;
    if (!isTabLayoutMap(legacyParsed)) {
      return null;
    }

    return sanitizeStoredLayouts(legacyParsed);
  } catch {
    return null;
  }
}

/** Back-compat helper: localStorage layout or defaults. */
export function loadStoredLayouts(companyId: string = ANALYTICS_LAYOUT_COMPANY_FALLBACK): StoredAnalyticsLayouts {
  return loadLayoutsFromLocalStorage(companyId) ?? getDefaultLayouts();
}

export function saveStoredLayouts(layouts: StoredAnalyticsLayouts, companyId: string = ANALYTICS_LAYOUT_COMPANY_FALLBACK): void {
  try {
    let root: Record<string, unknown> = {};
    const existing = localStorage.getItem(ANALYTICS_LAYOUT_STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && !isTabLayoutMap(parsed)) {
        root = { ...(parsed as Record<string, unknown>) };
      }
    }

    root[companyId] = layouts;
    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(root));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

/**
 * Fetches GET /user/preferences/ and reads dashboard_layout.analytics_widgets_v1[companyId].
 * Falls back to legacy unscoped tab maps. Returns null when missing.
 */
export async function loadLayoutFromServer(
  apiClient: PreferencesApiClient,
  companyId: string = ANALYTICS_LAYOUT_COMPANY_FALLBACK
): Promise<StoredAnalyticsLayouts | null> {
  try {
    const { data } = await apiClient.get(PREFERENCES_PATH);
    const nested = data?.dashboard_layout?.[ANALYTICS_WIDGETS_LAYOUT_KEY];
    const scoped = extractCompanyScopedPayload(nested, companyId);
    if (!scoped) {
      return null;
    }
    return sanitizeStoredLayouts(scoped);
  } catch {
    return null;
  }
}

type PendingServerSave = {
  layout: StoredAnalyticsLayouts;
  companyId: string;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingServerLayout: PendingServerSave | null = null;

/** Test helper to clear the debounce timer between cases. */
export function resetServerSaveDebounce(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingServerLayout = null;
}

/**
 * PATCH /user/preferences/ with dashboard_layout.analytics_widgets_v1[companyId] = LayoutV2 map.
 * Merges existing preferences so other companies/keys are preserved.
 * Debounced by 1000ms.
 */
export function saveLayoutToServer(
  layout: StoredAnalyticsLayouts,
  apiClient: PreferencesApiClient,
  companyId: string = ANALYTICS_LAYOUT_COMPANY_FALLBACK
): void {
  pendingServerLayout = { layout, companyId };

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    const pending = pendingServerLayout;
    pendingServerLayout = null;
    saveTimer = null;

    if (!pending) {
      return;
    }

    void (async () => {
      let dashboardLayout: Record<string, unknown> = {};
      try {
        const { data } = await apiClient.get(PREFERENCES_PATH);
        if (data?.dashboard_layout && typeof data.dashboard_layout === 'object') {
          dashboardLayout = { ...data.dashboard_layout };
        }
      } catch {
        // Proceed with a fresh object if GET fails.
      }

      const existingRoot = dashboardLayout[ANALYTICS_WIDGETS_LAYOUT_KEY];
      let widgetsRoot: Record<string, unknown> = {};

      if (existingRoot && typeof existingRoot === 'object' && !Array.isArray(existingRoot)) {
        if (isTabLayoutMap(existingRoot)) {
          // Legacy unscoped tab map — keep under fallback while writing company scope.
          widgetsRoot = {
            [ANALYTICS_LAYOUT_COMPANY_FALLBACK]: existingRoot
          };
        } else {
          widgetsRoot = { ...(existingRoot as Record<string, unknown>) };
        }
      }

      widgetsRoot[pending.companyId] = pending.layout;

      await apiClient.patch(PREFERENCES_PATH, {
        dashboard_layout: {
          ...dashboardLayout,
          [ANALYTICS_WIDGETS_LAYOUT_KEY]: widgetsRoot
        }
      });
    })().catch(() => {
      // Persistence failures should not break the UI; localStorage remains source of truth offline.
    });
  }, SERVER_SAVE_DEBOUNCE_MS);
}

/**
 * Server → localStorage → defaults. Uses normalizeLayout for v1→v2 migration.
 */
export async function resolveInitialLayouts(
  apiClient: PreferencesApiClient,
  companyId: string = ANALYTICS_LAYOUT_COMPANY_FALLBACK
): Promise<StoredAnalyticsLayouts> {
  const fromServer = await loadLayoutFromServer(apiClient, companyId);
  if (fromServer) {
    return fromServer;
  }

  const fromLocal = loadLayoutsFromLocalStorage(companyId);
  if (fromLocal) {
    return fromLocal;
  }

  return getDefaultLayouts();
}
