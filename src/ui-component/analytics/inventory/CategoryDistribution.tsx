import React from 'react';
import { Typography, Box, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const CategoryDistribution: React.FC = () => {
  const { inventoryItemsTreeMap, loading } = useSelector((state: RootState) => state.analytics);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'donut',
      height: 300
    },
    labels: inventoryItemsTreeMap?.categories?.map((item) => item.name) || [],
    colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#36A2EB'],
    legend: {
      show: false // No legends
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value.toLocaleString()} units`
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: string) => `${val}%`
    }
  };

  const series = inventoryItemsTreeMap?.categories?.map((item) => item.quantity) || [];
  const currency = inventoryItemsTreeMap?.currency || 'USD';

  if (loading) {
    return (
      <MainCard title="Category Distribution">
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="rectangular" height={300} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="rectangular" height={300} />
          </Box>
        </Box>
      </MainCard>
    );
  }

  if (!inventoryItemsTreeMap?.categories || inventoryItemsTreeMap.categories.length === 0) {
    return (
      <MainCard title="Category Distribution">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No category data available for the selected period</Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="Category Distribution">
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Left side - Donut chart without legends */}
        <Box sx={{ flex: 1 }}>
          <Chart options={chartOptions} series={series} type="donut" height={300} />
        </Box>

        {/* Right side - Categories list with percentages and values */}
        <Box sx={{ flex: 1, pl: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Categories
          </Typography>
          <List sx={{ p: 0 }}>
            {inventoryItemsTreeMap.categories.map((category, index) => {
              const percentage =
                inventoryItemsTreeMap.totals.categories.quantity > 0
                  ? ((category.quantity / inventoryItemsTreeMap.totals.categories.quantity) * 100).toFixed(1)
                  : '0.0';

              return (
                <React.Fragment key={category.name}>
                  <ListItem sx={{ px: 0, py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      {/* Color indicator */}
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: chartOptions.colors?.[index % (chartOptions.colors?.length || 1)],
                          mr: 2,
                          flexShrink: 0
                        }}
                      />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {category.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              {percentage}%
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {category.quantity.toLocaleString()} units
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency
                              }).format(category.value)}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </ListItem>
                  {index < inventoryItemsTreeMap.categories.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </Box>
      </Box>
    </MainCard>
  );
};

export default CategoryDistribution;
