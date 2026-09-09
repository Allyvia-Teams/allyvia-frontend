// Recommendations — the money screen: week calendar of recommended shifts,
// per-day cards with forecast sparklines, banner totals, warnings, and the
// approve / swap / regenerate / dismiss actions.

import React from 'react';
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
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconCheck, IconRefresh, IconX } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import {
  approveRecommendation,
  dismissRecommendation,
  generateRecommendation,
  getShiftCandidates,
  swapShiftEmployee
} from 'api/scheduling.api';
import { fetchForecast, fetchRecommendationDetail, fetchRecommendations } from 'store/slices/scheduling';
import { ForecastRow, RecommendedShift, ShiftCandidate } from 'types/scheduling';
import { DAY_NAMES, addDays, blockHours, currency, formatTime, isoDate, nextMonday, roleColor } from './utils';

const LOW_CONFIDENCE = 0.5;

const Sparkline: React.FC<{ rows: ForecastRow[] }> = ({ rows }) => {
  if (!rows.length) return null;
  const values = rows.map((row) => parseFloat(row.predicted_sales));
  const max = Math.max(...values, 1);
  const width = 120;
  const height = 28;
  if (values.length === 1) {
    // A polyline with one point renders nothing
    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <circle cx={width / 2} cy={height - (values[0] / max) * height} r={2} fill="#1976d2" />
      </svg>
    );
  }
  const step = width / (values.length - 1);
  const points = values.map((value, i) => `${(i * step).toFixed(1)},${(height - (value / max) * height).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke="#1976d2" strokeWidth={1.5} />
    </svg>
  );
};

interface Props {
  isAdmin: boolean;
}

const RecommendationsTab: React.FC<Props> = ({ isAdmin }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { recommendations, currentRecommendation, forecast, forecastWeek, loading, detailLoading, error } = useSelector(
    (state) => state.scheduling
  );

  const [generating, setGenerating] = React.useState(false);
  const [dismissOpen, setDismissOpen] = React.useState(false);
  const [dismissReason, setDismissReason] = React.useState('');
  const [swapShift, setSwapShift] = React.useState<RecommendedShift | null>(null);
  const [candidates, setCandidates] = React.useState<ShiftCandidate[] | null>(null);
  const [swapTarget, setSwapTarget] = React.useState<string>('');
  // Invalidates in-flight candidate requests when the dialog closes or a
  // different shift is opened (a stale response must never populate the
  // dropdown for another shift)
  const swapRequestId = React.useRef(0);

  const recommendation = currentRecommendation;

  React.useEffect(() => {
    dispatch(fetchRecommendations(undefined));
  }, [dispatch]);

  React.useEffect(() => {
    // Default to the most recent recommendation
    if (!recommendation && recommendations.length) {
      dispatch(fetchRecommendationDetail(recommendations[0].id));
    }
  }, [dispatch, recommendation, recommendations]);

  React.useEffect(() => {
    if (recommendation) {
      dispatch(fetchForecast({ weekStart: recommendation.week_start }));
    }
  }, [dispatch, recommendation?.id, recommendation?.week_start]);

  const refreshDetail = async () => {
    if (recommendation) {
      await dispatch(fetchRecommendationDetail(recommendation.id));
      dispatch(fetchRecommendations(undefined));
    }
  };

  const forecastByDate = React.useMemo(() => {
    const map: Record<string, ForecastRow[]> = {};
    // Out-of-order responses: only trust forecast rows fetched for the
    // currently displayed week
    if (forecastWeek !== recommendation?.week_start) return map;
    for (const row of forecast) {
      if (parseFloat(row.predicted_sales) > 0) {
        (map[row.date] = map[row.date] || []).push(row);
      }
    }
    Object.values(map).forEach((rows) => rows.sort((a, b) => a.hour - b.hour));
    return map;
  }, [forecast, forecastWeek, recommendation?.week_start]);

  const dayConfidence = (dateIso: string): number | null => {
    const rows = forecastByDate[dateIso];
    if (!rows?.length) return null;
    return rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length;
  };

  const shiftsByDate = React.useMemo(() => {
    const map: Record<string, RecommendedShift[]> = {};
    for (const shift of recommendation?.shifts ?? []) {
      (map[shift.date] = map[shift.date] || []).push(shift);
    }
    return map;
  }, [recommendation]);

  const stageAByDow = React.useMemo(() => {
    const map: Record<number, { headcount: number; min: number; max: number }> = {};
    for (const entry of recommendation?.stage_a ?? []) {
      const existing = map[entry.day_of_week] || { headcount: 0, min: 0, max: 0 };
      map[entry.day_of_week] = {
        headcount: existing.headcount + entry.headcount,
        min: existing.min + entry.min_staff,
        max: existing.max + entry.max_staff
      };
    }
    return map;
  }, [recommendation]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await generateRecommendation({
        week_start: recommendation?.week_start || isoDate(nextMonday()),
        narrative: true
      });
      enqueueSnackbar(response.message, { variant: 'success' });
      await dispatch(fetchRecommendations(undefined));
      if (response.item) {
        dispatch(fetchRecommendationDetail(response.item.id));
      }
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error || 'Generation failed', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (dates?: string[]) => {
    if (!recommendation) return;
    try {
      const response = await approveRecommendation(recommendation.id, dates ? { dates } : {});
      enqueueSnackbar(
        <span>
          {response.message} —{' '}
          <Button size="small" color="inherit" onClick={() => navigate('/employees/clock')}>
            view proposed shifts
          </Button>
        </span>,
        { variant: 'success' }
      );
      refreshDetail();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error || 'Approval failed', { variant: 'error' });
    }
  };

  const handleDismiss = async () => {
    if (!recommendation) return;
    try {
      await dismissRecommendation(recommendation.id, dismissReason);
      setDismissOpen(false);
      setDismissReason('');
      refreshDetail();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error || 'Dismiss failed', { variant: 'error' });
    }
  };

  const closeSwap = () => {
    swapRequestId.current += 1;
    setSwapShift(null);
  };

  const openSwap = async (shift: RecommendedShift) => {
    const requestId = ++swapRequestId.current;
    setSwapShift(shift);
    setCandidates(null);
    setSwapTarget('');
    if (!recommendation) return;
    try {
      const response = await getShiftCandidates(recommendation.id, shift.id);
      if (requestId !== swapRequestId.current) return; // stale response
      setCandidates(response.items);
      setSwapTarget(response.items.find((candidate) => candidate.is_current)?.employee ?? '');
    } catch {
      if (requestId !== swapRequestId.current) return;
      enqueueSnackbar('Could not load candidates', { variant: 'error' });
      setSwapShift(null);
    }
  };

  const handleSwap = async () => {
    if (!recommendation || !swapShift) return;
    try {
      await swapShiftEmployee(recommendation.id, swapShift.id, swapTarget || null);
      closeSwap();
      refreshDetail();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.error || 'Swap failed', { variant: 'error' });
    }
  };

  // Initial list load: never show the empty state (or its Generate CTA)
  // while the list is still being fetched, and surface fetch errors
  if (loading && !recommendations.length && !recommendation) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error && !recommendations.length && !recommendation) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => dispatch(fetchRecommendations(undefined))}>Retry</Button>
      </Stack>
    );
  }

  if (!recommendation && !recommendations.length) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
        <Typography variant="h4">No schedule recommendations yet</Typography>
        <Typography color="text.secondary" align="center" sx={{ maxWidth: 480 }}>
          Generate your first auto-schedule: the engine forecasts next week&apos;s demand hour by hour and staffs your template to match.
        </Typography>
        {isAdmin && (
          <Button variant="contained" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate next week'}
          </Button>
        )}
      </Stack>
    );
  }

  if (!recommendation || detailLoading) {
    // Distinguish "loading detail" from "detail fetch failed" — the latter
    // must not strand the user on an infinite spinner
    if (!detailLoading && error && recommendations.length) {
      return (
        <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
          <Alert severity="error">{error}</Alert>
          <Button onClick={() => dispatch(fetchRecommendationDetail(recommendations[0].id))}>Retry</Button>
        </Stack>
      );
    }
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  const narrative = recommendation.narrative;
  const savings = parseFloat(recommendation.projected_savings);
  const laborPct = recommendation.projected_labor_pct;
  const isActionable =
    isAdmin &&
    (recommendation.status === 'presented' || recommendation.status === 'draft' || recommendation.status === 'partially_approved');

  return (
    <Stack spacing={2}>
      {/* Header: week picker + actions */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <Select size="small" value={recommendation.id} onChange={(e) => dispatch(fetchRecommendationDetail(Number(e.target.value)))}>
            {recommendations.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                Week of {item.week_start} — {item.status}
              </MenuItem>
            ))}
          </Select>
          <Chip
            label={recommendation.status.replace('_', ' ')}
            color={recommendation.status === 'approved' ? 'success' : recommendation.status === 'dismissed' ? 'default' : 'primary'}
          />
        </Stack>
        {isAdmin && (
          <Stack direction="row" spacing={1}>
            <Button startIcon={<IconRefresh size={16} />} onClick={handleGenerate} disabled={generating}>
              {generating ? 'Regenerating…' : 'Regenerate'}
            </Button>
            {isActionable && (
              <>
                <Button variant="outlined" color="error" startIcon={<IconX size={16} />} onClick={() => setDismissOpen(true)}>
                  Dismiss
                </Button>
                <Button variant="contained" startIcon={<IconCheck size={16} />} onClick={() => handleApprove()}>
                  Approve week
                </Button>
              </>
            )}
          </Stack>
        )}
      </Stack>

      {/* Banner totals */}
      <Grid container spacing={1}>
        {[
          { label: 'Projected labor cost', value: currency(recommendation.projected_labor_cost) },
          { label: 'Baseline (full staffing)', value: currency(recommendation.baseline_labor_cost) },
          {
            label: 'Projected savings',
            value: currency(recommendation.projected_savings),
            highlight: savings > 0
          },
          {
            label: 'Labor % of forecast sales',
            value: laborPct != null ? `${(laborPct * 100).toFixed(1)}%` : '—'
          }
        ].map((metric) => (
          <Grid key={metric.label} size={{ xs: 6, md: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
              <Typography variant="caption" color="text.secondary">
                {metric.label}
              </Typography>
              <Typography variant="h4" color={metric.highlight ? 'success.main' : 'inherit'}>
                {metric.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Narrative */}
      {narrative?.summary && (
        <Alert severity="info" icon={false}>
          <Typography variant="body1">{narrative.summary}</Typography>
          {narrative.savings_story && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {narrative.savings_story}
            </Typography>
          )}
        </Alert>
      )}

      {/* Warnings */}
      {Boolean(recommendation.warnings?.length || narrative?.cautions?.length) && (
        <Alert severity="warning">
          <Stack spacing={0.5}>
            {(narrative?.cautions ?? []).map((caution) => (
              <Typography key={caution} variant="body2">
                {caution}
              </Typography>
            ))}
            {(recommendation.warnings ?? []).map((warning, index) => (
              <Typography key={index} variant="body2">
                {warning.type === 'unfilled_slot' && `Unfilled ${warning.role} slot on ${warning.date} (${warning.window})`}
                {warning.type === 'overtime_fill' && `Overtime used to fill ${warning.role} on ${warning.date}`}
                {warning.type === 'low_confidence_day' && `Low forecast confidence on ${warning.date}`}
              </Typography>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Per-day cards + shift calendar */}
      <Grid container spacing={1}>
        {DAY_NAMES.map((dayName, dow) => {
          const dateIso = addDays(recommendation.week_start, dow);
          const dayShifts = (shiftsByDate[dateIso] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
          const stageA = stageAByDow[dow];
          const dayRows = forecastByDate[dateIso] ?? [];
          const daySales = dayRows.reduce((sum, row) => sum + parseFloat(row.predicted_sales), 0);
          const dayCost = dayShifts.reduce((sum, shift) => {
            if (!shift.hourly_cost) return sum;
            return sum + parseFloat(shift.hourly_cost) * blockHours(shift.start_time, shift.end_time);
          }, 0);
          const confidence = dayConfidence(dateIso);
          const explanation = narrative?.day_explanations?.find((entry) => entry.date === dateIso);
          return (
            <Grid key={dayName} size={{ xs: 12, sm: 6, md: 12 / 7 }}>
              <Paper variant="outlined" sx={{ p: 1, height: '100%' }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="subtitle2">{dayName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dateIso.slice(5)}
                    </Typography>
                  </Stack>
                  <Sparkline rows={dayRows} />
                  <Typography variant="caption" color="text.secondary">
                    forecast {currency(daySales)}
                    {dayCost > 0 && ` · labor ${currency(dayCost)}`}
                    {daySales > 0 && dayCost > 0 && ` (${((dayCost / daySales) * 100).toFixed(0)}%)`}
                  </Typography>
                  {stageA && (
                    <Typography variant="caption">
                      staffing {stageA.headcount} (range {stageA.min}–{stageA.max})
                    </Typography>
                  )}
                  {confidence != null && confidence < LOW_CONFIDENCE && (
                    <Chip size="small" color="warning" label="low confidence — profile priors" />
                  )}
                  {explanation && (
                    <Tooltip title={explanation.detail}>
                      <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                        {explanation.headline}
                      </Typography>
                    </Tooltip>
                  )}
                  <Stack spacing={0.5}>
                    {dayShifts.map((shift) => (
                      <Tooltip
                        key={shift.id}
                        title={
                          shift.created_shift
                            ? 'Approved — proposed to employee'
                            : isActionable
                              ? 'Click to swap assignee'
                              : shift.staff_role_name
                        }
                      >
                        <Box
                          onClick={() => isActionable && !shift.created_shift && openSwap(shift)}
                          sx={{
                            borderLeft: `4px solid ${roleColor(shift.staff_role)}`,
                            bgcolor: shift.employee ? 'action.hover' : 'rgba(211,47,47,0.12)',
                            borderRadius: 1,
                            px: 0.75,
                            py: 0.5,
                            cursor: isActionable && !shift.created_shift ? 'pointer' : 'default',
                            opacity: shift.created_shift ? 0.75 : 1
                          }}
                        >
                          <Typography variant="caption" display="block" fontWeight={600}>
                            {shift.employee_name || 'UNFILLED'}
                            {shift.created_shift && ' ✓'}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {formatTime(shift.start_time)}–{formatTime(shift.end_time)} · {shift.staff_role_name}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                  {isActionable && dayShifts.some((shift) => shift.employee && !shift.created_shift) && (
                    <Button size="small" onClick={() => handleApprove([dateIso])}>
                      Approve day
                    </Button>
                  )}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Dismiss dialog */}
      <Dialog open={dismissOpen} onClose={() => setDismissOpen(false)}>
        <DialogTitle>Dismiss this recommendation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1, minWidth: 360 }}
            label="Why doesn't this schedule work? (helps the engine learn)"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDismissOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDismiss}>
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>

      {/* Swap dialog */}
      <Dialog open={Boolean(swapShift)} onClose={closeSwap}>
        <DialogTitle>
          Swap assignee — {swapShift && `${formatTime(swapShift.start_time)}–${formatTime(swapShift.end_time)}`}{' '}
          {swapShift?.staff_role_name}
        </DialogTitle>
        <DialogContent>
          {candidates === null ? (
            <Stack alignItems="center" sx={{ py: 3, minWidth: 360 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <Stack spacing={1} sx={{ pt: 1, minWidth: 360 }}>
              <Typography variant="body2" color="text.secondary">
                Only employees who pass every scheduling constraint are listed.
              </Typography>
              <Select value={swapTarget} onChange={(e) => setSwapTarget(String(e.target.value))} displayEmpty>
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {candidates.map((candidate) => (
                  <MenuItem key={candidate.employee} value={candidate.employee}>
                    {candidate.name} — ${candidate.rate}/h
                    {candidate.requires_overtime ? ' (overtime)' : ''}
                    {candidate.is_current ? ' (current)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSwap}>Cancel</Button>
          <Button variant="contained" onClick={handleSwap} disabled={candidates === null}>
            Swap
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default RecommendationsTab;
