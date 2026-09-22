// views/inventory/Transfers.tsx
//
// The stock-transfer list, and the draft editor that feeds it.
//
// Two things about this screen are forced by the API rather than chosen:
//
//   REMOVING THE LAST LINE IS NOT A ROW OPERATION. PATCH replaces the whole line
//   set, so an editor that shrank to zero rows and then saved would send
//   `lines: []` — which this endpoint answers 200 to, having DELETED every line,
//   leaving a draft that can never be dispatched. The delete button therefore
//   refuses to remove the final row, and emptying a transfer is a separate,
//   confirmed action (clearTransferLines) that says what it will do first.
//
//   A REJECTED SAVE MAY STILL HAVE SAVED THE HEADER. PATCH writes notes and both
//   locations before it resolves lines, and the line resolver RETURNS a 400
//   instead of raising, so the surrounding transaction commits. A form that
//   treated that 400 as "nothing happened" would desync permanently, so the save
//   handler refetches and says which half landed.
//
// The rules themselves — validation, payload building, the refusals above — all
// live in transfersLogic.ts and are tested there. This file is wiring.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
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
import { IconArrowLeft, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { Location, Product, ProductVariant, listLocations, listProducts } from 'api/inventoryStock.api';
import { clearTransferLines, createTransfer, getTransfer, listTransfers, patchTransfer } from 'api/inventoryTransfers.api';

import StyleMatrixGrid from './StyleMatrixGrid';
import { RowError, parseApiError, rowErrorsByIndex } from './apiErrors';
import { EM_DASH, formatQuantity } from './stockFormat';
import {
  TRANSFER_STATUSES,
  Transfer,
  TransferDraft,
  TransferStatus,
  buildTransferCreatePayload,
  buildTransferPatchPayload,
  describeOriginAvailability,
  describeTransferRoute,
  newTransferDraftLine,
  normalizeTransfer,
  transferActionsFor,
  transferDraftFrom,
  transferLineLabel,
  transferListQuery,
  transferPatchPartiallySaved,
  transferSaveNeedsRefetch,
  transferShortfallReport,
  transferStatusColor,
  transferStatusLabel,
  validateTransferDraft
} from './transfersLogic';

const summarise = (err: unknown): string => {
  const parsed = parseApiError(err, 'lines');
  return [parsed.summary, parsed.hint].filter(Boolean).join(' ');
};

// ---------------------------------------------------------------------------
// Route component
// ---------------------------------------------------------------------------
export default function Transfers() {
  const { transferId } = useParams<{ transferId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // 'new' arrives as :transferId. `?edit=<uuid>` is how TransferDetail hands a
  // draft back here for line editing, so both screens can live on one
  // :transferId route without fighting over it.
  const editTarget = transferId === 'new' ? 'new' : searchParams.get('edit');

  useEffect(() => {
    let cancelled = false;
    listLocations()
      .then((rows) => {
        if (!cancelled) setLocations(rows);
      })
      .catch((err) => {
        if (!cancelled) setLocationsError(summarise(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (editTarget) {
    return (
      <Stack spacing={2}>
        {locationsError && <Alert severity="error">{locationsError}</Alert>}
        <TransferDraftEditor
          target={editTarget}
          locations={locations}
          onCancel={() => navigate('/inventory/transfers')}
          onSaved={(transfer) => navigate(`/inventory/transfers/${transfer.id}`)}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {locationsError && <Alert severity="error">{locationsError}</Alert>}
      <TransferList locations={locations} />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------
function TransferList({ locations }: { locations: Location[] }) {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<TransferStatus[]>([]);
  const [locationId, setLocationId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The query string is built by the module: `?status=` is repeatable and read
      // with getlist(), and a non-uuid `?location_id=` is an uncaught 500.
      const rows = await listTransfers(transferListQuery({ statuses, locationId: locationId || null }));
      setTransfers(rows.map(normalizeTransfer));
      setError(null);
    } catch (err) {
      setError(summarise(err));
    } finally {
      setLoading(false);
    }
  }, [statuses, locationId]);

  useEffect(() => {
    load();
  }, [load]);

  // A short delivery leaves no shrinkage movement and no other flag anywhere, so
  // the list is the first place it can be noticed at all. Reported across every
  // row, because one closed-short transfer among fifty is exactly the one nobody
  // opens.
  const losses = useMemo(
    () => transfers.map((transfer) => ({ transfer, report: transferShortfallReport(transfer) })).filter((row) => row.report.isLoss),
    [transfers]
  );
  const lostUnits = losses.reduce((sum, row) => sum + row.report.totalOutstanding, 0);

  const toggleStatus = (status: TransferStatus) =>
    setStatuses((current) => (current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status]));

  return (
    <MainCard
      title="Stock transfers"
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {loading && <CircularProgress size={18} />}
          <Tooltip title="Reload">
            <IconButton size="small" onClick={load}>
              <IconRefresh size={18} />
            </IconButton>
          </Tooltip>
          <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={() => navigate('/inventory/transfers/new')}>
            New transfer
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {TRANSFER_STATUSES.map((status) => (
            <Chip
              key={status}
              size="small"
              label={transferStatusLabel(status)}
              color={statuses.includes(status) ? transferStatusColor(status) : 'default'}
              variant={statuses.includes(status) ? 'filled' : 'outlined'}
              onClick={() => toggleStatus(status)}
            />
          ))}
          <TextField
            select
            size="small"
            label="Location"
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            sx={{ minWidth: 200 }}
            helperText="Matches either end of the route."
          >
            <MenuItem value="">Any location</MenuItem>
            {locations.map((location) => (
              <MenuItem key={location.id} value={location.id}>
                {location.name}
              </MenuItem>
            ))}
          </TextField>
          <Box flexGrow={1} />
          {(statuses.length > 0 || locationId) && (
            <Button
              size="small"
              onClick={() => {
                setStatuses([]);
                setLocationId('');
              }}
            >
              Clear filters
            </Button>
          )}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {losses.length > 0 && (
          <Alert severity="error">
            <AlertTitle>
              {losses.length} received transfer(s) closed short — {lostUnits} unit(s) unaccounted for
            </AlertTitle>
            Those units left their origin and were never added anywhere. No shrinkage movement exists for them, so nothing else in stock
            reporting will raise them again: {losses.map((row) => row.transfer.reference).join(', ')}.
          </Alert>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Reference</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Route</TableCell>
                <TableCell align="right">Units</TableCell>
                <TableCell>Outstanding</TableCell>
                <TableCell>Raised</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfers.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      No transfers match these filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {transfers.map((transfer) => {
                const report = transferShortfallReport(transfer);
                return (
                  <TableRow
                    key={transfer.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/inventory/transfers/${transfer.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2">{transfer.reference}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={transferStatusColor(transfer.status)}
                        label={transferStatusLabel(transfer.status, transfer.status_label)}
                      />
                    </TableCell>
                    <TableCell>{describeTransferRoute(transfer)}</TableCell>
                    <TableCell align="right">{formatQuantity(transfer.qty_total)}</TableCell>
                    <TableCell>
                      {/* One figure, two opposite meanings: units on a van while in
                          transit, units lost once the transfer has closed. */}
                      {report.totalOutstanding === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          {EM_DASH}
                        </Typography>
                      ) : (
                        <Chip
                          size="small"
                          color={report.isLoss ? 'error' : 'info'}
                          variant={report.isLoss ? 'filled' : 'outlined'}
                          label={report.isLoss ? `${report.totalOutstanding} lost` : `${report.totalOutstanding} in transit`}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack>
                        <Typography variant="caption">{new Date(transfer.created_at).toLocaleDateString()}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transfer.created_by_email || EM_DASH}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </MainCard>
  );
}

// ---------------------------------------------------------------------------
// The draft editor
// ---------------------------------------------------------------------------
interface TransferDraftEditorProps {
  /** 'new' for a fresh draft, or an existing transfer's uuid. */
  target: string;
  locations: Location[];
  onCancel: () => void;
  /** Called with the saved transfer; the caller decides where to go next. */
  onSaved: (transfer: Transfer) => void;
}

function TransferDraftEditor({ target, locations, onCancel, onSaved }: TransferDraftEditorProps) {
  const navigate = useNavigate();
  const isNew = target === 'new';

  const [original, setOriginal] = useState<Transfer | null>(null);
  const [draft, setDraft] = useState<TransferDraft>({ fromLocationId: null, toLocationId: null, notes: '', lines: [] });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Titled, because the three things that raise it are not the same news: a
  // half-committed save, a transfer someone else moved on, and a deliberate clear.
  const [warning, setWarning] = useState<{ title: string; body: string } | null>(null);
  const [rowErrors, setRowErrors] = useState<Map<number, RowError[]>>(new Map());
  const [touched, setTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const defaultLocationId = (locations.find((location) => location.is_default) ?? locations[0])?.id ?? null;

  const load = useCallback(async () => {
    if (target === 'new') return;
    setLoading(true);
    try {
      // The detail GET is the only place origin stock is reported, which is why
      // editing refetches rather than reusing a row from the list.
      const fetched = normalizeTransfer(await getTransfer(target));
      setOriginal(fetched);
      setDraft(transferDraftFrom(fetched));
      setError(null);
    } catch (err) {
      setError(summarise(err));
    } finally {
      setLoading(false);
    }
  }, [target]);

  useEffect(() => {
    load();
  }, [load]);

  // Seeded once, and only while untouched: re-seeding when `locations` resolves
  // would overwrite a choice the user had already made.
  useEffect(() => {
    if (!isNew) return;
    setDraft((current) => (current.fromLocationId ? current : { ...current, fromLocationId: defaultLocationId }));
  }, [isNew, defaultLocationId]);

  const validation = validateTransferDraft(draft);
  const editable = original === null || transferActionsFor(original).includes('edit');

  const addVariant = (variant: ProductVariant) => {
    setDraft((current) => {
      const existing = current.lines.find((line) => line.inventoryItemId === variant.inventory_item_id);
      if (existing) {
        // Two rows for one item pass the per-line stock check separately and fail
        // together, so the picker combines instead of appending a duplicate.
        const next = Number(existing.qty.trim() || '0') + 1;
        return {
          ...current,
          lines: current.lines.map((line) => (line.key === existing.key ? { ...line, qty: `${next}` } : line))
        };
      }
      return {
        ...current,
        lines: [
          ...current.lines,
          newTransferDraftLine({
            inventoryItemId: variant.inventory_item_id,
            sku: variant.sku ?? '',
            name: variant.name,
            // NOT variant.quantity_on_hand: that is the company-wide figure and this
            // field means "on the origin's shelf". Unknown until the server answers.
            availableAtOrigin: null
          })
        ]
      };
    });
  };

  const setLineQty = (key: string, qty: string) =>
    setDraft((current) => ({ ...current, lines: current.lines.map((line) => (line.key === key ? { ...line, qty } : line)) }));

  const removeLine = (key: string) => setDraft((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }));

  /**
   * Bring the form back in step with the server after a rejected save.
   *
   * transferPatchPartiallySaved is apiErrors.mayHavePartiallySaved, applied to the
   * `lines` key: a 400 carrying per-row errors arrived AFTER the header was written.
   * The header fields are re-read from the server; the line rows are deliberately
   * KEPT, so the row the server rejected is still on screen next to its error.
   */
  const resync = async (err: unknown, transferId: string) => {
    const fresh = await getTransfer(transferId)
      .then(normalizeTransfer)
      .catch(() => null);
    if (!fresh) {
      setWarning({
        title: 'This form may be out of step with the server',
        body: 'Part of that save may have been kept, and the transfer could not be re-read to check. Reload before saving again.'
      });
      return;
    }
    setOriginal(fresh);
    setDraft((current) => ({
      ...current,
      fromLocationId: fresh.from_location_id,
      toLocationId: fresh.to_location_id,
      notes: fresh.notes
    }));
    if (transferPatchPartiallySaved(err)) {
      setWarning({
        title: 'The notes and locations WERE saved — the lines were not',
        body:
          'This endpoint writes the header before it validates the lines, and the rejection came too late to undo that. The line set is ' +
          'unchanged: the transfer still holds the items it held before. The header fields above have been re-read from the server; fix ' +
          'the line below and save again.'
      });
    } else {
      setWarning({
        title: 'This transfer changed while you were editing it',
        body: `It is now '${transferStatusLabel(fresh.status, fresh.status_label)}' and has been re-read from the server.`
      });
    }
  };

  const save = async () => {
    setTouched(true);
    if (!validation.valid) return;

    let payload: Record<string, unknown>;
    try {
      // Built outside the request so a refusal from the module reaches the screen
      // with its own message rather than being read as a transport failure. It
      // refuses an empty or unresolved line set — see the file header. Spread
      // because patchTransfer takes the open record it has to inspect for `lines`.
      payload = original ? { ...buildTransferPatchPayload(draft, original) } : { ...buildTransferCreatePayload(draft) };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the request.');
      return;
    }

    // buildTransferPatchPayload omits `lines` unless the grid actually changed, so an
    // empty body means nothing was edited — and PATCHing nothing would still replace
    // nothing while costing a request.
    if (original && Object.keys(payload).length === 0) {
      onSaved(original);
      return;
    }

    setSaving(true);
    setError(null);
    setWarning(null);
    setRowErrors(new Map());
    try {
      const saved = normalizeTransfer(original ? await patchTransfer(original.id, payload) : await createTransfer(payload));
      onSaved(saved);
    } catch (err) {
      const parsed = parseApiError(err, 'lines');
      // Index-aligned with what was submitted, and the payload's line order is the
      // draft's line order, so row i of the grid owns the errors at index i.
      setRowErrors(rowErrorsByIndex(parsed));
      setError([parsed.summary, parsed.hint].filter(Boolean).join(' '));
      if (original && transferSaveNeedsRefetch(err)) await resync(err, original.id);
    } finally {
      setSaving(false);
    }
  };

  const clearLines = async () => {
    if (!original) return;
    setSaving(true);
    setError(null);
    try {
      // The ONE call allowed to send `lines: []`. Separately named because an empty
      // array must be something someone chose, never something an editor produced.
      const cleared = normalizeTransfer(await clearTransferLines(original.id));
      setOriginal(cleared);
      setDraft(transferDraftFrom(cleared));
      setWarning({
        title: 'Every line removed',
        body: `${cleared.reference} is empty. It cannot be dispatched until at least one item is added back.`
      });
      setClearOpen(false);
    } catch (err) {
      setError(summarise(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainCard title="Transfer">
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">Loading…</Typography>
        </Stack>
      </MainCard>
    );
  }

  if (!editable && original) {
    return (
      <MainCard title={`${original.reference}`}>
        <Stack spacing={2}>
          <Alert severity="info">
            This transfer is {transferStatusLabel(original.status, original.status_label).toLowerCase()} and can no longer be edited. Stock
            that has left the origin can only be received.
          </Alert>
          <Box>
            <Button variant="contained" onClick={() => navigate(`/inventory/transfers/${original.id}`)}>
              View transfer
            </Button>
          </Box>
        </Stack>
      </MainCard>
    );
  }

  const showHeaderError = (field: 'fromLocationId' | 'toLocationId') => touched && Boolean(validation.errors[field]);
  const lastLineHeld = draft.lines.length === 1;

  return (
    <>
      <MainCard
        title={original ? `Edit ${original.reference}` : 'New transfer'}
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {saving && <CircularProgress size={18} />}
            <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={onCancel} disabled={saving}>
              Back
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2.5}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {warning && (
            <Alert severity="warning" onClose={() => setWarning(null)}>
              <AlertTitle>{warning.title}</AlertTitle>
              {warning.body}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                required
                label="From"
                value={draft.fromLocationId ?? ''}
                onChange={(event) => setDraft({ ...draft, fromLocationId: event.target.value || null })}
                onBlur={() => setTouched(true)}
                error={showHeaderError('fromLocationId')}
                helperText={showHeaderError('fromLocationId') ? validation.errors.fromLocationId : 'Where the stock leaves.'}
              >
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                required
                label="To"
                value={draft.toLocationId ?? ''}
                onChange={(event) => setDraft({ ...draft, toLocationId: event.target.value || null })}
                onBlur={() => setTouched(true)}
                error={showHeaderError('toLocationId')}
                helperText={
                  showHeaderError('toLocationId') ? validation.errors.toLocationId : 'Where it lands. Must differ from the origin.'
                }
              >
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Notes"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
            </Grid>
          </Grid>

          <Divider />

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1">Items</Typography>
            <Box flexGrow={1} />
            {original && original.lines.length > 0 && (
              <Tooltip title="Removes every line from this draft in one deliberate call. The draft survives but cannot be dispatched until items are added back.">
                <Button size="small" color="error" onClick={() => setClearOpen(true)} disabled={saving}>
                  Clear all lines
                </Button>
              </Tooltip>
            )}
            <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={() => setPickerOpen(true)}>
              Add items
            </Button>
          </Stack>

          {touched && validation.errors.lines && <Alert severity="warning">{validation.errors.lines}</Alert>}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right" width={120}>
                    Quantity
                  </TableCell>
                  <TableCell>At origin</TableCell>
                  <TableCell align="right" width={60} />
                </TableRow>
              </TableHead>
              <TableBody>
                {draft.lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No items yet. A transfer with no lines can never be dispatched.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {draft.lines.map((line, index) => {
                  const lineError = validation.lineErrors[line.key];
                  const lineWarning = validation.lineWarnings[line.key];
                  const serverErrors = rowErrors.get(index) ?? [];
                  const duplicate = validation.duplicateItemKeys.includes(line.key);
                  return (
                    <TableRow key={line.key} sx={duplicate ? { bgcolor: 'warning.lighter' } : undefined}>
                      <TableCell>
                        <Stack>
                          <Typography variant="body2">
                            {transferLineLabel({ sku: line.sku, name: line.name, size: '', color: '' })}
                          </Typography>
                          {lineWarning && (
                            <Typography variant="caption" color="warning.dark">
                              {lineWarning}
                            </Typography>
                          )}
                          {serverErrors.map((row, position) => (
                            <Typography key={`${row.field ?? 'row'}-${position}`} variant="caption" color="error.main">
                              {row.field ? `${row.field}: ${row.message}` : row.message}
                            </Typography>
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={line.qty}
                          onChange={(event) => setLineQty(line.key, event.target.value)}
                          onBlur={() => setTouched(true)}
                          error={Boolean(lineError)}
                          helperText={lineError}
                          inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                          sx={{ width: 110 }}
                        />
                      </TableCell>
                      <TableCell>
                        {/* An em dash is "not reported", never zero: origin stock only
                            comes back on a draft response, so a freshly picked line
                            has no figure until the draft has been saved. */}
                        <Typography variant="caption" color="text.secondary">
                          {describeOriginAvailability(line)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={
                            lastLineHeld
                              ? original
                                ? 'Removing the last line would save an empty list, which deletes every line on the server. Use "Clear all lines" if that is really the intent.'
                                : 'A transfer needs at least one line. Discard the draft instead.'
                              : 'Remove this line'
                          }
                        >
                          <span>
                            <IconButton size="small" color="error" onClick={() => removeLine(line.key)} disabled={saving || lastLineHeld}>
                              <IconTrash size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={save} disabled={saving || (touched && !validation.valid)}>
              {saving ? 'Saving…' : original ? 'Save draft' : 'Create draft'}
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Saving a draft moves no stock. Stock leaves the origin only on dispatch, which is all-or-nothing: one line short of stock
            refuses the whole transfer.
          </Typography>
        </Stack>
      </MainCard>

      <ItemPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addVariant} />

      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Remove every line?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2">
              All {original?.lines.length ?? 0} line(s) will be deleted from {original?.reference}. Nothing has been dispatched, so no stock
              moves — but the draft will be left with nothing to send and cannot be dispatched until items are added back.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This is the only action that empties a transfer. Deleting rows one at a time deliberately stops at the last one.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearOpen(false)} disabled={saving}>
            Keep them
          </Button>
          <Button color="error" variant="contained" onClick={clearLines} disabled={saving}>
            Remove every line
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Item picker
// ---------------------------------------------------------------------------
function ItemPickerDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (variant: ProductVariant) => void }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listProducts({ search: search || undefined }));
      setError(null);
    } catch (err) {
      setError(summarise(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const pick = (variant: ProductVariant) => {
    onPick(variant);
    setLastAdded(variant.sku ?? variant.name);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add items to the transfer</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="Search styles"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            helperText="Matches name, style code, category or brand. Click a cell to add that variant."
          />
          {error && <Alert severity="error">{error}</Alert>}
          {lastAdded && (
            <Alert severity="success" onClose={() => setLastAdded(null)}>
              {lastAdded} added. Picking it again increases its quantity rather than adding a second line.
            </Alert>
          )}
          {/* The number in each cell is the company-wide on-hand figure, NOT stock at
              the origin — that only comes back once the draft has been saved. */}
          <Typography variant="caption" color="text.secondary">
            Quantities shown are company-wide on hand. Stock at the origin is reported by the server once the draft is saved.
          </Typography>
          {loading && <CircularProgress size={18} />}
          {!loading && products.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No styles match that search.
            </Typography>
          )}
          {products.map((product) => (
            <Box key={product.id}>
              <Typography variant="subtitle2">
                {product.name}
                {product.style_code ? ` · ${product.style_code}` : ''}
              </Typography>
              <StyleMatrixGrid variants={product.variants} onSelectVariant={pick} />
              <Divider sx={{ mt: 1.5 }} />
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
