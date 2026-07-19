export type InsightCategory = 'supplier-risk' | 'overstock' | 'weather' | 'sales-trends' | 'spending-patterns' | 'forecast' | 'cash-flow';

export interface InsightCategoryMeta {
  id: InsightCategory;
  label: string;
  description: string;
  implemented: boolean;
}

export const INSIGHT_CATEGORIES: InsightCategoryMeta[] = [
  {
    id: 'sales-trends',
    label: 'Sales Trends',
    description: 'Identify growth patterns and revenue opportunities',
    implemented: true
  },
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
    id: 'weather',
    label: 'Weather',
    description: 'Weather-based business insights and recommendations',
    implemented: true
  }
];

export const ALL_TAB_VALUE = 'all';
