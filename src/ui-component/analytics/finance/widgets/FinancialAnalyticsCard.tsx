import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { Grid, FormControl, Select, MenuItem, InputLabel, Box } from '@mui/material';
import MainCard from '../../../cards/MainCard';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import AllyviaStats from '../../../common/AllyviaStats';
import AllyviaEmpty from '../../../common/AllyviaEmpty';
import { ExpenseKPIs } from '../kpis';
import { donutRows, emptyDonutMessage } from './financialAnalyticsCardView';

const fmtMoney = (n: number | string) => {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
};

const FinancialAnalyticsCard: React.FC = () => {
  const [analyticsType, setAnalyticsType] = useState<'expense' | 'invoice' | 'payment'>('expense');

  const { expenseBreakdown, topExpenses, invoiceStatistics, invoiceList, paymentSummary, paymentSplit, paymentStatistics, paymentTrend } =
    useSelector((state: RootState) => (state as any).finance);

  const loading = useSelector((state: RootState) => (state as any).finance.loading);

  // Get data based on selected type
  const getAnalyticsData = () => {
    switch (analyticsType) {
      case 'expense':
        return {
          title: 'Expense Analytics',
          kpis: [], // Will be replaced with ExpenseKPIs component
          chartTitle: 'Expense Categories',
          chartColors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
          rightComponent: 'TopExpenses'
        };

      case 'invoice':
        return {
          title: 'Invoice Analytics',
          kpis: [
            {
              title: 'Total Invoices',
              value: invoiceStatistics?.total_invoices || 0,
              theme: 'default' as const,
              loading: loading.invoiceStatistics
            },
            {
              title: 'Total Amount',
              value: fmtMoney(invoiceStatistics?.total_amount || 0),
              theme: 'success' as const,
              loading: loading.invoiceStatistics
            },
            {
              title: 'Outstanding Balance',
              value: fmtMoney(invoiceStatistics?.outstanding_balance || 0),
              theme: 'warning' as const,
              loading: loading.invoiceStatistics
            },
            {
              title: 'Overdue Count',
              value: invoiceStatistics?.overdue_count || 0,
              theme: 'alert' as const,
              loading: loading.invoiceStatistics
            }
          ],
          chartTitle: 'Invoice Distribution',
          chartColors: ['#00C853', '#FF9800', '#F44336'],
          rightComponent: 'TopInvoices'
        };

      case 'payment':
        return {
          title: 'Payment Analytics',
          kpis: [
            {
              title: 'Total Payments',
              value: fmtMoney(paymentSummary?.total_payments || paymentStatistics?.total_amount || 0),
              theme: 'success' as const,
              loading: loading.paymentSummary || loading.paymentStatistics
            },
            {
              title: 'Payment Count',
              value: paymentSummary?.payment_count || paymentStatistics?.total_count || 0,
              theme: 'default' as const,
              loading: loading.paymentSummary || loading.paymentStatistics
            },
            {
              title: 'Average Payment',
              value: fmtMoney(paymentSummary?.average_payment || paymentStatistics?.average_amount || 0),
              theme: 'default' as const,
              loading: loading.paymentSummary || loading.paymentStatistics
            },
            {
              title: 'Success Rate',
              value: `${paymentSummary?.success_rate || paymentStatistics?.success_rate || 0}%`,
              theme:
                (paymentSummary?.success_rate || paymentStatistics?.success_rate || 0) >= 95 ? ('success' as const) : ('warning' as const),
              loading: loading.paymentSummary || loading.paymentStatistics
            }
          ],
          chartTitle: 'Payment Methods Distribution',
          chartColors: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0'],
          rightComponent: 'PaymentTrends'
        };

      default:
        return {
          title: '',
          kpis: [],
          chartTitle: '',
          chartColors: [],
          rightComponent: ''
        };
    }
  };

  const analyticsData = getAnalyticsData();

  // One normalized row list per mode: label, numeric value, and the tooltip
  // text. Each mode's payload shape (and its field-name mismatches) is handled
  // in financialAnalyticsCardView, which is unit-tested (ALL-140 H2/M1/M2).
  const rows = React.useMemo(
    () => donutRows(analyticsType, { expenseBreakdown, invoiceStatistics, paymentSplit }),
    [analyticsType, expenseBreakdown, invoiceStatistics, paymentSplit]
  );

  const chartLabels = React.useMemo(() => rows.map((r) => r.label), [rows]);
  const chartSeries = React.useMemo(() => rows.map((r) => r.value), [rows]);

  const chartOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: chartLabels,
    colors: analyticsData.chartColors,
    legend: { position: 'bottom' },
    dataLabels: {
      enabled: true,
      formatter: function (val: string) {
        return parseFloat(val).toFixed(1) + '%';
      }
    },
    tooltip: {
      y: {
        formatter: (_val: number, { seriesIndex }: { seriesIndex: number }) => rows[seriesIndex]?.tooltip ?? ''
      }
    }
  };

  // Right side component based on type
  const renderRightComponent = () => {
    switch (analyticsData.rightComponent) {
      case 'TopExpenses':
        return (
          <AllyviaEmpty
            isLoading={loading.topExpenses}
            isEmpty={false}
            type="chart"
            skeletonType="chart"
            height={0}
            width="100%"
            sx={{ p: 0, height: 'auto' }}
          >
            <Box>
              <h3>Top Expenses</h3>
              {topExpenses && topExpenses.length > 0 ? (
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {topExpenses.slice(0, 10).map((expense: any, index: number) => (
                    <Box
                      key={index}
                      sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Box>
                        <Box sx={{ fontWeight: 'bold' }}>{expense.expense_name || expense.description || `Expense ${index + 1}`}</Box>
                        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{expense.category || 'Uncategorized'}</Box>
                      </Box>
                      <Box sx={{ fontWeight: 'bold', color: 'error.main' }}>{fmtMoney(expense.amount || 0)}</Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No expense data available</Box>
              )}
            </Box>
          </AllyviaEmpty>
        );

      case 'OverduePending':
        return (
          <AllyviaEmpty
            isLoading={loading.invoiceList}
            isEmpty={false}
            type="chart"
            skeletonType="chart"
            height={0}
            width="100%"
            sx={{ p: 0, height: 'auto' }}
          >
            <Box>
              <h3>Overdue & Pending Invoices</h3>
              {invoiceList?.items && invoiceList.items.length > 0 ? (
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {invoiceList.items
                    .filter(
                      (invoice: any) =>
                        invoice.status?.toLowerCase() === 'overdue' ||
                        invoice.status?.toLowerCase() === 'pending' ||
                        invoice.status?.toLowerCase() === 'unpaid'
                    )
                    .slice(0, 10)
                    .map((invoice: any, index: number) => (
                      <Box
                        key={index}
                        sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}
                      >
                        <Box>
                          <Box sx={{ fontWeight: 'bold' }}>{invoice.customer_name || `Invoice ${index + 1}`}</Box>
                          <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Due: {invoice.due_date || 'N/A'}</Box>
                        </Box>
                        <Box sx={{ fontWeight: 'bold', color: 'warning.main' }}>{fmtMoney(invoice.total_amount || 0)}</Box>
                      </Box>
                    ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No overdue or pending invoices</Box>
              )}
            </Box>
          </AllyviaEmpty>
        );

      case 'TopInvoices':
        return (
          <AllyviaEmpty
            isLoading={loading.invoiceStatistics}
            isEmpty={!invoiceStatistics?.top_invoices || invoiceStatistics.top_invoices.length === 0}
            type="chart"
            skeletonType="chart"
            height={0}
            width="100%"
            sx={{ p: 0, height: 'auto' }}
          >
            <Box>
              <h3>Top Overdue Invoices</h3>
              {invoiceStatistics?.top_invoices && invoiceStatistics.top_invoices.length > 0 ? (
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {invoiceStatistics.top_invoices.slice(0, 10).map((inv: any, idx: number) => (
                    <Box
                      key={inv.id || idx}
                      sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Box>
                        <Box sx={{ fontWeight: 'bold' }}>{inv.customer_name || `Invoice ${idx + 1}`}</Box>
                        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{inv.doc_number || inv.qb_id || '—'}</Box>
                      </Box>
                      <Box sx={{ fontWeight: 'bold', color: 'primary.main' }}>{fmtMoney(inv.total_amount || 0)}</Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No top invoices available</Box>
              )}
            </Box>
          </AllyviaEmpty>
        );

      case 'PaymentTrends':
        return (
          <AllyviaEmpty
            isLoading={loading.paymentTrend}
            isEmpty={false}
            type="chart"
            skeletonType="chart"
            height={0}
            width="100%"
            sx={{ p: 0, height: 'auto' }}
          >
            <Box>
              <h3>Payment Trends</h3>
              {paymentTrend && paymentTrend.length > 0 ? (
                <Chart
                  options={{
                    chart: { type: 'line', height: 300 },
                    xaxis: {
                      categories: paymentTrend.map((p: any) => p.date).slice(-7) // Last 7 days
                    },
                    stroke: { curve: 'smooth', width: 3 },
                    dataLabels: { enabled: false },
                    legend: { position: 'top' },
                    colors: ['#2196F3']
                  }}
                  series={[
                    {
                      name: 'Daily Payments',
                      data: paymentTrend.map((p: any) => Number(p.total_amount || 0)).slice(-7)
                    }
                  ]}
                  type="line"
                  height={300}
                />
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No payment trend data available</Box>
              )}
            </Box>
          </AllyviaEmpty>
        );

      default:
        return null;
    }
  };

  return (
    <MainCard
      title={analyticsData.title}
      secondary={
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Analytics</InputLabel>
          <Select
            value={analyticsType}
            label="Analytics"
            onChange={(e) => setAnalyticsType(e.target.value as 'expense' | 'invoice' | 'payment')}
          >
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="invoice">Invoice</MenuItem>
            <MenuItem value="payment">Payment</MenuItem>
          </Select>
        </FormControl>
      }
    >
      <Grid container spacing={3}>
        {/* KPIs */}
        <Grid size={{ xs: 12 }}>
          {analyticsType === 'expense' ? (
            <ExpenseKPIs />
          ) : (
            <Grid container spacing={3}>
              {analyticsData.kpis.map((kpi, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                  <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>

        {/* Chart and Right Component - Side by Side */}
        <Grid size={{ xs: 12, md: 6 }}>
          <AllyviaEmpty
            isLoading={
              loading[analyticsType === 'expense' ? 'expenseBreakdown' : analyticsType === 'invoice' ? 'invoiceStatistics' : 'paymentSplit']
            }
            isEmpty={rows.length === 0}
            description={emptyDonutMessage(analyticsType)}
            type="chart"
            skeletonType="chart"
            height={350}
            width="100%"
            sx={{ p: 0, height: 'auto' }}
          >
            <Chart options={chartOptions} series={chartSeries} type="donut" height={350} />
          </AllyviaEmpty>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>{renderRightComponent()}</Grid>
      </Grid>
    </MainCard>
  );
};

export default FinancialAnalyticsCard;
