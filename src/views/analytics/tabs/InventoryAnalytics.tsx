import React from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import { fetchInventoryItemsTreeMap } from 'store/slices/analytics';
import { TopItems, InventoryTreemap, InventoryAlertsPanel, CategoryDistribution } from 'ui-component/analytics/inventory';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface InventoryAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ dateRange, isLoading }) => {
  const dispatch = useDispatch();
  const { inventorySummary: analyticsInventorySummary } = useSelector((state: RootState) => state.analytics);

  // Fetch treemap data on mount/date change
  React.useEffect(() => {
    dispatch(fetchInventoryItemsTreeMap(undefined) as any);
  }, [dispatch, dateRange?.start, dateRange?.end]);

  // Most insightful inventory KPIs
  const inventoryKpis = [
    {
      title: 'Total Inventory Value',
      value: analyticsInventorySummary?.total_inventory_value || 0,
      currency: analyticsInventorySummary?.currency || 'USD',
      theme: 'success' as const,
      trend: 'up' as const
    },
    {
      title: 'Low Stock Items',
      value: (analyticsInventorySummary as any)?.low_stock_count || 0,
      theme: 'warning' as const,
      trend: 'down' as const
    },
    {
      title: 'Out of Stock',
      value: (analyticsInventorySummary as any)?.out_of_stock_count || 0,
      theme: 'alert' as const,
      trend: 'down' as const
    },
    {
      title: 'Average Profit Margin',
      value: analyticsInventorySummary?.average_profit_margin || 0,
      theme: 'default' as const,
      trend: 'neutral' as const,
      suffix: '%'
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
                  kpi.currency
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: kpi.currency
                      }).format(kpi.value || 0)
                    : (kpi.value || 0).toLocaleString() + (kpi.suffix || '')
                }
                theme={kpi.theme}
                size="medium"
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
