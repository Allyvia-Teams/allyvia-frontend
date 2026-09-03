import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import type { AnalyticsTab } from '../registry/types';
import { WIDGET_DEFINITIONS } from '../registry/widgetDefinitions';

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

const WIDGET_TAB_BY_ID: Record<string, AnalyticsTab> = Object.fromEntries(
  WIDGET_DEFINITIONS.map((definition) => [definition.id, definition.tab])
);

export function widgetsForTab(tab: AnalyticsTab) {
  return WIDGET_DEFINITIONS.filter((definition) => definition.tab === tab);
}

export function isWidgetAllowedOnTab(widgetId: string, tab: AnalyticsTab): boolean {
  return WIDGET_TAB_BY_ID[widgetId] === tab;
}

// Drops ids that no longer exist in the registry, ids belonging to another
// tab, and duplicates, preserving the caller's order.
export function sanitizeLayout(layout: unknown, tab: AnalyticsTab): string[] {
  if (!Array.isArray(layout)) return [...DEFAULT_LAYOUTS[tab]];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of layout) {
    if (typeof id !== 'string') continue;
    if (seen.has(id)) continue;
    if (!isWidgetAllowedOnTab(id, tab)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

// A layout the user has deliberately emptied is a valid state - the grid shows
// the "add widgets" prompt - so an empty array is preserved. Only a missing or
// malformed entry falls back to the default.
export function sanitizeLayouts(raw: unknown): Record<AnalyticsTab, string[]> {
  const tabs = Object.keys(DEFAULT_LAYOUTS) as AnalyticsTab[];
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return tabs.reduce(
    (acc, tab) => {
      acc[tab] = tab in source ? sanitizeLayout(source[tab], tab) : [...DEFAULT_LAYOUTS[tab]];
      return acc;
    },
    {} as Record<AnalyticsTab, string[]>
  );
}
