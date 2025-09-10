import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import Chart from 'react-apexcharts';
import { useDispatch, useSelector } from 'store';
import { fetchInventoryTrends } from 'store/slices/inventory';

type TrendPoint = { date: string; quantity: number };

type Props = { itemIds?: string[]; days?: number; title?: string; height?: number; startDate?: string; endDate?: string };

const InventoryTrendWidget: React.FC<Props> = ({ itemIds, days = 30, title = 'Inventory Trends', height = 320, startDate, endDate }) => {
  const dispatch = useDispatch();
  const { trends, loading } = useSelector((state) => ({
    trends: state.inventory.trends,
    loading: state.inventory.loading
  }));

  // Debug logging
  console.log('InventoryTrendWidget - Redux state:', {
    trends,
    loading,
    startDate,
    endDate
  });

  React.useEffect(() => {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (days - 1) * 86400000);

    dispatch(
      fetchInventoryTrends({
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        item_ids: (itemIds || []).join(',')
      }) as any
    );
  }, [dispatch, itemIds, days, startDate, endDate]);

  const innerHeight = height - 56; // account for title spacing

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title} ({days} days)
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
          {title} ({days} days)
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
            {title} ({startDate && endDate ? `${startDate} → ${endDate}` : `${days} days`})
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
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title} ({startDate && endDate ? `${startDate} → ${endDate}` : `${days} days`})
        </Typography>
        <Chart options={options} series={chartSeries} type="bar" height={innerHeight} />
      </Box>
    );
  } else {
    // Local donut chart data
    const { categories: categoryData, total_value, total_items } = trends;

    if (!categoryData || !categoryData.length) {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {title} (Local Data)
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
              No category data available
            </Typography>
          </Box>
        </Box>
      );
    }

    const chartSeries = categoryData.map((cat) => cat.total_value);
    const labels = categoryData.map((cat) => cat.category);

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
                formatter: () => `$${total_value.toFixed(2)}`
              }
            }
          }
        }
      },
      legend: {
        position: 'bottom',
        fontSize: '12px'
      },
      dataLabels: {
        enabled: true,
        formatter: (val: string) => `${parseFloat(val).toFixed(1)}%`
      },
      colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0']
    };

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title} (Local Data)
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing local inventory data. Connect to QuickBooks for time-based trends.
        </Alert>
        <Chart options={options} series={chartSeries} type="donut" height={innerHeight - 60} />
      </Box>
    );
  }
};

export default InventoryTrendWidget;
