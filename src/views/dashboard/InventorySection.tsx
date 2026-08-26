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
import { INVENTORY_MARGIN_TITLE, inventoryMarginCaveat, inventoryMarginDisplay } from 'utils/inventoryKpis';

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
  // ALL-99 renders retail beneath the at-cost headline on the value tile.
  secondary?: string;
  chip?: ReactNode;
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value || 0);

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

  const inventoryCurrency = (analyticsInventorySummary as any)?.currency || (inventoryItemsTreeMap as any)?.currency || 'USD';

  // Retail (quantity x unit_price). Kept as the secondary figure on the value
  // tile rather than the headline — see the comment on that tile below.
  const retailValue =
    (analyticsInventorySummary as any)?.total_value ??
    (analyticsInventorySummary as any)?.total_inventory_value ??
    (inventoryItemsTreeMap as any)?.totals?.categories?.value ??
    null;

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
      // Inventory is a balance-sheet asset and is carried at COST. This tile
      // used to render total_value (quantity x unit_price), i.e. retail, next
      // to a Cash Balance tile on a page owners use to decide whether they can
      // afford to buy — a shelf holding £52k of capital read as £158k (ALL-99).
      // Retail is still shown, as the secondary figure, clearly labelled.
      title: 'Inventory Value (at cost)',
      value: (analyticsInventorySummary as any)?.total_cost_value ?? 0,
      secondary: retailValue != null ? `${formatCurrency(retailValue, inventoryCurrency)} at retail` : undefined,
      currency: inventoryCurrency,
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
                          ? formatCurrency(kpi.value || 0, kpi.currency)
                          : (kpi.value || 0).toLocaleString() + ((kpi as any).suffix || ''))
                      }
                      secondary={(kpi as any).secondary}
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
