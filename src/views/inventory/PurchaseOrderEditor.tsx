// views/inventory/PurchaseOrderEditor.tsx
//
// One route, three screens, chosen from the order's own status via poActionsFor():
//   * a NEW draft (no id in the URL yet) — create it,
//   * an editable DRAFT — lines, fees and expected date, then submit or cancel,
//   * SUBMITTED / PARTIALLY RECEIVED / RECEIVED / CANCELLED — read-only, with
//     Receive while that is still legal.
//
// Deep-linkable by id on purpose: Session 8's reorder inbox creates draft POs and
// links straight here, so a freshly created order replaces the /new URL with its
// own rather than living in component state.
//
// FOUR API TRAPS DECIDE THE SHAPE OF THIS FILE. All four live in purchasing.ts and
// apiErrors.ts; what is here is the UI they force.
//
// 1. PATCH's `lines` is a WHOLESALE REPLACEMENT — every existing line is deleted
//    and every line uuid changes. So `lines` is sent only when the grid actually
//    changed (`linesChanged`), otherwise saving a note would silently reissue every
//    id and any receive form still holding the old ones would get `unknown_line`.
//
// 2. PATCH saves the HEADER before resolving the lines, and its resolver RETURNS a
//    400 rather than raising — so the surrounding atomic block commits the header
//    anyway. On that error the order is refetched but the typed draft is KEPT: the
//    lines are what still need fixing, and reloading over them would throw away the
//    buyer's work to fix a desync they cannot see.
//
// 3. A 409's blockers are attributed BY line_id, never by position. The backend
//    appends a blocker only for the entries that failed, so detail[0] is not row 0.
//
// 4. `POST .../receive/` bypasses the serializer and emits JSON NUMBERS where every
//    other endpoint sends strings. It is not special-cased anywhere here —
//    readMoney/formatMoney accept both — and its response is stored as the order.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
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

import {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderReceiveResult,
  Supplier,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listSuppliers,
  receivePurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder
} from 'api/inventoryPurchasing.api';
import { Location, listLocations } from 'api/inventoryStock.api';

import PoLinePicker, { PoLinePickerRow } from './PoLinePicker';
import { ParsedApiError, isIllegalTransition, mayHavePartiallySaved, parseApiError, rowErrorsByIndex } from './apiErrors';
import {
  PoDraft,
  PoDraftLine,
  ReceiveDraftRow,
  WireMoney,
  buildPoCreatePayload,
  buildPoPatchPayload,
  buildReceivePayload,
  canPoAction,
  describeLineProgress,
  describePurchasingError,
  formatCost,
  formatMoney,
  isUuid,
  lineCostDisplay,
  lineOutstanding,
  poActionsFor,
  poStatusColor,
  poStatusLabel,
  previewLandedCosts,
  readMoney,
  receiptProgress,
  receiveAllRows,
  receiveConflict,
  sortSuppliersByName,
  supplierListQuery,
  validatePoDraft
} from './purchasing';
import { EM_DASH, formatDelta, formatQuantity } from './stockFormat';

/** A draft row plus its label. The label is display only — lines resolve by item id. */
interface EditorLine extends PoDraftLine {
  label: string;
}

interface EditorDraft extends PoDraft {
  lines: EditorLine[];
}

/** Plain editable field text for a money value: no symbol, no grouping, exact digits. */
const moneyField = (value: WireMoney, places: 2 | 4 = 2): string =>
  readMoney(value).known ? formatMoney(value, places).replace(/[$,]/g, '') : '';

const lineLabel = (line: Pick<PurchaseOrderLine, 'sku' | 'name' | 'size' | 'color'>): string => {
  const axes = [line.color, line.size].filter(Boolean).join(' / ');
  const base = line.sku || line.name;
  return axes ? `${base} · ${axes}` : base;
};

