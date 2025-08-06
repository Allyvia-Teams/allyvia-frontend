import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import { InventorySection } from './InventorySection';
import { EmployeesSection } from './EmployeeSection';
import { gridSpacing } from 'store/constant';
import { QuickBooksSection } from './QuickBooks/QuickBooksSection';
import { AnalyticsSection } from './Analytics/AnalyticsSection';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';

export default function DashboardPage() {
  // Contingent on is_connected_to_quickbooks prop of company
  const [hasDataSource] = useState(false);

  const { isLoading, isError } = useQuery({
    queryKey: ['company'],
    queryFn: () => fetcher('/company/')
  });

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
