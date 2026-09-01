import type { AnalyticsTab, AnalyticsTabLayout } from './types';

export const DEFAULT_LAYOUTS: Record<AnalyticsTab, AnalyticsTabLayout> = {
  financial: ['financial-kpis', 'financial-trends-chart', 'financial-analytics-card'],
  inventory: [
    'inventory-kpis',
    'inventory-category-distribution',
    'inventory-treemap',
    'inventory-top-items',
    'inventory-alerts-panel'
  ],
  employee: [
    'employee-kpis',
    'employee-daily-total-hours',
    'employee-top-hours',
    'employee-activity-heatmap',
    'employee-week-timeline'
  ],
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
