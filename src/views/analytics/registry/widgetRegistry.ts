import type { ComponentType } from 'react';
import { FinanceKpis } from 'ui-component/analytics/finance';
import { ExpenseBreakdown, FinanceRevenueProfitTrend } from 'ui-component/analytics/finance/charts';
import { FinanceCashFlow } from 'ui-component/analytics/finance/widgets';
import { TimeUtilization } from 'ui-component/analytics/employee';
import { TopItems, InventoryTreemap, InventoryAlertsPanel, CategoryDistribution } from 'ui-component/analytics/inventory';
import CrmPipelineKpisWidget from 'ui-component/analytics/crm/widgets/CrmPipelineKpisWidget';
import CrmPrimaryChartsWidget from 'ui-component/analytics/crm/widgets/CrmPrimaryChartsWidget';
import CrmPerformanceKpisWidget from 'ui-component/analytics/crm/widgets/CrmPerformanceKpisWidget';
import CrmPerformanceChartsWidget from 'ui-component/analytics/crm/widgets/CrmPerformanceChartsWidget';
import CrmRepPerformanceWidget from 'ui-component/analytics/crm/widgets/CrmRepPerformanceWidget';
import CrmLeadsKpisWidget from 'ui-component/analytics/crm/widgets/CrmLeadsKpisWidget';
import CrmLeadsChartsWidget from 'ui-component/analytics/crm/widgets/CrmLeadsChartsWidget';
import CrmActivityKpisWidget from 'ui-component/analytics/crm/widgets/CrmActivityKpisWidget';
import CrmActivityChartsWidget from 'ui-component/analytics/crm/widgets/CrmActivityChartsWidget';
import type { AnalyticsWidgetDefinition, AnalyticsWidgetProps } from './types';
import { WIDGET_DEFINITIONS } from './widgetDefinitions';
import FinancialTrendsChartWidget from '../widgets/financial/FinancialTrendsChartWidget';
import FinancialAnalyticsCardWidget from '../widgets/financial/FinancialAnalyticsCardWidget';
import InventoryKpisWidget from '../widgets/inventory/InventoryKpisWidget';
import OverviewKpiCardsWidget from '../widgets/overview/OverviewKpiCardsWidget';
import EmployeeKpisWidget from '../widgets/employee/EmployeeKpisWidget';
import EmployeeDailyTotalHoursWidget from '../widgets/employee/EmployeeDailyTotalHoursWidget';
import EmployeeTopHoursWidget from '../widgets/employee/EmployeeTopHoursWidget';
import EmployeeActivityHeatmapWidget from '../widgets/employee/EmployeeActivityHeatmapWidget';
import EmployeeWeekTimelineWidget from '../widgets/employee/EmployeeWeekTimelineWidget';

const WIDGET_COMPONENTS: Record<string, ComponentType<AnalyticsWidgetProps>> = {
  'financial-kpis': FinanceKpis,
  'financial-trends-chart': FinancialTrendsChartWidget,
  'financial-analytics-card': FinancialAnalyticsCardWidget,
  'inventory-kpis': InventoryKpisWidget,
  'inventory-category-distribution': CategoryDistribution,
  'inventory-treemap': InventoryTreemap,
  'inventory-top-items': TopItems,
  'inventory-alerts-panel': InventoryAlertsPanel,
  'employee-kpis': EmployeeKpisWidget,
  'employee-daily-total-hours': EmployeeDailyTotalHoursWidget,
  'employee-top-hours': EmployeeTopHoursWidget,
  'employee-activity-heatmap': EmployeeActivityHeatmapWidget,
  'employee-week-timeline': EmployeeWeekTimelineWidget,
  'crm-pipeline-kpis': CrmPipelineKpisWidget,
  'crm-primary-charts': CrmPrimaryChartsWidget,
  'crm-performance-kpis': CrmPerformanceKpisWidget,
  'crm-performance-charts': CrmPerformanceChartsWidget,
  'crm-rep-performance': CrmRepPerformanceWidget,
  'crm-leads-kpis': CrmLeadsKpisWidget,
  'crm-leads-charts': CrmLeadsChartsWidget,
  'crm-activity-kpis': CrmActivityKpisWidget,
  'crm-activity-charts': CrmActivityChartsWidget,
  'overview-kpi-cards': OverviewKpiCardsWidget,
  'overview-revenue-profit-trend': FinanceRevenueProfitTrend,
  'overview-expense-breakdown': ExpenseBreakdown,
  'overview-cash-flow': FinanceCashFlow,
  'overview-time-utilization': TimeUtilization,
  'overview-top-items': TopItems,
  'overview-inventory-alerts': InventoryAlertsPanel
};

export const ANALYTICS_WIDGET_REGISTRY: Record<string, AnalyticsWidgetDefinition> = Object.fromEntries(
  WIDGET_DEFINITIONS.map((definition) => {
    const component = WIDGET_COMPONENTS[definition.id];
    if (!component) {
      throw new Error(`Missing component mapping for widget "${definition.id}"`);
    }
    return [definition.id, { ...definition, component }];
  })
);
