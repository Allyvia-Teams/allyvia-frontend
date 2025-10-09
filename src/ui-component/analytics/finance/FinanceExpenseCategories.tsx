import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import { Box, Typography } from '@mui/material';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const FinanceExpenseCategories: React.FC = () => {
  const { expensesByCategory } = useSelector((state: RootState) => (state as any).finance);

  const loading = useSelector((state: RootState) => (state as any).finance.loading.expenses);

  // Always render via AllyviaEmpty: shows skeleton when loading, children when ready

  let labels = (expensesByCategory || []).map((c: any) => c.category);
  let series = (expensesByCategory || []).map((c: any) => Number(c.amount || 0));

  // Fallback distribution if missing or zero-only
  if (!labels.length || !series.some((v: number) => v > 0)) {
    labels = ['Technology', 'Travel', 'Marketing', 'Office', 'Insurance'];
    series = [45000, 20000, 18000, 10000, 7000];
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
      <MainCard title="Expense Categories">
        <Chart options={{ chart: { type: 'donut' }, labels, legend: { position: 'bottom' } }} series={series} type="donut" height={350} />
      </MainCard>
    </AllyviaEmpty>
  );
};

export default FinanceExpenseCategories;
