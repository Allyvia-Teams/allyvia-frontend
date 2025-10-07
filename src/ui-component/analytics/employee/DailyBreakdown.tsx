import React from 'react';
import { Typography, Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

const DailyBreakdown: React.FC = () => {
  const { dailyBreakdown, loading } = useSelector((state: RootState) => state.analytics);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350
    },
    xaxis: {
      categories: dailyBreakdown.map((item) => item.day || 'Unknown')
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
      name: 'Daily Hours',
      data: dailyBreakdown.map((item) => {
        const total = (item.employees || []).reduce((sum: number, emp) => sum + (Number(emp.hours) || 0), 0);
        return total;
      })
    }
  ];

  if (loading) {
    return (
      <MainCard title="Daily Hours Breakdown">
        <Skeleton variant="rectangular" height={350} />
      </MainCard>
    );
  }

  if (!dailyBreakdown || dailyBreakdown.length === 0) {
    return (
      <MainCard title="Daily Hours Breakdown">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No daily breakdown data available for the selected period</Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="Daily Hours Breakdown">
      <Chart options={chartOptions} series={series} type="bar" height={350} />
    </MainCard>
  );
};

export default DailyBreakdown;
