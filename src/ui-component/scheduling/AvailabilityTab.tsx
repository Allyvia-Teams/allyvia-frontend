// Availability — per-employee weekly recurring editor + date exceptions,
// with a coverage heatmap of available headcount vs the template's needs.

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
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'store';
import { createAvailability, createAvailabilityException, deleteAvailability, deleteAvailabilityException } from 'api/scheduling.api';
import { fetchAvailability, fetchAvailabilityExceptions } from 'store/slices/scheduling';
import { ScheduleTemplate } from 'types/scheduling';
import { DAY_NAMES, formatTime, hourOf } from './utils';

// Default heatmap window; extended automatically when template blocks or
// availability fall outside it (late-night venues)
const DEFAULT_HEATMAP_START = 6;
const DEFAULT_HEATMAP_END = 22;

/** Whether a time window covers `hour`, wrap-aware. Compares the full
 * HH:MM:SS strings so a slot contained within a single clock hour is not
 * mistaken for an overnight wrap. */
const windowCoversHour = (startTime: string, endTime: string, hour: number): boolean => {
  const start = hourOf(startTime);
  const end = hourOf(endTime) + (endTime.split(':')[1] !== '00' ? 1 : 0);
  const wraps = endTime <= startTime;
  return wraps ? hour >= start || hour < end : hour >= start && hour < end;
};

interface Props {
  template: ScheduleTemplate | null;
  isAdmin: boolean;
  ownEmployeeId: string | null;
}

