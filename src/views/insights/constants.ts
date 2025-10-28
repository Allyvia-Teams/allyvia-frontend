export type InsightCategory = 'supplier-risk' | 'overstock' | 'sales-trends' | 'spending-patterns' | 'forecast' | 'cash-flow';

export interface InsightCategoryMeta {
  id: InsightCategory;
  label: string;
  description: string;
  implemented: boolean;
}

export const INSIGHT_CATEGORIES: InsightCategoryMeta[] = [
  {
    id: 'supplier-risk',
    label: 'Supplier Risk',
    description: 'Analyze vendor concentration and supply chain risks',
    implemented: true
  },
  {
    id: 'overstock',
    label: 'Overstock',
    description: 'Detect slow-moving inventory and excess stock',
    implemented: true
  },
  {
    id: 'sales-trends',
    label: 'Sales Trends',
    description: 'Identify growth patterns and revenue opportunities',
    implemented: false
  },
  {
    id: 'spending-patterns',
    label: 'Spending',
    description: 'Analyze expense patterns and anomalies',
    implemented: false
  },
  {
    id: 'forecast',
    label: 'Forecast',
    description: 'Weather and event-based demand predictions',
    implemented: false
  },
  {
    id: 'cash-flow',
    label: 'Cash Flow',
    description: 'Cash flow health and liquidity insights',
    implemented: false
  }
];

export const ALL_TAB_VALUE = 'all';
