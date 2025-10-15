import React, { useEffect, useState } from 'react';
import { Grid, Box } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { ExpenseTable } from 'ui-component/finance/tables';
import { useDispatch, useSelector } from 'store';
import { fetchExpensesList, fetchExpenseStats } from 'store/slices/finance';
import type { RootState } from 'store';

const ExpensesTab: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Get data directly from Redux with proper types
  const dispatch = useDispatch();
  const { expensesList, expenseStats, loading: loadingState, filters } = useSelector((state: RootState) => state.finance);

  // Local filter UI state for expenses
  const [expSearch, setExpSearch] = useState('');
  const [expStatus, setExpStatus] = useState<string>('');
  const [expAmountRange, setExpAmountRange] = useState<string>('');
  const [expVendorRefId, setExpVendorRefId] = useState<string>('');
  const [expSyncStatus, setExpSyncStatus] = useState<string>('');
  const [expOrdering, setExpOrdering] = useState<string>('');
  const [expPageSize, setExpPageSize] = useState<number>(50);

  // Ensure expense data loads when tab mounts or filters change
  useEffect(() => {
    const startDate = (filters as any)?.startDate;
    const endDate = (filters as any)?.endDate;
    if (startDate && endDate) {
      dispatch(fetchExpenseStats({ startDate, endDate }) as any);
      dispatch(
        fetchExpensesList({
          startDate,
          endDate,
          search: expSearch || undefined,
          status: expStatus || undefined,
          min_amount: expAmountRange ? parseFloat(expAmountRange.split('-')[0]) : undefined,
          max_amount: expAmountRange ? parseFloat(expAmountRange.split('-')[1]) : undefined,
          vendorRefId: expVendorRefId || undefined,
          sync_status: expSyncStatus || undefined,
          ordering: expOrdering || undefined,
          pageSize: expPageSize
        }) as any
      );
    }
  }, [
    dispatch,
    (filters as any)?.startDate,
    (filters as any)?.endDate,
    expSearch,
    expStatus,
    expAmountRange,
    expVendorRefId,
    expSyncStatus,
    expOrdering,
    expPageSize
  ]);

  // Expense KPIs using expenseStats API
  const expenseKPIs = [
    {
      title: 'Total Expenses',
      value: expenseStats ? fmtMoney(parseFloat(expenseStats.total_expenses)) : fmtMoney(0),
      theme: 'alert' as const,
      loading: loadingState.expenseStats || false
    },
    {
      title: 'Expense Count',
      value: expenseStats?.expense_count || 0,
      theme: 'default' as const,
      loading: loadingState.expenseStats || false
    },
    {
      title: 'Average Expense',
      value: expenseStats ? fmtMoney(parseFloat(expenseStats.average_expense)) : fmtMoney(0),
      theme: 'default' as const,
      loading: loadingState.expenseStats || false
    },
    {
      title: 'Top Category',
      value: expenseStats?.top_category || '—',
      theme: 'warning' as const,
      loading: loadingState.expenseStats || false
    }
  ];

  return (
    <>
      {/* Expense KPIs */}
      <Grid container spacing={gridSpacing}>
        {expenseKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      {/* Expense Table */}
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12 }}>
            <ExpenseTable />
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default ExpensesTab;
