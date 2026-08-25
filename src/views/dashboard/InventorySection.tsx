import { useEffect, type ReactNode } from 'react';

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
import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { DashboardRange } from 'ui-component/common/DashboardRangeSelector';
import { getDateRangeFromRange } from 'utils/dashboardRange';
import { INVENTORY_MARGIN_TITLE, inventoryMarginCaveat, inventoryMarginDisplay, inventoryTotalValue } from 'utils/inventoryKpis';

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
  chip?: ReactNode;
};

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

  // The margin measures only stock whose cost is known, so the tile has to
  // disclose what it left out rather than present a subset as the shop. The
  // currency comes from the treemap because the summary payload carries none.
  const marginCaveat = inventoryMarginCaveat(analyticsInventorySummary, inventoryItemsTreeMap?.currency);

  // Most insightful inventory KPIs
  const inventoryKpis: InventoryKpi[] = [
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
      title: 'Total Inventory Value',
      value: inventoryTotalValue(analyticsInventorySummary, inventoryItemsTreeMap),
      currency: analyticsInventorySummary?.currency || inventoryItemsTreeMap?.currency || 'USD',
      theme: 'success' as const,
      trend: 'up' as const
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
                      chip={kpi.chip}
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
