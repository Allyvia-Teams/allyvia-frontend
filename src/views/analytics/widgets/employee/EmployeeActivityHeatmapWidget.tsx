import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import { useEmployeeAnalytics } from './EmployeeAnalyticsContext';

const EmployeeActivityHeatmapWidget: React.FC<AnalyticsWidgetProps> = () => {
  const { isLoading, heatmapQ, weekdayOrder, filteredDaily } = useEmployeeAnalytics();

  return (
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
  );
};

export default EmployeeActivityHeatmapWidget;
