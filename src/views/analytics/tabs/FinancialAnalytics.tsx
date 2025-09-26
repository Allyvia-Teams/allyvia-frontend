import React from 'react';
import { Grid, Box, Typography, Card, CardContent } from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface FinancialAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ dateRange, isLoading }) => {
  const {
    summary,
    revenueSeries,
    expenseBreakdown,
    paymentsSplit,
    inventorySummary: analyticsInventorySummary,
    inventoryCategories
  } = useSelector((state: RootState) => state.analytics);

  // Financial KPIs
  const financialKpis = [
    {
      title: 'Total Revenue',
      value: summary?.total_revenue || 0,
      currency: summary?.currency || 'USD',
      theme: 'default' as const,
      trend: 'up' as const
    },
    {
      title: 'Total Expenses',
      value: summary?.expenses || 0,
      currency: summary?.currency || 'USD',
      theme: 'default' as const,
      trend: 'neutral' as const
    },
    {
      title: 'Net Income',
      value: summary?.net || 0,
      currency: summary?.currency || 'USD',
      theme: (summary?.net || 0) >= 0 ? ('success' as const) : ('alert' as const),
      trend: (summary?.net || 0) >= 0 ? ('up' as const) : ('down' as const)
    },
    {
      title: 'Average Ticket',
      value: summary?.avg_ticket || 0,
      currency: summary?.currency || 'USD',
      theme: 'default' as const,
      trend: 'up' as const
    }
  ];

  // Revenue vs Expenses Chart
  const revenueExpenseChartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 350,
      toolbar: { show: true }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      type: 'datetime',
      categories: revenueSeries.map((item) => item.date)
    },
    yaxis: {
      title: { text: 'Amount ($)' },
      labels: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    },
    tooltip: {
      x: { format: 'dd MMM yyyy' },
      y: {
        formatter: (value: number) => `$${value.toLocaleString()}`
      }
    },
    legend: {
      position: 'top'
    }
  };

  const revenueExpenseSeries = [
    {
      name: 'Revenue',
      data: revenueSeries.map((item) => item.amount)
    },
    {
      name: 'Expenses',
      data: expenseBreakdown.map((item) => item.amount)
    }
  ];

  // Profit Margin Chart
  const profitMarginOptions: ApexOptions = {
    chart: {
      type: 'donut',
      height: 300
    },
    labels: ['Net Income', 'Expenses'],
    colors: ['#4CAF50', '#FF9800'],
    legend: {
      position: 'bottom'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%'
        }
      }
    }
  };

  const profitMarginSeries = [summary?.net || 0, summary?.expenses || 0];

  return (
    <Grid container spacing={3}>
      {/* Financial KPIs - using AllyviaStats */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {financialKpis.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats
                title={kpi.title}
                value={new Intl.NumberFormat('en-US', { style: 'currency', currency: kpi.currency }).format(kpi.value)}
                theme={kpi.theme}
                trend={kpi.trend}
                size="medium"
              />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Revenue vs Expenses Chart */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Revenue vs Expenses Trend
            </Typography>
            <Chart options={revenueExpenseChartOptions} series={revenueExpenseSeries} type="line" height={350} />
          </CardContent>
        </Card>
      </Grid>

      {/* Profit Margin Breakdown */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Profit Margin Breakdown
            </Typography>
            <Chart options={profitMarginOptions} series={profitMarginSeries} type="donut" height={300} />
          </CardContent>
        </Card>
      </Grid>

      {/* Payment Methods */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payment Methods Distribution
            </Typography>
            <Chart
              options={{
                chart: { type: 'bar', height: 300 },
                xaxis: { categories: paymentsSplit.map((item) => item.provider) },
                yaxis: { title: { text: 'Amount ($)' } },
                colors: ['#2196F3', '#4CAF50']
              }}
              series={[
                {
                  name: 'Amount',
                  data: paymentsSplit.map((item) => item.amount)
                }
              ]}
              type="bar"
              height={300}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Expense Categories */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Expense Categories
            </Typography>
            <Chart
              options={{
                chart: { type: 'pie', height: 300 },
                labels: expenseBreakdown.map((item) => item.category),
                colors: ['#FF9800', '#2196F3', '#4CAF50', '#9C27B0', '#F44336']
              }}
              series={expenseBreakdown.map((item) => item.amount)}
              type="pie"
              height={300}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default FinancialAnalytics;
