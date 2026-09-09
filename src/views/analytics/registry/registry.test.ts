import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUTS } from './defaultLayouts';
import { WIDGET_DEFINITIONS } from './widgetDefinitions';
import type { AnalyticsTab } from './types';

const EXPECTED_LAYOUTS: Record<AnalyticsTab, string[]> = {
  financial: ['financial-kpis', 'financial-trends-chart', 'financial-analytics-card'],
  inventory: ['inventory-kpis', 'inventory-category-distribution', 'inventory-treemap', 'inventory-top-items', 'inventory-alerts-panel'],
  employee: ['employee-kpis', 'employee-daily-total-hours', 'employee-top-hours', 'employee-activity-heatmap', 'employee-week-timeline'],
  crm: [
    'crm-pipeline-kpis',
    'crm-primary-charts',
    'crm-performance-kpis',
    'crm-performance-charts',
    'crm-rep-performance',
    'crm-leads-kpis',
    'crm-leads-charts',
    'crm-activity-kpis',
    'crm-activity-charts'
  ],
  overview: [
    'overview-kpi-cards',
    'overview-revenue-profit-trend',
    'overview-expense-breakdown',
    'overview-cash-flow',
    'overview-time-utilization',
    'overview-top-items',
    'overview-inventory-alerts'
  ]
};

const widgetById = Object.fromEntries(WIDGET_DEFINITIONS.map((definition) => [definition.id, definition]));

describe('analytics widget registry (ALL-142)', () => {
  const layoutWidgetIds = Object.values(EXPECTED_LAYOUTS).flat();

  it('registers one definition per default-layout widget id', () => {
    expect(WIDGET_DEFINITIONS).toHaveLength(layoutWidgetIds.length);
    expect(new Set(WIDGET_DEFINITIONS.map((definition) => definition.id)).size).toBe(layoutWidgetIds.length);
  });

  it.each(Object.entries(EXPECTED_LAYOUTS) as [AnalyticsTab, string[]][])(
    'default layout for %s matches approved widget order',
    (tab: AnalyticsTab, expectedIds: string[]) => {
      expect(DEFAULT_LAYOUTS[tab]).toEqual(expectedIds);
    }
  );

  it('every layout widget id resolves to a definition on the same tab', () => {
    for (const [tab, layout] of Object.entries(DEFAULT_LAYOUTS) as [AnalyticsTab, string[]][]) {
      for (const widgetId of layout) {
        const definition = widgetById[widgetId];
        expect(definition, `missing definition for ${widgetId}`).toBeDefined();
        expect(definition.tab).toBe(tab);
        expect(definition.id).toBe(widgetId);
      }
    }
  });
});
