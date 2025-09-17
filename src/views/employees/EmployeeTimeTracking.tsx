import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'store';
import { useSearchParams } from 'react-router-dom';
import { Box, Card, CardContent, CardHeader, Stack, Typography, Chip, IconButton } from '@mui/material';
import { Clock, RefreshCw } from 'lucide-react';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { parseDate } from '@internationalized/date';
import {
  fetchEmployees,
  clockInEmployee,
  clockOutEmployee,
  fetchTimeEntries,
  clearTimeTrackingError,
  setCurrentTimeEntry
} from 'store/slices/employee';
import { EmployeeListItem } from 'types/employee';
import { useIsAdmin } from 'hooks/usePermission';
import { EmployeeSelector, ClockTimer, ClockActions, TimesheetSection } from './components';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

const hhmm = (sec?: number | null) => {
  if (typeof sec !== 'number') return '—';
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
};

const dayBoundsToUtc = (dateRange: RangeValue) => {
  const startUtc = new Date(`${dateRange.start.toString()}T00:00:00`);
  const endUtcExcl = new Date(`${dateRange.end.toString()}T00:00:00`);
  endUtcExcl.setDate(endUtcExcl.getDate() + 1);
  return { start: startUtc.toISOString(), end: endUtcExcl.toISOString() };
};

export default function EmployeeTimeTracking() {
  const dispatch = useDispatch();
  const { allEmployees, loading: employeesLoading, timeTracking } = useSelector((state) => state.employee);
  const isAdmin = useIsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL params for admin
  const initialEmployeeId = searchParams.get('employee_id') || '';
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  // Find initial employee from URL params
  const initialEmployee = allEmployees.find((emp) => emp.id === initialEmployeeId) || null;

  // Clock In/Out selector - pre-select first employee for admin
  const [selectedClockEmployee, setSelectedClockEmployee] = useState<EmployeeListItem | null>(
    isAdmin && allEmployees.length > 0 ? allEmployees[0] : initialEmployee
  );
  const [note, setNote] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Set default to last 7 days
  const LAST_WEEK = parseDate(new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const TODAY = parseDate(new Date().toISOString().split('T')[0]);

  const [dateRange, setDateRange] = useState<RangeValue>({
    start: LAST_WEEK,
    end: TODAY
  });

  const openEntry = timeTracking.currentEntry;
  const timeEntries = timeTracking.timeEntries;
  const loading = timeTracking.loading;
  const err = timeTracking.error;
  const status: 'in' | 'out' = openEntry?.clock_out ? 'out' : openEntry ? 'in' : 'out';

  // Load employees on component mount (for admin)
  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, isAdmin]);

  // Pre-select first employee for clock in/out when employees are loaded
  useEffect(() => {
    if (isAdmin && allEmployees.length > 0 && !selectedClockEmployee) {
      setSelectedClockEmployee(allEmployees[0]);
    }
  }, [allEmployees, isAdmin, selectedClockEmployee]);

  const refreshTimeEntries = useCallback(async () => {
    dispatch(clearTimeTrackingError());

    if (!isAdmin) {
      // Member mode: fetch own timesheet
      const { start, end } = dayBoundsToUtc(dateRange);
      dispatch(fetchTimeEntries({ start, end }));
    }
  }, [dispatch, isAdmin, dateRange]);

  // Auto-refresh when date range changes (for members only)
  useEffect(() => {
    refreshTimeEntries();
  }, [dateRange, isAdmin, refreshTimeEntries]);

  // Real-time timer for current entry
  useEffect(() => {
    if (openEntry && !openEntry.clock_out && openEntry.clock_in) {
      const start = new Date(openEntry.clock_in).getTime();
      const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    } else {
      setElapsed(0);
    }
  }, [openEntry]);

  const doClockIn = async () => {
    dispatch(clearTimeTrackingError());

    if (isAdmin && !selectedClockEmployee) {
      dispatch(setCurrentTimeEntry(null));
      return;
    }

    const data = isAdmin && selectedClockEmployee ? { employee_id: selectedClockEmployee.id } : {};

    dispatch(clockInEmployee(data));
  };

  const doClockOut = async () => {
    dispatch(clearTimeTrackingError());

    if (isAdmin && !selectedClockEmployee) {
      dispatch(setCurrentTimeEntry(null));
      return;
    }

    const data = isAdmin && selectedClockEmployee ? { employee_id: selectedClockEmployee.id } : {};

    try {
      await dispatch(clockOutEmployee({ note: note || undefined, data }));
      setNote('');
      // Auto-refresh timesheet after successful clock out
      setTimeout(() => {
        refreshTimeEntries();
      }, 1000);
    } catch (error) {
      console.error('Clock out failed:', error);
    }
  };

  return (
    <Box>
      {/* Clock In/Out Card */}
      <Card sx={{ borderRadius: 3, mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'inline-flex' }}>
                <Clock size={18} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {isAdmin ? 'Admin Clock In / Out' : 'Clock In / Out'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isAdmin
                    ? selectedClockEmployee
                      ? `Managing: ${selectedClockEmployee.full_name}`
                      : 'Select an employee to manage'
                    : status === 'in'
                      ? 'You are clocked in'
                      : 'You are clocked out'}
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" gap={1} sx={{ ml: 'auto' }}>
                {(!isAdmin || selectedClockEmployee) && (
                  <Chip
                    label={status === 'in' ? 'Clocked in' : 'Clocked out'}
                    color={status === 'in' ? 'success' : 'default'}
                    size="small"
                  />
                )}
                <IconButton onClick={refreshTimeEntries} size="small" disabled={loading} sx={{ ml: 1 }}>
                  <RefreshCw size={16} />
                </IconButton>
              </Stack>
            </Stack>
          }
        />
        <CardContent>
          {/* Clock In/Out Employee Selection - Only for Admin */}
          {isAdmin && (
            <EmployeeSelector
              employees={allEmployees}
              selectedEmployee={selectedClockEmployee}
              onEmployeeChange={setSelectedClockEmployee}
              loading={employeesLoading}
              label="Select Employee for Clock In/Out"
            />
          )}

          {/* Timer - Only show when employee is selected (admin) or always (member) */}
          {(!isAdmin || selectedClockEmployee) && (
            <ClockTimer elapsed={elapsed} status={status} lastIn={openEntry?.clock_in} lastOut={openEntry?.clock_out} />
          )}

          {/* Actions */}
          <ClockActions
            status={status}
            loading={loading}
            note={note}
            onNoteChange={setNote}
            onClockIn={doClockIn}
            onClockOut={doClockOut}
            error={err}
            isAdmin={isAdmin}
            hasSelectedEmployee={!!selectedClockEmployee}
          />
        </CardContent>
      </Card>

      {/* Timesheet Section */}
      <TimesheetSection isAdmin={isAdmin} dateRange={dateRange} onDateRangeChange={setDateRange} />
    </Box>
  );
}
