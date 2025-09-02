// Employee Stats Component using AllyviaStats
import React from 'react';
import Grid from '@mui/material/Grid';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { gridSpacing, smallWidgetHeight } from 'store/constant';
import { EmployeeStats as EmployeeStatsType } from 'types/employee';

interface EmployeeStatsProps {
  stats: EmployeeStatsType;
  companyName?: string;
}

export const EmployeeStats: React.FC<EmployeeStatsProps> = ({ stats }) => {
  const statItems = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees.toString(),
      theme: 'default' as const,
      size: 'medium' as const
    },
    {
      title: 'Total Titles',
      value: stats.totalTitles.toString(),
      theme: 'default' as const,
      size: 'medium' as const
    },
    {
      title: 'Active Employees',
      value: stats.activeEmployees.toString(),
      theme: 'default' as const,
      size: 'medium' as const
    },
    {
      title: 'Inactive Employees',
      value: stats.inactiveEmployees.toString(),
      theme: 'default' as const,
      size: 'medium' as const
    }
  ];

  return (
    <Grid container rowSpacing={gridSpacing} columnSpacing={gridSpacing}>
      {statItems.map((item, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }} key={index}>
          <AllyviaStats title={item.title} value={item.value} theme={item.theme} size={item.size} height={smallWidgetHeight} />
        </Grid>
      ))}
    </Grid>
  );
};
