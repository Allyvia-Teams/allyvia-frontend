// views/inventory/StyleCatalog.tsx
//
// The style-level catalogue: one row per style, expandable into its variant
// matrix, and a variant panel showing where that variant's stock actually is.
//
// Deliberately separate from views/inventory/index.tsx, which is the pre-existing
// flat item table plus its QuickBooks sync and CSV import. That view is not wrong
// — it is just the wrong grain for a boutique, where "Linen Shirt" is one thing to
// merchandise and twelve things to count.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
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
import { IconChevronDown, IconChevronRight, IconPlus, IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { ItemStockResponse, Location, Product, ProductVariant, getItemStock, listLocations, listProducts } from 'api/inventoryStock.api';

import MovementHistory from './MovementHistory';
import NewStyleDialog from './NewStyleDialog';
import StockAdjustDialog from './StockAdjustDialog';
import StockLevelChips from './StockLevelChips';
import StyleMatrixGrid from './StyleMatrixGrid';
import { describeAvailability, formatQuantity } from './stockFormat';

export default function StyleCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const [stock, setStock] = useState<ItemStockResponse | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  // Bumped after an adjustment so both the stock panel and the ledger refetch.
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productRows, locationRows] = await Promise.all([listProducts({ search: search || undefined }), listLocations()]);
      setProducts(productRows);
      setLocations(locationRows);
      setError(null);
    } catch {
      setError('Could not load the style catalogue.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const loadStock = useCallback(async (variant: ProductVariant) => {
    setStockLoading(true);
    try {
      setStock(await getItemStock(variant.inventory_item_id));
    } catch {
      setStock(null);
    } finally {
      setStockLoading(false);
    }
  }, []);

  const selectVariant = (variant: ProductVariant) => {
    setSelected(variant);
    setStock(null);
    loadStock(variant);
  };

  useEffect(() => {
    if (selected && refreshKey > 0) loadStock(selected);
    // refreshKey is the signal; selected is stable while a panel is open.
  }, [refreshKey, selected, loadStock]);

  return (
    <Stack spacing={2}>
      <MainCard
        title="Styles"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <Tooltip title="Reload">
              <IconButton size="small" onClick={load}>
                <IconRefresh size={18} />
              </IconButton>
            </Tooltip>
            <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={() => setCreateOpen(true)}>
              New style
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2}>
          <TextField
            size="small"
            label="Search styles"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ maxWidth: 320 }}
            helperText="Matches name, style code, category or brand."
          />

          {error && <Alert severity="error">{error}</Alert>}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={40} />
                  <TableCell>Style</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Axes</TableCell>
                  <TableCell align="right">Variants</TableCell>
                  <TableCell align="right">On hand</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">
                        No styles yet. Existing items were grouped into styles by the backfill; create a new style to build a size × colour
                        matrix.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {products.map((product) => {
                  const isOpen = expanded === product.id;
                  return [
                    <TableRow key={product.id} hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => setExpanded(isOpen ? null : product.id)}>
                          {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{product.name}</Typography>
                      </TableCell>
                      <TableCell>{product.style_code || '—'}</TableCell>
                      <TableCell>{product.category || '—'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {product.sizes.length > 0 && <Chip size="small" variant="outlined" label={`${product.sizes.length} sizes`} />}
                          {product.colors.length > 0 && <Chip size="small" variant="outlined" label={`${product.colors.length} colours`} />}
                          {product.sizes.length === 0 && product.colors.length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                              Single variant
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{product.variant_count}</TableCell>
                      <TableCell align="right">{formatQuantity(product.total_on_hand)}</TableCell>
                    </TableRow>,
                    <TableRow key={`${product.id}-detail`}>
                      <TableCell colSpan={7} sx={{ py: 0, borderBottom: isOpen ? undefined : 'none' }}>
                        <Collapse in={isOpen} unmountOnExit>
                          <Box sx={{ py: 2 }}>
                            <StyleMatrixGrid variants={product.variants} onSelectVariant={selectVariant} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  ];
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </MainCard>

      {selected && (
        <MainCard
          title={`${selected.name}${selected.sku ? ` · ${selected.sku}` : ''}`}
          secondary={
            <Stack direction="row" spacing={1} alignItems="center">
              {stockLoading && <CircularProgress size={18} />}
              <Button size="small" variant="outlined" onClick={() => setAdjustOpen(true)} disabled={!stock}>
                Adjust stock
              </Button>
              <Button size="small" onClick={() => setSelected(null)}>
                Close
              </Button>
            </Stack>
          }
        >
          <Stack spacing={2}>
            {stock && (
              <>
                <Typography variant="body2">{describeAvailability(stock)}</Typography>
                <StockLevelChips stock={stock} reorderPoint={selected.reorder_point} />
              </>
            )}
            {!stock && !stockLoading && <Alert severity="warning">Could not load stock for this variant.</Alert>}

            <Divider />
            <Typography variant="subtitle1">Stock ledger</Typography>
            <MovementHistory itemId={selected.inventory_item_id} locations={locations} refreshKey={refreshKey} />
          </Stack>
        </MainCard>
      )}

      <NewStyleDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />

      {selected && (
        <StockAdjustDialog
          open={adjustOpen}
          onClose={() => setAdjustOpen(false)}
          onAdjusted={() => {
            setRefreshKey((key) => key + 1);
            load();
          }}
          itemId={selected.inventory_item_id}
          itemName={selected.name}
          stock={stock}
          locations={locations}
        />
      )}
    </Stack>
  );
}
