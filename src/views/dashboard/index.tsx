import { useState } from 'react';

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
import LearningAnomalyCard from './LearningAnomalyCard';
import { SavingsWidget } from './SavingsWidget';
import { AttentionCard } from './AttentionCard';
import { defaultDashboardWindow, isoWindow } from './dashboardRange';
import { useFinanceKpis } from './useFinanceKpis';
import { useRecommendations } from './useRecommendations';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { PageHeader, isoWindowLabel } from 'ui-component/frame';

// ==============================|| DASHBOARD ||============================== //
// Design handoff Part 2 + owner requests. Title row → alert strips → KPI row →
// one row of supporting cards (savings and attention) → full-width
// panels: top priorities with weekly feedback, analytics, inventory, employees last. No
// side rail: with a short rail beside a long column, or a short insights
// panel beside a tall rail, one side was always blank.

export default function DashboardPage() {
  const [range, setRange] = useState<RangeValue | null>(() => defaultDashboardWindow());
  const window = isoWindow(range);
  const windowLabel = isoWindowLabel(window.startDate, window.endDate);
  const endLabel = isoWindowLabel(window.endDate, window.endDate);

  const kpis = useFinanceKpis(window);
  const recommendations = useRecommendations();

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

      {/* Supporting cards in one row. Each keeps its own height: stretching them to match
          stretched the short card into a blank block whenever the savings card was open. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
          alignItems: 'start',
          mb: 2
        }}
      >
        <SavingsWidget />
        <AttentionCard />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <LearningAnomalyCard />
        <RecommendationCard state={recommendations} />
        <AnalyticsSection window={window} windowLabel={windowLabel} />
        <InventorySection window={window} />
        <EmployeesSection window={window} windowLabel={windowLabel} revenue={kpis.data?.kpis?.revenue ?? null} />
      </Box>
    </>
  );
}
