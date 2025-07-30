import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import { InventorySection } from './InventorySection';
import { EmployeesSection } from './EmployeeSection';
import { gridSpacing } from 'store/constant';
import { QuickBooksSection } from './QuickBooks/QuickBooksSection';
import { AnalyticsSection } from './Analytics/AnalyticsSection';

export default function DashboardPage() {
  // TODO: Remove the following once we have data coming in
  // -=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  const [isLoading, setIsLoading] = useState(true);
  const [isError] = useState(false);
  const [hasDataSource] = useState(true);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [isError]);
  // -=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  return (
    <Grid container spacing={gridSpacing}>
      <QuickBooksSection isError={isError} hasDataSource={hasDataSource} isLoading={isLoading} />
      <AnalyticsSection isLoading={isLoading} />
      <InventorySection />
      <EmployeesSection />
    </Grid>
  );
}
