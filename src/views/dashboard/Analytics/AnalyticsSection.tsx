import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBucketValueByLabel } from './analyticsBuckets';

// material-ui
import Grid from '@mui/material/Grid';
import {
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';

// Redux
import { AppDispatch, RootState } from 'store';
import {
  fetchInvoiceAgingAsync,
  fetchBudgetByCategoryAsync,
  fetchPayablesByDueDateAsync,
  fetchExpenseBreakdown,
  fetchAnalyticsSummary,
  fetchRevenueSeries,
  fetchBalanceSheet,
  fetchCashFlow
} from 'store/slices/finance';
import { AnalyticsAPI } from 'api/analytics.api';
import { DashboardRange } from 'ui-component/common/DashboardRangeSelector';
import { formatPercent, marginOf } from 'utils/financeFormat';
import { getDateRangeFromRange, getEfficiencyDaysFromRange } from 'utils/dashboardRange';
import { useIsAdmin } from 'hooks/usePermission';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnalyticsChart from './AnalyticsChart';
import { ChartSelectDropdown } from './ChartSelectDropdown';

interface ChartData {
  name: string;
  data: number[];
  secondarySeries?: number[];
  xAxis: string[];
  chartType: 'column' | 'line' | 'area';
  description: string;
}

interface DashboardSummaryProps {
  range: DashboardRange;
}

const readSummaryNumber = (summary: any, snakeKey: string, camelKey: string): number => {
  const value = summary?.[snakeKey] ?? summary?.[camelKey];
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) : Number(value) || 0;
};

