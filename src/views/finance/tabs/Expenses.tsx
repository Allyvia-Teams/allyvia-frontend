import React, { useEffect, useState } from 'react';
import { Grid, Box } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { ExpenseTable } from 'ui-component/finance/tables';
import { ExpenseKPIs } from 'ui-component/analytics/finance/kpis';
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

  return (
    <>
      {/* Expense KPIs */}
      <ExpenseKPIs />

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
