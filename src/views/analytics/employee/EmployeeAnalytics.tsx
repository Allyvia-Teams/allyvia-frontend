import React, { useState, useMemo } from 'react';
import { Grid, Card, CardContent, Typography, Alert, Skeleton, Box, List, ListItem, Popover, Button, Divider } from '@mui/material';
import { FilterList } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeOverview, getEmployeeAll, getEmployeeDailyBreakdown, getEmployeeHeatmap } from 'api/analytics.api';
import {
  AnalyticsParams,
  EmployeeAllResponse,
  EmployeeDailyResponse,
  EmployeeOverviewResponse,
  EmployeeHeatmapResponse
} from 'types/analytics';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import AllyviaWeekSlider from 'ui-component/common/AllyviaWeekSlider';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

type Props = {
  params: AnalyticsParams;
};

const EmployeeAnalytics: React.FC<Props> = ({ params }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const overviewQ = useQuery<EmployeeOverviewResponse>({
    queryKey: ['employee-overview', params],
    queryFn: () => getEmployeeOverview(params)
  });

  const allQ = useQuery<EmployeeAllResponse>({
    queryKey: ['employee-all', params],
    queryFn: () => getEmployeeAll(params)
  });

  const dailyQ = useQuery<EmployeeDailyResponse>({
    queryKey: ['employee-daily', params],
    queryFn: () => getEmployeeDailyBreakdown(params)
  });
  const heatmapQ = useQuery<EmployeeHeatmapResponse>({
    queryKey: ['employee-heatmap', params],
    queryFn: () => getEmployeeHeatmap({ ...params, bucket: 'hour' })
  });

  const isLoading = overviewQ.isLoading || allQ.isLoading || dailyQ.isLoading || heatmapQ.isLoading;
  const error = overviewQ.error || allQ.error || dailyQ.error || heatmapQ.error;

  const summary = overviewQ.data?.summary;
  const timeUtilization = (overviewQ.data?.time_utilization || []).map((p) => ({
    date: p.date,
    hours: Number(p.hours || 0)
  }));
  const daily = dailyQ.data?.daily_breakdown || [];

  // Get all unique employees from daily data
  const allEmployees = useMemo(() => {
    const employeeSet = new Set<string>();
    daily.forEach((day) => {
      day.employees.forEach((emp) => {
        employeeSet.add(emp.employee_name);
      });
    });
    return Array.from(employeeSet).sort();
  }, [daily]);

  // Initialize selected employee with first employee if none selected
  React.useEffect(() => {
    if (allEmployees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(allEmployees[0]);
    }
  }, [allEmployees, selectedEmployee]);

  // Filter daily data based on selected employee
  const filteredDaily = useMemo(() => {
    return daily.map((day) => ({
      ...day,
      employees: day.employees.filter((emp) => emp.employee_name === selectedEmployee)
    }));
  }, [daily, selectedEmployee]);

  // Popover handlers
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const selectEmployee = (employeeName: string) => {
    setSelectedEmployee(employeeName);
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const uniqueEmployees = selectedEmployee ? [selectedEmployee] : [];
  const stackedOptions: ApexOptions = {
    chart: { type: 'bar', stacked: true, height: 360, toolbar: { show: true } },
    xaxis: { categories: filteredDaily.map((d) => d.day) },
    yaxis: { title: { text: 'Hours' } },
    legend: { show: false }
  };
  const stackedSeries = uniqueEmployees.map((name) => ({
    name,
    data: filteredDaily.map((d) => {
      const emp = d.employees.find((e) => e.employee_name === name);
      const hours = emp ? (typeof emp.hours === 'string' ? parseFloat(emp.hours) : Number(emp.hours) || 0) : 0;
      return hours;
    })
  }));

  // Timeline (rangeBar) per employee per day using actual clock-in/out times if available
  const timelineSeries = useMemo(() => {
    console.log('Creating timeline series with:', { uniqueEmployees, filteredDaily });

    return uniqueEmployees.map((employeeName, employeeIndex) => {
      const data = filteredDaily
        .map((day) => {
          const emp = day.employees.find((e) => e.employee_name === employeeName);
          if (!emp) {
            console.log(`No employee data found for ${employeeName} on ${day.day}`);
            return null;
          }

          const dayDate = new Date(day.date);
          let startTime: Date | null = null;
          let endTime: Date | null = null;

          if (emp.start_time && emp.end_time) {
            startTime = new Date(emp.start_time);
            endTime = new Date(emp.end_time);
            console.log(`Using real times for ${employeeName} on ${day.day}:`, {
              start_time: emp.start_time,
              end_time: emp.end_time,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString()
            });
          } else {
            // Fallback: simulate based on total hours
            const hours = typeof emp.hours === 'string' ? parseFloat(emp.hours) : Number(emp.hours) || 0;
            startTime = new Date(dayDate);
            startTime.setHours(9, 0, 0, 0);
            endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + Math.floor(hours), (hours % 1) * 60, 0, 0);
            console.log(`Using simulated times for ${employeeName} on ${day.day}:`, {
              hours,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString()
            });
          }

          // Create a single day timeline entry with hours (0-24)
          const startHour = startTime.getHours() + startTime.getMinutes() / 60;
          const endHour = endTime.getHours() + endTime.getMinutes() / 60;

          // Create timeline point with just day name
          const timelinePoint = {
            x: day.day, // Just the day name (Monday, Tuesday, etc.)
            y: [startHour, endHour]
          };

          console.log(`Timeline point for ${employeeName} on ${day.day}:`, {
            ...timelinePoint,
            startHour,
            endHour,
            duration: endHour - startHour,
            employeeIndex
          });
          return timelinePoint;
        })
        .filter((item): item is { x: string; y: number[] } => item !== null);

      console.log(`Timeline series for ${employeeName}:`, { name: employeeName, data });
      return { name: employeeName, data };
    });
  }, [uniqueEmployees, filteredDaily]);

  // Fixed chart configuration for single employee
  const timelineChartConfig = {
    height: 500,
    barHeight: '60%',
    columnWidth: '70%'
  };

  const timelineOptions: ApexOptions = {
    chart: {
      type: 'rangeBar',
      height: timelineChartConfig.height,
      toolbar: { show: true },
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        rangeBarGroupRows: false,
        barHeight: timelineChartConfig.barHeight,
        columnWidth: timelineChartConfig.columnWidth
      }
    },
    xaxis: {
      type: 'numeric',
      title: { text: 'Time of Day (Hours)' },
      min: 0,
      max: 24,
      labels: {
        formatter: function (value: string | number) {
          const hour = typeof value === 'string' ? parseFloat(value) : value;
          if (hour === 0) return '12 AM';
          if (hour < 12)
            return `${Math.floor(hour)}:${Math.round((hour % 1) * 60)
              .toString()
              .padStart(2, '0')} AM`;
          if (hour === 12) return '12 PM';
          return `${Math.floor(hour - 12)}:${Math.round((hour % 1) * 60)
            .toString()
            .padStart(2, '0')} PM`;
        }
      }
    },
    yaxis: {
      title: { text: 'Day of Week' }
    },
    dataLabels: {
      enabled: true,
      formatter: function (_val: number, opts: any) {
        const point = opts?.w?.config?.series?.[opts.seriesIndex]?.data?.[opts.dataPointIndex];
        const range = point?.y as number[] | undefined;
        if (Array.isArray(range) && range.length === 2) {
          const [startHour, endHour] = range;
          const formatHour = (hour: number) => {
            if (hour === 0) return '12 AM';
            if (hour < 12)
              return `${Math.floor(hour)}:${Math.round((hour % 1) * 60)
                .toString()
                .padStart(2, '0')} AM`;
            if (hour === 12) return '12 PM';
            return `${Math.floor(hour - 12)}:${Math.round((hour % 1) * 60)
              .toString()
              .padStart(2, '0')} PM`;
          };
          return `${formatHour(startHour)} - ${formatHour(endHour)}`;
        }
        return '';
      },
      style: {
        fontSize: '10px',
        colors: ['#fff']
      }
    },
    legend: { show: true, position: 'top', horizontalAlign: 'left' },
    tooltip: {
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const point = w.config.series[seriesIndex].data[dataPointIndex];
        const range = point?.y as number[] | undefined;

        if (Array.isArray(range) && range.length === 2) {
          const [startHour, endHour] = range;
          const durationHrs = endHour - startHour;

          const formatHour = (hour: number) => {
            if (hour === 0) return '12 AM';
            if (hour < 12)
              return `${Math.floor(hour)}:${Math.round((hour % 1) * 60)
                .toString()
                .padStart(2, '0')} AM`;
            if (hour === 12) return '12 PM';
            return `${Math.floor(hour - 12)}:${Math.round((hour % 1) * 60)
              .toString()
              .padStart(2, '0')} PM`;
          };

          return `
            <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
              <strong>${point.x}</strong><br/>
              <strong>${w.config.series[seriesIndex].name}</strong><br/>
              Time: ${formatHour(startHour)} - ${formatHour(endHour)}<br/>
              Duration: ${durationHrs.toFixed(2)}h
            </div>
          `;
        }
        return '';
      }
    },
    grid: { padding: { top: 20, right: 20, bottom: 20, left: 20 } }
  };

  // Heatmap
  const heatmapData = heatmapQ.data?.matrix || [];
  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Create a 7x24 matrix for the heatmap
  const createHeatmapMatrix = () => {
    const matrix: number[][] = [];
    for (let day = 0; day < 7; day++) {
      const dayRow: number[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const cell = heatmapData.find((d) => d.weekday === weekdayOrder[day] && d.hour === hour);
        dayRow.push(cell ? cell.hours : 0);
      }
      matrix.push(dayRow);
    }
    return matrix;
  };

  const heatmapMatrix = createHeatmapMatrix();
  const maxHours = Math.max(...heatmapData.map((d) => d.hours), 1);

  const heatmapOptions: ApexOptions = {
    chart: {
      type: 'heatmap',
      height: 400,
      toolbar: { show: true }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '10px',
        colors: ['#fff']
      }
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: '#f8f9fa', name: 'No activity' },
            { from: 0.1, to: maxHours * 0.3, color: '#e3f2fd', name: 'Low' },
            { from: maxHours * 0.3, to: maxHours * 0.6, color: '#2196f3', name: 'Medium' },
            { from: maxHours * 0.6, to: maxHours, color: '#1976d2', name: 'High' }
          ]
        }
      }
    },
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        if (hour === 0) return '12-1 AM';
        if (hour < 12) return `${hour}-${hour + 1} AM`;
        if (hour === 12) return '12-1 PM';
        return `${hour - 12}-${hour - 11} PM`;
      }),
      title: { text: 'Hour of Day' }
    },
    yaxis: {
      title: { text: 'Day of Week' }
    },
    tooltip: {
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const day = weekdayOrder[seriesIndex];
        const hour = dataPointIndex;
        let timeLabel;
        if (hour === 0) timeLabel = '12-1 AM';
        else if (hour < 12) timeLabel = `${hour}-${hour + 1} AM`;
        else if (hour === 12) timeLabel = '12-1 PM';
        else timeLabel = `${hour - 12}-${hour - 11} PM`;

        const hours = series[seriesIndex][dataPointIndex];
        return `
          <div style="padding: 10px;">
            <strong>${day} ${timeLabel}</strong><br/>
            Hours: ${hours.toFixed(1)}h
          </div>
        `;
      }
    }
  };

  const heatmapSeries = weekdayOrder.map((day, dayIndex) => ({
    name: day,
    data: heatmapMatrix[dayIndex]
  }));

  // OT trend

  return (
    <Grid container spacing={3}>
      {/* Error */}
      {!!error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">Failed to load employee analytics.</Alert>
        </Grid>
      )}

      {/* KPIs */}
      <Grid size={{ xs: 12 }}>
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
                  trend="up"
                  size="medium"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AllyviaStats
                  title="Active Employees"
                  value={(summary?.active_employees ?? 0).toLocaleString()}
                  theme="default"
                  trend="neutral"
                  size="medium"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AllyviaStats
                  title="Avg Hours/Employee"
                  value={(summary?.avg_hours_per_employee ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  theme="success"
                  trend="up"
                  size="medium"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <AllyviaStats
                  title="Open Entries"
                  value={(summary?.current_on_shift ?? 0).toLocaleString()}
                  theme="default"
                  trend="neutral"
                  size="medium"
                />
              </Grid>
            </>
          )}
        </Grid>
      </Grid>

      {/* Top 10 Employees Donut Chart and List */}
      <Grid size={{ xs: 12 }}>
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

                  const donutOptions: ApexOptions = {
                    chart: {
                      type: 'donut',
                      height: 400
                    },
                    labels: top10Employees.map((emp) => emp.name),
                    colors: ['#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107'],
                    dataLabels: {
                      enabled: true,
                      formatter: function (val: string) {
                        return `${parseFloat(val).toFixed(1)}%`;
                      }
                    },
                    legend: {
                      show: false
                    },
                    tooltip: {
                      y: {
                        formatter: function (val: number) {
                          return `${val.toFixed(1)}h`;
                        }
                      }
                    }
                  };

                  const donutSeries = top10Employees.map((emp) => emp.hours);

                  return (
                    <>
                      {isLoading ? (
                        <Skeleton variant="rectangular" height={400} />
                      ) : top10Employees.length > 0 ? (
                        <Chart options={donutOptions} series={donutSeries} type="donut" height={400} />
                      ) : (
                        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography color="textSecondary">No employee data available</Typography>
                        </Box>
                      )}
                    </>
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
      </Grid>

      {/* Employee Selection Button - Top Right */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="outlined" startIcon={<FilterList />} onClick={handleClick} sx={{ minWidth: 200 }}>
            {selectedEmployee || 'Select Employee'}
          </Button>
        </Box>
      </Grid>

      {/* Employee Selection Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <Box sx={{ width: 250, p: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Select Employee
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <List sx={{ p: 0 }}>
            {allEmployees.map((employeeName) => (
              <ListItem
                key={employeeName}
                component="button"
                onClick={() => selectEmployee(employeeName)}
                sx={{
                  backgroundColor: selectedEmployee === employeeName ? 'primary.light' : 'transparent',
                  borderRadius: 1,
                  mb: 1,
                  cursor: 'pointer',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  py: 1,
                  px: 2,
                  '&:hover': {
                    backgroundColor: selectedEmployee === employeeName ? 'primary.light' : 'action.hover'
                  }
                }}
              >
                <Typography
                  variant="body1"
                  fontWeight={selectedEmployee === employeeName ? 'bold' : 'normal'}
                  color={selectedEmployee === employeeName ? 'primary.contrastText' : 'text.primary'}
                >
                  {employeeName}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Box>
      </Popover>

      {/* Week Slider with Both Charts */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <AllyviaWeekSlider
              disabled={timelineSeries.length === 0 || !timelineSeries.some((s) => s.data.length > 0)}
              onWeekChange={(weekData) => {
                // Filter timeline data based on selected week
                console.log('Week changed:', weekData.start, weekData.end);
              }}
            >
              {(weekData) => (
                <>
                  {/* Daily Work Hours Chart */}
                  <Typography variant="h6" gutterBottom>
                    Daily Work Hours by Employee
                  </Typography>
                  {(() => {
                    // Filter daily data for the selected week
                    const weekFilteredDaily = filteredDaily.filter((day) => {
                      const dayDate = new Date(day.date);
                      return dayDate >= weekData.start && dayDate <= weekData.end;
                    });

                    const weekFilteredStackedOptions: ApexOptions = {
                      chart: { type: 'bar', stacked: true, height: 360, toolbar: { show: true } },
                      xaxis: { categories: weekFilteredDaily.map((d) => d.day) },
                      yaxis: { title: { text: 'Hours' } },
                      legend: { show: false }
                    };

                    const weekFilteredStackedSeries = uniqueEmployees.map((name) => ({
                      name,
                      data: weekFilteredDaily.map((d) => {
                        const emp = d.employees.find((e) => e.employee_name === name);
                        const hours = emp ? (typeof emp.hours === 'string' ? parseFloat(emp.hours) : Number(emp.hours) || 0) : 0;
                        return hours;
                      })
                    }));

                    return (
                      <>
                        {isLoading ? (
                          <Skeleton variant="rectangular" height={360} />
                        ) : weekFilteredDaily.length ? (
                          <Chart options={weekFilteredStackedOptions} series={weekFilteredStackedSeries} type="bar" height={360} />
                        ) : (
                          <Box sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="textSecondary">
                              {!selectedEmployee ? 'Select an employee to view data' : 'No data available for selected week'}
                            </Typography>
                          </Box>
                        )}
                      </>
                    );
                  })()}

                  {/* Timeline Chart */}
                  <Typography variant="h4" fontWeight={600} color="text.primary" sx={{ mb: 2, mt: 4 }}>
                    Weekly Timelines by Employee
                    {timelineSeries.length === 0 ||
                      (!timelineSeries.some((s) => s.data.length > 0) && (
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
                          (No data available)
                        </Typography>
                      ))}
                  </Typography>
                  {(() => {
                    // Debug: Log the data to understand what's happening
                    console.log('Timeline Debug:', {
                      timelineSeries: timelineSeries,
                      filteredDaily: filteredDaily,
                      weekData: weekData,
                      selectedEmployee: selectedEmployee
                    });

                    // Filter timeline series to only show data within the selected week
                    const filteredTimelineSeries = timelineSeries.map((series) => ({
                      ...series,
                      data: series.data.filter((point) => {
                        // Find the corresponding day data to check if it's within the selected week
                        const dayData = filteredDaily.find((d) => d.day === point.x);
                        if (!dayData) {
                          console.log('No day data found for point:', point.x);
                          return false;
                        }

                        const dayDate = new Date(dayData.date);
                        const isInWeek = dayDate >= weekData.start && dayDate <= weekData.end;
                        console.log('Date check:', {
                          dayDate: dayDate.toISOString(),
                          weekStart: weekData.start.toISOString(),
                          weekEnd: weekData.end.toISOString(),
                          isInWeek
                        });
                        return isInWeek;
                      })
                    }));

                    console.log('Filtered timeline series:', filteredTimelineSeries);

                    return (
                      <>
                        {isLoading ? (
                          <Skeleton variant="rectangular" height={timelineChartConfig.height} />
                        ) : filteredTimelineSeries.some((s) => s.data.length > 0) ? (
                          <Chart
                            options={timelineOptions}
                            series={filteredTimelineSeries}
                            type="rangeBar"
                            height={timelineChartConfig.height}
                          />
                        ) : timelineSeries.some((s) => s.data.length > 0) ? (
                          // Fallback: Show all timeline data if week filtering returns no data
                          <>
                            <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                              No data for selected week. Showing all available data:
                            </Typography>
                            <Chart options={timelineOptions} series={timelineSeries} type="rangeBar" height={timelineChartConfig.height} />
                          </>
                        ) : (
                          <Box sx={{ height: timelineChartConfig.height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="textSecondary">
                              {!selectedEmployee ? 'Select an employee to view timelines' : 'No timeline data available'}
                            </Typography>
                          </Box>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </AllyviaWeekSlider>
          </CardContent>
        </Card>
      </Grid>

      {/* Activity Heatmap */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Activity Heatmap (Weekday × Hour)
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={400} />
            ) : heatmapData.length ? (
              <Chart options={heatmapOptions} series={heatmapSeries} type="heatmap" height={400} />
            ) : (
              <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No heatmap data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default EmployeeAnalytics;
