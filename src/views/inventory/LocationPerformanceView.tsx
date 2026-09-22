// views/inventory/LocationPerformanceView.tsx
//
// Every store side by side: what it sold, what it made on it, what it is
// holding, and what went missing.
//
// THE LOCATION FILTER DOES NOT APPLY HERE, and pretending otherwise is the one
// way this panel can lie. `/analytics/locations/` validates `location_id`,
// echoes it into the envelope and folds it into its cache key — and then
// computes every store regardless (verified: the array is byte-identical scoped
// and unscoped while the envelope reports the scoped id). So the scope chip is
// overridden to say "All locations" and the note says why, rather than the
// caption quietly claiming a filter that did nothing.
//
// TWO COLUMNS THAT EXIST ONLY FOR THE COMPANY. A location row carries no
// `average_inventory_cost` and no `stock_turn`, so those two appear once, above
// the table, in the company block. A per-location column for them would have no
// data behind it.
//
// AND THE ROWS DO NOT ADD UP TO THE COMPANY FIGURES ON PURPOSE: a location's
// `units_received` counts stock transferred in from your other stores, because
// it genuinely arrived there, while the company-wide figure counts only
// purchase receipts. Both are correct; summing the column is not.

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';

import { LocationsResponse, getLocationPerformance } from 'api/inventoryAnalytics.api';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { formatPercent, toNum } from 'utils/financeFormat';

import InsightsChart from './InsightsChart';
import { Caveats, GmroiStrip, InsightsViewProps, SellThroughCell, ToneValue, WindowCaption } from './InsightsChrome';
import {
  ANALYTICS_STALENESS_NOTE,
  ARCHIVED_VARIANTS_CAVEAT,
  LOCATION_FILTER_IGNORED_NOTE,
  LOCATION_SCOPE_CAVEAT,
  analyticsQuery,
  describeAnalyticsError,
  describeShrinkage,
  formatPercentValue,
  formatTurns,
  presenceOf,
  sellThroughDefinitionFor,
  sellThroughSeries,
  signTone
} from './insights';
import { formatMoney } from './purchasing';
import { formatQuantity } from './stockFormat';

type LocationMeasure = 'money' | 'sell_through';

