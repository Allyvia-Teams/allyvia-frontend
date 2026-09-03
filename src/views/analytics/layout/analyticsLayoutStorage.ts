import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import type { AnalyticsTab, AnalyticsTabLayout } from '../registry/types';
import { sanitizeLayouts } from './analyticsLayoutRules';

export const ANALYTICS_LAYOUT_STORAGE_KEY = 'allyvia_analytics_layout_v1';

export type StoredAnalyticsLayouts = Record<AnalyticsTab, AnalyticsTabLayout>;

export function getDefaultLayouts(): StoredAnalyticsLayouts {
  return sanitizeLayouts(DEFAULT_LAYOUTS);
}

// Local cache only. The layout of record lives on the account
// (`/analytics/layout/`, ALL-144) so it follows the user across the shared
// kiosk devices; this copy just avoids a flash of the default layout while
// that request is in flight, and keeps the tab usable offline.
export function loadStoredLayouts(): StoredAnalyticsLayouts {
  try {
    const raw = localStorage.getItem(ANALYTICS_LAYOUT_STORAGE_KEY);
    if (!raw) return getDefaultLayouts();
    return sanitizeLayouts(JSON.parse(raw));
  } catch {
    // Malformed JSON, or storage blocked in private mode.
    return getDefaultLayouts();
  }
}

export function saveStoredLayouts(layouts: StoredAnalyticsLayouts): void {
  try {
    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}
