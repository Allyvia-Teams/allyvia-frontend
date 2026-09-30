import React, { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'store';
import { fetchLowStock } from 'store/slices/analytics';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

type LoadStatus = 'idle' | 'loading' | 'ok' | 'error';

/**
 * Low-stock list from the canonical server source (`GET /analytics/low-stock/`
 * via `fetchLowStock`). Does not reimplement threshold logic — membership is
 * whatever the server already filtered (ALL-98 / ALL-250).
 *
 * Not a thin wrap of `LowStock.tsx`: that component is a MainCard page block
 * (chart + export + dead Critical/Low bands) with no AnalyticsWidgetProps.
 */
const LowStockWidget: React.FC<AnalyticsWidgetProps> = ({ isLoading: parentLoading }) => {
  const dispatch = useDispatch<AppDispatch>();
  const lowStock = useSelector((state: RootState) => state.analytics.lowStock);
  const [status, setStatus] = useState<LoadStatus>('idle');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      await dispatch(fetchLowStock()).unwrap();
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }, [dispatch]);

  useEffect(() => {
    void load();
  }, [load]);

  const isLoading = Boolean(parentLoading || status === 'loading' || status === 'idle');

  // ALL-103: failed fetch must not look like "zero low-stock items".
  if (status === 'error') {
    return (
      <Box sx={{ p: 1.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.secondary' }}>
          —
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Couldn&apos;t load low-stock items.
        </Typography>
        <Button size="small" variant="text" color="inherit" onClick={() => void load()} sx={{ mt: 0.5, px: 0.5, minHeight: 0 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <AllyviaEmpty
      isLoading={isLoading}
      isEmpty={status === 'ok' && lowStock.length === 0}
      type="list"
      skeletonType="list"
      height={280}
      items={6}
      title="No low-stock items"
      description="Nothing is at or below its reorder point right now."
    >
      <Box sx={{ maxHeight: 280, overflowY: 'auto', px: 0.5 }}>
        <List dense disablePadding>
          {lowStock.map((item) => (
            <ListItem key={item.item_id} sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {item.name}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    On hand: {item.on_hand.toLocaleString()} · Reorder point: {item.reorder_point.toLocaleString()}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </AllyviaEmpty>
  );
};

export default LowStockWidget;
