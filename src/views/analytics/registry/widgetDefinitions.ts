import type { AnalyticsTab, WidgetSize } from './types';

export type WidgetDefinitionMeta = {
  id: string;
  displayName: string;
  description: string;
  defaultSize: WidgetSize;
  tab: AnalyticsTab;
};

export const WIDGET_DEFINITIONS: WidgetDefinitionMeta[] = [
  {
    id: 'financial-kpis',
    displayName: 'Finance KPIs',
    description: 'Total revenue, net income, and cash balance summary',
    defaultSize: 'full',
    tab: 'financial'
  },
  {
    id: 'financial-trends-chart',
    displayName: 'Financial Trends',
    description: 'Revenue, expense, and payment trends over time',
    defaultSize: 'full',
    tab: 'financial'
  },
  {
    id: 'financial-analytics-card',
    displayName: 'Expense / Invoice / Payment Analytics',
    description: 'Consolidated expense, invoice, and payment analytics card',
    defaultSize: 'full',
    tab: 'financial'
  },
  {
    id: 'inventory-kpis',
    displayName: 'Inventory KPIs',
    description: 'Inventory value, stock alerts, and margin summary',
    defaultSize: 'full',
    tab: 'inventory'
  },
  {
    id: 'inventory-category-distribution',
    displayName: 'Category Distribution',
    description: 'Inventory distribution by category',
    defaultSize: 'full',
    tab: 'inventory'
  },
  {
    id: 'inventory-treemap',
    displayName: 'Inventory Treemap',
    description: 'Complete inventory distribution treemap',
    defaultSize: 'full',
    tab: 'inventory'
  },
  {
    id: 'inventory-top-items',
    displayName: 'Top Items',
    description: 'Top inventory items by value or movement',
    defaultSize: 'third',
    tab: 'inventory'
  },
  {
    id: 'inventory-alerts-panel',
    displayName: 'Inventory Alerts',
    description: 'Combined alerts and low stock panel',
    defaultSize: 'third',
    tab: 'inventory'
  },
  {
    id: 'employee-kpis',
    displayName: 'Employee KPIs',
    description: 'Summary KPI cards for employee analytics',
    defaultSize: 'full',
    tab: 'employee'
  },
  {
    id: 'employee-daily-total-hours',
    displayName: 'Daily Total Hours',
    description: 'Bar chart of daily total hours across all employees',
    defaultSize: 'full',
    tab: 'employee'
  },
  {
    id: 'employee-top-hours',
    displayName: 'Top Employees by Hours',
    description: 'Donut chart and list of top 10 employees by hours worked',
    defaultSize: 'full',
    tab: 'employee'
  },
  {
    id: 'employee-activity-heatmap',
    displayName: 'Activity Heatmap',
    description: 'Weekday by hour activity heatmap for all employees',
    defaultSize: 'full',
    tab: 'employee'
  },
  {
    id: 'employee-week-timeline',
    displayName: 'Week Timeline',
    description: 'Weekly timeline chart with employee selection',
    defaultSize: 'full',
    tab: 'employee'
  },
  {
    id: 'crm-pipeline-kpis',
    displayName: 'Pipeline Health KPIs',
    description: 'CRM pipeline health key performance indicators',
    defaultSize: 'full',
    tab: 'crm'
  },
  {
    id: 'crm-primary-charts',
    displayName: 'Pipeline & Forecast Charts',
    description: 'Pipeline by stage and forecast curve charts',
    defaultSize: 'full',
    tab: 'crm'
  },
  {
    id: 'crm-performance-kpis',
    displayName: 'Sales Performance KPIs',
    description: 'Sales performance key performance indicators',
    defaultSize: 'full',
    tab: 'crm'
  },
  {
    id: 'crm-performance-charts',
    displayName: 'Conversion & Rep Charts',
    description: 'Conversion funnel and rep performance charts',
    defaultSize: 'full',
    tab: 'crm'
  },
  {
    id: 'crm-rep-performance',
    displayName: 'Rep Performance Leaderboard',
    description: 'Sales rep performance leaderboard and charts',
    defaultSize: 'full',
    tab: 'crm'
  },
  {
    id: 'crm-leads-kpis',
    displayName: 'Lead Quality KPIs',
    description: 'Lead quality key performance indicators',
    defaultSize: 'full',
    tab: 'crm'
  },
  {
    id: 'crm-leads-charts',
    displayName: 'Lead Source Charts',
    description: 'Lead source distribution and conversion charts',
    defaultSize: 'full',
    tab: 'crm'
  },
  {
    id: 'crm-activity-kpis',
    displayName: 'Activity & Tasks KPIs',
    description: 'Activity and task key performance indicators',
    defaultSize: 'full',
    tab: 'crm'
  },
  {
    id: 'crm-activity-charts',
    displayName: 'Activity & Deal Aging Charts',
    description: 'Activity trends and deal aging charts',
    defaultSize: 'full',
    tab: 'crm'
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
  }
];
