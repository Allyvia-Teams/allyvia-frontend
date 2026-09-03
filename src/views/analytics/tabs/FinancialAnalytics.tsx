import React, { useEffect } from 'react';
import { Grid } from '@mui/material';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import type { DateValue } from 'react-aria';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import {
  setFilters as setFinanceFilters,
  fetchFinanceKPIs,
  fetchProfitAndLoss,
  fetchPaymentSummary,
  fetchPaymentSplit,
  fetchPaymentStatistics,
  fetchPaymentTrend,
  fetchExpenseSummary,
  fetchExpenseStats,
  fetchExpenseBreakdown,
  fetchTopExpenses,
  fetchExpenseTrend,
  fetchInvoiceStatistics,
  fetchInvoiceList,
  fetchRevenueSeries,
  fetchAccountSummary
} from 'store/slices/finance';
import { FinanceKpis, FinancialAnalyticsCard } from 'ui-component/analytics/finance';
import FinancialTrendsChart from 'ui-component/finance/charts/FinancialTrendsChart';

interface FinancialAnalyticsProps {
  dateRange: RangeValue;
  isLoading?: boolean;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ dateRange, isLoading = false }) => {
  const dispatch = useDispatch();
  const { revenueSeries, expenseTrend, paymentTrend, loading: financeLoading } = useSelector((state: RootState) => state.finance);
  // Use the provided dateRange from the tab (no defaults here)

  useEffect(() => {
    const start = (dateRange as any)?.start as DateValue | undefined;
    const end = (dateRange as any)?.end as DateValue | undefined;
    const startDate = start
      ? `${String((start as any).year).padStart(4, '0')}-${String((start as any).month).padStart(2, '0')}-${String((start as any).day).padStart(2, '0')}`
      : (undefined as any);
    const endDate = end
      ? `${String((end as any).year).padStart(4, '0')}-${String((end as any).month).padStart(2, '0')}-${String((end as any).day).padStart(2, '0')}`
      : (undefined as any);

    // Sync finance filters
    dispatch(setFinanceFilters({ startDate, endDate }) as any);

    // Dispatch only the thunks that are actually used by the rendered components

    // FinanceKpis component needs:
    dispatch(fetchFinanceKPIs({ startDate, endDate }) as any);
    dispatch(fetchProfitAndLoss({ startDate, endDate }) as any);
    dispatch(fetchAccountSummary({ startDate, endDate }) as any);

    // FinancialTrendsChart component needs:
    dispatch(fetchRevenueSeries({ startDate, endDate }) as any);
    dispatch(fetchExpenseTrend({ startDate, endDate }) as any);
    dispatch(fetchPaymentTrend({ startDate, endDate }) as any);

    // FinancialAnalyticsCard component needs:
    dispatch(fetchExpenseSummary({ startDate, endDate }) as any);
    dispatch(fetchExpenseStats({ startDate, endDate }) as any);
    dispatch(fetchExpenseBreakdown({ startDate, endDate }) as any);
    dispatch(fetchTopExpenses({ startDate, endDate }) as any);
    dispatch(fetchInvoiceStatistics({ startDate, endDate }) as any);
    dispatch(fetchInvoiceList({ startDate, endDate }) as any);
    dispatch(fetchPaymentSummary({ startDate, endDate }) as any);
    dispatch(fetchPaymentSplit({ startDate, endDate }) as any);
    dispatch(fetchPaymentStatistics({ startDate, endDate }) as any);

    // ProfitAnalytics component needs (commented out):
    // dispatch(fetchCOGSDetail({ startDate, endDate }) as any);
    // dispatch(fetchGrossProfitDetail({ startDate, endDate }) as any);
    // dispatch(fetchBalanceSheet({ asOfDate: endDate }) as any);
    // dispatch(fetchCashFlow({ startDate, endDate }) as any);

    // AccountBalancesChart component needs (commented out):
    // dispatch(fetchAccountSummary({ startDate, endDate }) as any);

    // FinanceCashFlow component needs (commented out):
    // dispatch(fetchCashFlow({ startDate, endDate }) as any);
  }, [dispatch, (dateRange as any)?.start, (dateRange as any)?.end]);

  // Removed top-level loading gate; sections handle loading via AllyviaEmpty

  const pageLoading =
    financeLoading.financeKPIs ||
    financeLoading.revenueSeries ||
    financeLoading.expenseTrend ||
    financeLoading.paymentTrend ||
    financeLoading.expenseSummary ||
    financeLoading.expenseStats ||
    financeLoading.expenseBreakdown ||
    financeLoading.topExpenses ||
    financeLoading.invoiceStatistics ||
    financeLoading.invoiceList ||
    financeLoading.paymentSummary ||
    financeLoading.paymentSplit ||
    financeLoading.paymentStatistics;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {/* Finance KPIs */}
          <Grid size={{ xs: 12 }}>
            <FinanceKpis />
          </Grid>
          {/* Financial Trends Chart - Full Width */}
          <Grid size={{ xs: 12 }}>
            <AllyviaEmpty isLoading={pageLoading} isEmpty={false} type="chart" height={360}>
              <FinancialTrendsChart
                revenue={Array.isArray(revenueSeries) ? revenueSeries : []}
                expenses={expenseTrend || []}
                payments={paymentTrend || []}
              />
            </AllyviaEmpty>
          </Grid>
          {/* Consolidated Financial Analytics Card */}
          <Grid size={{ xs: 12 }}>
            <AllyviaEmpty isLoading={pageLoading} isEmpty={false} type="chart" height={360}>
              <FinancialAnalyticsCard />
            </AllyviaEmpty>
          </Grid>
          {/* Profit & Loss Analytics
          <Grid size={{ xs: 12 }}>
            <ProfitAnalytics />
          </Grid> */}
          {/* Account Balances
          <Grid size={{ xs: 12 }}>
            <AccountBalancesChart />
          </Grid>

          Cash Flow
          <Grid size={{ xs: 12 }}>
            <FinanceCashFlow />
          </Grid> */}
        </Grid>
      </Grid>
    </Grid>
  );
};

export default FinancialAnalytics;
