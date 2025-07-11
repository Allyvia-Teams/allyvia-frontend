import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import QBWidgetSkeleton from 'ui-component/cards/QBWidget';

// assets
import EarningIcon from 'assets/images/icons/earning.svg';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import GetAppTwoToneIcon from '@mui/icons-material/GetAppOutlined';
import FileCopyTwoToneIcon from '@mui/icons-material/FileCopyOutlined';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ArchiveTwoToneIcon from '@mui/icons-material/ArchiveOutlined';
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
                  <Grid sx={{overflow: 'hidden', flexShrink: 0}}>

                    {/* //////////////// DOT DOT DOT //////////////////////////////////////// */}
                    <Avatar
                      variant="rounded"
                      sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.mediumAvatar,
                        bgcolor: widgetTheme ? `${widgetTheme}.800` : theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'primary.800',
                        color: widgetTheme ? `${widgetTheme}.contrastText` : 'primary.200',
                        zIndex: 1,
                        width:16,
                        height:16
                      }}
                      aria-controls="menu-earning-card"
                      aria-haspopup="true"
                      onClick={handleClick}
                    >
                      <MoreHorizIcon fontSize="small" />
                    </Avatar>
                    <Menu
                      id="menu-earning-card"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={handleClose}
                      variant="selectedMenu"
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right'
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                      }}
                    >
                      <MenuItem onClick={handleClose}>
                        <GetAppTwoToneIcon sx={{ mr: 1.75 }} /> Import Card
                      </MenuItem>
                      <MenuItem onClick={handleClose}>
                        <FileCopyTwoToneIcon sx={{ mr: 1.75 }} /> Copy Data
                      </MenuItem>
                      <MenuItem onClick={handleClose}>
                        <PictureAsPdfTwoToneIcon sx={{ mr: 1.75 }} /> Export
                      </MenuItem>
                      <MenuItem onClick={handleClose}>
                        <ArchiveTwoToneIcon sx={{ mr: 1.75 }} /> Archive File
                      </MenuItem>
                    </Menu>
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
