// views/inventory/StockAgingView.tsx
//
// How long the stock on the shelves has been there, and how much money is in
// each age band.
//
// THIS PANEL IS NOT ABOUT THE WINDOW. The endpoint accepts `start` and `end`,
// echoes them into the envelope, folds them into its cache key — and then
// measures as of now over all history. Captioning it with the date range would
// attach a window to numbers the window never touched, so it is captioned "as
// of today" and says so out loud.
//
// TWO RULES THAT DECIDE WHAT A BUYER MARKS DOWN:
//
//   1. UNKNOWN AGE SORTS LAST. "We have no record of this arriving" is not
//      "this is ancient". A markdown list headed by rows whose age is merely
//      unrecorded sends someone to discount stock that may have landed
//      yesterday. `sortByAge` is applied here even though the server already
//      sorts this way, so the invariant survives any change to either end.
//   2. THE CAVEAT IS THE SERVER'S OWN SENTENCE, not a copy of it. Aging is
//      FIFO-approximate — it dates the batch, not each unit — and printing the
//      response's `approximation` string means the screen stops claiming the old
//      method the day the backend changes it.

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
import Grid from '@mui/material/Grid';

import { AgingResponse, getStockAging } from 'api/inventoryAnalytics.api';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { toNum } from 'utils/financeFormat';

import InsightsChart from './InsightsChart';
import { Caveats, InsightsViewProps, WindowCaption } from './InsightsChrome';
import {
  AGING_IGNORES_WINDOW_NOTE,
  ANALYTICS_STALENESS_NOTE,
  ARCHIVED_VARIANTS_CAVEAT,
  UNKNOWN_AGE_BUCKET,
  agingBucketLabel,
  agingCaveat,
  agingRowKey,
  analyticsQuery,
  describeAnalyticsError,
  emptyMessageFor,
  formatAgeDays,
  matrixAxisLabel,
  orderedAgingBuckets,
  presenceOf,
  sortByAge
} from './insights';
import { formatMoney } from './purchasing';
import { EM_DASH, formatQuantity } from './stockFormat';

type AgingMeasure = 'capital' | 'units';

const ROW_LIMIT = 150;

