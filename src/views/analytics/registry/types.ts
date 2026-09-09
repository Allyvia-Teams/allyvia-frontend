import type { ComponentType } from 'react';
import type { RangeValue } from 'ui-component/third-party/DateRangePicker';

export type AnalyticsTab = 'financial' | 'inventory' | 'employee' | 'crm' | 'overview';

export type WidgetSize = 'full' | 'half' | 'third';

export interface AnalyticsWidgetProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

export interface AnalyticsWidgetDefinition {
  id: string;
  displayName: string;
  description: string;
  defaultSize: WidgetSize;
  tab: AnalyticsTab;
  component: ComponentType<AnalyticsWidgetProps>;
}

export type AnalyticsTabLayout = string[];

export interface WidgetGridSize {
  xs: number;
  sm?: number;
  md?: number;
  lg?: number;
}
