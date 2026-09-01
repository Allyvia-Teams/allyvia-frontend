import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Box, Typography, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

const DistributionChart: React.FC = () => {
  const [distributionType, setDistributionType] = useState<'expense' | 'invoice' | 'payment'>('expense');

  const { expenseBreakdown, invoiceStatistics, paymentSplit } = useSelector((state: RootState) => (state as any).finance);

  const chartData = useMemo(() => {
    switch (distributionType) {
      case 'expense':
        return {
          title: 'Expense Categories',
          data: expenseBreakdown?.by_category || [],
          colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        };
      case 'invoice':
        return {
          title: 'Invoice Distribution',
          data: invoiceStatistics?.status_distribution || [],
          colors: ['#00C853', '#FF9800', '#F44336']
        };
      case 'payment':
        return {
          title: 'Payment Methods Distribution',
          data: paymentSplit?.by_method || [],
          colors: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0']
        };
      default:
        return { title: '', data: [], colors: [] };
    }
  }, [distributionType, expenseBreakdown, invoiceStatistics, paymentSplit]);

  const series = chartData.data.map((item: any) => item.percentage || item.count || 0);
  const labels = chartData.data.map(
    (item: any) => item.category || item.category_name || item.status || item.provider || item.name || 'Unknown'
  );

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      height: 350
    },
    labels: labels,
    colors: chartData.colors,
    legend: {
      position: 'bottom',
      fontSize: '12px'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '16px',
              fontWeight: 600,
              color: '#373d3f',
              formatter: function (w) {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return total.toFixed(1) + '%';
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: string) {
        return parseFloat(val).toFixed(1) + '%';
      }
    },
    tooltip: {
      y: {
        formatter: function (val: number, { seriesIndex, w }) {
          const item = chartData.data[seriesIndex];
          if (distributionType === 'expense') {
            return `$${parseFloat(item.total || '0').toLocaleString()}`;
          } else if (distributionType === 'invoice') {
            return `${item.count || 0} invoices`;
          } else if (distributionType === 'payment') {
            return `$${parseFloat(item.amount || '0').toLocaleString()}`;
          }
          return val.toString();
        }
      }
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    ]
  };

  return (
    <MainCard
      title={chartData.title}
      secondary={
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Distribution</InputLabel>
          <Select
            value={distributionType}
            label="Distribution"
            onChange={(e) => setDistributionType(e.target.value as 'expense' | 'invoice' | 'payment')}
          >
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="invoice">Invoice</MenuItem>
            <MenuItem value="payment">Payment</MenuItem>
          </Select>
        </FormControl>
      }
    >
      <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {chartData.data.length > 0 ? (
          <Chart options={options} series={series} type="donut" height={350} key={`${distributionType}-${series.length}`} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No {distributionType} data available
          </Typography>
        )}
      </Box>
    </MainCard>
  );
};

export default DistributionChart;
