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
  hoursAvailable: number;
}

export type EmployeeWithRangeStats = EmployeeListItem & { total_hours: number; total_spend: number };

const inRange = (dateStr: string | undefined, start: string, end: string) => !!dateStr && dateStr >= start && dateStr <= end;

/** Business days (Mon–Fri) in an inclusive local date range. */
export const businessDaysBetween = (startStr: string, endStr: string): number => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  let days = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) days += 1;
    current.setDate(current.getDate() + 1);
  }
  return days;
};

export const formatHours = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

// ==============================|| EMPLOYEES - RANGE STATS ||============================== //
// Hours worked, labor cost and available hours over a dashboard range, from the
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
    // Available hours assume 8-hour weekdays for every employee in the range.
    const hoursAvailable = employees.length * businessDaysBetween(startDate, endDate) * 8;
    return { totalSeconds, hoursWorked: formatHours(totalSeconds), costOfLabor, hoursAvailable };
  }, [entries, employeesWithStats, employees.length, startDate, endDate]);

  return { stats, employeesWithStats, isLoading, isError };
};
