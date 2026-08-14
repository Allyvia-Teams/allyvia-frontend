// views/inventory/StyleCatalog.tsx
//
// The style-level catalogue: one row per style, expandable into its variant
// matrix, and a variant panel showing where that variant's stock actually is.
//
// This is the one door at /inventory. It absorbed the old flat item table
// (views/inventory/index.tsx, deleted in size-scales Session C): the stats strip,
// CSV import, CSV/PDF export of the current filtered view, the item detail and
// metadata-edit modals, and the global search's ?itemId= deep link. What it
// deliberately did NOT absorb is direct quantity editing — InventoryModal opens
// metadataOnly here, because stock changes must be ledger movements
// (StockAdjustDialog), not silent overwrites of quantity_on_hand.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Menu,
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
import { IconChevronDown, IconChevronRight, IconDownload, IconFileTypeCsv, IconPlus, IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import { InventoryCSVImportModal, InventoryDetailsModal, InventoryModal, InventoryStats } from 'ui-component/inventory';

import { useDispatch, useSelector } from 'store';
import { fetchInventoryItems, fetchInventorySummary } from 'store/slices/inventory';
import { getItemDetails } from 'api/inventory.api';
import { ItemStockResponse, Location, Product, ProductVariant, getItemStock, listLocations, listProducts } from 'api/inventoryStock.api';
import type { InventoryItem } from 'types/inventory';
import { downloadInventoryTableCsv } from 'utils/reports/inventory/exportInventoryCsv';
import { downloadInventoryPdf } from 'utils/reports/inventory/inventoryPdfReport';
import { loadLogoAsDataUrl } from 'utils/reports/ReportUtils';
import { downloadCSV } from 'utils/csvDownload';
import logoUrl from 'assets/images/allyvia_logo.svg';

import MovementHistory from './MovementHistory';
import NewStyleDialog from './NewStyleDialog';
import StockAdjustDialog from './StockAdjustDialog';
import StockLevelChips from './StockLevelChips';
import StockoutStrip from './StockoutStrip';
import StyleMatrixGrid from './StyleMatrixGrid';
import { CATALOGUE_EXPORT_HEADERS, buildCataloguePdfData, filterStyles, flattenStylesToExportRows } from './catalogueExport';
import { describeAvailability, formatQuantity } from './stockFormat';

export default function StyleCatalog() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentRole } = useSelector((state) => state.auth);
  const uploadStatus = useSelector((state) => state.inventory.uploadStatus);

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

  // Absorbed from the flat table: import, export, item detail/edit.
  const [importOpen, setImportOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

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

  // The stats strip reads state.inventory (items + summary), exactly as the flat
  // table fed it; the fetches live here now that this page is its home.
  const refreshStats = useCallback(() => {
    dispatch(fetchInventoryItems() as any);
    dispatch(fetchInventorySummary() as any);
  }, [dispatch]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // A finished CSV import changes both the catalogue and the stats.
  useEffect(() => {
    if (importOpen && uploadStatus === 'success') {
      load();
      refreshStats();
    }
  }, [importOpen, uploadStatus, load, refreshStats]);

  // Global search deep link (?itemId=…, built in types/globalSearch.ts) —
  // absorbed from the flat table so search results keep landing somewhere.
  const processedItemDeepLinkRef = useRef<string | null>(null);
  const itemIdParam = searchParams.get('itemId');

  useEffect(() => {
    if (!itemIdParam || !currentRole?.company_id || processedItemDeepLinkRef.current === itemIdParam) {
      return;
    }

    let cancelled = false;

    const openInventoryRecord = async () => {
      try {
        const item = await getItemDetails(itemIdParam, currentRole.company_id);
        if (!cancelled) {
          setModalItem(item);
          setDetailsOpen(true);
        }
      } catch {
        // Item gone or inaccessible: clear the param and move on silently.
      } finally {
        if (!cancelled) {
          processedItemDeepLinkRef.current = itemIdParam;
          setSearchParams({}, { replace: true });
        }
      }
    };

    void openInventoryRecord();

    return () => {
      cancelled = true;
    };
  }, [currentRole?.company_id, itemIdParam, setSearchParams]);

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
    setItemError(null);
    loadStock(variant);
  };

  useEffect(() => {
    if (selected && refreshKey > 0) loadStock(selected);
    // refreshKey is the signal; selected is stable while a panel is open.
  }, [refreshKey, selected, loadStock]);

  // ---------------------------------------------------------------------------
  // Export: the catalogue's CURRENT FILTERED VIEW, flattened to variants.
  // filterStyles mirrors the server's search fields, so re-applying it here keeps
  // the export honest even while a search request is still in flight.
  // ---------------------------------------------------------------------------
  const filteredStyles = useMemo(() => filterStyles(products, search), [products, search]);

  const closeExport = () => setExportAnchorEl(null);

  const handleExportCsv = () => {
    const rows = flattenStylesToExportRows(filteredStyles);
    const filename = `catalogue_${new Date().toISOString().slice(0, 10)}.csv`;
    if (rows.length === 0) {
      // Headers, not a crash (and not a silent nothing): an empty filter result
      // still downloads a header row.
      downloadCSV(filename, [], [...CATALOGUE_EXPORT_HEADERS]);
    } else {
      // The reused exporter derives its columns from the row keys; the cast is a
      // shape adaptation, not a lie — every key it prefers is present.
      downloadInventoryTableCsv(filename, rows as unknown as InventoryItem[]);
    }
    closeExport();
  };

  const handleExportPdf = async () => {
    try {
      const logoDataUrl = await loadLogoAsDataUrl(logoUrl as unknown as string).catch(() => undefined);
      const { kpis, categories, alerts } = buildCataloguePdfData(filteredStyles);
      await downloadInventoryPdf({
        title: 'Catalogue Report',
        subtitle: `Generated on ${new Date().toLocaleDateString()}${search.trim() ? ` — filtered: “${search.trim()}”` : ''}`,
        kpis,
        categories,
        alerts,
        logoDataUrl
      });
    } finally {
      closeExport();
    }
  };

  // ---------------------------------------------------------------------------
  // Item detail / metadata edit, from the variant panel. Both need the flat item
  // record, which the variant row does not carry — fetch it on demand.
  // ---------------------------------------------------------------------------
  const openItemModal = async (mode: 'view' | 'edit') => {
    if (!selected || !currentRole?.company_id) return;
    setItemError(null);
    try {
      const item = await getItemDetails(String(selected.inventory_item_id), currentRole.company_id);
      setModalItem(item);
      if (mode === 'view') setDetailsOpen(true);
      else setEditOpen(true);
    } catch {
      setItemError('Could not load the item record for this variant.');
    }
  };

  const handleEditClosed = () => {
    setEditOpen(false);
    // The modal closes on save and on cancel alike; a reload is cheap and a
    // stale name/price on the row is not.
    load();
    refreshStats();
  };

  return (
    <Stack spacing={2}>
      {/*
        Above the catalogue on purpose: what is about to run out is the one thing
        on this page that has a deadline. It loads independently, so a slow or
        failed reorder check never delays the styles below it.
      */}
      <StockoutStrip />

      {/* Absorbed stats strip — unique items, QOH, low/out of stock, value. */}
      <InventoryStats />

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
            <Button size="small" variant="outlined" startIcon={<IconFileTypeCsv size={16} />} onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Tooltip title="Export the current filtered view">
              <IconButton size="small" onClick={(event) => setExportAnchorEl(event.currentTarget)}>
                <IconDownload size={18} />
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
              <Button size="small" onClick={() => openItemModal('view')}>
                Details
              </Button>
              <Button size="small" onClick={() => openItemModal('edit')}>
                Edit item
              </Button>
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
            {itemError && <Alert severity="error">{itemError}</Alert>}

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

      <InventoryCSVImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <InventoryDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} item={modalItem} />

      {/* metadataOnly: quantity edits are ledger movements (Adjust stock), never form writes. */}
      <InventoryModal open={editOpen} onClose={handleEditClosed} mode="edit" item={modalItem} metadataOnly />

      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={closeExport}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleExportCsv}>Download CSV</MenuItem>
        <MenuItem onClick={handleExportPdf}>Download PDF Report</MenuItem>
      </Menu>
    </Stack>
  );
}
