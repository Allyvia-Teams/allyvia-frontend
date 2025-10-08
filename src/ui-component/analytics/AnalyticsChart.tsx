import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chart from 'react-apexcharts';
import { Props } from 'react-apexcharts';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing, largeWidgetHeight } from 'store/constant';
import { ApexOptions } from 'apexcharts';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { Box } from '@mui/material';

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
  colors?: string[];
  chartType?: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'heatmap';
}

export default function AnalyticsChart({
  isLoading,
  headline,
  subtitle,
  series,
  xAxis,
  headerButton,
  colors,
  chartType = 'bar'
}: AnalyticsChartProps) {
  const chartOptions: ApexOptions = {
    chart: {
      type: chartType,
      toolbar: { show: false },
      zoom: {
        enabled: false
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'category',
      categories: xAxis
    },
    fill: { type: 'solid' },
    grid: { show: true },
    colors: colors || ['#1976d2', '#dc004e', '#9c27b0', '#2e7d32', '#ed6c02', '#0288d1']
  };

  return isLoading ? (
    <MainCard sx={{ minWidth: { md: 320, lg: 480 }, maxWidth: { md: 320, lg: 480 } }}>
      <LoadingSkeleton height={320} width="100%" />
    </MainCard>
  ) : (
    <>
      <Box display="flex" alignItems="center" flexDirection={'row'} justifyContent={headerButton ? 'space-between' : 'flex-end'} gap={2}>
        {headerButton}
      </Box>
      <MainCard sx={{ border: '2px solid', width: '100%' }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12 }}>
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
          <Grid size={{ xs: 12 }} sx={{ height: largeWidgetHeight }}>
            <Chart height={largeWidgetHeight} options={chartOptions} type={chartType} series={series} />
          </Grid>
        </Grid>
      </MainCard>
    </>
  );
}
