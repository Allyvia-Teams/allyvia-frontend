// views/inventory/StockCountReview.tsx
//
// The variance report, and the one button that writes stock.
//
// THREE THINGS THIS SCREEN MUST NOT LET A READER BELIEVE.
//
// 1. THAT THE MONEY FIGURE IS COMPLETE. When an item's cost_price is 0 the backend
//    stores no unit cost, so `cost_impact` is null while `variance` is a real number
//    — and `net_cost_impact` SKIPS those lines. The money column genuinely does not
//    sum to the total and no client-side arithmetic will make it. So
//    detectMissingCostLines' count sits directly beside the total, and every affected
//    row is marked, because a shrinkage figure that quietly excludes the cheap lines
//    is the kind of number that ends up in a board pack.
//
// 2. THAT AN UNCOUNTED LINE MATCHED. Null counted_qty is "nobody looked at this
//    shelf", not "this shelf was right". Uncounted lines render as em dashes, sort
//    into their own bucket, and are named in the apply confirmation because applying
//    leaves their stock untouched.
//
// 3. THAT APPLY IS A FORMALITY. Apply is legal from `review` only — from `open` it is
//    a 409 — and it writes count_adjust movements that cannot be undone. Every button
//    is gated through countActionStates so the UI cannot offer an action the API will
//    refuse, and the apply 409s are explained by explainApplyFailure rather than
//    shown raw: the insufficient-stock message says "requested 14" and nobody typed
//    14, it is the size of the variance this count would post.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { useSelector } from 'store';

import { applyStockCount, cancelStockCount, getStockCount, reviewStockCount } from 'api/inventoryTransfers.api';

import { parseApiError } from './apiErrors';
import {
  ApplyFailureExplanation,
  CountAdjustment,
  CountLine,
  EXPECTED_SNAPSHOT_NOTE,
  NON_ADMIN_NOTICE,
  NormalizedCount,
  VarianceRow,
  VarianceSort,
  VarianceTone,
  countActionStates,
  countStatusColor,
  describeCountScope,
  explainApplyFailure,
  normalizeCountResponse,
  sortVarianceRows,
  varianceTotals,
  buildVarianceRows
} from './stockCounts';
import { formatDelta, formatQuantity } from './stockFormat';

const SORT_LABELS: Record<VarianceSort, string> = {
  worst_shrinkage: 'Worst shrinkage first',
  worst_cost: 'Worst cost impact first',
  name: 'By name'
};

// Presentation only. 'unknown' is deliberately muted rather than neutral: a line
// nobody counted must not look like a line that came out level.
const TONE_COLOR: Record<VarianceTone, string> = {
  increase: 'success.main',
  decrease: 'error.main',
  neutral: 'text.primary',
  unknown: 'text.disabled'
};

