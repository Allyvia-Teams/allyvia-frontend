import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import ReactApexChart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const PaymentTrendsChart: React.FC = () => {
  const { paymentTrend } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.paymentTrend);

  // Use paymentTrend API data if available
  const trendData = paymentTrend?.daily_payments || [];
  let data = trendData
    .filter((t: any) => Number(t.total_amount) > 0)
    .map((t: any) => ({ x: new Date(t.date || t.period).getTime(), y: Number(t.total_amount) }))
    .sort((a: any, b: any) => a.x - b.x);

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
      <MainCard title="Payment Trends Over Time">
        <ReactApexChart
          options={{
            chart: { type: 'line', height: 350 },
            xaxis: { type: 'datetime' },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            markers: { size: 0 }
          }}
          series={[{ name: 'Daily Payments', data }]}
          type="line"
          height={350}
        />
      </MainCard>
    </AllyviaEmpty>
  );
};

export default PaymentTrendsChart;
