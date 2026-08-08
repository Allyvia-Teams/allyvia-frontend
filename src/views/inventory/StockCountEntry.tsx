// views/inventory/StockCountEntry.tsx
//
// THE SCANNER SCREEN. Someone is standing at a rail holding a USB keyboard-wedge
// scanner and nothing else, and everything here follows from that.
//
// FOUR RULES SHAPE THIS SCREEN, and three of them are forced by the API rather than
// chosen:
//
// 1. EVERY SCAN IS RESOLVED LOCALLY BEFORE ANYTHING IS SENT. POST /entries/ is
//    all-or-nothing: `enter_counts` is @transaction.atomic and raises after writing,
//    so one unrecognised barcode rolls back the whole batch and records NOTHING. A
//    screen that posted each scan optimistically would lose forty good reads to one
//    scan of a carrier bag. Unknown lookups are quarantined locally, shown, and never
//    submitted.
//
// 2. THE COUNT LINES CARRY NO BARCODE, so the catalogue is fetched alongside the
//    count and its variants' barcodes are joined onto the lines by
//    inventory_item_id. Without that join `buildScanIndex` has an empty barcode map
//    and EVERY barcode scan quarantines — even though the server, which reads
//    `inventory_item.barcode` itself, would have matched it. The join is what makes
//    the client's lookup the same lookup the server does.
//
// 3. A REPEATED SCAN IS A TALLY, AND THE TALLY SUBMITS ONE ABSOLUTE FIGURE. The
//    server overwrites rather than accumulates: a recount means "it is 7", not
//    "seven more". So the tally starts at 0 even when the server already holds a
//    counted quantity, and the old figure is shown beside it as "Previously" instead
//    of being used as a starting point.
//
// 4. ZERO IS A REAL ANSWER. An empty shelf is the single most valuable thing a
//    stocktake can discover, so it must be typeable, and adding a line from the
//    picker starts it at 0 rather than at the expected figure.
//
// The always-focused input is the technique
// ui-component/inventory/modals/BarcodeScannerModal.tsx uses (inputRef + autoFocus +
// refocus on blur + Enter to submit), with one change that modal did not need: this
// screen has other fields on it, so a blur that lands in another input DISARMS the
// lock instead of stealing focus back. Without that, the quantity and note boxes
// would be impossible to type into.

