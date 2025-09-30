import React from 'react';
import { Box, Typography, Stack, Chip } from '@mui/material';
import Chart from 'react-apexcharts';
import { useSelector } from '../../../store';
import { getChartColors } from 'styles/chartColors';

type Props = { days?: number; height?: number };

const InventoryTrends: React.FC<Props> = ({ days = 30, height = 320 }) => {
  const { trends, loading } = useSelector((state) => ({
    trends: state.analytics.inventoryTrends,
    loading: state.analytics.loading
  }));

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
                formatter: (val: string) => `$${(parseFloat(val) || 0).toLocaleString()}`
              },
              total: {
                show: true,
                showAlways: true,
                label: 'Total Value',
                fontSize: '14px',
                fontWeight: 600,
                color: '#666',
                formatter: () => `$${(trends.total_value || 0).toLocaleString()}`
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        show: false
      },
      tooltip: {
        y: {
          formatter: (val: number) => `$${(val || 0).toLocaleString()}`
        }
      },
      colors: getChartColors('teal').colors,
      labels: donutData.labels
    };

    // Calculate percentages for legend
    const totalValue = donutData.values.reduce((sum, val) => sum + val, 0);
    const legendData = donutData.labels
      .map((label, index) => ({
        label,
        value: donutData.values[index],
        percentage: ((donutData.values[index] / totalValue) * 100).toFixed(2),
        colorIndex: index
      }))
      .filter((item) => item.value > 0) // Filter out 0 values
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

    return (
      <Box sx={{ display: 'flex', gap: 2, height: innerHeight }}>
        {/* Donut Chart */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Chart options={options} series={donutData.values} type="donut" height={innerHeight} />
        </Box>

        {/* Legend with Values */}
        <Box
          sx={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            height: innerHeight
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Categories
          </Typography>

          {/* Scrollable Categories */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              pr: 1,
              mb: 2
            }}
          >
            <Stack spacing={1}>
              {legendData.map((item, index) => (
                <Box
                  key={item.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 0.5,
                    px: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: options.colors?.[item.colorIndex] || '#666'
                      }}
                    />
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {item.label}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      ${(item.value || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.percentage}%
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Divider */}
          <Box
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              my: 1,
              flexShrink: 0
            }}
          />

          {/* Fixed Total at Bottom */}
          <Box
            sx={{
              p: 1.5,
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Total
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              ${(totalValue || 0).toLocaleString()}
            </Typography>
          </Box>
        </Box>
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
