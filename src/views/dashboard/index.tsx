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
import { SavingsWidget } from './SavingsWidget';

export default function DashboardPage() {
  const [selectedRange, setSelectedRange] = useState<DashboardRange>('today');

  return (
    <Grid container spacing={gridSpacing}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mb: 2 }}>
        <DashboardRangeSelector value={selectedRange} onChange={setSelectedRange} />
      </Box>
      <Grid size={12}>
        <FeedbackBanner />
      </Grid>
      <RecommendationCard />
      <SavingsWidget />
      <QuickBooksSection range={selectedRange} />
      <AnalyticsSection range={selectedRange} />
      <InventorySection range={selectedRange} />
      <EmployeesSection range={selectedRange} />
    </Grid>
  );
}
