import React from 'react';
import { Typography, Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const ExpenseBreakdown: React.FC = () => {
  const { expenseBreakdown, loading } = useSelector((state: RootState) => state.analytics);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'donut',
      height: 350
    },
    labels: expenseBreakdown.map((item) => item.category),
    colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
    legend: {
      position: 'bottom'
    },
    tooltip: {
      y: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    }
  };

  const series = expenseBreakdown.map((item) => item.amount);

  if (loading) {
    return (
      <MainCard title="Expense Breakdown">
        <Skeleton variant="rectangular" height={350} />
      </MainCard>
    );
  }

  if (!expenseBreakdown || expenseBreakdown.length === 0) {
    return (
      <MainCard title="Expense Breakdown">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No expense data available for the selected period</Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="Expense Breakdown">
      <Chart options={chartOptions} series={series} type="donut" height={350} />
    </MainCard>
  );
};

export default ExpenseBreakdown;
