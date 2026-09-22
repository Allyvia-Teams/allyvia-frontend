// views/inventory/SellThroughView.tsx
//
// Sell-through at the VARIANT grain, with the company's margin figures above it
// and the ranked roll-ups below.
//
// WHY THE VARIANT TABLE IS HERE AT ALL. A roll-up recomputes its ratio from
// summed units, so a style's sell-through is NOT the average of its variants'
// and cannot be taken apart again on the client. The size that did not sell is
// invisible in every aggregate the API ships, and it is the thing a buyer needs
// to see. So the variant rows are rendered as they arrive.
//
// The rows arrive in name order (InventoryItem.Meta.ordering) and stay in it.
// Nothing here is re-sorted: the search box and the row cap only hide rows, so
// what is on screen is always a prefix of what the server sent.

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

import { SellThroughResponse, getSellThrough } from 'api/inventoryAnalytics.api';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { formatRatio } from 'utils/financeFormat';

import RankedAggregates from './RankedAggregates';
import { Caveats, GmroiStrip, InsightsViewProps, SellThroughCell, ToneValue, WindowCaption } from './InsightsChrome';
import {
  ANALYTICS_STALENESS_NOTE,
  ARCHIVED_VARIANTS_CAVEAT,
  LOCATION_SCOPE_CAVEAT,
  NET_RETURNS_NOTE,
  SellThroughRow,
  analyticsQuery,
  describeAnalyticsError,
  describeDaysOfCover,
  emptyMessageFor,
  formatWeeksOfSupply,
  isNetReturns,
  matrixAxisLabel,
  presenceOf,
  sellThroughDefinitionFor,
  signTone
} from './insights';
import { formatMoney } from './purchasing';
import { EM_DASH, formatQuantity } from './stockFormat';

/** These endpoints do not paginate, so a big catalogue arrives whole. */
const INITIAL_ROWS = 100;

const matches = (row: SellThroughRow, search: string): boolean => {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  return [row.name, row.sku ?? '', row.style_code ?? '', row.category, row.size, row.color].some((field) =>
    field.toLowerCase().includes(needle)
  );
};

