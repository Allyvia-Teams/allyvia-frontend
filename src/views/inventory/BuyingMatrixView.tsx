// views/inventory/BuyingMatrixView.tsx
//
// The buying view: size down one axis, colour across the other, and what
// happened in each square. This is the grid a buyer re-orders from — it answers
// "we sold out of M in Ivory and never touched XS" — plus the per-store
// dimension, because the same style can be a hit in one shop and dead in
// another.
//
// THE GRID HAS AN INVISIBLE CELL AND THE BACKEND WILL NOT FIX IT. `sizes` and
// `colors` are built with `if row['size']` / `if row['color']`, dropping blanks,
// while cells are keyed `(size or '', color or '')`. So a one-size, no-colour
// variant produces a REAL cell at ("", "") that no sizes x colors intersection
// ever reaches — verified live with 4 units and $20 of capital simply absent
// from the grid. `matrixAxes` adds the blank entry back and says it did, which
// is the difference between an accurate grid and a grid that is quietly missing
// a shelf.
//
// A MISSING INTERSECTION IS EMPTY, NOT ZERO. `cells` is a flat, SPARSE list —
// combinations that do not exist are simply absent — so drawing a 0 there would
// claim a variant exists and has never sold, which is a reason to stop buying
// something that was never bought in the first place.

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
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

import { MatrixResponse, getStyleMatrix } from 'api/inventoryAnalytics.api';
import { Product, listProducts } from 'api/inventoryStock.api';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

import RankedAggregates from './RankedAggregates';
import { Caveats, InsightsViewProps, WindowCaption, textColorForTone } from './InsightsChrome';
import {
  ANALYTICS_STALENESS_NOTE,
  ARCHIVED_VARIANTS_CAVEAT,
  LOCATION_SCOPE_CAVEAT,
  MatrixCell,
  describeAnalyticsError,
  formatFractionPercent,
  matrixAxes,
  matrixAxisLabel,
  matrixCellAt,
  matrixIndex,
  matrixQuery,
  presenceOf,
  sellThroughDefinitionFor,
  signTone
} from './insights';
import { formatMoney } from './purchasing';
import { EM_DASH, formatQuantity } from './stockFormat';

/** One square of the grid: what is left, what went, and how much of it sold. */
function MatrixCellBody({ cell }: { cell: MatrixCell | null }) {
  if (!cell) {
    return (
      <Tooltip title="This size and colour do not exist for this style. It is not a variant that failed to sell — there is nothing here.">
        <Typography variant="body2" color="text.disabled">
          {EM_DASH}
        </Typography>
      </Tooltip>
    );
  }
  const tone = signTone(cell.sell_through);
  return (
    <Tooltip
      title={`${formatQuantity(cell.variants)} ${cell.variants === 1 ? 'variant' : 'variants'} · opening ${formatQuantity(
        cell.opening_stock
      )} · received ${formatQuantity(cell.units_received)} · ${formatMoney(cell.stock_value_at_cost)} at cost`}
    >
      <Stack spacing={0.25} sx={{ minWidth: 78 }}>
        <Typography variant="body2" fontWeight={600}>
          {formatQuantity(cell.on_hand)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          sold {formatQuantity(cell.units_sold)}
        </Typography>
        <Typography variant="caption" sx={{ color: textColorForTone(tone) }}>
          {formatFractionPercent(cell.sell_through, 0)}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

export default function BuyingMatrixView({ start, end, locationId, refreshKey }: InsightsViewProps) {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [category, setCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // `product_id` has the same uncaught-500 trap as `location_id`, so the
      // builder uuid-gates it; the picker only ever offers real ids anyway.
      setData(await getStyleMatrix(matrixQuery({ start, end, locationId, productId, category })));
      setError(null);
    } catch (err) {
      setError(describeAnalyticsError(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [start, end, locationId, productId, category]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    // The style and category pickers come from the catalogue, not from the
    // matrix payload: the payload's own `by_category` is narrowed by whatever
    // filter is already applied, so choosing from it would let a user filter
    // themselves into a corner they cannot get out of.
    listProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const axes = useMemo(() => matrixAxes(data?.cells, data?.sizes, data?.colors), [data]);
  const index = useMemo(() => matrixIndex(data?.cells), [data]);
  const presence = presenceOf(data, data?.cells);

  const blankNote =
    axes.addedBlankSize || axes.addedBlankColor
      ? `A ${axes.addedBlankSize && axes.addedBlankColor ? 'row and a column have' : axes.addedBlankSize ? 'row has' : 'column has'} been added for variants with no ${
          axes.addedBlankSize && axes.addedBlankColor ? 'size or colour' : axes.addedBlankSize ? 'size' : 'colour'
        }. The server leaves blanks off its axes, so without it that stock would not appear on this grid at all.`
      : null;

  return (
    <Stack spacing={2}>
      <MainCard
        title="Size and colour performance"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <WindowCaption envelope={data} />
          </Stack>
        }
      >
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              select
              size="small"
              label="Style"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              sx={{ minWidth: 240 }}
            >
              <MenuItem value="">All styles</MenuItem>
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.style_code ? `${product.style_code} — ${product.name}` : product.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={productId !== ''}
              helperText={productId ? 'A chosen style wins over the category filter' : ' '}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <AllyviaEmpty
            isLoading={loading && !data}
            isEmpty={!loading && presence !== 'present'}
            type="grid"
            height={260}
            title={presence === 'absent' ? 'Not loaded' : 'Nothing in this grid'}
            description={presence === 'absent' ? 'These figures have not loaded.' : 'No variants match this style, category and location.'}
          >
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>Size \ Colour</TableCell>
                    {axes.colors.map((color) => (
                      <TableCell key={`col:${color}`} align="center">
                        {matrixAxisLabel(color, 'color')}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {axes.sizes.map((size) => (
                    <TableRow key={`row:${size}`} hover>
                      <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', fontWeight: 600 }}>
                        {matrixAxisLabel(size, 'size')}
                      </TableCell>
                      {axes.colors.map((color) => (
                        <TableCell key={`cell:${size}:${color}`} align="center">
                          <MatrixCellBody cell={matrixCellAt(index, size, color)} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AllyviaEmpty>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Each square shows units on hand, units sold in the window, and sell-through. An empty square means that size and colour
              combination does not exist — it is not a variant that failed to sell.
            </Typography>
          </Box>

          <Caveats
            notes={[
              blankNote,
              locationId
                ? 'This grid is scoped to one location, so a style can look very different here than it does company-wide.'
                : 'This grid covers every location. Pick one at the top of the page to see how a style performs in a single store.',
              sellThroughDefinitionFor(locationId ? 'location' : 'company'),
              locationId ? LOCATION_SCOPE_CAVEAT : null,
              ARCHIVED_VARIANTS_CAVEAT,
              ANALYTICS_STALENESS_NOTE
            ]}
          />
        </Stack>
      </MainCard>

      <MainCard title="Ranked within this selection">
        <RankedAggregates
          by_style={data?.by_style ?? []}
          by_category={data?.by_category ?? []}
          by_size={data?.by_size ?? []}
          by_color={data?.by_color ?? []}
          loading={loading}
          absent={presence === 'absent'}
          initialDimension="size"
          scopeNote={
            data?.product_id || data?.category
              ? `Ranked over the narrowed selection only${data?.product_id ? ' (one style)' : ` (category “${data?.category}”)`}, not company-wide.`
              : 'Ranked over every variant in scope for this window.'
          }
        />
      </MainCard>
    </Stack>
  );
}