const AvailabilityTab: React.FC<Props> = ({ template, isAdmin, ownEmployeeId }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { availability, exceptions } = useSelector((state) => state.scheduling);
  const { allEmployees } = useSelector((state) => state.employee);

  const [selectedEmployee, setSelectedEmployee] = React.useState<string>('');
  const [slotDialog, setSlotDialog] = React.useState(false);
  const [slotDraft, setSlotDraft] = React.useState({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '17:00',
    preference: 'available'
  });
  const [exceptionDialog, setExceptionDialog] = React.useState(false);
  const [exceptionDraft, setExceptionDraft] = React.useState({
    date: '',
    is_available: false,
    reason: ''
  });

  const targetEmployee = isAdmin ? selectedEmployee : ownEmployeeId || '';

  React.useEffect(() => {
    // Admins fetch everyone (needed for the heatmap); members get their own
    dispatch(fetchAvailability(undefined));
    dispatch(fetchAvailabilityExceptions(undefined));
  }, [dispatch]);

  const refresh = () => {
    dispatch(fetchAvailability(undefined));
    dispatch(fetchAvailabilityExceptions(undefined));
  };

  const visibleSlots = availability.filter((slot) => !targetEmployee || slot.employee === targetEmployee);
  const visibleExceptions = exceptions.filter((row) => !targetEmployee || row.employee === targetEmployee);

  // Coverage heatmap: available employee count per (day, hour) vs the
  // template's max need for that hour. Window expands past the default when
  // blocks or availability run late/early.
  const heatmapHours = React.useMemo(() => {
    let earliest = DEFAULT_HEATMAP_START;
    let latest = DEFAULT_HEATMAP_END;
    const windows = [
      ...availability.map((slot) => [slot.start_time, slot.end_time]),
      ...(template?.blocks ?? []).map((block) => [block.start_time, block.end_time])
    ];
    for (const [start, end] of windows) {
      if (end <= start) {
        // Overnight window: show the whole day
        return Array.from({ length: 24 }, (_, i) => i);
      }
      earliest = Math.min(earliest, hourOf(start));
      latest = Math.max(latest, hourOf(end) + (end.split(':')[1] !== '00' ? 1 : 0));
    }
    return Array.from({ length: Math.min(latest, 24) - earliest }, (_, i) => i + earliest);
  }, [availability, template]);

  const heatmap = React.useMemo(() => {
    const counts: number[][] = DAY_NAMES.map(() => heatmapHours.map(() => 0));
    for (const slot of availability) {
      for (let i = 0; i < heatmapHours.length; i += 1) {
        if (windowCoversHour(slot.start_time, slot.end_time, heatmapHours[i])) {
          counts[slot.day_of_week][i] += 1;
        }
      }
    }
    const needs: number[][] = DAY_NAMES.map(() => heatmapHours.map(() => 0));
    for (const block of template?.blocks ?? []) {
      for (let i = 0; i < heatmapHours.length; i += 1) {
        if (windowCoversHour(block.start_time, block.end_time, heatmapHours[i])) {
          needs[block.day_of_week][i] += block.max_staff;
        }
      }
    }
    return { counts, needs };
  }, [availability, template, heatmapHours]);

  const cellColor = (count: number, need: number): string => {
    if (need === 0) return 'transparent';
    if (count >= need) return 'rgba(46, 125, 50, 0.35)';
    if (count > 0) return 'rgba(237, 108, 2, 0.4)';
    return 'rgba(211, 47, 47, 0.45)';
  };

  const addSlot = async () => {
    try {
      await createAvailability({
        employee: isAdmin && targetEmployee ? targetEmployee : undefined,
        ...slotDraft
      });
      setSlotDialog(false);
      refresh();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.error || 'Could not add availability', { variant: 'error' });
    }
  };

  const addException = async () => {
    try {
      await createAvailabilityException({
        employee: isAdmin && targetEmployee ? targetEmployee : undefined,
        date: exceptionDraft.date,
        is_available: exceptionDraft.is_available,
        reason: exceptionDraft.reason
      });
      setExceptionDialog(false);
      refresh();
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.error || 'Could not add exception', { variant: 'error' });
    }
  };

  const removeSlot = async (slotId: number) => {
    try {
      await deleteAvailability(slotId);
      refresh();
    } catch {
      enqueueSnackbar('Could not remove availability', { variant: 'error' });
    }
  };

  const removeException = async (exceptionId: number) => {
    try {
      await deleteAvailabilityException(exceptionId);
      refresh();
    } catch {
      enqueueSnackbar('Could not remove exception', { variant: 'error' });
    }
  };

  const canEdit = isAdmin || Boolean(ownEmployeeId && targetEmployee === ownEmployeeId);

  return (
    <Stack spacing={3}>
      {isAdmin && (
        <FormControl sx={{ maxWidth: 320 }}>
          <InputLabel>Employee</InputLabel>
          <Select label="Employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(String(e.target.value))} displayEmpty>
            <MenuItem value="">All employees</MenuItem>
            {allEmployees.map((employee: any) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.full_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {!isAdmin && !ownEmployeeId && <Alert severity="info">No employee record is linked to your account yet — ask an admin.</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h5">Weekly availability</Typography>
              {canEdit && (
                <Button size="small" startIcon={<IconPlus size={14} />} onClick={() => setSlotDialog(true)}>
                  Add slot
                </Button>
              )}
            </Stack>
            {visibleSlots.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No recurring availability{targetEmployee ? ' for this employee' : ''} yet. Employees with no availability are never
                auto-scheduled.
              </Typography>
            )}
            <Stack spacing={0.5}>
              {visibleSlots.map((slot) => (
                <Stack key={slot.id} direction="row" alignItems="center" spacing={1}>
                  <Chip size="small" label={DAY_NAMES[slot.day_of_week]} sx={{ width: 52 }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {!targetEmployee && `${slot.employee_name} — `}
                    {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={slot.preference === 'preferred' ? 'success' : slot.preference === 'if_needed' ? 'warning' : 'default'}
                    label={slot.preference.replace('_', ' ')}
                  />
                  {(isAdmin || slot.employee === ownEmployeeId) && (
                    <Button size="small" color="error" onClick={() => removeSlot(slot.id)}>
                      <IconTrash size={14} />
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h5">Date exceptions</Typography>
              {canEdit && (
                <Button size="small" startIcon={<IconPlus size={14} />} onClick={() => setExceptionDialog(true)}>
                  Add exception
                </Button>
              )}
            </Stack>
            {visibleExceptions.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Time off or one-off extra days appear here.
              </Typography>
            )}
            <Stack spacing={0.5}>
              {visibleExceptions.map((row) => (
                <Stack key={row.id} direction="row" alignItems="center" spacing={1}>
                  <Chip size="small" color={row.is_available ? 'success' : 'error'} label={row.is_available ? 'extra' : 'off'} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {!targetEmployee && `${row.employee_name} — `}
                    {row.date}
                    {row.reason ? ` (${row.reason})` : ''}
                  </Typography>
                  {(isAdmin || row.employee === ownEmployeeId) && (
                    <Button size="small" color="error" onClick={() => removeException(row.id)}>
                      <IconTrash size={14} />
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Coverage vs template needs
            </Typography>
            {!isAdmin ? (
              <Typography variant="body2" color="text.secondary">
                The company-wide coverage heatmap is visible to admins (you can only see your own availability).
              </Typography>
            ) : !template?.blocks?.length ? (
              <Typography variant="body2" color="text.secondary">
                Build a template first to see where availability is thin.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: `40px repeat(${heatmapHours.length}, 1fr)`, gap: '2px', minWidth: 560 }}>
                  <Box />
                  {heatmapHours.map((hour) => (
                    <Typography key={hour} variant="caption" align="center" sx={{ fontSize: 9 }}>
                      {hour % 12 === 0 ? 12 : hour % 12}
                      {hour >= 12 ? 'p' : 'a'}
                    </Typography>
                  ))}
                  {DAY_NAMES.map((dayName, dow) => (
                    <React.Fragment key={dayName}>
                      <Typography variant="caption">{dayName}</Typography>
                      {heatmapHours.map((hour, i) => {
                        const count = heatmap.counts[dow][i];
                        const need = heatmap.needs[dow][i];
                        return (
                          <Tooltip key={hour} title={need ? `${count} available / needs up to ${need}` : 'No template need'}>
                            <Box
                              sx={{
                                height: 18,
                                borderRadius: 0.5,
                                bgcolor: cellColor(count, need),
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </Box>
                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  <Chip size="small" label="covered" sx={{ bgcolor: 'rgba(46,125,50,0.35)' }} />
                  <Chip size="small" label="thin" sx={{ bgcolor: 'rgba(237,108,2,0.4)' }} />
                  <Chip size="small" label="nobody available" sx={{ bgcolor: 'rgba(211,47,47,0.45)' }} />
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={slotDialog} onClose={() => setSlotDialog(false)}>
        <DialogTitle>Add weekly availability</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 360 }}>
            <FormControl fullWidth>
              <InputLabel>Day</InputLabel>
              <Select
                label="Day"
                value={slotDraft.day_of_week}
                onChange={(e) => setSlotDraft({ ...slotDraft, day_of_week: Number(e.target.value) })}
              >
                {DAY_NAMES.map((name, dow) => (
                  <MenuItem key={name} value={dow}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField
                label="From"
                type="time"
                fullWidth
                value={slotDraft.start_time}
                onChange={(e) => setSlotDraft({ ...slotDraft, start_time: e.target.value })}
              />
              <TextField
                label="To"
                type="time"
                fullWidth
                value={slotDraft.end_time}
                onChange={(e) => setSlotDraft({ ...slotDraft, end_time: e.target.value })}
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Preference</InputLabel>
              <Select
                label="Preference"
                value={slotDraft.preference}
                onChange={(e) => setSlotDraft({ ...slotDraft, preference: String(e.target.value) })}
              >
                <MenuItem value="preferred">Preferred</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="if_needed">If needed</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSlotDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={addSlot} disabled={isAdmin && !targetEmployee}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exceptionDialog} onClose={() => setExceptionDialog(false)}>
        <DialogTitle>Add date exception</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 360 }}>
            <TextField
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={exceptionDraft.date}
              onChange={(e) => setExceptionDraft({ ...exceptionDraft, date: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={exceptionDraft.is_available}
                  onChange={(e) => setExceptionDraft({ ...exceptionDraft, is_available: e.target.checked })}
                />
              }
              label={exceptionDraft.is_available ? 'Extra availability this date' : 'Unavailable this date (time off)'}
            />
            <TextField
              label="Reason (optional)"
              value={exceptionDraft.reason}
              onChange={(e) => setExceptionDraft({ ...exceptionDraft, reason: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExceptionDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={addException} disabled={!exceptionDraft.date || (isAdmin && !targetEmployee)}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default AvailabilityTab;
