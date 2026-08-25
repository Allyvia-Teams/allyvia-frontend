import React from 'react';
import { Grid } from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import { fetchInventoryItemsTreeMap, fetchInventoryOverview } from 'store/slices/analytics';
import { TopItems, InventoryTreemap, InventoryAlertsPanel, CategoryDistribution } from 'ui-component/analytics/inventory';
import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import {
  DEFAULT_CURRENCY,
  INVENTORY_MARGIN_TITLE,
  inventoryMarginCaveat,
  inventoryMarginDisplay,
  inventoryTotalValue
} from 'utils/inventoryKpis';

interface InventoryAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

// Most tiles carry a raw numeric `value` that this file formats on render. The
// margin tile instead carries a ready-made `display` string: its value is
// nullable and renders as an em dash when unknown, which no number can express.
// `display` wins when present, so the other tiles keep their exact behaviour.
type InventoryKpi = {
  title: string;
  value?: number;
  theme: 'default' | 'warning' | 'alert' | 'success';
  trend: 'up' | 'down' | 'neutral';
  currency?: string;
  display?: string;
  chip?: React.ReactNode;
};

const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ dateRange, isLoading }) => {
  const dispatch = useDispatch();
  const {
    inventorySummary: analyticsInventorySummary,
    inventoryItemsTreeMap,
    loading
  } = useSelector((state: RootState) => state.analytics);

  // Fetch inventory overview and treemap on mount/date change
  React.useEffect(() => {
    dispatch(fetchInventoryOverview(undefined) as any);
    dispatch(fetchInventoryItemsTreeMap(undefined) as any);
  }, [dispatch, dateRange?.start, dateRange?.end]);

  // The margin measures only stock whose cost is known, so the tile has to
  // disclose what it left out rather than present a subset as the shop.
  const marginCaveat = inventoryMarginCaveat(analyticsInventorySummary, inventoryItemsTreeMap?.currency || DEFAULT_CURRENCY);

  // Most insightful inventory KPIs
  const inventoryKpis: InventoryKpi[] = [
    {
      title: 'Total Inventory Value',
      value: inventoryTotalValue(analyticsInventorySummary, inventoryItemsTreeMap),
      // The summary carries no currency; the treemap is the only source that does.
      currency: inventoryItemsTreeMap?.currency || DEFAULT_CURRENCY,
      theme: 'success' as const,
      trend: 'up' as const
    },
    {
      title: 'Low Stock Items',
      value: analyticsInventorySummary?.low_stock_count || 0,
      theme: 'warning' as const,
      trend: 'down' as const
    },
    {
      title: 'Out of Stock',
      value: analyticsInventorySummary?.out_of_stock_count || 0,
      theme: 'alert' as const,
      trend: 'down' as const
    },
    {
      title: INVENTORY_MARGIN_TITLE,
      display: inventoryMarginDisplay(analyticsInventorySummary),
      theme: 'default' as const,
      trend: 'neutral' as const,
      chip: marginCaveat ? (
        <AllyviaChip label={marginCaveat.label} color="warning" variant="outlined" tooltipTitle={marginCaveat.tooltip} />
      ) : undefined
    }
  ];

  return (
    <Grid container spacing={3}>
      {/* Inventory KPIs */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {inventoryKpis.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats
                title={kpi.title}
                value={
                  kpi.display ??
                  (kpi.currency
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: kpi.currency
                      }).format(kpi.value || 0)
                    : (kpi.value || 0).toLocaleString())
                }
                theme={kpi.theme}
                size="medium"
                loading={Boolean(isLoading || loading)}
                chip={kpi.chip}
              />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Category Distribution Pie Chart - Full Width Above Treemap */}
      <Grid size={{ xs: 12 }}>
        <CategoryDistribution />
      </Grid>

      {/* Complete Inventory Distribution Treemap */}
      <Grid size={{ xs: 12 }}>
        <InventoryTreemap />
      </Grid>

      {/* Left Side - Top Items */}
      <Grid size={{ xs: 12, md: 8 }}>
        <TopItems />
      </Grid>

      {/* Right Side - Combined Alerts & Low Stock Panel */}
      <Grid size={{ xs: 12, md: 4 }}>
        <InventoryAlertsPanel />
      </Grid>
    </Grid>
  );
};

export default InventoryAnalytics;
