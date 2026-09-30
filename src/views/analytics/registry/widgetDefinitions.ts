import type { ModuleKey } from 'types/settings';
import type { AnalyticsTab, WidgetSize } from './types';

export type WidgetDefinitionMeta = {
  id: string;
  displayName: string;
  description: string;
  defaultSize: WidgetSize;
  tab: AnalyticsTab;
  /** Members without this grant do not see the widget in the picker. Omit = no gate. */
  module?: ModuleKey;
};

export const WIDGET_DEFINITIONS: WidgetDefinitionMeta[] = [
  {
    id: 'financial-kpis',
    displayName: 'Finance KPIs',
    description: 'Total revenue, net income, and cash balance summary',
    defaultSize: 'full',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'financial-trends-chart',
    displayName: 'Financial Trends',
    description: 'Revenue, expense, and payment trends over time',
    defaultSize: 'full',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'financial-analytics-card',
    displayName: 'Expense / Invoice / Payment Analytics',
    description: 'Consolidated expense, invoice, and payment analytics card',
    defaultSize: 'full',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'revenue-vs-expenses',
    displayName: 'Revenue vs expenses',
    description: 'Daily revenue against average daily expenses for the period',
    defaultSize: 'full',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'receivables-by-age',
    displayName: 'Receivables by age',
    description: 'Accounts receivable outstanding by aging bucket',
    defaultSize: 'full',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'payables-by-due-date',
    displayName: 'Payables by due date',
    description: 'Accounts payable amounts grouped by due-date bucket',
    defaultSize: 'full',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'budget-vs-actual',
    displayName: 'Budget vs actual',
    description: 'Budgeted amounts compared to actual spend by category',
    defaultSize: 'full',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'inventory-turnover',
    displayName: 'Inventory turnover',
    description: 'Period revenue divided by current inventory value at retail',
    defaultSize: 'full',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'revenue-per-labor-hour',
    displayName: 'Revenue per labor hour',
    description: 'Period revenue divided by labor hours worked',
    defaultSize: 'full',
    tab: 'financial'
  },
  {
    id: 'revenue-by-tender',
    displayName: 'Revenue by tender',
    description: 'Payment method / tender split for the selected period',
    defaultSize: 'half',
    tab: 'financial',
    module: 'finance'
  },
  {
    id: 'inventory-kpis',
    displayName: 'Inventory KPIs',
    description: 'Inventory value, stock alerts, and margin summary',
    defaultSize: 'full',
    tab: 'inventory',
    module: 'inventory'
  },
  {
    id: 'inventory-value-margin',
    displayName: 'Inventory value & margin',
    description: 'On-hand retail value and inventory margin with estimate caveat',
    defaultSize: 'half',
    tab: 'inventory',
    module: 'inventory'
  },
  {
    id: 'low-stock',
    displayName: 'Low stock',
    description: 'Items at or below reorder point (server /analytics/low-stock/)',
    defaultSize: 'half',
    tab: 'inventory',
    module: 'inventory'
  },
  {
    id: 'inventory-category-distribution',
    displayName: 'Category Distribution',
    description: 'Inventory distribution by category',
    defaultSize: 'full',
    tab: 'inventory',
    module: 'inventory'
  },
  {
    id: 'inventory-treemap',
    displayName: 'Inventory Treemap',
    description: 'Complete inventory distribution treemap',
    defaultSize: 'full',
    tab: 'inventory',
    module: 'inventory'
  },
  {
    id: 'inventory-top-items',
    displayName: 'Top Items',
    description: 'Top inventory items by value or movement',
    defaultSize: 'third',
    tab: 'inventory',
    module: 'inventory'
  },
  {
    id: 'inventory-alerts-panel',
    displayName: 'Inventory Alerts',
    description: 'Combined alerts and low stock panel',
    defaultSize: 'third',
    tab: 'inventory',
    module: 'inventory'
  },
  {
    id: 'employee-kpis',
    displayName: 'Employee KPIs',
    description: 'Summary KPI cards for employee analytics',
    defaultSize: 'full',
    tab: 'employee',
    module: 'employees'
  },
  {
    id: 'employee-daily-total-hours',
    displayName: 'Daily Total Hours',
    description: 'Bar chart of daily total hours across all employees',
    defaultSize: 'full',
    tab: 'employee',
    module: 'employees'
  },
  {
    id: 'employee-top-hours',
    displayName: 'Top Employees by Hours',
    description: 'Donut chart and list of top 10 employees by hours worked',
    defaultSize: 'full',
    tab: 'employee',
    module: 'employees'
  },
  {
    id: 'employee-activity-heatmap',
    displayName: 'Activity Heatmap',
    description: 'Weekday by hour activity heatmap for all employees',
    defaultSize: 'full',
    tab: 'employee',
    module: 'employees'
  },
  {
    id: 'employee-week-timeline',
    displayName: 'Week Timeline',
    description: 'Weekly timeline chart with employee selection',
    defaultSize: 'full',
    tab: 'employee',
    module: 'employees'
  },
  {
    id: 'crm-pipeline-kpis',
    displayName: 'Pipeline Health KPIs',
    description: 'CRM pipeline health key performance indicators',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'crm-primary-charts',
    displayName: 'Pipeline & Forecast Charts',
    description: 'Pipeline by stage and forecast curve charts',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'crm-performance-kpis',
    displayName: 'Sales Performance KPIs',
    description: 'Sales performance key performance indicators',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'crm-performance-charts',
    displayName: 'Conversion & Rep Charts',
    description: 'Conversion funnel and rep performance charts',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'crm-rep-performance',
    displayName: 'Rep Performance Leaderboard',
    description: 'Sales rep performance leaderboard and charts',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'crm-leads-kpis',
    displayName: 'Lead Quality KPIs',
    description: 'Lead quality key performance indicators',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'crm-leads-charts',
    displayName: 'Lead Source Charts',
    description: 'Lead source distribution and conversion charts',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'crm-activity-kpis',
    displayName: 'Activity & Tasks KPIs',
    description: 'Activity and task key performance indicators',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'crm-activity-charts',
    displayName: 'Activity & Deal Aging Charts',
    description: 'Activity trends and deal aging charts',
    defaultSize: 'full',
    tab: 'crm',
    module: 'crm'
  },
  {
    id: 'overview-kpi-cards',
    displayName: 'Overview KPIs',
    description: 'Cross-domain overview KPI cards',
    defaultSize: 'full',
    tab: 'overview'
  },
  {
    id: 'overview-revenue-profit-trend',
    displayName: 'Revenue & Profit Trend',
    description: 'Revenue and profit trend line chart',
    defaultSize: 'third',
    tab: 'overview'
  },
  {
    id: 'overview-expense-breakdown',
    displayName: 'Expense Breakdown',
    description: 'Expense breakdown donut chart',
    defaultSize: 'third',
    tab: 'overview'
  },
  {
    id: 'overview-cash-flow',
    displayName: 'Cash Flow',
    description: 'Cash flow chart',
    defaultSize: 'half',
    tab: 'overview'
  },
  {
    id: 'overview-time-utilization',
    displayName: 'Time Utilization',
    description: 'Employee time utilization chart',
    defaultSize: 'half',
    tab: 'overview'
  },
  {
    id: 'overview-top-items',
    displayName: 'Top Inventory Items',
    description: 'Top inventory items table',
    defaultSize: 'half',
    tab: 'overview'
  },
  {
    id: 'overview-inventory-alerts',
    displayName: 'Inventory Alerts',
    description: 'Inventory alerts panel',
    defaultSize: 'half',
    tab: 'overview'
  },
  {
    id: 'verified-savings',
    displayName: 'Verified savings',
    description: 'Measured savings from acted-on recommendations',
    defaultSize: 'third',
    tab: 'overview',
    module: 'insights'
  },
  {
    id: 'todays-insights',
    displayName: "Today's insights",
    description: 'Agent recommendations and alerts for today',
    defaultSize: 'full',
    tab: 'overview',
    module: 'insights'
  }
];
