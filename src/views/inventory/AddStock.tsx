import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { IconBarcode, IconPackageImport, IconPlus, IconPrinter } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import { PageHeader } from 'ui-component/frame';
import { adjustItemStock, createProduct, listLocations, listProducts, Location, Product } from 'api/inventoryStock.api';
import { lookupInventory } from 'api/inventoryLookup.api';

import { parseApiError, statusOf } from './apiErrors';
import { formatQuantity } from './stockFormat';
import { LookupResolvedResponse, isSearchResponse } from './sizing';
import { toCreatePayload } from './matrix';
import NewStyleDialog from './NewStyleDialog';
import ReceivingLabelsDialog, { ReceivingLabelItem } from './ReceivingLabelsDialog';

type NewStylePayload = ReturnType<typeof toCreatePayload>;

interface ExistingItem {
  variantId: number;
  name: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  onHandByLocation: Record<string, number>;
}

type BatchRow =
  | { key: string; kind: 'existing'; item: ExistingItem; quantity: number; saved: boolean; uncertain?: boolean }
  | { key: string; kind: 'new'; payload: NewStylePayload; saved: boolean; uncertain?: boolean };

function cellOnHand(onHandByLocation: Record<string, number>, locationId: string | null, locations: Location[]): number {
  const resolvedId = locationId || locations.find((location) => location.is_default)?.id || locations[0]?.id || null;
  if (!resolvedId) return Object.values(onHandByLocation).reduce((sum, quantity) => sum + quantity, 0);
  return onHandByLocation[resolvedId] ?? 0;
}

function resolveItem(response: LookupResolvedResponse): ExistingItem | null {
  const targetId = response.scanned_variant_id;
  if (targetId == null) return null;
  for (const group of response.matrix) {
    for (const cell of group.cells) {
      if (cell.variant_id !== targetId) continue;
      return {
        variantId: cell.variant_id,
        name: response.style?.name || cell.sku || cell.barcode || `Item ${cell.variant_id}`,
        size: cell.size_key || '',
        color: group.color || '',
        sku: cell.sku || '',
        barcode: cell.barcode || '',
        onHandByLocation: cell.on_hand_by_location ?? {}
      };
    }
  }
  return null;
}

const variantLabel = (size: string, color: string) => [color, size].filter(Boolean).join(' · ') || 'One size';

