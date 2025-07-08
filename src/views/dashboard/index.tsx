import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import EarningCard from './EarningCard';
import TotalGrowthBarChart from './TotalGrowthBarChart';
import UserList from './UserList';
import { gridSpacing } from 'store/constant';

// assets
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

export default function DashboardPage() {
  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  // Ugly ugly ugly quick fix
  const isLoading = false;

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <MainCard title="QuickBooks Pro">
          <Grid container spacing={gridSpacing}>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <EarningCard isLoading={isLoading} />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <EarningCard isLoading={isLoading} />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <EarningCard isLoading={isLoading} />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <EarningCard isLoading={isLoading} />
            </Grid>
          </Grid>
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
