// views/inventory/StockLevelChips.tsx
//
// Per-location stock as chips, plus the in-transit / on-order pair.
//
// The pair is shown NEXT TO the on-hand total and never folded into it: those
// units are on no shelf, but hiding them makes a manager reorder something that
// is already on its way.

import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { IconAlertTriangle, IconTruck, IconShoppingCart } from '@tabler/icons-react';

import { ItemStockResponse } from 'api/inventoryStock.api';

import { formatQuantity, hasLevelDrift, sortLevels, stockSeverity } from './stockFormat';

const severityColor = (severity: ReturnType<typeof stockSeverity>) => {
  if (severity === 'out') return 'error' as const;
  if (severity === 'low') return 'warning' as const;
  return 'default' as const;
};

export interface StockLevelChipsProps {
  stock: ItemStockResponse;
  reorderPoint?: number | null;
  /** Hide the in-transit/on-order pair where the surrounding view shows them. */
  showPipeline?: boolean;
}

export default function StockLevelChips({ stock, reorderPoint, showPipeline = true }: StockLevelChipsProps) {
  const levels = sortLevels(stock.levels);

  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
      {levels.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          No stock recorded at any location
        </Typography>
      )}

      {levels.map((level) => {
        const severity = stockSeverity(level.quantity_on_hand, reorderPoint);
        return (
          <Tooltip key={level.location_id} title={level.is_default ? `${level.location_name} (default location)` : level.location_name}>
            <Chip
              size="small"
              color={severityColor(severity)}
              variant={severity === 'ok' ? 'outlined' : 'filled'}
              label={`${level.location_name}: ${formatQuantity(level.quantity_on_hand)}`}
            />
          </Tooltip>
        );
      })}

      {showPipeline && stock.in_transit > 0 && (
        <Tooltip title="Dispatched on a transfer and not yet received — on no shelf">
          <Chip size="small" variant="outlined" color="info" icon={<IconTruck size={14} />} label={`${stock.in_transit} in transit`} />
        </Tooltip>
      )}

      {showPipeline && stock.on_order > 0 && (
        <Tooltip title="Ordered from a supplier and not yet received">
          <Chip size="small" variant="outlined" color="info" icon={<IconShoppingCart size={14} />} label={`${stock.on_order} on order`} />
        </Tooltip>
      )}

      {hasLevelDrift(stock) && (
        // Should never appear: the backend maintains the total from the levels in
        // one transaction. Surfacing it is a cheap tripwire, not an expected state.
        <Tooltip
          title={`The item total (${stock.total}) does not match the sum of its locations (${stock.levels_total}). This should not happen — please report it.`}
        >
          <Chip size="small" color="error" icon={<IconAlertTriangle size={14} />} label="Level mismatch" />
        </Tooltip>
      )}

      <Box flexGrow={1} />
    </Stack>
  );
}
