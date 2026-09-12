// icons
import { IconUsers } from '@tabler/icons-react';

// project imports
import { Panel, PanelMessage, StatsStrip, type StatCell } from 'ui-component/frame';
import EmployeesTable from './EmployeesTable';
import { useClockStatuses } from './useClockStatuses';
import { useEmployeeRangeStats } from './useEmployeeRangeStats';
import type { IsoWindow } from './dashboardRange';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ==============================|| DASHBOARD - EMPLOYEES ||============================== //
// Bottom of the main column (owner request): the range's hours and labor cost
// as a stats strip, who is working right now, and every employee beneath with
// their hours, cost and clock status. Labor is shown against revenue when the
// KPI row has one.

export const EmployeesSection = ({ window, windowLabel, revenue }: { window: IsoWindow; windowLabel: string; revenue?: number | null }) => {
  const { stats, employeesWithStats, isLoading, isError } = useEmployeeRangeStats(window);
  const clock = useClockStatuses(employeesWithStats);

  const laborShare = revenue && revenue > 0 ? `${((stats.costOfLabor / revenue) * 100).toFixed(1)}% of revenue` : 'Approved timecards only';

  const cells: StatCell[] = [
    { label: 'Hours worked', value: isLoading ? '—' : stats.hoursWorked, basis: `of ${stats.hoursAvailable.toLocaleString()}h available` },
    { label: 'Cost of scheduled labor', value: isLoading ? '—' : money.format(stats.costOfLabor), basis: laborShare },
    {
      label: 'Working now',
      value: clock.loaded ? clock.workingCount.toLocaleString() : '—',
      basis: clock.loaded ? `of ${clock.activeCount} active employees` : 'checking clock status',
      tone: clock.loaded && clock.workingCount > 0 ? 'success' : 'default'
    }
  ];

  return (
    <Panel title="Employees" icon={<IconUsers size={17} stroke={1.75} />} note={windowLabel}>
      {isError ? (
        <PanelMessage tone="error">Couldn&apos;t load employee hours right now.</PanelMessage>
      ) : (
        <>
          <StatsStrip stats={cells} />
          <EmployeesTable employees={employeesWithStats} isLoading={isLoading} statuses={clock.statuses} />
        </>
      )}
    </Panel>
  );
};
