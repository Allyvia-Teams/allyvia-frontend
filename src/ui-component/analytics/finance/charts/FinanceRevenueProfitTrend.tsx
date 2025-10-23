import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import Chart from 'react-apexcharts';

const FinanceRevenueProfitTrend: React.FC = () => {
  const { revenueSeries, series } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.revenueSeries);

  // Use revenueSeries API data if available, fallback to series
  const revenueData = Array.isArray(revenueSeries) ? revenueSeries : Array.isArray(series) ? series : [];

  let categories = revenueData.map((p: any) => p.date || p.t || p.period);
  let revenue = revenueData.map((p: any) => Number(p.amount || p.revenue || 0));
  let expenses = revenueData.map((p: any) => Number(p.expense || p.cash_out || 0));
  let profit = revenueData.map((p: any) => Number(p.profit || Number(p.amount || p.revenue || 0) - Number(p.expense || 0)));

  // If no data available, show empty state
  if (!categories.length) {
    categories = [];
    revenue = [];
    expenses = [];
    profit = [];
  }

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
      <MainCard title="Revenue & Profit Trends">
        <Chart
          options={{
            chart: { type: 'line', height: 380 },
            xaxis: { categories },
            stroke: { curve: 'smooth', width: 3 },
            dataLabels: { enabled: false },
            legend: { position: 'top' },
            colors: ['#2196F3', '#F44336', '#4CAF50']
          }}
          series={[
            { name: 'Revenue', data: revenue },
            { name: 'Expenses', data: expenses },
            { name: 'Profit', data: profit }
          ]}
          type="line"
          height={380}
        />
      </MainCard>
    </AllyviaEmpty>
  );
};

export default FinanceRevenueProfitTrend;
