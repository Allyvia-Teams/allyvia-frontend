import React from 'react';
import { Box, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import type { ExpenseTrendPoint } from 'types/finance';
import { formatDate } from 'utils/dateUtils';

interface ExpenseChartProps {
  data: ExpenseTrendPoint[];
  title?: string;
  color?: string;
}

export default function ExpenseChart({ data, title = 'Expense Trend', color = '#F44336' }: ExpenseChartProps) {
  const total = React.useMemo(() => data.reduce((sum, p) => sum + (Number(p.amount) || 0), 0), [data]);

  const categories = React.useMemo(() => data.map((p) => formatDate(p.date, 'DD MMM YY')), [data]);

  const series = React.useMemo(
    () => [
      {
        name: 'Expenses',
        data: data.map((p) => Number(p.amount) || 0)
      }
    ],
    [data]
  );

  return (
    <MainCard
      title={
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
          </Typography>
        </Box>
      }
      sx={{ border: '1px solid', borderColor: 'divider' }}
    >
      <Chart
        options={{
          chart: { type: 'line', height: 320, toolbar: { show: false } },
          stroke: { curve: 'smooth', width: 3 },
          markers: { size: 0 },
          xaxis: { categories },
          yaxis: { labels: { formatter: (v: any) => `$${Number(v).toLocaleString()}` } },
          colors: [color],
          dataLabels: { enabled: false },
          grid: { strokeDashArray: 5 }
        }}
        series={series as any}
        type="line"
        height={320}
      />
    </MainCard>
  );
}
