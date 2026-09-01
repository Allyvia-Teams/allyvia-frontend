import type { WidgetGridSize, WidgetSize } from './types';

export const SIZE_TO_GRID: Record<WidgetSize, WidgetGridSize> = {
  full: { xs: 12 },
  half: { xs: 12, md: 6 },
  third: { xs: 12, md: 4 }
};

/** Exact MUI grid breakpoints for widgets that don't map cleanly to full/half/third. */
export const GRID_OVERRIDES: Partial<Record<string, WidgetGridSize>> = {
  'overview-revenue-profit-trend': { xs: 12, md: 8 },
  'overview-expense-breakdown': { xs: 12, md: 4 },
  'inventory-top-items': { xs: 12, md: 8 },
  'inventory-alerts-panel': { xs: 12, md: 4 }
};

export function getWidgetGridSize(widgetId: string, defaultSize: WidgetSize): WidgetGridSize {
  return GRID_OVERRIDES[widgetId] ?? SIZE_TO_GRID[defaultSize];
}
