import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import { WIDGET_DEFINITIONS } from '../registry/widgetDefinitions';
import type { AnalyticsTab, AnalyticsTabLayout } from '../registry/types';

export const ANALYTICS_LAYOUT_STORAGE_KEY = 'allyvia_analytics_layout_v1';

const VALID_WIDGET_IDS = new Set(WIDGET_DEFINITIONS.map((definition) => definition.id));
const ANALYTICS_TABS = Object.keys(DEFAULT_LAYOUTS) as AnalyticsTab[];

export type StoredAnalyticsLayouts = Record<AnalyticsTab, AnalyticsTabLayout>;

function sanitizeLayout(layout: unknown): AnalyticsTabLayout {
  if (!Array.isArray(layout)) {
    return [];
  }

  return layout.filter((widgetId): widgetId is string => typeof widgetId === 'string' && VALID_WIDGET_IDS.has(widgetId));
}

export function getDefaultLayouts(): StoredAnalyticsLayouts {
  return { ...DEFAULT_LAYOUTS };
}

export function loadStoredLayouts(): StoredAnalyticsLayouts {
  const defaults = getDefaultLayouts();

  try {
    const raw = localStorage.getItem(ANALYTICS_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<Record<AnalyticsTab, unknown>>;
    const layouts = { ...defaults };

    for (const tab of ANALYTICS_TABS) {
      if (parsed[tab] !== undefined) {
        layouts[tab] = sanitizeLayout(parsed[tab]);
      }
    }

    return layouts;
  } catch {
    return defaults;
  }
}

export function saveStoredLayouts(layouts: StoredAnalyticsLayouts): void {
  try {
    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}
