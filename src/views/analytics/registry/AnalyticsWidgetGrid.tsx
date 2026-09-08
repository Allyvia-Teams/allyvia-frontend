import React from 'react';
import { Box, Button, Grid, IconButton, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import type { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { DEFAULT_LAYOUTS } from './defaultLayouts';
import { getWidgetGridSize } from './gridSizes';
import { ANALYTICS_WIDGET_REGISTRY } from './widgetRegistry';
import type { AnalyticsTab } from './types';
import { useOptionalAnalyticsLayout } from '../layout/AnalyticsLayoutContext';
import { sanitizeLayout } from '../layout/analyticsLayoutRules';

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

const AnalyticsWidgetEmptyState: React.FC<{ onAddWidgets: () => void }> = ({ onAddWidgets }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 8,
      px: 2,
      textAlign: 'center'
    }}
  >
    <Typography variant="h6" gutterBottom>
      No widgets added yet
    </Typography>
    <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={onAddWidgets} aria-label="Add widgets">
      Add widgets
    </Button>
  </Box>
);

const AnalyticsWidgetGrid: React.FC<AnalyticsWidgetGridProps> = ({
  tab,
  dateRange,
  isLoading,
  spacing = 3,
  variant = 'default',
  layout: layoutProp,
  container = true
}) => {
  const layoutContext = useOptionalAnalyticsLayout();
  // A saved layout can outlive the registry, so it is sanitized before render:
  // ids that no longer exist and ids belonging to another tab are dropped
  // rather than crashing the page (ALL-144 stale-layout handling).
  const layout = sanitizeLayout(layoutContext?.layouts[tab] ?? layoutProp ?? DEFAULT_LAYOUTS[tab], tab);
  const onRemoveWidget = layoutContext ? (widgetId: string) => layoutContext.removeWidget(widgetId, tab) : undefined;
  const openPicker = layoutContext?.openPicker;

  if (layout.length === 0) {
    const emptyState = openPicker ? <AnalyticsWidgetEmptyState onAddWidgets={openPicker} /> : null;
    if (!emptyState) {
      return null;
    }
    if (!container) {
      return <Grid size={{ xs: 12 }}>{emptyState}</Grid>;
    }
    return emptyState;
  }

  const widgets = layout.map((widgetId) => {
    const widget = ANALYTICS_WIDGET_REGISTRY[widgetId];
    if (!widget) {
      console.warn(`[AnalyticsWidgetGrid] Unknown widget id: ${widgetId}`);
      return null;
    }

    const Component = widget.component;
    const gridSize = getWidgetGridSize(widgetId, widget.defaultSize);

    return (
      <Grid key={widgetId} size={gridSize}>
        <Box
          sx={{
            position: 'relative',
            '&:hover .analytics-widget-remove': {
              opacity: 1
            }
          }}
        >
          {onRemoveWidget && (
            <IconButton
              className="analytics-widget-remove"
              size="small"
              onClick={() => onRemoveWidget(widgetId)}
              aria-label={`Remove ${widget.displayName}`}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                opacity: 0,
                transition: 'opacity 0.15s ease-in-out',
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'background.paper'
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
          <Component dateRange={dateRange} isLoading={isLoading} />
        </Box>
      </Grid>
    );
  });

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
