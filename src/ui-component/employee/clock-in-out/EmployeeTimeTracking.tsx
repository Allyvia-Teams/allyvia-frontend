import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'store';
import { useSearchParams } from 'react-router-dom';
import { Box, Stack, Typography, Chip, IconButton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { AccessTime as AccessTimeIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { parseDate } from '@internationalized/date';
import {
  fetchEmployees,
  clockInEmployee,
  clockOutEmployee,
  fetchTimeEntries,
  fetchCurrentUserClockStatus,
  clearTimeTrackingError,
  setCurrentTimeEntry
} from 'store/slices/employee';
import { EmployeeListItem } from 'types/employee';
import { useIsAdmin } from 'hooks/usePermission';
import { ClockInControlPanel, WeeklyTimesheet, ClockTimer } from 'ui-component/employee';
import useAuth from 'hooks/useAuth';

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
  // ===== HOOKS & STATE =====
  const dispatch = useDispatch();
  const { allEmployees, loading: employeesLoading, timeTracking } = useSelector((state) => state.employee);
  const isAdmin = useIsAdmin();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== URL PARAMS & INITIAL SETUP =====
  const initialEmployeeId = searchParams.get('employee_id') || '';
  const initialEmployee = allEmployees.find((emp) => emp.id === initialEmployeeId) || null;

  // ===== COMPONENT STATE =====
  const [selectedClockEmployee, setSelectedClockEmployee] = useState<EmployeeListItem | null>(
    isAdmin ? allEmployees[0] || null : initialEmployee
  );
  const [timesheetSelectedEmployee, setTimesheetSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [note, setNote] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [timesheetRefreshTrigger, setTimesheetRefreshTrigger] = useState(0);

  // ===== DATE RANGE SETUP =====
  const LAST_WEEK = parseDate(new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const TODAY = parseDate(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState<RangeValue>({
    start: LAST_WEEK,
    end: TODAY
  });

  // ===== DERIVED STATE =====
  const openEntry = timeTracking.currentEntry;
  const currentUserEntry = timeTracking.currentUserEntry; // Current user's active clock
  const timeEntries = timeTracking.timeEntries;
  const loading = timeTracking.loading;
  const err = timeTracking.error;

  // Status for selected employee vs current user
  const status: 'in' | 'out' = openEntry?.clock_out ? 'out' : openEntry ? 'in' : 'out';
  const currentUserStatus: 'in' | 'out' = currentUserEntry?.clock_out ? 'out' : currentUserEntry ? 'in' : 'out';

  // Check if current user is an employee (for non-admin timesheet access)
  const currentUserEmployee = allEmployees.find((emp) => emp.email === user?.email);
  // Always show timesheet (both admin and non-admin users should see timesheet)
  const shouldShowTimesheet = true;

  // Debug logging
  console.log('Timesheet visibility check:', {
    isAdmin,
    userEmail: user?.email,
    userName: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.last_name,
    allEmployeesCount: allEmployees.length,
    currentUserEmployee: currentUserEmployee?.full_name,
    shouldShowTimesheet,
    allEmployees: allEmployees.slice(0, 3).map((emp) => ({ id: emp.id, email: emp.email, name: emp.full_name }))
  });

  // ===== EFFECTS =====

  // Load employees on component mount (for all users - needed for name display)
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Fetch current user's clock status on component mount
  useEffect(() => {
    dispatch(fetchCurrentUserClockStatus());
  }, [dispatch]);

  // Fetch clock status when selected employee changes (for admins)
  useEffect(() => {
    if (isAdmin && selectedClockEmployee) {
      dispatch(fetchCurrentUserClockStatus(selectedClockEmployee.id));
    }
  }, [dispatch, isAdmin, selectedClockEmployee]);

  // ===== FUNCTIONS =====

  // Handle timesheet employee selection change
  const handleTimesheetEmployeeChange = (employee: EmployeeListItem | null) => {
    setTimesheetSelectedEmployee(employee);
  };

  // Refresh timesheet data based on current user/employee and date range
  const refreshTimeEntries = useCallback(async () => {
    dispatch(clearTimeTrackingError());

    if (!isAdmin) {
      // Member mode: fetch own timesheet
      const { start, end } = dayBoundsToUtc(dateRange);
      dispatch(fetchTimeEntries({ start, end }));
    }
  }, [dispatch, isAdmin, dateRange]);

  // ===== ADDITIONAL EFFECTS =====

  // Auto-refresh when date range changes (for members only)
  useEffect(() => {
    refreshTimeEntries();
  }, [dateRange, isAdmin, refreshTimeEntries]);

  // Real-time timer for current user's entry (persists when switching employees)
  useEffect(() => {
    if (currentUserEntry && !currentUserEntry.clock_out && currentUserEntry.clock_in) {
      const start = new Date(currentUserEntry.clock_in).getTime();
      const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    } else {
      setElapsed(0);
    }
  }, [currentUserEntry]);

  // ===== CLOCK ACTIONS =====

  // Handle clock in action
  const doClockIn = async () => {
    dispatch(clearTimeTrackingError());

    // Validate admin has selected employee
    if (isAdmin && !selectedClockEmployee) {
      dispatch(setCurrentTimeEntry(null));
      return;
    }

    // Prepare data for API call
    const data = isAdmin && selectedClockEmployee ? { employee_id: selectedClockEmployee.id } : {};

    try {
      await dispatch(clockInEmployee(data));

      // Refresh clock status after successful clock in
      if (isAdmin && selectedClockEmployee) {
        dispatch(fetchCurrentUserClockStatus(selectedClockEmployee.id));
      } else {
        dispatch(fetchCurrentUserClockStatus());
      }
    } catch (error) {
      console.error('Clock in failed:', error);
    }
  };

  // Handle clock out action
  const doClockOut = async () => {
    dispatch(clearTimeTrackingError());

    // Validate admin has selected employee
    if (isAdmin && !selectedClockEmployee) {
      dispatch(setCurrentTimeEntry(null));
      return;
    }

    // Prepare data for API call
    const data = isAdmin && selectedClockEmployee ? { employee_id: selectedClockEmployee.id } : {};

    try {
      await dispatch(clockOutEmployee({ note: note || undefined, data }));
      setNote('');

      // Refresh clock status after successful clock out
      if (isAdmin && selectedClockEmployee) {
        dispatch(fetchCurrentUserClockStatus(selectedClockEmployee.id));
      } else {
        dispatch(fetchCurrentUserClockStatus());
      }

      // Auto-refresh timesheet after successful clock out
      setTimeout(() => {
        refreshTimeEntries();
        // Trigger timesheet refresh for admin users
        setTimesheetRefreshTrigger((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Clock out failed:', error);
    }
  };

  // Don't show the page if there are no employees (for admins)
  if (isAdmin && allEmployees.length === 0 && !employeesLoading) {
    return (
      <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MainCard
          title={
            <Stack direction="row" alignItems="center" gap={2}>
              <Typography variant="h3" fontWeight={700}>
                Clock In / Out
              </Typography>
            </Stack>
          }
          sx={{
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'grey.200',
            textAlign: 'center',
            p: 4
          }}
        >
          <Typography variant="h6" color="text.secondary">
            No employees found. Please add employees first to use the clock in/out feature.
          </Typography>
        </MainCard>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Clock In/Out Card */}
      <MainCard
        title={
          <Stack direction="row" alignItems="center" gap={2}>
            <Typography variant="h3" fontWeight={700}>
              Clock In / Out
            </Typography>
          </Stack>
        }
        sx={{
          mb: 3,
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'grey.200'
        }}
      >
        {/* Timer - Only show when employee is selected (admin) or always (member) */}
        {(!isAdmin || selectedClockEmployee) && (
          <ClockTimer
            elapsed={elapsed}
            status={currentUserStatus}
            lastIn={currentUserEntry?.clock_in}
            lastOut={currentUserEntry?.clock_out}
          />
        )}

        {/* Clock In Control Panel */}
        <Box sx={{ mt: 2 }}>
          <ClockInControlPanel
            employees={allEmployees}
            selectedEmployee={selectedClockEmployee}
            onEmployeeChange={setSelectedClockEmployee}
            employeesLoading={employeesLoading}
            status={currentUserStatus}
            loading={loading}
            note={note}
            onNoteChange={setNote}
            onClockIn={doClockIn}
            onClockOut={doClockOut}
            error={err}
            isAdmin={isAdmin}
          />
        </Box>
      </MainCard>

      {/* Weekly Timesheet Section */}
      {shouldShowTimesheet && <WeeklyTimesheet isAdmin={isAdmin} refreshTrigger={timesheetRefreshTrigger} />}
    </Box>
  );
}
