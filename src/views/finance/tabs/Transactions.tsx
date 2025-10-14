import React, { useEffect, useMemo, useState } from 'react';
import { Grid, Divider, Typography } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { InvoiceTable, ExpenseTable } from 'ui-component/finance/tables';
import { useDispatch, useSelector } from 'store';
import { fetchInvoiceList, fetchInvoiceStatistics } from 'store/slices/finance';
import type { RootState } from 'store';
import type { InvoiceRow, Expense } from 'types/finance';

const TransactionsTab: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Get data directly from Redux with proper types
  const dispatch = useDispatch();
  const { invoiceList, invoiceStatistics, expensesList, loading: loadingState, filters } = useSelector((state: RootState) => state.finance);

  // Process data with proper typing
  // Support both array response and { items, pagination } response structures
  const invoices: InvoiceRow[] = Array.isArray(invoiceList)
    ? (invoiceList as any)
    : Array.isArray((invoiceList as any)?.items)
      ? ((invoiceList as any).items as any)
      : [];
  const expenses: Expense[] = Array.isArray(expensesList?.items) ? expensesList.items : [];

  // Local filter UI state for invoices
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState<string>('');
  const [invAmountRange, setInvAmountRange] = useState<string>('');
  const [invCustomerRefId, setInvCustomerRefId] = useState<string>('');
  const [invIsVoided, setInvIsVoided] = useState<string>('');
  const [invOrdering, setInvOrdering] = useState<string>('');
  const [invPageSize, setInvPageSize] = useState<number>(50);

  // Ensure invoice data loads when tab mounts or filters change
  useEffect(() => {
    const startDate = (filters as any)?.startDate;
    const endDate = (filters as any)?.endDate;
    if (startDate && endDate) {
      dispatch(fetchInvoiceStatistics({ startDate, endDate }) as any);
      dispatch(
        fetchInvoiceList({
          startDate,
          endDate,
          search: invSearch || undefined,
          status: invStatus || undefined,
          amount_range: invAmountRange || undefined,
          customer_ref_id: invCustomerRefId || undefined,
          is_voided: invIsVoided ? invIsVoided === 'true' : undefined,
          ordering: invOrdering || undefined,
          page_size: invPageSize || undefined
        }) as any
      );
    }
  }, [
    dispatch,
    (filters as any)?.startDate,
    (filters as any)?.endDate,
    invSearch,
    invStatus,
    invAmountRange,
    invCustomerRefId,
    invIsVoided,
    invOrdering,
    invPageSize
  ]);

  // Calculate invoice summary from Redux data
  const invoiceSummary = useMemo(() => {
    // Use the real invoice statistics from Redux if available
    if (invoiceStatistics) {
      return {
        total_invoices: invoiceStatistics.total_invoices || 0,
        unpaid_count: invoiceStatistics.unpaid_count || 0,
        overdue_count: invoiceStatistics.overdue_count || 0,
        paid_count: invoiceStatistics.paid_count || 0,
        total_amount: invoiceStatistics.total_amount || 0,
        outstanding_balance: invoiceStatistics.outstanding_balance || 0
      };
    }

    // Fallback to calculated values from invoice rows
    const totalAmt = invoices.reduce((a, r) => a + parseFloat(r.total_amount || '0'), 0);
    const count = invoices.length;
    const paidCount = invoices.filter((r) => r.status === 'paid').length;
    const unpaidCount = invoices.filter((r) => r.status === 'pending').length;
    const overdueCount = invoices.filter((r) => r.status === 'overdue').length;
    const outstandingBalance = invoices.reduce((a, r) => a + parseFloat(r.balance || '0'), 0);

    return {
      total_invoices: count,
      unpaid_count: unpaidCount,
      overdue_count: overdueCount,
      paid_count: paidCount,
      total_amount: totalAmt,
      outstanding_balance: outstandingBalance
    };
  }, [invoices, invoiceStatistics]);

  // Expenses summary from expensesList data
  const expensesSummary = useMemo(() => {
    return {
      totalAmt: expenses.reduce((sum: number, expense: Expense) => sum + parseFloat(expense.amount || '0'), 0),
      count: expenses.length,
      avg:
        expenses.length > 0
          ? expenses.reduce((sum: number, expense: Expense) => sum + parseFloat(expense.amount || '0'), 0) / expenses.length
          : 0,
      unpaidAmt: expenses.reduce((sum: number, expense: Expense) => sum + parseFloat(expense.balance || '0'), 0),
      unpaidCount: expenses.filter((expense: Expense) => expense.status === 'unpaid').length,
      paidCount: expenses.filter((expense: Expense) => expense.status === 'paid').length,
      overdueCount: expenses.filter((expense: Expense) => {
        if (expense.status !== 'unpaid') return false;
        const dueDate = new Date(expense.due_date);
        return dueDate < new Date();
      }).length
    };
  }, [expenses]);

  // Consolidated Expenses table is encapsulated in <ExpenseTable />

  // Invoice KPIs configuration
  const invoiceKPIs = [
    {
      title: 'Total Amount',
      value: fmtMoney(invoiceSummary.total_amount || 0),
      theme: 'success' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Total Invoices',
      value: invoiceSummary.total_invoices || 0,
      theme: 'default' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Outstanding',
      value: fmtMoney(invoiceSummary.outstanding_balance || 0),
      theme: 'warning' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Paid',
      value: invoiceSummary.paid_count || 0,
      theme: 'success' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Unpaid',
      value: invoiceSummary.unpaid_count || 0,
      theme: 'warning' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Overdue',
      value: invoiceSummary.overdue_count || 0,
      theme: 'alert' as const,
      loading: loadingState.invoiceStatistics || false
    }
  ];

  // Expenses KPIs configuration
  const expensesKPIs = [
    {
      title: 'Total Expenses',
      value: fmtMoney(expensesSummary.totalAmt),
      theme: 'default' as const,
      loading: loadingState.expensesList || false
    },
    {
      title: 'Unpaid Amount',
      value: fmtMoney(expensesSummary.unpaidAmt),
      theme: 'warning' as const,
      loading: loadingState.expensesList || false
    },
    {
      title: 'Unpaid Expenses',
      value: expensesSummary.unpaidCount,
      theme: 'warning' as const,
      loading: loadingState.expensesList || false
    },
    {
      title: 'Overdue Expenses',
      value: expensesSummary.overdueCount,
      theme: 'alert' as const,
      loading: loadingState.expensesList || false
    }
  ];

  return (
    <>
      {/* Invoice KPIs */}
      <Grid container spacing={gridSpacing}>
        {invoiceKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 2 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Invoice Table */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12 }}>
          <MainCard title="Invoices">
            <InvoiceTable invoices={invoices} />
          </MainCard>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Consolidated Expenses (with API pagination and filters) */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12 }}>
          <MainCard title="Expenses" secondary={<Typography variant="caption">Filtered by date range</Typography>}>
            <ExpenseTable />
          </MainCard>
        </Grid>
      </Grid>
    </>
  );
};

export default TransactionsTab;
