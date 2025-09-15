import React from 'react';
import { Box, Typography, Alert, Grid, Paper, Chip } from '@mui/material';
import Chart from 'react-apexcharts';
import { useDispatch, useSelector } from '../../../store';
import { fetchInventoryTrends } from '../../../store/slices/inventory';

type TrendPoint = { date: string; quantity: number };

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

  const innerHeight = height - 56; // account for title spacing

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          ({days} days)
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
            Loading trends…
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!trends) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          ({days} days)
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

  // Handle hybrid trend response
  if (trends.trend_type === 'line_chart') {
    // QuickBooks line chart data
    const data = trends.data;

    if (!data || !data.length || !data[0] || !data[0].stock_history) {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            ({startDate && endDate ? `${startDate} → ${endDate}` : `${days} days`})
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

    // Generate formatted date labels (dd mmm yy format)
    const categories = data[0].stock_history.map((point: TrendPoint, idx: number) => {
      if (point.date) {
        const date = new Date(point.date);
        return date.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: '2-digit'
        });
      }
      // Fallback to relative dates if no date provided
      const date = new Date();
      date.setDate(date.getDate() - (data[0].stock_history.length - 1 - idx));
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
      });
    });

    const chartSeries = data.map((s) => ({
      name: s.item_name,
      data: s.stock_history.map((p: TrendPoint) => p.quantity)
    }));

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        stacked: true
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%',
          borderRadius: 0
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories,
        labels: {
          show: true,
          style: {
            fontSize: '11px',
            fontWeight: 500,
            colors: ['#666']
          },
          rotate: -45,
          rotateAlways: false
        },
        axisTicks: { show: true },
        axisBorder: { show: false }
      },
      yaxis: {
        decimalsInFloat: 0,
        forceNiceScale: true,
        title: {
          text: 'Total Stock'
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '12px'
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: function (val) {
            return val + ' units';
          }
        }
      },
      colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0']
    };

    return (
      <Box>
        <Chart options={options} series={chartSeries} type="bar" height={innerHeight} />
      </Box>
    );
  } else {
    // Local donut chart data - handle donut_chart trend type
    const categoryData = (trends as any)?.categories || [];
    const total_value = (trends as any)?.total_value;

    // Debug logging for donut chart data
    console.log('Donut chart data:', {
      categoryData,
      total_value,
      trends
    });

    // Convert total_value to number if it's a string
    let numericTotalValue = typeof total_value === 'string' ? parseFloat(total_value) : typeof total_value === 'number' ? total_value : 0;

    // Fallback: calculate total from category values if total_value is not provided or is 0
    if (numericTotalValue === 0 && categoryData.length > 0) {
      numericTotalValue = categoryData.reduce((sum: number, cat: any) => {
        const catValue =
          typeof cat.total_value === 'string' ? parseFloat(cat.total_value) : typeof cat.total_value === 'number' ? cat.total_value : 0;
        return sum + catValue;
      }, 0);
    }

    if (!categoryData || !categoryData.length) {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}></Typography>
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
              No category data available
            </Typography>
          </Box>
        </Box>
      );
    }

    const chartSeries = categoryData.map((cat: any) => cat.total_value);
    const labels = categoryData.map((cat: any) => cat.category);

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'donut',
        height: innerHeight
      },
      series: chartSeries,
      labels: labels,
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Value',
                formatter: () => `$${numericTotalValue.toFixed(2)}`
              }
            }
          }
        }
      },
      legend: {
        show: false
      },
      dataLabels: {
        enabled: true,
        formatter: (val: string) => {
          const num = parseFloat(val);
          return `${isNaN(num) ? '0.0' : num.toFixed(1)}%`;
        }
      },
      colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0']
    };

    // Calculate percentages and prepare legend data
    const legendData = categoryData.map((cat: any, index: number) => {
      const value =
        typeof cat.total_value === 'string' ? parseFloat(cat.total_value) : typeof cat.total_value === 'number' ? cat.total_value : 0;
      const percentage = numericTotalValue > 0 ? (value / numericTotalValue) * 100 : 0;
      const color = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'][index % 5];

      return {
        category: cat.category,
        value: value,
        percentage: percentage,
        color: color
      };
    });

    return (
      <Grid container spacing={2} sx={{ height: innerHeight }}>
        {/* Donut Chart */}
        <Grid size={7}>
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Chart options={options} series={chartSeries} type="donut" height={innerHeight - 60} />
          </Box>
        </Grid>

        {/* Legend with Details */}
        <Grid size={5}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                flex: 1,
                overflow: 'auto',
                minHeight: 0,
                '&::-webkit-scrollbar': {
                  width: '6px'
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'transparent'
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '3px',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.3)'
                  }
                }
              }}
            >
              {legendData.map((item: any, index: number) => (
                <Box key={item.category} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Color indicator */}
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      flexShrink: 0
                    }}
                  />

                  {/* Category info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {item.category}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.percentage.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Total Summary - Fixed at bottom */}
            <Box
              sx={{
                mt: 'auto',
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                flexShrink: 0
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Total Value:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ${numericTotalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  }
};

export default InventoryTrends;
