import React from 'react';
import { Box } from '@mui/material';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { useSelector } from '../../../store';

export const InventoryStatsSection: React.FC = () => {
  const { items, summary, loading } = useSelector((s) => s.inventory);

  // Use new summary fields; fallback to legacy and calculated values
  const uniqueItems = summary?.unique_items ?? summary?.total_items ?? items.length;
  const totalQoh = summary?.total_quantity_on_hand ?? items.reduce((sum: number, i: any) => sum + Number(i.quantity_on_hand || 0), 0);
  const lowStock =
    summary?.low_stock ??
    items.filter(
      (i: any) => i.item_type === 'Inventory' && (i.quantity_on_hand || 0) > 0 && (i.quantity_on_hand || 0) <= (i.reorder_point || 0)
    ).length;
  const outOfStock =
    summary?.out_of_stock ?? items.filter((i: any) => i.item_type === 'Inventory' && (i.quantity_on_hand || 0) === 0).length;
  const totalValueRaw = summary?.inventory_value
    ? Number(summary.inventory_value)
    : items.reduce((sum: number, i: any) => sum + Number(i.unit_price || 0) * Number(i.quantity_on_hand || 0), 0);
  const totalValueFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValueRaw || 0);
  return (
    <Box
      sx={{
        mb: 2,
        display: 'flex',
        flexWrap: 'nowrap',
        gap: 2,
        alignItems: 'stretch',
        justifyContent: 'space-between',
        width: '100%'
      }}
    >
      <Box sx={{ flex: 1 }}>
        <AllyviaStats
          title="Unique Items / Total QOH"
          value={loading ? '...' : `${uniqueItems} / ${totalQoh}`}
          theme="default"
          trend="neutral"
          size="medium"
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <AllyviaStats
          title="Low Stock Alerts"
          value={loading ? '...' : lowStock}
          theme={lowStock === 0 ? 'default' : 'warning'}
          trend="neutral"
          size="medium"
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <AllyviaStats
          title="Out of Stock"
          value={loading ? '...' : outOfStock}
          theme={outOfStock === 0 ? 'default' : 'alert'}
          trend="down"
          size="medium"
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <AllyviaStats
          title="Inventory Value"
          value={loading ? '...' : totalValueFormatted}
          theme={totalValueRaw === 0 ? 'default' : 'success'}
          trend="up"
          size="medium"
        />
      </Box>
    </Box>
  );
};

export default InventoryStatsSection;
