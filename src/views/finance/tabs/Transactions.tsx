import React, { useEffect, useMemo, useState } from 'react';
import { Grid, Divider, Typography, Tabs, Tab, Box } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { InvoiceTable, ExpenseTable } from 'ui-component/finance/tables';
import { useDispatch, useSelector } from 'store';
import {
  fetchInvoiceList,
  fetchInvoiceStatistics,
  fetchExpensesList,
  fetchExpenseSummary,
  fetchPaymentSummary,
  fetchPaymentStatistics,
  fetchPaymentList
} from 'store/slices/finance';
import type { RootState } from 'store';
import type { InvoiceRow, Expense } from 'types/finance';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`transactions-tabpanel-${index}`}
      aria-labelledby={`transactions-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const TransactionsTab: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Get data directly from Redux with proper types
  const dispatch = useDispatch();
  const {
    invoiceList,
    invoiceStatistics,
    expensesList,
    expenseSummary,
    paymentSummary,
    paymentStatistics,
    paymentList,
    loading: loadingState,
    filters
  } = useSelector((state: RootState) => state.finance);

  // Process data with proper typing
  const invoices: InvoiceRow[] = Array.isArray(invoiceList)
    ? (invoiceList as any)
    : Array.isArray((invoiceList as any)?.items)
      ? ((invoiceList as any).items as any)
      : [];
  const expenses: Expense[] = Array.isArray(expensesList?.items) ? expensesList.items : [];
  const payments: any[] = Array.isArray(paymentList?.items) ? paymentList.items : [];

  // Local filter UI state for invoices
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState<string>('');
  const [invAmountRange, setInvAmountRange] = useState<string>('');
  const [invCustomerRefId, setInvCustomerRefId] = useState<string>('');
  const [invIsVoided, setInvIsVoided] = useState<string>('');
  const [invOrdering, setInvOrdering] = useState<string>('');
  const [invPageSize, setInvPageSize] = useState<number>(50);

  // Local filter UI state for expenses
  const [expSearch, setExpSearch] = useState('');
  const [expStatus, setExpStatus] = useState<string>('');
  const [expAmountRange, setExpAmountRange] = useState<string>('');
  const [expVendorRefId, setExpVendorRefId] = useState<string>('');
  const [expSyncStatus, setExpSyncStatus] = useState<string>('');
  const [expOrdering, setExpOrdering] = useState<string>('');
  const [expPageSize, setExpPageSize] = useState<number>(50);

  // Local filter UI state for payments
  const [paySearch, setPaySearch] = useState('');
  const [payStatus, setPayStatus] = useState<string>('');
  const [payAmountRange, setPayAmountRange] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('');
  const [payOrdering, setPayOrdering] = useState<string>('');
  const [payPageSize, setPayPageSize] = useState<number>(50);

  // Ensure data loads when tab mounts or filters change
  useEffect(() => {
    const startDate = (filters as any)?.startDate;
    const endDate = (filters as any)?.endDate;
    if (startDate && endDate) {
      // Load all data for all tabs
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
          page_size: invPageSize
        }) as any
      );

      dispatch(fetchExpenseSummary({ startDate, endDate }) as any);
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

      dispatch(fetchPaymentSummary({ startDate, endDate }) as any);
      dispatch(fetchPaymentStatistics({ startDate, endDate }) as any);
      dispatch(
        fetchPaymentList({
          startDate,
          endDate,
          page: 1
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
    invPageSize,
    expSearch,
    expStatus,
    expAmountRange,
    expVendorRefId,
    expSyncStatus,
    expOrdering,
    expPageSize,
    paySearch,
    payStatus,
    payAmountRange,
    payMethod,
    payOrdering,
    payPageSize
  ]);

  // Invoice KPIs
  const invoiceKPIs = [
    {
      title: 'Total Invoices',
      value: invoiceStatistics?.total_count || 0,
      theme: 'default' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Total Amount',
      value: invoiceStatistics ? fmtMoney(invoiceStatistics.total_amount || 0) : fmtMoney(0),
      theme: 'success' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Paid',
      value: invoiceStatistics?.paid_count || 0,
      theme: 'success' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Unpaid',
      value: invoiceStatistics?.unpaid_count || 0,
      theme: 'warning' as const,
      loading: loadingState.invoiceStatistics || false
    },
    {
      title: 'Overdue',
      value: invoiceStatistics?.overdue_count || 0,
      theme: 'alert' as const,
      loading: loadingState.invoiceStatistics || false
    }
  ];

  // Expense KPIs
  const expenseKPIs = [
    {
      title: 'Total Expenses',
      value: expenseSummary ? fmtMoney(expenseSummary.total_expenses) : fmtMoney(0),
      theme: 'alert' as const,
      loading: loadingState.expenseSummary || false
    },
    {
      title: 'Expense Count',
      value: expenseSummary?.expense_count || 0,
      theme: 'default' as const,
      loading: loadingState.expenseSummary || false
    },
    {
      title: 'Average Expense',
      value: expenseSummary ? fmtMoney(expenseSummary.average_expense) : fmtMoney(0),
      theme: 'default' as const,
      loading: loadingState.expenseSummary || false
    },
    {
      title: 'Top Category',
      value: expenseSummary?.top_category || '—',
      theme: 'warning' as const,
      loading: loadingState.expenseSummary || false
    }
  ];

  // Payment KPIs
  const paymentKPIs = [
    {
      title: 'Total Payments',
      value: paymentSummary ? fmtMoney(paymentSummary.total_payments) : fmtMoney(0),
      theme: 'success' as const,
      loading: loadingState.paymentSummary || false
    },
    {
      title: 'Payment Count',
      value: paymentSummary?.payment_count || 0,
      theme: 'default' as const,
      loading: loadingState.paymentSummary || false
    },
    {
      title: 'Average Payment',
      value:
        paymentSummary && paymentSummary.payment_count > 0
          ? fmtMoney(paymentSummary.total_payments / paymentSummary.payment_count)
          : fmtMoney(0),
      theme: 'default' as const,
      loading: loadingState.paymentSummary || false
    },
    {
      title: 'Success Rate',
      value: '95%', // Placeholder - will be calculated from actual data
      theme: 'success' as const,
      loading: loadingState.paymentSummary || false
    }
  ];

  return (
    <MainCard>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="transactions tabs">
          <Tab label="Invoices" />
          <Tab label="Expenses" />
          <Tab label="Payments" />
          <Tab label="Ledger" />
        </Tabs>
      </Box>

      {/* Invoices Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Invoice KPIs */}
        <Grid container spacing={gridSpacing}>
          {invoiceKPIs.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
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
      </TabPanel>

      {/* Expenses Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* Expense KPIs */}
        <Grid container spacing={gridSpacing}>
          {expenseKPIs.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Expense Table */}
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="Expenses">
              <ExpenseTable />
            </MainCard>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Payments Tab */}
      <TabPanel value={tabValue} index={2}>
        {/* Payment KPIs */}
        <Grid container spacing={gridSpacing}>
          {paymentKPIs.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Payment Table */}
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="Payments">
              <Typography variant="body2" color="text.secondary">
                Payment table component will be implemented here
              </Typography>
            </MainCard>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Ledger Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="General Ledger">
              <Typography variant="body2" color="text.secondary">
                Ledger table component will be implemented here
              </Typography>
            </MainCard>
          </Grid>
        </Grid>
      </TabPanel>
    </MainCard>
  );
};

export default TransactionsTab;
