import React from 'react';
import { Grid, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import {
  DEFAULT_CURRENCY,
  INVENTORY_MARGIN_TITLE,
  inventoryMarginCaveat,
  inventoryMarginDisplay,
  inventoryTotalValue
} from 'utils/inventoryKpis';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

type InventoryKpi = {
  title: string;
  value?: number;
  theme: 'default' | 'warning' | 'alert' | 'success';
  trend: 'up' | 'down' | 'neutral';
  currency?: string;
  display?: string;
  chip?: React.ReactNode;
};

const InventoryKpisWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading }) => {
  const {
    inventorySummary: analyticsInventorySummary,
    inventoryItemsTreeMap,
    loading
  } = useSelector((state: RootState) => state.analytics);

  const marginCaveat = inventoryMarginCaveat(analyticsInventorySummary, inventoryItemsTreeMap?.currency || DEFAULT_CURRENCY);

  const inventoryKpis: InventoryKpi[] = [
    {
      title: 'Total Inventory Value',
      value: inventoryTotalValue(analyticsInventorySummary, inventoryItemsTreeMap),
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
      {/* Stock level, low-stock and out-of-stock are snapshots of current
          stock: /analytics/inventory/overview/ takes no date parameters, by
          design. They sit under the tab's range picker, which changes every
          other number on the page, so the difference has to be stated rather
          than inferred (ALL-140 M5). The treemap does follow the range. */}
      <Grid size={{ xs: 12 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Stock levels are current as of today and do not follow the selected date range.
        </Typography>
      </Grid>
    </Grid>
  );
};

export default InventoryKpisWidget;
