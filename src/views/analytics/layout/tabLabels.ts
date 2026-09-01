import type { AnalyticsTab } from '../registry/types';

export const ANALYTICS_TAB_LABELS: Record<AnalyticsTab, string> = {
  financial: 'Financial',
  crm: 'CRM',
  employee: 'Employee',
  inventory: 'Inventory',
  overview: 'Overview'
};

export const ANALYTICS_TAB_ORDER: AnalyticsTab[] = ['financial', 'crm', 'employee', 'inventory', 'overview'];

export const TAB_INDEX_TO_ANALYTICS_TAB: AnalyticsTab[] = ['financial', 'crm', 'employee', 'inventory'];
