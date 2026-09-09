import React from 'react';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { FinancialAnalyticsCard } from 'ui-component/analytics/finance';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
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

const FinancialAnalyticsCardWidget: React.FC<AnalyticsWidgetProps> = () => {
  const pageLoading = useFinancialPageLoading();

  return (
    <AllyviaEmpty isLoading={pageLoading} isEmpty={false} type="chart" height={360}>
      <FinancialAnalyticsCard />
    </AllyviaEmpty>
  );
};

export default FinancialAnalyticsCardWidget;
