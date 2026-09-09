import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import FinancialTrendsChart from 'ui-component/finance/charts/FinancialTrendsChart';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';

function useFinancialPageLoading() {
  const financeLoading = useSelector((state: RootState) => state.finance.loading);

  return (
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
    financeLoading.paymentStatistics
  );
}

const FinancialTrendsChartWidget: React.FC<AnalyticsWidgetProps> = () => {
  const { revenueSeries, expenseTrend, paymentTrend } = useSelector((state: RootState) => state.finance);
  const pageLoading = useFinancialPageLoading();

  return (
    <AllyviaEmpty isLoading={pageLoading} isEmpty={false} type="chart" height={360}>
      <FinancialTrendsChart
        revenue={Array.isArray(revenueSeries) ? revenueSeries : []}
        expenses={expenseTrend || []}
        payments={paymentTrend || []}
      />
    </AllyviaEmpty>
  );
};

export default FinancialTrendsChartWidget;
