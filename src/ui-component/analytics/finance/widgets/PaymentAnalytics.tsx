import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Grid } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import AllyviaStats from 'ui-component/common/AllyviaStats';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const PaymentAnalytics: React.FC = () => {
  const { paymentSummary, paymentSplit, paymentTrend, paymentStatistics } = useSelector((state: RootState) => (state as any).finance);

  const loading = useSelector((state: RootState) => (state as any).finance.loading.paymentSummary);

  // Payment KPIs
  const paymentKPIs = [
    {
      title: 'Total Payments',
      value: fmtMoney(paymentSummary?.total_payments || 0),
      theme: 'success' as const,
      loading: loading
    },
    {
      title: 'Payment Count',
      value: paymentSummary?.payment_count || 0,
      theme: 'default' as const,
      loading: loading
    },
    {
      title: 'Average Payment',
      value: fmtMoney(paymentSummary?.average_payment || 0),
      theme: 'default' as const,
      loading: loading
    },
    {
      title: 'Success Rate',
      value: `${paymentStatistics?.success_rate || 0}%`,
      theme: paymentStatistics?.success_rate >= 95 ? ('success' as const) : ('warning' as const),
      loading: loading
    }
  ];

  // Payment Methods Donut Chart Data
  const paymentMethodsData = paymentSplit?.payment_methods || [];
  const paymentLabels = paymentMethodsData.map((p: any) => p.method);
  const paymentSeries = paymentMethodsData.map((p: any) => Number(p.amount || 0));

  // Payment Trends Line Chart Data
  const trendData = paymentTrend?.daily_payments || [];
  const trendCategories = trendData.map((t: any) => t.date);
  const trendSeries = trendData.map((t: any) => Number(t.total_amount || 0));

  return (
    <Grid container spacing={3}>
      {/* Payment KPIs */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {paymentKPIs.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Payment Methods Distribution */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Payment Methods Distribution">
            <Chart
              options={{
                chart: { type: 'donut' },
                labels: paymentLabels.length ? paymentLabels : ['Credit Card', 'Bank Transfer', 'Cash', 'Check'],
                legend: { position: 'bottom' }
              }}
              series={paymentSeries.length ? paymentSeries : [45000, 25000, 15000, 5000]}
              type="donut"
              height={350}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>

      {/* Payment Trends */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Payment Trends">
            <Chart
              options={{
                chart: { type: 'line', height: 350 },
                xaxis: {
                  categories: trendCategories.length ? trendCategories : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                },
                stroke: { curve: 'smooth', width: 3 },
                dataLabels: { enabled: false },
                legend: { position: 'top' }
              }}
              series={[
                {
                  name: 'Daily Payments',
                  data: trendSeries.length ? trendSeries : [1200, 1500, 1800, 1600, 2000, 1400, 1100]
                }
              ]}
              type="line"
              height={350}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>
    </Grid>
  );
};

export default PaymentAnalytics;
