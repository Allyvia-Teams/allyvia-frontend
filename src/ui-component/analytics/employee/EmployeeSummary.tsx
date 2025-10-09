import React from 'react';
import { Grid, Typography, Box, Skeleton } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import MainCard from 'ui-component/cards/MainCard';

const EmployeeSummary: React.FC = () => {
  const { employeeSummary, loading } = useSelector((state: RootState) => state.analytics);

  if (loading) {
    return (
      <MainCard title="Employee Summary">
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </MainCard>
    );
  }

  if (!employeeSummary) {
    return (
      <MainCard title="Employee Summary">
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No employee data available</Typography>
        </Box>
      </MainCard>
    );
  }

  const kpiData = [
    {
      title: 'Total Hours',
      value: employeeSummary.total_hours || 0,
      theme: 'success' as const,
      formatter: (val: number) => `${val.toLocaleString()} hrs`
    },
    {
      title: 'Active Employees',
      value: employeeSummary.active_employees || 0,
      theme: 'default' as const,
      formatter: (val: number) => val.toLocaleString()
    },
    {
      title: 'Avg Hours/Employee',
      value: employeeSummary.avg_hours_per_employee || 0,
      theme: 'default' as const,
      formatter: (val: number) => `${val.toFixed(1)} hrs`
    },
    {
      title: 'Currently On Shift',
      value: employeeSummary.current_on_shift || 0,
      theme: 'default' as const,
      formatter: (val: number) => val.toLocaleString()
    }
  ];

  return (
    <MainCard title="Employee Summary">
      <Grid container spacing={3}>
        {kpiData.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <AllyviaStats title={kpi.title} value={kpi.formatter(kpi.value)} theme={kpi.theme} size="medium" />
          </Grid>
        ))}
      </Grid>
    </MainCard>
  );
};

export default EmployeeSummary;
