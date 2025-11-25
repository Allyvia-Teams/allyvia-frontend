import React, { useState, useMemo } from 'react';
import { Grid, Card, CardContent, Typography, Alert, Skeleton, Box, List, ListItem, Popover, Button, Divider } from '@mui/material';
import { FilterList } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { AnalyticsAPI } from 'api/analytics.api';
import {
  AnalyticsParams,
  EmployeeAllResponse,
  EmployeeDailyResponse,
  EmployeeOverviewResponse,
  EmployeeHeatmapResponse
} from 'types/analytics';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import AllyviaWeekSlider from 'ui-component/common/AllyviaWeekSlider';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { format } from 'utils/dateUtils';

type Props = {
  dateRange: RangeValue;
  isLoading: boolean;
};

const EmployeeAnalytics: React.FC<Props> = ({ dateRange, isLoading }) => {
  // Convert dateRange to AnalyticsParams
  const params: AnalyticsParams = {
    start_date: dateRange.start?.toString() || '',
    end_date: dateRange.end?.toString() || ''
  };
  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [weekStartISO, setWeekStartISO] = useState<string | undefined>(undefined);
  const [weekEndISO, setWeekEndISO] = useState<string | undefined>(undefined);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const overviewQ = useQuery<EmployeeOverviewResponse>({
    queryKey: ['employee-overview', params],
    queryFn: () => AnalyticsAPI.Employee.getOverview(params)
  });

  const allQ = useQuery<EmployeeAllResponse>({
    queryKey: ['employee-all', params],
    queryFn: () => AnalyticsAPI.Employee.getAll(params)
  });
  // Map employee name -> id from employee all response
  const nameToId = useMemo(() => {
    const map: Record<string, string> = {};
    const top = allQ.data?.top_employees || [];
    top.forEach((t) => {
      if (t.employee_name && t.employee_id) map[t.employee_name] = t.employee_id;
    });
    return map;
  }, [allQ.data?.top_employees]);

  const selectedEmployeeId = selectedEmployee ? nameToId[selectedEmployee] : undefined;

  // Daily breakdown refetches on week or employee change
  const dailyQ = useQuery<EmployeeDailyResponse>({
    queryKey: [
      'employee-daily',
      {
        start: weekStartISO || params.start_date,
        end: weekEndISO || params.end_date,
        employee_id: selectedEmployeeId || null
      }
    ],
    queryFn: () =>
      AnalyticsAPI.Employee.getDailyBreakdown({
        start_date: weekStartISO || params.start_date,
        end_date: weekEndISO || params.end_date,
        ...(selectedEmployeeId ? { employee_id: selectedEmployeeId } : {})
      })
  });
  const heatmapQ = useQuery<EmployeeHeatmapResponse>({
    queryKey: ['employee-heatmap', params],
    queryFn: () => AnalyticsAPI.Employee.getHeatmap(params)
  });

  // Gracefully handle specific daily error: end_date cannot be in the future
  const dailyNonFieldErrors: string[] = React.useMemo(() => {
    const e: any = dailyQ.error as any;
    const apiErrors = e?.response?.data?.non_field_errors;
    if (Array.isArray(apiErrors)) return apiErrors.map((s: any) => String(s));
    const message = e?.message || e?.response?.data?.message;
    return message ? [String(message)] : [];
  }, [dailyQ.error]);

  const isFutureEndDateError = dailyNonFieldErrors.some((msg) => msg.toLowerCase().includes('end_date cannot be in the future'));

  const error = overviewQ.error || allQ.error || (isFutureEndDateError ? null : dailyQ.error) || heatmapQ.error;

  const summary = overviewQ.data?.summary;
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

          // Normalize day to local noon to avoid UTC vs local boundary issues
          const dayDate = new Date(`${day.date}T12:00:00`);
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
          // getHours()/getMinutes() return LOCAL time → converts UTC timestamps to local clock time
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
      </Grid>

      {/* Daily Total Hours Chart */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Daily Total Hours (All Employees)
            </Typography>
            {(() => {
              // Calculate total hours per day across all employees
              const dailyTotals = daily.map((day) => {
                const totalHours = day.employees.reduce((sum, emp) => {
                  const hours = typeof emp.hours === 'string' ? parseFloat(emp.hours) : Number(emp.hours) || 0;
                  return sum + hours;
                }, 0);
                return {
                  day: day.day,
                  date: day.date,
                  totalHours: totalHours
                };
              });

              const chartData = dailyTotals.map((d) => d.totalHours);
              const chartCategories = dailyTotals.map((d) => d.day);

              const dailyTotalOptions: ApexOptions = {
                chart: {
                  type: 'bar',
                  height: 350,
                  toolbar: {
                    show: true
                  }
                },
                plotOptions: {
                  bar: {
                    horizontal: false,
                    columnWidth: '60%',
                    borderRadius: 4
                  }
                },
                dataLabels: {
                  enabled: true,
                  formatter: (val: number) => `${val.toFixed(1)}h`
                },
                xaxis: {
                  categories: chartCategories,
                  title: {
                    text: 'Day of Week'
                  }
                },
                yaxis: {
                  title: {
                    text: 'Total Hours'
                  },
                  labels: {
                    formatter: (val: number) => val.toFixed(2)
                  }
                },
                colors: ['#8B5CF6'],
                tooltip: {
                  y: {
                    formatter: (val: number) => `${val.toFixed(1)} hours`
                  }
                },
                grid: {
                  show: true
                }
              };

              return (
                <AllyviaEmpty
                  isLoading={isLoading}
                  isEmpty={dailyTotals.length === 0}
                  type="chart"
                  height={350}
                  title={dailyTotals.length === 0 ? 'No Data Available' : undefined}
                  description={dailyTotals.length === 0 ? 'No daily hours data available for the selected period' : undefined}
                >
                  <Chart options={dailyTotalOptions} series={[{ name: 'Total Hours', data: chartData }]} type="bar" height={350} />
                </AllyviaEmpty>
              );
            })()}
          </CardContent>
        </Card>
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

                  // Debug logging
                  console.log('Donut Chart Debug:', {
                    dailyLength: daily.length,
                    employeeHoursMapSize: employeeHoursMap.size,
                    top10Employees,
                    totalHours,
                    donutData: top10Employees.map((emp) => emp.hours),
                    donutLabels: top10Employees.map((emp) => emp.name)
                  });

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
      </Grid>

      {/* Activity Heatmap - All Employees */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Activity Heatmap (Weekday × Hour) - All Employees
            </Typography>
            {(() => {
              // Use heatmap endpoint data (all employees), not daily aggregation
              const matrix = heatmapQ.data?.matrix || [];

              // Build 7x24 grid of values initialized to 0
              const grid: Record<string, number[]> = {};
              weekdayOrder.forEach((wd) => {
                grid[wd] = new Array(24).fill(0);
              });

              // Fill from matrix: hour is 0-23 (for bucket='hour'). If bucket='half', values are encoded (e.g., 930) – we ignore halves here
              matrix.forEach((cell) => {
                const wd = cell.weekday;
                const hourVal = cell.hour;
                if (grid[wd]) {
                  const hourIndex = typeof hourVal === 'number' && hourVal >= 0 && hourVal < 24 ? hourVal : undefined;
                  if (hourIndex !== undefined) {
                    grid[wd][hourIndex] = Number(cell.hours || 0);
                  }
                }
              });

              const heatmapChartData = weekdayOrder.map((day) => ({
                name: day,
                data: grid[day].map((value, hourIndex) => ({
                  x:
                    hourIndex === 0
                      ? '12-1 AM'
                      : hourIndex < 12
                        ? `${hourIndex}-${hourIndex + 1} AM`
                        : hourIndex === 12
                          ? '12-1 PM'
                          : `${hourIndex - 12}-${hourIndex - 11} PM`,
                  y: value
                }))
              }));

              const heatmapOptions: ApexOptions = {
                chart: {
                  type: 'heatmap',
                  height: 400
                },
                dataLabels: {
                  enabled: true,
                  formatter: function (val: number) {
                    if (val === 0) return '0';
                    if (val < 1) return '0.1';
                    return Math.round(val).toString();
                  },
                  style: {
                    fontSize: '12px',
                    colors: ['#fff']
                  }
                },
                colors: ['#ffffff', '#f59e0b', '#ea580c', '#dc2626'],
                xaxis: {
                  title: {
                    text: 'Hour of Day'
                  }
                },
                yaxis: {
                  title: {
                    text: 'Day of Week'
                  }
                },
                plotOptions: {
                  heatmap: {
                    shadeIntensity: 0.5,
                    radius: 0,
                    useFillColorAsStroke: true,
                    colorScale: {
                      ranges: [
                        { from: 0, to: 4, color: '#ffffff', name: '0-4 hours' },
                        { from: 4, to: 8, color: '#f59e0b', name: '4-8 hours' },
                        { from: 8, to: 12, color: '#ea580c', name: '8-12 hours' },
                        { from: 12, to: 999, color: '#dc2626', name: '12+ hours' }
                      ]
                    }
                  }
                },
                tooltip: {
                  custom: function ({ series, seriesIndex, dataPointIndex, w }) {
                    const value = w.config.series[seriesIndex].data[dataPointIndex].y;
                    const hour = w.config.series[seriesIndex].data[dataPointIndex].x;
                    const day = w.config.series[seriesIndex].name;

                    return `
                      <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
                        <strong>${day}</strong><br/>
                        <strong>${hour}</strong><br/>
                        ${value === 0 ? 'No activity' : value < 1 ? '0.1 hours worked' : `${Math.round(value)} hours worked`}
                      </div>
                    `;
                  }
                }
              };

              return (
                <>
                  <AllyviaEmpty
                    isLoading={isLoading}
                    isEmpty={filteredDaily.length === 0}
                    type="chart"
                    height={400}
                    title={filteredDaily.length === 0 ? 'No Data Available' : undefined}
                    description={filteredDaily.length === 0 ? 'No employee activity data available for the selected period' : undefined}
                  >
                    <Chart options={heatmapOptions} series={heatmapChartData} type="heatmap" height={400} />
                  </AllyviaEmpty>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </Grid>

      {/* Week Slider with Timeline Chart */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
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

            {/* Check if we have any timeline data - if not, show empty state */}
            {isFutureEndDateError ? (
              <AllyviaEmpty
                isEmpty={true}
                isLoading={false}
                type="chart"
                title="No Timeline Data"
                description="Selected date range includes future dates. Adjust the range to view data."
                height={400}
              />
            ) : timelineSeries.length > 0 && timelineSeries.some((s) => s.data.length > 0) ? (
              <AllyviaWeekSlider
                maxDate={new Date()}
                rightSlot={
                  <Button variant="outlined" startIcon={<FilterList />} onClick={handleClick} sx={{ minWidth: 200 }}>
                    {selectedEmployee || 'Select Employee'}
                  </Button>
                }
                onWeekChange={(weekData) => {
                  // Update week ISO dates to drive refetch
                  setWeekStartISO(format(weekData.start, 'yyyy-MM-dd'));
                  setWeekEndISO(format(weekData.end, 'yyyy-MM-dd'));
                }}
              >
                {(weekData) => (
                  <>
                    {/* Timeline Chart */}
                    <Typography variant="h4" fontWeight={600} color="text.primary" sx={{ mb: 2, mt: 4 }}>
                      {selectedEmployee ? `${selectedEmployee}'s Timeline` : 'Weekly Timelines by Employee'}
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

                      // Filter timeline series to only show selected employee data within the selected week
                      const filteredTimelineSeries = selectedEmployee
                        ? timelineSeries
                            .filter((series) => series.name === selectedEmployee)
                            .map((series) => ({
                              ...series,
                              data: series.data.filter((point) => {
                                // Find the corresponding day data to check if it's within the selected week
                                const dayData = filteredDaily.find((d) => d.day === point.x);
                                if (!dayData) {
                                  return false;
                                }
                                const dayDate = new Date(dayData.date);
                                const isInWeek = dayDate >= weekData.start && dayDate <= weekData.end;
                                return isInWeek;
                              })
                            }))
                        : [];

                      const timelineOptions: ApexOptions = {
                        chart: {
                          type: 'rangeBar',
                          height: timelineChartConfig.height,
                          zoom: {
                            enabled: false
                          }
                        },
                        plotOptions: {
                          bar: {
                            horizontal: true,
                            rangeBarGroupRows: false,
                            barHeight: '60%',
                            columnWidth: '80%'
                          }
                        },
                        xaxis: {
                          type: 'numeric',
                          title: { text: 'Time of Day (Hours)' },
                          min: 0,
                          max: 24,
                          tickAmount: 8,
                          labels: {
                            formatter: function (value: string | number) {
                              const hour = typeof value === 'string' ? parseFloat(value) : value;
                              if (isNaN(hour)) return '';
                              const h = Math.floor(hour);
                              const ampm = h < 12 || h === 24 ? 'AM' : 'PM';
                              const displayHour = h % 12 === 0 ? 12 : h % 12;
                              return `${displayHour}${ampm}`;
                            },
                            rotate: -45,
                            style: {
                              fontSize: '11px'
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
                                if (isNaN(hour)) return '';
                                const h = Math.floor(hour);
                                const m = Math.round((hour % 1) * 60);
                                const ampm = h < 12 || h === 24 ? 'AM' : 'PM';
                                const displayHour = h % 12 === 0 ? 12 : h % 12;
                                return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
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
                          theme: 'light',
                          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
                            const point = w.config.series[seriesIndex].data[dataPointIndex];
                            const range = point?.y as number[] | undefined;

                            if (Array.isArray(range) && range.length === 2) {
                              const [startHour, endHour] = range;
                              const durationHrs = endHour - startHour;

                              const formatHour = (hour: number) => {
                                if (isNaN(hour)) return '';
                                const h = Math.floor(hour);
                                const m = Math.round((hour % 1) * 60);
                                const ampm = h < 12 || h === 24 ? 'AM' : 'PM';
                                const displayHour = h % 12 === 0 ? 12 : h % 12;
                                return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
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
                        grid: { padding: { top: 20, right: 20, bottom: 20, left: 20 } },
                        colors: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE']
                      };

                      console.log('Filtered timeline series:', filteredTimelineSeries);

                      return (
                        <>
                          {isLoading ? (
                            <Skeleton variant="rectangular" height={timelineChartConfig.height} />
                          ) : !selectedEmployee ? (
                            <AllyviaEmpty
                              isEmpty={true}
                              isLoading={false}
                              type="chart"
                              title="Select an Employee"
                              description="Please select an employee from the dropdown above to view their timeline"
                              height={timelineChartConfig.height}
                            />
                          ) : filteredTimelineSeries.some((s) => s.data.length > 0) ? (
                            <Chart
                              options={timelineOptions}
                              series={filteredTimelineSeries}
                              type="rangeBar"
                              height={timelineChartConfig.height}
                            />
                          ) : (
                            <AllyviaEmpty
                              isEmpty={true}
                              isLoading={false}
                              type="chart"
                              title="No Timeline Data"
                              description={`No timeline data available for ${selectedEmployee} in the selected week`}
                              height={timelineChartConfig.height}
                            />
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </AllyviaWeekSlider>
            ) : (
              <AllyviaEmpty
                isEmpty={true}
                isLoading={isLoading}
                type="chart"
                title="No Timeline Data Available"
                description="No employee timeline data is available for the selected date range"
                height={400}
              />
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* (Removed) Per-employee Activity Heatmap */}
    </Grid>
  );
};

export default EmployeeAnalytics;
