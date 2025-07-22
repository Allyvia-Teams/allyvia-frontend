// material-ui
import Grid from '@mui/material/Grid';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { Box, Menu } from '@mui/material';
import SearchSection from 'layout/MainLayout/Header/SearchSection';
import AnalyticsBarChart from './AnalyticsBarChart';
import { ApexOptions } from 'apexcharts';
import { useState } from 'react';
import { ArrowDropDownRounded } from '@mui/icons-material';
import { ChartSelectDropdown } from './ChartSelectDropdown';

export const AnalyticsSection = ({ isLoading }: { isLoading: boolean }) => {

  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 480,
      stacked: true,
      toolbar: { show: true },
      zoom: { enabled: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%'
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'category',
      categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    },
    fill: { type: 'solid' },
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
    grid: { show: true }
  };


  // mock data! Remove when we have real data
  // -=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  const mockData = [
    { name: 'Revenue', data: [350, 125, 350, 350, 350, 80, 350] },
    { name: 'Expenses', data: [350, 105, 105, 350, 65, 400, 80] },
    { name: 'Profit Margin', data: [350, 145, 350, 350, 200, 105, 100] },
    { name: 'COGS', data: [350, 145, 350, 350, 200, 105, 100] },
    { name: 'Net Income', data: [350, 125, 350, 350, 350, 80, 350] },
    { name: 'Gross Margin', data: [3500, 1050, 105, 3500, 605, 400, 800] },
    { name: 'ROI', data: [350, 105, 105, 350, 650, 400, 80] }
  ]

  const getTotal = (series: { name: string; data: number[] }[]) => {
    return series.reduce((total, item) => {
      return total + item.data.reduce((sum, value) => sum + value, 0);
    }, 0);
  };

  const [displayedCharts, setDisplayedCharts] = useState< { name: string; data: number[] }[]>(mockData.slice(0, 2));
  
  const displayChart = (position: number) => {
    return function (name: string) {
      setDisplayedCharts((prevCharts) => {
        const newCharts = [...prevCharts];
        newCharts.splice(position, 1, mockData.find(chart => chart.name === name) || { name, data: [] });
        return newCharts;
    });
  };
};

  // -=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  return (
    <Grid size={12}>
      <MainCard title="Analytics">
        <Box display="flex" flexDirection="column" justifyContent="space-between" gap={4}>
          <Box display="flex" alignItems="center" gap={4} flexDirection={{ xs: 'column', sm: 'row' }}>
            {displayedCharts.map((chart, index) => (
              <Box key={index} display="flex" flexDirection="column" gap={1}>
                <ChartSelectDropdown options={mockData.map(chart => chart.name)} handleSelect={displayChart(index)}/>
                <AnalyticsBarChart
                  key={index}
                  subtitle={chart.name}
                  headline={`$${getTotal([chart]).toString()}`}
                  series={[chart]}
                  chartOptions={chartOptions}
                  />
              </Box>
            ))}
          </Box>
        </Box>
      </MainCard>
    </Grid>
  );
};
