import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import EarningCard from './EarningCard';
import TotalGrowthBarChart from './TotalGrowthBarChart';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import SalesLineChartCard from 'ui-component/cards/SalesLineChartCard';
import SeoChartCard from 'ui-component/cards/SeoChartCard';
import UserList from './UserList';
import { gridSpacing, gridSpacingSm } from 'store/constant';
import { chartData } from './chart-data';
// assets
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function DashboardPage() {
  const [lineChartData] = useState(chartData.TotalSalesChart);
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
          {/* Hold All Charts and Widgets */}
          <Grid container spacing={gridSpacing}>
            <Grid container size={{ xs: 12, sm: 12, md: 6, lg: 7 }}>
              <Grid container spacing={gridSpacingSm} size={12}>
                <Grid size={{ sm: 3, xs: 6, md: 3, lg: 3 }}>
                  <TotalIncomeDarkCard isLoading={isLoading} showIcon={false} />
                </Grid>
                <Grid size={{ sm: 3, xs: 6, md: 3, lg: 3 }}>
                  <TotalIncomeDarkCard isLoading={isLoading} showIcon={false} />
                </Grid>
                <Grid size={{ sm: 3, xs: 6, md: 3, lg: 3 }}>
                  <TotalIncomeDarkCard isLoading={isLoading} showIcon={false} />
                </Grid>
                <Grid size={{ sm: 3, xs: 6, md: 3, lg: 3 }}>
                  <TotalIncomeDarkCard isLoading={isLoading} showIcon={false} />
                </Grid>
              </Grid>
              <Grid container spacing={gridSpacing} size={12}>
                <Grid size={{ xs: 12, sm: 5, md: 5, lg: 4 }}>
                  <SeoChartCard type={1} chartData={chartData.InventoryChart2} value="1.55%" title="Bounce Rate" />
                </Grid>
                <Grid size={{ xs: 12, sm: 7, md: 7, lg: 8 }}>
                  <SeoChartCard
                    chartData={chartData.InventoryChart1}
                    value="1,62,564"
                    title="Products"
                    icon={<ArrowDropDownIcon color="error" />}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 6, lg: 5 }}>
              <SalesLineChartCard
                chartData={lineChartData}
                title="Orders Per Month"
                percentage="28%"
                icon={<TrendingUpIcon />}
                footerData={[
                  {
                    value: '1695',
                    label: 'Total Orders'
                  },
                  {
                    value: '321',
                    label: 'Today Orders'
                  }
                ]}
              />
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
