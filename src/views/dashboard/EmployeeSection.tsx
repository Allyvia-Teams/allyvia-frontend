// material-ui
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'store';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, mediumWidgetHeight, smallWidgetHeight } from 'store/constant';
import { type RangeValue } from 'ui-component/third-party/DateRangePicker';
// assets
import EmployeesTable from './EmployeesTable';
import { ErrorSkeleton } from 'ui-component/UISkeleton';
import { fetchEmployees, fetchAllEmployeesTimeEntries } from 'store/slices/employee';

export const EmployeesSection = ({ dateRange }: { dateRange: RangeValue }) => {
  const dispatch = useDispatch();
  // const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
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
        console.log('dateRange', dateRange);
        setIsLoading(true);
        setIsError(false);

        await dispatch(fetchEmployees());

        // Fetch time entries to calculate stats
        await dispatch(fetchAllEmployeesTimeEntries({}));
      } catch (error) {
        console.error('Error fetching employee data:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dispatch, currentRole]);

  useEffect(() => {
    try {
      const { timeEntries } = timeTracking;
      console.log('timeTracking', timeTracking);
      console.log('timeEntries', timeEntries);
      // Calculate total hours worked
      const totalSeconds = timeEntries.reduce((sum, entry) => {
        return sum + (entry.duration_seconds || 0);
      }, 0);

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      // Calculate cost of labor (simplified - you may want to enhance this)
      const totalCost = employees.reduce((sum, emp) => {
        const empHours = totalSeconds / 3600; // Simplified calculation
        return sum + (emp.rate || 0) * empHours;
      }, 0);

      // Calculate available hours (example: total employees * 40 hours/week)
      const availableHours = employees.length * 40;

      setStats({
        hoursWorked: `${hours}h ${minutes}m`,
        timeOffRequests: 0, // This would come from a separate API
        costOfLabor: `$${totalCost.toFixed(2)}`,
        hoursAvailable: availableHours
      });
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, employees, timeTracking]);

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
              {/* <EmployeesTable employees={employees} isLoading={isLoading} companyId={companyId} /> */}
              <EmployeesTable employees={employees} isLoading={isLoading} />
            </Grid>
          </Grid>
        )}
      </MainCard>
    </Grid>
  );
};
