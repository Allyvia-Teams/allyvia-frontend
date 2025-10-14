import React from 'react';
import { Box, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import type { RevenueSeriesPoint, ExpenseTrendPoint } from 'types/finance';
import { formatDate } from 'utils/dateUtils';

interface CombinedRevenueExpenseChartProps {
  revenue: RevenueSeriesPoint[];
  expenses: ExpenseTrendPoint[];
}

export default function CombinedRevenueExpenseChart({ revenue, expenses }: CombinedRevenueExpenseChartProps) {
  // Build union of dates
  const allDates = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of revenue || []) set.add(p.date);
    for (const p of expenses || []) set.add(p.date);
    return Array.from(set).sort();
  }, [revenue, expenses]);

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

  const categories = React.useMemo(() => allDates.map((d) => formatDate(d, 'DD MMM YY')), [allDates]);

  const series = React.useMemo(
    () => [
      { name: 'Revenue', data: allDates.map((d) => revenueByDate.get(d) ?? 0) },
      { name: 'Expenses', data: allDates.map((d) => expenseByDate.get(d) ?? 0) }
    ],
    [allDates, revenueByDate, expenseByDate]
  );

  const revenueTotal = React.useMemo(() => (revenue || []).reduce((s, p) => s + (Number(p.amount) || 0), 0), [revenue]);
  const expenseTotal = React.useMemo(() => (expenses || []).reduce((s, p) => s + (Number(p.amount) || 0), 0), [expenses]);

  return (
    <MainCard
      title={
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
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
          colors: ['#4CAF50', '#F44336'],
          dataLabels: { enabled: false },
          grid: { strokeDashArray: 5 },
          legend: { position: 'top' }
        }}
        series={series as any}
        type="line"
        height={360}
      />
    </MainCard>
  );
}
