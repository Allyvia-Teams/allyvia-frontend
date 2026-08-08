// views/inventory/RankedAggregates.tsx
//
// "What sold" ranked by style, category, size and colour — the buying question
// that a per-style grid cannot answer, because a grid tells you about ONE style
// and this tells you which sizes and colours the shop as a whole is short of.
//
// Three things this panel exists to get right:
//
//   1. THE ORDER IS THE SERVER'S. Every `by_*` array arrives sorted by units
//      sold descending (ties broken by key), so "top 10" is a slice, not a
//      client-side sort — and the slice is taken from the array as given.
//   2. THE BLANK BUCKET IS NAMED. `by_size`/`by_color` spell an unsized or
//      uncoloured group as the literal "-", which reads as "unknown" on a screen
//      where a dash means exactly that. `aggKeyLabel` turns it into "One size" /
//      "No colour", because that bar is real stock and frequently a big one.
//   3. A NEVER-STOCKED GROUP IS NOT A 0% GROUP. `sellThroughSeries` leaves rows
//      with a null sell-through off the chart and reports how many, rather than
//      drawing them at zero where they would look like the worst performers in
//      the shop.

import { useMemo, useState } from 'react';

import {
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';

import { formatPercent } from 'utils/financeFormat';

import InsightsChart from './InsightsChart';
import { SellThroughCell } from './InsightsChrome';
import { SellThroughAgg, aggKeyLabel, sellThroughSeries } from './insights';
import { formatMoney } from './purchasing';
import { formatQuantity } from './stockFormat';

export type AggregateDimension = 'style' | 'category' | 'size' | 'color';

const DIMENSION_LABELS: Record<AggregateDimension, string> = {
  style: 'Style',
  category: 'Category',
  size: 'Size',
  color: 'Colour'
};

export type AggregateMeasure = 'sell_through' | 'units_sold';

export interface RankedAggregatesProps {
  by_style: SellThroughAgg[];
  by_category: SellThroughAgg[];
  by_size: SellThroughAgg[];
  by_color: SellThroughAgg[];
  loading?: boolean;
  /**
   * True when the parent's request failed, so these four empty arrays mean
   * "nothing arrived" rather than "nothing sold". The finance precedent: an
   * ABSENT payload must not be rendered as a confident statement about the
   * business, and "No sales in this window" is exactly such a statement.
   */
  absent?: boolean;
  /** Says what these rankings cover — "company-wide", or the active narrowing. */
  scopeNote?: string;
  initialDimension?: AggregateDimension;
}

const TOP_N_OPTIONS = [10, 20, 50];

export default function RankedAggregates({
  by_style,
  by_category,
  by_size,
  by_color,
  loading = false,
  absent = false,
  scopeNote,
  initialDimension = 'category'
}: RankedAggregatesProps) {
  const [dimension, setDimension] = useState<AggregateDimension>(initialDimension);
  const [measure, setMeasure] = useState<AggregateMeasure>('units_sold');
  const [topN, setTopN] = useState(10);

  const rows = useMemo<SellThroughAgg[]>(() => {
    if (dimension === 'style') return by_style ?? [];
    if (dimension === 'size') return by_size ?? [];
    if (dimension === 'color') return by_color ?? [];
    return by_category ?? [];
  }, [dimension, by_style, by_category, by_size, by_color]);

  const ranked = useMemo(() => rows.slice(0, topN), [rows, topN]);

  // Units sold charts as-is (it can be negative — a net-returns group hangs
  // below the axis). Sell-through goes through sellThroughSeries so the
  // never-stocked groups drop out instead of flattening to zero.
  const series = useMemo(() => {
    if (measure === 'units_sold') {
      return {
        categories: ranked.map((row) => aggKeyLabel(row.key, dimension)),
        values: ranked.map((row) => row.units_sold ?? 0),
        omitted: 0
      };
    }
    return sellThroughSeries(
      ranked.map((row) => ({ label: aggKeyLabel(row.key, dimension), sellThrough: row.sell_through })),
      topN
    );
  }, [ranked, measure, dimension, topN]);

  const footnoteParts = [scopeNote];
  if (measure === 'sell_through' && series.omitted > 0) {
    footnoteParts.push(
      `${series.omitted} ${series.omitted === 1 ? 'group is' : 'groups are'} not charted: nothing was in stock and nothing arrived, so they have no sell-through — which is not the same as 0%.`
    );
  }
  if (measure === 'units_sold') {
    footnoteParts.push('Units sold is net of returns that came back into stock, so a group can chart below zero.');
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={dimension}
          onChange={(_event, value) => value && setDimension(value as AggregateDimension)}
        >
          {(Object.keys(DIMENSION_LABELS) as AggregateDimension[]).map((key) => (
            <ToggleButton key={key} value={key} sx={{ textTransform: 'none' }}>
              {DIMENSION_LABELS[key]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <TextField
          select
          size="small"
          label="Ranked by"
          value={measure}
          onChange={(event) => setMeasure(event.target.value as AggregateMeasure)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="units_sold">Units sold</MenuItem>
          <MenuItem value="sell_through">Sell-through</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Show"
          value={topN}
          onChange={(event) => setTopN(Number(event.target.value))}
          sx={{ width: 110 }}
        >
          {TOP_N_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              Top {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <InsightsChart
        type="bar"
        horizontal
        height={Math.max(260, series.categories.length * 26 + 60)}
        categories={series.categories}
        series={[{ name: measure === 'units_sold' ? 'Units sold' : 'Sell-through', data: series.values }]}
        valueFormatter={(value) => (measure === 'units_sold' ? formatQuantity(value) : formatPercent(value, 0))}
        isLoading={loading}
        isEmpty={series.categories.length === 0}
        emptyMessage={absent ? 'These figures have not loaded.' : 'Nothing sold in this window.'}
        footnote={footnoteParts.filter(Boolean).join(' ')}
      />

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{DIMENSION_LABELS[dimension]}</TableCell>
              <TableCell align="right">Variants</TableCell>
              <TableCell align="right">Opening</TableCell>
              <TableCell align="right">Received</TableCell>
              <TableCell align="right">Sold</TableCell>
              <TableCell align="right">On hand</TableCell>
              <TableCell>Sell-through</TableCell>
              <TableCell align="right">Stock at cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ranked.length === 0 && !loading && !absent && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No sales in this window.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {ranked.map((row) => (
              <TableRow key={`${dimension}:${row.key}`} hover>
                <TableCell>{aggKeyLabel(row.key, dimension)}</TableCell>
                <TableCell align="right">{formatQuantity(row.variants)}</TableCell>
                <TableCell align="right">{formatQuantity(row.opening_stock)}</TableCell>
                <TableCell align="right">{formatQuantity(row.units_received)}</TableCell>
                <TableCell align="right">{formatQuantity(row.units_sold)}</TableCell>
                <TableCell align="right">{formatQuantity(row.on_hand)}</TableCell>
                <TableCell>
                  <SellThroughCell fraction={row.sell_through} netReturns={(row.units_sold ?? 0) < 0} />
                </TableCell>
                <TableCell align="right">{formatMoney(row.stock_value_at_cost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
