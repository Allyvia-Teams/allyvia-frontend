import React from 'react';
import { Card, CardContent, Typography, Box, List, ListItem, Popover, Button, Divider, Skeleton } from '@mui/material';
import { FilterList } from '@mui/icons-material';
import AllyviaWeekSlider from 'ui-component/common/AllyviaWeekSlider';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { format } from 'utils/dateUtils';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import { useEmployeeAnalytics } from './EmployeeAnalyticsContext';

const EmployeeWeekTimelineWidget: React.FC<AnalyticsWidgetProps> = () => {
  const {
    isLoading,
    allEmployees,
    selectedEmployee,
    anchorEl,
    open,
    handleClick,
    handleClose,
    selectEmployee,
    isFutureEndDateError,
    timelineSeries,
    timelineChartConfig,
    filteredDaily,
    setWeekStartISO,
    setWeekEndISO
  } = useEmployeeAnalytics();

  return (
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
  );
};

export default EmployeeWeekTimelineWidget;
