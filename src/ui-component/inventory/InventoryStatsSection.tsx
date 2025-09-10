import React from 'react';
import { Box } from '@mui/material';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { useSelector } from 'store';

export const InventoryStatsSection: React.FC = () => {
  const items = useSelector((s) => s.inventory.items);
  const totalFromState = useSelector((s) => s.inventory.total);
  const summary = useSelector((s) => s.inventory.summary);

  // Debug logging
  console.log('InventoryStatsSection - Redux state:', {
    itemsCount: items?.length || 0,
    totalFromState,
    summary
  });

  // Use summary data directly (calculated from unified mock data)
  const totalItems = summary?.total_items ?? items.length;
  const lowStock =
    summary?.low_stock ??
    items.filter((i: any) => (i.quantity_on_hand || 0) > 0 && (i.quantity_on_hand || 0) <= (i.reorder_point || 0)).length;
  const outOfStock = summary?.out_of_stock ?? items.filter((i: any) => (i.quantity_on_hand || 0) === 0).length;
  const totalValueRaw = summary?.total_value
    ? parseFloat(summary.total_value)
    : items.reduce((sum: number, i: any) => sum + Number(i.unit_price || 0) * Number(i.quantity_on_hand || 0), 0);
  const totalValueFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValueRaw || 0);
  return (
    <Box
      sx={{
        mb: 2,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
        gap: 2
      }}
    >
      <Box>
        <AllyviaStats title="Total Items" value={totalItems} theme="default" trend="neutral" size="medium" />
      </Box>
      <Box>
        <AllyviaStats
          title="Low Stock Alerts"
          value={lowStock}
          theme={lowStock === 0 ? 'default' : 'warning'}
          trend="neutral"
          size="medium"
        />
      </Box>
      <Box>
        <AllyviaStats title="Out of Stock" value={outOfStock} theme={outOfStock === 0 ? 'default' : 'alert'} trend="down" size="medium" />
      </Box>
      <Box>
        <AllyviaStats
          title="Inventory Value"
          value={totalValueFormatted}
          theme={totalValueRaw === 0 ? 'default' : 'success'}
          trend="up"
          size="medium"
        />
      </Box>
    </Box>
  );
};

export default InventoryStatsSection;
