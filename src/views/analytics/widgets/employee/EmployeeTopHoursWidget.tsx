import React from 'react';
import { Card, CardContent, Typography, Grid, Box, List, ListItem, Skeleton } from '@mui/material';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import { useEmployeeAnalytics } from './EmployeeAnalyticsContext';

const EmployeeTopHoursWidget: React.FC<AnalyticsWidgetProps> = () => {
  const { isLoading, daily } = useEmployeeAnalytics();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Top 10 Employees by Hours Worked
        </Typography>
        <Grid container spacing={3}>
          {/* Donut Chart */}
          <Grid size={{ xs: 12, md: 6 }}>
            {(() => {
              // Calculate top 10 employees by total hours
              const employeeHoursMap = new Map<string, number>();
              daily.forEach((day) => {
                day.employees.forEach((emp) => {
                  const currentHours = employeeHoursMap.get(emp.employee_name) || 0;
                  const empHours = typeof emp.hours === 'string' ? parseFloat(emp.hours) : Number(emp.hours) || 0;
                  employeeHoursMap.set(emp.employee_name, currentHours + empHours);
                });
              });

              const top10Employees = Array.from(employeeHoursMap.entries())
                .map(([name, hours]) => ({ name, hours }))
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 10);

              const totalHours = top10Employees.reduce((sum, emp) => sum + emp.hours, 0);

              // Debug logging
              const donutData = top10Employees.map((emp) => emp.hours);
              const donutLabels = top10Employees.map((emp) => emp.name);

              const donutOptions: ApexOptions = {
                chart: {
                  type: 'donut',
                  height: 400
                },
                labels: donutLabels,
                colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#3F51B5', '#03A9F4', '#4CAF50', '#FF9800', '#F44336'],
                plotOptions: {
                  pie: {
                    donut: {
                      size: '70%',
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: 'Total Hours',
                          formatter: () => totalHours.toFixed(1)
                        }
                      }
                    }
                  }
                },
                dataLabels: {
                  enabled: true,
                  formatter: (val: string) => `${parseFloat(val).toFixed(1)}h`
                },
                legend: {
                  show: true,
                  position: 'bottom'
                },
                tooltip: {
                  y: {
                    formatter: (val: number) => `${val.toFixed(1)} hours`
                  }
                }
              };

              return (
                <AllyviaEmpty
                  isLoading={isLoading}
                  isEmpty={top10Employees.length === 0}
                  type="chart"
                  height={400}
                  title={top10Employees.length === 0 ? 'No Employee Data' : undefined}
                  description={top10Employees.length === 0 ? 'No employee hours data available for the selected period' : undefined}
                >
                  <Chart options={donutOptions} series={donutData} type="donut" height={400} />
                </AllyviaEmpty>
              );
            })()}
          </Grid>

          {/* Employee List */}
          <Grid size={{ xs: 12, md: 6 }}>
            {(() => {
              const employeeHoursMap = new Map<string, number>();
              daily.forEach((day) => {
                day.employees.forEach((emp) => {
                  const currentHours = employeeHoursMap.get(emp.employee_name) || 0;
                  const empHours = typeof emp.hours === 'string' ? parseFloat(emp.hours) : Number(emp.hours) || 0;
                  employeeHoursMap.set(emp.employee_name, currentHours + empHours);
                });
              });

              const top10Employees = Array.from(employeeHoursMap.entries())
                .map(([name, hours]) => ({ name, hours }))
                .sort((a, b) => b.hours - a.hours)
                .slice(0, 10);

              const totalHours = top10Employees.reduce((sum, emp) => sum + emp.hours, 0);

              return (
                <Box sx={{ height: 400, overflow: 'auto' }}>
                  {isLoading ? (
                    <Skeleton variant="rectangular" height={400} />
                  ) : top10Employees.length > 0 ? (
                    <List>
                      {top10Employees.map((emp, index) => {
                        const percentage = totalHours > 0 ? (emp.hours / totalHours) * 100 : 0;
                        return (
                          <ListItem key={emp.name} sx={{ px: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle1" fontWeight="medium">
                                  {emp.name}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'right', ml: 2, minWidth: 60, pr: 2 }}>
                                <Typography variant="h5" fontWeight="bold" color="primary.main">
                                  {percentage.toFixed(1)}%
                                </Typography>
                                <Typography variant="h6" color="text.secondary">
                                  {emp.hours.toFixed(1)}h
                                </Typography>
                              </Box>
                            </Box>
                          </ListItem>
                        );
                      })}
                    </List>
                  ) : (
                    <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography color="textSecondary">No employee data available</Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default EmployeeTopHoursWidget;
