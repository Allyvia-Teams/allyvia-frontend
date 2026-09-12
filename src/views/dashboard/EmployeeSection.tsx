// icons
import { IconUsers } from '@tabler/icons-react';

// project imports
import type { IsoWindow } from './dashboardRange';
import { Panel, PanelMessage, StatsStrip, type StatCell } from 'ui-component/frame';
import { useEmployeeRangeStats } from './useEmployeeRangeStats';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ==============================|| DASHBOARD - EMPLOYEES ||============================== //
// Design handoff Part 2: hours and labor cost as a stats strip. The per-employee
// table moved to the Employees view. Labor is shown against revenue when the
// summary has one; "open shifts" has no source on this page and is not drawn.

export const EmployeesSection = ({ window, windowLabel, revenue }: { window: IsoWindow; windowLabel: string; revenue?: number | null }) => {
  const { stats, isLoading, isError } = useEmployeeRangeStats(window);

  const laborShare = revenue && revenue > 0 ? `${((stats.costOfLabor / revenue) * 100).toFixed(1)}% of revenue` : 'Approved timecards only';

  const cells: StatCell[] = [
    { label: 'Hours worked', value: isLoading ? '—' : stats.hoursWorked, basis: `of ${stats.hoursAvailable.toLocaleString()}h available` },
    { label: 'Cost of scheduled labor', value: isLoading ? '—' : money.format(stats.costOfLabor), basis: laborShare }
  ];

  return (
    <Panel title="Employees" icon={<IconUsers size={17} stroke={1.75} />} note={windowLabel}>
      {isError ? <PanelMessage tone="error">Couldn&apos;t load employee hours right now.</PanelMessage> : <StatsStrip stats={cells} />}
    </Panel>
  );
};
