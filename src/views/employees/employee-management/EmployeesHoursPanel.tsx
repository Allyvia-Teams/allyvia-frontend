// icons
import { IconClockHour4 } from '@tabler/icons-react';

// project imports
import { Panel, PanelMessage } from 'ui-component/frame';
import { useEmployeeRangeStats } from 'views/dashboard/useEmployeeRangeStats';
import { getDateRangeFromRange } from 'utils/dashboardRange';
import EmployeesHoursTable from './EmployeesHoursTable';

// ==============================|| EMPLOYEES - HOURS & LABOR COST ||============================== //
// The per-employee hours table that used to sit inside the dashboard's
// Employees card (design handoff Part 2 moved it here). Fixed to the last 30
// days; the dashboard's strip carries the range-scoped totals.

export default function EmployeesHoursPanel() {
  const { employeesWithStats, isLoading, isError } = useEmployeeRangeStats(getDateRangeFromRange('30d'));

  return (
    <Panel title="Hours and labor cost" icon={<IconClockHour4 size={17} stroke={1.75} />} note="Last 30 days">
      {isError ? (
        <PanelMessage tone="error">Couldn&apos;t load employee hours right now.</PanelMessage>
      ) : (
        <EmployeesHoursTable employees={employeesWithStats} isLoading={isLoading} />
      )}
    </Panel>
  );
}
