// material-ui
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'store';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, mediumWidgetHeight, smallWidgetHeight } from 'store/constant';
import { DashboardRange } from 'ui-component/common/DashboardRangeSelector';
import { getDateRangeFromRange } from 'utils/dashboardRange';
// assets
import EmployeesTable from './EmployeesTable';
import { ErrorSkeleton } from 'ui-component/UISkeleton';
import { fetchEmployees, fetchAllEmployeesTimeEntries } from 'store/slices/employee';

export const EmployeesSection = ({ range }: { range: DashboardRange }) => {
  const dispatch = useDispatch();
  const { allEmployees: employees, timeTracking } = useSelector((state) => state.employee);
  const { currentRole } = useSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [stats, setStats] = useState({
    hoursWorked: '0h 0m',
    timeOffRequests: 0,
    costOfLabor: '$0.00',
    hoursAvailable: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setIsError(false);

        await dispatch(fetchEmployees());

        const { startDate, endDate } = getDateRangeFromRange(range);

        const params: any = {};
        if (startDate) params.start = startDate;
        if (endDate) params.end = endDate;

        await dispatch(fetchAllEmployeesTimeEntries(params));
      } catch (error) {
        console.error('Error fetching employee data:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dispatch, currentRole, range]);

  useEffect(() => {
    try {
      const { timeEntries } = timeTracking;

      const { startDate, endDate } = getDateRangeFromRange(range);
      const startStr = startDate;
      const endStr = endDate;

      // If timeEntries is not an array, return early
      if (!Array.isArray(timeEntries) || timeEntries.length === 0) {
        setStats((prev) => ({
          ...prev,
          hoursWorked: '0h 0m'
        }));
        return;
      }

      // Filter time entries based on date range
      const filteredTimeEntries = timeEntries.filter((entry) => {
        const entryDateStr = entry.created_at ? entry.created_at.split('T')[0] : entry.clock_in.split('T')[0];

        if (startStr && endStr) {
          return entryDateStr >= startStr && entryDateStr <= endStr;
        }
        if (startStr) {
          return entryDateStr >= startStr;
        }
        if (endStr) {
          return entryDateStr <= endStr;
        }
        return true;
      });

      // Calculate total hours worked
      const totalSeconds = filteredTimeEntries.reduce((sum, entry) => {
        return sum + (entry.duration_seconds || 0);
      }, 0);

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      // Calculate cost of labor based on filtered time entries
      const totalCost = employees.reduce((sum, emp) => {
        // Find entries for this employee in the date range
        const empEntries = filteredTimeEntries.filter((entry) => entry.employee === emp.id);
        const empTotalSeconds = empEntries.reduce((entrySum, entry) => {
          return entrySum + (entry.duration_seconds || 0);
        }, 0);
        const empHours = empTotalSeconds / 3600;
        return sum + (emp.rate || 0) * empHours;
      }, 0);

      // Calculate available hours based on date range
      // Count business days in range (Monday-Friday)
      let businessDays = 0;
      if (startStr && endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        let current = new Date(start);

        while (current <= end) {
          const dayOfWeek = current.getDay();
          // 0 = Sunday, 6 = Saturday
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            businessDays++;
          }
          current.setDate(current.getDate() + 1);
        }
      } else {
        // Default to 5 business days if no date range
        businessDays = 5;
      }

      const availableHours = employees.length * businessDays * 8; // Assuming 8 hour workdays

      console.log('Calculated stats:', { hours, minutes, totalCost, availableHours, businessDays });

      setStats({
        hoursWorked: `${hours}h ${minutes}m`,
        timeOffRequests: 0,
        costOfLabor: `$${totalCost.toFixed(2)}`,
        hoursAvailable: availableHours
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
      setIsError(true);
    }
  }, [employees, timeTracking, range]);

  const employeesWithRangeStats = employees.map((emp) => {
    const { startDate, endDate } = getDateRangeFromRange(range);
    const timeEntries = Array.isArray(timeTracking.timeEntries) ? timeTracking.timeEntries : [];
    const empEntries = timeEntries.filter((entry) => {
      if (entry.employee !== emp.id) return false;
      const entryDateStr = entry.created_at ? entry.created_at.split('T')[0] : entry.clock_in.split('T')[0];
      return entryDateStr >= startDate && entryDateStr <= endDate;
    });
    const empTotalSeconds = empEntries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
    const empHours = empTotalSeconds / 3600;
    return {
      ...emp,
      total_hours: empHours,
      total_spend: (emp.rate || 0) * empHours
    };
  });

  const employeeWidgetsSm = {
    isLoading: isLoading,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  return (
    <Grid size={12}>
      <MainCard title="Employees">
        {isError ? (
          <ErrorSkeleton height={mediumWidgetHeight} />
        ) : (
          <Grid container spacing={gridSpacing}>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <TotalIncomeDarkCard {...employeeWidgetsSm} value={stats.hoursWorked} title={'Hours Worked'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <TotalIncomeDarkCard {...employeeWidgetsSm} value={stats.timeOffRequests} title={'Time Off Requests'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <TotalIncomeDarkCard {...employeeWidgetsSm} value={stats.costOfLabor} title={'Cost of Scheduled Labor'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <TotalIncomeDarkCard {...employeeWidgetsSm} value={stats.hoursAvailable} title={'Hours Available'} />
            </Grid>
            <Grid size={12}>
              <EmployeesTable employees={employeesWithRangeStats} isLoading={isLoading} />
            </Grid>
          </Grid>
        )}
      </MainCard>
    </Grid>
  );
};
