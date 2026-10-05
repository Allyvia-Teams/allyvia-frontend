import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'store';
import { fetchInventoryItemsTreeMap, fetchInventoryOverview } from 'store/slices/analytics';
import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { formatCurrency } from 'utils/financeCalculations';
import {
  DEFAULT_CURRENCY,
  INVENTORY_MARGIN_TITLE,
  inventoryMarginCaveat,
  inventoryMarginDisplay,
  inventoryTotalValue
} from 'utils/inventoryKpis';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

/**
 * Inventory retail value + margin from analytics overview summary.
 * Currency comes from the treemap payload (not the summary), matching InventoryKpisWidget.
 */
const InventoryValueMarginWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading: parentLoading }) => {
  const dispatch = useDispatch<AppDispatch>();
  const inventorySummary = useSelector((state: RootState) => state.analytics.inventorySummary);
  const inventoryItemsTreeMap = useSelector((state: RootState) => state.analytics.inventoryItemsTreeMap);
  const loading = useSelector((state: RootState) => state.analytics.loading);

  useEffect(() => {
    dispatch(fetchInventoryOverview('summary'));
    dispatch(fetchInventoryItemsTreeMap(undefined));
  }, [dispatch]);

  const currency = inventoryItemsTreeMap?.currency || DEFAULT_CURRENCY;
  const hasSummary = inventorySummary != null;
  const value = inventoryTotalValue(inventorySummary, inventoryItemsTreeMap);
  const marginDisplay = inventoryMarginDisplay(inventorySummary);
  const caveat = inventoryMarginCaveat(inventorySummary, currency);
  const isLoading = Boolean(parentLoading || loading);

  return (
    <AllyviaEmpty
      isLoading={isLoading}
      isEmpty={!hasSummary}
      type="kpi"
      height={200}
      title="Inventory value & margin"
      description="Inventory summary is not available yet."
    >
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Total inventory value
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            {formatCurrency(value, currency)}
          </Typography>
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              {INVENTORY_MARGIN_TITLE}
            </Typography>
            {caveat ? <AllyviaChip label={caveat.label} color="warning" variant="outlined" tooltipTitle={caveat.tooltip} /> : null}
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            {marginDisplay}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Stock value and margin are current as of today and do not follow the selected date range.
        </Typography>
      </Box>
    </AllyviaEmpty>
  );
};

export default InventoryValueMarginWidget;
