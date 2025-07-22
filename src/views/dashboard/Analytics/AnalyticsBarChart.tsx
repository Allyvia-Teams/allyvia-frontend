
// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// third party
import Chart from 'react-apexcharts';

// project imports
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// chart data
import { ApexOptions } from 'apexcharts';


interface AnalyticsBarChartProps {
  headline: string;
  subtitle: string;
  chartOptions: ApexOptions;
  series: {
    name: string;
    data: number[];
    }[]
}

export default function AnalyticsBarChart({ headline, subtitle, series, chartOptions }: AnalyticsBarChartProps) {
  const theme = useTheme();
  const { mode } = useConfig();

  return (
    <>
        <MainCard sx={{ border: '2px solid' }} >
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
            <Grid
              size={12}
              // sx={{
              //   ...theme.applyStyles('light', {
              //     '& .apexcharts-series:nth-of-type(4) path:hover': {
              //       filter: `brightness(0.95)`,
              //       transition: 'all 0.3s ease'
              //     }
              //   }),
              //   '& .apexcharts-menu': {
              //     bgcolor: mode === ThemeMode.DARK ? 'background.default' : 'background.paper',
              //     ...(mode === ThemeMode.DARK && {
              //       borderColor: alpha(theme.palette.grey[200], 0.2)
              //     })
              //   },
              //   '.apexcharts-theme-light .apexcharts-menu-item:hover': {
              //     bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.200'
              //   },
              //   '& .apexcharts-theme-light .apexcharts-menu-icon:hover svg, .apexcharts-theme-light .apexcharts-reset-icon:hover svg, .apexcharts-theme-light .apexcharts-selection-icon:not(.apexcharts-selected):hover svg, .apexcharts-theme-light .apexcharts-zoom-icon:not(.apexcharts-selected):hover svg, .apexcharts-theme-light .apexcharts-zoomin-icon:hover svg, .apexcharts-theme-light .apexcharts-zoomout-icon:hover svg':
              //     {
              //       fill: theme.palette.mode === ThemeMode.DARK ? alpha(theme.palette.primary.light, 0.3) : theme.palette.grey[400]
              //     }
              // }}
            >
              <Chart options={chartOptions} series={series} type="bar" />
            </Grid>
          </Grid>
        </MainCard>
    </>
  );
}
