import { useEffect, useMemo, useState } from 'react';

// project imports
import { useDispatch, useSelector } from 'store';
import { fetchAllEmployeesTimeEntries, fetchEmployees } from 'store/slices/employee';
import type { IsoWindow } from './dashboardRange';
import type { EmployeeListItem } from 'types/employee';
import { entrySeconds, formatHours, localDayBounds } from './employeeDisplay';

export { formatHours } from './employeeDisplay';

export interface EmployeeRangeStats {
  totalSeconds: number;
  hoursWorked: string;
  costOfLabor: number;
}

export type EmployeeWithRangeStats = EmployeeListItem & { total_hours: number; total_spend: number };

// ==============================|| EMPLOYEES - RANGE STATS ||============================== //
// Hours worked and labor cost over a dashboard range, from the
// company's employees and their time entries. Shared by the dashboard's
// Employees panel and the Employees view's hours table (design handoff Part 2
// moved the table there).
//
// The window is calendar days in the viewer's zone, so it is sent to the
// backend as local-midnight / local-end-of-day instants and the server does
// the `clock_in` filtering. There is deliberately no second filter here: the
// old one keyed on `created_at` (a manual entry typed in on Saturday for a
// Friday shift landed on Saturday) and on the UTC date (a 7:53 pm shift
// landed on the next day). Open entries count the time since clock-in.

export const useEmployeeRangeStats = ({ startDate, endDate }: IsoWindow) => {
  const dispatch = useDispatch();
  const { allEmployees: employees, timeTracking } = useSelector((state) => state.employee);
  const { currentRole } = useSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        await dispatch(fetchEmployees());
        await dispatch(fetchAllEmployeesTimeEntries(localDayBounds({ startDate, endDate })));
        if (!cancelled) setLoadedAt(Date.now());
      } catch (error) {
        console.error('Error fetching employee data:', error);
        if (!cancelled) setIsError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [dispatch, currentRole, startDate, endDate]);

  const entries = useMemo(() => (Array.isArray(timeTracking.timeEntries) ? timeTracking.timeEntries : []), [timeTracking.timeEntries]);

  const employeesWithStats: EmployeeWithRangeStats[] = useMemo(
    () =>
      employees.map((emp) => {
        const seconds = entries.filter((entry) => entry.employee === emp.id).reduce((sum, entry) => sum + entrySeconds(entry, loadedAt), 0);
        const hours = seconds / 3600;
        return { ...emp, total_hours: hours, total_spend: (emp.rate || 0) * hours };
      }),
    [employees, entries, loadedAt]
  );

  const stats: EmployeeRangeStats = useMemo(() => {
    const totalSeconds = entries.reduce((sum, entry) => sum + entrySeconds(entry, loadedAt), 0);
    const costOfLabor = employeesWithStats.reduce((sum, emp) => sum + emp.total_spend, 0);
    return { totalSeconds, hoursWorked: formatHours(totalSeconds), costOfLabor };
  }, [entries, employeesWithStats, loadedAt]);

  return { stats, employeesWithStats, isLoading, isError };
};
