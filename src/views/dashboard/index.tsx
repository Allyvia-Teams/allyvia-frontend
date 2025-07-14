import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import QBWidget from './QBWidget';
import TotalGrowthBarChart from './TotalGrowthBarChart';
import UserList from './UserList';
import { gridSpacing } from 'store/constant';

// assets
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ConnectToQuickBooks from './ConnectToQuickBooks';

export default function DashboardPage() {
  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  
  // TODO: Remove this once we have data coming in
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(true);
  const [hasDataSource, setHasDataSource] = useState(false);

  const simulateRefetch = () => {
    setIsLoading(true)
    setIsError(false)
  }

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [isError]);

  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <MainCard title="QuickBooks Pro">
          {hasDataSource ? (
            <Grid container spacing={gridSpacing}>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <QBWidget title="Daily Profit" widgetTheme='gold' isLoading={isLoading} isError={false} refetch={simulateRefetch} value={"$10,500"} sub="+3% from last month" />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <QBWidget title="Daily Revenue" isLoading={isLoading} isError={isError} refetch={simulateRefetch} value={"$15,500"} sub="+3% from last month" />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <QBWidget title="Pending Invoices" isLoading={isLoading} isError={false} refetch={simulateRefetch} value={"200"} sub="+3% from last month" />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <QBWidget title="Sales Volume" isLoading={isLoading} isError={false} refetch={simulateRefetch} value={"300"} sub="+3% from last month" />
            </Grid>
          </Grid>
          ) : (
            <ConnectToQuickBooks />
          )}
        </MainCard>
      </Grid>
      <Grid size={12}>
        <MainCard title="Analytics">
          <Grid container spacing={gridSpacing}>
            <Grid size={12}>
              <TotalGrowthBarChart isLoading={isLoading} />
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
      <Grid size={12}>
        <MainCard title="Inventory">
          <Grid container spacing={gridSpacing}>
            <Grid size={12}>
              <TotalGrowthBarChart isLoading={isLoading} />
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
      <Grid size={12}>
        <MainCard title="Employees">
          <Grid size={12}>
            <UserList />
            <Grid container spacing={gridSpacing} sx={{ justifyContent: 'space-between' }}>
              <Grid>
                <Pagination count={10} color="primary" />
              </Grid>
              <Grid>
                <Button size="large" sx={{ color: 'grey.900' }} color="secondary" endIcon={<ExpandMoreRoundedIcon />} onClick={handleClick}>
                  10 Rows
                </Button>
                {anchorEl && (
                  <Menu
                    id="menu-employee-list-style1"
                    anchorEl={anchorEl}
                    keepMounted
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                    variant="selectedMenu"
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right'
                    }}
                    transformOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right'
                    }}
                  >
                    <MenuItem onClick={handleClose}> 10 Rows</MenuItem>
                    <MenuItem onClick={handleClose}> 20 Rows</MenuItem>
                    <MenuItem onClick={handleClose}> 30 Rows </MenuItem>
                  </Menu>
                )}
              </Grid>
            </Grid>
          </Grid>
        </MainCard>
      </Grid>
    </Grid>
  );
}
