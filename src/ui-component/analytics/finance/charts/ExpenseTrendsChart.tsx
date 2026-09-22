import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import ReactApexChart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import { buildExpenseTrendSeries } from './expenseTrendsChartView';

const ExpenseTrendsChart: React.FC = () => {
  const { expenseTrend } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.expenseTrend);
  const data = buildExpenseTrendSeries(expenseTrend);
  const isEmpty = !loading && data.length === 0;

  return (
    <AllyviaEmpty
      isLoading={loading}
      isEmpty={isEmpty}
      type="chart"
      skeletonType="chart"
      height={350}
      width="100%"
      title="No expense trend data yet"
      description="Expense trends will appear here once expense activity is recorded for the selected period."
      sx={{ p: 0, height: 'auto' }}
    >
      <MainCard title="Expense Trends Over Time">
        <ReactApexChart
          options={{
            chart: { type: 'line', height: 350 },
            xaxis: { type: 'datetime' },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            markers: { size: 0 }
          }}
          series={[{ name: 'Daily Expenses', data }]}
          type="line"
          height={350}
        />
      </MainCard>
    </AllyviaEmpty>
  );
};

export default ExpenseTrendsChart;
