import { useEffect, useState } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

// icons
import { IconSparkles } from '@tabler/icons-react';

// project imports
import { InventorySection } from './InventorySection';
import { EmployeesSection } from './EmployeeSection';
import { QuickBooksSection } from './QuickBooks/QuickBooksSection';
import { AnalyticsSection } from './Analytics/AnalyticsSection';
import { DashboardAlerts, RecommendationCard } from './RecommendationCard';
import { FeedbackBanner } from './FeedbackBanner';
import { SavingsWidget } from './SavingsWidget';
import { AttentionCard } from './AttentionCard';
import { defaultDashboardWindow, isoWindow } from './dashboardRange';
import { useFinanceKpis } from './useFinanceKpis';
import { useRecommendations } from './useRecommendations';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { PageHeader, isoWindowLabel } from 'ui-component/frame';
import { useDispatch, useSelector } from 'store';
import { fetchQBConnectionStatus, fetchSquareConnectionStatus } from 'store/slices/integrations';

// ==============================|| DASHBOARD ||============================== //
// Design handoff Part 2 + owner requests. Title row → alert strips → KPI row →
// one row of supporting cards (savings, feedback, attention) → full-width
// panels: today's insights, analytics chart, inventory, employees last. No
// side rail: with a short rail beside a long column, or a short insights
// panel beside a tall rail, one side was always blank.

export default function DashboardPage() {
  const dispatch = useDispatch();
  const companyId = useSelector((state) => state.auth.currentRole?.company_id) || null;
  const [range, setRange] = useState<RangeValue | null>(() => defaultDashboardWindow());
  const window = isoWindow(range);
  const windowLabel = isoWindowLabel(window.startDate, window.endDate);
  const endLabel = isoWindowLabel(window.endDate, window.endDate);

  const kpis = useFinanceKpis(window);
  const recommendations = useRecommendations();

  // The layout's global sync monitor reads the QuickBooks connection from the
  // store, and the dashboard has always been the page that populates it on a
  // fresh load. Kept as a silent effect now that nothing here renders it.
  useEffect(() => {
    if (companyId) {
      dispatch(fetchQBConnectionStatus(companyId));
      dispatch(fetchSquareConnectionStatus(companyId));
    }
  }, [dispatch, companyId]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={windowLabel}
        right={
          <>
            <AllyviaDateRangePicker value={range} onChange={setRange} />
            <Button
              variant="contained"
              color="primary"
              disabled={recommendations.working || recommendations.isLoading}
              startIcon={
                recommendations.working ? <CircularProgress size={14} color="inherit" /> : <IconSparkles size={16} stroke={1.75} />
              }
              onClick={() => recommendations.generate(false)}
            >
              Generate recommendation
            </Button>
          </>
        }
      />

      <DashboardAlerts alerts={recommendations.alerts} />

      <QuickBooksSection kpis={kpis.data} isLoading={kpis.isLoading} isError={kpis.isError} windowLabel={windowLabel} endLabel={endLabel} />

      {/* Supporting cards in one equal-height row — a side rail beside a column of
          uneven panels always left one side blank. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
          alignItems: 'stretch',
          mb: 2,
          '& > *': { height: '100%' }
        }}
      >
        <SavingsWidget />
        <FeedbackBanner />
        <AttentionCard />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <RecommendationCard state={recommendations} />
        <AnalyticsSection window={window} windowLabel={windowLabel} />
        <InventorySection window={window} />
        <EmployeesSection window={window} windowLabel={windowLabel} revenue={kpis.data?.kpis?.revenue ?? null} />
      </Box>
    </>
  );
}