export const AnalyticsSection = ({ range }: DashboardSummaryProps) => {
  const dispatch = useDispatch<AppDispatch>();

  // AR aging (/invoice/aging/) is admin-only on the backend; non-admins get a 403.
  // Gate the fetch + rendering on admin so they see a clean section (no 403-driven
  // error banner and no empty "AR Overdue / No data" card) rather than a broken one.
  const isAdmin = useIsAdmin();

  // Redux selectors
  const invoiceAging = useSelector((state: RootState) => state.finance.invoiceAging);
  const payablesByDueDate = useSelector((state: RootState) => state.finance.payablesByDueDate);
  const budgetsByCategory = useSelector((state: RootState) => state.finance.budgetsByCategory);
  const expenseBreakdown = useSelector((state: RootState) => state.finance.expenseBreakdown);
  const analyticsSummary = useSelector((state: RootState) => state.finance.analyticsSummary);
  const revenueSeries = useSelector((state: RootState) => state.finance.revenueSeries);
  const balanceSheet = useSelector((state: RootState) => state.finance.balanceSheet);
  const cashFlow = useSelector((state: RootState) => state.finance.cashFlow);

  // Loading states
  // fetchInvoiceAgingAsync writes loading.invoiceAging / errors.invoiceAging (NOT .invoices,
  // which belongs to the invoice-summary/outstanding thunks this section never dispatches).
  const isLoadingInvoices = useSelector((state: RootState) => state.finance.loading.invoiceAging);
  const isLoadingPayables = useSelector((state: RootState) => state.finance.loading.payables);
  const isLoadingBudgets = useSelector((state: RootState) => state.finance.loading.budgets);
  const isLoadingExpenses = useSelector((state: RootState) => state.finance.loading.expenseBreakdown);
  const isLoadingAnalytics = useSelector((state: RootState) => state.finance.loading.analyticsSummary);
  const isLoadingRevenue = useSelector((state: RootState) => state.finance.loading.revenueSeries);
  const isLoadingBalanceSheet = useSelector((state: RootState) => state.finance.loading.balanceSheet);
  const isLoadingCashFlow = useSelector((state: RootState) => state.finance.loading.cashFlow);

  // Error states
  const invoiceErrors = useSelector((state: RootState) => state.finance.errors.invoiceAging);
  const payablesErrors = useSelector((state: RootState) => state.finance.errors.payables);
  const budgetsErrors = useSelector((state: RootState) => state.finance.errors.budgets);
  const expenseErrors = useSelector((state: RootState) => state.finance.errors.expenseBreakdown);
  const analyticsErrors = useSelector((state: RootState) => state.finance.errors.analyticsSummary);
  const revenueErrors = useSelector((state: RootState) => state.finance.errors.revenueSeries);
  const balanceSheetErrors = useSelector((state: RootState) => state.finance.errors.balanceSheet);
  const cashFlowErrors = useSelector((state: RootState) => state.finance.errors.cashFlow);

  // Local state for additional data
  const [inventorySummary, setInventorySummary] = useState<any>(null);
  const [inventoryEfficiency, setInventoryEfficiency] = useState<any>(null);
  const [employeeAnalytics, setEmployeeAnalytics] = useState<any>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoadingInventoryEfficiency, setIsLoadingInventoryEfficiency] = useState(false);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);

  const [displayedChart, setDisplayedChart] = useState<ChartData | null>(null);
  const [selectedChartName, setSelectedChartName] = useState<string | null>(null);
  const [allAvailableCharts, setAllAvailableCharts] = useState<ChartData[]>([]);
  const [chartDataReady, setChartDataReady] = useState(false);
  const [efficiencyDialogOpen, setEfficiencyDialogOpen] = useState(false);

  // DEBUG: Log Redux state on mount and updates
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.log('invoiceAging:', invoiceAging);
    console.log('payablesByDueDate:', payablesByDueDate);
    console.log('budgetsByCategory:', budgetsByCategory);
    console.log('expenseBreakdown:', expenseBreakdown);
    console.log('analyticsSummary:', analyticsSummary);
    console.log('revenueSeries:', revenueSeries);
    console.log('inventorySummary:', inventorySummary);
    console.log('employeeAnalytics:', employeeAnalytics);
    console.log('balanceSheet:', balanceSheet);
    console.log('cashFlow:', cashFlow);
    console.log(
      'Loading - Invoices:',
      isLoadingInvoices,
      'Payables:',
      isLoadingPayables,
      'Budgets:',
      isLoadingBudgets,
      'Expenses:',
      isLoadingExpenses,
      'Analytics:',
      isLoadingAnalytics,
      'Revenue:',
      isLoadingRevenue,
      'BalanceSheet:',
      isLoadingBalanceSheet,
      'CashFlow:',
      isLoadingCashFlow
    );
    console.log(
      'Errors - Invoices:',
      invoiceErrors,
      'Payables:',
      payablesErrors,
      'Budgets:',
      budgetsErrors,
      'Expenses:',
      expenseErrors,
      'Analytics:',
      analyticsErrors,
      'Revenue:',
      revenueErrors,
      'BalanceSheet:',
      balanceSheetErrors,
      'CashFlow:',
      cashFlowErrors
    );
  }, [
    invoiceAging,
    payablesByDueDate,
    budgetsByCategory,
    expenseBreakdown,
    analyticsSummary,
    revenueSeries,
    inventorySummary,
    employeeAnalytics,
    balanceSheet,
    cashFlow,
    isLoadingInvoices,
    isLoadingPayables,
    isLoadingBudgets,
    isLoadingExpenses,
    isLoadingAnalytics,
    isLoadingRevenue,
    isLoadingBalanceSheet,
    isLoadingCashFlow,
    invoiceErrors,
    payablesErrors,
    budgetsErrors,
    expenseErrors,
    analyticsErrors,
    revenueErrors,
    balanceSheetErrors,
    cashFlowErrors
  ]);

  // Fetch data when range changes
  useEffect(() => {
    const { startDate, endDate } = getDateRangeFromRange(range);
    const efficiencyDays = getEfficiencyDaysFromRange(range);

    if (isAdmin) {
      dispatch(fetchInvoiceAgingAsync());
    }
    dispatch(fetchPayablesByDueDateAsync({ startDate, endDate }));
    dispatch(fetchBudgetByCategoryAsync({ startDate, endDate }));
    dispatch(fetchExpenseBreakdown({ startDate, endDate }) as any);
    dispatch(fetchAnalyticsSummary({ startDate, endDate }));
    dispatch(fetchRevenueSeries({ startDate, endDate }));

    setIsLoadingInventory(true);
    AnalyticsAPI.Inventory.getOverview('summary')
      .then((data) => {
        setInventorySummary(data.summary ?? data);
        setIsLoadingInventory(false);
      })
      .catch((error) => {
        console.error('Failed to fetch inventory summary:', error);
        setIsLoadingInventory(false);
      });

    setIsLoadingInventoryEfficiency(true);
    import('api/inventory.api').then(({ getInventoryEfficiency }) => {
      getInventoryEfficiency({ days: efficiencyDays })
        .then((data) => {
          setInventoryEfficiency(data);
          setIsLoadingInventoryEfficiency(false);
        })
        .catch((error) => {
          console.error('Failed to fetch inventory efficiency:', error);
          setIsLoadingInventoryEfficiency(false);
        });
    });

    setIsLoadingEmployee(true);
    AnalyticsAPI.Employee.getDailyBreakdown({ start_date: startDate, end_date: endDate })
      .then((data) => {
        setEmployeeAnalytics(data);
        setIsLoadingEmployee(false);
      })
      .catch((error) => {
        console.error('Failed to fetch employee analytics:', error);
        setIsLoadingEmployee(false);
      });

    dispatch(fetchBalanceSheet({ asOfDate: endDate }));
    dispatch(fetchCashFlow({ startDate, endDate }));
  }, [dispatch, range, isAdmin]);

  // Build chart data from Redux state
  useEffect(() => {
    const charts: ChartData[] = [];

    // 1. Accounts Receivable Aging Chart
    if (invoiceAging && invoiceAging.aging_summary) {
      const summary = invoiceAging.aging_summary;
      const agingBuckets = ['Current', '31-60 Days', '61-90 Days', 'Over 90 Days'];
      const agingAmounts = [summary.current || 0, summary.days_31_60 || 0, summary.days_61_90 || 0, summary.over_90 || 0];

      charts.push({
        name: 'Accounts Receivable Aging',
        data: agingAmounts,
        xAxis: agingBuckets,
        chartType: 'column',
        description: 'Outstanding invoices by age bracket'
      });
    }

    // 2. Accounts Payable Summary Chart
    if (payablesByDueDate && payablesByDueDate.length > 0) {
      const apLabels = payablesByDueDate.map((p) => p.label);
      const apAmounts = payablesByDueDate.map((p) => p.amount);

      charts.push({
        name: 'Accounts Payable Summary',
        data: apAmounts,
        xAxis: apLabels,
        chartType: 'column',
        description: 'Upcoming payment obligations'
      });
    }

    // 3. Budget vs Actual Chart
    if (budgetsByCategory && budgetsByCategory.length > 0) {
      const categories = budgetsByCategory.map((cat) => cat.category);
      const budgetAmounts = budgetsByCategory.map((cat) => cat.amount);

      // Get actual spending from expense breakdown
      let actualAmounts: number[] = [];
      if (expenseBreakdown && expenseBreakdown.by_category && expenseBreakdown.by_category.length > 0) {
        // Match expense categories with budget categories
        actualAmounts = categories.map((category) => {
          const expenseItem = expenseBreakdown.by_category.find((exp: any) => exp.category_name?.toLowerCase() === category.toLowerCase());
          return expenseItem ? parseFloat(expenseItem.total || '0') : 0;
        });
      } else {
        // If no expense data, show only budget (no actual series)
        actualAmounts = [];
      }

      charts.push({
        name: 'Budget vs Actual',
        data: budgetAmounts,
        secondarySeries: actualAmounts.length > 0 ? actualAmounts : undefined,
        xAxis: categories,
        chartType: 'column',
        description: 'Planned budgets vs actual spending by category'
      });
    }

    // 4. Revenue vs Expenses Chart
    if (revenueSeries && revenueSeries.length > 0 && expenseBreakdown) {
      // Get revenue data from series
      const revenueData = revenueSeries.map((point: any) => parseFloat(point.amount || '0'));
      const dates = revenueSeries.map((point: any) => {
        const date = new Date(point.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      });

      // For expenses, we'll use the total from expense breakdown
      // If we have daily expense data, use it; otherwise distribute total evenly
      const totalExpenses = expenseBreakdown.by_category?.reduce((sum: number, cat: any) => sum + parseFloat(cat.total || '0'), 0) || 0;
      const avgDailyExpense = totalExpenses / (dates.length || 1);
      const expenseData = dates.map(() => avgDailyExpense);

      charts.push({
        name: 'Revenue vs Expenses',
        data: revenueData,
        secondarySeries: expenseData,
        xAxis: dates,
        chartType: 'line',
        description: 'Daily revenue compared to average daily expenses'
      });
    } else if (
      analyticsSummary &&
      (readSummaryNumber(analyticsSummary, 'total_revenue', 'totalRevenue') > 0 ||
        readSummaryNumber(analyticsSummary, 'expenses', 'expenses') > 0)
    ) {
      const revenue = readSummaryNumber(analyticsSummary, 'total_revenue', 'totalRevenue');
      const expenses = readSummaryNumber(analyticsSummary, 'expenses', 'expenses');

      charts.push({
        name: 'Revenue vs Expenses',
        data: [revenue],
        secondarySeries: [expenses],
        xAxis: ['Total'],
        chartType: 'column',
        description: 'Total revenue compared to total expenses'
      });
    }

    // 5. Inventory Turnover Chart
    if (inventorySummary && analyticsSummary) {
      const revenue = readSummaryNumber(analyticsSummary, 'total_revenue', 'totalRevenue');
      if (revenue > 0) {
        const inventoryValue = parseFloat(
          inventorySummary.total_value ?? inventorySummary.inventory_value ?? inventorySummary.total_inventory_value ?? '0'
        );

        // Calculate turnover: Revenue / Average Inventory Value
        // For simplicity, using current inventory value as average
        const turnover = inventoryValue > 0 ? revenue / inventoryValue : 0;

        // Show turnover ratio and supporting metrics
        charts.push({
          name: 'Inventory Turnover',
          data: [turnover],
          xAxis: ['Turnover Ratio'],
          chartType: 'column',
          description: `Inventory turnover: ${turnover.toFixed(2)}x (Revenue: $${revenue.toLocaleString()}, Inventory: $${inventoryValue.toLocaleString()})`
        });
      }
    }

    // 6. Labor Efficiency Chart (Revenue per Labor Hour)
    if (revenueSeries && employeeAnalytics && employeeAnalytics.daily_breakdown) {
      // Calculate total revenue
      const totalRevenue = revenueSeries.reduce((sum: number, point: any) => sum + parseFloat(point.amount || '0'), 0);

      // Calculate total labor hours from daily breakdown
      let totalHours = 0;
      employeeAnalytics.daily_breakdown.forEach((day: any) => {
        if (day.employees && Array.isArray(day.employees)) {
          day.employees.forEach((emp: any) => {
            totalHours += parseFloat(emp.hours || '0');
          });
        }
      });

      // Calculate revenue per labor hour
      const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;

      charts.push({
        name: 'Labor Efficiency',
        data: [revenuePerHour],
        xAxis: ['Revenue per Hour'],
        chartType: 'column',
        description: `Revenue per labor hour: $${revenuePerHour.toFixed(2)} (Total Revenue: $${totalRevenue.toLocaleString()}, Total Hours: ${totalHours.toFixed(1)})`
      });
    }

    setAllAvailableCharts(charts);
    // Display first available chart by default, or keep current selection if it still exists
    if (charts.length > 0) {
      if (selectedChartName) {
        // Check if selected chart still exists in new charts
        const selectedChart = charts.find((c) => c.name === selectedChartName);
        if (selectedChart) {
          setDisplayedChart(selectedChart);
        } else {
          // Selected chart no longer available, switch to first available
          setDisplayedChart(charts[0]);
          setSelectedChartName(charts[0].name);
        }
      } else {
        // No chart selected yet, show first available
        setDisplayedChart(charts[0]);
        setSelectedChartName(charts[0].name);
      }
    }
    setChartDataReady(true);
  }, [
    invoiceAging,
    payablesByDueDate,
    budgetsByCategory,
    expenseBreakdown,
    analyticsSummary,
    revenueSeries,
    inventorySummary,
    employeeAnalytics,
    isLoadingInvoices,
    isLoadingPayables,
    isLoadingBudgets,
    isLoadingAnalytics,
    isLoadingRevenue,
    isLoadingInventory,
    isLoadingEmployee,
    selectedChartName
  ]);

  const getTotal = (chartData: ChartData): number => {
    return chartData.data.reduce((sum, val) => sum + val, 0);
  };

  const handleChartChange = (name: string) => {
    const selectedChart = allAvailableCharts.find((chart) => chart.name === name);
    if (selectedChart) {
      setDisplayedChart(selectedChart);
      setSelectedChartName(name);
    }
  };

  // Calculate key metrics based on currently displayed chart
  const getChartMetrics = () => {
    if (!displayedChart) return null;

    switch (displayedChart.name) {
      case 'Accounts Receivable Aging':
        const arTotal = displayedChart.data.reduce((sum, val) => sum + val, 0);
        const arOverdue = displayedChart.data.slice(1).reduce((sum, val) => sum + val, 0);
        return {
          title: 'AR Overdue',
          value: `$${(arOverdue / 1000).toFixed(1)}K`,
          // Em dash when there is no AR — the share is undefined, not 0%.
          subtitle: `${formatPercent(marginOf(arOverdue, arTotal))} of total AR`,
          color: arOverdue > 0 ? 'warning.dark' : 'success.dark',
          bgColor: arOverdue > 0 ? 'warning.light' : 'success.light'
        };

      case 'Accounts Payable Summary':
        const apTotal = displayedChart.data.reduce((sum, val) => sum + val, 0);
        // ALL-58 fix: previously fell back to displayedChart.data[0] (whatever sat
        // at array position 0) when the "Due This Week" label wasn't found — that
        // could silently show a totally different bucket's amount. Now reads by
        // label via getBucketValueByLabel, with an explicit 0 fallback.
        const apDueThisWeek = getBucketValueByLabel(displayedChart.xAxis, displayedChart.data, 'Due This Week');
        return {
          title: 'AP Due This Period',
          value: `$${(apDueThisWeek / 1000).toFixed(1)}K`,
          subtitle: `of $${(apTotal / 1000).toFixed(1)}K total`,
          color: 'text.primary',
          bgColor: 'grey.50'
        };
      case 'Budget vs Actual':
        const budgetTotal = displayedChart.data.reduce((sum, val) => sum + val, 0);
        const actualTotal = displayedChart.secondarySeries?.reduce((sum, val) => sum + val, 0) || 0;
        return {
          title: 'Budget Variance',
          // Em dash when there is no budget — the variance is undefined, not 0%.
          value: formatPercent(marginOf(actualTotal - budgetTotal, budgetTotal)),
          subtitle: actualTotal > budgetTotal ? 'Over Budget' : 'Under Budget',
          color: actualTotal > budgetTotal ? 'warning.dark' : 'success.dark',
          bgColor: actualTotal > budgetTotal ? 'warning.light' : 'success.light'
        };
      case 'Revenue vs Expenses':
        const totalRevenue = displayedChart.data.reduce((sum, val) => sum + val, 0);
        const totalExpenses = displayedChart.secondarySeries?.reduce((sum, val) => sum + val, 0) || 0;
        const netProfit = totalRevenue - totalExpenses;
        return {
          title: 'Net Margin',
          // Em dash when there is no revenue — the margin is undefined, not 0%.
          value: formatPercent(marginOf(netProfit, totalRevenue)),
          subtitle: `$${(netProfit / 1000).toFixed(1)}K net of $${(totalRevenue / 1000).toFixed(1)}K revenue`,
          color: netProfit >= 0 ? 'success.dark' : 'warning.dark',
          bgColor: netProfit >= 0 ? 'success.light' : 'warning.light'
        };
      case 'Inventory Turnover':
        const turnoverRatio = displayedChart.data[0] || 0;
        return {
          title: 'Inventory Turnover',
          value: `${turnoverRatio.toFixed(2)}x`,
          subtitle: displayedChart.description,
          color: 'text.primary',
          bgColor: 'grey.50'
        };
      case 'Labor Efficiency':
        const revenuePerHour = displayedChart.data[0] || 0;
        return {
          title: 'Revenue per Labor Hour',
          value: `$${revenuePerHour.toFixed(2)}`,
          subtitle: displayedChart.description,
          color: 'text.primary',
          bgColor: 'grey.50'
        };
      default:
        return null;
    }
  };

  const chartMetrics = getChartMetrics();

  // Combined loading state
  const isLoading =
    isLoadingInvoices ||
    isLoadingPayables ||
    isLoadingBudgets ||
    isLoadingExpenses ||
    isLoadingAnalytics ||
    isLoadingRevenue ||
    isLoadingInventory ||
    isLoadingEmployee ||
    isLoadingBalanceSheet ||
    isLoadingCashFlow;

  // Check if we have any data or errors
  const hasData = displayedChart !== null;
  const hasErrors =
    invoiceErrors ||
    payablesErrors ||
    budgetsErrors ||
    expenseErrors ||
    analyticsErrors ||
    revenueErrors ||
    balanceSheetErrors ||
    cashFlowErrors;

  return (
    <Grid size={12}>
      <MainCard title="Analytics">
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: '200px' }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && hasErrors && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="warning">Some data could not be loaded. Please try refreshing the page.</Alert>
          </Box>
        )}

        {!isLoading && !hasData && !hasErrors && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="info">
              No analytics data available for the selected period. Data will appear once transactions are recorded.
            </Alert>
          </Box>
        )}

        {!isLoading && hasData && displayedChart && (
          <Box display="flex" flexDirection="column" justifyContent="space-between" gap={4}>
            {/* Key Metrics Cards - All aligned in a row */}
            <Box
              display="flex"
              flexDirection={{ xs: 'column', sm: 'row' }}
              gap={2}
              mb={2}
              sx={{
                '& > *': {
                  flex: 1,
                  minWidth: 0
                }
              }}
            >
              {/* AR Overdue Card - admin-only (AR aging endpoint is admin-gated) */}
              {isAdmin &&
                (invoiceAging && invoiceAging.aging_summary ? (
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: '8px',
                      backgroundColor: invoiceAging.aging_summary.over_90 > 0 ? 'warning.light' : 'success.light',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>AR Overdue</Box>
                    <Box
                      sx={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        mt: 0.5,
                        color: invoiceAging.aging_summary.over_90 > 0 ? 'warning.dark' : 'success.dark'
                      }}
                    >
                      $
                      {(
                        (invoiceAging.aging_summary.days_31_60 +
                          invoiceAging.aging_summary.days_61_90 +
                          invoiceAging.aging_summary.over_90) /
                        1000
                      ).toFixed(1)}
                      K
                    </Box>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', opacity: 0.7, mt: 0.5 }}>
                      {/* Em dash when there is no AR — the share is undefined, not 0%. */}
                      {`${formatPercent(
                        marginOf(
                          invoiceAging.aging_summary.days_31_60 +
                            invoiceAging.aging_summary.days_61_90 +
                            invoiceAging.aging_summary.over_90,
                          invoiceAging.aging_summary.total
                        )
                      )} of total AR`}
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: '8px',
                      backgroundColor: 'grey.100',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', opacity: 0.7 }}>AR Overdue</Box>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', opacity: 0.7, mt: 0.5 }}>No data</Box>
                  </Box>
                ))}

              {/* Liquidity (Cash) Card - Positioned second */}
              {cashFlow || balanceSheet ? (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: '8px',
                    backgroundColor: 'primary.light',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Liquidity (Cash)</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5, color: 'primary.main' }}>
                    {balanceSheet?.balance_sheet?.assets?.current_assets?.total
                      ? `$${(balanceSheet.balance_sheet.assets.current_assets.total / 1000).toFixed(1)}K`
                      : cashFlow?.cash_flow?.summary?.net_cash_flow !== undefined
                        ? `$${(cashFlow.cash_flow.summary.net_cash_flow / 1000).toFixed(1)}K`
                        : '—'}
                  </Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', opacity: 0.7, mt: 0.5 }}>
                    {balanceSheet ? 'Current assets' : cashFlow ? 'Net cash flow' : 'No data'}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: '8px',
                    backgroundColor: 'grey.100',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', opacity: 0.7 }}>Liquidity (Cash)</Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', opacity: 0.7, mt: 0.5 }}>No data</Box>
                </Box>
              )}

              {/* Inventory Efficiency Card - Positioned third */}
              {isLoadingInventoryEfficiency ? (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '80px'
                  }}
                >
                  <CircularProgress size={24} />
                </Box>
              ) : inventoryEfficiency ? (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: '8px',
                    backgroundColor:
                      inventoryEfficiency.status === 'healthy'
                        ? 'success.light'
                        : inventoryEfficiency.status === 'watch'
                          ? 'warning.light'
                          : inventoryEfficiency.status === 'at_risk'
                            ? 'error.light'
                            : 'grey.100',
                    cursor: 'pointer',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    '&:hover': {
                      boxShadow: 1
                    }
                  }}
                  onClick={() => {
                    setEfficiencyDialogOpen(true);
                  }}
                >
                  <Box
                    sx={{
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>Inventory Efficiency</span>
                    <Box
                      sx={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor:
                          inventoryEfficiency.status === 'healthy'
                            ? 'success.main'
                            : inventoryEfficiency.status === 'watch'
                              ? 'warning.main'
                              : inventoryEfficiency.status === 'at_risk'
                                ? 'error.main'
                                : 'grey.500',
                        ml: 0.5
                      }}
                    />
                  </Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5, color: 'primary.main' }}>
                    {inventoryEfficiency.turnover_rate.toFixed(1)}x
                  </Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', opacity: 0.7, mt: 0.5 }}>
                    Avg days to sell inventory: {inventoryEfficiency.dio ? `${inventoryEfficiency.dio.toFixed(0)} days` : 'N/A'}
                  </Box>
                  {inventoryEfficiency.status_label && (
                    <Box sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
                      {inventoryEfficiency.status_label === 'Healthy' && '🟢 Healthy'}
                      {inventoryEfficiency.status_label === 'Watch' && '🟡 Watch'}
                      {inventoryEfficiency.status_label === 'At Risk' && '🔴 At Risk'}
                    </Box>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: '8px',
                    backgroundColor: 'grey.100',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', opacity: 0.7 }}>Inventory Efficiency</Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', opacity: 0.7, mt: 0.5 }}>No data</Box>
                </Box>
              )}
            </Box>

            {/* Chart Metrics Summary - Hide AR Overdue since it's already in the row above */}
            {chartMetrics && displayedChart?.name !== 'Accounts Receivable Aging' && (
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: '8px',
                    backgroundColor: chartMetrics.bgColor
                  }}
                >
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{chartMetrics.title}</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5, color: chartMetrics.color }}>{chartMetrics.value}</Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', opacity: 0.7, mt: 0.5 }}>{chartMetrics.subtitle}</Box>
                </Box>
              </Box>
            )}

            {/* Single Chart */}
            {chartDataReady && (
              <Box display="flex" flexDirection="column" gap={1} width="100%">
                <AnalyticsChart
                  isLoading={isLoading}
                  subtitle={displayedChart.name}
                  headline={`$${getTotal(displayedChart).toLocaleString()}`}
                  series={
                    displayedChart.secondarySeries
                      ? [
                          { name: 'Budget', data: displayedChart.data },
                          { name: 'Actual', data: displayedChart.secondarySeries }
                        ]
                      : displayedChart.name === 'Revenue vs Expenses'
                        ? [
                            { name: 'Revenue', data: displayedChart.data },
                            { name: 'Expenses', data: displayedChart.secondarySeries || [] }
                          ]
                        : [{ name: displayedChart.name, data: displayedChart.data }]
                  }
                  xAxis={displayedChart.xAxis}
                  headerButton={<ChartSelectDropdown options={allAvailableCharts.map((c) => c.name)} handleSelect={handleChartChange} />}
                  showChartTypeButtons={true}
                  initialChartType={displayedChart.chartType === 'column' ? 'bar' : displayedChart.chartType}
                />
              </Box>
            )}
          </Box>
        )}
      </MainCard>

      {/* Inventory Efficiency Drill-Down Dialog */}
      <Dialog open={efficiencyDialogOpen} onClose={() => setEfficiencyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Inventory Efficiency - At Risk Items</DialogTitle>
        <DialogContent>
          {inventoryEfficiency && (
            <Box>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Box display="flex" flexDirection="row" flexWrap="wrap" gap={2}>
                  <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Turnover Rate</Box>
                    <Box sx={{ fontSize: '1.25rem', fontWeight: 600 }}>{inventoryEfficiency.turnover_rate.toFixed(2)}x</Box>
                  </Box>
                  <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Days Inventory Outstanding</Box>
                    <Box sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {inventoryEfficiency.dio ? `${inventoryEfficiency.dio.toFixed(1)} days` : 'N/A'}
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Total Inventory Value</Box>
                    <Box sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      $
                      {inventoryEfficiency.total_inventory_value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>COGS (Last 30 Days)</Box>
                    <Box sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      $
                      {inventoryEfficiency.cogs_last_30_days.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Box>
                  </Box>
                </Box>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>SKU</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Name</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Inventory Value</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Qty on Hand</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Days Since Last Sale</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Suggested Action</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventoryEfficiency.at_risk_items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          No items at risk
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventoryEfficiency.at_risk_items.map((item: any, index: number) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.sku || '—'}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell align="right">
                            ${item.inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right">{item.quantity_on_hand}</TableCell>
                          <TableCell align="right">{item.days_since_last_sale !== null ? item.days_since_last_sale : 'Never'}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={item.suggested_action}
                              color={
                                item.suggested_action === 'Reorder' ? 'error' : item.suggested_action === 'Discount' ? 'warning' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEfficiencyDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};
