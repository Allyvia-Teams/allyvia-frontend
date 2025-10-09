import React from 'react';
import { Grid, Typography, Box, Skeleton, Button } from '@mui/material';
import { Download } from '@mui/icons-material';
import { AnalyticsSummary } from 'types/analytics';
import { downloadCSV } from 'utils/csvDownload';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface KpiCardsProps {
  data: AnalyticsSummary | null;
  loading: boolean;
}

const KpiCards: React.FC<KpiCardsProps> = ({ data, loading }) => {
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  // Updated to match backend field names
  const kpiData = [
    {
      title: 'Total Revenue',
      value: data?.total_revenue || 0, // Backend: total_revenue
      theme: 'success' as const,
      trend: 'up' as const,
      formatter: (val: number) => formatCurrency(val, data?.currency)
    },
    {
      title: 'Payments Count',
      value: data?.payments_count || 0, // Backend: payments_count
      theme: 'default' as const,
      trend: 'neutral' as const,
      formatter: (val: number) => val.toLocaleString()
    },
    {
      title: 'Avg Ticket',
      value: data?.avg_ticket || 0, // Backend: avg_ticket
      theme: 'success' as const,
      trend: 'up' as const,
      formatter: (val: number) => formatCurrency(val, data?.currency)
    },
    {
      title: 'Expenses',
      value: data?.expenses || 0, // Backend: expenses
      theme: 'warning' as const,
      trend: 'neutral' as const,
      formatter: (val: number) => formatCurrency(val, data?.currency)
    },
    {
      title: 'Net Income',
      value: data?.net || 0, // Backend: net
      theme: (data?.net && data.net >= 0 ? 'success' : 'alert') as 'success' | 'alert',
      trend: (data?.net && data.net >= 0 ? 'up' : 'down') as 'up' | 'down',
      formatter: (val: number) => formatCurrency(val, data?.currency)
    },
    {
      title: 'Inventory Value',
      value: data?.inventory_value || 0, // Backend: inventory_value
      theme: 'default' as const,
      trend: 'neutral' as const,
      formatter: (val: number) => formatCurrency(val, data?.currency)
    }
  ];

  const handleExportKPIs = () => {
    if (!data) return;

    const csvData = [
      {
        Metric: 'Total Revenue',
        Value: data.total_revenue,
        Currency: data.currency || 'USD'
      },
      {
        Metric: 'Payments Count',
        Value: data.payments_count,
        Currency: ''
      },
      {
        Metric: 'Average Ticket',
        Value: data.avg_ticket,
        Currency: data.currency || 'USD'
      },
      {
        Metric: 'Expenses',
        Value: data.expenses,
        Currency: data.currency || 'USD'
      },
      {
        Metric: 'Net Income',
        Value: data.net,
        Currency: data.currency || 'USD'
      },
      {
        Metric: 'Inventory Value',
        Value: data.inventory_value,
        Currency: data.currency || 'USD'
      }
    ];

    downloadCSV('analytics-kpis.csv', csvData);
  };

  if (loading) {
    return (
      <Grid container spacing={3}>
        {kpiData.map((_, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={index}>
            <Skeleton variant="rectangular" height={120} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {kpiData.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.formatter(kpi.value)} theme={kpi.theme} size="medium" />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default KpiCards;
