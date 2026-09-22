// views/inventory/LookupGrid.tsx
//
// The availability grid the "Find a size" screen renders: one run per colour
// for simple or unscaled styles, one waist-across × inseam-down matrix per
// colour for composite scales. Purely presentational — every layout decision
// (scale order, explicit gaps, extras, the availability sentence) was already
// made by sizing.ts, and this file only draws what buildColorGrids returned.
//
// FOUR CELL STATES, VISUALLY DISTINCT, because they are four different facts:
//   in stock   — bold on a success tint; the number is total on hand
//   known zero — a real '0' on an error tint; "none anywhere" is an answer
//   unknown    — an em dash on a muted tint; the payload carried no on-hand
//                map, and unknown must never be dressed up as zero
//   missing    — a blank hatched gap; the scale says the position exists and
//                no variant does. Collapsing it would hide the hole in the
//                buy between S and L.
//
// Every variant cell answers the miss without a further click: its tooltip is
// sizing.ts::describeAvailability — here count, other locations by name,
// in-transit, and on-order with dates. Clicking a cell repeats that sentence
// in the parent's answer banner for touch screens, where there is no hover.

import { useEffect, useRef } from 'react';
import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';

import {
  ColorGrid,
  GridCell,
  LookupCell,
  LookupLocation,
  LookupScale,
  axisDisplayLabel,
  describeAvailability,
  describeCellFact,
  inTransitQty,
  onHandTotal,
  onOrderTotal
} from './sizing';

const MISSING_TOOLTIP = 'No variant exists in this size and colour — it was never made or never bought.';

/** The three variant-cell facts, styled apart. Missing cells never reach this. */
const factSx = (cell: LookupCell) => {
  const total = onHandTotal(cell);
  if (total === null) return { bgcolor: 'action.disabledBackground', color: 'text.secondary', fontStyle: 'italic' };
  if (total === 0) return { bgcolor: 'error.light', color: 'error.dark', fontWeight: 700 };
  return { bgcolor: 'success.light', color: 'success.dark', fontWeight: 700 };
};

export interface LookupGridProps {
  grids: ColorGrid[];
  scale: LookupScale | null;
  locations: LookupLocation[];
  hereLocationId: string | null;
  /** The cell repeated in the parent's answer banner; drawn with a ring. */
  selectedVariantId: number | null;
  /** The scanned variant — scrolled into view when a new response lands. */
  scrollToVariantId: number | null;
  onSelect: (cell: LookupCell, color: string) => void;
}

interface CellProps {
  gridCell: GridCell;
  color: string;
  grid: LookupGridProps;
  scrollRef: React.RefObject<HTMLTableCellElement | null>;
}

function AvailabilityCell({ gridCell, color, grid, scrollRef }: CellProps) {
  if (gridCell.kind === 'missing') {
    return (
      <Tooltip title={MISSING_TOOLTIP}>
        <TableCell
          align="center"
          aria-label="No variant in this size"
          sx={{
            color: 'text.disabled',
            backgroundImage: (theme) =>
              `repeating-linear-gradient(45deg, transparent, transparent 6px, ${theme.palette.action.hover} 6px, ${theme.palette.action.hover} 8px)`
          }}
        />
      </Tooltip>
    );
  }

  const { cell } = gridCell;
  const selected = grid.selectedVariantId === cell.variant_id;
  const incoming = inTransitQty(cell) > 0 || onOrderTotal(cell) > 0;
  return (
    <Tooltip title={describeAvailability(cell, grid.hereLocationId, grid.locations)}>
      <TableCell
        align="center"
        ref={grid.scrollToVariantId === cell.variant_id ? scrollRef : undefined}
        onClick={() => grid.onSelect(cell, color)}
        sx={{
          cursor: 'pointer',
          ...factSx(cell),
          ...(selected ? { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } : {})
        }}
      >
        {describeCellFact(gridCell)}
        {incoming && (
          <Typography component="sup" variant="caption" sx={{ ml: 0.25 }} aria-label="More is in transit or on order">
            +
          </Typography>
        )}
      </TableCell>
    </Tooltip>
  );
}

function ExtrasStrip({ extras, color, grid }: { extras: LookupCell[]; color: string; grid: LookupGridProps }) {
  if (extras.length === 0) return null;
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Tooltip title="Real variants whose size is not on this style's scale — free text, a withdrawn value, or a duplicate position.">
        <Typography variant="caption" color="text.secondary">
          Off the scale:
        </Typography>
      </Tooltip>
      {extras.map((cell) => (
        <Tooltip key={cell.variant_id} title={describeAvailability(cell, grid.hereLocationId, grid.locations)}>
          <Chip
            size="small"
            variant={grid.selectedVariantId === cell.variant_id ? 'filled' : 'outlined'}
            color={grid.selectedVariantId === cell.variant_id ? 'primary' : 'default'}
            onClick={() => grid.onSelect(cell, color)}
            label={`${cell.size_key || '(no size)'} · ${describeCellFact({ kind: 'variant', cell })}`}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}

export default function LookupGrid(props: LookupGridProps) {
  const { grids, scale, scrollToVariantId } = props;
  const scrollRef = useRef<HTMLTableCellElement | null>(null);

  // The scanned cell scrolls into view once per resolution, so the counter
  // never hunts a 40-column denim wall for the one cell that just beeped.
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [scrollToVariantId, grids]);

  const axis0Label = axisDisplayLabel(scale?.axis_labels?.[0] ?? '');
  const axis1Label = axisDisplayLabel(scale?.axis_labels?.[1] ?? '');

  return (
    <Stack spacing={2}>
      {grids.map((grid, groupIndex) => (
        <Stack key={`${grid.color}-${groupIndex}`} spacing={0.75}>
          <Typography variant="subtitle2">{grid.color || 'No colour'}</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            {grid.layout === 'run' ? (
              <Table size="small" sx={{ width: 'auto' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{axis0Label}</TableCell>
                    {grid.columns.map((column, columnIndex) => (
                      <TableCell key={`${column}-${columnIndex}`} align="center" sx={{ fontWeight: 600 }}>
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary' }}>On hand</TableCell>
                    {grid.cells.map((gridCell, columnIndex) => (
                      <AvailabilityCell key={columnIndex} gridCell={gridCell} color={grid.color} grid={props} scrollRef={scrollRef} />
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <Table size="small" sx={{ width: 'auto' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{`${axis1Label} \\ ${axis0Label}`}</TableCell>
                    {grid.columns.map((column, columnIndex) => (
                      <TableCell key={`${column}-${columnIndex}`} align="center" sx={{ fontWeight: 600 }}>
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grid.rows.map((row, rowIndex) => (
                    <TableRow key={`${row}-${rowIndex}`}>
                      <TableCell sx={{ fontWeight: 600 }}>{row}</TableCell>
                      {grid.cells[rowIndex].map((gridCell, columnIndex) => (
                        <AvailabilityCell key={columnIndex} gridCell={gridCell} color={grid.color} grid={props} scrollRef={scrollRef} />
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
          <ExtrasStrip extras={grid.extras} color={grid.color} grid={props} />
        </Stack>
      ))}
    </Stack>
  );
}
