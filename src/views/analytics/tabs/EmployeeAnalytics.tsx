import React from 'react';
import { Grid, Alert } from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import EmployeeAnalyticsProvider, { useEmployeeAnalytics } from '../widgets/employee/EmployeeAnalyticsContext';
import AnalyticsWidgetGrid from '../registry/AnalyticsWidgetGrid';

type Props = {
  dateRange: RangeValue;
  isLoading: boolean;
};

const EmployeeAnalyticsContent: React.FC<Props> = ({ dateRange, isLoading }) => {
  const { error } = useEmployeeAnalytics();

  return (
    <Grid container spacing={3}>
      {!!error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">Failed to load employee analytics.</Alert>
        </Grid>
      )}
      <AnalyticsWidgetGrid tab="employee" dateRange={dateRange} isLoading={isLoading} container={false} />
    </Grid>
  );
};

export default function EmployeeAnalytics(props: Props) {
  return (
    <EmployeeAnalyticsProvider {...props}>
      <EmployeeAnalyticsContent {...props} />
    </EmployeeAnalyticsProvider>
  );
}
