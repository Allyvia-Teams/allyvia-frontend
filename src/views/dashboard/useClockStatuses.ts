import { useEffect, useState } from 'react';

// project imports
import { getCurrentUserClockStatus } from 'api/employee.api';
import type { EmployeeListItem } from 'types/employee';

// ==============================|| EMPLOYEES - WHO IS WORKING NOW ||============================== //
// One open time entry per employee means "working now". Fetched per active
// employee (there is no bulk endpoint), settled together so one failure marks
// only that employee unknown rather than blanking the whole table.

export type ClockStatus = 'working' | 'off' | 'inactive' | 'unknown';

export const useClockStatuses = (employees: EmployeeListItem[]) => {
  const [statuses, setStatuses] = useState<Record<string, ClockStatus>>({});
  const [loaded, setLoaded] = useState(false);

  const ids = employees.map((e) => `${e.id}:${e.status}`).join(',');

  useEffect(() => {
    let cancelled = false;
    if (employees.length === 0) {
      setStatuses({});
      setLoaded(true);
      return undefined;
    }
    setLoaded(false);
    const active = employees.filter((employee) => employee.status !== 'inactive');
    Promise.allSettled(active.map((employee) => getCurrentUserClockStatus(employee.id))).then((results) => {
      if (cancelled) return;
      const next: Record<string, ClockStatus> = {};
      employees.forEach((employee) => {
        if (employee.status === 'inactive') next[employee.id] = 'inactive';
      });
      results.forEach((result, index) => {
        const employee = active[index];
        if (result.status === 'fulfilled') next[employee.id] = result.value.data !== null ? 'working' : 'off';
        else next[employee.id] = 'unknown';
      });
      setStatuses(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // `ids` is the stable identity of the list; the array reference changes every render.
  }, [ids]);

  const workingCount = Object.values(statuses).filter((s) => s === 'working').length;
  const activeCount = employees.filter((e) => e.status !== 'inactive').length;

  return { statuses, workingCount, activeCount, loaded };
};