export default function StockCountReview() {
  const { stockCountId = '' } = useParams<{ stockCountId: string }>();
  const navigate = useNavigate();

  const roleType = useSelector((state) => state.auth.currentRole?.role_type);
  // `Role.is_admin` is `role_type == "admin"` exactly; reads are open to any role.
  const isAdmin = String(roleType ?? '').toLowerCase() === 'admin';

  const [count, setCount] = useState<NormalizedCount | null>(null);
  const [lines, setLines] = useState<CountLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sort, setSort] = useState<VarianceSort>('worst_shrinkage');
  const [busy, setBusy] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [applyFailure, setApplyFailure] = useState<ApplyFailureExplanation | null>(null);
  const [adjustments, setAdjustments] = useState<CountAdjustment[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const normalized = normalizeCountResponse(await getStockCount(stockCountId));
      setCount(normalized.count);
      // The detail envelope is the ONLY one that carries lines; honour the flag
      // rather than replacing a good grid with an empty array.
      if (normalized.linesKnown) setLines(normalized.lines);
      setError(null);
    } catch (err) {
      setError(parseApiError(err, 'entries').summary);
    } finally {
      setLoading(false);
    }
  }, [stockCountId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows: VarianceRow[] = useMemo(() => sortVarianceRows(buildVarianceRows(lines), sort), [lines, sort]);
  const totals = useMemo(() => varianceTotals(lines), [lines]);
  const actions = countActionStates(count, { isAdmin });

  const apply = async () => {
    setConfirmApply(false);
    setBusy(true);
    setApplyFailure(null);
    setNotice(null);
    try {
      const normalized = normalizeCountResponse(await applyStockCount(stockCountId));
      setCount(normalized.count ?? count);
      // `adjustments: []` is a legitimate no-op — every line matched, or the count had
      // no lines — and must read as one rather than as a failure.
      setAdjustments(normalized.adjustments ?? []);
      setNotice(`Applied. ${normalized.adjustments?.length ?? 0} stock adjustment(s) were posted to the ledger as count_adjust movements.`);
      // The apply envelope carries no lines, so refetch for the settled report.
      await load();
    } catch (err) {
      // Two different 409s arrive here and they are told apart by key presence, not
      // by status code. explainApplyFailure does that and adds the sentence the
      // backend's own wording needs.
      const explanation = explainApplyFailure(err);
      setApplyFailure(explanation);
      if (explanation.isIllegalTransition) await load();
    } finally {
      setBusy(false);
    }
  };

  const moveToReview = async () => {
    setBusy(true);
    try {
      await reviewStockCount(stockCountId);
      setNotice('Moved to review. The count is now read-before-commit; apply is available.');
      await load();
    } catch (err) {
      setError(parseApiError(err, 'entries').summary);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelCount = async () => {
    setConfirmCancel(false);
    setBusy(true);
    try {
      await cancelStockCount(stockCountId);
      setNotice('Count cancelled. Nothing was applied to stock; the counted quantities stay on the record.');
      await load();
    } catch (err) {
      setError(parseApiError(err, 'entries').summary);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const missing = totals.missingCost;

  return (
    <Stack spacing={2}>
      <MainCard
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4">{count ? `Variance report — ${count.reference}` : 'Variance report'}</Typography>
            {count && <Chip size="small" color={countStatusColor(count.status)} label={count.status_label} />}
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
            {actions.enter.allowed && (
              <Button size="small" onClick={() => navigate(`/inventory/stock-counts/${stockCountId}`)}>
                Back to scanning
              </Button>
            )}
            {count?.status === 'open' && (
              <Tooltip title={actions.review.reason ?? 'Close counting and open the read-before-commit gate.'}>
                <span>
                  <Button size="small" variant="outlined" disabled={!actions.review.allowed || busy} onClick={moveToReview}>
                    Move to review
                  </Button>
                </span>
              </Tooltip>
            )}
            <Tooltip title={actions.apply.reason ?? 'Post every variance to the stock ledger. This cannot be undone.'}>
              <span>
                <Button size="small" variant="contained" disabled={!actions.apply.allowed || busy} onClick={() => setConfirmApply(true)}>
                  Apply to stock
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={actions.cancel.reason ?? 'Abandon this count without touching stock.'}>
              <span>
                <Button size="small" color="error" disabled={!actions.cancel.allowed || busy} onClick={() => setConfirmCancel(true)}>
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
              <strong>Opened by:</strong> {count?.created_by_email || '—'}
            </Typography>
            {count?.applied_at && (
              <Typography variant="body2">
                <strong>Applied by:</strong> {count.applied_by_email || '—'}
              </Typography>
            )}
          </Stack>

          {!isAdmin && <Alert severity="info">{NON_ADMIN_NOTICE}</Alert>}
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
          {isAdmin && count?.status === 'open' && <Alert severity="info">{actions.apply.reason}</Alert>}

          {applyFailure && (
            <Alert severity="error" onClose={() => setApplyFailure(null)}>
              <AlertTitle>The count was not applied</AlertTitle>
              <Typography variant="body2">{applyFailure.summary}</Typography>
              {applyFailure.hint && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {applyFailure.hint}
                </Typography>
              )}
              {applyFailure.clarification && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {applyFailure.clarification}
                </Typography>
              )}
              {applyFailure.allowedFrom && applyFailure.allowedFrom.length > 0 && (
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  Available from: {applyFailure.allowedFrom.join(', ')}. This screen has been reloaded from the server.
                </Typography>
              )}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Lines
              </Typography>
              <Typography variant="h4">{formatQuantity(totals.total_lines)}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Counted
              </Typography>
              <Typography variant="h4">{formatQuantity(totals.counted_lines)}</Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Never counted
              </Typography>
              <Typography variant="h4" color={totals.uncounted_lines > 0 ? 'warning.main' : undefined}>
                {formatQuantity(totals.uncounted_lines)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Shrinkage
              </Typography>
              <Typography variant="h4" color={totals.shrinkage_units > 0 ? 'error.main' : undefined}>
                {formatQuantity(totals.shrinkage_units)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Overage
              </Typography>
              <Typography variant="h4" color={totals.overage_units > 0 ? 'success.main' : undefined}>
                {formatQuantity(totals.overage_units)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Net cost impact
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h4">{totals.netCostImpactText}</Typography>
                {/* THE ZERO-COST TRAP, next to the figure it excludes from. */}
                {missing.hasExclusions && (
                  <Tooltip title={missing.message ?? ''}>
                    <Chip size="small" color="warning" label={`${missing.lineCount} not costed`} />
                  </Tooltip>
                )}
              </Stack>
            </Grid>
          </Grid>

          {missing.hasExclusions && (
            <Alert severity="warning">
              <AlertTitle>The money figure is incomplete</AlertTitle>
              {missing.message} Those lines have a real unit variance and no cost on record, so they move stock without moving the value —
              the column does not sum to the total, and it cannot be made to.
            </Alert>
          )}

          {totals.uncounted_lines > 0 && (
            <Alert severity="info">
              {totals.uncounted_lines} line(s) were never counted. They are not treated as matching and applying the count will leave their
              stock exactly as it is.
            </Alert>
          )}
        </Stack>
      </MainCard>

      <MainCard
        title="Lines"
        secondary={
          <TextField
            select
            size="small"
            value={sort}
            onChange={(event) => setSort(event.target.value as VarianceSort)}
            sx={{ minWidth: 220 }}
          >
            {(Object.keys(SORT_LABELS) as VarianceSort[]).map((mode) => (
              <MenuItem key={mode} value={mode}>
                {SORT_LABELS[mode]}
              </MenuItem>
            ))}
          </TextField>
        }
      >
        <Stack spacing={2}>
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
                  <TableCell align="right">Counted</TableCell>
                  <TableCell align="right">Variance</TableCell>
                  <TableCell align="right">Unit cost</TableCell>
                  <TableCell align="right">Cost impact</TableCell>
                  <TableCell>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" color="text.secondary">
                        This count has no lines. A scope that matched nothing does that — it is legal, and there is nothing to apply.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.line_id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{row.label}</Typography>
                        {!row.counted && <Chip size="small" variant="outlined" color="warning" label="Not counted" />}
                      </Stack>
                    </TableCell>
                    <TableCell>{row.sku || '—'}</TableCell>
                    <TableCell align="right">{row.expectedText}</TableCell>
                    <TableCell align="right">{row.countedText}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={TONE_COLOR[row.tone]}>
                        {row.varianceText}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{row.unitCostText}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <span>{row.costImpactText}</span>
                        {/* Marked per row, so a reader scanning the money column can see
                            exactly which variances it leaves out. */}
                        {row.costMissing && (
                          <Tooltip title="This item has no cost on record, so its variance contributes nothing to the money total.">
                            <Chip size="small" variant="outlined" color="warning" label="no cost" />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{row.note || ''}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="caption" color="text.secondary">
            An em dash is never a zero. In the counted column it means nobody looked; in the cost columns it means the item has no cost on
            record.
          </Typography>
        </Stack>
      </MainCard>

      {adjustments !== null && (
        <MainCard title={`Adjustments posted (${adjustments.length})`}>
          {adjustments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No adjustment was needed — every counted line matched its expected quantity.
            </Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">On hand after</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adjustments.map((adjustment) => (
                    <TableRow key={`${adjustment.inventory_item_id}-${adjustment.quantity_after}`} hover>
                      <TableCell>{adjustment.sku || '—'}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={adjustment.delta < 0 ? 'error.main' : 'success.main'}>
                          {formatDelta(adjustment.delta)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatQuantity(adjustment.quantity_after)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </MainCard>
      )}

      <Dialog open={confirmApply} onClose={() => setConfirmApply(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply this count to stock?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {totals.lines_with_variance} line(s) will post a stock movement: {formatQuantity(totals.shrinkage_units)} unit(s) of shrinkage
              and {formatQuantity(totals.overage_units)} of overage, a net {formatDelta(totals.net_variance_units)} units.
            </Typography>
            <Typography variant="body2">
              Value on the ledger: <strong>{totals.netCostImpactText}</strong>.
            </Typography>
            {missing.hasExclusions && (
              <Alert severity="warning" icon={false}>
                {missing.message} That value is therefore lower than the true one, and by an amount this screen cannot calculate.
              </Alert>
            )}
            {totals.uncounted_lines > 0 && (
              <Alert severity="info" icon={false}>
                {totals.uncounted_lines} line(s) were never counted and will be left alone.
              </Alert>
            )}
            <Box>
              <Typography variant="body2" color="text.secondary">
                Applying writes count_adjust movements against the stock ledger and locks the count. There is no way back: an applied count
                is a dated statement of what was on the shelf, and a correction is a new count.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmApply(false)}>Not yet</Button>
          <Button variant="contained" onClick={apply} disabled={busy}>
            Apply to stock
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel this count?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Nothing is applied to stock and the counted quantities stay on the record. A cancelled count cannot be reopened.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancel(false)}>Keep it open</Button>
          <Button color="error" variant="contained" onClick={cancelCount} disabled={busy}>
            Cancel count
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
