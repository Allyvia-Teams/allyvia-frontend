// views/inventory/TransferDetail.tsx
//
// One transfer: what it holds, dispatching it, receiving it, and what never
// arrived.
//
// THE SHORTFALL IS THE WHOLE REASON THIS SCREEN IS SHAPED LIKE THIS.
// Receiving less than was dispatched is allowed and does not fail. The transfer
// closes as "Received" either way, the missing units stay counted as in transit,
// and NO shrinkage movement is written anywhere — so those units are simply
// absent from every stock report, and nothing will ever flag them again. That
// makes a short receive an irreversible write-off performed by a screen that
// would otherwise look like a confirmation. Hence: the loss is computed and shown
// BEFORE the request goes out, acknowledged explicitly, and then displayed at the
// top of this page for as long as the transfer exists.
//
// Dispatch is all-or-nothing — one line short of stock refuses the whole transfer
// — so it gets a preflight instead of a spinner and a 409. And cancelling is
// legal from draft only: there is no reversal flow, so once stock has left the
// origin the only remaining move is to receive it.
//
// Every rule here is transfersLogic.ts's and tested there. This file wires it up.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { cancelTransfer, dispatchTransfer, getTransfer, receiveTransfer } from 'api/inventoryTransfers.api';

import { RowError, blockersByLineId, isIllegalTransition, parseApiError, unattachedBlockers } from './apiErrors';
import { EM_DASH, formatQuantity } from './stockFormat';
import {
  ReceiveDraft,
  ReceiveMode,
  ReceivePayload,
  ReceiveScan,
  Transfer,
  buildReceivePayload,
  describeTransferRoute,
  dispatchPreflight,
  normalizeTransfer,
  originAvailability,
  planReceive,
  transferActionUnavailableReason,
  transferActionsFor,
  transferLineLabel,
  transferShortfallReport,
  transferStatusColor,
  transferStatusLabel
} from './transfersLogic';

const summarise = (err: unknown): string => {
  const parsed = parseApiError(err, 'lines');
  return [parsed.summary, parsed.hint].filter(Boolean).join(' ');
};

const formatWhen = (value: string | null): string => (value ? new Date(value).toLocaleString() : EM_DASH);

