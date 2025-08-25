import { ReactNode } from 'react';

// material-ui
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material';

// project
import { largeWidgetHeight } from 'store/constant';
import { COLORS } from '../../styles/colors';

// third party
import Chart, { Props as ChartProps } from 'react-apexcharts';
import { LoadingSkeleton } from 'ui-component/UISkeleton';

interface SalesLineChartCardProps {
  bgColor?: string;
  chartData?: ChartProps;
  footerData?: { value: string; label: string }[];
  icon?: ReactNode | string;
  title?: string;
  percentage?: number;
  textColor?: string;
}

// ============================|| SALES LINE CARD ||============================ //

export default function SalesLineChartCard({
  bgColor,
  chartData,
  footerData,
  icon,
  title,
  percentage,
  textColor
}: SalesLineChartCardProps) {
  const theme = useTheme();
  let isLoading = false;

  let footerHtml;
  if (footerData) {
    footerHtml = footerData.map((item, index) => (
      <Grid key={index}>
        <Box sx={{ my: 1, p: 1 }}>
          <Stack spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="h3">{item.value}</Typography>
            <Typography variant="body1">{item.label}</Typography>
          </Stack>
        </Box>
      </Grid>
    ));
  }

  if (isLoading) {
    return <LoadingSkeleton height={largeWidgetHeight} />;
  }

  return (
    <Card>
      <Box sx={{ color: COLORS.white, bgcolor: bgColor || 'primary.dark', p: 2 }}>
        <Grid container direction="column" spacing={0}>
          <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            {title && (
              <Grid>
                <Typography variant="subtitle1" color="inherit">
                  {title}
                </Typography>
              </Grid>
            )}
            <Grid>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                {icon && icon}
                {percentage && (
                  <Typography variant="subtitle1" color={textColor}>
                    {percentage}%
                  </Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
          {chartData && (
            <Grid>
              <Chart {...chartData} />
            </Grid>
          )}
        </Grid>
      </Box>
      {footerData && (
        <Grid
          container
          sx={{
            alignItems: 'center',
            justifyContent: 'space-around',
            borderTop: 0,
            border: 2,
            borderColor: theme.palette.divider,
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          }}
        >
          {footerHtml}
        </Grid>
      )}
    </Card>
  );
}
