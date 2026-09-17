// views/inventory/AddStock.tsx
//
// Scan-to-add stock for existing inventory. The boutique goods-in workflow without
// a PO: scan barcode → enter qty → ledger adjust → keep scanning.
//
// Uses POST /inventory/items/{id}/stock/adjust/ with reason=manual_adjust and a
// fixed session note so every bump is auditable. Lookup is GET /inventory/lookup/
// (exact barcode), same door as Find a Size.

import { FocusEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { IconBarcode, IconPackageImport } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import { PageHeader } from 'ui-component/frame';
import { adjustItemStock, listLocations, Location } from 'api/inventoryStock.api';
import { lookupInventory } from 'api/inventoryLookup.api';

import { describeAdjustmentError, formatDelta, formatQuantity } from './stockFormat';
import { LookupCell, LookupLocation, LookupResolvedResponse, isSearchResponse } from './sizing';
import { parseApiError, statusOf } from './apiErrors';

const SESSION_NOTE = 'Add stock · scan';

interface PendingItem {
  variantId: number;
  name: string;
  size: string;
  color: string;
  sku: string | null;
  barcode: string | null;
  onHandHere: number;
  onHandByLocation: Record<string, number>;
}

interface SessionRow {
  id: string;
  variantId: number;
  name: string;
  size: string;
  color: string;
  barcode: string | null;
  delta: number;
  quantityAfter: number;
  at: string;
}

function cellOnHand(cell: LookupCell, locationId: string | null, locations: LookupLocation[]): number {
  const map = cell.on_hand_by_location;
  if (!map) return 0;
  const resolvedId =
    locationId || locations.find((l) => l.is_default)?.id || locations[0]?.id || null;
  if (!resolvedId) {
    return Object.values(map).reduce((sum, qty) => sum + qty, 0);
  }
  return map[resolvedId] ?? 0;
}

function resolvePending(
  response: LookupResolvedResponse,
  locationId: string | null
): PendingItem | null {
  const targetId = response.scanned_variant_id;
  if (targetId == null) return null;
  for (const group of response.matrix) {
    for (const cell of group.cells) {
      if (cell.variant_id !== targetId) continue;
      const name = response.style?.name || cell.sku || cell.barcode || `Item ${cell.variant_id}`;
      return {
        variantId: cell.variant_id,
        name,
        size: cell.size_key || '',
        color: group.color || '',
        sku: cell.sku,
        barcode: cell.barcode,
        onHandHere: cellOnHand(cell, locationId, response.locations),
        onHandByLocation: cell.on_hand_by_location ?? {}
      };
    }
  }
  return null;
}

export default function AddStockPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [scanValue, setScanValue] = useState('');
  const [qtyValue, setQtyValue] = useState('1');
  const [pending, setPending] = useState<PendingItem | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionRow[]>([]);

  const defaultLocation = useMemo(
    () => locations.find((l) => l.is_default) ?? locations[0] ?? null,
    [locations]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listLocations();
        if (cancelled) return;
        setLocations(rows.filter((l) => l.is_active));
      } catch {
        if (!cancelled) setError('Could not load locations.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!locationId && defaultLocation) {
      setLocationId(defaultLocation.id);
    }
  }, [defaultLocation, locationId]);

  // Refresh the pending on-hand figure when the operator switches location.
  useEffect(() => {
    setPending((prev) => {
      if (!prev || !locationId) return prev;
      return {
        ...prev,
        onHandHere: prev.onHandByLocation[locationId] ?? 0
      };
    });
  }, [locationId]);

  const focusScan = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    focusScan();
  }, [focusScan]);

  const onScanBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget as HTMLElement | null;
    if (!next) {
      focusScan();
      return;
    }
    const tag = next.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || next.getAttribute('role') === 'combobox') {
      return;
    }
    focusScan();
  };

  const lookupBarcode = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    setLookingUp(true);
    setError(null);
    setUnknownBarcode(null);
    setPending(null);
    try {
      const response = await lookupInventory({ barcode: code });
      if (isSearchResponse(response)) {
        setUnknownBarcode(code);
        setScanValue('');
        focusScan();
        return;
      }
      const item = resolvePending(response, locationId);
      if (!item) {
        setUnknownBarcode(code);
        setScanValue('');
        focusScan();
        return;
      }
      setPending(item);
      setQtyValue('1');
      setScanValue('');
      window.setTimeout(() => qtyRef.current?.focus(), 0);
    } catch (err) {
      const status = statusOf(err);
      if (status === 404) {
        setUnknownBarcode(code);
        setScanValue('');
        focusScan();
      } else {
        setError(parseApiError(err).summary || 'Lookup failed.');
      }
    } finally {
      setLookingUp(false);
    }
  };

  const applyQty = async () => {
    if (!pending) return;
    const raw = qtyValue.trim();
    if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
      setError('Enter a whole number greater than zero.');
      return;
    }
    const delta = Number(raw);
    setSubmitting(true);
    setError(null);
    try {
      const movement = await adjustItemStock(pending.variantId, {
        delta,
        reason: 'manual_adjust',
        note: SESSION_NOTE,
        ...(locationId ? { location_id: locationId } : {})
      });
      setSession((prev) => [
        {
          id: `${movement.id}-${Date.now()}`,
          variantId: pending.variantId,
          name: pending.name,
          size: pending.size,
          color: pending.color,
          barcode: pending.barcode,
          delta,
          quantityAfter: movement.quantity_after,
          at: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
      setPending(null);
      setQtyValue('1');
      focusScan();
    } catch (err) {
      setError(describeAdjustmentError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const axesLabel = (size: string, color: string) => {
    const parts = [size, color].filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  };

  return (
    <>
      <PageHeader
        title="Add stock"
        subtitle="Scan a barcode, enter how many you received, and stock updates immediately."
      />
      <MainCard content sx={{ mb: 2 }}>
        <Stack spacing={2.5}>
          {locations.length > 1 && (
            <TextField
              select
              label="Location"
              size="small"
              value={locationId ?? ''}
              onChange={(e) => setLocationId(e.target.value || null)}
              sx={{ maxWidth: 320 }}
              helperText="Stock is held per location."
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                  {location.is_default ? ' (default)' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            inputRef={inputRef}
            fullWidth
            label="Scan or type barcode"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void lookupBarcode(scanValue);
              }
            }}
            onBlur={onScanBlur}
            autoFocus
            disabled={lookingUp || submitting || Boolean(pending)}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', color: 'text.secondary' }}>
                  <IconBarcode size={20} />
                </Box>
              ),
              endAdornment: lookingUp ? <CircularProgress size={20} /> : null
            }}
            helperText="USB scanner or keyboard — press Enter after the code."
          />

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {unknownBarcode && (
            <Alert severity="warning">
              <AlertTitle>Unknown barcode: {unknownBarcode}</AlertTitle>
              Create the item first, then come back to add stock.
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button component={RouterLink} to="/inventory/styles" size="small" variant="outlined">
                  New style
                </Button>
                <Button component={RouterLink} to="/inventory" size="small" variant="text">
                  All items
                </Button>
              </Stack>
            </Alert>
          )}

          {pending && (
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.default'
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {pending.name}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={axesLabel(pending.size, pending.color)} />
                    {pending.sku && <Chip size="small" variant="outlined" label={`SKU ${pending.sku}`} />}
                    {pending.barcode && <Chip size="small" variant="outlined" label={pending.barcode} />}
                    <Chip size="small" color="default" label={`On hand here: ${formatQuantity(pending.onHandHere)}`} />
                  </Stack>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
                  <TextField
                    inputRef={qtyRef}
                    label="Quantity to add"
                    value={qtyValue}
                    onChange={(e) => setQtyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void applyQty();
                      }
                    }}
                    inputProps={{ inputMode: 'numeric', min: 1 }}
                    sx={{ width: { xs: '100%', sm: 180 } }}
                    disabled={submitting}
                  />
                  <Button
                    variant="contained"
                    startIcon={<IconPackageImport size={18} />}
                    onClick={() => void applyQty()}
                    disabled={submitting}
                    sx={{ height: 40 }}
                  >
                    {submitting ? 'Adding…' : 'Add to stock'}
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setPending(null);
                      setQtyValue('1');
                      focusScan();
                    }}
                    disabled={submitting}
                    sx={{ height: 40 }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Stack>
      </MainCard>

      <MainCard title="This session" content>
        {session.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nothing added yet. Scan a barcode to start.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Size · colour</TableCell>
                <TableCell>Barcode</TableCell>
                <TableCell align="right">Added</TableCell>
                <TableCell align="right">New on hand</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {session.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.at}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{axesLabel(row.size, row.color)}</TableCell>
                  <TableCell>{row.barcode || '—'}</TableCell>
                  <TableCell align="right">{formatDelta(row.delta)}</TableCell>
                  <TableCell align="right">{formatQuantity(row.quantityAfter)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MainCard>
    </>
  );
}
