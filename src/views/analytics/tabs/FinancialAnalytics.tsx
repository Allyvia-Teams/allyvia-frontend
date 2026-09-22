import React, { useEffect } from 'react';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import type { DateValue } from 'react-aria';
import { useDispatch } from 'react-redux';
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
import AnalyticsWidgetGrid from '../registry/AnalyticsWidgetGrid';

interface FinancialAnalyticsProps {
  dateRange: RangeValue;
  isLoading?: boolean;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ dateRange, isLoading = false }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const start = (dateRange as any)?.start as DateValue | undefined;
    const end = (dateRange as any)?.end as DateValue | undefined;
    const startDate = start
      ? `${String((start as any).year).padStart(4, '0')}-${String((start as any).month).padStart(2, '0')}-${String((start as any).day).padStart(2, '0')}`
      : (undefined as any);
    const endDate = end
      ? `${String((end as any).year).padStart(4, '0')}-${String((end as any).month).padStart(2, '0')}-${String((end as any).day).padStart(2, '0')}`
      : (undefined as any);

    dispatch(setFinanceFilters({ startDate, endDate }) as any);

    dispatch(fetchFinanceKPIs({ startDate, endDate }) as any);
    dispatch(fetchProfitAndLoss({ startDate, endDate }) as any);
    dispatch(fetchAccountSummary({ startDate, endDate }) as any);

    dispatch(fetchRevenueSeries({ startDate, endDate }) as any);
    dispatch(fetchExpenseTrend({ startDate, endDate }) as any);
    dispatch(fetchPaymentTrend({ startDate, endDate }) as any);

    dispatch(fetchExpenseSummary({ startDate, endDate }) as any);
    dispatch(fetchExpenseStats({ startDate, endDate }) as any);
    dispatch(fetchExpenseBreakdown({ startDate, endDate }) as any);
    dispatch(fetchTopExpenses({ startDate, endDate }) as any);
    dispatch(fetchInvoiceStatistics({ startDate, endDate }) as any);
    dispatch(fetchInvoiceList({ startDate, endDate }) as any);
    dispatch(fetchPaymentSummary({ startDate, endDate }) as any);
    dispatch(fetchPaymentSplit({ startDate, endDate }) as any);
    dispatch(fetchPaymentStatistics({ startDate, endDate }) as any);
  }, [dispatch, (dateRange as any)?.start, (dateRange as any)?.end]);

  return <AnalyticsWidgetGrid tab="financial" dateRange={dateRange} isLoading={isLoading} variant="financial-nested" />;
};

export default FinancialAnalytics;
