// views/inventory/LowPerformersView.tsx
//
// Markdown candidates: what is not selling, how long it has been sitting, and
// how much money is in it.
//
// TWO SURFACES, ONE ANSWER. Insights › Overstock Detection asks a similar
// question from an older primitive, and the two disagree BY DESIGN: that one
// substitutes 999 days of cover for an item that has never sold (the value is
// persisted and fed to an LLM, so it cannot be changed), while these endpoints
// return null. §3.5 asks that this screen feed that card rather than duplicate
// it, so both are read into the SAME row type — `SlowMoverView` — by
// `fromLowPerformer` and `fromInsightsSlowMover`, and the sentinel is converted
// to the flag it always meant on the way in. 999 never reaches a screen as a
// number of days, and the divergence is stated on the artefact instead of being
// left for someone to file as a bug.
//
// THE RANK IS THE SERVER'S AND IS NOT RE-SORTED — with one partition. It ranks
// by sell-through ascending, which is right, except that a NEGATIVE
// sell-through is the smallest number of all: one refund with no matching sale
// in the window takes the top of the markdown list. That row is not the worst
// seller in the shop, it is an item that sold and came back, and its window says
// nothing about demand. `rankLowPerformers` splits those out and leaves the
// order inside each partition exactly as it arrived.

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
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

import { LowPerformersResponse, getLowPerformers } from 'api/inventoryAnalytics.api';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import Grid from '@mui/material/Grid';

import { Caveats, InsightsViewProps, SellThroughCell, ToneValue, WindowCaption, textColorForTone } from './InsightsChrome';
import {
  ANALYTICS_STALENESS_NOTE,
  ARCHIVED_VARIANTS_CAVEAT,
  LowPerformerRow,
  NET_RETURNS_NOTE,
  OVERSTOCK_DIVERGENCE_NOTE,
  describeAnalyticsError,
  describeDaysOfCover,
  describeLowPerformerTotal,
  formatAgeDays,
  fromLowPerformer,
  lowPerformersQuery,
  presenceOf,
  rankLowPerformers,
  slowMoverBar,
  slowMoverScaleMax
} from './insights';
import { formatMoney } from './purchasing';
import { EM_DASH, formatQuantity } from './stockFormat';

const LIMIT_OPTIONS = [25, 50, 100, 200];

/** How many bars the "worst first" strip draws before the table takes over. */
const BAR_COUNT = 5;