export default function AddStockPage() {
  const scanRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState('');
  const [quantityValue, setQuantityValue] = useState('1');
  const [found, setFound] = useState<ExistingItem | null>(null);
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [newStyleOpen, setNewStyleOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [labels, setLabels] = useState<ReceivingLabelItem[]>([]);
  const [printOpen, setPrintOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasSaved = rows.some((row) => row.saved);
  const hasUncertain = rows.some((row) => row.uncertain);
  const pendingRows = rows.filter((row) => !row.saved && !row.uncertain);
  const pendingUnits = pendingRows.reduce(
    (total, row) =>
      total + (row.kind === 'existing' ? row.quantity : row.payload.variants.reduce((sum, variant) => sum + variant.opening_qty, 0)),
    0
  );
  const emptyNewStyle = pendingRows.some((row) => row.kind === 'new' && row.payload.variants.every((variant) => variant.opening_qty === 0));
  const defaultLocation = useMemo(() => locations.find((location) => location.is_default) ?? locations[0] ?? null, [locations]);

  useEffect(() => {
    let cancelled = false;
    listLocations()
      .then((result) => {
        if (!cancelled) setLocations(result.filter((location) => location.is_active));
      })
      .catch(() => {
        if (!cancelled) setError('Could not load stock locations. Refresh and try again.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!locationId && defaultLocation) setLocationId(defaultLocation.id);
  }, [defaultLocation, locationId]);

  const focusScan = () => window.setTimeout(() => scanRef.current?.focus(), 0);

  const lookupCode = async () => {
    const code = scanValue.trim();
    if (!code || lookingUp) return;
    setLookingUp(true);
    setError(null);
    setNotice(null);
    setUnknownCode(null);
    setFound(null);
    try {
      let response;
      try {
        response = await lookupInventory({ barcode: code });
      } catch (barcodeError) {
        if (statusOf(barcodeError) !== 404) throw barcodeError;
        response = await lookupInventory({ sku: code });
      }
      const item = isSearchResponse(response) ? null : resolveItem(response);
      if (item) {
        setFound(item);
        setQuantityValue('1');
        window.setTimeout(() => quantityRef.current?.focus(), 0);
      } else {
        setUnknownCode(code);
      }
      setScanValue('');
    } catch (lookupError) {
      if (statusOf(lookupError) === 404) setUnknownCode(code);
      else setError(parseApiError(lookupError).summary);
      setScanValue('');
    } finally {
      setLookingUp(false);
    }
  };

  const stageExisting = () => {
    if (!found) return;
    const quantity = Number(quantityValue);
    if (!/^\d+$/.test(quantityValue.trim()) || !Number.isSafeInteger(quantity) || quantity <= 0) {
      setError('Enter a whole number greater than zero.');
      return;
    }
    setRows((current) => {
      const duplicate = current.find((row) => row.kind === 'existing' && !row.saved && row.item.variantId === found.variantId);
      if (duplicate)
        return current.map((row) => (row === duplicate && row.kind === 'existing' ? { ...row, quantity: row.quantity + quantity } : row));
      return [...current, { key: crypto.randomUUID(), kind: 'existing', item: found, quantity, saved: false }];
    });
    setFound(null);
    setQuantityValue('1');
    setError(null);
    focusScan();
  };

  const stageNew = (payload: NewStylePayload) => {
    setRows((current) => [...current, { key: crypto.randomUUID(), kind: 'new', payload, saved: false }]);
    setUnknownCode(null);
    setError(null);
    setNotice(`${payload.name} added to the batch. Review it below before saving.`);
    focusScan();
  };

  const addLabels = (incoming: ReceivingLabelItem[]) => {
    setLabels((current) => {
      const byId = new Map(current.map((item) => [item.id, item]));
      incoming.forEach((item) => {
        const previous = byId.get(item.id);
        byId.set(item.id, { ...item, quantity: (previous?.quantity ?? 0) + item.quantity });
      });
      return [...byId.values()];
    });
  };

  const labelsFromProduct = (product: Product, payload: NewStylePayload): ReceivingLabelItem[] => {
    const receivedBySku = new Map(payload.variants.map((variant) => [variant.sku, variant.opening_qty]));
    return product.variants
      .filter((variant) => variant.barcode && (receivedBySku.get(variant.sku || '') ?? 0) > 0)
      .map((variant) => ({
        id: variant.inventory_item_id,
        name: variant.name,
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        quantity: receivedBySku.get(variant.sku || '') ?? 0
      }));
  };

  const markAlreadySaved = async (row: BatchRow) => {
    setError(null);
    if (row.kind === 'new') {
      try {
        const products = await listProducts({ search: row.payload.style_code });
        const product = products.find((candidate) => candidate.style_code === row.payload.style_code);
        if (!product) {
          setError('This style was not found in Allyvia. Check the style code before marking it saved.');
          return;
        }
        addLabels(labelsFromProduct(product, row.payload));
      } catch (lookupError) {
        setError(`Could not verify this style: ${parseApiError(lookupError).summary}`);
        return;
      }
    } else if (row.item.barcode) {
      addLabels([{ id: row.item.variantId, name: row.item.name, sku: row.item.sku, barcode: row.item.barcode, quantity: row.quantity }]);
    }
    setRows((current) => current.map((entry) => (entry.key === row.key ? { ...entry, uncertain: false, saved: true } : entry)));
  };

  const receiveBatch = async () => {
    if (!pendingRows.length || saving) return;
    if (emptyNewStyle) {
      setError('Enter a received quantity for at least one variant in each new style.');
      return;
    }
    if (locations.length && !locationId) {
      setError('Choose a location before receiving stock.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    let completed = 0;
    for (const row of pendingRows) {
      try {
        if (row.kind === 'existing') {
          await adjustItemStock(row.item.variantId, {
            delta: row.quantity,
            reason: 'manual_adjust',
            note: `Received via inventory batch ${row.key}`,
            ...(locationId ? { location_id: locationId } : {})
          });
          if (row.item.barcode)
            addLabels([
              { id: row.item.variantId, name: row.item.name, sku: row.item.sku, barcode: row.item.barcode, quantity: row.quantity }
            ]);
        } else {
          const product = await createProduct({ ...row.payload, ...(locationId ? { location: locationId } : {}) });
          addLabels(labelsFromProduct(product, row.payload));
        }
        setRows((current) => current.map((entry) => (entry.key === row.key ? { ...entry, saved: true } : entry)));
        completed += 1;
      } catch (saveError) {
        const status = statusOf(saveError);
        if (status === null || status >= 500) {
          setRows((current) => current.map((entry) => (entry.key === row.key ? { ...entry, uncertain: true } : entry)));
          setError(
            `The connection stopped while saving ${row.kind === 'existing' ? row.item.name : row.payload.name}. Check All Items before retrying this row, since it may already be saved.`
          );
        } else {
          setError(
            `${row.kind === 'existing' ? row.item.name : row.payload.name} could not be saved: ${parseApiError(saveError).summary} ${completed ? `${completed} earlier row(s) were saved. Retry will continue with the remaining rows.` : ''}`
          );
        }
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setNotice(`${completed} row(s) saved to Allyvia. Print labels for the received units when ready.`);
  };

  const startNewBatch = () => {
    setRows([]);
    setLabels([]);
    setNotice(null);
    setError(null);
    setUnknownCode(null);
    setFound(null);
    focusScan();
  };

  return (
    <>
      <PageHeader title="Receive inventory" subtitle="Build a batch, review quantities, save it to Allyvia, then print scannable labels." />
      <MainCard content sx={{ mb: 2 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h4">1. Add the items in front of you</Typography>
              <Typography variant="body2" color="text.secondary">
                Scan an existing label, type a SKU, or create a new style with its size and colour run.
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<IconPlus size={18} />} onClick={() => setNewStyleOpen(true)} disabled={saving}>
              New style or item
            </Button>
          </Stack>
          {locations.length > 0 && (
            <TextField
              select
              label="Receive at location"
              size="small"
              value={locationId ?? ''}
              onChange={(event) => setLocationId(event.target.value)}
              disabled={saving || hasSaved}
              sx={{ maxWidth: 340 }}
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                  {location.is_default ? ' (default)' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              inputRef={scanRef}
              fullWidth
              label="Scan barcode or enter SKU"
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void lookupCode();
                }
              }}
              disabled={lookingUp || saving || Boolean(found)}
              InputProps={{
                startAdornment: (
                  <Box sx={{ mr: 1, display: 'flex', color: 'text.secondary' }}>
                    <IconBarcode size={20} />
                  </Box>
                ),
                endAdornment: lookingUp ? <CircularProgress size={20} /> : null
              }}
              helperText="USB scanner or keyboard. Press Enter to look up the item."
            />
            <Button
              variant="outlined"
              onClick={() => void lookupCode()}
              disabled={!scanValue.trim() || lookingUp || saving || Boolean(found)}
              sx={{ height: 56, minWidth: 110 }}
            >
              Find item
            </Button>
          </Stack>
          {unknownCode && (
            <Alert severity="info">
              No item found for <strong>{unknownCode}</strong>. Create a new item and keep this code as its barcode if appropriate.{' '}
              <Button size="small" onClick={() => setNewStyleOpen(true)}>
                Create item
              </Button>
            </Alert>
          )}
          {found && (
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Stack spacing={1.5}>
                <Typography variant="h5">{found.name}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={variantLabel(found.size, found.color)} />
                  {found.sku && <Chip size="small" variant="outlined" label={`SKU ${found.sku}`} />}
                  <Chip size="small" label={`${formatQuantity(cellOnHand(found.onHandByLocation, locationId, locations))} on hand here`} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
                  <TextField
                    inputRef={quantityRef}
                    label="Quantity received"
                    value={quantityValue}
                    onChange={(event) => setQuantityValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        stageExisting();
                      }
                    }}
                    inputProps={{ inputMode: 'numeric', min: 1 }}
                    sx={{ width: { xs: '100%', sm: 180 } }}
                  />
                  <Button variant="contained" onClick={stageExisting} sx={{ height: 40 }}>
                    Add to batch
                  </Button>
                  <Button
                    onClick={() => {
                      setFound(null);
                      focusScan();
                    }}
                    sx={{ height: 40 }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {notice && (
            <Alert severity="success" onClose={() => setNotice(null)}>
              {notice}
            </Alert>
          )}
        </Stack>
      </MainCard>

      <MainCard content>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4">2. Review and receive</Typography>
            <Typography variant="body2" color="text.secondary">
              {pendingRows.length} row(s) to save · {pendingUnits} unit(s). Rows already saved stay marked if a later row needs a retry.
            </Typography>
          </Box>
          {emptyNewStyle && <Alert severity="warning">A new style has no received units. Enter a quantity for at least one variant.</Alert>}
          <Divider />
          {rows.length === 0 ? (
            <Typography color="text.secondary">Your batch is empty. Scan a label or add a new style to begin.</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>SKU / variants</TableCell>
                    <TableCell align="right">Received</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <Typography fontWeight={600}>{row.kind === 'existing' ? row.item.name : row.payload.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.kind === 'existing' ? variantLabel(row.item.size, row.item.color) : 'New style'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {row.kind === 'existing'
                          ? row.item.sku || row.item.barcode
                          : row.payload.variants.map((variant) => variant.sku).join(', ')}
                      </TableCell>
                      <TableCell align="right">
                        {row.kind === 'existing' ? (
                          <TextField
                            size="small"
                            type="number"
                            value={row.quantity}
                            inputProps={{ min: 1, step: 1, style: { textAlign: 'right' } }}
                            sx={{ width: 90 }}
                            disabled={saving || row.saved}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              setRows((current) =>
                                current.map((entry) =>
                                  entry.key === row.key && entry.kind === 'existing'
                                    ? { ...entry, quantity: Number.isSafeInteger(value) && value > 0 ? value : 1 }
                                    : entry
                                )
                              );
                            }}
                          />
                        ) : (
                          <Stack spacing={0.5} sx={{ minWidth: 180, maxHeight: 220, overflowY: 'auto' }}>
                            {row.payload.variants.map((variant, index) => (
                              <Stack
                                key={`${variant.sku}-${index}`}
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                justifyContent="flex-end"
                              >
                                <Typography variant="caption" sx={{ minWidth: 70, textAlign: 'right' }}>
                                  {variantLabel(variant.size, variant.color)}
                                </Typography>
                                <TextField
                                  size="small"
                                  type="number"
                                  aria-label={`Quantity received for ${variant.sku}`}
                                  value={variant.opening_qty}
                                  disabled={saving || row.saved || row.uncertain}
                                  inputProps={{ min: 0, step: 1, style: { textAlign: 'right' } }}
                                  sx={{ width: 80 }}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setRows((current) =>
                                      current.map((entry) =>
                                        entry.key === row.key && entry.kind === 'new'
                                          ? {
                                              ...entry,
                                              payload: {
                                                ...entry.payload,
                                                variants: entry.payload.variants.map((cell, cellIndex) =>
                                                  cellIndex === index
                                                    ? { ...cell, opening_qty: Number.isSafeInteger(value) && value >= 0 ? value : 0 }
                                                    : cell
                                                )
                                              }
                                            }
                                          : entry
                                      )
                                    );
                                  }}
                                />
                              </Stack>
                            ))}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={row.saved ? 'success' : row.uncertain ? 'warning' : 'default'}
                          label={row.saved ? 'Saved' : row.uncertain ? 'Check status' : 'Ready'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {row.uncertain && (
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" href="/inventory" target="_blank" rel="noopener noreferrer" disabled={saving}>
                              Check All Items
                            </Button>
                            <Button
                              size="small"
                              disabled={saving}
                              onClick={() =>
                                setRows((current) =>
                                  current.map((entry) => (entry.key === row.key ? { ...entry, uncertain: false } : entry))
                                )
                              }
                            >
                              Not saved — retry
                            </Button>
                            <Button size="small" disabled={saving} onClick={() => void markAlreadySaved(row)}>
                              Already saved
                            </Button>
                          </Stack>
                        )}
                        {!row.saved && !row.uncertain && (
                          <Button
                            size="small"
                            color="error"
                            disabled={saving}
                            onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
                          >
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Button
              variant="contained"
              startIcon={<IconPackageImport size={18} />}
              onClick={() => void receiveBatch()}
              disabled={!pendingRows.length || saving || !locations.length || emptyNewStyle}
            >
              {saving ? 'Saving batch…' : `Save ${pendingRows.length} row(s) to Allyvia`}
            </Button>
            <Button
              variant="outlined"
              startIcon={<IconPrinter size={18} />}
              onClick={() => setPrintOpen(true)}
              disabled={!labels.length || saving}
            >
              Print labels{labels.length ? ` (${labels.reduce((sum, item) => sum + item.quantity, 0)})` : ''}
            </Button>
            {hasSaved && !pendingRows.length && !hasUncertain && (
              <Button onClick={startNewBatch} disabled={saving}>
                Start another batch
              </Button>
            )}
          </Stack>
          {hasSaved && (
            <Typography variant="caption" color="text.secondary">
              Stock is saved before labels are printed. You can reopen Print labels without adding stock again.
            </Typography>
          )}
        </Stack>
      </MainCard>

      <NewStyleDialog
        open={newStyleOpen}
        onClose={() => setNewStyleOpen(false)}
        onCreated={() => {}}
        onDraft={stageNew}
        initialBarcode={unknownCode || undefined}
      />
      <ReceivingLabelsDialog open={printOpen} onClose={() => setPrintOpen(false)} items={labels} />
    </>
  );
}
