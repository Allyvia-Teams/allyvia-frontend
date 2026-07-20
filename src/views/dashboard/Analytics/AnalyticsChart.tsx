// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';

// project imports
import { chartSeriesPalette } from 'themes/chartPalette';

// third party
import Chart from 'react-apexcharts';
import { Props } from 'react-apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing, largeWidgetHeight } from 'store/constant';

// chart data
import { ApexOptions } from 'apexcharts';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { useState } from 'react';
import { Box } from '@mui/material';
import { ChartTypeButton } from './ChartTypeButton';

interface AnalyticsChartProps {
  isLoading: boolean;
  headline: string;
  subtitle: string;
  series: {
    name: string;
    data: number[];
  }[];
  xAxis?: string[];
  headerButton?: React.ReactNode;
  showChartTypeButtons?: boolean;
}

export default function AnalyticsChart({
  isLoading,
  headline,
  subtitle,
  series,
  xAxis,
  headerButton,
  showChartTypeButtons
}: AnalyticsChartProps) {
  const theme = useTheme();
  const chartOptions: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: {
        enabled: false
      }
    },
    // Brand-derived series colors so charts follow the company theme.
    colors: chartSeriesPalette(theme),
    dataLabels: { enabled: false },
    xaxis: {
      type: 'category',
      categories: xAxis
    },
    fill: { type: 'solid' },
    grid: { show: true }
  };

  const [chartType, setChartType] = useState<Props['type']>('bar');

  return isLoading ? (
    <MainCard sx={{ minWidth: { md: 320, lg: 480 }, maxWidth: { md: 320, lg: 480 } }}>
      <LoadingSkeleton height={320} width="100%" />
    </MainCard>
  ) : (
    <>
      <Box
        display="flex"
        alignItems="center"
        flexDirection={'row'}
        justifyContent={headerButton && showChartTypeButtons ? 'space-between' : !showChartTypeButtons ? 'flex-start' : 'flex-end'}
        gap={2}
      >
        {headerButton}
        {showChartTypeButtons && (
          <Box display="flex" flexDirection={'row'} gap={1} mb={1}>
            <ChartTypeButton selected={chartType == 'bar'} onClick={() => setChartType('bar')} icon={<BarChartIcon />} />
            <ChartTypeButton selected={chartType == 'line'} onClick={() => setChartType('line')} icon={<ShowChartIcon />} />
          </Box>
        )}
      </Box>
      <MainCard sx={{ border: 1, borderColor: 'divider', width: '100%' }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid>
                <Grid container direction="column" spacing={1}>
                  <Grid>
                    <Typography variant="subtitle2">{subtitle}</Typography>
                  </Grid>
                  <Grid>
                    <Typography variant="h3">{headline}</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12} sx={{ height: largeWidgetHeight }}>
            <Chart height={largeWidgetHeight} options={chartOptions} type={chartType} key={chartType} series={series} />
          </Grid>
        </Grid>
      </MainCard>
    </>
  );
}
