import React, { useMemo, useState } from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { RangeValue } from 'ui-component/third-party/DateRangePicker';
import DraggableWidget from 'ui-component/analytics/DraggableWidget';
import { SIZE_TO_GRID } from './gridSizes';
import { ANALYTICS_WIDGET_REGISTRY } from './widgetRegistry';
import type { AnalyticsTab, WidgetSize } from './types';
import { useOptionalAnalyticsLayout } from '../layout/AnalyticsLayoutContext';
import { sanitizeLayout } from '../layout/analyticsLayoutRules';
import { DEFAULT_LAYOUTS } from './defaultLayouts';
import type { LayoutV2 } from '../layout/layoutModel';

export type AnalyticsWidgetGridVariant = 'default' | 'financial-nested';

interface AnalyticsWidgetGridProps {
  tab: AnalyticsTab;
  dateRange: RangeValue;
  isLoading: boolean;
  spacing?: number;
  variant?: AnalyticsWidgetGridVariant;
  /** @deprecated Prefer layout context LayoutV2; kept for fallback callers (v1 string[]). */
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

/**
 * Resolve a LayoutV2 for render: prefer context, else prop / defaults.
 * Always run through sanitizeLayout so stale ids and cross-tab widgets are
 * dropped before dnd-kit / the registry try to render them (ALL-144 + ALL-250).
 */
function resolveSanitizedLayout(tab: AnalyticsTab, layoutContextLayout: LayoutV2 | undefined, layoutProp?: string[]): LayoutV2 {
  const raw = layoutContextLayout ?? layoutProp ?? DEFAULT_LAYOUTS[tab];
  return sanitizeLayout(raw, tab);
}

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
  const layout = resolveSanitizedLayout(tab, layoutContext?.layouts[tab], layoutProp);
  const widgetIds = useMemo(() => layout.widgets.map((entry) => entry.id), [layout.widgets]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const onRemoveWidget = layoutContext ? (widgetId: string) => layoutContext.removeWidget(widgetId, tab) : undefined;
  const onResizeWidget = layoutContext
    ? (widgetId: string, width: WidgetSize) => layoutContext.resizeWidget(tab, widgetId, width)
    : undefined;
  const onReorderWidget = layoutContext ? (fromId: string, toId: string) => layoutContext.reorderWidget(tab, fromId, toId) : undefined;
  const onResetLayout = layoutContext ? () => layoutContext.resetTabLayout(tab) : undefined;
  const openPicker = layoutContext?.openPicker;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !onReorderWidget) {
      return;
    }
    const fromId = String(active.id);
    const toId = String(over.id);
    if (fromId !== toId) {
      onReorderWidget(fromId, toId);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (layout.widgets.length === 0) {
    const emptyState = openPicker ? <AnalyticsWidgetEmptyState onAddWidgets={openPicker} /> : null;
    if (!emptyState) {
      return null;
    }
    if (!container) {
      return <Grid size={{ xs: 12 }}>{emptyState}</Grid>;
    }
    return emptyState;
  }

  const activeEntry = layout.widgets.find((entry) => entry.id === activeId) ?? null;
  const activeWidget = activeEntry ? ANALYTICS_WIDGET_REGISTRY[activeEntry.id] : null;

  const widgets = layout.widgets.map((entry) => {
    const widget = ANALYTICS_WIDGET_REGISTRY[entry.id];
    if (!widget) {
      console.warn(`[AnalyticsWidgetGrid] Unknown widget id: ${entry.id}`);
      return null;
    }

    const Component = widget.component;
    const gridSize = SIZE_TO_GRID[entry.w];

    const content = <Component dateRange={dateRange} isLoading={isLoading} />;

    if (!layoutContext || !onResizeWidget) {
      return (
        <Grid key={entry.id} size={gridSize}>
          {content}
        </Grid>
      );
    }

    return (
      <Grid key={entry.id} size={gridSize}>
        <DraggableWidget
          id={entry.id}
          title={widget.displayName}
          width={entry.w}
          onResize={(width) => onResizeWidget(entry.id, width)}
          onRemove={onRemoveWidget ? () => onRemoveWidget(entry.id) : undefined}
        >
          {content}
        </DraggableWidget>
      </Grid>
    );
  });

  const gridBody = (
    <>
      {onResetLayout ? (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button size="small" variant="text" onClick={onResetLayout} aria-label="Reset to default layout">
              Reset to default layout
            </Button>
          </Box>
        </Grid>
      ) : null}
      {widgets}
    </>
  );

  const sortableGrid = layoutContext ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        {variant === 'financial-nested' && container ? (
          <Grid container spacing={spacing}>
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={spacing}>
                {gridBody}
              </Grid>
            </Grid>
          </Grid>
        ) : container ? (
          <Grid container spacing={spacing}>
            {gridBody}
          </Grid>
        ) : (
          <>{gridBody}</>
        )}
      </SortableContext>
      <DragOverlay>
        {activeWidget ? (
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'background.paper',
              boxShadow: 4,
              borderRadius: 1,
              opacity: 0.9
            }}
          >
            {activeWidget.displayName}
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  ) : container ? (
    variant === 'financial-nested' ? (
      <Grid container spacing={spacing}>
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={spacing}>
            {widgets}
          </Grid>
        </Grid>
      </Grid>
    ) : (
      <Grid container spacing={spacing}>
        {widgets}
      </Grid>
    )
  ) : (
    <>{widgets}</>
  );

  return sortableGrid;
};

export default AnalyticsWidgetGrid;
