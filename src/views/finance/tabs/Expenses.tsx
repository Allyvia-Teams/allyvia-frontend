import React, { useEffect } from 'react';
import { Grid, Box } from '@mui/material';
import { gridSpacing } from 'store/constant';
import { ExpenseTable } from 'ui-component/finance/tables';
import { ExpenseKPIs } from 'ui-component/analytics/finance/kpis';
import { useDispatch, useSelector } from 'store';
import { fetchExpensesList, fetchExpenseStats } from 'store/slices/finance';
import type { RootState } from 'store';

const ExpensesTab: React.FC = () => {
  const dispatch = useDispatch();
  const { filters } = useSelector((state: RootState) => state.finance);

  useEffect(() => {
    const startDate = (filters as any)?.startDate;
    const endDate = (filters as any)?.endDate;
    if (startDate && endDate) {
      dispatch(fetchExpenseStats({ startDate, endDate }) as any);
      dispatch(
        fetchExpensesList({
          startDate,
          endDate,
          pageSize: 50
        }) as any
      );
    }
  }, [dispatch, filters]);

  return (
    <>
      <ExpenseKPIs />

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
