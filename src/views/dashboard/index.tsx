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
  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // This is just for demo purposes to see a successful query
  const { isLoading, data } = useQuery({
    queryKey: ['qb-account-details'],
    queryFn: () => fetcher('/account/details/')
  });

  if (!isLoading && data) {
    console.log('quickbooks data', data);
  }
  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  return (
    <Grid container spacing={gridSpacing}>
      <QuickBooksSection />
      <AnalyticsSection isLoading={false} />
      <InventorySection />
      <EmployeesSection />
    </Grid>
  );
}
