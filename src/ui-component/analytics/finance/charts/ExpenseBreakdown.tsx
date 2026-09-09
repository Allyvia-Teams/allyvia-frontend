import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { formatExpenseBreakdown, ExpenseBreakdownItem } from './expenseBreakdownView';

export { formatExpenseBreakdown, type ExpenseBreakdownItem };

const ExpenseBreakdown: React.FC = () => {
  const { expenseBreakdown } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.expenseBreakdown);

  const breakdownData: ExpenseBreakdownItem[] = Array.isArray(expenseBreakdown)
    ? expenseBreakdown
    : (expenseBreakdown as any)?.by_category || [];

  const { labels, series } = formatExpenseBreakdown(breakdownData);

  return (
    <AllyviaEmpty
      isLoading={loading}
      isEmpty={false}
      type="chart"
      skeletonType="chart"
      height={0}
      width="100%"
      sx={{ p: 0, height: 'auto' }}
    >
      <MainCard title="Expense Categories">
        <Chart
          key={`expense-breakdown-${series.length}-${series.join(',')}`}
          options={{
            chart: { type: 'donut' },
            labels,
            legend: { position: 'bottom' },
            tooltip: {
              y: {
                formatter: (val: number) => {
                  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
                }
              }
            }
          }}
          series={series}
          type="donut"
          height={350}
        />
      </MainCard>
    </AllyviaEmpty>
  );
};

export default ExpenseBreakdown;
