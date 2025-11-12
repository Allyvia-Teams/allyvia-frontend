// Clean Redux-only Clock In/Out Page with proper orchestration
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'store';
import { fetchEmployees } from 'store/slices/employee';
import { fetchClockStatus, setSelectedEmployeeId, restoreSelectedEmployeeId } from 'store/slices/clock-in-out';
import { fetchTimesheet } from 'store/slices/timesheet';
import MainCard from 'ui-component/cards/MainCard';
import { EmployeeTimeTracking } from 'ui-component/employee';
import { Box, Typography, CircularProgress } from '@mui/material';
// Using native Date for week calculation instead of dayjs

export default function ClockInOutPage() {
  const dispatch = useDispatch();

  // Selectors
  const role = useSelector((state) => state.auth.currentRole?.role_type);
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const employees = useSelector((state) => state.employee.allEmployees);
  const employeesLoading = useSelector((state) => state.employee.loading);
  const selectedEmployeeId = useSelector((state) => state.clockInOut.selectedEmployeeId);

  const weekStartISO = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  }, []);

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
  useEffect(() => {
    if (role === 'admin' && !employeesLoading && employees.length > 0 && !selectedEmployeeId) {
      dispatch(setSelectedEmployeeId(employees[0].id));
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
          weekStartISO,
          employeeId: role === 'admin' ? (selectedEmployeeId ?? (employees.length > 0 ? employees[0].id : undefined)) : undefined
        })
      );
    }
  }, [role, companyId, selectedEmployeeId, employees.length, weekStartISO, targetId, dispatch]);

  // Show loading state while refreshing roles
  if (!companyId) {
    return (
      <MainCard>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Loading company information...
          </Typography>
        </Box>
      </MainCard>
    );
  }

  // Hide clock page if no employees (admin only)
  if (role === 'admin' && !employeesLoading && employees.length === 0) {
    return (
      <MainCard>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h4" gutterBottom color="textSecondary">
            No Employees Available
          </Typography>
          <Typography variant="body1" color="textSecondary">
            You need to add employees before you can use the clock in/out system.
          </Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <div className="p-6">
      <EmployeeTimeTracking />
    </div>
  );
}
