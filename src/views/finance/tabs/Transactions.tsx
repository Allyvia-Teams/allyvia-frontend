import React, { useEffect, useState } from 'react';
import { Grid, Divider, Typography, Tabs, Tab, Box } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { InvoiceTable, ExpenseTable } from 'ui-component/finance/tables';
import { ExpenseKPIs } from 'ui-component/analytics/finance/kpis';
import { useDispatch, useSelector } from 'store';
import {
  fetchInvoiceList,
  fetchInvoiceStatistics,
  fetchExpensesList,
  fetchExpenseStats,
  fetchPaymentSummary,
  fetchPaymentList
} from 'store/slices/finance';
import type { RootState } from 'store';
import type { InvoiceRow } from 'types/finance';

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
    paymentSummary,
    loading: loadingState,
    filters
  } = useSelector((state: RootState) => state.finance);

  // Process data with proper typing
  const invoices: InvoiceRow[] = Array.isArray(invoiceList)
    ? (invoiceList as any)
    : Array.isArray((invoiceList as any)?.items)
      ? ((invoiceList as any).items as any)
      : [];

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
          page_size: 50
        }) as any
      );

      dispatch(fetchExpenseStats({ startDate, endDate }) as any);
      dispatch(
        fetchExpensesList({
          startDate,
          endDate,
          pageSize: 50
        }) as any
      );

      dispatch(fetchPaymentSummary({ startDate, endDate }) as any);
      dispatch(
        fetchPaymentList({
          startDate,
          endDate,
          page: 1
        }) as any
      );
    }
  }, [dispatch, filters]);

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
        <ExpenseKPIs />

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
