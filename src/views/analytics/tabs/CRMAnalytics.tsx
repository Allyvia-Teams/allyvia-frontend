import React from 'react';
import { Grid, Box, Typography, Card, CardContent, Alert } from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface CRMAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const CRMAnalytics: React.FC<CRMAnalyticsProps> = ({ dateRange, isLoading }) => {
  // Feature flag check
  const EXCLUDE_CRM_ANALYTICS = import.meta.env.VITE_EXCLUDE_CRM_ANALYTICS === 'true';

  const { inventorySummary: analyticsInventorySummary, inventoryAlerts } = useSelector((state: RootState) => state.analytics);

  if (EXCLUDE_CRM_ANALYTICS) {
    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            CRM Analytics are currently disabled via feature flag. Contact your administrator to enable CRM analytics.
          </Alert>
        </Grid>
      </Grid>
    );
  }

  // Mock CRM data for demonstration
  const crmKpis = [
    { title: 'Total Leads', value: (1247).toLocaleString(), trend: 'up' as const, theme: 'success' as const },
    { title: 'Conversion Rate', value: '12.5%', trend: 'up' as const, theme: 'success' as const },
    { title: 'Active Customers', value: (892).toLocaleString(), trend: 'neutral' as const, theme: 'default' as const },
    {
      title: 'Customer Lifetime Value',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(2450),
      trend: 'up' as const,
      theme: 'success' as const
    }
  ];

  return (
    <Grid container spacing={3}>
      {/* CRM KPIs - using AllyviaStats */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {crmKpis.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} trend={kpi.trend} size="medium" />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* CRM Charts Placeholder */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Lead Conversion Funnel
            </Typography>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">CRM Analytics Chart Placeholder</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Customer Acquisition Trend
            </Typography>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">CRM Analytics Chart Placeholder</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* CRM Tables Placeholder */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Converting Sources
            </Typography>
            <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">CRM Analytics Table Placeholder</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Customer Segments
            </Typography>
            <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">CRM Analytics Table Placeholder</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CRMAnalytics;
