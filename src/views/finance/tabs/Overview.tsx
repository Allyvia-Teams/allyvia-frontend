import React, { useMemo } from 'react';
import { Grid, Box, Typography, CircularProgress, Alert, Chip } from '@mui/material';

import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';

import type { InvoiceRow, CategoryAmount } from 'types/finance';

// Chart imports
import Chart from 'react-apexcharts';
import FinancialTrendsChart from 'ui-component/finance/charts/FinancialTrendsChart';
import { ApexOptions } from 'apexcharts';

// Redux
import { useSelector } from 'store';
import type { RootState } from 'store';

// Data comes from Redux slice populated by parent page

const OverviewTab: React.FC = () => {
  const {
    loading: loadingState,
    errors,
    financeKPIs,
    profitAndLoss: pnlSummary,
    invoiceStatistics,
    invoiceList,
    expenseSummary,
    expenseBreakdown,
    paymentSummary,
    paymentSplit,
    invoiceAging,
    revenueSeries,
    expenseTrend,
    accountSummary
  } = useSelector((state: RootState) => state.finance);

  const isLoading = useMemo(
    () =>
      loadingState.financeKPIs ||
      loadingState.profitAndLoss ||
      loadingState.invoiceStatistics ||
      loadingState.topExpenses ||
      loadingState.paymentSummary ||
      loadingState.accountSummary ||
      loadingState.paymentSplit ||
      loadingState.expenseBreakdown ||
      loadingState.invoiceAging ||
      loadingState.revenueSeries,
    [loadingState]
  );

  const error =
    errors.financeKPIs ||
    errors.profitAndLoss ||
    errors.invoiceStatistics ||
    errors.topExpenses ||
    errors.paymentSummary ||
    errors.accountSummary ||
    errors.paymentSplit ||
    errors.expenseBreakdown ||
    errors.invoiceAging ||
    errors.revenueSeries;

  const invoices: InvoiceRow[] = useMemo(() => (Array.isArray(invoiceList) ? invoiceList : []), [invoiceList]);
  const expenseCategories: CategoryAmount[] = useMemo(() => {
    // Use new expenseBreakdown data if available
    if (expenseBreakdown?.by_category && Array.isArray(expenseBreakdown.by_category)) {
      return expenseBreakdown.by_category.map((item: any) => ({
        category: item.category_name,
        amount: parseFloat(item.total || '0')
      }));
    }
    return [];
  }, [expenseBreakdown]);

  // Payment methods data for donut chart
  const paymentMethodsData = useMemo(() => {
    if (paymentSplit?.payment_methods && Array.isArray(paymentSplit.payment_methods)) {
      return paymentSplit.payment_methods.map((item: any) => ({ x: item.method, y: item.amount }));
    }
    return [];
  }, [paymentSplit]);

  // Invoice aging data for bar chart
  const invoiceAgingData = useMemo(() => {
    if (invoiceAging?.aging_summary && Array.isArray(invoiceAging.aging_summary)) {
      return invoiceAging.aging_summary.map((item: any) => ({ x: item.period, y: item.amount }));
    }
    return [];
  }, [invoiceAging]);

  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Helper function to determine theme based on value
  const getTheme = (value: number, isMoneyMaking = false, isNegative = false): 'alert' | 'success' | 'default' | 'warning' | 'gold' => {
    if (value === 0) return 'default';
    if (isMoneyMaking) return value > 0 ? 'success' : 'alert';
    if (isNegative) return value > 0 ? 'alert' : 'default';
    return 'default';
  };

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
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
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      }
    },
    dataLabels: { enabled: false },
    grid: { show: true },
    colors: ['#2196F3', '#FF9800', '#4CAF50', '#F44336', '#9C27B0'],
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      markers: { size: 8 }
    }
  };

  // KPI configs for concise rendering
  const primaryKpis = [
    {
      title: 'Total Revenue',
      value: financeKPIs ? fmtMoney(financeKPIs.summary.totalRevenue) : pnlSummary ? fmtMoney(pnlSummary.total_income) : fmtMoney(0),
      theme: 'default' as const,
      loading: loadingState.financeKPIs
    },
    {
      title: 'Net Income',
      value: financeKPIs ? fmtMoney(financeKPIs.summary.net) : pnlSummary ? fmtMoney(pnlSummary.net_income) : fmtMoney(0),
      theme: getTheme(financeKPIs?.summary?.net ?? pnlSummary?.net_income ?? 0, true),
      loading: loadingState.financeKPIs
    },
    {
      title: 'Gross Profit',
      value: pnlSummary ? fmtMoney(pnlSummary.gross_profit) : fmtMoney(0),
      theme: 'default' as const,
      loading: loadingState.profitAndLoss
    },
    {
      title: 'Cash Balance',
      value: financeKPIs
        ? fmtMoney(financeKPIs.kpis.cash_balance)
        : accountSummary
          ? fmtMoney(accountSummary.total_balance || 0)
          : fmtMoney(0),
      theme: 'default' as const,
      loading: loadingState.financeKPIs
    }
  ];

  const secondaryKpis = [
    {
      title: 'A/R Outstanding',
      value: invoiceStatistics ? fmtMoney(invoiceStatistics.outstanding_balance || 0) : fmtMoney(0),
      theme: getTheme(invoiceStatistics?.outstanding_balance || 0),
      loading: loadingState.invoiceStatistics
    },
    {
      title: 'A/P Outstanding',
      value: expenseSummary ? fmtMoney(expenseSummary.unpaid_amount || 0) : fmtMoney(0),
      theme: getTheme(expenseSummary?.unpaid_amount || 0),
      loading: loadingState.expenseSummary
    },
    {
      title: 'Working Capital',
      value: accountSummary ? fmtMoney(accountSummary.total_balance || 0) : fmtMoney(0),
      theme: getTheme(accountSummary?.total_balance || 0),
      loading: loadingState.accountSummary
    }
  ];

  const ratioKpis = financeKPIs
    ? [
        {
          title: 'Gross Profit Margin',
          value: `${financeKPIs.ratios.gross_profit_margin.toFixed(1)}%`,
          theme: 'success' as const,
          loading: loadingState.financeKPIs
        },
        {
          title: 'Net Profit Margin',
          value: `${financeKPIs.ratios.net_profit_margin.toFixed(1)}%`,
          theme: financeKPIs.ratios.net_profit_margin < 0 ? ('alert' as const) : ('success' as const),
          loading: loadingState.financeKPIs
        },
        {
          title: 'Current Ratio',
          value: financeKPIs.ratios.current_ratio.toFixed(2),
          theme: financeKPIs.ratios.current_ratio < 1 ? ('alert' as const) : ('default' as const),
          loading: loadingState.financeKPIs
        }
      ]
    : [];

  // Mid-level KPIs between charts
  const midKpis = [
    {
      title: 'Total Invoices',
      value: invoiceStatistics ? invoiceStatistics.total_invoices || 0 : 0,
      theme: 'default' as const,
      loading: loadingState.invoiceStatistics
    },
    {
      title: 'Total Expenses',
      value: fmtMoney(expenseSummary ? expenseSummary.total_expenses || 0 : 0),
      theme: 'default' as const,
      loading: loadingState.expenseSummary
    },
    {
      title: 'Cash Position',
      value: fmtMoney(accountSummary ? accountSummary.total_balance || 0 : 0),
      theme: 'default' as const,
      loading: loadingState.accountSummary
    },
    {
      title: 'Net Cash Flow',
      value: fmtMoney(paymentSummary ? Number(paymentSummary.total_payments) || 0 : 0),
      theme: 'default' as const,
      loading: loadingState.paymentSummary
    }
  ];

  const expenseCategoryData = Array.isArray(expenseCategories)
    ? expenseCategories.map((item: any) => ({ x: item.category, y: item.amount }))
    : [];

  const invoiceStatusData = invoiceStatistics
    ? [
        { x: 'Paid', y: invoiceStatistics.invoices_by_status?.paid || 0 },
        { x: 'Pending', y: invoiceStatistics.invoices_by_status?.pending || 0 },
        { x: 'Overdue', y: invoiceStatistics.invoices_by_status?.overdue || 0 }
      ]
    : [];

  if (isLoading) {
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
      {/* Primary KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {primaryKpis.map((kpi) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.title}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      {/* Secondary KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {secondaryKpis.map((kpi) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.title}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      {/* Financial Ratios */}
      {ratioKpis.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {ratioKpis.map((kpi) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={kpi.title}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Combined Revenue vs Expenses */}
      <Box sx={{ mb: 4 }}>
        <FinancialTrendsChart revenue={Array.isArray(revenueSeries) ? (revenueSeries as any) : []} expenses={expenseTrend || []} />
      </Box>

      {/* High-level Stats Between Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {midKpis.map((kpi) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.title}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
          </Grid>
        ))}
      </Grid>

      {/* Invoice Status Overview */}
      <MainCard title="Invoice Status Overview" sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          {/* Left: Invoice Status Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Status Breakdown
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {invoiceStatusData.map((status, index) => (
                  <Box
                    key={status.x}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: chartOptions.colors?.[index] || '#2196F3'
                        }}
                      />
                      <Typography variant="body2" fontWeight="medium">
                        {status.x}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                      {status.y}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Right: Overdue and Pending Invoices List */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Overdue & Pending Invoices
              </Typography>
              <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                {(() => {
                  const overdue = Array.isArray(invoices) ? invoices.filter((inv) => inv.status === 'overdue') : [];
                  const pending = Array.isArray(invoices) ? invoices.filter((inv) => inv.status === 'pending') : [];
                  const combined = [...overdue, ...pending].slice(0, 10);

                  if (combined.length === 0) {
                    return (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          ✅ All invoices are up to date
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          No overdue or pending invoices
                        </Typography>
                      </Box>
                    );
                  }

                  return combined.map((inv: any, index: number) => (
                    <Box
                      key={inv.id || index}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                        p: 2,
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': { bgcolor: 'action.hover', transform: 'translateX(4px)' }
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {inv.customer || inv.client || inv.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Due: {inv.due_date || inv.dueDate || '—'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight="bold" color={inv.status === 'overdue' ? 'error.main' : 'warning.main'}>
                          {fmtMoney(inv.amount || inv.balance || 0)}
                        </Typography>
                        <Chip
                          label={(inv.status || '').toUpperCase()}
                          size="small"
                          color={inv.status === 'overdue' ? 'warning' : 'info'}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  ));
                })()}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </MainCard>

      {/* Expense Breakdown by Category */}
      {Array.isArray(expenseCategories) && expenseCategories.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Left: Expense Categories Pie */}
          <Grid size={{ xs: 12, md: 6 }}>
            <MainCard title="Expense Categories Distribution">
              <Chart
                options={{
                  ...chartOptions,
                  labels: expenseCategoryData.map((item: any) => item.x),
                  plotOptions: {
                    bar: {
                      horizontal: false,
                      columnWidth: '55%',
                      dataLabels: {
                        position: 'top'
                      }
                    }
                  },
                  legend: {
                    position: 'bottom',
                    fontSize: '11px',
                    markers: { size: 6 }
                  },
                  tooltip: {
                    y: {
                      formatter: (value: any) => {
                        const percentage = ((value / expenseCategoryData.reduce((sum, item) => sum + item.y, 0)) * 100).toFixed(1);
                        return `${fmtMoney(value)} (${percentage}%)`;
                      }
                    }
                  }
                }}
                series={expenseCategoryData.map((item: any) => item.y)}
                type="pie"
                height={350}
              />
            </MainCard>
          </Grid>

          {/* Right: Top Expense Categories Summary */}
          <Grid size={{ xs: 12, md: 6 }}>
            <MainCard title="Top Expense Categories">
              <Box sx={{ p: 2, maxHeight: 350, overflowY: 'auto' }}>
                {Array.isArray(expenseCategories)
                  ? [...expenseCategories]
                      .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
                      .slice(0, 8)
                      .map((category: any, index: number) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 2,
                            p: 2,
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': { bgcolor: 'action.hover', transform: 'translateX(4px)' }
                          }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {category.category}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(category.percentage ?? 0).toFixed(1)}% of total
                            </Typography>
                          </Box>
                          {/* Right: Amount */}
                          <Typography variant="body2" fontWeight="bold" color="primary.main">
                            {fmtMoney(category.amount || 0)}
                          </Typography>
                        </Box>
                      ))
                  : null}
              </Box>
            </MainCard>
          </Grid>
        </Grid>
      )}

      {/* Additional Analytics Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Payment Methods Donut Chart */}
        {paymentMethodsData.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <MainCard title="Payment Methods Distribution">
              <Chart
                options={{
                  ...chartOptions,
                  labels: paymentMethodsData.map((item: any) => item.x),
                  plotOptions: { pie: { donut: { size: '60%' } } },
                  legend: { position: 'bottom', fontSize: '10px', markers: { size: 6 } },
                  tooltip: {
                    y: {
                      formatter: (value: any) => {
                        const total = paymentMethodsData.reduce((sum: any, item: any) => sum + item.y, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${fmtMoney(value)} (${percentage}%)`;
                      }
                    }
                  }
                }}
                series={paymentMethodsData.map((item: any) => item.y)}
                type="donut"
                height={350}
              />
            </MainCard>
          </Grid>
        )}

        {/* Invoice Aging Bar Chart */}
        {invoiceAgingData.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <MainCard title="Invoice Aging Analysis">
              <Chart
                options={{
                  ...chartOptions,
                  xaxis: {
                    categories: invoiceAgingData.map((item: any) => item.x),
                    title: { text: 'Aging Period' }
                  },
                  yaxis: {
                    title: { text: 'Amount ($)' },
                    labels: {
                      formatter: (value: any) => fmtMoney(value)
                    }
                  },
                  plotOptions: {
                    bar: {
                      horizontal: false,
                      columnWidth: '55%',
                      dataLabels: {
                        position: 'top'
                      }
                    }
                  },
                  colors: ['#FF9800', '#F44336', '#E91E63', '#9C27B0']
                }}
                series={[
                  {
                    name: 'Outstanding Amount',
                    data: invoiceAgingData.map((item: any) => item.y)
                  }
                ]}
                type="bar"
                height={350}
              />
            </MainCard>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default OverviewTab;
