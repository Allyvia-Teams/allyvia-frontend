import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import { Box } from '@mui/material';

import { Props } from 'react-apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnalyticsChart from './AnalyticsChart';
import { ChartSelectDropdown } from './ChartSelectDropdown';

export const AnalyticsSection = ({ isLoading }: { isLoading: boolean }) => {
  // Mock data support. Remove when we have real data
  // -=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  const mockData = [
    { name: 'Revenue', data: [350, 125, 350, 350, 350, 80, 350] },
    { name: 'Expenses', data: [350, 105, 105, 350, 65, 400, 80] },
    { name: 'Profit Margin', data: [350, 145, 350, 350, 200, 105, 100] },
    { name: 'COGS', data: [350, 145, 350, 350, 200, 105, 100] },
    { name: 'Net Income', data: [350, 125, 350, 350, 350, 80, 350] },
    { name: 'Gross Margin', data: [3500, 1050, 105, 3500, 605, 400, 800] },
    { name: 'ROI', data: [350, 105, 105, 350, 650, 400, 80] }
  ];
  const xAxis = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getTotal = (series: { name: string; data: number[] }[]) => {
    return series.reduce((total, item) => {
      return total + item.data.reduce((sum, value) => sum + value, 0);
    }, 0);
  };

  const [displayedCharts, setDisplayedCharts] = useState<{ name: string; data: number[] }[]>(mockData.slice(0, 2));

  const displayChart = (position: number) => {
    return function (name: string) {
      setDisplayedCharts((prevCharts) => {
        const newCharts = [...prevCharts];
        newCharts.splice(position, 1, mockData.find((chart) => chart.name === name) || { name, data: [] });
        return newCharts;
      });
    };
  };

  // -=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  return (
    <Grid size={12}>
      <MainCard title="Analytics">
        <Box display="flex" flexDirection="column" justifyContent="space-between" gap={4}>
          <Box display="flex" alignItems="center" gap={4} flexDirection={{ md: 'column', lg: 'row' }}>
            {displayedCharts.map((displayedChart, index) => (
              <Box key={index} display="flex" flexDirection="column" gap={1} width={'100%'}>
                <AnalyticsChart
                  isLoading={isLoading}
                  key={index}
                  subtitle={displayedChart.name}
                  headline={`$${getTotal([displayedChart]).toString()}`}
                  series={[displayedChart]}
                  xAxis={xAxis}
                  headerButton={
                    <ChartSelectDropdown options={mockData.map((mockChart) => mockChart.name)} handleSelect={displayChart(index)} />
                  }
                  showChartTypeButtons={true}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </MainCard>
    </Grid>
  );
};
