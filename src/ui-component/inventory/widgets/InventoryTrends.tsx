import React from 'react';
import { Box, Typography } from '@mui/material';
import Chart from 'react-apexcharts';
import { useDispatch, useSelector } from '../../../store';
import { fetchInventoryTrends } from '../../../store/slices/inventory';

type Props = { days?: number; height?: number };

const InventoryTrends: React.FC<Props> = ({ days = 30, height = 320 }) => {
  const dispatch = useDispatch();
  const { trends, loading } = useSelector((state) => ({
    trends: state.inventory.trends,
    loading: state.inventory.loading
  }));

  React.useEffect(() => {
    dispatch(fetchInventoryTrends() as any);
  }, [dispatch]);

  const innerHeight = height - 40; // Account for padding

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Loading Trends...
        </Typography>
        <Box
          sx={{
            height: innerHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            borderRadius: 1
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Loading inventory trends...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!trends) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Inventory Distribution
        </Typography>
        <Box
          sx={{
            height: innerHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            borderRadius: 1
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No trend data available
          </Typography>
        </Box>
      </Box>
    );
  }

  // Handle donut chart data (new structure)
  if (trends.donut && trends.donut.labels && trends.donut.values) {
    const donutData = trends.donut;

    if (!donutData.labels.length || !donutData.values.length) {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Inventory Distribution
          </Typography>
          <Box
            sx={{
              height: innerHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.default',
              borderRadius: 1
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No trend data available
            </Typography>
          </Box>
        </Box>
      );
    }

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'donut',
        toolbar: { show: false }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
                color: '#666'
              },
              value: {
                show: true,
                fontSize: '16px',
                fontWeight: 700,
                color: '#333',
                formatter: (val: string) => `$${parseFloat(val).toLocaleString()}`
              },
              total: {
                show: true,
                showAlways: true,
                label: 'Total Value',
                fontSize: '14px',
                fontWeight: 600,
                color: '#666',
                formatter: () => `$${trends.total_value?.toLocaleString() || '0'}`
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: string, opts: any) => `${opts.w.config.labels[opts.seriesIndex]}: ${val}%`
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '12px'
      },
      tooltip: {
        y: {
          formatter: (val: number) => `$${val.toLocaleString()}`
        }
      },
      colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'],
      labels: donutData.labels
    };

    return (
      <Box>
        <Chart options={options} series={donutData.values} type="donut" height={innerHeight} />
      </Box>
    );
  }

  // Fallback for no data
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Inventory Distribution
      </Typography>
      <Box
        sx={{
          height: innerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          borderRadius: 1
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No trend data available
        </Typography>
      </Box>
    </Box>
  );
};

export default InventoryTrends;