// FocusEvent comes from react, not the DOM global of the same name: the handler is
// given React's synthetic event and its relatedTarget is what the refocus rule reads.
import { FocusEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
  Autocomplete,
  Button,
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
  InputAdornment,
  Stack,
  Switch,
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
import { IconBarcode, IconRefresh, IconTrash } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { useSelector } from 'store';

import { listProducts } from 'api/inventoryStock.api';
import { cancelStockCount, getStockCount, reviewStockCount, submitStockCountEntries } from 'api/inventoryTransfers.api';

import {
  ParsedApiError,
  RowError,
  blockersByLineId,
  isIllegalTransition,
  parseApiError,
  rowErrorsByIndex,
  unattachedBlockers
} from './apiErrors';
import {
  CountLine,
  CountSummary,
  EXPECTED_SNAPSHOT_NOTE,
  LINES_NOT_RETURNED_NOTE,
  NON_ADMIN_NOTICE,
  NOTE_OVERWRITE_ONLY_NOTE,
  NormalizedCount,
  ScanBuffer,
  applyScan,
  buildScanIndex,
  canSubmitEntries,
  clearScan,
  countActionStates,
  countStatusColor,
  describeCountScope,
  dismissQuarantine,
  emptyScanBuffer,
  normalizeCountResponse,
  resolveScan,
  setScanCount,
  setScanNote,
  toEntriesPayload,
  validateCountedQtyInput,
  varianceLabel
} from './stockCounts';
import { formatDelta, formatQuantity } from './stockFormat';

export default function StockCountEntry() {
  const { stockCountId = '' } = useParams<{ stockCountId: string }>();
  const navigate = useNavigate();

  const roleType = useSelector((state) => state.auth.currentRole?.role_type);
  // `Role.is_admin` is `role_type == "admin"` exactly — there is no manager tier in
  // role.RoleType. Lower-cased because lib/session.ts stores 'Member' capitalised.
  const isAdmin = String(roleType ?? '').toLowerCase() === 'admin';

  const [count, setCount] = useState<NormalizedCount | null>(null);
  const [lines, setLines] = useState<CountLine[]>([]);
  const [summary, setSummary] = useState<CountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [catalogueFailed, setCatalogueFailed] = useState(false);

  const [buffer, setBuffer] = useState<ScanBuffer>(emptyScanBuffer());
  /** Raw text per row, so a half-typed box does not fight the tally. */
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [scanValue, setScanValue] = useState('');
  const [step, setStep] = useState('1');
  const [focusLock, setFocusLock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [entryError, setEntryError] = useState<ParsedApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const scanRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The catalogue is only for the barcode join (rule 2 in the header), so a
      // failure there must not take the count down with it — the counter can still
      // work by SKU, and the banner says so.
      const [detail, catalogue] = await Promise.all([getStockCount(stockCountId), listProducts().catch(() => null)]);
      const barcodeByItem = new Map<number, string>();
      (catalogue ?? []).forEach((product) =>
        product.variants.forEach((variant) => {
          if (variant.barcode) barcodeByItem.set(variant.inventory_item_id, variant.barcode);
        })
      );
      setCatalogueFailed(catalogue === null);

      const normalized = normalizeCountResponse(detail);
      setCount(normalized.count);
      setSummary(normalized.summary);
      // Honour linesKnown rather than reading `lines` blindly: an envelope that did
      // not carry lines means the grid in hand is still the truth.
      if (normalized.linesKnown) {
        setLines(normalized.lines.map((line) => ({ ...line, barcode: barcodeByItem.get(line.inventory_item_id) ?? line.barcode ?? null })));
      }
      setLoadError(null);
    } catch (err) {
      setLoadError(parseApiError(err, 'entries').summary);
    } finally {
      setLoading(false);
    }
  }, [stockCountId]);

  useEffect(() => {
    load();
  }, [load]);

  const index = useMemo(() => buildScanIndex(lines), [lines]);
  const actions = countActionStates(count, { isAdmin });
  const canEnter = actions.enter.allowed;

  // `step` is for a case of twelve — one scan, twelve units. applyScan refuses a step
  // that is not a positive whole number (it would tally to a figure the serializer
  // 400s, taking the whole batch with it), so the field is validated with the
  // module's own parser and the ≥1 floor added on top.
  const stepCheck = validateCountedQtyInput(step);
  const stepError = !stepCheck.valid
    ? stepCheck.error
    : (stepCheck.value ?? 0) < 1
      ? 'At least 1 — a scan worth zero units would record nothing'
      : null;
  const stepValue = stepCheck.value ?? 1;

  const focusScanner = useCallback(() => {
    setFocusLock(true);
    scanRef.current?.focus();
  }, []);

  /**
   * Keep the scanner armed without making the rest of the screen unusable.
   *
   * Focus that moves into another INPUT or TEXTAREA is the counter deliberately going
   * to type a quantity or a note; stealing it back would make those boxes impossible
   * to use. Focus that goes to a button, or nowhere at all (a stray click on the
   * page), is not — so the field takes it back and a wedge scanner's next read still
   * lands where it belongs.
   */
  const handleScanBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (!focusLock || !canEnter) return;
    const next = event.relatedTarget as HTMLElement | null;
    const typing = Boolean(next) && (next?.tagName === 'INPUT' || next?.tagName === 'TEXTAREA' || next?.isContentEditable === true);
    if (typing) {
      setFocusLock(false);
      return;
    }
    scanRef.current?.focus();
  };

  const handleScan = (raw: string) => {
    const lookup = raw.trim();
    if (!lookup || stepError) return;
    // Resolved twice on purpose: applyScan does the authoritative work inside the
    // state updater, and this resolution answers a different question — which row's
    // half-typed box is now stale and must fall back to the tally.
    const resolution = resolveScan(index, lookup);
    setBuffer((current) => applyScan(current, index, lookup, stepValue));
    if (resolution.line) {
      const lineId = resolution.line.line_id;
      setEdits((current) => {
        if (!(lineId in current)) return current;
        const next = { ...current };
        delete next[lineId];
        return next;
      });
    }
    setScanValue('');
  };

  const setRowQty = (lineId: string, raw: string) => {
    setEdits((current) => ({ ...current, [lineId]: raw }));
    const check = validateCountedQtyInput(raw);
    // Zero passes — an empty shelf is a real answer. An unparseable box leaves the
    // tally alone and shows an error instead of guessing at a figure.
    if (check.valid && check.value !== null) {
      const value = check.value;
      setBuffer((current) => setScanCount(current, index, lineId, value));
    }
  };

  const addLine = (line: CountLine) => {
    // Starts at 0, not at the expected figure: someone who went looking for a line
    // and opened it manually most often found nothing there, and pre-filling the
    // expectation would fabricate a match.
    setBuffer((current) => setScanCount(current, index, line.line_id, 0));
    setEdits((current) => ({ ...current, [line.line_id]: '0' }));
  };

  // Counted over the tallies rather than over `edits`, because a row removed from the
  // batch can leave a stale key behind and a stale invalid key would block the submit
  // button with nothing on screen to explain it.
  const invalidEdits = useMemo(
    () => buffer.tallies.filter((tally) => tally.lineId in edits && !validateCountedQtyInput(edits[tally.lineId]).valid).length,
    [buffer.tallies, edits]
  );

  const submitBatch = async () => {
    if (!canSubmitEntries(buffer) || invalidEdits > 0) return;
    setSubmitting(true);
    setEntryError(null);
    setNotice(null);
    try {
      const body = await submitStockCountEntries(stockCountId, toEntriesPayload(buffer));
      const recorded = normalizeCountResponse(body).recorded;
      // Quarantined lookups survive the submit: they were never sent, and they are
      // still the counter's problem to resolve.
      setBuffer((current) => ({ ...emptyScanBuffer(), quarantined: current.quarantined }));
      setEdits({});
      setNotice(`${recorded ?? 0} entr(y/ies) recorded. ${LINES_NOT_RETURNED_NOTE}`);
      // The entries envelope is {recorded, summary} with NO lines, so the grid on
      // screen is now stale — refetch rather than believe the absence.
      await load();
      focusScanner();
    } catch (err) {
      const parsed = parseApiError(err, 'entries');
      setEntryError(parsed);
      // Deliberately NOT mayHavePartiallySaved(): that describes PATCH /transfers/,
      // which commits header fields before failing on lines. `enter_counts` is
      // atomic, so nothing was written here and the buffer is still exactly what
      // needs re-sending once the offending line is dealt with.
      if (isIllegalTransition(parsed)) await load();
    } finally {
      setSubmitting(false);
    }
  };

  const moveToReview = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await reviewStockCount(stockCountId);
      navigate(`/inventory/stock-counts/${stockCountId}/review`);
    } catch (err) {
      setLoadError(parseApiError(err, 'entries').summary);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelCount = async () => {
    setBusy(true);
    setCancelOpen(false);
    try {
      await cancelStockCount(stockCountId);
      setNotice('Count cancelled. The quantities already entered are kept on the record; nothing was applied to stock.');
      await load();
    } catch (err) {
      setLoadError(parseApiError(err, 'entries').summary);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const blockers = useMemo<Map<string, RowError>>(() => (entryError ? blockersByLineId(entryError) : new Map()), [entryError]);
  const strays = useMemo(() => (entryError ? unattachedBlockers(entryError) : []), [entryError]);
  // Index-aligned DRF field errors ARE safe to match by position here, because
  // toEntriesPayload emits one entry per tally in tally order. A 409 blocker is not:
  // the server appends one only for entries that failed, so its position is its own
  // and the map above matches it by line id instead.
  const fieldErrors = useMemo<Map<number, RowError[]>>(() => (entryError ? rowErrorsByIndex(entryError) : new Map()), [entryError]);

  const pickable = useMemo(() => {
    const inBatch = new Set(buffer.tallies.map((tally) => tally.lineId));
    return lines
      .filter((line) => line.line_id && !inBatch.has(line.line_id))
      .sort((a, b) => {
        // Uncounted first: those are the shelves nobody has looked at yet.
        const left = a.counted_qty === null ? 0 : 1;
        const right = b.counted_qty === null ? 0 : 1;
        if (left !== right) return left - right;
        return varianceLabel(a).localeCompare(varianceLabel(b));
      });
  }, [lines, buffer.tallies]);

  const lastEvent = buffer.lastEvent;

  return (
    <Stack spacing={2}>
      <MainCard
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4">{count ? `Count ${count.reference}` : 'Count'}</Typography>
            {count && <Chip size="small" color={countStatusColor(count.status)} label={count.status_label} />}
          </Stack>
        }
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {(loading || busy) && <CircularProgress size={18} />}
            <Tooltip title="Reload the count">
              <IconButton size="small" onClick={load}>
                <IconRefresh size={18} />
              </IconButton>
            </Tooltip>
            <Button size="small" onClick={() => navigate(`/inventory/stock-counts/${stockCountId}/review`)}>
              Variance report
            </Button>
            <Tooltip
              title={
                buffer.tallies.length > 0
                  ? 'Submit or discard the pending lines first — moving to review does not save them.'
                  : (actions.review.reason ?? 'Close counting and read the variance report before applying.')
              }
            >
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!actions.review.allowed || busy || buffer.tallies.length > 0}
                  onClick={moveToReview}
                >
                  Move to review
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={actions.cancel.reason ?? 'Abandon this count. Quantities already entered are kept, nothing is applied.'}>
              <span>
                <Button size="small" color="error" disabled={!actions.cancel.allowed || busy} onClick={() => setCancelOpen(true)}>
                  Cancel count
                </Button>
              </span>
            </Tooltip>
          </Stack>
        }
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Typography variant="body2">
              <strong>Location:</strong> {count?.location_name || '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Scope:</strong> {count ? describeCountScope(count) : '—'}
            </Typography>
            <Typography variant="body2">
              <strong>Progress:</strong>{' '}
              {summary ? `${summary.counted_lines} of ${summary.total_lines} lines counted, ${summary.uncounted_lines} still open` : '—'}
            </Typography>
            {count?.notes && (
              <Typography variant="body2" color="text.secondary">
                {count.notes}
              </Typography>
            )}
          </Stack>

          {!isAdmin && <Alert severity="info">{NON_ADMIN_NOTICE}</Alert>}
          {loadError && (
            <Alert severity="error" onClose={() => setLoadError(null)}>
              {loadError}
            </Alert>
          )}
          {notice && (
            <Alert severity="success" onClose={() => setNotice(null)}>
              {notice}
            </Alert>
          )}
          {isAdmin && !canEnter && count && <Alert severity="warning">{actions.enter.reason}</Alert>}
          {canEnter && catalogueFailed && (
            <Alert severity="warning">
              The item catalogue did not load, so no barcodes could be matched to this count. Type or scan SKUs instead, or reload the page.
            </Alert>
          )}
          {canEnter && !catalogueFailed && !index.hasBarcodes && lines.length > 0 && (
            <Alert severity="warning">
              None of the items in this count have a barcode on record, so a barcode scan cannot be matched here. Scan or type SKUs, and add
              barcodes to the styles if the shop scans by barcode.
            </Alert>
          )}
        </Stack>
      </MainCard>

      {canEnter && (
        <MainCard title="Scan">
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
              <TextField
                inputRef={scanRef}
                autoFocus
                label="Scan or type a barcode / SKU"
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                onKeyDown={(event) => {
                  // A keyboard-wedge scanner types the code then sends its terminator,
                  // which is the only submit signal there is — the field must never
                  // need a button press. Tab counts as well as Enter, because plenty of
                  // scanners ship configured to send it, and preventDefault stops that
                  // Tab from also walking focus off the field mid-count.
                  if (event.key !== 'Enter' && event.key !== 'Tab') return;
                  event.preventDefault();
                  handleScan(scanValue);
                }}
                onFocus={() => setFocusLock(true)}
                onBlur={handleScanBlur}
                sx={{ minWidth: 320 }}
                helperText="Scan the same item again to add to its tally. Nothing is sent until you submit the batch."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconBarcode size={20} />
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                label="Units per scan"
                value={step}
                onChange={(event) => setStep(event.target.value)}
                error={Boolean(stepError)}
                helperText={stepError ?? 'For a sealed case: one scan, this many units.'}
                sx={{ width: 190 }}
                inputProps={{ inputMode: 'numeric' }}
              />
              <Stack spacing={0.5}>
                <FormControlLabel
                  control={<Switch size="small" checked={focusLock} onChange={(event) => setFocusLock(event.target.checked)} />}
                  label="Keep the scanner focused"
                />
                <Button size="small" onClick={focusScanner}>
                  Resume scanning
                </Button>
              </Stack>
            </Stack>

            {lastEvent && lastEvent.accepted && (
              <Alert severity="success" icon={false}>
                <strong>{lastEvent.lookup}</strong> → counted {formatQuantity(lastEvent.countedQty)}
                {lastEvent.matchedBy ? ` (matched by ${lastEvent.matchedBy})` : ''}
              </Alert>
            )}
            {lastEvent && !lastEvent.accepted && (
              <Alert severity="warning">
                <strong>{lastEvent.lookup}</strong> was not matched and has NOT been added to the batch — see “Unmatched scans” below.
              </Alert>
            )}

            <Autocomplete
              options={pickable}
              getOptionLabel={(line) => `${varianceLabel(line)}${line.sku ? ` · ${line.sku}` : ''}`}
              value={null}
              blurOnSelect
              onChange={(_event, line) => line && addLine(line)}
              isOptionEqualToValue={(option, value) => option.line_id === value.line_id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add a line by name (starts at 0)"
                  helperText="For a shelf you found empty, or an item with no barcode. Uncounted lines are listed first."
                />
              )}
              sx={{ maxWidth: 520 }}
            />
          </Stack>
        </MainCard>
      )}

      {canEnter && (
        <MainCard
          title={`This batch (${buffer.tallies.length} line${buffer.tallies.length === 1 ? '' : 's'})`}
          secondary={
            <Stack direction="row" spacing={1} alignItems="center">
              {submitting && <CircularProgress size={18} />}
              <Button
                size="small"
                onClick={() => {
                  setBuffer((current) => ({ ...emptyScanBuffer(), quarantined: current.quarantined }));
                  setEdits({});
                  setEntryError(null);
                  focusScanner();
                }}
                disabled={submitting || buffer.tallies.length === 0}
              >
                Discard batch
              </Button>
              <Tooltip
                title={
                  invalidEdits > 0
                    ? 'Fix the highlighted quantities first — the whole batch is rejected together.'
                    : 'Sends one absolute counted quantity per line.'
                }
              >
                <span>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={submitBatch}
                    disabled={submitting || !canSubmitEntries(buffer) || invalidEdits > 0}
                  >
                    {submitting ? 'Recording…' : 'Submit batch'}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          }
        >
          <Stack spacing={2}>
            {entryError && (
              <Alert severity="error" onClose={() => setEntryError(null)}>
                <AlertTitle>Nothing was recorded</AlertTitle>
                {entryError.summary}
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  This call is all-or-nothing, so the whole batch was rolled back and is still listed below. Fix the flagged lines and
                  submit again.
                </Typography>
              </Alert>
            )}

            {strays.length > 0 && (
              <Alert severity="error">
                {strays.map((row) => (
                  <Typography key={`${row.index}-${row.lookup ?? ''}`} variant="body2">
                    {row.lookup ? `“${row.lookup}”: ` : ''}
                    {row.message}
                  </Typography>
                ))}
              </Alert>
            )}

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell align="right">
                      <Tooltip title={EXPECTED_SNAPSHOT_NOTE}>
                        <span>Expected</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">Previously</TableCell>
                    <TableCell align="right" width={140}>
                      Counted
                    </TableCell>
                    <TableCell align="right">Scans</TableCell>
                    <TableCell align="right">vs expected</TableCell>
                    <TableCell>Note</TableCell>
                    <TableCell align="right" width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buffer.tallies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Typography variant="body2" color="text.secondary">
                          Nothing in this batch yet. Scan an item, or add a line by name to record an empty shelf as zero.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {buffer.tallies.map((tally, position) => {
                    const raw = edits[tally.lineId] ?? String(tally.countedQty);
                    const check = validateCountedQtyInput(raw);
                    const blocker = blockers.get(tally.lineId);
                    const fieldError = fieldErrors.get(position)?.[0];
                    const rowError = blocker?.message ?? (fieldError && !fieldError.isBlocker ? fieldError.message : null);
                    return (
                      <TableRow key={tally.lineId} hover>
                        <TableCell>
                          <Typography variant="body2">{varianceLabel(tally)}</Typography>
                          {rowError && (
                            <Typography variant="caption" color="error">
                              {rowError}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{tally.sku || '—'}</TableCell>
                        <TableCell align="right">{formatQuantity(tally.expectedQty)}</TableCell>
                        <TableCell align="right">
                          {/* An em dash means nobody counted this line before, which is
                              not the same as a previous count of zero. */}
                          {formatQuantity(tally.previousCounted)}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            value={raw}
                            onChange={(event) => setRowQty(tally.lineId, event.target.value)}
                            error={!check.valid || Boolean(blocker)}
                            helperText={check.valid ? null : check.error}
                            inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                            sx={{ width: 110 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {tally.scans}
                          {tally.typed && (
                            <Tooltip title="Typed, not scanned up.">
                              <Chip size="small" variant="outlined" label="typed" sx={{ ml: 0.5 }} />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {/* A PREVIEW against the snapshot. The authoritative variance
                              comes back from the server after the batch is recorded. */}
                          {formatDelta(tally.countedQty - tally.expectedQty)}
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Optional"
                            value={tally.note}
                            onChange={(event) => setBuffer((current) => setScanNote(current, index, tally.lineId, event.target.value))}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove from this batch. A quantity already recorded on the server stays as it is.">
                            <IconButton size="small" onClick={() => setBuffer((current) => clearScan(current, tally.lineId))}>
                              <IconTrash size={16} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="caption" color="text.secondary">
              {NOTE_OVERWRITE_ONLY_NOTE}
            </Typography>
          </Stack>
        </MainCard>
      )}

      {buffer.quarantined.length > 0 && (
        <MainCard title={`Unmatched scans (${buffer.quarantined.length})`}>
          <Stack spacing={2}>
            <Alert severity="info">
              These were never sent. One unmatched lookup rejects the entire batch server-side and records nothing, so they are held back
              here instead of taking the good reads down with them.
            </Alert>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Scanned</TableCell>
                    <TableCell align="right">Times</TableCell>
                    <TableCell>What to do</TableCell>
                    <TableCell align="right" width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buffer.quarantined.map((row) => (
                    <TableRow key={row.lookup} hover>
                      <TableCell>
                        <Typography variant="body2">{row.lookup}</Typography>
                      </TableCell>
                      <TableCell align="right">{row.scans}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{row.detail}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Dismiss">
                          <IconButton size="small" onClick={() => setBuffer((current) => dismissQuarantine(current, row.lookup))}>
                            <IconTrash size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </MainCard>
      )}

      <MainCard title="Lines on this count">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2">
              {summary
                ? `${summary.total_lines} lines, ${summary.counted_lines} counted, ${summary.uncounted_lines} not yet counted.`
                : 'No summary was returned with this count.'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Uncounted lines are not treated as matching. They stay out of the variance figures entirely, and applying the count leaves
              their stock alone.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Divider sx={{ display: { xs: 'block', md: 'none' }, mb: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {EXPECTED_SNAPSHOT_NOTE}
            </Typography>
          </Grid>
        </Grid>
      </MainCard>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel this count?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Nothing is applied to stock, and the quantities already entered stay on the record for audit. A cancelled count cannot be
            reopened — a new count takes a fresh snapshot.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Keep counting</Button>
          <Button color="error" variant="contained" onClick={cancelCount} disabled={busy}>
            Cancel count
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
