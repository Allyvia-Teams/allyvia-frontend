// views/inventory/ReorderInbox.tsx
//
// The reorder inbox: what to buy, how many, why, and what happens if you do not.
//
// THE ORDER ON SCREEN IS THE SERVER'S AND IS NEVER RE-DERIVED HERE.
// The list arrives sorted `forecast_stockout_date ASC nulls_last, -suggested_qty`.
// A null date means velocity is zero — "nothing is selling, so it never runs
// out" — which is the LEAST urgent state in the inbox. Postgres sorts nulls
// first on ASC, so the backend says `nulls_last` explicitly, and any client sort
// that forgets to (or a 999/Infinity sentinel standing in for the null) heads the
// buyer's screen with the items they should care least about. `items` is
// therefore rendered exactly as fetched; reorder.ts::sortForServerOrder exists
// for the one case this screen does not have, re-deriving after a local edit.
//
// WHAT MAKES THIS SCREEN TRUSTWORTHY RATHER THAN MAGIC
// Every card carries the engine's full working — see ReorderSuggestionCard — and
// this page carries the three policy figures that feed it. A buyer who disagrees
// with a suggested quantity is usually disagreeing with the review period or the
// safety buffer, and those are inputs to every number here, so they are printed
// rather than buried in a settings screen nobody opens.
//
// THREE THINGS THE ACTIONS HAVE TO SAY OUT LOUD
//
//   1. "Create draft PO(s)" can create one order or five: the backend groups by
//      (supplier, destination), which is what a purchase order IS. The count and
//      the groups are shown BEFORE the call, along with every selected row that
//      cannot become a line because it has no supplier.
//   2. Applying a suggested reorder point writes the same field
//      `stockFormat.stockSeverity` reads, so items with no reorder point today
//      can start showing as low on the style catalogue the instant it lands. The
//      confirmation says so, and the inbox is refetched afterwards.
//   3. Regenerating supersedes the live suggestions but leaves DISMISSED ones
//      alone — which is the only thing that makes a dismissal mean anything.
//
// Reading is open to every role; dismiss, create-PO, apply and regenerate are
// admin-only, and the reason is stated here rather than delivered as a 403 —
// Session 7's precedent in StockCountList.tsx.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconRefresh, IconShoppingCart } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import AllyviaStats from 'ui-component/common/AllyviaStats';

import { useSelector } from 'store';

import { Supplier, listSuppliers } from 'api/inventoryPurchasing.api';
import {
  applySuggestedReorderPoints,
  createPurchaseOrdersFromSuggestions,
  dismissReorderSuggestions,
  listReorderSuggestions,
  regenerateReorderSuggestions
} from 'api/inventoryReorder.api';
import { Location, listLocations } from 'api/inventoryStock.api';

import { parseApiError } from './apiErrors';
import ReorderSuggestionCard from './ReorderSuggestionCard';
import {
  APPLY_REORDER_POINT_NOTE,
  CreatedPurchaseOrder,
  DISMISSAL_REASON_MAX_LENGTH,
  NON_ADMIN_REORDER_NOTICE,
  REGENERATE_NOTE,
  REORDER_STATUSES,
  ReorderInbox as InboxData,
  ReorderSuggestion,
  applyReorderPointPayload,
  createPoPayload,
  describeCreatedOrders,
  describeDismissal,
  describePolicy,
  dismissPayload,
  normalizeReorderResponse,
  previewPurchaseOrders,
  purchaseOrderRoute,
  readCreatedPurchaseOrders,
  REORDER_FOCUS_PARAM,
  reorderListQuery,
  reorderStatusColor,
  reorderStatusLabel,
  reorderUrgency,
  validateSelection
} from './reorder';
import { formatQuantity } from './stockFormat';

const EMPTY_INBOX: InboxData = { items: [], totalUnitsSuggested: null, policy: null };

type DialogState =
  | { kind: 'dismiss'; rows: ReorderSuggestion[] }
  | { kind: 'create-po'; rows: ReorderSuggestion[] }
  | { kind: 'apply'; rows: ReorderSuggestion[] }
  | { kind: 'regenerate' };

