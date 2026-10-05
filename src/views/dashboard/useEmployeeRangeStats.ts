import { useEffect, useMemo, useState } from 'react';

// project imports
import { useDispatch, useSelector } from 'store';
import { fetchAllEmployeesTimeEntries, fetchEmployees } from 'store/slices/employee';
import type { IsoWindow } from './dashboardRange';
import type { EmployeeListItem } from 'types/employee';

export interface EmployeeRangeStats {
  totalSeconds: number;
  hoursWorked: string;
  costOfLabor: number;
}

export type EmployeeWithRangeStats = EmployeeListItem & { total_hours: number; total_spend: number };

const inRange = (dateStr: string | undefined, start: string, end: string) => !!dateStr && dateStr >= start && dateStr <= end;

import { formatHours } from './employeeDisplay';
export { formatHours } from './employeeDisplay';

// ==============================|| EMPLOYEES - RANGE STATS ||============================== //
// Hours worked and labor cost over a dashboard range, from the
// company's employees and their time entries. Shared by the dashboard's
// Employees panel and the Employees view's hours table (design handoff Part 2
// moved the table there).

export const useEmployeeRangeStats = ({ startDate, endDate }: IsoWindow) => {
  const dispatch = useDispatch();
  const { allEmployees: employees, timeTracking } = useSelector((state) => state.employee);
  const { currentRole } = useSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        await dispatch(fetchEmployees());
        await dispatch(fetchAllEmployeesTimeEntries({ start: startDate, end: endDate }));
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

  const entries = useMemo(() => {
    const all = Array.isArray(timeTracking.timeEntries) ? timeTracking.timeEntries : [];
    return all.filter((entry) => inRange((entry.created_at ?? entry.clock_in)?.split('T')[0], startDate, endDate));
  }, [timeTracking.timeEntries, startDate, endDate]);

  const employeesWithStats: EmployeeWithRangeStats[] = useMemo(
    () =>
      employees.map((emp) => {
        const seconds = entries.filter((entry) => entry.employee === emp.id).reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
        const hours = seconds / 3600;
        return { ...emp, total_hours: hours, total_spend: (emp.rate || 0) * hours };
      }),
    [employees, entries]
  );

  const stats: EmployeeRangeStats = useMemo(() => {
    const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
    const costOfLabor = employeesWithStats.reduce((sum, emp) => sum + emp.total_spend, 0);
    return { totalSeconds, hoursWorked: formatHours(totalSeconds), costOfLabor };
  }, [entries, employeesWithStats]);

  return { stats, employeesWithStats, isLoading, isError };
};
