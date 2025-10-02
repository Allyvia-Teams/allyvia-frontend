import React from 'react';
import { Typography, Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const PaymentsByProvider: React.FC = () => {
  const { paymentsSplit, loading } = useSelector((state: RootState) => state.analytics);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%',
        borderRadius: 4
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'category',
      categories: ['Payments']
    },
    yaxis: {
      title: {
        text: 'Amount ($)'
      },
      labels: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    },
    fill: { type: 'solid' },
    colors: ['#1976d2', '#dc004e', '#9c27b0', '#2e7d32', '#ed6c02', '#0288d1'],
    legend: {
      show: true,
      fontFamily: 'Roboto, sans-serif',
      position: 'bottom',
      offsetX: 20,
      labels: {
        useSeriesColors: false
      },
      markers: {
        size: 8,
        shape: 'square'
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    grid: { show: true },
    tooltip: {
      y: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    }
  };

  const series = paymentsSplit.map((item) => ({
    name: item.provider.charAt(0).toUpperCase() + item.provider.slice(1),
    data: [item.amount]
  }));

  if (loading) {
    return (
      <MainCard title="Payments by Provider">
        <Skeleton variant="rectangular" height={350} />
      </MainCard>
    );
  }

  if (!paymentsSplit || paymentsSplit.length === 0) {
    return (
      <MainCard title="Payments by Provider">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No payment data available for the selected period</Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="Payments by Provider">
      <Chart options={chartOptions} series={series} type="bar" height={350} />
    </MainCard>
  );
};

export default PaymentsByProvider;