const blankDraft = (): EditorDraft => ({
  supplierId: '',
  // null means "the company default location", which POST accepts and falls back
  // on. PATCH cannot express it — see the destination select below.
  destinationId: null,
  expectedAt: '',
  poNumber: '',
  // Blank is 0 to validatePoDraft; most orders carry no duty and should not have
  // to be told so.
  shipping: '',
  duty: '',
  otherFees: '',
  notes: '',
  lines: []
});

const draftFromOrder = (order: PurchaseOrder): EditorDraft => ({
  supplierId: order.supplier_id,
  destinationId: order.destination_id,
  expectedAt: order.expected_at ?? '',
  shipping: moneyField(order.shipping),
  duty: moneyField(order.duty),
  otherFees: moneyField(order.other_fees),
  notes: order.notes ?? '',
  lines: order.lines.map((line) => ({
    // The server's line uuid doubles as the row key while it lasts. Trap 1 is why
    // that is safe: the ids only churn on a save that actually sent `lines`.
    key: line.id,
    inventoryItemId: line.inventory_item_id,
    qtyOrdered: String(line.qty_ordered),
    unitCost: moneyField(line.unit_cost, 4),
    label: lineLabel(line)
  }))
});

/**
 * Copy for a 409 that means "your copy of this order is out of date".
 *
 * Cancel after a receipt is the case that matters: the endpoint answers with the
 * illegal-transition body, so the friendlier "already received N units" message the
 * service layer can raise never reaches the client and there is no copy to soften
 * the failure with. Telling the user to reload is the only honest response.
 * Returns null when the error is something else.
 */
const staleMessage = (parsed: ParsedApiError): string | null => {
  if (!isIllegalTransition(parsed)) return null;
  const current = parsed.currentStatus ? poStatusLabel(parsed.currentStatus) : null;
  const legal = (parsed.allowedFrom ?? []).map(poStatusLabel).join(', ');
  return [
    current ? `This order is now ${current} on the server.` : 'This order has moved on since the page loaded.',
    legal ? `That action is only possible from: ${legal}.` : '',
    'Reload to see where it stands.'
  ]
    .filter(Boolean)
    .join(' ');
};

// ---------------------------------------------------------------------------
// Receiving a delivery
// ---------------------------------------------------------------------------

interface ReceiveDialogProps {
  open: boolean;
  order: PurchaseOrder;
  onClose: () => void;
  onReceived: (result: PurchaseOrderReceiveResult) => void;
  onStale: (message: string) => void;
}

