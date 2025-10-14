import React, { useEffect } from 'react';
import { Grid, Box, CircularProgress } from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import type { DateValue } from 'react-aria';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import {
  setFilters as setFinanceFilters,
  fetchFinanceKPIs,
  fetchAnalyticsSummary,
  fetchCRMAnalyticsOverview,
  fetchCRMPipeline,
  fetchInventoryOverview,
  fetchEmployeeOverview,
  fetchProfitAndLoss,
  fetchCOGSDetail,
  fetchGrossProfitDetail,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchPaymentSummary,
  fetchPaymentSplit,
  fetchPaymentTrend,
  fetchPaymentStatistics,
  fetchPaymentList,
  fetchPaymentSuggestions,
  fetchExpenseSummary,
  fetchExpenseBreakdown,
  fetchTopExpenses,
  fetchExpenseTrend,
  fetchBillsStatus,
  fetchExpensesList,
  fetchPurchasesList,
  fetchInvoiceStatistics,
  fetchInvoiceList,
  fetchInvoiceAging,
  fetchRevenueSeries,
  fetchInvoiceSuggestions,
  fetchInvoiceDetail,
  fetchAccountSummary
} from 'store/slices/finance';
import {
  InvoiceStatus,
  FinanceKpis,
  FinanceRevenueProfitTrend,
  ExpenseBreakdown,
  FinanceOverduePending,
  FinanceCashFlow,
  ExpenseTrendsChart,
  PaymentTrendsChart,
  AccountBalancesChart,
  PaymentAnalytics,
  ExpenseAnalytics,
  InvoiceAnalytics,
  ProfitAnalytics
} from 'ui-component/analytics/finance';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

interface FinancialAnalyticsProps {
  dateRange: RangeValue;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ dateRange }) => {
  const dispatch = useDispatch();
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

    // Analytics App APIs - All analytics-related
    dispatch(fetchFinanceKPIs({ startDate, endDate }) as any);
    dispatch(fetchAnalyticsSummary({ startDate, endDate }) as any);
    dispatch(fetchCRMAnalyticsOverview({ startDate, endDate }) as any);
    dispatch(fetchCRMPipeline({ startDate, endDate }) as any);
    dispatch(fetchInventoryOverview() as any);
    dispatch(fetchEmployeeOverview() as any);

    // Profit App APIs
    dispatch(fetchProfitAndLoss({ startDate, endDate }) as any);
    dispatch(fetchCOGSDetail({ startDate, endDate }) as any);
    dispatch(fetchGrossProfitDetail({ startDate, endDate }) as any);
    dispatch(fetchBalanceSheet({ asOfDate: endDate }) as any);
    dispatch(fetchCashFlow({ startDate, endDate }) as any);

    // Payment App APIs
    dispatch(fetchPaymentSummary({ startDate, endDate }) as any);
    dispatch(fetchPaymentSplit({ startDate, endDate }) as any);
    dispatch(fetchPaymentTrend({ startDate, endDate }) as any);
    dispatch(fetchPaymentStatistics({ startDate, endDate }) as any);
    dispatch(fetchPaymentList({ startDate, endDate }) as any);
    dispatch(fetchPaymentSuggestions() as any);

    // Expense App APIs
    dispatch(fetchExpenseSummary({ startDate, endDate }) as any);
    dispatch(fetchExpenseBreakdown({ startDate, endDate }) as any);
    dispatch(fetchTopExpenses({ startDate, endDate }) as any);
    dispatch(fetchExpenseTrend({ startDate, endDate }) as any);
    // dispatch(fetchExpensesByType({ startDate, endDate }) as any); // Removed: fetchExpensesByType not defined
    // dispatch(fetchExpensesByPayee({ startDate, endDate }) as any); // Removed: fetchExpensesByPayee not defined
    dispatch(fetchBillsStatus({ startDate, endDate }) as any);
    dispatch(fetchExpensesList({ startDate, endDate, page: 1, search: '', status: '' }) as any);
    dispatch(fetchPurchasesList({ page: 1 }) as any);

    // Invoice App APIs
    dispatch(fetchInvoiceStatistics({ startDate, endDate }) as any);
    dispatch(fetchInvoiceList({ startDate, endDate }) as any);
    dispatch(fetchInvoiceAging() as any);
    dispatch(fetchRevenueSeries({ startDate, endDate }) as any);
    dispatch(fetchInvoiceSuggestions() as any);

    // Account App APIs
    dispatch(fetchAccountSummary({ startDate, endDate }) as any);
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
            <ExpenseBreakdown />
          </Grid>

          {/* Comprehensive Analytics Sections */}

          {/* Profit & Loss Analytics */}
          <Grid size={{ xs: 12 }}>
            <ProfitAnalytics />
          </Grid>

          {/* Payment Analytics */}
          <Grid size={{ xs: 12 }}>
            <PaymentAnalytics />
          </Grid>

          {/* Expense Analytics */}
          <Grid size={{ xs: 12 }}>
            <ExpenseAnalytics />
          </Grid>

          {/* Invoice Analytics */}
          <Grid size={{ xs: 12 }}>
            <InvoiceAnalytics />
          </Grid>

          {/* Legacy Components for Compatibility */}
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
