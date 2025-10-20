import React from 'react';
import { Box, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import type { RevenueSeriesPoint, ExpenseTrendPoint, PaymentTrendPoint } from 'types/finance';
import { formatDate } from 'utils/dateUtils';

interface FinancialTrendsChartProps {
  revenue: RevenueSeriesPoint[];
  expenses: ExpenseTrendPoint[];
  payments?: PaymentTrendPoint[];
}

export default function FinancialTrendsChart({ revenue, expenses, payments }: FinancialTrendsChartProps) {
  // Get loading states for all relevant APIs
  const loadingStates = useSelector((state: RootState) => (state as any).finance.loading);

  // Combined loading state - true if any of the relevant APIs are loading
  const isLoading = loadingStates.revenueSeries || loadingStates.expenseTrend || loadingStates.paymentTrend;
  // Build union of dates
  const allDates = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of revenue || []) set.add(p.date);
    for (const p of expenses || []) set.add(p.date);
    for (const p of payments || []) set.add(p.date);
    return Array.from(set).sort();
  }, [revenue, expenses, payments]);

  // Quick lookup maps
  const revenueByDate = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of revenue || []) m.set(p.date, Number(p.amount) || 0);
    return m;
  }, [revenue]);

  const expenseByDate = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of expenses || []) m.set(p.date, Number(p.amount) || 0);
    return m;
  }, [expenses]);

  const paymentByDate = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments || []) m.set(p.date, Number(p.total_amount) || 0);
    return m;
  }, [payments]);

  const categories = React.useMemo(() => allDates.map((d) => formatDate(d, 'DD MMM YY')), [allDates]);

  const series = React.useMemo(
    () => [
      { name: 'Revenue', data: allDates.map((d) => revenueByDate.get(d) ?? 0) },
      { name: 'Expenses', data: allDates.map((d) => expenseByDate.get(d) ?? 0) },
      { name: 'Payments', data: allDates.map((d) => paymentByDate.get(d) ?? 0) }
    ],
    [allDates, revenueByDate, expenseByDate, paymentByDate]
  );

  const revenueTotal = React.useMemo(() => (revenue || []).reduce((s, p) => s + (Number(p.amount) || 0), 0), [revenue]);
  const expenseTotal = React.useMemo(() => (expenses || []).reduce((s, p) => s + (Number(p.amount) || 0), 0), [expenses]);
  const paymentTotal = React.useMemo(() => (payments || []).reduce((s, p) => s + (Number(p.total_amount) || 0), 0), [payments]);

  return (
    <AllyviaEmpty
      isLoading={isLoading}
      isEmpty={!isLoading && allDates.length === 0}
      type="chart"
      skeletonType="chart"
      height={360}
      width="100%"
      sx={{ p: 0, height: 'auto' }}
    >
      <MainCard
        title={
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 500 }}>
                Revenue:{' '}
                <Box component="span" sx={{ color: 'success.dark', fontWeight: 600 }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(revenueTotal)}
                </Box>
              </Typography>
              <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 500 }}>
                Expenses:{' '}
                <Box component="span" sx={{ color: 'error.dark', fontWeight: 600 }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(expenseTotal)}
                </Box>
              </Typography>
              {payments && payments.length > 0 && (
                <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 500 }}>
                  Payments:{' '}
                  <Box component="span" sx={{ color: 'primary.dark', fontWeight: 600 }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentTotal)}
                  </Box>
                </Typography>
              )}
            </Box>
          </Box>
        }
        sx={{ border: '1px solid', borderColor: 'divider' }}
      >
        <Chart
          options={{
            chart: { type: 'line', height: 360, toolbar: { show: false } },
            stroke: { curve: 'smooth', width: 3 },
            markers: { size: 0 },
            xaxis: { categories },
            yaxis: { labels: { formatter: (v: any) => `$${Number(v).toLocaleString()}` } },
            colors: ['#4CAF50', '#F44336', '#2196F3'],
            dataLabels: { enabled: false },
            grid: { strokeDashArray: 5 },
            legend: { position: 'top' }
          }}
          series={series as any}
          type="line"
          height={360}
        />
      </MainCard>
    </AllyviaEmpty>
  );
}
