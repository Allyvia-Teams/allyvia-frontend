import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'store';
import { Box, Stack, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { useIsAdmin } from 'hooks/usePermission';
import { ClockInControlPanel, TimesheetCalendar, ClockTimer } from 'ui-component/employee';

// Import new clean slices
import { fetchEmployees } from 'store/slices/employee';
import { fetchClockStatus, clockIn, clockOut, setSelectedEmployeeId, restoreSelectedEmployeeId } from 'store/slices/clock-in-out';

export default function EmployeeTimeTracking() {
  // ===== HOOKS & STATE =====
  const dispatch = useDispatch();
  const isAdmin = useIsAdmin();

  // ===== NEW REDUX SELECTORS =====
  const role = useSelector((state) => state.auth.currentRole?.role_type);
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const employees = useSelector((state) => state.employee.allEmployees);
  const employeesLoading = useSelector((state) => state.employee.loading);
  const selectedEmployeeId = useSelector((state) => state.clockInOut.selectedEmployeeId);

  const clockStatus = useSelector((state) => state.clockInOut.status);
  const clockLoading = useSelector((state) => state.clockInOut.loading);
  const clockError = useSelector((state) => state.clockInOut.error);

  // ===== COMPONENT STATE =====
  const [note, setNote] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [timesheetRefreshTrigger, setTimesheetRefreshTrigger] = useState(0);

  // ===== DERIVED STATE =====
  const currentUserEntry = clockStatus; // Current user's active clock from new slice
  const loading = clockLoading;
  const err = clockError;

  // Status for current user
  const currentUserStatus: 'in' | 'out' = currentUserEntry?.clock_out ? 'out' : currentUserEntry ? 'in' : 'out';

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

  // Fetch clock status when prerequisites exist. Timesheet data is loaded by
  // TimesheetCalendar from the employee.timeTracking slice — the dedicated
  // timesheet slice is unused and was previously fetched with a wrong week.
  useEffect(() => {
    const canFetchClock =
      ((role === 'member' || role === 'manager') && !!companyId) || (role === 'admin' && !!companyId && employees.length > 0);

    if (canFetchClock) {
      dispatch(fetchClockStatus(targetId));
    }
  }, [role, companyId, selectedEmployeeId, employees.length, targetId, dispatch]);

  // ===== FUNCTIONS =====

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
      await dispatch(clockIn({ employeeId, note: note || undefined })).unwrap();
      setNote('');

      // Refresh clock status after successful clock in
      dispatch(fetchClockStatus(targetId));
    } catch {
      // Error is stored in Redux (clockInOut.error) and rendered by the panel
    }
  };

  // Handle clock out action
  const doClockOut = async () => {
    // Validate admin has selected employee
    if (isAdmin && !selectedClockEmployee) {
      return;
    }

    try {
      const employeeId = isAdmin && selectedClockEmployee ? selectedClockEmployee.id : 'self';
      await dispatch(clockOut({ employeeId, note: note || undefined })).unwrap();
      setNote('');

      // Refresh clock status after successful clock out
      dispatch(fetchClockStatus(targetId));

      // Auto-refresh the calendar timesheet after successful clock out
      setTimeout(() => {
        setTimesheetRefreshTrigger((prev) => prev + 1);
      }, 1000);
    } catch {
      // Error is stored in Redux (clockInOut.error) and rendered by the panel
    }
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

      {/* Calendar-based Timesheet Section */}
      {shouldShowTimesheet && <TimesheetCalendar isAdmin={isAdmin} refreshTrigger={timesheetRefreshTrigger} />}
    </Box>
  );
}
