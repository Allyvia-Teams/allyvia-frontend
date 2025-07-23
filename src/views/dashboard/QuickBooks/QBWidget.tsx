// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useState } from 'react';
import { LoadingSkeleton } from 'ui-component/UISkeleton';

// project imports
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';

// assets
import { mediumWidgetHeight } from 'store/constant';

// ===========================|| DASHBOARD DEFAULT - QBWidget ||=========================== //

type QBWidgetTheme = 'gold';

interface QBWidgetProps {
  isLoading: boolean;
  title: string;
  value: string;
  sub?: string;
  widgetTheme?: QBWidgetTheme;
}

export default function QBWidget({ isLoading, title, value, sub, widgetTheme }: QBWidgetProps) {
  const theme = useTheme();
  const [isSwapped, setIsSwapped] = useState(false);

  if (isLoading) {
    return <LoadingSkeleton height={mediumWidgetHeight} />;
  }

  return (
    <MainCard
      border={false}
      content={false}
      sx={{
        bgcolor: widgetTheme ? `${widgetTheme}.dark` : theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'primary.dark',
        color: '#fff',
        position: 'relative',

        /////////////// BIG CORNER CIRCLE //////////////////////////////
        '&:after': {
          content: '""',
          position: 'absolute',
          width: 210,
          height: 210,
          bgcolor: widgetTheme
            ? `${widgetTheme}.800`
            : theme.palette.mode === ThemeMode.DARK
              ? `linear-gradient(210.04deg, ${theme.palette.primary.dark} -50.94%, rgba(144, 202, 249, 0) 95.49%)`
              : theme.palette.primary[800],
          borderRadius: '50%',
          top: { xs: -85 },
          right: { xs: -95 }
        },

        /////////////// TOP CIRCLE //////////////////////////////
        '&:before': {
          content: '""',
          position: 'absolute',
          width: 210,
          height: 210,
          zIndex: 0,
          bgcolor: widgetTheme
            ? `${widgetTheme}.800`
            : theme.palette.mode === ThemeMode.DARK
              ? `linear-gradient(140.9deg, ${theme.palette.primary.dark} -14.02%, rgba(144, 202, 249, 0) 85.50%)`
              : theme.palette.primary[800],
          borderRadius: '50%',
          top: { xs: -125 },
          right: { xs: -15 },
          opacity: 0.5
        },
        zIndex: 0,
        maxHeight: `${mediumWidgetHeight}px`,
        minHeight: `${mediumWidgetHeight}px`
      }}
    >
      <Box
        sx={{ cursor: 'pointer', p: 2.25, maxHeight: `${mediumWidgetHeight}px`, minHeight: `${mediumWidgetHeight}px` }}
        onClick={() => setIsSwapped(!isSwapped)}
      >
        <Grid container direction="column">
          <Grid>
            <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' }}>
              <Grid sx={{ alignItems: 'center', zIndex: 100, minWidth: 0, flex: 1 }}>
                {/* //////////////// TITLE TEXT //////////////////////////////////////// */}
                <Typography
                  sx={{
                    color: widgetTheme ? `${widgetTheme}.contrastText` : 'white',
                    fontSize: '1.2rem',
                    fontWeight: 500,
                    maxWidth: '100%',
                    whiteSpace: 'wrap',
                    textDecoration: 'underline',
                    transition: 'font-size 0.3s ease-in-out'
                  }}
                >
                  {title}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid>
            <Grid container sx={{ alignItems: 'center' }}>
              <Grid sx={{ zIndex: 100, flex: 1, minWidth: 0 }}>
                {/* //////////////// VALUE TEXT //////////////////////////////////////// */}
                <Typography
                  sx={{
                    color: widgetTheme ? `${widgetTheme}.contrastText` : 'white',
                    fontSize: '2rem',
                    fontWeight: 500,
                    mr: 1,
                    maxWidth: '100%'
                  }}
                >
                  {isSwapped ? sub : value}
                </Typography>

                {/* //////////////// SUB TEXT //////////////////////////////////////// */}

                {sub && (
                  <Typography
                    sx={{
                      color: widgetTheme ? `${widgetTheme}.contrastText` : 'white',
                      fontSize: '1.2rem',
                      fontWeight: 500,
                      mr: 1,
                      mb: 0.75,
                      maxWidth: '100%'
                    }}
                  >
                    {isSwapped ? value : sub}
                  </Typography>
                )}
              </Grid>
              <Grid></Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </MainCard>
  );
}
