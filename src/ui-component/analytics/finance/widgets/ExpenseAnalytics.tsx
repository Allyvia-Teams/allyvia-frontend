import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { Grid, useTheme } from '@mui/material';
import MainCard from '../../../cards/MainCard';
import Chart from 'react-apexcharts';
import AllyviaEmpty from '../../../common/AllyviaEmpty';
import { ExpenseBreakdown } from '../charts';
import { ExpenseKPIs } from '../kpis';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const ExpenseAnalytics: React.FC = () => {
  const theme = useTheme();
  const { expenseBreakdown, topExpenses, expenseTrend } = useSelector((state: RootState) => (state as any).finance);

  const loading = useSelector((state: RootState) => (state as any).finance.loading.expenseSummary);

  // Expense Categories Data now handled by ExpenseBreakdown component

  // Expense Trends Data - handle new daily structure
  const trendData = Array.isArray(expenseTrend) ? expenseTrend : [];
  const trendCategories = trendData.map((t: any) => t.date);
  const trendSeries = trendData.map((t: any) => Number(t.amount || 0));

  // Expenses by Type Data (from consolidated breakdown API)
  const typeData = expenseBreakdown?.by_type || [];
  const typeLabels = typeData.map((t: any) => t.type);
  const typeSeries = typeData.map((t: any) => Number(t.total || 0));

  // Top Expenses List
  const topExpensesList = topExpenses || [];

  return (
    <Grid container spacing={3}>
      {/* Expense KPIs */}
      <Grid size={{ xs: 12 }}>
        <ExpenseKPIs />
      </Grid>

      {/* Expense Breakdown Donut Chart */}
      <Grid size={{ xs: 12, md: 6 }}>
        <ExpenseBreakdown />
      </Grid>

      {/* Expense Trends */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Expense Trends">
            <Chart
              options={{
                chart: { type: 'line', height: 350 },
                xaxis: {
                  categories: trendCategories.length ? trendCategories : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
                },
                stroke: { curve: 'smooth', width: 3 },
                dataLabels: { enabled: false },
                legend: { position: 'top' }
              }}
              series={[
                {
                  name: 'Monthly Expenses',
                  data: trendSeries.length ? trendSeries : [45000, 48000, 42000, 51000, 47000, 49000]
                }
              ]}
              type="line"
              height={350}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>

      {/* Top Expenses List */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="list"
          skeletonType="list"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Top Expenses">
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {topExpensesList.length > 0 ? (
                topExpensesList.slice(0, 10).map((expense: any, index: number) => (
                  <div
                    key={expense.id || index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: index < 9 ? `1px solid ${theme.palette.divider}` : 'none'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'medium', fontSize: '14px' }}>
                        {expense.description || expense.category || `Expense ${index + 1}`}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.palette.text.secondary }}>{expense.category || 'Uncategorized'}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: theme.palette.error.main }}>{fmtMoney(expense.amount || 0)}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: theme.palette.text.secondary, padding: '20px' }}>No expense data available</div>
              )}
            </div>
          </MainCard>
        </AllyviaEmpty>
      </Grid>

      {/* Expenses by Type */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Expenses by Type">
            <Chart
              options={{
                chart: { type: 'bar', height: 350 },
                xaxis: {
                  categories: typeLabels.length ? typeLabels : ['Business', 'Personal', 'Travel', 'Office']
                },
                plotOptions: {
                  bar: { horizontal: true }
                },
                dataLabels: { enabled: false }
              }}
              series={[
                {
                  name: 'Amount',
                  data: typeSeries.length ? typeSeries : [25000, 15000, 12000, 8000]
                }
              ]}
              type="bar"
              height={350}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>
    </Grid>
  );
};

export default ExpenseAnalytics;
