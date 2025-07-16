import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import QBWidget from './QBWidget';
import { InventorySection } from './InventorySection';
import { EmployeesSection } from './EmployeeSection';
import TotalGrowthBarChart from './TotalGrowthBarChart';
import { gridSpacing } from 'store/constant';

export default function DashboardPage() {
  // TODO: Remove this once we have data coming in
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <MainCard title="QuickBooks Pro">
          <Grid container spacing={gridSpacing}>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <QBWidget title="Daily Profit" widgetTheme="gold" isLoading={isLoading} value={'$10,500'} sub="+3% from last month" />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <QBWidget title="Daily Revenue" isLoading={isLoading} value={'$15,500'} sub="+3% from last month" />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <QBWidget title="Pending Invoices" isLoading={isLoading} value={'200'} sub="+3% from last month" />
            </Grid>
            <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
              <QBWidget title="Sales Volume" isLoading={isLoading} value={'300'} sub="+3% from last month" />
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
      <InventorySection isLoading={isLoading} />
      <EmployeesSection />
    </Grid>
  );
}