export default function TransferDetail() {
  const { transferId } = useParams<{ transferId: string }>();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Keyed by line id, never by position: the backend appends a blocker only for
  // the lines that failed, so `detail[0]` is not the first line submitted.
  const [blockers, setBlockers] = useState<Map<string, RowError>>(new Map());
  const [orphanBlockers, setOrphanBlockers] = useState<RowError[]>([]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // 'new' belongs to the draft editor. It shares this route, so hand it over
  // rather than asking the API for a transfer whose id is the word "new".
  const isNewDraft = transferId === 'new';

  const load = useCallback(async () => {
    if (!transferId || transferId === 'new') return;
    setLoading(true);
    try {
      setTransfer(normalizeTransfer(await getTransfer(transferId)));
      setError(null);
    } catch (err) {
      setError(summarise(err));
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    if (isNewDraft) navigate('/inventory/transfers?edit=new', { replace: true });
  }, [isNewDraft, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const actions = transfer ? transferActionsFor(transfer) : [];
  const report = useMemo(() => (transfer ? transferShortfallReport(transfer) : null), [transfer]);
  const preflight = useMemo(() => (transfer ? dispatchPreflight(transfer) : null), [transfer]);

  /** Run an action, and turn its 409 into per-line paint rather than a bare string. */
  const perform = async (action: () => Promise<Transfer>, success: string): Promise<Transfer | null> => {
    setBusy(true);
    setError(null);
    setNotice(null);
    setBlockers(new Map());
    setOrphanBlockers([]);
    try {
      const updated = await action();
      setTransfer(updated);
      setNotice(success);
      return updated;
    } catch (err) {
      const parsed = parseApiError(err, 'lines');
      setBlockers(blockersByLineId(parsed));
      setOrphanBlockers(unattachedBlockers(parsed));
      const stale = isIllegalTransition(parsed);
      setError(
        [parsed.summary, parsed.hint, stale ? 'The transfer has been re-read from the server — someone else has moved it on.' : '']
          .filter(Boolean)
          .join(' ')
      );
      // An illegal transition means this page's copy of the status was wrong, so
      // every button on it was wrong too.
      if (stale) await load();
      return null;
    } finally {
      setBusy(false);
    }
  };

  // The id is passed in rather than read off `transfer`, which is still nullable at
  // this point in the component even though only a loaded transfer renders a button.
  const doDispatch = async (id: string) => {
    const updated = await perform(
      async () => normalizeTransfer(await dispatchTransfer(id)),
      'Dispatched. The stock has left the origin and is now in transit.'
    );
    if (updated) setDispatchOpen(false);
  };

  const doCancel = async (id: string) => {
    const updated = await perform(async () => normalizeTransfer(await cancelTransfer(id)), 'Cancelled. No stock moved.');
    if (updated) setCancelOpen(false);
  };

  if (isNewDraft) return null;

  if (loading && !transfer) {
    return (
      <MainCard title="Transfer">
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">Loading…</Typography>
        </Stack>
      </MainCard>
    );
  }

  if (!transfer) {
    return (
      <MainCard title="Transfer">
        <Stack spacing={2}>
          <Alert severity="error">{error ?? 'This transfer could not be loaded.'}</Alert>
          <Box>
            <Button onClick={() => navigate('/inventory/transfers')}>Back to transfers</Button>
          </Box>
        </Stack>
      </MainCard>
    );
  }

  const cancelReason = transferActionUnavailableReason(transfer.status, 'cancel');
  const dispatchReason = transferActionUnavailableReason(transfer.status, 'dispatch');
  const receiveReason = transferActionUnavailableReason(transfer.status, 'receive');
  const editReason = actions.includes('edit')
    ? null
    : (transferActionUnavailableReason(transfer.status, 'edit') ?? 'This transfer is locked for editing.');

  return (
    <Stack spacing={2}>
      <MainCard
        title={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h3">{transfer.reference}</Typography>
            <Chip
              size="small"
              color={transferStatusColor(transfer.status)}
              label={transferStatusLabel(transfer.status, transfer.status_label)}
            />
          </Stack>
        }
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {(loading || busy) && <CircularProgress size={18} />}
            <Tooltip title="Reload">
              <IconButton size="small" onClick={load}>
                <IconRefresh size={18} />
              </IconButton>
            </Tooltip>
            <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => navigate('/inventory/transfers')}>
              All transfers
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2.5}>
          {/* A closed-short transfer is the one thing on this page that nothing else
              will ever surface again, so it goes above everything, including errors. */}
          {report?.isLoss && (
            <Alert severity="error">
              <AlertTitle>{report.headline}</AlertTitle>
              {report.detail}
            </Alert>
          )}
          {report && !report.matchesServerTotal && (
            <Alert severity="warning">
              Our per-line outstanding total ({report.totalOutstanding}) disagrees with the server&apos;s ({transfer.qty_in_transit_total}).
              Reload before acting on either figure.
            </Alert>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {orphanBlockers.length > 0 && <Alert severity="error">{orphanBlockers.map((blocker) => blocker.message).join(' ')}</Alert>}
          {notice && (
            <Alert severity="success" onClose={() => setNotice(null)}>
              {notice}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Route
              </Typography>
              <Typography variant="body2">{describeTransferRoute(transfer)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Units
              </Typography>
              <Typography variant="body2">
                {formatQuantity(transfer.qty_total)} requested
                {transfer.qty_in_transit_total > 0 &&
                  ` · ${transfer.qty_in_transit_total} ${transfer.status === 'received' ? 'never arrived' : 'in transit'}`}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Dispatched
              </Typography>
              <Typography variant="body2">{formatWhen(transfer.dispatched_at)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {transfer.dispatched_by_email || ''}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Received
              </Typography>
              <Typography variant="body2">{formatWhen(transfer.received_at)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {transfer.received_by_email || ''}
              </Typography>
            </Grid>
            {transfer.notes && (
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body2">{transfer.notes}</Typography>
              </Grid>
            )}
          </Grid>

          <Divider />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Tooltip title={editReason ?? 'Change the items or quantities on this draft'}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy || Boolean(editReason)}
                  onClick={() => navigate(`/inventory/transfers?edit=${transfer.id}`)}
                >
                  Edit lines
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={dispatchReason ?? 'Check origin stock, then send the whole transfer'}>
              <span>
                <Button size="small" variant="contained" disabled={busy || Boolean(dispatchReason)} onClick={() => setDispatchOpen(true)}>
                  Dispatch
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={receiveReason ?? 'Record what actually arrived'}>
              <span>
                <Button size="small" variant="contained" disabled={busy || Boolean(receiveReason)} onClick={() => setReceiveOpen(true)}>
                  Receive
                </Button>
              </span>
            </Tooltip>
            <Box flexGrow={1} />
            {/* Cancel is legal from draft only, and the tooltip says WHY when it is
                not: a dispatched transfer has no reversal, so this is permanent. */}
            <Tooltip title={cancelReason ?? 'Cancel this draft. Nothing has moved, so nothing is undone.'}>
              <span>
                <Button size="small" color="error" disabled={busy || Boolean(cancelReason)} onClick={() => setCancelOpen(true)}>
                  Cancel transfer
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {cancelReason && transfer.status === 'in_transit' && <Alert severity="info">{cancelReason}</Alert>}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Requested</TableCell>
                  <TableCell align="right">Dispatched</TableCell>
                  <TableCell align="right">Received</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell align="right">At origin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfer.lines.map((line) => {
                  const blocker = blockers.get(line.id);
                  const available = originAvailability(line);
                  const outstanding = transfer.status === 'draft' ? null : line.qty_in_transit;
                  return (
                    <TableRow key={line.id} sx={blocker ? { bgcolor: 'error.lighter' } : undefined}>
                      <TableCell>
                        <Stack>
                          <Typography variant="body2">{transferLineLabel(line)}</Typography>
                          {blocker && (
                            <Typography variant="caption" color="error.main">
                              {blocker.message}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{formatQuantity(line.qty)}</TableCell>
                      <TableCell align="right">{formatQuantity(line.qty_dispatched)}</TableCell>
                      <TableCell align="right">{formatQuantity(line.qty_received)}</TableCell>
                      <TableCell align="right">
                        {outstanding === null || outstanding === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            {EM_DASH}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color={transfer.status === 'received' ? 'error.main' : 'info.main'}>
                            {outstanding}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {/* Origin stock is reported ONLY on a draft response. An em dash
                            here means "not reported", which is not the same as none —
                            reading it as 0 would claim the shelf is empty. */}
                        <Tooltip
                          title={
                            available === null
                              ? 'Stock at the origin is only reported while a transfer is a draft, so this was not in the response — it is unknown, not zero.'
                              : `${available} on the origin's shelf when this was loaded`
                          }
                        >
                          <span>{formatQuantity(available)}</span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {report && report.lines.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{report.isLoss ? 'Units that never arrived' : 'Units still on the move'}</Typography>
              {report.lines.map((line) => (
                <Typography key={line.lineId} variant="caption" color={report.isLoss ? 'error.main' : 'text.secondary'}>
                  {line.label}: {line.dispatched} dispatched, {line.received} received, {line.outstanding} outstanding
                </Typography>
              ))}
            </Stack>
          )}
        </Stack>
      </MainCard>

      {/* ------------------------------------------------------------------ */}
      {/* Dispatch: preflight first, because it is all-or-nothing            */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={dispatchOpen} onClose={() => setDispatchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dispatch {transfer.reference}?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {formatQuantity(transfer.qty_total)} unit(s) will leave {transfer.from_location_name} immediately and count as in transit
              until they are received at {transfer.to_location_name}.
            </Typography>

            {preflight?.willBeRefused && (
              <Alert severity="warning">
                <AlertTitle>The server will probably refuse this</AlertTitle>
                {preflight.message}
              </Alert>
            )}
            {preflight?.originStockUnknown && <Alert severity="info">{preflight.message}</Alert>}

            {preflight && preflight.shortItems.length > 0 && (
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Requested</TableCell>
                      <TableCell align="right">At origin</TableCell>
                      <TableCell align="right">Short</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* shortItems, not shortLines: two rows of one item are short
                        together, so summing the per-row figure double-counts. */}
                    {preflight.shortItems.map((item) => (
                      <TableRow key={item.inventoryItemId}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell align="right">{item.requested}</TableCell>
                        <TableCell align="right">{formatQuantity(item.availableAtOrigin)}</TableCell>
                        <TableCell align="right">{item.short}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Typography variant="caption" color="text.secondary">
              Origin stock was read when this page loaded. A delivery since then would make a short line fine, so dispatching anyway is
              allowed — the server checks again and refuses the whole transfer if any line is still short.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDispatchOpen(false)} disabled={busy}>
            Not yet
          </Button>
          <Button
            variant="contained"
            color={preflight?.willBeRefused ? 'warning' : 'primary'}
            onClick={() => doDispatch(transfer.id)}
            disabled={busy}
          >
            {preflight?.willBeRefused ? 'Dispatch anyway' : 'Dispatch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Cancel: draft only                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel {transfer.reference}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Nothing has been dispatched, so no stock moves and nothing needs undoing. The transfer stays on record as cancelled.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={busy}>
            Keep it
          </Button>
          <Button color="error" variant="contained" onClick={() => doCancel(transfer.id)} disabled={busy}>
            Cancel transfer
          </Button>
        </DialogActions>
      </Dialog>

      <ReceiveDialog
        open={receiveOpen}
        transfer={transfer}
        onClose={() => setReceiveOpen(false)}
        onReceived={(updated, message) => {
          setTransfer(updated);
          setNotice(message);
          setReceiveOpen(false);
        }}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Receiving
// ---------------------------------------------------------------------------
interface ReceiveDialogProps {
  open: boolean;
  transfer: Transfer;
  onClose: () => void;
  onReceived: (transfer: Transfer, message: string) => void;
}

/**
 * Record what arrived.
 *
 * Two traps shape this dialog, both handled by the module:
 *   * A REPEATED line id on the wire keeps only the LAST entry — it does not sum
 *     and it does not error. So scans are held as a buffer and folded by
 *     aggregateReceiveScans inside planReceive, never appended to the request.
 *   * "Receive everything" is the ABSENCE of `lines`, while `lines: []` means the
 *     same thing here and the OPPOSITE on PATCH. buildReceivePayload is the only
 *     thing allowed to decide that, which is why nothing below builds a body.
 */
function ReceiveDialog({ open, transfer, onClose, onReceived }: ReceiveDialogProps) {
  const [mode, setMode] = useState<ReceiveMode>('all');
  const [scans, setScans] = useState<ReceiveScan[]>([]);
  const [scanText, setScanText] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode('all');
    setScans([]);
    setScanText('');
    setScanError(null);
    setAcknowledged(false);
    setError(null);
  }, [open]);

  const draft: ReceiveDraft = { mode, scans };
  const plan = planReceive(draft, transfer);

  /**
   * Field text for one line.
   *
   * A single scan shows its RAW text, so a half-typed '' or a rejected '4x' stays
   * on screen instead of being coerced to 0 — the coercion that silently shortens a
   * delivery. Several scans have already been folded by the module, so the fold is
   * what is shown, and typing over it replaces them.
   */
  const fieldText = (lineId: string): string => {
    const own = scans.filter((scan) => scan.lineId === lineId);
    if (own.length === 0) return '';
    if (own.length === 1) return own[0].qty;
    return `${plan.rows.find((row) => row.lineId === lineId)?.receiving ?? ''}`;
  };

  const setLineText = (lineId: string, text: string) =>
    setScans((current) => {
      const others = current.filter((scan) => scan.lineId !== lineId);
      // An emptied field means "nothing counted for this line", which the module
      // already expresses as an explicit zero. Keeping a blank scan instead would
      // quarantine it as an unreadable quantity and block the whole receive.
      return text.trim() === '' ? others : [...others, { lineId, qty: text }];
    });

  const addScan = (lineId: string, qty = '1') => setScans((current) => [...current, { lineId, qty }]);

  const scanSku = () => {
    const wanted = scanText.trim().toLowerCase();
    if (!wanted) return;
    // Matched client-side against the lines actually in transit: the server keys an
    // unmatched line_id under a blocker, but by then the request has been formed.
    const match = transfer.lines.find((line) => line.qty_in_transit > 0 && line.sku.trim().toLowerCase() === wanted);
    if (!match) {
      setScanError(`Nothing in transit on this transfer has the SKU "${scanText.trim()}".`);
      return;
    }
    addScan(match.id, '1');
    setScanText('');
    setScanError(null);
  };

  const submit = async () => {
    let payload: ReceivePayload;
    try {
      // Throws on an invalid plan rather than sending it — every way a plan can be
      // invalid becomes a WRONG QUANTITY here, not a rejected request.
      payload = buildReceivePayload(draft, transfer);
    } catch (err) {
      const reasons = [...plan.errors, ...plan.rows.map((row) => row.error).filter((entry): entry is string => entry !== null)];
      setError(reasons.length > 0 ? reasons.join(' ') : err instanceof Error ? err.message : 'This receive could not be built.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updated = normalizeTransfer(await receiveTransfer(transfer.id, payload));
      const after = transferShortfallReport(updated);
      onReceived(
        updated,
        after.isLoss
          ? `Received ${transfer.reference}. ${after.totalOutstanding} unit(s) never arrived and are now recorded as lost.`
          : `Received ${transfer.reference} in full.`
      );
    } catch (err) {
      setError(summarise(err));
    } finally {
      setSubmitting(false);
    }
  };

  const blocked = !plan.valid || (plan.hasShortfall && !acknowledged);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Receive {transfer.reference}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={(_event, next) => {
              if (!next) return;
              setMode(next as ReceiveMode);
              setAcknowledged(false);
            }}
          >
            <ToggleButton value="all">Everything arrived</ToggleButton>
            <ToggleButton value="partial">Count what arrived</ToggleButton>
          </ToggleButtonGroup>

          <Alert severity="info">
            Receiving closes this transfer whatever arrives. Anything missing is NOT re-orderable and NOT recorded as shrinkage — it just
            stops existing in stock, so count before you confirm.
          </Alert>

          {mode === 'partial' && (
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                size="small"
                label="Scan or type a SKU"
                value={scanText}
                onChange={(event) => setScanText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    scanSku();
                  }
                }}
                error={Boolean(scanError)}
                helperText={scanError ?? 'Each scan adds one unit. Repeats are added up, not overwritten.'}
                sx={{ minWidth: 280 }}
              />
              <Button size="small" onClick={scanSku} sx={{ mt: 0.5 }}>
                Add scan
              </Button>
              {scans.length > 0 && (
                <Button size="small" color="error" onClick={() => setScans([])} sx={{ mt: 0.5 }}>
                  Clear {scans.length} entr{scans.length === 1 ? 'y' : 'ies'}
                </Button>
              )}
            </Stack>
          )}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">In transit</TableCell>
                  <TableCell align="right">Arriving</TableCell>
                  <TableCell align="right">Short</TableCell>
                  {mode === 'partial' && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {plan.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={mode === 'partial' ? 5 : 4}>
                      <Typography variant="body2" color="text.secondary">
                        Nothing is in transit on this transfer.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {plan.rows.map((row) => (
                  <TableRow key={row.lineId} sx={row.error ? { bgcolor: 'error.lighter' } : undefined}>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2">{row.label}</Typography>
                        {row.scanCount > 1 && (
                          <Typography variant="caption" color="text.secondary">
                            {row.scanCount} scans added up
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{row.inTransit}</TableCell>
                    <TableCell align="right">
                      {mode === 'all' ? (
                        row.receiving
                      ) : (
                        <TextField
                          size="small"
                          value={fieldText(row.lineId)}
                          onChange={(event) => setLineText(row.lineId, event.target.value)}
                          error={Boolean(row.error)}
                          helperText={row.error}
                          inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                          sx={{ width: 110 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {row.shortfall > 0 ? (
                        <Typography variant="body2" color="error.main">
                          {row.shortfall}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {EM_DASH}
                        </Typography>
                      )}
                    </TableCell>
                    {mode === 'partial' && (
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button size="small" onClick={() => addScan(row.lineId)}>
                            +1
                          </Button>
                          <Button size="small" onClick={() => setLineText(row.lineId, `${row.inTransit}`)}>
                            All
                          </Button>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="body2">
            Receiving {plan.totalReceiving} of {plan.totalInTransit} unit(s) in transit
            {plan.totalShortfall > 0 ? ` — ${plan.totalShortfall} short` : ''}.
          </Typography>

          {plan.errors.length > 0 && (
            <Alert severity="error">
              {plan.errors.join(' ')} Nothing has been sent: a quantity that cannot be read would go on the wire as zero and be written off.
            </Alert>
          )}

          {plan.shortfallWarning && (
            <Alert severity="warning">
              <AlertTitle>This records a loss of {plan.totalShortfall} unit(s)</AlertTitle>
              {plan.shortfallWarning}
              <FormControlLabel
                sx={{ mt: 1 }}
                control={<Checkbox checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />}
                label={`I have counted the delivery — record ${plan.totalShortfall} unit(s) as lost`}
              />
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" color={plan.hasShortfall ? 'warning' : 'primary'} onClick={submit} disabled={submitting || blocked}>
          {submitting ? 'Receiving…' : plan.hasShortfall ? `Receive short — lose ${plan.totalShortfall}` : 'Receive'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
