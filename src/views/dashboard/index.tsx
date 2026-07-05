import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

// project imports
import { InventorySection } from './InventorySection';
import { EmployeesSection } from './EmployeeSection';
import { gridSpacing } from 'store/constant';
import { QuickBooksSection } from './QuickBooks/QuickBooksSection';
import { AnalyticsSection } from './Analytics/AnalyticsSection';
import DashboardRangeSelector, { DashboardRange } from 'ui-component/common/DashboardRangeSelector';
import { RecommendationCard } from './RecommendationCard';
import { FeedbackBanner } from './FeedbackBanner';

import { useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';

export default function DashboardPage() {
  const [selectedRange, setSelectedRange] = useState<DashboardRange>('today');

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  // This is just for demo purposes to see a successful query
  // Only fetch if QuickBooks is connected to avoid 404 errors
  const { isLoading, data } = useQuery({
    queryKey: ['qb-account-details'],
    queryFn: () => fetcher('/account/details/'),
    enabled: false, // Disable by default to prevent 404 when not connected
    retry: false
  });

  if (!isLoading && data) {
    console.log('quickbooks data', data);
  }
  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
  return (
    <Grid container spacing={gridSpacing}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mb: 2 }}>
        <DashboardRangeSelector value={selectedRange} onChange={setSelectedRange} />
      </Box>
      <Grid item xs={12}>
        <FeedbackBanner />
      </Grid>
      <RecommendationCard />
      <QuickBooksSection range={selectedRange} />
      <AnalyticsSection range={selectedRange} />
      <InventorySection range={selectedRange} />
      <EmployeesSection range={selectedRange} />
    </Grid>
  );
}