export default function LowPerformersView({ start, end, locationId, refreshKey }: InsightsViewProps) {
  const [data, setData] = useState<LowPerformersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(25);
  const [minCapitalInput, setMinCapitalInput] = useState('');
  const [minCapital, setMinCapital] = useState('');

  const query = useMemo(
    () => lowPerformersQuery({ start, end, locationId, limit, minCapital }),
    [start, end, locationId, limit, minCapital]
  );

  // `min_capital=NaN` is an uncaught 500 with an HTML body, so the builder drops
  // anything that is not a plain decimal. Asking it what it kept is how the
  // field knows to say "not applied" instead of the filter silently doing
  // nothing.
  const minCapitalApplied = new URLSearchParams(query).has('min_capital');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getLowPerformers(query));
      setError(null);
    } catch (err) {
      setError(describeAnalyticsError(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const { candidates, netReturns } = useMemo(() => rankLowPerformers<LowPerformerRow>(data?.items), [data]);
  const presence = presenceOf(data, data?.items);

  const bars = useMemo(() => {
    const views = candidates.slice(0, BAR_COUNT).map(fromLowPerformer);
    const scale = slowMoverScaleMax(views);
    return views.map((view) => ({ view, bar: slowMoverBar(view, scale) }));
  }, [candidates]);

  const renderRows = (rows: LowPerformerRow[], isNetReturns: boolean) =>
    rows.map((row) => {
      const cover = describeDaysOfCover(row.days_of_cover, row.daily_velocity);
      return (
        <TableRow key={row.inventory_item_id} hover>
          <TableCell>
            <Typography variant="body2">{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.sku ?? EM_DASH}
            </Typography>
          </TableCell>
          <TableCell>
            <SellThroughCell fraction={row.sell_through} netReturns={isNetReturns} />
          </TableCell>
          <TableCell align="right">{formatQuantity(row.on_hand)}</TableCell>
          <TableCell>
            <ToneValue tone={cover.tone} note={cover.note}>
              {cover.display}
            </ToneValue>
          </TableCell>
          <TableCell>
            <Tooltip
              title={
                row.age_days === null
                  ? 'No inbound movement was ever recorded for this item, so its age is unknown — which is not the same as old.'
                  : 'Days since the most recent delivery into stock. Where the item is held at several locations this is the OLDEST of them.'
              }
            >
              <span>{formatAgeDays(row.age_days)}</span>
            </Tooltip>
          </TableCell>
          <TableCell align="right">{formatMoney(row.capital_tied)}</TableCell>
        </TableRow>
      );
    });

  return (
    <Stack spacing={2}>
      <MainCard
        title="Markdown candidates"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <WindowCaption envelope={data} />
          </Stack>
        }
      >
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={1.5} alignItems="flex-start" flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label="Candidates"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              sx={{ width: 140 }}
            >
              {LIMIT_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  Top {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Minimum capital"
              placeholder="e.g. 250"
              value={minCapitalInput}
              onChange={(event) => setMinCapitalInput(event.target.value)}
              onBlur={() => setMinCapital(minCapitalInput)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setMinCapital(minCapitalInput);
              }}
              error={minCapitalInput.trim() !== '' && !minCapitalApplied && minCapital === minCapitalInput}
              helperText={
                minCapitalInput.trim() !== '' && !minCapitalApplied && minCapital === minCapitalInput
                  ? 'Not applied — enter a plain number like 250 or 12.50'
                  : 'Hides candidates with less than this much stock at cost'
              }
              sx={{ width: 240 }}
            />

            <Box flexGrow={1} />

            <Grid container spacing={2} sx={{ width: { xs: '100%', md: 420 } }}>
              <Grid size={6}>
                <AllyviaStats title="Candidates listed" value={formatQuantity(candidates.length)} size="small" loading={loading} />
              </Grid>
              <Grid size={6}>
                <AllyviaStats
                  title="Capital in the list"
                  value={formatMoney(data?.total_capital_tied)}
                  size="small"
                  loading={loading}
                  chip={
                    <AllyviaChip
                      size="small"
                      variant="outlined"
                      label="listed only"
                      tooltipTitle={`${describeLowPerformerTotal(data?.total_capital_tied, (data?.items ?? []).length)}. It is summed over the rows shown, so raising the limit raises this figure — it is never a company total.`}
                    />
                  }
                />
              </Grid>
            </Grid>
          </Stack>

          <AllyviaEmpty
            isLoading={loading && !data}
            isEmpty={!loading && presence !== 'present'}
            type="list"
            height={220}
            title={presence === 'absent' ? 'Not loaded' : 'Nothing to mark down'}
            description={
              presence === 'absent' ? 'These figures have not loaded.' : 'Every item that held stock in this window sold some of it.'
            }
          >
            <Stack spacing={2}>
              {bars.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Slowest first
                  </Typography>
                  {bars.map(({ view, bar }) => (
                    <Box key={view.key} sx={{ mb: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="body2">{view.name}</Typography>
                        <Typography variant="body2" sx={{ color: textColorForTone(bar.tone), fontWeight: 600 }}>
                          {bar.display}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={bar.fraction * 100}
                        color={bar.tone === 'negative' ? 'error' : 'primary'}
                        sx={{ height: 8, borderRadius: 1, my: 0.5 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatQuantity(view.unitsOnHand)} units · {formatMoney(view.capitalTied)} tied up
                        {bar.outOfRange ? ' · off the scale, so the bar is pinned' : ''}
                      </Typography>
                    </Box>
                  ))}
                  <Typography variant="caption" color="text.secondary">
                    Bars are scaled against the slowest item that is actually selling. An item that has never sold is drawn full and
                    labelled, rather than being given a number of days it does not have.
                  </Typography>
                </Box>
              )}

              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Sell-through</TableCell>
                      <TableCell align="right">On hand</TableCell>
                      <TableCell>Days of cover</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell align="right">Capital tied</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {candidates.length === 0 && !loading && presence === 'present' && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            No markdown candidates for this window.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {renderRows(candidates, false)}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </AllyviaEmpty>

          <Caveats
            notes={[
              'Ranked by sell-through, lowest first, with the most capital breaking a tie. That is the server’s order and it is not re-sorted here.',
              ARCHIVED_VARIANTS_CAVEAT,
              ANALYTICS_STALENESS_NOTE,
              OVERSTOCK_DIVERGENCE_NOTE
            ]}
          />
        </Stack>
      </MainCard>

      {netReturns.length > 0 && (
        <MainCard title="Returns, not slow sellers">
          <Stack spacing={1.5}>
            <Alert severity="info">{NET_RETURNS_NOTE}</Alert>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Sell-through</TableCell>
                    <TableCell align="right">On hand</TableCell>
                    <TableCell>Days of cover</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell align="right">Capital tied</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{renderRows(netReturns, true)}</TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary">
              These rows have a negative sell-through, which is the smallest number there is — left in the ranking they would head the
              markdown list. They are shown here instead, in the order the server gave them.
            </Typography>
          </Stack>
        </MainCard>
      )}
    </Stack>
  );
}
