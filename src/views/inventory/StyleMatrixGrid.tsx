// views/inventory/StyleMatrixGrid.tsx
//
// The size x colour grid for one style — the view a buyer actually thinks in.
//
// Rows are colours and columns are sizes, because that is how a rail is
// merchandised and how a line sheet reads. A gap in the grid is a real fact (that
// size/colour was never bought) and is rendered as an empty cell rather than a
// zero, which would claim we stock it and have none.

import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';

import { ProductVariant } from 'api/inventoryStock.api';

import { toGrid } from './matrix';
import { formatQuantity, stockSeverity } from './stockFormat';

const cellSx = (severity: ReturnType<typeof stockSeverity>) => {
  if (severity === 'out') return { bgcolor: 'error.light', color: 'error.dark', fontWeight: 700 };
  if (severity === 'low') return { bgcolor: 'warning.light', color: 'warning.dark', fontWeight: 700 };
  return {};
};

export interface StyleMatrixGridProps {
  variants: ProductVariant[];
  onSelectVariant?: (variant: ProductVariant) => void;
}

export default function StyleMatrixGrid({ variants, onSelectVariant }: StyleMatrixGridProps) {
  const grid = toGrid(variants);

  if (!grid.isGrid) {
    // Single-variant styles are the backfilled majority. Forcing them through a
    // 1x1 matrix would be worse than a list.
    return (
      <Stack spacing={1}>
        {variants.map((variant) => {
          const severity = stockSeverity(variant.quantity_on_hand, variant.reorder_point);
          return (
            <Stack
              key={variant.inventory_item_id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ cursor: onSelectVariant ? 'pointer' : 'default' }}
              onClick={() => onSelectVariant?.(variant)}
            >
              <Typography variant="body2" sx={{ minWidth: 160 }}>
                {variant.sku ?? variant.name}
              </Typography>
              <Chip
                size="small"
                label={`${formatQuantity(variant.quantity_on_hand)} on hand`}
                color={severity === 'out' ? 'error' : severity === 'low' ? 'warning' : 'default'}
                variant={severity === 'ok' ? 'outlined' : 'filled'}
              />
            </Stack>
          );
        })}
      </Stack>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 360 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Colour \ Size</TableCell>
            {grid.sizes.map((size) => (
              <TableCell key={size} align="center" sx={{ fontWeight: 600 }}>
                {size}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {grid.colors.map((color) => (
            <TableRow key={color} hover>
              <TableCell sx={{ fontWeight: 600 }}>{color}</TableCell>
              {grid.sizes.map((size) => {
                const variant = grid.cell(color, size);
                if (!variant) {
                  // Never bought in this size/colour — an empty cell, not a 0.
                  return (
                    <TableCell key={size} align="center" sx={{ color: 'text.disabled' }}>
                      –
                    </TableCell>
                  );
                }
                const severity = stockSeverity(variant.quantity_on_hand, variant.reorder_point);
                return (
                  <Tooltip
                    key={size}
                    title={`${variant.sku ?? variant.name}${
                      variant.reorder_point !== null ? ` · reorder at ${variant.reorder_point}` : ''
                    }`}
                  >
                    <TableCell
                      align="center"
                      onClick={() => onSelectVariant?.(variant)}
                      sx={{
                        cursor: onSelectVariant ? 'pointer' : 'default',
                        ...cellSx(severity)
                      }}
                    >
                      {formatQuantity(variant.quantity_on_hand)}
                    </TableCell>
                  </Tooltip>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
