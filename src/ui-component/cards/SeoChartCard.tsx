// material-ui
import { Theme, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowDropDown, ArrowDropUp } from '@mui/icons-material';

// third party
import Chart, { Props as ChartProps } from 'react-apexcharts';

// project imports
import MainCard from './MainCard';
import { mediumWidgetHeight } from 'store/constant';
import { usePositiveOrNegativeColors } from 'hooks/useErrorSuccessColors';
import { LoadingSkeleton } from 'ui-component/UISkeleton';

// =============================|| SEO CHART CARD ||============================= //

interface SeoChartCardProps {
  chartData: ChartProps;
  value?: string | number;
  title?: string;
  type?: number;
}

export default function SeoChartCard({ chartData, value, title, type }: SeoChartCardProps) {
  const theme = useTheme();
  const downMM = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const { iconColor, textColor, isPositive, isZero } = usePositiveOrNegativeColors(value!);
  const icon = isPositive ? <ArrowDropUp color={iconColor} /> : <ArrowDropDown color={iconColor} />;

  // Skeleton works great, just keeping for sanity until Tanstack
  let isLoading = false;
  if (isLoading) {
    return <LoadingSkeleton height={mediumWidgetHeight} />;
  }

  return (
    <MainCard content={false} sx={{ p: 2.5, border: 2, borderColor: theme.palette.divider, height: mediumWidgetHeight }}>
      <Grid container spacing={1.25} sx={{ justifyContent: 'space-between' }}>
        <Grid size={12}>
          <Stack direction={type === 1 ? 'column-reverse' : 'column'} spacing={type === 1 ? 0.5 : 1}>
            {value && (
              <Typography variant={downMM ? 'h4' : 'h3'} color={isZero ? 'info' : textColor}>
                {value}
              </Typography>
            )}
            {(title || icon) && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {title && (
                  <Typography variant="h4" sx={{ color: 'inherit' }}>
                    {title}
                  </Typography>
                )}
                {isZero ? '' : icon}
              </Stack>
            )}
          </Stack>
        </Grid>
        {chartData && (
          <Grid size={12}>
            <Chart {...chartData} />
          </Grid>
        )}
      </Grid>
    </MainCard>
  );
}
