import React from 'react';
import { Grid, Typography, Box, Skeleton } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import MainCard from 'ui-component/cards/MainCard';

const InventorySummary: React.FC = () => {
  const { inventorySummary, loading } = useSelector((state: RootState) => state.analytics);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <MainCard title="Inventory Summary">
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </MainCard>
    );
  }

  if (!inventorySummary) {
    return (
      <MainCard title="Inventory Summary">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No inventory data available</Typography>
        </Box>
      </MainCard>
    );
  }

  const kpiData = [
    {
      title: 'Total Items',
      value: inventorySummary.total_items || 0,
      theme: 'default' as const,
      formatter: (val: number) => val.toLocaleString()
    },
    {
      title: 'Total Value',
      value: inventorySummary.total_inventory_value || 0,
      theme: 'success' as const,
      formatter: (val: number) => formatCurrency(val)
    },
    {
      title: 'Low Stock Items',
      value: inventorySummary.low_stock_count || 0,
      theme: 'warning' as const,
      formatter: (val: number) => val.toLocaleString()
    },
    {
      title: 'Out of Stock',
      value: inventorySummary.out_of_stock_count || 0,
      theme: 'alert' as const,
      formatter: (val: number) => val.toLocaleString()
    }
  ];

  return (
    <MainCard title="Inventory Summary">
      <Grid container spacing={3}>
        {kpiData.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.formatter(kpi.value)} theme={kpi.theme} size="medium" />
          </Grid>
        ))}
      </Grid>
    </MainCard>
  );
};

export default InventorySummary;
