import { useEffect, useState } from 'react';
import { parseDate } from '@internationalized/date';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import { InventorySection } from './InventorySection';
import { EmployeesSection } from './EmployeeSection';
import { gridSpacing } from 'store/constant';
import { QuickBooksSection } from './QuickBooks/QuickBooksSection';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { DateValue } from 'react-aria';
import { AnalyticsSection } from './Analytics/AnalyticsSection';

// ISO 8601 date format
const LAST_WEEK = parseDate(new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
const TODAY = parseDate(new Date().toISOString().split('T')[0]);
import { useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<RangeValue>({
    start: LAST_WEEK,
    end: TODAY
  });

  const updateDateRange = (start?: DateValue, end?: DateValue) => {
    setDateRange((prev) => ({
      start: start ?? prev.start,
      end: end ?? prev.end
    }));
  };

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
      <div style={{ flex: 1 }} />
      <AllyviaDateRangePicker
        value={dateRange}
        onChange={(value: RangeValue | null) => {
          updateDateRange(value!.start, value!.end);
        }}
      />
      <QuickBooksSection />
      <AnalyticsSection isLoading={false} />
      <InventorySection />
      <EmployeesSection />
    </Grid>
  );
}
