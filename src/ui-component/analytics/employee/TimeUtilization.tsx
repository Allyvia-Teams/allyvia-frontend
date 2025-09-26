import React from 'react';
import { Typography, Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const TimeUtilization: React.FC = () => {
  const { employeeTimeUtilization, loading } = useSelector((state: RootState) => state.analytics);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350
    },
    xaxis: {
      categories: employeeTimeUtilization.map((item) => {
        const date = new Date(item.week_start);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      })
    },
    yaxis: {
      title: {
        text: 'Hours'
      },
      labels: {
        formatter: (value: number) => `${value}h`
      }
    },
    colors: ['#4BC0C0'],
    tooltip: {
      y: {
        formatter: (value: number) => `${value} hours`
      }
    }
  };

  const series = [
    {
      name: 'Hours Worked',
      data: employeeTimeUtilization.map((item) => item.hours)
    }
  ];

  if (loading) {
    return (
      <MainCard title="Time Utilization">
        <Skeleton variant="rectangular" height={350} />
      </MainCard>
    );
  }

  if (!employeeTimeUtilization || employeeTimeUtilization.length === 0) {
    return (
      <MainCard title="Time Utilization">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No time data available for the selected period</Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="Time Utilization">
      <Chart options={chartOptions} series={series} type="bar" height={350} />
    </MainCard>
  );
};

export default TimeUtilization;
