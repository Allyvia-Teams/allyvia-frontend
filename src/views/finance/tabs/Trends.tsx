import React, { useState, useEffect } from 'react';
import { Grid, Box, Divider, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import type { TimeseriesPoint, CategoryAmount, PaymentTrend, PaymentDetail } from 'types/finance';

// Chart imports
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// API imports
import {
  fetchExpenseTrends,
  fetchExpensesByCategory,
  fetchPaymentTrends,
  fetchPaymentDetails,
  fetchAccountTrends,
  fetchSeries
} from 'api/finance.api';

interface TrendsTabProps {
  startISO: string;
  endISO: string;
}

const TrendsTab: React.FC<TrendsTabProps> = ({ startISO, endISO }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for real API data
  const [expenseTrends, setExpenseTrends] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryAmount[]>([]);
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrend[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [accountTrends, setAccountTrends] = useState<any[]>([]);
  const [seriesData, setSeriesData] = useState<TimeseriesPoint[]>([]);

  useEffect(() => {
    const fetchTrendsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all trends data in parallel
        const [expenseTrendsData, expenseCategoriesData, paymentTrendsData, paymentDetailsData, accountTrendsData, seriesData] =
          await Promise.all([
            fetchExpenseTrends({ startDate: startISO, endDate: endISO }),
            fetchExpensesByCategory({ startDate: startISO, endDate: endISO }),
            fetchPaymentTrends({ startDate: startISO, endDate: endISO }),
            fetchPaymentDetails({ startDate: startISO, endDate: endISO }),
            fetchAccountTrends({ startDate: startISO, endDate: endISO }),
            fetchSeries({ startDate: startISO, endDate: endISO })
          ]);

        // Debug: Log what data we received
        console.log('Trends Data Debug:', {
          expenseTrends: expenseTrendsData,
          expenseCategories: expenseCategoriesData,
          paymentTrends: paymentTrendsData,
          paymentDetails: paymentDetailsData,
          accountTrends: accountTrendsData,
          seriesData: seriesData
        });

        // Ensure all data is arrays
        setExpenseTrends(Array.isArray(expenseTrendsData) ? expenseTrendsData : []);
        setExpenseCategories(Array.isArray(expenseCategoriesData) ? expenseCategoriesData : []);
        setPaymentTrends(Array.isArray(paymentTrendsData) ? paymentTrendsData : []);
        setPaymentDetails(Array.isArray(paymentDetailsData) ? paymentDetailsData : []);
        setAccountTrends(Array.isArray(accountTrendsData) ? accountTrendsData : []);
        setSeriesData(Array.isArray(seriesData) ? seriesData : []);
      } catch (err: any) {
        console.error('Failed to fetch trends data:', err);
        setError(err.message || 'Failed to fetch trends data');
      } finally {
        setLoading(false);
      }
    };

    if (startISO && endISO) {
      fetchTrendsData();
    }
  }, [startISO, endISO]);

  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtNumber = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const getChartOptions = (color: string = '#1976D2'): ApexOptions => ({
    chart: {
      type: 'line',
      height: 350,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: {
        enabled: true
      }
    },
    colors: [color],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'solid',
      opacity: 0
    },
    markers: {
      size: 0,
      strokeWidth: 0
    },
    grid: {
      show: false
    },
    xaxis: {
      type: 'datetime',
      labels: {
        format: 'MMM dd'
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => fmtMoney(value)
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px'
    },
    title: {
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        fontFamily: 'inherit'
      }
    }
  });

  // Helper function to check if data has meaningful values
  const hasValidData = (data: any[], valueKey: string = 'amount'): boolean => {
    return data.length > 0 && data.some((item) => Number(item[valueKey]) > 0);
  };

  // Helper function to format account type labels
  const formatAccountType = (accountType: string): string => {
    return accountType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <Grid container spacing={gridSpacing} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(expenseTrends.reduce((sum, trend) => sum + Number(trend.amount || 0), 0))}
            title="Total Expenses Trend"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={fmtMoney(paymentTrends.reduce((sum, trend) => sum + Number(trend.total_amount || 0), 0))}
            title="Total Payments Trend"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            value={expenseCategories.length}
            title="Expense Categories"
            showIcon={false}
            height={88}
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard value={paymentDetails.length} title="Payment Transactions" showIcon={false} height={88} isTaggable={false} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Expense Trends Chart - Only show if there's data */}
      {hasValidData(expenseTrends, 'amount') && (
        <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="Expense Trends Over Time">
              <ReactApexChart
                options={getChartOptions('#2196F3')}
                series={[
                  {
                    name: 'Daily Expenses',
                    data: expenseTrends
                      .filter((trend) => Number(trend.amount) > 0)
                      .map((trend) => ({
                        x: new Date(trend.date || trend.period).getTime(),
                        y: Number(trend.amount)
                      }))
                      .sort((a, b) => a.x - b.x)
                  }
                ]}
                type="line"
                height={350}
              />
            </MainCard>
          </Grid>
        </Grid>
      )}

      {/* Payment Trends Chart - Only show if there's data */}
      {hasValidData(paymentTrends, 'total_amount') && (
        <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="Payment Trends Over Time">
              <ReactApexChart
                options={getChartOptions('#F44336')}
                series={[
                  {
                    name: 'Daily Payments',
                    data: paymentTrends
                      .filter((trend) => Number(trend.total_amount) > 0)
                      .map((trend) => ({
                        x: new Date(trend.date).getTime(),
                        y: Number(trend.total_amount)
                      }))
                      .sort((a, b) => a.x - b.x)
                  }
                ]}
                type="line"
                height={350}
              />
            </MainCard>
          </Grid>
        </Grid>
      )}

      {/* Account Balances Chart - Only show if there's data */}
      {hasValidData(accountTrends, 'total_balance') && (
        <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="Account Balances by Type">
              <ReactApexChart
                options={{
                  ...getChartOptions('#4CAF50'),
                  xaxis: {
                    type: 'category',
                    labels: {
                      style: {
                        fontSize: '12px'
                      }
                    }
                  }
                }}
                series={[
                  {
                    name: 'Account Balance',
                    data: accountTrends
                      .filter((account) => Number(account.total_balance) > 0)
                      .map((account) => ({
                        x: formatAccountType(account.account_type),
                        y: Number(account.total_balance)
                      }))
                  }
                ]}
                type="line"
                height={350}
              />
            </MainCard>
          </Grid>
        </Grid>
      )}

      {/* Top Expense Categories Chart - Only show if there's data */}
      {hasValidData(expenseCategories, 'amount') && (
        <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="Top Expense Categories">
              <ReactApexChart
                options={{
                  ...getChartOptions('#F44336'),
                  xaxis: {
                    type: 'category',
                    labels: {
                      rotate: -45,
                      style: {
                        fontSize: '11px'
                      }
                    }
                  }
                }}
                series={[
                  {
                    name: 'Amount',
                    data: expenseCategories
                      .filter((category) => Number(category.amount) > 0)
                      .slice(0, 10) // Top 10 categories
                      .map((category) => ({
                        x: category.category,
                        y: Number(category.amount)
                      }))
                  }
                ]}
                type="line"
                height={350}
              />
            </MainCard>
          </Grid>
        </Grid>
      )}

      {/* Data Summary for Debugging */}
      <Grid container spacing={gridSpacing} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12 }}>
          <MainCard title="Data Summary">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom color="primary.main">
                  Data Points Available
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Expense Trends:</strong> {expenseTrends.length} points
                    {hasValidData(expenseTrends, 'amount') ? ' ✅' : ' ❌'}
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Payment Trends:</strong> {paymentTrends.length} points
                    {hasValidData(paymentTrends, 'total_amount') ? ' ✅' : ' ❌'}
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Account Trends:</strong> {accountTrends.length} accounts
                    {hasValidData(accountTrends, 'total_balance') ? ' ✅' : ' ❌'}
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Expense Categories:</strong> {expenseCategories.length} categories
                    {hasValidData(expenseCategories, 'amount') ? ' ✅' : ' ❌'}
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom color="primary.main">
                  Non-Zero Values
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Expense Trends:</strong> {expenseTrends.filter((t) => Number(t.amount) > 0).length} non-zero
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Payment Trends:</strong> {paymentTrends.filter((t) => Number(t.total_amount) > 0).length} non-zero
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Account Balances:</strong> {accountTrends.filter((a) => Number(a.total_balance) > 0).length} non-zero
                  </Typography>
                  <Typography component="li" variant="body2" paragraph>
                    <strong>Category Amounts:</strong> {expenseCategories.filter((c) => Number(c.amount) > 0).length} non-zero
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>
      </Grid>
    </>
  );
};

export default TrendsTab;
