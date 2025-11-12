import React, { useEffect } from 'react';
import { Grid, Box } from '@mui/material';
import { gridSpacing } from 'store/constant';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { InvoiceTable } from 'ui-component/finance/tables';
import { useDispatch, useSelector } from 'store';
import { fetchInvoiceList, fetchInvoiceStatistics } from 'store/slices/finance';
import type { RootState } from 'store';
import type { InvoiceRow } from 'types/finance';

const InvoicesTab: React.FC = () => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Get data directly from Redux with proper types
  const dispatch = useDispatch();
  const { invoiceList, invoiceStatistics, loading: loadingState, filters } = useSelector((state: RootState) => state.finance);

  // Process data with proper typing
  const invoices: InvoiceRow[] = Array.isArray(invoiceList)
    ? (invoiceList as any)
    : Array.isArray((invoiceList as any)?.items)
      ? ((invoiceList as any).items as any)
      : [];

  // Ensure invoice data loads when tab mounts or filters change
  useEffect(() => {
    const startDate = (filters as any)?.startDate;
    const endDate = (filters as any)?.endDate;
    if (startDate && endDate) {
      dispatch(fetchInvoiceStatistics({ startDate, endDate }) as any);
      dispatch(fetchInvoiceList({ startDate, endDate }) as any);
    }
  }, [dispatch, (filters as any)?.startDate, (filters as any)?.endDate]);

  // Invoice KPIs
  const invoiceKPIs = [
    {
      title: 'Total Invoices',
      value: invoiceStatistics?.total_invoices || invoiceStatistics?.total_count || 0,
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

  return (
    <>
      {/* Invoice KPIs */}
      <Grid container spacing={gridSpacing}>
        {invoiceKPIs.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      {/* Invoice Table */}
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12 }}>
            <InvoiceTable invoices={invoices} />
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default InvoicesTab;
