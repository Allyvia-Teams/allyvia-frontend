import React from 'react';
import { Grid } from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { KpiCards } from 'ui-component/analytics/overview';
import ExpenseBreakdown from 'ui-component/analytics/finance/ExpenseBreakdown';
import PaymentsByProvider from 'ui-component/analytics/finance/FinanceCashFlow';
import FinanceRevenueProfitTrend from 'ui-component/analytics/finance/FinanceRevenueProfitTrend';
import { TimeUtilization } from 'ui-component/analytics/employee';
import { TopItems, InventoryAlertsPanel } from 'ui-component/analytics/inventory';
import { useSelector } from 'react-redux';
import { RootState } from 'store';

interface OverviewAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const OverviewAnalytics: React.FC<OverviewAnalyticsProps> = ({ dateRange, isLoading }) => {
  const { summary, loading } = useSelector((state: RootState) => state.analytics);

  return (
    <Grid container spacing={3}>
      {/* KPI Cards (without title) */}
      <Grid size={{ xs: 12 }}>
        <KpiCards data={summary} loading={loading || isLoading} />
      </Grid>

      {/* Charts Row 1 */}
      <Grid size={{ xs: 12, md: 8 }}>
        <FinanceRevenueProfitTrend />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <ExpenseBreakdown />
      </Grid>

      {/* Charts Row 2 */}
      <Grid size={{ xs: 12, md: 6 }}>
        <PaymentsByProvider />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TimeUtilization />
      </Grid>

      {/* Tables Row */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TopItems />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <InventoryAlertsPanel />
      </Grid>
    </Grid>
  );
};

export default OverviewAnalytics;
