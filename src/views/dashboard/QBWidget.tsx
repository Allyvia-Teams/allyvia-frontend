import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import QBWidgetSkeleton from 'ui-component/cards/QBWidget';

// assets
import { mediumWidgetHeight } from 'store/constant';

// ===========================|| DASHBOARD DEFAULT - QBWidget ||=========================== //

type QBWidgetTheme = 'gold'

interface QBWidgetProps {
  isLoading: boolean;
  title: string;
  value: string;
  sub?: string;
  widgetTheme?: QBWidgetTheme;
}

export default function QBWidget({ isLoading, title, value, sub, widgetTheme }: QBWidgetProps) {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = React.useState<Element | (() => Element) | null | undefined>(null);

  const handleClick = (event: React.SyntheticEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {isLoading ? (
        <QBWidgetSkeleton />
      ) : (
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
              bgcolor:
                widgetTheme
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
              bgcolor:
                widgetTheme
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
            minHeight: `${mediumWidgetHeight}px`,
          }}
        >
          <Box sx={{ p: 2.25, maxHeight: `${mediumWidgetHeight}px`, minHeight: `${mediumWidgetHeight}px` }}>
            <Grid container direction="column" >
              <Grid>
                <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap'}}>
                  <Grid sx={{ alignItems: 'center', zIndex: 100, minWidth: 0, flex: 1}}>

                    {/* //////////////// TITLE TEXT //////////////////////////////////////// */}
                        <Typography
                          sx={{
                            color: widgetTheme ? `${widgetTheme}.contrastText` : 'white',
                            fontSize: '1.2rem',
                            fontWeight: 500,
                            whiteSpace: 'wrap',
                            maxWidth: '100%'
                          }}
                        >
                        {title}
                        </Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid>
                <Grid container sx={{ alignItems: 'center' }}>
                  <Grid sx={{ zIndex: 100 }}>

                    {/* //////////////// VALUE TEXT //////////////////////////////////////// */}
                    <Typography 
                        sx={{ 
                            color: widgetTheme ? `${widgetTheme}.contrastText` : 'white', 
                            fontSize: '2.125rem', 
                            fontWeight: 500, 
                            mr: 1, 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                            }}>{value}</Typography>
                    
                    {/* //////////////// SUB TEXT //////////////////////////////////////// */}
                    
                    {sub && 
                      <Typography 
                          sx={{ 
                            color: widgetTheme ? `${widgetTheme}.contrastText` : 'white', 
                            fontSize: '0.85rem', 
                            fontWeight: 500, 
                            mr: 1, 
                            mb: 0.75,
                            whiteSpace: 'nowrap',
                            maxWidth: '100%' 
                            }}>{sub}</Typography>}
                  </Grid>
                  <Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </MainCard>
      )}
    </>
  );
}
