// Calendar — owner-declared days the forecaster and auto-scheduler must honour
// (ALL-150): closures, inventory counts, private events. "We just need an input."

import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'store';
import { createCalendarException, deleteCalendarException, updateCalendarException } from 'api/scheduling.api';
import { fetchCalendarExceptions } from 'store/slices/scheduling';
import type { CalendarException, CalendarExceptionKind, DemandEffect, ScheduleTemplate } from 'types/scheduling';
import { isoDate } from './utils';
import {
  DEFAULT_EFFECT,
  EFFECT_LABELS,
  ExceptionDraft,
  KIND_LABELS,
  describeException,
  draftFromException,
  emptyDraft,
  orderForList,
  toPayload,
  validateDraft,
  withKind
} from './calendarExceptions';

interface Props {
  templates: ScheduleTemplate[];
  isAdmin: boolean;
}

const KINDS = Object.keys(KIND_LABELS) as CalendarExceptionKind[];
const EFFECTS = Object.keys(EFFECT_LABELS) as DemandEffect[];

const CalendarExceptionsTab: React.FC<Props> = ({ templates, isAdmin }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { calendarExceptions } = useSelector((state) => state.scheduling);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarException | null>(null);
  const [draft, setDraft] = React.useState<ExceptionDraft>(emptyDraft());
  const [errors, setErrors] = React.useState<ReturnType<typeof validateDraft>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    dispatch(fetchCalendarExceptions(undefined));
  }, [dispatch]);

  const locationIds = React.useMemo(
    () => Array.from(new Set(templates.map((template) => template.location_id).filter(Boolean))),
    [templates]
  );
  const todayIso = isoDate(new Date());
  const rows = React.useMemo(() => orderForList(calendarExceptions, todayIso), [calendarExceptions, todayIso]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setErrors({});
    setDialogOpen(true);
  };
  const openEdit = (row: CalendarException) => {
    setEditing(row);
    setDraft(draftFromException(row));
    setErrors({});
    setDialogOpen(true);
  };

  const save = async () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const payload = toPayload(draft);
      const response = editing ? await updateCalendarException(editing.id, payload) : await createCalendarException(payload);
      const invalidated = response.forecast_rows_invalidated ?? 0;
      enqueueSnackbar(
        invalidated > 0 ? `${response.message}. The week's forecast will be rebuilt (${invalidated} rows cleared).` : response.message,
        { variant: 'success' }
      );
      setDialogOpen(false);
      dispatch(fetchCalendarExceptions(undefined));
    } catch (err: any) {
      const details = err?.response?.data?.details;
      if (details && typeof details === 'object') {
        const mapped: Record<string, string> = {};
        Object.entries(details).forEach(([field, messages]) => {
          mapped[field] = Array.isArray(messages) ? String(messages[0]) : String(messages);
        });
        setErrors(mapped);
      }
      enqueueSnackbar(err?.response?.data?.error || 'Could not save the exception', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: CalendarException) => {
    try {
      await deleteCalendarException(row.id);
      enqueueSnackbar('Exception removed', { variant: 'success' });
      dispatch(fetchCalendarExceptions(undefined));
    } catch {
      enqueueSnackbar('Could not remove the exception', { variant: 'error' });
    }
  };

  const needsMultiplier = draft.demand_effect === 'dampen' || draft.demand_effect === 'boost';

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Days the data alone cannot know about. A closure or inventory count zeroes the forecast and staffs the day at your count crew (below
        the template floor); a private event scales demand. Past exception days are left out of what the model learns from, so one closed
        Friday never drags down a normal one.
      </Alert>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Calendar exceptions</Typography>
        {isAdmin && (
          <Button size="small" variant="contained" startIcon={<IconPlus size={14} />} onClick={openCreate}>
            Declare a day
          </Button>
        )}
      </Stack>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No exception days declared. The forecast and schedule follow the data.
        </Typography>
      )}
      <Stack spacing={1}>
        {rows.map((row) => {
          const past = row.date < todayIso;
          return (
            <Paper key={row.id} variant="outlined" sx={{ p: 1.25, opacity: past ? 0.7 : 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2">{row.date}</Typography>
                    <Chip
                      size="small"
                      label={KIND_LABELS[row.kind] ?? row.kind}
                      color={row.demand_effect === 'zero' ? 'default' : 'primary'}
                    />
                    <Chip size="small" variant="outlined" label={row.location_id ? `Location ${row.location_id}` : 'Company-wide'} />
                    {past && <Chip size="small" variant="outlined" label="past — excluded from learning" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {describeException(row)}
                  </Typography>
                </Box>
                {isAdmin && (
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" startIcon={<IconPencil size={14} />} onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<IconTrash size={14} />} onClick={() => remove(row)}>
                      Remove
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit exception day' : 'Declare an exception day'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              error={Boolean(errors.date)}
              helperText={errors.date}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl>
              <InputLabel>Scope</InputLabel>
              <Select label="Scope" value={draft.location_id} onChange={(e) => setDraft({ ...draft, location_id: String(e.target.value) })}>
                <MenuItem value="">Company-wide</MenuItem>
                {locationIds.map((locationId) => (
                  <MenuItem key={locationId} value={locationId}>
                    Location {locationId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>What is happening</InputLabel>
              <Select
                label="What is happening"
                value={draft.kind}
                onChange={(e) => setDraft(withKind(draft, e.target.value as CalendarExceptionKind))}
              >
                {KINDS.map((kind) => (
                  <MenuItem key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Effect on demand</InputLabel>
              <Select
                label="Effect on demand"
                value={draft.demand_effect}
                onChange={(e) => setDraft({ ...draft, demand_effect: e.target.value as DemandEffect })}
              >
                {EFFECTS.map((effect) => (
                  <MenuItem key={effect} value={effect}>
                    {EFFECT_LABELS[effect]}
                    {effect === DEFAULT_EFFECT[draft.kind] ? ' (default)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {needsMultiplier && (
              <TextField
                label={
                  draft.demand_effect === 'boost' ? 'Demand multiplier (above 1.0, e.g. 1.5)' : 'Demand multiplier (below 1.0, e.g. 0.6)'
                }
                value={draft.multiplier}
                onChange={(e) => setDraft({ ...draft, multiplier: e.target.value })}
                error={Boolean(errors.multiplier)}
                helperText={errors.multiplier ?? 'Applied on top of the day-of-week baseline, weather and trend'}
              />
            )}
            {draft.demand_effect === 'zero' && (
              <TextField
                label="People to schedule that day (count crew)"
                value={draft.staff_headcount}
                onChange={(e) => setDraft({ ...draft, staff_headcount: e.target.value })}
                error={Boolean(errors.staff_headcount)}
                helperText={
                  errors.staff_headcount ??
                  (draft.kind === 'inventory_count' ? 'Leave blank for the template minimum' : 'Leave blank for nobody')
                }
              />
            )}
            <TextField
              label="Note (shown in the schedule explanation)"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              inputProps={{ maxLength: 255 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {editing ? 'Save' : 'Declare'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default CalendarExceptionsTab;
