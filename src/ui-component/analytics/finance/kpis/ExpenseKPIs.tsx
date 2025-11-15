import React from 'react';
import { useSelector } from 'react-redux';
import { Grid } from '@mui/material';
import AllyviaStats from '../../../common/AllyviaStats';

const fmtMoney = (n: number | string) => {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
};

const ExpenseKPIs: React.FC = () => {
  const { expenseStats } = useSelector((state) => (state as any).finance);
  const loading = useSelector((state) => (state as any).finance.loading.expenseStats);

  // Helper function to determine theme based on value
  const getTheme = (value: number | string, isNegative = false): 'alert' | 'success' | 'default' | 'warning' | 'gold' => {
    if (typeof value === 'string') return 'default';
    if (value === 0) return 'default';
    if (isNegative) return value > 0 ? 'alert' : 'default';
    return 'default';
  };

  // Expense KPIs using the new expenseStats API
  const expenseKPIs = [
    {
      title: 'Total Expenses',
      value: expenseStats ? fmtMoney(expenseStats.total_expenses) : fmtMoney(0),
      theme: getTheme(expenseStats?.total_expenses || 0),
      loading: loading
    },
    {
      title: 'Expense Count',
      value: expenseStats?.expense_count || 0,
      theme: 'default' as const,
      loading: loading
    },
    {
      title: 'Average Expense',
      value: expenseStats ? fmtMoney(expenseStats.average_expense) : fmtMoney(0),
      theme: 'default' as const,
      loading: loading
    },
    {
      title: 'Top Category',
      value: expenseStats?.top_category || '—',
      theme: 'default' as const,
      loading: loading
    }
  ];

  return (
    <Grid container spacing={3}>
      {expenseKPIs.map((kpi, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
          <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ExpenseKPIs;
