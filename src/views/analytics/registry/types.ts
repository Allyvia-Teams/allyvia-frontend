import type { ComponentType } from 'react';
import type { RangeValue } from 'ui-component/third-party/DateRangePicker';
import type { LayoutV2 } from '../layout/layoutModel';

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

/**
 * Runtime / persisted tab layout (ALL-250).
 * Default id lists still live as `string[]` in `DEFAULT_LAYOUTS`;
 * they are upgraded to this shape by `sanitizeLayouts` / `normalizeLayout`.
 */
export type AnalyticsTabLayout = LayoutV2;

/** Canonical default order of widget ids per tab (pre-width upgrade). */
export type AnalyticsDefaultLayoutIds = string[];

export interface WidgetGridSize {
  xs: number;
  sm?: number;
  md?: number;
  lg?: number;
}