export default function StockAgingView({ start, end, locationId, refreshKey }: InsightsViewProps) {
  const [data, setData] = useState<AgingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measure, setMeasure] = useState<AgingMeasure>('capital');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getStockAging(analyticsQuery({ start, end, locationId })));
      setError(null);
    } catch (err) {
      setError(describeAnalyticsError(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [start, end, locationId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Never indexed positionally. The backend appends "unknown" conditionally, so
  // `buckets[5]` is sometimes that band and sometimes nothing at all;
  // `orderedAgingBuckets` reads by label, zero-fills the five numeric bands so
  // the axis is stable across windows, and keeps "unknown" last.
  const buckets = useMemo(() => orderedAgingBuckets(data?.buckets), [data]);

  // Age-sorted with the unknowns last, then capped — so the cap always hides the
  // NEWEST stock, never the oldest, which is the stock this panel exists for.
  const rows = useMemo(() => sortByAge(data?.items ?? []), [data]);
  const shown = rows.slice(0, ROW_LIMIT);
  const presence = presenceOf(data, data?.items);

  const unknownBucket = buckets.find((bucket) => bucket.label === UNKNOWN_AGE_BUCKET);
  const oldCapital = buckets
    .filter((bucket) => bucket.label === '90-180' || bucket.label === '180+')
    .reduce((total, bucket) => total + toNum(bucket.capital_tied), 0);

  return (
    <MainCard
      title="Stock aging"
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {loading && <CircularProgress size={18} />}
          <WindowCaption envelope={data} ignoresWindow />
        </Stack>
      }
    >
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AllyviaStats
              title="Units on hand"
              value={formatQuantity(buckets.reduce((total, bucket) => total + bucket.units, 0))}
              size="small"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AllyviaStats title="Capital over 90 days old" value={formatMoney(oldCapital.toFixed(2))} size="small" loading={loading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AllyviaStats
              title="Units of unknown age"
              value={unknownBucket ? formatQuantity(unknownBucket.units) : formatQuantity(0)}
              size="small"
              loading={loading}
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            select
            size="small"
            label="Show"
            value={measure}
            onChange={(event) => setMeasure(event.target.value as AgingMeasure)}
            sx={{ width: 180 }}
          >
            <MenuItem value="capital">Capital at cost</MenuItem>
            <MenuItem value="units">Units</MenuItem>
          </TextField>
        </Stack>

        <InsightsChart
          type="bar"
          categories={buckets.map((bucket) => agingBucketLabel(bucket.label))}
          series={[
            {
              name: measure === 'capital' ? 'Capital at cost' : 'Units',
              data: buckets.map((bucket) => (measure === 'capital' ? toNum(bucket.capital_tied) : bucket.units))
            }
          ]}
          valueFormatter={(value) => (measure === 'capital' ? formatMoney(value) : formatQuantity(value))}
          isLoading={loading}
          // 'absent' is charted as empty too: `orderedAgingBuckets` zero-fills
          // the five bands, so an unloaded payload would otherwise draw five
          // confident zero bars claiming the shop holds nothing.
          isEmpty={!loading && presence !== 'present'}
          emptyMessage={emptyMessageFor(presence, 'stock on hand') ?? 'These figures have not loaded.'}
          footnote="Bands are lower-bound inclusive: stock that arrived exactly 30 days ago is in “30 to 60 days”. The unknown band only appears when something is in it, and it is last on purpose — an unrecorded arrival is not an old one."
        />

        <AllyviaEmpty
          isLoading={loading && !data}
          isEmpty={!loading && presence !== 'present'}
          type="table"
          height={240}
          title={presence === 'absent' ? 'Not loaded' : 'No stock on hand'}
          description={
            presence === 'absent'
              ? 'These figures have not loaded.'
              : 'Aging only counts units actually sitting somewhere; an empty shelf has no age.'
          }
        >
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Colour</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">On hand</TableCell>
                  <TableCell>Last received</TableCell>
                  <TableCell align="right">Age</TableCell>
                  <TableCell align="right">Capital tied</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((row) => (
                  // The id alone REPEATS: these rows are one per (item, location).
                  <TableRow key={agingRowKey(row)} hover>
                    <TableCell>
                      <Typography variant="body2">{row.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.sku ?? EM_DASH}
                      </Typography>
                    </TableCell>
                    <TableCell>{matrixAxisLabel(row.size, 'size')}</TableCell>
                    <TableCell>{matrixAxisLabel(row.color, 'color')}</TableCell>
                    <TableCell>{row.location_name}</TableCell>
                    <TableCell align="right">{formatQuantity(row.on_hand)}</TableCell>
                    <TableCell>{row.last_received_at ? new Date(row.last_received_at).toLocaleDateString() : EM_DASH}</TableCell>
                    <TableCell align="right">
                      <Tooltip
                        title={
                          row.age_days === null
                            ? 'No inbound movement has ever been recorded at this location, so the age is unknown. Unknown is not old, which is why these rows sort last.'
                            : 'Days since the most recent delivery into this location.'
                        }
                      >
                        <span>{formatAgeDays(row.age_days)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{formatMoney(row.capital_tied)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AllyviaEmpty>

        {rows.length > shown.length && (
          <Typography variant="caption" color="text.secondary">
            Showing the {ROW_LIMIT} oldest of {rows.length} rows. The rest are newer, not hidden for any other reason.
          </Typography>
        )}

        <Caveats
          notes={[agingCaveat(data?.approximation), AGING_IGNORES_WINDOW_NOTE, ARCHIVED_VARIANTS_CAVEAT, ANALYTICS_STALENESS_NOTE]}
        />
      </Stack>
    </MainCard>
  );
}
