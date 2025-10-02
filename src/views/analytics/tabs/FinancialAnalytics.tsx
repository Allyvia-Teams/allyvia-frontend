import React from 'react';
import { Grid } from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import KpiCards from 'ui-component/analytics/overview/KpiCards';
import RevenueTrend from 'ui-component/analytics/overview/RevenueTrend';
import ExpenseBreakdown from 'ui-component/analytics/financial/ExpenseBreakdown';
import PaymentsByProvider from 'ui-component/analytics/financial/PaymentsByProvider';
import TopItems from 'ui-component/analytics/financial/TopItems';
import TimeUtilizationChart from 'ui-component/analytics/financial/TimeUtilizationChart';
import { useSelector } from 'react-redux';
import { RootState } from 'store';

interface FinancialAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ dateRange, isLoading }) => {
  const { summary, loading } = useSelector((state: RootState) => state.analytics);

  return (
    <Grid container spacing={3}>
      {/* Financial KPIs */}
      <Grid size={{ xs: 12 }}>
        <KpiCards data={summary} loading={loading || isLoading} />
      </Grid>

      {/* Revenue Trend */}
      <Grid size={{ xs: 12, md: 8 }}>
        <RevenueTrend />
      </Grid>

      {/* Expense Breakdown */}
      <Grid size={{ xs: 12, md: 4 }}>
        <ExpenseBreakdown />
      </Grid>

      {/* Payments by Provider */}
      <Grid size={{ xs: 12 }}>
        <PaymentsByProvider />
      </Grid>

      {/* Top Items */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TopItems />
      </Grid>

      {/* Time Utilization */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TimeUtilizationChart />
      </Grid>
    </Grid>
  );
};

export default FinancialAnalytics;
