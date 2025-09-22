import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'store';
import { useSearchParams } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { parseDate } from '@internationalized/date';
import { EmployeeListItem } from 'types/employee';
import { useIsAdmin } from 'hooks/usePermission';
import { ClockInControlPanel, WeeklyTimesheet, ClockTimer } from 'ui-component/employee';
import useAuth from 'hooks/useAuth';

// Import new clean slices
import { fetchEmployees } from 'store/slices/employee';
import { fetchClockStatus, clockIn, clockOut, setSelectedEmployeeId, restoreSelectedEmployeeId } from 'store/slices/clock-in-out';
import { fetchTimesheet } from 'store/slices/timesheet';

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
  const isAdmin = useIsAdmin();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ===== NEW REDUX SELECTORS =====
  const role = useSelector((state) => state.auth.currentRole?.role_type);
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const employees = useSelector((state) => state.employee.allEmployees);
  const employeesLoading = useSelector((state) => state.employee.loading);
  const selectedEmployeeId = useSelector((state) => state.clockInOut.selectedEmployeeId);

  const clockStatus = useSelector((state) => state.clockInOut.status);
  const clockLoading = useSelector((state) => state.clockInOut.loading);
  const timesheetData = useSelector((state) => state.timesheet.data);
  const timesheetLoading = useSelector((state) => state.timesheet.loading);

  // ===== URL PARAMS & INITIAL SETUP =====
  const initialEmployeeId = searchParams.get('employee_id') || '';
  const initialEmployee = employees.find((emp) => emp.id === initialEmployeeId) || null;

  // ===== COMPONENT STATE =====
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
  const currentUserEntry = clockStatus; // Current user's active clock from new slice
  const timeEntries = timesheetData?.entries || [];
  const loading = clockLoading;
  const err = null; // Error handling will be updated

  // Status for current user
  const currentUserStatus: 'in' | 'out' = currentUserEntry?.clock_out ? 'out' : currentUserEntry ? 'in' : 'out';

  // Check if current user is an employee (for non-admin timesheet access)
  const currentUserEmployee = employees.find((emp) => emp.email === user?.email);
  // Always show timesheet (both admin and non-admin users should see timesheet)
  const shouldShowTimesheet = true;

  // Get selected employee for clock actions
  const selectedClockEmployee = selectedEmployeeId ? employees.find((emp) => emp.id === selectedEmployeeId) : null;

  // ===== EFFECTS =====

  // Restore persisted employee selection on mount
  useEffect(() => {
    dispatch(restoreSelectedEmployeeId());
  }, [dispatch]);

  // Load employees once companyId is available
  useEffect(() => {
    if (companyId && role === 'admin') {
      dispatch(fetchEmployees());
    }
  }, [companyId, role, dispatch]);

  // If admin and no selection yet, pick the first after employees load
  // Also ensure there's always a selection when employees are available
  useEffect(() => {
    if (role === 'admin' && !employeesLoading && employees.length > 0) {
      // If no selection, select first employee
      if (!selectedEmployeeId) {
        dispatch(setSelectedEmployeeId(employees[0].id));
      }
      // If selected employee is not in current list, select first employee
      else if (!employees.find((emp) => emp.id === selectedEmployeeId)) {
        dispatch(setSelectedEmployeeId(employees[0].id));
      }
    }
  }, [role, employeesLoading, employees, selectedEmployeeId, dispatch]);

  // Decide the target for clock/timesheet
  const targetId: string | 'self' = role === 'admin' ? (selectedEmployeeId ?? (employees.length > 0 ? employees[0].id : 'self')) : 'self';

  // Fetch clock + timesheet only when prerequisites exist
  useEffect(() => {
    const canFetchClock = (role === 'member' && !!companyId) || (role === 'admin' && !!companyId && employees.length > 0);

    if (canFetchClock) {
      dispatch(fetchClockStatus(targetId));
      dispatch(
        fetchTimesheet({
          weekStartISO: new Date().toISOString(),
          employeeId: role === 'admin' ? (selectedEmployeeId ?? (employees.length > 0 ? employees[0].id : undefined)) : undefined
        })
      );
    }
  }, [role, companyId, selectedEmployeeId, employees.length, targetId, dispatch]);

  // ===== FUNCTIONS =====

  // Handle timesheet employee selection change
  const handleTimesheetEmployeeChange = (employee: EmployeeListItem | null) => {
    dispatch(setSelectedEmployeeId(employee?.id || null));
  };

  // Refresh timesheet data based on current user/employee and date range
  const refreshTimeEntries = useCallback(async () => {
    if (!isAdmin && companyId) {
      // Member mode: fetch own timesheet
      dispatch(
        fetchTimesheet({
          weekStartISO: new Date().toISOString(),
          employeeId: undefined
        })
      );
    }
  }, [dispatch, isAdmin, companyId]);

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
    // Validate admin has selected employee
    if (isAdmin && !selectedClockEmployee) {
      return;
    }

    try {
      const employeeId = isAdmin && selectedClockEmployee ? selectedClockEmployee.id : 'self';
      await dispatch(clockIn({ employeeId, note: note || undefined }));
      setNote('');

      // Refresh clock status after successful clock in
      dispatch(fetchClockStatus(targetId));
    } catch (error) {}
  };

  // Handle clock out action
  const doClockOut = async () => {
    // Validate admin has selected employee
    if (isAdmin && !selectedClockEmployee) {
      return;
    }

    try {
      const employeeId = isAdmin && selectedClockEmployee ? selectedClockEmployee.id : 'self';
      await dispatch(clockOut({ employeeId, note: note || undefined }));
      setNote('');

      // Refresh clock status after successful clock out
      dispatch(fetchClockStatus(targetId));

      // Auto-refresh timesheet after successful clock out
      setTimeout(() => {
        dispatch(
          fetchTimesheet({
            weekStartISO: new Date().toISOString(),
            employeeId: role === 'admin' ? (selectedEmployeeId ?? undefined) : undefined
          })
        );
        setTimesheetRefreshTrigger((prev) => prev + 1);
      }, 1000);
    } catch (error) {}
  };

  // Don't show the page if there are no employees (for admins)
  if (isAdmin && employees.length === 0 && !employeesLoading) {
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
            employees={employees}
            selectedEmployee={selectedClockEmployee || null}
            onEmployeeChange={(employee) => dispatch(setSelectedEmployeeId(employee?.id || null))}
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