function ReceiveDialog({ open, order, onClose, onReceived, onStale }: ReceiveDialogProps) {
  const [rows, setRows] = useState<ReceiveDraftRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [blockerErrors, setBlockerErrors] = useState<Record<string, string>>({});
  const [unattributed, setUnattributed] = useState<string[]>([]);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!open) return;
    // The usual receipt is the whole outstanding delivery, so prefill it. Lines
    // already complete stay blank rather than at 0 — the quantity is an INCREMENT
    // and a 0 is rejected outright by this endpoint.
    setRows(receiveAllRows(order.lines));
    setTouched(false);
    setSummary(null);
    setBlockerErrors({});
    setUnattributed([]);
    setStale(false);
  }, [open, order]);

  // purchasing.ts types `sku` as a plain string; the transport admits null.
  const lines = useMemo(() => order.lines.map((line) => ({ ...line, sku: line.sku ?? '' })), [order.lines]);
  const built = buildReceivePayload(rows, lines);

  const setQty = (lineId: string, value: string) =>
    setRows((current) => current.map((row) => (row.lineId === lineId ? { ...row, qty: value } : row)));

  const submit = async () => {
    setTouched(true);
    if (!built.valid || !built.payload) return;
    setSubmitting(true);
    setSummary(null);
    setBlockerErrors({});
    setUnattributed([]);
    setStale(false);
    try {
      onReceived(await receivePurchaseOrder(order.id, built.payload));
      onClose();
    } catch (err) {
      const moved = staleMessage(parseApiError(err, 'lines'));
      if (moved) {
        // Cancelled or fully received elsewhere: nothing on this form can fix it.
        onStale(moved);
        onClose();
        return;
      }
      // Trap 3: receiveConflict matches blockers on line_id (blockersByLineId) and
      // hands back the ones no row on this form can display (unattachedBlockers)
      // separately — a form that swallowed those would show a failed receipt with
      // every row looking clean.
      const conflict = receiveConflict(err, built.submittedLineIds);
      setSummary(conflict.summary);
      setBlockerErrors(conflict.lineErrors);
      setUnattributed(conflict.unattributed);
      setStale(conflict.stale);
    } finally {
      setSubmitting(false);
    }
  };

  const messageFor = (lineId: string): string | undefined => blockerErrors[lineId] ?? built.lineErrors[lineId];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Receive against {order.po_number}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Quantities are what arrived in THIS delivery and add to what is already received — a line can be received over several passes.
            Stock lands at {order.destination_name}.
          </Typography>

          {summary && <Alert severity="error">{summary}</Alert>}
          {unattributed.length > 0 && (
            <Alert severity="warning">
              {/* Blockers that name no line on this form, or a line we did not send. */}
              {unattributed.join(' ')}
            </Alert>
          )}
          {stale && (
            <Alert severity="warning">This page's copy of the order is out of date. Close, reload, and check before retrying.</Alert>
          )}
          {touched && built.error && <Alert severity="warning">{built.error}</Alert>}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Ordered</TableCell>
                  <TableCell align="right">Received</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell align="right">Receiving now</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.lines.map((line) => {
                  const row = rows.find((entry) => entry.lineId === line.id);
                  const outstanding = lineOutstanding(line);
                  const message = messageFor(line.id);
                  return (
                    <TableRow key={line.id} hover>
                      <TableCell>
                        <Stack>
                          <Typography variant="body2">{lineLabel(line)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {describeLineProgress(line)}
                          </Typography>
                          {message && (
                            <Typography variant="caption" color="error">
                              {message}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{formatQuantity(line.qty_ordered)}</TableCell>
                      <TableCell align="right">{formatQuantity(line.qty_received)}</TableCell>
                      <TableCell align="right">{outstanding === 0 ? EM_DASH : formatQuantity(outstanding)}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={row?.qty ?? ''}
                          disabled={outstanding === 0}
                          error={Boolean(message)}
                          onChange={(event) => setQty(line.id, event.target.value)}
                          inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                          sx={{ width: 96 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="caption" color="text.secondary">
            Each received unit is stamped with the LANDED unit cost — the supplier price plus this line's share of freight and duty — so
            cost of goods reflects what the delivery really cost.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Close
        </Button>
        <Button variant="contained" onClick={submit} disabled={submitting}>
          {submitting ? 'Receiving…' : 'Receive'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// The editor
// ---------------------------------------------------------------------------

export default function PurchaseOrderEditor() {
  const { purchaseOrderId } = useParams<{ purchaseOrderId: string }>();
  const navigate = useNavigate();
  const isNew = !purchaseOrderId;
  // The backend route converter is <uuid:...>, so a mangled link never reaches a
  // view. Say so here instead of firing a request that cannot succeed.
  const badLink = !isNew && !isUuid(purchaseOrderId);

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);
  const [draft, setDraft] = useState<EditorDraft>(blankDraft);
  // A bad link never fetches, so it must not start out "loading" — otherwise the
  // spinner in the header runs forever next to the message explaining why.
  const [loading, setLoading] = useState(!isNew && !badLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stale, setStale] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Trap 1: only send `lines` when the grid really changed.
  const [linesChanged, setLinesChanged] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [receipt, setReceipt] = useState<PurchaseOrderReceiveResult['received_now'] | null>(null);

  const loadOrder = useCallback(async () => {
    if (!purchaseOrderId || !isUuid(purchaseOrderId)) return;
    setLoading(true);
    try {
      const fresh = await getPurchaseOrder(purchaseOrderId);
      setOrder(fresh);
      setDraft(draftFromOrder(fresh));
      setLinesChanged(false);
      setDirty(false);
      setTouched(false);
      setRowErrors({});
      setError(null);
      setStale(null);
    } catch (err) {
      setError(describePurchasingError(err));
    } finally {
      setLoading(false);
    }
  }, [purchaseOrderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Only a draft needs the supplier and location lists; a received order shows the
  // names it was saved with.
  const editable = isNew || (order?.is_editable ?? false);

  useEffect(() => {
    if (!editable || lookupsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const [supplierRows, locationRows] = await Promise.all([listSuppliers(supplierListQuery()), listLocations()]);
        if (cancelled) return;
        // The supplier list is NOT ordered: the view annotates a Count(), which
        // makes it a GROUP BY and drops the model's ordering.
        setSuppliers(sortSuppliersByName(supplierRows));
        setLocations(locationRows);
        setLookupsLoaded(true);
      } catch (err) {
        if (!cancelled) setError(describePurchasingError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editable, lookupsLoaded]);

  const actions = poActionsFor(order?.status ?? 'draft');
  const validation = validatePoDraft(draft);
  const progress = receiptProgress(order?.lines ?? []);

  const preview = useMemo(
    () =>
      previewLandedCosts(
        // Non-numeric text is normalised inside (asCount), so a half-typed cell
        // shows a stale projection rather than NaN.
        draft.lines.map((row) => ({ key: row.key, qtyOrdered: Number(row.qtyOrdered), unitCost: row.unitCost })),
        { shipping: draft.shipping, duty: draft.duty, other_fees: draft.otherFees }
      ),
    [draft]
  );

  /**
   * The destination options.
   *
   * Active locations only — the API refuses an inactive one — plus the order's own
   * destination if it has since been deactivated. Without that, the select would
   * blank a value that really is set, and PATCH cannot clear a destination (null is
   * a 400 there even though POST accepts it), so the blank would be unfixable.
   */
  const destinations = useMemo(() => {
    const rows = locations
      .filter((location) => location.is_active)
      .map((location) => ({ id: location.id, name: location.name, isDefault: location.is_default, deactivated: false }));
    if (order?.destination_id && !rows.some((row) => row.id === order.destination_id)) {
      rows.push({ id: order.destination_id, name: order.destination_name, isDefault: false, deactivated: true });
    }
    return rows;
  }, [locations, order]);

  const setField = <K extends keyof EditorDraft>(field: K, value: EditorDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const touchLines = () => {
    setLinesChanged(true);
    setDirty(true);
  };

  const editLine = (key: string, patch: Partial<EditorLine>) => {
    setDraft((current) => ({ ...current, lines: current.lines.map((row) => (row.key === key ? { ...row, ...patch } : row)) }));
    touchLines();
  };

  const removeLine = (key: string) => {
    setDraft((current) => ({ ...current, lines: current.lines.filter((row) => row.key !== key) }));
    touchLines();
  };

  const addPicked = (picked: PoLinePickerRow[]) => {
    setDraft((current) => ({
      ...current,
      lines: [
        ...current.lines,
        ...picked
          // The picker greys out what is already here; this is the guard for a
          // picker left open across an edit. A repeated item id is a 400 that
          // discards the whole grid on PATCH.
          .filter((row) => !current.lines.some((line) => line.inventoryItemId === row.inventoryItemId))
          .map((row) => ({
            // Deterministic and collision-free: item ids are unique within a draft,
            // and no server uuid starts with 'new-'.
            key: `new-${row.inventoryItemId}`,
            inventoryItemId: row.inventoryItemId,
            qtyOrdered: row.qtyOrdered,
            unitCost: row.suggestedUnitCost,
            label: row.label
          }))
      ]
    }));
    touchLines();
  };

  const save = async () => {
    setTouched(true);
    if (!validation.valid) return;
    setBusy(true);
    setError(null);
    setRowErrors({});
    try {
      if (!order) {
        const created = await createPurchaseOrder(buildPoCreatePayload(draft));
        setOrder(created);
        setDraft(draftFromOrder(created));
        setLinesChanged(false);
        setDirty(false);
        setNotice(`${created.po_number} created as a draft. Submit it when the order is ready to send.`);
        // From here the page is deep-linkable, which is what the reorder inbox needs.
        navigate(`/inventory/purchase-orders/${created.id}`, { replace: true });
        return;
      }
      const updated = await updatePurchaseOrder(order.id, buildPoPatchPayload(draft, { linesChanged }));
      setOrder(updated);
      setDraft(draftFromOrder(updated));
      setLinesChanged(false);
      setDirty(false);
      setNotice(`${updated.po_number} saved.`);
    } catch (err) {
      const parsed = parseApiError(err, 'lines');
      setError(parsed.summary);
      // A `lines` error carries its own row index and linesPayload sends the grid in
      // order, so here — unlike a 409 blocker — the index IS the row.
      const collected: Record<string, string> = {};
      rowErrorsByIndex(parsed).forEach((entries, index) => {
        const row = draft.lines[index];
        if (row) collected[row.key] = entries.map((entry) => entry.message).join(' ');
      });
      setRowErrors(collected);
      if (order && mayHavePartiallySaved(err, parsed)) {
        // Trap 2. Refetch so the header on screen is the header that was stored,
        // but keep the typed lines — they are what still needs fixing.
        const fresh = await getPurchaseOrder(order.id).catch(() => null);
        if (fresh) setOrder(fresh);
        setError(`${parsed.summary} The header fields were saved; the lines were not. Fix the highlighted line and save again.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: 'submit' | 'cancel') => {
    if (!order) return;
    setBusy(true);
    setError(null);
    setCancelOpen(false);
    try {
      const updated = action === 'submit' ? await submitPurchaseOrder(order.id) : await cancelPurchaseOrder(order.id);
      setOrder(updated);
      setDraft(draftFromOrder(updated));
      setLinesChanged(false);
      setDirty(false);
      setNotice(
        action === 'submit'
          ? `${updated.po_number} submitted. It is read-only from here — the supplier has it.`
          : `${updated.po_number} cancelled.`
      );
    } catch (err) {
      const parsed = parseApiError(err, 'lines');
      const moved = staleMessage(parsed);
      if (moved) setStale(moved);
      else setError(parsed.summary);
    } finally {
      setBusy(false);
    }
  };

  const onReceived = (result: PurchaseOrderReceiveResult) => {
    // Trap 4: this response's money keys are JSON numbers. Stored as-is; every
    // reader here goes through readMoney, which takes either shape.
    setOrder(result);
    setDraft(draftFromOrder(result));
    setReceipt(result.received_now);
    const units = result.received_now.reduce((total, movement) => total + movement.delta, 0);
    setNotice(`${units} unit(s) received against ${result.po_number}.`);
  };

  const fieldError = (field: 'supplierId' | 'destinationId' | 'expectedAt' | 'shipping' | 'duty' | 'otherFees') =>
    touched ? validation.errors[field] : undefined;

  const title = isNew ? 'New purchase order' : (order?.po_number ?? 'Purchase order');

  return (
    <Stack spacing={2}>
      <MainCard
        title={title}
        secondary={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {(loading || busy) && <CircularProgress size={18} />}
            {order && <Chip size="small" color={poStatusColor(order.status)} label={order.status_label || poStatusLabel(order.status)} />}
            {!isNew && (
              <Tooltip title="Reload">
                <IconButton size="small" onClick={loadOrder}>
                  <IconRefresh size={18} />
                </IconButton>
              </Tooltip>
            )}
            <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate('/inventory/purchase-orders')}>
              All orders
            </Button>
            {editable && (
              <Button size="small" variant="contained" onClick={save} disabled={busy || (!isNew && !dirty)}>
                {isNew ? 'Create draft' : 'Save'}
              </Button>
            )}
            {order && actions.submit && (
              <Tooltip
                title={
                  dirty
                    ? 'Save first — submit sends the order as it is stored, not as it is on screen.'
                    : 'Send this order to the supplier. It becomes read-only.'
                }
              >
                <span>
                  <Button size="small" variant="outlined" onClick={() => runAction('submit')} disabled={busy || dirty}>
                    Submit
                  </Button>
                </span>
              </Tooltip>
            )}
            {order && canPoAction(order.status, 'receive') && (
              <Button size="small" variant="contained" onClick={() => setReceiveOpen(true)} disabled={busy}>
                Receive
              </Button>
            )}
            {/* Hidden rather than disabled once anything is received: the endpoint
                would answer an illegal-transition 409 with no useful copy. */}
            {order && canPoAction(order.status, 'cancel') && (
              <Button size="small" color="error" onClick={() => setCancelOpen(true)} disabled={busy}>
                Cancel order
              </Button>
            )}
          </Stack>
        }
      >
        <Stack spacing={2}>
          {badLink && <Alert severity="error">That is not a valid purchase-order link.</Alert>}
          {stale && (
            <Alert
              severity="warning"
              action={
                <Button size="small" onClick={loadOrder}>
                  Reload
                </Button>
              }
            >
              {stale}
            </Alert>
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

          {editable ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Supplier"
                  value={draft.supplierId}
                  onChange={(event) => setField('supplierId', event.target.value)}
                  error={Boolean(fieldError('supplierId'))}
                  helperText={fieldError('supplierId') ?? 'Who the order goes to.'}
                >
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                      {supplier.default_lead_time_days ? ` · ${supplier.default_lead_time_days}d lead time` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Destination"
                  value={draft.destinationId ?? ''}
                  onChange={(event) => setField('destinationId', event.target.value || null)}
                  error={Boolean(fieldError('destinationId'))}
                  helperText={
                    fieldError('destinationId') ??
                    (isNew
                      ? 'Where the delivery lands. Leave as the default to use the company default location.'
                      : 'A destination cannot be cleared once the order exists — pick another location instead.')
                  }
                >
                  {/* Offered on a new order only: PATCH rejects a null destination
                      even though POST accepts one, so "clear it" is not a thing the
                      API can do to a saved order. */}
                  {isNew && <MenuItem value="">Company default location</MenuItem>}
                  {destinations.map((destination) => (
                    <MenuItem key={destination.id} value={destination.id}>
                      {destination.name}
                      {destination.isDefault ? ' (default)' : ''}
                      {destination.deactivated ? ' — deactivated' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Expected"
                  value={typeof draft.expectedAt === 'string' ? draft.expectedAt : ''}
                  onChange={(event) => setField('expectedAt', event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(fieldError('expectedAt'))}
                  helperText={fieldError('expectedAt') ?? 'A date, not a time. Feeds the on-order view.'}
                />
              </Grid>
              {isNew && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="PO number"
                    value={draft.poNumber ?? ''}
                    onChange={(event) => setField('poNumber', event.target.value)}
                    helperText="Leave blank to number it automatically. Not editable afterwards."
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: isNew ? 4 : 8 }}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={draft.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  helperText="Free text: deposit paid, ship-by instructions, anything the receiver needs."
                />
              </Grid>

              <Grid size={12}>
                <Divider textAlign="left">
                  <Typography variant="caption" color="text.secondary">
                    Freight, duty and other fees — spread over the ORDERED value of the lines
                  </Typography>
                </Divider>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Shipping"
                  value={draft.shipping}
                  onChange={(event) => setField('shipping', event.target.value)}
                  inputProps={{ inputMode: 'decimal' }}
                  error={Boolean(fieldError('shipping'))}
                  helperText={fieldError('shipping') ?? 'Blank counts as zero.'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Duty"
                  value={draft.duty}
                  onChange={(event) => setField('duty', event.target.value)}
                  inputProps={{ inputMode: 'decimal' }}
                  error={Boolean(fieldError('duty'))}
                  helperText={fieldError('duty') ?? ' '}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Other fees"
                  value={draft.otherFees}
                  onChange={(event) => setField('otherFees', event.target.value)}
                  inputProps={{ inputMode: 'decimal' }}
                  error={Boolean(fieldError('otherFees'))}
                  helperText={fieldError('otherFees') ?? ' '}
                />
              </Grid>
            </Grid>
          ) : (
            order && (
              <Grid container spacing={2}>
                {[
                  ['Supplier', order.supplier_name],
                  ['Destination', order.destination_name],
                  ['Expected', order.expected_at ?? EM_DASH],
                  ['Submitted', order.submitted_at ? new Date(order.submitted_at).toLocaleString() : EM_DASH],
                  ['Received', order.received_at ? new Date(order.received_at).toLocaleString() : EM_DASH],
                  ['Cancelled', order.cancelled_at ? new Date(order.cancelled_at).toLocaleString() : EM_DASH],
                  ['Shipping', formatMoney(order.shipping)],
                  ['Duty', formatMoney(order.duty)],
                  ['Other fees', formatMoney(order.other_fees)],
                  ['Progress', `${progress.received} of ${progress.ordered} unit(s) received`]
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 6, sm: 4, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="body2">{value}</Typography>
                  </Grid>
                ))}
                {order.notes && (
                  <Grid size={12}>
                    <Typography variant="caption" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body2">{order.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            )
          )}
        </Stack>
      </MainCard>

      <MainCard
        title="Lines"
        secondary={
          editable && (
            <Button size="small" variant="outlined" startIcon={<IconPlus size={16} />} onClick={() => setPickerOpen(true)}>
              Add lines
            </Button>
          )
        }
      >
        <Stack spacing={2}>
          {touched && validation.errors.lines && <Alert severity="warning">{validation.errors.lines}</Alert>}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  {editable ? (
                    <>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit cost</TableCell>
                      <TableCell align="right">Line value</TableCell>
                      <TableCell align="right">Projected landed unit cost</TableCell>
                      <TableCell align="right" />
                    </>
                  ) : (
                    <>
                      <TableCell align="right">Ordered</TableCell>
                      <TableCell align="right">Received</TableCell>
                      <TableCell align="right">Unit cost</TableCell>
                      <TableCell align="right">Landed unit cost</TableCell>
                      <TableCell align="right">Line value</TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {(editable ? draft.lines.length : (order?.lines.length ?? 0)) === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        {editable
                          ? "Nothing on this order yet. Add lines from a style's size × colour grid, or by SKU."
                          : /* The API will happily create and submit a PO with no
                               lines, so this is reachable and must not be a blank
                               table that reads as a failed load. */
                            'This order has no lines.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {editable &&
                  draft.lines.map((row) => {
                    const share = preview.shareByKey.get(row.key);
                    const message = rowErrors[row.key] ?? (touched ? validation.lineErrors[row.key] : undefined);
                    return [
                      <TableRow key={row.key} hover>
                        <TableCell>
                          <Typography variant="body2">{row.label}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            value={row.qtyOrdered}
                            error={Boolean(message)}
                            onChange={(event) => editLine(row.key, { qtyOrdered: event.target.value })}
                            inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                            sx={{ width: 88 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            value={row.unitCost}
                            error={Boolean(message)}
                            onChange={(event) => editLine(row.key, { unitCost: event.target.value })}
                            inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                            sx={{ width: 110 }}
                          />
                        </TableCell>
                        <TableCell align="right">{share ? formatCost(share.lineValue) : EM_DASH}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                            <Typography variant="body2">{share ? formatCost(share.projectedLandedUnitCost) : EM_DASH}</Typography>
                            {share?.carriesRemainder && (
                              <Tooltip title="This line absorbs the pool's odd cent, so the shares add up to the pool exactly.">
                                <Chip size="small" variant="outlined" label="+1¢" />
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => removeLine(row.key)} disabled={busy}>
                            <IconTrash size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>,
                      message ? (
                        <TableRow key={`${row.key}-error`}>
                          <TableCell colSpan={6} sx={{ pt: 0, borderBottom: 'none' }}>
                            <Typography variant="caption" color="error">
                              {message}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null
                    ];
                  })}

                {!editable &&
                  (order?.lines ?? []).map((line) => {
                    // lineCostDisplay picks actual-over-projected and says which it
                    // gave back. Surfacing that is not decoration: a projection read
                    // as an actual is a fiction with two decimal places.
                    const cost = lineCostDisplay(line);
                    return (
                      <TableRow key={line.id} hover>
                        <TableCell>
                          <Stack>
                            <Typography variant="body2">{lineLabel(line)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {describeLineProgress(line)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{formatQuantity(line.qty_ordered)}</TableCell>
                        <TableCell align="right">{formatQuantity(line.qty_received)}</TableCell>
                        <TableCell align="right">{formatCost(line.unit_cost)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                            <Typography variant="body2">{cost.text}</Typography>
                            {cost.isProjection && (
                              <Tooltip title="Projected, not actual — nothing has been received against this line yet. The figure will not change at the first receipt; its status will.">
                                <Chip size="small" color="warning" variant="outlined" label="Projected" />
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{formatCost(line.line_value)}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider />

          {editable ? (
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                <Typography variant="body2">Goods {formatCost(preview.goodsValue)}</Typography>
                <Typography variant="body2">Fees {formatMoney(preview.pool)}</Typography>
                <Typography variant="body2">Total {formatCost(preview.totalValue)}</Typography>
                <Box flexGrow={1} />
                <Typography variant="caption" color="text.secondary">
                  Projection — nothing is saved until you save.
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Fees are spread by ordered value, so a $2,000 line of coats carries more freight than a $50 line of socks. Two lines of
                identical value may swap the odd remainder cent once saved — the pool total is unaffected.
              </Typography>
            </Stack>
          ) : (
            order && (
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                <Typography variant="body2">Goods {formatMoney(order.goods_value)}</Typography>
                <Typography variant="body2">Fees {formatMoney(order.landed_cost_pool)}</Typography>
                <Typography variant="body2">Total {formatMoney(order.total_value)}</Typography>
              </Stack>
            )
          )}
        </Stack>
      </MainCard>

      {receipt && receipt.length > 0 && order && (
        <MainCard
          title="This receipt"
          secondary={
            <Button size="small" onClick={() => setReceipt(null)}>
              Dismiss
            </Button>
          }
        >
          <Stack spacing={1.5}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Booked</TableCell>
                    <TableCell align="right">On hand at {order.destination_name}</TableCell>
                    <TableCell align="right">Landed unit cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receipt.map((movement) => {
                    const line = order.lines.find((entry) => entry.id === movement.line_id);
                    return (
                      <TableRow key={movement.line_id}>
                        <TableCell>{line ? lineLabel(line) : movement.line_id}</TableCell>
                        <TableCell align="right">{formatDelta(movement.delta)}</TableCell>
                        <TableCell align="right">{formatQuantity(movement.quantity_after)}</TableCell>
                        <TableCell align="right">{formatCost(movement.unit_cost)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary">
              What this pass booked. The cost stamped on each movement is the LANDED unit cost — the supplier price plus this line's share
              of freight and duty — not the supplier's price. Quantities are per location, at the order's destination.
            </Typography>
          </Stack>
        </MainCard>
      )}

      <PoLinePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={addPicked}
        existingItemIds={draft.lines.map((row) => row.inventoryItemId).filter((id): id is number => id !== null)}
      />

      {order && (
        <ReceiveDialog
          open={receiveOpen}
          order={order}
          onClose={() => setReceiveOpen(false)}
          onReceived={onReceived}
          onStale={(message) => setStale(message)}
        />
      )}

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel {order?.po_number}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Cancelling is final — a cancelled order cannot be reopened, submitted or received. Nothing has been received against it yet,
            which is the only reason this is still possible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={busy}>
            Keep it
          </Button>
          <Button color="error" variant="contained" onClick={() => runAction('cancel')} disabled={busy}>
            Cancel order
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
