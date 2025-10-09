import React from 'react';
import { Typography, Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const RevenueTrend: React.FC = () => {
  const { revenueSeries, loading } = useSelector((state: RootState) => state.analytics);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: {
        show: true
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      type: 'datetime',
      categories: revenueSeries.map((item) => item.date) // Backend: date field
    },
    yaxis: {
      title: {
        text: 'Revenue ($)'
      },
      labels: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    }
  };

  const series = [
    {
      name: 'Revenue',
      data: revenueSeries.map((item) => item.amount) // Backend: amount field
    }
  ];

  if (loading) {
    return (
      <MainCard title="Revenue Trend">
        <Skeleton variant="rectangular" height={350} />
      </MainCard>
    );
  }

  if (!revenueSeries || revenueSeries.length === 0) {
    return (
      <MainCard title="Revenue Trend">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No revenue data available for the selected period</Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="Revenue Trend">
      <Chart options={chartOptions} series={series} type="line" height={350} />
    </MainCard>
  );
};

export default RevenueTrend;
