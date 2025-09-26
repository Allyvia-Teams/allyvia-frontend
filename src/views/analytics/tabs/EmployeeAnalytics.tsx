import React from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface EmployeeAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const EmployeeAnalytics: React.FC<EmployeeAnalyticsProps> = ({ dateRange, isLoading }) => {
  const { employeeSummary, employeeTimeUtilization, topEmployees, employeeTimeBreakdown, dailyBreakdown } = useSelector(
    (state: RootState) => state.analytics
  );

  // Employee KPIs from overview
  const employeeKpis = [
    {
      title: 'Total Hours Worked',
      value: (employeeSummary?.total_hours ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      trend: 'up' as const,
      theme: 'success' as const
    },
    {
      title: 'Active Employees',
      value: (employeeSummary?.active_employees ?? 0).toLocaleString(),
      trend: 'neutral' as const,
      theme: 'default' as const
    },
    {
      title: 'Avg Hours/Employee',
      value: (employeeSummary?.avg_hours_per_employee ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      trend: 'up' as const,
      theme: 'success' as const
    }
  ];

  // Time Utilization Chart
  const timeUtilizationOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: { show: true }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: { categories: employeeTimeUtilization.map((item) => item.week_start), title: { text: 'Week' } },
    yaxis: {
      title: { text: 'Hours Worked' },
      labels: {
        formatter: (value: number) => `${value}h`
      }
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} hours`
      }
    },
    colors: ['#2196F3']
  };

  const timeUtilizationSeries = [{ name: 'Hours Worked', data: employeeTimeUtilization.map((item) => item.hours) }];

  // Employee Time Breakdown Bar Chart
  const employeeBreakdownOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 400,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val}h`,
      offsetX: -6,
      style: {
        fontSize: '12px',
        colors: ['#304758']
      }
    },
    xaxis: {
      categories: employeeTimeBreakdown.map((emp) => emp.employee_name),
      title: { text: 'Hours Worked' },
      labels: {
        formatter: (value: string) => `${value}h`
      }
    },
    yaxis: {
      title: { text: 'Employee' }
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} hours`
      }
    },
    colors: ['#4CAF50']
  };

  const employeeBreakdownSeries = [
    {
      name: 'Hours Worked',
      data: employeeTimeBreakdown.map((emp) => emp.hours)
    }
  ];

  // Daily Stacked Bar Chart
  const dailyStackedOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 400,
      stacked: true,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: dailyBreakdown.map((day) => day.day),
      title: { text: 'Day of Week' }
    },
    yaxis: {
      title: { text: 'Hours Worked' },
      labels: {
        formatter: (value: number) => `${value}h`
      }
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} hours`
      }
    },
    colors: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#8BC34A', '#FF5722'],
    legend: {
      position: 'top',
      horizontalAlign: 'left'
    }
  };

  // Prepare data for stacked chart - get unique employees and create series
  const getUniqueEmployees = () => {
    const employees = new Set<string>();
    dailyBreakdown.forEach((day) => {
      day.employees.forEach((emp) => employees.add(emp.employee_name));
    });
    return Array.from(employees);
  };

  const uniqueEmployees = getUniqueEmployees();
  const dailyStackedSeries = uniqueEmployees.map((employeeName) => ({
    name: employeeName,
    data: dailyBreakdown.map((day) => {
      const emp = day.employees.find((e) => e.employee_name === employeeName);
      return emp ? emp.hours : 0;
    })
  }));

  return (
    <Grid container spacing={3}>
      {/* Employee KPIs - using AllyviaStats */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {employeeKpis.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} trend={kpi.trend} size="medium" />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Time Utilization Chart */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Weekly Time Utilization
            </Typography>
            <Chart options={timeUtilizationOptions} series={timeUtilizationSeries} type="line" height={350} />
          </CardContent>
        </Card>
      </Grid>

      {/* Top Employees */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Employees by Hours
            </Typography>
            {topEmployees && topEmployees.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topEmployees.slice(0, 8).map((emp) => (
                      <TableRow key={emp.employee_id}>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell align="right">{emp.hours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No employee data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Employee Time Breakdown Bar Chart */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Employee Time Breakdown
            </Typography>
            {employeeTimeBreakdown && employeeTimeBreakdown.length > 0 ? (
              <Chart options={employeeBreakdownOptions} series={employeeBreakdownSeries} type="bar" height={400} />
            ) : (
              <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No employee time breakdown data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Daily Stacked Bar Chart */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Daily Work Hours by Employee
            </Typography>
            {dailyBreakdown && dailyBreakdown.length > 0 ? (
              <Chart options={dailyStackedOptions} series={dailyStackedSeries} type="bar" height={400} />
            ) : (
              <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No daily breakdown data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default EmployeeAnalytics;
