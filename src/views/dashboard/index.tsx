import { useEffect, useState } from 'react';
import {parseDate} from '@internationalized/date';

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

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<RangeValue<DateValue>>({
    start: LAST_WEEK,
    end: TODAY,
  });

  const updateDateRange = (start?: DateValue, end?: DateValue) => {
    setDateRange(prev => ({
      start: start ?? prev.start,
      end: end ?? prev.end,
    }));
  };
  
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
      <div style={{flex:1}} />
      <AllyviaDateRangePicker
        value={dateRange}
        onChange={(value: RangeValue<DateValue> | null) => {
          updateDateRange(value!.start, value!.end);
        }}
      />
      <QuickBooksSection isError={isError} hasDataSource={hasDataSource} isLoading={isLoading} />
      <AnalyticsSection isLoading={isLoading} />
      <InventorySection />
      <EmployeesSection />
    </Grid>
  );
}