export default function SellThroughView({ start, end, locationId, refreshKey }: InsightsViewProps) {
  const [data, setData] = useState<SellThroughResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(INITIAL_ROWS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getSellThrough(analyticsQuery({ start, end, locationId })));
      setError(null);
    } catch (err) {
      setError(describeAnalyticsError(err));
      // The previous window's figures are cleared: leaving them under a caption
      // that now names a different window is worse than an empty panel.
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [start, end, locationId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const rows = useMemo(() => (data?.items ?? []).filter((row) => matches(row, search)), [data, search]);
  const shown = rows.slice(0, visible);
  const presence = presenceOf(data, data?.items);

  return (
    <Stack spacing={2}>
      <MainCard
        title="Sell-through"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <WindowCaption envelope={data} />
          </Stack>
        }
      >
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <GmroiStrip
            block={data?.totals ?? null}
            loading={loading}
            scopeNote={
              locationId
                ? 'Margin figures cover the variants in scope for this window. Cost of goods uses each item’s current average cost, so a markdown can show a loss.'
                : 'Company-wide for this window. Cost of goods uses each item’s current average cost, so a markdown can show a loss.'
            }
          />

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Find a variant"
              placeholder="Name, SKU, style, colour"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisible(INITIAL_ROWS);
              }}
              sx={{ minWidth: 260 }}
            />
            <Box flexGrow={1} />
            <Typography variant="caption" color="text.secondary">
              {rows.length === 0 ? 'No variants' : `Showing ${Math.min(visible, rows.length)} of ${rows.length}`}
            </Typography>
          </Stack>

          <AllyviaEmpty
            isLoading={loading && !data}
            isEmpty={!loading && presence !== 'present'}
            type="table"
            height={260}
            title={presence === 'absent' ? 'Not loaded' : 'No variants'}
            description={
              // 'absent' gets no claim about the shop: we cannot say there is
              // nothing to measure on the strength of a request that failed.
              emptyMessageFor(presence, 'variants') ?? 'These figures have not loaded.'
            }
          >
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Variant</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Colour</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Opening</TableCell>
                    <TableCell align="right">Received</TableCell>
                    <TableCell align="right">Sold</TableCell>
                    <TableCell align="right">On hand</TableCell>
                    <TableCell>Sell-through</TableCell>
                    <TableCell align="right">Velocity</TableCell>
                    <TableCell>Days of cover</TableCell>
                    <TableCell>Weeks of supply</TableCell>
                    <TableCell align="right">Stock at cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shown.length === 0 && !loading && presence === 'present' && (
                    <TableRow>
                      <TableCell colSpan={13}>
                        <Typography variant="body2" color="text.secondary">
                          No variants match that search.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {shown.map((row) => {
                    const netReturns = isNetReturns(row);
                    const cover = describeDaysOfCover(row.days_of_cover, row.daily_velocity);
                    return (
                      <TableRow key={row.inventory_item_id} hover>
                        <TableCell>
                          <Typography variant="body2">{row.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.sku ?? EM_DASH}
                          </Typography>
                        </TableCell>
                        <TableCell>{matrixAxisLabel(row.size, 'size')}</TableCell>
                        <TableCell>{matrixAxisLabel(row.color, 'color')}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell align="right">{formatQuantity(row.opening_stock)}</TableCell>
                        <TableCell align="right">{formatQuantity(row.units_received)}</TableCell>
                        <TableCell align="right">
                          <ToneValue tone={signTone(row.units_sold)} note={netReturns ? NET_RETURNS_NOTE : null}>
                            {formatQuantity(row.units_sold)}
                          </ToneValue>
                        </TableCell>
                        <TableCell align="right">{formatQuantity(row.on_hand)}</TableCell>
                        <TableCell>
                          <SellThroughCell fraction={row.sell_through} netReturns={netReturns} />
                        </TableCell>
                        <TableCell align="right">
                          <ToneValue tone={signTone(row.daily_velocity)} note={netReturns ? NET_RETURNS_NOTE : null}>
                            {`${formatRatio(row.daily_velocity, 2)}/day`}
                          </ToneValue>
                        </TableCell>
                        <TableCell>
                          <ToneValue tone={cover.tone} note={cover.note}>
                            {cover.display}
                          </ToneValue>
                        </TableCell>
                        <TableCell>
                          <ToneValue tone={signTone(row.weeks_of_supply)} note={cover.note}>
                            {formatWeeksOfSupply(row.weeks_of_supply)}
                          </ToneValue>
                        </TableCell>
                        <TableCell align="right">{formatMoney(row.stock_value_at_cost)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AllyviaEmpty>

          {rows.length > shown.length && (
            <Stack direction="row" justifyContent="center">
              <Button size="small" onClick={() => setVisible((current) => current + INITIAL_ROWS)}>
                Show {Math.min(INITIAL_ROWS, rows.length - shown.length)} more of {rows.length - shown.length} hidden
              </Button>
            </Stack>
          )}

          <Caveats
            notes={[
              sellThroughDefinitionFor(locationId ? 'location' : 'company'),
              locationId ? LOCATION_SCOPE_CAVEAT : null,
              ARCHIVED_VARIANTS_CAVEAT,
              ANALYTICS_STALENESS_NOTE,
              'Days of cover and weeks of supply are on-hand ÷ velocity in this window. Both are undefined when nothing sold, and both go negative when more units came back than went out.'
            ]}
          />
        </Stack>
      </MainCard>

      <MainCard title="What sold, ranked">
        <RankedAggregates
          by_style={data?.by_style ?? []}
          by_category={data?.by_category ?? []}
          by_size={data?.by_size ?? []}
          by_color={data?.by_color ?? []}
          loading={loading}
          absent={presence === 'absent'}
          scopeNote={
            locationId
              ? 'Ranked across the variants in scope for this location and window.'
              : 'Ranked company-wide across every variant for this window.'
          }
        />
      </MainCard>
    </Stack>
  );
}
