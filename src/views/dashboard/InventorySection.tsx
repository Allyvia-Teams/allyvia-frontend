import { useEffect } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { mediumWidgetHeight } from 'store/constant';
import { ErrorSkeleton } from 'ui-component/UISkeleton';
// assets
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import { fetchInventoryItemsTreeMap, fetchInventoryOverview } from 'store/slices/analytics';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { DashboardRange } from 'ui-component/common/DashboardRangeSelector';
import { getDateRangeFromRange } from 'utils/dashboardRange';

export const InventorySection = ({ range }: { range: DashboardRange }) => {
  const dispatch = useDispatch();
  const {
    inventorySummary: analyticsInventorySummary,
    inventoryItemsTreeMap,
    error: analyticsError
  } = useSelector((state: RootState) => state.analytics);

  // Fetch inventory overview and treemap on mount/range change
  useEffect(() => {
    dispatch(fetchInventoryOverview(undefined) as any);
    const { startDate, endDate } = getDateRangeFromRange(range);
    dispatch(fetchInventoryItemsTreeMap({ start_date: startDate, end_date: endDate }) as any);
  }, [dispatch, range]);

  // Most insightful inventory KPIs
  const inventoryKpis = [
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
      title: 'Total Inventory Value',
      value:
        (analyticsInventorySummary as any)?.total_value ??
        (analyticsInventorySummary as any)?.total_inventory_value ??
        (inventoryItemsTreeMap as any)?.totals?.categories?.value ??
        0,
      currency: (analyticsInventorySummary as any)?.currency || (inventoryItemsTreeMap as any)?.currency || 'USD',
      theme: 'success' as const,
      trend: 'up' as const
    },
    {
      title: 'Average Profit Margin',
      value: analyticsInventorySummary?.average_profit_margin || 0,
      theme: 'default' as const,
      trend: 'neutral' as const,
      suffix: '%'
    }
  ];

  const isError = !!analyticsError;

  return (
    <Grid size={12}>
      <MainCard title="Inventory">
        {isError ? (
          <ErrorSkeleton height={mediumWidgetHeight} />
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">
                Snapshot as of now — not scoped to the selected date range
              </Typography>
              <Grid container spacing={3} sx={{ mt: 0.5 }}>
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
          </Grid>
        )}
      </MainCard>
    </Grid>
  );
};
