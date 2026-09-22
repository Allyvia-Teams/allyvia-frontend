import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import type { AnalyticsTab, AnalyticsTabLayout } from '../registry/types';
import { WIDGET_DEFINITIONS } from '../registry/widgetDefinitions';
import { normalizeLayout, resetLayout, type LayoutV2, type WidgetRegistry } from './layoutModel';

// Which widget ids a given tab is allowed to render, and how to make an
// arbitrary saved layout safe to hand to the grid.
//
// Two things make this necessary rather than cosmetic:
//
//  * Widgets are not interchangeable across tabs. The employee widgets read
//    EmployeeAnalyticsProvider, which is mounted only by the Employee tab, so
//    rendering one on another tab throws and takes the page down.
//  * Saved layouts outlive the registry. A layout stored before a widget was
//    renamed or removed will contain ids that no longer resolve, and ALL-144
//    requires those to be skipped rather than crash.
//
// ALL-250: sanitize now upgrades v1 string[] (and legacy shapes) to LayoutV2
// via normalizeLayout, preserving widths when present.

const WIDGET_TAB_BY_ID: Record<string, AnalyticsTab> = Object.fromEntries(
  WIDGET_DEFINITIONS.map((definition) => [definition.id, definition.tab])
);

const LAYOUT_REGISTRY: WidgetRegistry = Object.fromEntries(
  WIDGET_DEFINITIONS.map((definition) => [definition.id, { defaultSize: definition.defaultSize }])
);

export function getLayoutWidgetRegistry(): WidgetRegistry {
  return LAYOUT_REGISTRY;
}

export function widgetsForTab(tab: AnalyticsTab) {
  return WIDGET_DEFINITIONS.filter((definition) => definition.tab === tab);
}

export function isWidgetAllowedOnTab(widgetId: string, tab: AnalyticsTab): boolean {
  return WIDGET_TAB_BY_ID[widgetId] === tab;
}

/**
 * Drops ids that no longer exist in the registry, ids belonging to another
 * tab, and duplicates, then upgrades to LayoutV2 (default sizes / preserved w).
 *
 * Pipeline: tab allowlist + stale-id filter (here) → normalizeLayout widths.
 */
export function sanitizeLayout(layout: unknown, tab: AnalyticsTab): LayoutV2 {
  return normalizeLayout(layout, LAYOUT_REGISTRY, DEFAULT_LAYOUTS[tab], {
    allowId: (id) => isWidgetAllowedOnTab(id, tab),
    preserveEmpty: true
  });
}

/**
 * A layout the user has deliberately emptied is a valid state - the grid shows
 * the "add widgets" prompt - so an empty layout is preserved. Only a missing or
 * malformed entry falls back to the default.
 */
export function sanitizeLayouts(raw: unknown): Record<AnalyticsTab, AnalyticsTabLayout> {
  const tabs = Object.keys(DEFAULT_LAYOUTS) as AnalyticsTab[];
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return tabs.reduce(
    (acc, tab) => {
      acc[tab] = tab in source ? sanitizeLayout(source[tab], tab) : resetLayout(LAYOUT_REGISTRY, DEFAULT_LAYOUTS[tab]);
      return acc;
    },
    {} as Record<AnalyticsTab, AnalyticsTabLayout>
  );
}
