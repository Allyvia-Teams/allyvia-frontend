import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { InventorySection } from './InventorySection';
import { EmployeesSection } from './EmployeeSection';
import TotalGrowthBarChart from './TotalGrowthBarChart';
import { gridSpacing } from 'store/constant';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { QuickBooksSection } from './QuickBooks/QuickBooksSection';

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
      <InventorySection isLoading={isLoading} />
      <EmployeesSection />
    </Grid>
  );
}
