import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { useDispatch, useSelector } from '../../../store';
import { fetchInventorySummary } from 'store/slices/inventory';
import { buildInventoryStatsView } from './inventoryStatsView';

export const InventoryStatsSection: React.FC = () => {
  const dispatch = useDispatch();
  const { items, summary, summaryLoading, summaryError } = useSelector((s) => s.inventory);

  // When the summary call has failed the tiles read as unknown rather than
  // quietly substituting a locally-computed figure — see buildInventoryStatsView.
  const view = buildInventoryStatsView({ summary, items, summaryLoading, summaryError });
  const loading = view.status === 'loading';
  const tiles = loading
    ? [
        { title: 'Unique Items / Total QOH', value: '', theme: 'default' as const },
        { title: 'Low Stock Alerts', value: '', theme: 'default' as const },
        { title: 'Out of Stock', value: '', theme: 'default' as const },
        { title: 'Inventory Value', value: '', theme: 'default' as const }
      ]
    : view.tiles;

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 2,
          alignItems: 'stretch',
          justifyContent: 'space-between',
          width: '100%'
        }}
      >
        {tiles.map((t) => (
          <Box key={t.title} sx={{ flex: 1 }}>
            <AllyviaStats title={t.title} value={t.value} theme={t.theme} size="medium" loading={loading} />
          </Box>
        ))}
      </Box>

      {view.status === 'error' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="body2" color="error">
            {view.errorLabel}
          </Typography>
          <Button size="small" onClick={() => dispatch(fetchInventorySummary() as any)}>
            Retry
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default InventoryStatsSection;
