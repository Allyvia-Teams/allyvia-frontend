import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fetchInnerCircleSummary } from 'api/innerCircle.api';
import { useSelector } from 'store';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { Panel, PanelMessage } from 'ui-component/frame';

function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

// ==============================|| INNER CIRCLE - THIS WEEK ||============================== //
// Placeholder for Task 3.2: the four stat tiles move here (real, from the
// existing summary endpoint) so nothing is lost this session. The posture
// line, recommendation cards and locality strip arrive in Session 5.

export default function ThisWeek() {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['inner-circle-summary', companyId],
    queryFn: () => fetchInnerCircleSummary(companyId!),
    enabled: !!companyId
  });

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 2,
          alignItems: 'stretch',
          justifyContent: 'space-between',
          width: '100%',
          overflowX: 'auto',
          mb: 2
        }}
      >
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <AllyviaStats title="Vault Members" value={summary?.vault_count ?? 0} theme="gold" loading={summaryLoading} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <AllyviaStats title="Total CRM LTV" value={formatCurrency(summary?.total_crm_ltv)} theme="success" loading={summaryLoading} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <AllyviaStats title="Active This Month" value={summary?.active_this_month ?? 0} theme="default" loading={summaryLoading} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <AllyviaStats title="Automations Sent" value={summary?.automations_sent_month ?? 0} theme="default" loading={summaryLoading} />
        </Box>
      </Box>
      {summaryError && (
        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="caption" color="error">
            Failed to load summary.
          </Typography>
          <Button size="small" onClick={() => refetchSummary()}>
            Retry
          </Button>
        </Stack>
      )}

      <Panel title="This week">
        <PanelMessage>Recommendations arrive in Session 5.</PanelMessage>
      </Panel>
    </>
  );
}
