import React from 'react';
import { useSelector } from 'react-redux';
import { Grid } from '@mui/material';
import AllyviaStats from '../../../common/AllyviaStats';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const InvoiceKPIs: React.FC = () => {
  const { invoiceStatistics } = useSelector((state) => (state as any).finance);
  const loading = useSelector((state) => (state as any).finance.loading.invoiceStatistics);

  // Helper function to determine theme based on value
  const getTheme = (value: number, isMoneyMaking = false, isNegative = false): 'alert' | 'success' | 'default' | 'warning' | 'gold' => {
    if (value === 0) return 'default';
    if (isMoneyMaking) return value > 0 ? 'success' : 'alert';
    if (isNegative) return value > 0 ? 'alert' : 'default';
    return 'default';
  };

  // Invoice KPIs
  const invoiceKPIs = [
    {
      title: 'Total Invoices',
      value: invoiceStatistics?.total_invoices || 0,
      theme: 'default' as const,
      loading: loading
    },
    {
      title: 'Total Amount',
      value: fmtMoney(invoiceStatistics?.total_amount || 0),
      theme: 'default' as const,
      loading: loading
    },
    {
      title: 'Outstanding Balance',
      value: fmtMoney(invoiceStatistics?.outstanding_balance || 0),
      theme: getTheme(invoiceStatistics?.outstanding_balance || 0),
      loading: loading
    },
    {
      title: 'Overdue Count',
      value: invoiceStatistics?.overdue_count || 0,
      theme: getTheme(invoiceStatistics?.overdue_count || 0, false, true),
      loading: loading
    }
  ];

  return (
    <Grid container spacing={3}>
      {invoiceKPIs.map((kpi, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
          <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
        </Grid>
      ))}
    </Grid>
  );
};

export default InvoiceKPIs;