export default function LocationPerformanceView({ start, end, refreshKey }: InsightsViewProps) {
  const [data, setData] = useState<LocationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measure, setMeasure] = useState<LocationMeasure>('money');

  // `locationId` is deliberately NOT in the query: this endpoint ignores it, and
  // sending it would only mint a second cache entry for identical data.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getLocationPerformance(analyticsQuery({ start, end })));
      setError(null);
    } catch (err) {
      setError(describeAnalyticsError(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Server order: the default location first, then alphabetically. Not re-sorted.
  const rows = data?.locations ?? [];
  const presence = presenceOf(data, data?.locations);

  const sellThrough = useMemo(
    () => sellThroughSeries(rows.map((row) => ({ label: row.location_name, sellThrough: row.sell_through }))),
    [rows]
  );

  const moneySeries = useMemo(
    () => [
      { name: 'Revenue', data: rows.map((row) => toNum(row.revenue)) },
      { name: 'Gross margin', data: rows.map((row) => toNum(row.gross_margin)) },
      { name: 'Stock at cost', data: rows.map((row) => toNum(row.stock_value_at_cost)) }
    ],
    [rows]
  );

  return (
    <Stack spacing={2}>
      <MainCard
        title="Company totals"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <WindowCaption envelope={data} scopeLabel="All locations" />
          </Stack>
        }
      >
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <GmroiStrip
            block={data?.company_totals ?? null}
            loading={loading}
            scopeNote="Average inventory at cost and stock turn exist only at company level — a location row does not carry them, so the table below has no column for either."
          />
        </Stack>
      </MainCard>

      <MainCard
        title="By location"
        secondary={
          <TextField
            select
            size="small"
            label="Chart"
            value={measure}
            onChange={(event) => setMeasure(event.target.value as LocationMeasure)}
            sx={{ width: 190 }}
          >
            <MenuItem value="money">Revenue, margin, stock</MenuItem>
            <MenuItem value="sell_through">Sell-through</MenuItem>
          </TextField>
        }
      >
        <Stack spacing={2}>
          <InsightsChart
            type="bar"
            categories={measure === 'money' ? rows.map((row) => row.location_name) : sellThrough.categories}
            series={measure === 'money' ? moneySeries : [{ name: 'Sell-through', data: sellThrough.values }]}
            valueFormatter={(value) => (measure === 'money' ? formatMoney(value) : formatPercent(value, 0))}
            isLoading={loading}
            isEmpty={!loading && (measure === 'money' ? rows.length === 0 : sellThrough.categories.length === 0)}
            emptyMessage={presence === 'absent' ? 'These figures have not loaded.' : 'No locations to compare.'}
            footnote={
              measure === 'sell_through' && sellThrough.omitted > 0
                ? `${sellThrough.omitted} ${sellThrough.omitted === 1 ? 'location is' : 'locations are'} not charted: nothing was in stock there and nothing arrived, so they have no sell-through. That is not 0%.`
                : 'Gross margin is drawn on the same axis as revenue, so a loss appears below the line.'
            }
          />

          <AllyviaEmpty
            isLoading={loading && !data}
            isEmpty={!loading && presence !== 'present'}
            type="table"
            height={220}
            title={presence === 'absent' ? 'Not loaded' : 'No locations'}
            description={presence === 'absent' ? 'These figures have not loaded.' : 'Add a location before comparing stores.'}
          >
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Sold</TableCell>
                    <TableCell>Sell-through</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Gross margin</TableCell>
                    <TableCell align="right">Margin %</TableCell>
                    <TableCell align="right">GMROI</TableCell>
                    <TableCell align="right">Stock at cost</TableCell>
                    <TableCell>Shrinkage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const shrinkage = describeShrinkage(row.shrinkage);
                    return (
                      <TableRow key={row.location_id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography variant="body2">{row.location_name}</Typography>
                            {row.is_default && <AllyviaChip size="small" variant="outlined" label="Default" />}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <ToneValue tone={signTone(row.units_sold)}>{formatQuantity(row.units_sold)}</ToneValue>
                        </TableCell>
                        <TableCell>
                          <SellThroughCell fraction={row.sell_through} netReturns={(row.units_sold ?? 0) < 0} />
                        </TableCell>
                        <TableCell align="right">{formatMoney(row.revenue)}</TableCell>
                        <TableCell align="right">
                          <ToneValue tone={signTone(row.gross_margin_pct)}>{formatMoney(row.gross_margin)}</ToneValue>
                        </TableCell>
                        <TableCell align="right">
                          {/* Already a percent on the wire — multiplying it renders -400% as -40000%. */}
                          <ToneValue tone={signTone(row.gross_margin_pct)}>{formatPercentValue(row.gross_margin_pct)}</ToneValue>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="A fraction, unlike margin % beside it: 1.00x means this store made a pound of margin for every pound of stock it carried.">
                            <span>
                              <ToneValue tone={signTone(row.gmroi)}>{formatTurns(row.gmroi)}</ToneValue>
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">{formatMoney(row.stock_value_at_cost)}</TableCell>
                        <TableCell>
                          <Tooltip title={shrinkage.summary}>
                            <span>
                              <ToneValue tone={shrinkage.tone}>
                                {shrinkage.isZero ? 'None' : `${shrinkage.units} units · ${shrinkage.cost}`}
                              </ToneValue>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AllyviaEmpty>

          <Caveats
            notes={[
              LOCATION_FILTER_IGNORED_NOTE,
              LOCATION_SCOPE_CAVEAT,
              sellThroughDefinitionFor('location'),
              ARCHIVED_VARIANTS_CAVEAT,
              ANALYTICS_STALENESS_NOTE
            ]}
          />
        </Stack>
      </MainCard>
    </Stack>
  );
}
