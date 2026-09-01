import React from 'react';
import { Grid } from '@mui/material';
import type { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { DEFAULT_LAYOUTS } from './defaultLayouts';
import { getWidgetGridSize } from './gridSizes';
import { ANALYTICS_WIDGET_REGISTRY } from './widgetRegistry';
import type { AnalyticsTab } from './types';

export type AnalyticsWidgetGridVariant = 'default' | 'financial-nested';

interface AnalyticsWidgetGridProps {
  tab: AnalyticsTab;
  dateRange: RangeValue;
  isLoading: boolean;
  spacing?: number;
  variant?: AnalyticsWidgetGridVariant;
  layout?: string[];
  container?: boolean;
}

const renderWidgets = (layout: string[], dateRange: RangeValue, isLoading: boolean) =>
  layout.map((widgetId) => {
    const widget = ANALYTICS_WIDGET_REGISTRY[widgetId];
    if (!widget) {
      console.warn(`[AnalyticsWidgetGrid] Unknown widget id: ${widgetId}`);
      return null;
    }

    const Component = widget.component;
    const gridSize = getWidgetGridSize(widgetId, widget.defaultSize);

    return (
      <Grid key={widgetId} size={gridSize}>
        <Component dateRange={dateRange} isLoading={isLoading} />
      </Grid>
    );
  });

const AnalyticsWidgetGrid: React.FC<AnalyticsWidgetGridProps> = ({
  tab,
  dateRange,
  isLoading,
  spacing = 3,
  variant = 'default',
  layout = DEFAULT_LAYOUTS[tab],
  container = true
}) => {
  const widgets = renderWidgets(layout, dateRange, isLoading);

  if (!container) {
    return <>{widgets}</>;
  }

  if (variant === 'financial-nested') {
    return (
      <Grid container spacing={spacing}>
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={spacing}>
            {widgets}
          </Grid>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={spacing}>
      {widgets}
    </Grid>
  );
};

export default AnalyticsWidgetGrid;
