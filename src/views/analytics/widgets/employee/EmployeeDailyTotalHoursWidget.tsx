import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import type { AnalyticsWidgetProps } from 'views/analytics/registry/types';
import { useEmployeeAnalytics } from './EmployeeAnalyticsContext';

const EmployeeDailyTotalHoursWidget: React.FC<AnalyticsWidgetProps> = () => {
  const { isLoading, daily } = useEmployeeAnalytics();

  return (
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
  );
};

export default EmployeeDailyTotalHoursWidget;
