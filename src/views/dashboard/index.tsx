import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalGrowthBarChart from './TotalGrowthBarChart';
import UserList from './UserList';
import { gridSpacing } from 'store/constant';

// assets
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { QuickBooksSection } from './QuickBooks/QuickbooksSection';

export default function DashboardPage() {
  // TODO: Remove the following once we have data coming in
  // -=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [hasDataSource, setHasDataSource] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [isError]);
  // -=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);

  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <QuickBooksSection isError={isError} hasDataSource={hasDataSource} isLoading={isLoading} />
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
