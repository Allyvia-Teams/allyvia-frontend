import { useQuery } from '@tanstack/react-query';

// icons
import { IconAlertTriangle } from '@tabler/icons-react';

// project imports
import { getAdminShifts } from 'api/employee.api';
import { fetchInnerCircleSummary } from 'api/innerCircle.api';
import { useIsAdmin } from 'hooks/usePermission';
import { useSelector } from 'store';
import { RailCard, type RailRow } from 'ui-component/frame';

// ==============================|| DASHBOARD - NEEDS ATTENTION ||============================== //
// Design handoff Part 2. Each row is wired to an endpoint that already answers;
// a row with no data source is not drawn rather than shown as a placeholder.
// (Bills due this week and refunds awaiting approval have no count endpoint
// today and are deliberately absent.)

export const AttentionCard = () => {
  const isAdmin = useIsAdmin();
  const companyId = useSelector((state) => state.auth.currentRole?.company_id) || null;

  const timecards = useQuery({
    queryKey: ['dashboard-attention', 'timecards'],
    queryFn: async () => (await getAdminShifts()).data,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const innerCircle = useQuery({
    queryKey: ['dashboard-attention', 'inner-circle', companyId],
    queryFn: () => fetchInnerCircleSummary(companyId!),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const rows: RailRow[] = [];

  if (isAdmin && timecards.data) {
    const pending = timecards.data.filter((entry) => entry.approval_status === 'pending').length;
    rows.push({
      label: 'Timecards to approve',
      value: pending.toLocaleString(),
      tone: pending > 0 ? 'warning' : 'default',
      to: '/employees/time-approval'
    });
  }

  if (innerCircle.data) {
    rows.push({
      label: 'Inner Circle members active this month',
      value: innerCircle.data.active_this_month.toLocaleString(),
      tone: 'default',
      to: '/inner-circle'
    });
  }

  if (rows.length === 0) return null;

  return <RailCard title="Needs attention" icon={<IconAlertTriangle size={15} stroke={1.75} />} rows={rows} />;
};

export default AttentionCard;
