import React, { useEffect } from 'react';
import { Grid, Box, CircularProgress } from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import type { DateValue } from 'react-aria';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import {
  setFilters as setFinanceFilters,
  fetchKPIsAsync,
  fetchProfitAndLossSummaryAsync,
  fetchCOGSDetailAsync,
  fetchGrossProfitDetailAsync,
  fetchExpenseSummaryAsync,
  fetchExpensesByCategoryAsync,
  fetchTopExpensesAsync,
  fetchExpenseTrendsAsync,
  fetchInvoiceStatisticsAsync,
  fetchInvoiceListAsync,
  fetchInvoiceAgingAsync,
  fetchPaymentSummaryAsync,
  fetchPaymentTrendsAsync,
  fetchPaymentDetailsAsync,
  fetchAccountSummaryAsync,
  fetchAccountDetailsAsync,
  fetchAccountTrendsAsync,
  fetchLedgerAsync,
  fetchSeriesAsync,
  fetchEnhancedSeriesAsync
} from 'store/slices/finance';
import InvoiceStatus from 'ui-component/analytics/finance/InvoiceStatus';
import FinanceKpis from 'ui-component/analytics/finance/FinanceKpis';
import FinanceRevenueProfitTrend from 'ui-component/analytics/finance/FinanceRevenueProfitTrend';
import FinanceExpenseCategories from 'ui-component/analytics/finance/FinanceExpenseCategories';
import FinanceOverduePending from 'ui-component/analytics/finance/FinanceOverduePending';
import FinanceCashFlow from 'ui-component/analytics/finance/FinanceCashFlow';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import ExpenseTrendsChart from 'ui-component/analytics/finance/ExpenseTrendsChart';
import PaymentTrendsChart from 'ui-component/analytics/finance/PaymentTrendsChart';
import AccountBalancesChart from 'ui-component/analytics/finance/AccountBalancesChart';

interface FinancialAnalyticsProps {
  dateRange: RangeValue;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ dateRange }) => {
  const dispatch = useDispatch();
  const analyticsLoading = useSelector((state: RootState) => state.analytics.loading);
  const financeLoading = useSelector((state: any) => state.finance.loading);

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
    console.log('[FinancialAnalytics] dispatching finance thunks', { startDate, endDate });
    // Sync finance filters
    dispatch(setFinanceFilters({ startDate, endDate }) as any);
    // KPIs & P&L
    dispatch(fetchKPIsAsync({ startDate, endDate }) as any);
    dispatch(fetchProfitAndLossSummaryAsync({ startDate, endDate }) as any);
    dispatch(fetchCOGSDetailAsync({ startDate, endDate }) as any);
    dispatch(fetchGrossProfitDetailAsync({ startDate, endDate }) as any);
    // Expenses
    dispatch(fetchExpenseSummaryAsync({ startDate, endDate }) as any);
    dispatch(fetchExpensesByCategoryAsync({ startDate, endDate }) as any);
    dispatch(fetchTopExpensesAsync({ startDate, endDate }) as any);
    dispatch(fetchExpenseTrendsAsync({ startDate, endDate }) as any);
    // Invoices
    dispatch(fetchInvoiceStatisticsAsync({ startDate, endDate }) as any);
    dispatch(fetchInvoiceListAsync({ startDate, endDate }) as any);
    dispatch(fetchInvoiceAgingAsync({ startDate, endDate }) as any);
    // Payments
    dispatch(fetchPaymentSummaryAsync({ startDate, endDate }) as any);
    dispatch(fetchPaymentTrendsAsync({ startDate, endDate }) as any);
    dispatch(fetchPaymentDetailsAsync({ startDate, endDate }) as any);
    // Accounts
    dispatch(fetchAccountSummaryAsync({ startDate, endDate }) as any);
    dispatch(fetchAccountDetailsAsync({ startDate, endDate }) as any);
    dispatch(fetchAccountTrendsAsync({ startDate, endDate }) as any);
    // Ledger
    dispatch(fetchLedgerAsync({ startDate, endDate }) as any);
    // Series
    dispatch(fetchSeriesAsync({ startDate, endDate }) as any);
    dispatch(fetchEnhancedSeriesAsync({ startDate, endDate }) as any);
  }, [dispatch, (dateRange as any)?.start, (dateRange as any)?.end]);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {/* Finance KPIs (from finance slice) */}
          <Grid size={{ xs: 12 }}>
            <FinanceKpis />
          </Grid>

          {/* Revenue & Profit Trend (from finance series) */}
          <Grid size={{ xs: 12, md: 8 }}>
            <FinanceRevenueProfitTrend />
          </Grid>

          {/* Expense Categories (from finance slice) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <FinanceExpenseCategories />
          </Grid>

          {/* Trends Row from Finance page */}
          <Grid size={{ xs: 12, md: 6 }}>
            <ExpenseTrendsChart />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PaymentTrendsChart />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <AccountBalancesChart />
          </Grid>

          {/* Invoice Status (from finance slice) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <InvoiceStatus />
          </Grid>

          {/* Overdue & Pending Invoices (from finance invoiceList) */}
          <Grid size={{ xs: 12, md: 8 }}>
            <FinanceOverduePending />
          </Grid>

          {/* Cash Flow (derived from series/payment summary) */}
          <Grid size={{ xs: 12 }}>
            <FinanceCashFlow />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default FinancialAnalytics;