export default function ReorderInbox() {
  const navigate = useNavigate();

  // The backend gate is `Role.is_admin`, which is `role_type == "admin"` exactly.
  // Lower-cased because lib/session.ts stores a capitalised 'Member' while the API
  // sends lower case, and a casing mismatch would offer buttons that answer 403.
  const roleType = useSelector((state) => state.auth.currentRole?.role_type);
  const isAdmin = String(roleType ?? '').toLowerCase() === 'admin';

  const [inbox, setInbox] = useState<InboxData>(EMPTY_INBOX);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  // Deep links from the stockout strip and from a dashboard restock
  // recommendation carry these. The suggestion is MARKED, not filtered to — a
  // suggestion is only urgent relative to the ones above it, so lifting it out
  // of the queue would hide the very context that makes it urgent.
  const focusedId = searchParams.get(REORDER_FOCUS_PARAM) ?? '';
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location_id') ?? '');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPurchaseOrder[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // A query STRING, not a params object: `status` is repeatable and read with
      // getlist, so axios would serialise an array as `status[]=` and the filter
      // would silently stop applying. The builder also drops a non-uuid location
      // or supplier, which the list view answers with an uncaught HTML 500.
      const body = await listReorderSuggestions(reorderListQuery({ statuses, locationId: locationFilter, supplierId: supplierFilter }));
      const next = normalizeReorderResponse(body);
      setInbox(next);
      // Prune a selection whose rows are gone. Sending a stale id would act on
      // fewer suggestions than were ticked and report success anyway.
      const live = new Set(next.items.map((item) => item.id));
      setSelectedIds((current) => current.filter((id) => live.has(id)));
      setError(null);
    } catch (err) {
      setError(parseApiError(err).summary);
    } finally {
      setLoading(false);
    }
  }, [statuses, locationFilter, supplierFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!focusedId || loading) return;
    // Only after the list has rendered, and only if the row survived the
    // filters — a link to a suggestion that has since been ordered or
    // superseded should leave the page where it is rather than jumping nowhere.
    const node = document.getElementById(`reorder-suggestion-${focusedId}`);
    node?.scrollIntoView({ block: 'center' });
  }, [focusedId, loading, inbox]);

  // The filter options are company-wide and do not move with the list.
  useEffect(() => {
    let cancelled = false;
    Promise.all([listLocations(), listSuppliers()])
      .then(([locationRows, supplierRows]) => {
        if (cancelled) return;
        setLocations(locationRows);
        setSuppliers(supplierRows);
      })
      .catch(() => {
        // A failed lookup costs the filters, not the inbox — leave them empty
        // rather than blocking the page on a dropdown.
        if (!cancelled) {
          setLocations([]);
          setSuppliers([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Selection follows the SERVER's order, because the preview and the dialogs
  // list rows in the order the buyer read them.
  const selectedRows = useMemo(() => inbox.items.filter((item) => selectedIds.includes(item.id)), [inbox.items, selectedIds]);

  // Composed from reorder.ts's urgency reading rather than re-deriving a
  // threshold here: `critical` is "inside the restock time, or already overdue".
  const criticalCount = useMemo(
    () => inbox.items.filter((item) => reorderUrgency(item.days_until_stockout, item.lead_time_days).level === 'critical').length,
    [inbox.items]
  );

  const policyReadings = describePolicy(inbox.policy);
  const preview = useMemo(() => previewPurchaseOrders(selectedRows), [selectedRows]);
  // The dialog previews the rows it was OPENED with, not whatever is selected
  // now, so the sentence a buyer confirms is the one they were shown.
  const dialogPreview = useMemo(() => (dialog?.kind === 'create-po' ? previewPurchaseOrders(dialog.rows) : preview), [dialog, preview]);
  const filtered = statuses.length > 0 || locationFilter !== '' || supplierFilter !== '';

  const toggleSelected = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));

  const toggleStatus = (status: string) =>
    setStatuses((current) => (current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status]));

  const openDialog = (next: DialogState) => {
    setActionError(null);
    setDismissReason('');
    setDialog(next);
  };

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
    setActionError(null);
  };

  /** Every action shares this shell: validate, call, explain, refetch. */
  const runAction = async (rows: ReorderSuggestion[], run: (ids: string[]) => Promise<void>) => {
    const check = validateSelection(rows.map((row) => row.id));
    if (!check.valid) {
      setActionError(check.error ?? 'That selection cannot be used.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await run(check.ids);
    } catch (err) {
      setActionError(parseApiError(err).summary);
    } finally {
      setBusy(false);
    }
  };

  const submitDismiss = (rows: ReorderSuggestion[]) =>
    runAction(rows, async (ids) => {
      const payload = dismissPayload(ids, dismissReason);
      if (!payload) return;
      await dismissReorderSuggestions(payload);
      setNotice(`${ids.length} ${ids.length === 1 ? 'suggestion' : 'suggestions'} dismissed. ${describeDismissal(inbox.policy)}`);
      setCreated([]);
      setSelectedIds([]);
      setDialog(null);
      await load();
    });

  const submitCreatePo = (rows: ReorderSuggestion[]) =>
    runAction(rows, async (ids) => {
      const payload = createPoPayload(ids);
      if (!payload) return;
      const orders = readCreatedPurchaseOrders(await createPurchaseOrdersFromSuggestions(payload));
      setDialog(null);
      setSelectedIds([]);
      // One order is the common case, and the buyer's next act is to price and
      // submit it — so go straight into the editor. `route` falls back to the PO
      // list when the response carried no usable id, which is a worse deep link
      // and a much better failure than an editor that fetches nothing.
      if (orders.length === 1) {
        navigate(orders[0].route);
        return;
      }
      // Several orders, or none: staying put is the only honest option — one
      // deep link would hide the others, and there is nothing to link to when
      // the endpoint answered 200 with an empty list.
      setCreated(orders);
      setNotice(describeCreatedOrders(orders));
      await load();
    });

  const submitApply = (rows: ReorderSuggestion[]) =>
    runAction(rows, async (ids) => {
      const payload = applyReorderPointPayload(ids);
      if (!payload) return;
      await applySuggestedReorderPoints(payload);
      setNotice(`Reorder point applied to ${ids.length} ${ids.length === 1 ? 'item' : 'items'}. ${APPLY_REORDER_POINT_NOTE}`);
      setCreated([]);
      setSelectedIds([]);
      setDialog(null);
      // Refetched because the suggestions now describe items whose threshold has
      // moved: `current_reorder_point` on every affected card is stale.
      await load();
    });

  const submitRegenerate = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await regenerateReorderSuggestions();
      setSelectedIds([]);
      setCreated([]);
      setNotice(`Suggestions regenerated. ${REGENERATE_NOTE}`);
      setDialog(null);
      await load();
    } catch (err) {
      setActionError(parseApiError(err).summary);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <MainCard
        title="Reorder inbox"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <Tooltip title="Reload the inbox">
              <IconButton size="small" onClick={load}>
                <IconRefresh size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={isAdmin ? REGENERATE_NOTE : NON_ADMIN_REORDER_NOTICE}>
              <span>
                <Button size="small" variant="outlined" disabled={!isAdmin || busy} onClick={() => openDialog({ kind: 'regenerate' })}>
                  Regenerate now
                </Button>
              </span>
            </Tooltip>
          </Stack>
        }
      >
        <Stack spacing={2}>
          {!isAdmin && <Alert severity="info">{NON_ADMIN_REORDER_NOTICE}</Alert>}

          {/* ---- the headline figures ---- */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 220px', minWidth: 220 }}>
              <AllyviaStats title="Suggestions shown" value={formatQuantity(inbox.items.length)} loading={loading} />
            </Box>
            <Box sx={{ flex: '1 1 220px', minWidth: 220 }}>
              <AllyviaStats
                title="Units suggested"
                // An em dash when the envelope did not carry the total. A 0 there
                // would read as "there is nothing to buy", which is a different
                // and much calmer claim than "we were not told".
                value={formatQuantity(inbox.totalUnitsSuggested)}
                loading={loading}
                chip={
                  <AllyviaChip
                    size="small"
                    variant="outlined"
                    label="server total"
                    tooltipTitle="The endpoint's own total for the suggestions matching these filters — not a company-wide figure."
                  />
                }
              />
            </Box>
            <Box sx={{ flex: '1 1 220px', minWidth: 220 }}>
              <AllyviaStats
                title="Cannot wait"
                value={formatQuantity(criticalCount)}
                theme={criticalCount > 0 ? 'alert' : 'default'}
                loading={loading}
                chip={
                  <AllyviaChip
                    size="small"
                    variant="outlined"
                    label="within lead time"
                    tooltipTitle="Rows whose forecast stockout falls inside the restock time, or has already passed. An order placed today arrives too late."
                  />
                }
              />
            </Box>
          </Box>

          {/* ---- the policy behind every number above ---- */}
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              Buying policy
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
              {policyReadings.map((reading) => (
                <Tooltip key={reading.key} title={reading.detail}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {reading.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} color={reading.known ? 'text.primary' : 'text.secondary'}>
                      {reading.value}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              The review period and safety buffer are two of the three spans in every horizon on this page, so they are inputs to every
              quantity below. {describeDismissal(inbox.policy)}
            </Typography>
          </Paper>

          {/* ---- filters ---- */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            {REORDER_STATUSES.map((status) => (
              <Chip
                key={status}
                size="small"
                label={reorderStatusLabel(status)}
                color={statuses.includes(status) ? reorderStatusColor(status) : 'default'}
                variant={statuses.includes(status) ? 'filled' : 'outlined'}
                onClick={() => toggleStatus(status)}
              />
            ))}
            <TextField
              select
              size="small"
              label="Location"
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All locations</MenuItem>
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                  {location.is_default ? ' (default)' : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Supplier"
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All suppliers</MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </TextField>
            <Box flexGrow={1} />
            {filtered && (
              <Button
                size="small"
                onClick={() => {
                  setStatuses([]);
                  setLocationFilter('');
                  setSupplierFilter('');
                }}
              >
                Clear filters
              </Button>
            )}
          </Stack>
          {statuses.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              With no status selected the backend shows live suggestions only — dismissed, ordered and superseded rows are hidden until you
              ask for them.
            </Typography>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {notice && (
            <Alert severity="success" onClose={() => setNotice(null)}>
              {notice}
              {created.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {created.map((order, index) => (
                    <Button key={`${order.id ?? 'no-id'}-${index}`} size="small" variant="outlined" onClick={() => navigate(order.route)}>
                      {order.reference}
                      {order.supplierName ? ` · ${order.supplierName}` : ''}
                    </Button>
                  ))}
                </Stack>
              )}
            </Alert>
          )}

          {/* ---- what a bulk action would do, before it is clicked ---- */}
          {selectedIds.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">
                    {selectedIds.length} {selectedIds.length === 1 ? 'suggestion' : 'suggestions'} selected
                  </Typography>
                  {/* The count of ORDERS, not of rows, and it is the preview's —
                      the backend groups by (supplier, destination), so five
                      ticked rows can be one order or five. No unit total is
                      summed here: the orderable rows, the supplier-less ones and
                      the already-closed ones are three different populations,
                      and one figure covering all three would be a number nobody
                      could act on. */}
                  <Typography variant="caption" color="text.secondary">
                    {preview.summary}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button size="small" onClick={() => setSelectedIds([])} disabled={busy}>
                    Clear
                  </Button>
                  <Tooltip title={isAdmin ? 'Dismiss with a reason' : NON_ADMIN_REORDER_NOTICE}>
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!isAdmin || busy}
                        onClick={() => openDialog({ kind: 'dismiss', rows: selectedRows })}
                      >
                        Dismiss…
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title={isAdmin ? APPLY_REORDER_POINT_NOTE : NON_ADMIN_REORDER_NOTICE}>
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!isAdmin || busy}
                        onClick={() => openDialog({ kind: 'apply', rows: selectedRows })}
                      >
                        Apply reorder points
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title={isAdmin ? preview.summary : NON_ADMIN_REORDER_NOTICE}>
                    <span>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<IconShoppingCart size={16} />}
                        disabled={!isAdmin || busy || preview.orderCount === 0}
                        onClick={() => openDialog({ kind: 'create-po', rows: selectedRows })}
                      >
                        Create {preview.orderCount} draft {preview.orderCount === 1 ? 'PO' : 'POs'}
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          )}

          {/* ---- the list, in the server's order ---- */}
          <AllyviaEmpty
            isLoading={loading}
            // An error means we have no data, not that there is nothing to buy —
            // the Alert above is the only claim made in that case.
            isEmpty={!loading && !error && inbox.items.length === 0}
            type="list"
            skeletonType="list"
            items={3}
            height="auto"
            title={filtered ? 'No suggestions match these filters' : 'Nothing to reorder'}
            description={
              filtered
                ? 'Clear a filter, or widen the status selection to include dismissed, ordered and superseded suggestions.'
                : 'The engine has no live suggestions for your company. Regenerate to recompute from today’s stock and sales.'
            }
          >
            <Stack spacing={1.5}>
              {inbox.items.map((suggestion) => (
                <ReorderSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  selected={selectedIds.includes(suggestion.id)}
                  selectable={isAdmin && !busy}
                  disabledReason={NON_ADMIN_REORDER_NOTICE}
                  onToggle={toggleSelected}
                  onApplyReorderPoint={(row) => openDialog({ kind: 'apply', rows: [row] })}
                  onDismiss={(row) => openDialog({ kind: 'dismiss', rows: [row] })}
                  focused={suggestion.id === focusedId}
                  onOpenPurchaseOrder={(row) => navigate(purchaseOrderRoute(row.purchase_order_id))}
                />
              ))}
            </Stack>
          </AllyviaEmpty>
        </Stack>
      </MainCard>

      {/* ---- dismiss ---- */}
      <Dialog open={dialog?.kind === 'dismiss'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Dismiss {dialog?.kind === 'dismiss' ? dialog.rows.length : 0} suggestion(s)</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" icon={false}>
              {describeDismissal(inbox.policy)}
            </Alert>
            <Stack spacing={0.5}>
              {(dialog?.kind === 'dismiss' ? dialog.rows : []).map((row) => (
                <Typography key={row.id} variant="body2">
                  {row.name} · {row.location_name} · {formatQuantity(row.suggested_qty)} units
                </Typography>
              ))}
            </Stack>
            <TextField
              label="Reason"
              value={dismissReason}
              onChange={(event) => setDismissReason(event.target.value)}
              // Bound to the field so the payload builder's cap never has to fire;
              // beyond 255 the serializer answers 400 and the action is lost.
              slotProps={{ htmlInput: { maxLength: DISMISSAL_REASON_MAX_LENGTH } }}
              helperText={`Optional, but the next person reading this inbox has only what you write here. ${dismissReason.length}/${DISMISSAL_REASON_MAX_LENGTH}`}
              multiline
              minRows={2}
            />
            {actionError && <Alert severity="error">{actionError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !isAdmin}
            onClick={() => submitDismiss(dialog?.kind === 'dismiss' ? dialog.rows : [])}
          >
            {busy ? 'Dismissing…' : 'Dismiss'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- create draft purchase orders ---- */}
      <Dialog open={dialog?.kind === 'create-po'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create draft purchase orders</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" icon={false}>
              <AlertTitle>{dialogPreview.summary}</AlertTitle>
              One purchase order per supplier and destination — that is what a purchase order is. They are created as drafts, so nothing
              reaches a supplier until one is submitted.
            </Alert>

            {dialogPreview.groups.map((group) => (
              <Paper key={group.key} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                    {group.supplierName} → {group.locationName}
                  </Typography>
                  <AllyviaChip
                    size="small"
                    variant="outlined"
                    color={group.canOrder ? 'success' : 'warning'}
                    label={group.canOrder ? `${formatQuantity(group.totalUnits)} units` : 'Cannot be ordered'}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {group.suggestions.map((row) => row.name).join(', ')}
                </Typography>
                {group.note && (
                  <Typography variant="caption" color="warning.dark" display="block" sx={{ mt: 0.5 }}>
                    {group.note}
                  </Typography>
                )}
              </Paper>
            ))}

            {/* Named, not silently dropped: a shorter order than the buyer ticked
                is the failure this list exists to prevent. */}
            {dialogPreview.skipped.length > 0 && (
              <Alert severity="warning">
                <AlertTitle>
                  {dialogPreview.skipped.length} {dialogPreview.skipped.length === 1 ? 'suggestion' : 'suggestions'} will be left out
                </AlertTitle>
                <Stack spacing={0.5}>
                  {dialogPreview.skipped.map((skip) => (
                    <Typography key={skip.suggestionId} variant="caption">
                      <strong>{skip.name}</strong> — {skip.detail}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}

            {actionError && <Alert severity="error">{actionError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || !isAdmin || dialogPreview.orderCount === 0}
            onClick={() => submitCreatePo(dialog?.kind === 'create-po' ? dialog.rows : [])}
          >
            {busy ? 'Creating…' : `Create ${dialogPreview.orderCount} draft ${dialogPreview.orderCount === 1 ? 'order' : 'orders'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- apply suggested reorder points ---- */}
      <Dialog open={dialog?.kind === 'apply'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Apply suggested reorder points</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning" icon={false}>
              {APPLY_REORDER_POINT_NOTE}
            </Alert>
            <Divider />
            <Stack spacing={0.5}>
              {(dialog?.kind === 'apply' ? dialog.rows : []).map((row) => (
                <Typography key={row.id} variant="body2">
                  {row.name} · {formatQuantity(row.current_reorder_point ?? null)} → {formatQuantity(row.suggested_reorder_point ?? null)}
                </Typography>
              ))}
            </Stack>
            {actionError && <Alert severity="error">{actionError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" disabled={busy || !isAdmin} onClick={() => submitApply(dialog?.kind === 'apply' ? dialog.rows : [])}>
            {busy ? 'Applying…' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- regenerate ---- */}
      <Dialog open={dialog?.kind === 'regenerate'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Regenerate suggestions</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" icon={false}>
              {REGENERATE_NOTE}
            </Alert>
            {actionError && <Alert severity="error">{actionError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" disabled={busy || !isAdmin} onClick={submitRegenerate}>
            {busy ? 'Regenerating…' : 'Regenerate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
