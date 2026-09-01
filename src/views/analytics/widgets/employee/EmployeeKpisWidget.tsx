import React from 'react';
import { Grid, Skeleton } from '@mui/material';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import { useEmployeeAnalytics } from './EmployeeAnalyticsContext';

const EmployeeKpisWidget: React.FC<AnalyticsWidgetProps> = () => {
  const { isLoading, summary } = useEmployeeAnalytics();

  return (
    <Grid container spacing={3}>
      {isLoading ? (
        Array.from({ length: 4 }).map((_, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
            <Skeleton variant="rectangular" height={120} />
          </Grid>
        ))
      ) : (
        <>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AllyviaStats
              title="Total Hours Worked"
              value={(summary?.total_hours ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              theme="success"
              size="medium"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AllyviaStats
              title="Active Employees"
              value={(summary?.active_employees ?? 0).toLocaleString()}
              theme="default"
              size="medium"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AllyviaStats
              title="Avg Hours/Employee"
              value={(summary?.avg_hours_per_employee ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              theme="success"
              size="medium"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AllyviaStats
              title="Open Entries"
              value={(summary?.current_on_shift ?? 0).toLocaleString()}
              theme="default"
              size="medium"
            />
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default EmployeeKpisWidget;
