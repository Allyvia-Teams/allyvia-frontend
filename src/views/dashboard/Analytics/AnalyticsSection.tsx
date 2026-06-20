import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// material-ui
import Grid from '@mui/material/Grid';
import { Box, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

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

export const AnalyticsSection = ({ range }: DashboardSummaryProps) => {
  const dispatch = useDispatch<AppDispatch>();

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
  const isLoadingInvoices = useSelector((state: RootState) => state.finance.loading.invoices);
  const isLoadingPayables = useSelector((state: RootState) => state.finance.loading.payables);
  const isLoadingBudgets = useSelector((state: RootState) => state.finance.loading.budgets);
  const isLoadingExpenses = useSelector((state: RootState) => state.finance.loading.expenseBreakdown);
  const isLoadingAnalytics = useSelector((state: RootState) => state.finance.loading.analyticsSummary);
  const isLoadingRevenue = useSelector((state: RootState) => state.finance.loading.revenueSeries);
  const isLoadingBalanceSheet = useSelector((state: RootState) => state.finance.loading.balanceSheet);
  const isLoadingCashFlow = useSelector((state: RootState) => state.finance.loading.cashFlow);

  // Error states
  const invoiceErrors = useSelector((state: RootState) => state.finance.errors.invoices);
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
    console.log('=== REDUX STATE ===');
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
    console.log('Loading - Invoices:', isLoadingInvoices, 'Payables:', isLoadingPayables, 'Budgets:', isLoadingBudgets, 'Expenses:', isLoadingExpenses, 'Analytics:', isLoadingAnalytics, 'Revenue:', isLoadingRevenue, 'BalanceSheet:', isLoadingBalanceSheet, 'CashFlow:', isLoadingCashFlow);
    console.log('Errors - Invoices:', invoiceErrors, 'Payables:', payablesErrors, 'Budgets:', budgetsErrors, 'Expenses:', expenseErrors, 'Analytics:', analyticsErrors, 'Revenue:', revenueErrors, 'BalanceSheet:', balanceSheetErrors, 'CashFlow:', cashFlowErrors);
  }, [invoiceAging, payablesByDueDate, budgetsByCategory, expenseBreakdown, analyticsSummary, revenueSeries, inventorySummary, employeeAnalytics, balanceSheet, cashFlow, isLoadingInvoices, isLoadingPayables, isLoadingBudgets, isLoadingExpenses, isLoadingAnalytics, isLoadingRevenue, isLoadingBalanceSheet, isLoadingCashFlow, invoiceErrors, payablesErrors, budgetsErrors, expenseErrors, analyticsErrors, revenueErrors, balanceSheetErrors, cashFlowErrors]);

  // Fetch data on component mount
  useEffect(() => {
    console.log('AnalyticsSection mounted, dispatching thunks...');

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    console.log('Date range:', startDate, 'to', endDate);

    // Dispatch the main thunks
    dispatch(fetchInvoiceAgingAsync());
    dispatch(fetchPayablesByDueDateAsync({ startDate, endDate }));
    dispatch(fetchBudgetByCategoryAsync({ startDate, endDate }));
    // Fetch expense breakdown for actual spending data
    dispatch(fetchExpenseBreakdown({ startDate, endDate }) as any);
    // Fetch analytics summary for Revenue vs Expenses
    dispatch(fetchAnalyticsSummary({ startDate, endDate }));
    // Fetch revenue series for Labor Efficiency
    dispatch(fetchRevenueSeries({ startDate, endDate }));

    // Fetch inventory summary for Inventory Turnover
    setIsLoadingInventory(true);
    AnalyticsAPI.Inventory.getSummary()
      .then((data) => {
        setInventorySummary(data);
        setIsLoadingInventory(false);
      })
      .catch((error) => {
        console.error('Failed to fetch inventory summary:', error);
        setIsLoadingInventory(false);
      });

    // Fetch inventory efficiency metrics
    setIsLoadingInventoryEfficiency(true);
    import('api/inventory.api').then(({ getInventoryEfficiency }) => {
      getInventoryEfficiency({ days: 30 })
        .then((data) => {
          setInventoryEfficiency(data);
          setIsLoadingInventoryEfficiency(false);
        })
        .catch((error) => {
          console.error('Failed to fetch inventory efficiency:', error);
          setIsLoadingInventoryEfficiency(false);
        });
    });

    // Fetch employee analytics for Labor Efficiency
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

    // Fetch balance sheet for Liquidity (cash)
    dispatch(fetchBalanceSheet({ asOfDate: endDate }));

    // Fetch cash flow for additional liquidity data
    dispatch(fetchCashFlow({ startDate, endDate }));

    return () => {
      console.log('AnalyticsSection unmounting');
    };
  }, [dispatch]);

  // Build chart data from Redux state
  useEffect(() => {
    console.log('Building charts from Redux data...');

    const charts: ChartData[] = [];

    // 1. Accounts Receivable Aging Chart
    if (invoiceAging && invoiceAging.aging_summary) {
      const summary = invoiceAging.aging_summary;
      console.log('✓ Building AR Aging chart with summary data');
      const agingBuckets = ['Current', '31-60 Days', '61-90 Days', 'Over 90 Days'];
      const agingAmounts = [summary.current || 0, summary.days_31_60 || 0, summary.days_61_90 || 0, summary.over_90 || 0];

      charts.push({
        name: 'Accounts Receivable Aging',
        data: agingAmounts,
        xAxis: agingBuckets,
        chartType: 'column',
        description: 'Outstanding invoices by age bracket'
      });
    } else if (!isLoadingInvoices) {
      console.log('✗ No invoiceAging data available');
    }

    // 2. Accounts Payable Summary Chart
    if (payablesByDueDate && payablesByDueDate.length > 0) {
      console.log('✓ Building AP Summary chart with', payablesByDueDate.length, 'periods');
      const apLabels = payablesByDueDate.map((p) => p.label);
      const apAmounts = payablesByDueDate.map((p) => p.amount);

      charts.push({
        name: 'Accounts Payable Summary',
        data: apAmounts,
        xAxis: apLabels,
        chartType: 'column',
        description: 'Upcoming payment obligations'
      });
    } else if (!isLoadingPayables) {
      console.log('✗ No payablesByDueDate data available');
    }

    // 3. Budget vs Actual Chart
    if (budgetsByCategory && budgetsByCategory.length > 0) {
      console.log('✓ Building Budget vs Actual chart with', budgetsByCategory.length, 'categories');
      const categories = budgetsByCategory.map((cat) => cat.category);
      const budgetAmounts = budgetsByCategory.map((cat) => cat.amount);

      // Get actual spending from expense breakdown
      let actualAmounts: number[] = [];
      if (expenseBreakdown && expenseBreakdown.by_category && expenseBreakdown.by_category.length > 0) {
        // Match expense categories with budget categories
        actualAmounts = categories.map((category) => {
          const expenseItem = expenseBreakdown.by_category.find(
            (exp: any) => exp.category_name?.toLowerCase() === category.toLowerCase()
          );
          return expenseItem ? parseFloat(expenseItem.total || '0') : 0;
        });
        console.log('✓ Using actual expense data for Budget vs Actual comparison');
      } else {
        // If no expense data, show only budget (no actual series)
        console.log('⚠ No expense breakdown data available, showing budget only');
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
    } else if (!isLoadingBudgets) {
      console.log('✗ No budgetsByCategory data available');
    }

    // 4. Revenue vs Expenses Chart
    if (revenueSeries && revenueSeries.length > 0 && expenseBreakdown) {
      console.log('✓ Building Revenue vs Expenses chart from time series');
      
      // Get revenue data from series
      const revenueData = revenueSeries.map((point: any) => parseFloat(point.amount || '0'));
      const dates = revenueSeries.map((point: any) => {
        const date = new Date(point.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      });
      
      // For expenses, we'll use the total from expense breakdown
      // If we have daily expense data, use it; otherwise distribute total evenly
      const totalExpenses = expenseBreakdown.by_category?.reduce((sum: number, cat: any) => 
        sum + parseFloat(cat.total || '0'), 0) || 0;
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
    } else if (analyticsSummary && (analyticsSummary.totalRevenue !== undefined || analyticsSummary.expenses !== undefined)) {
      console.log('✓ Building Revenue vs Expenses chart from summary');
      const revenue = analyticsSummary.totalRevenue || 0;
      const expenses = analyticsSummary.expenses || 0;

      charts.push({
        name: 'Revenue vs Expenses',
        data: [revenue],
        secondarySeries: [expenses],
        xAxis: ['Total'],
        chartType: 'column',
        description: 'Total revenue compared to total expenses'
      });
    } else if (!isLoadingAnalytics && !isLoadingRevenue) {
      console.log('✗ No data available for Revenue vs Expenses');
    }

    // 5. Inventory Turnover Chart
    if (inventorySummary && analyticsSummary && analyticsSummary.totalRevenue) {
      console.log('✓ Building Inventory Turnover chart');
      const inventoryValue = parseFloat(inventorySummary.inventory_value || '0');
      const revenue = analyticsSummary.totalRevenue || 0;
      
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
    } else if (!isLoadingInventory && !isLoadingAnalytics) {
      console.log('✗ No inventory or revenue data available for Inventory Turnover');
    }

    // 6. Labor Efficiency Chart (Revenue per Labor Hour)
    if (revenueSeries && employeeAnalytics && employeeAnalytics.daily_breakdown) {
      console.log('✓ Building Labor Efficiency chart');
      
      // Calculate total revenue
      const totalRevenue = revenueSeries.reduce((sum: number, point: any) => sum + (parseFloat(point.amount || '0')), 0);
      
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
    } else if (!isLoadingRevenue && !isLoadingEmployee) {
      console.log('✗ No revenue series or employee data available for Labor Efficiency');
    }

    console.log('Charts built:', charts.length, 'total');
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
        const arOverduePercent = arTotal > 0 ? ((arOverdue / arTotal) * 100).toFixed(1) : '0';
        return {
          title: 'AR Overdue',
          value: `$${(arOverdue / 1000).toFixed(1)}K`,
          subtitle: `${arOverduePercent}% of total AR`,
          color: arOverdue > 0 ? 'warning.dark' : 'success.dark',
          bgColor: arOverdue > 0 ? 'warning.light' : 'success.light'
        };
      case 'Accounts Payable Summary':
        const apTotal = displayedChart.data.reduce((sum, val) => sum + val, 0);
        const apDueThisWeek = displayedChart.data[0] || 0;
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
        const budgetVariance = budgetTotal > 0 ? (((actualTotal - budgetTotal) / budgetTotal) * 100).toFixed(1) : '0';
        return {
          title: 'Budget Variance',
          value: `${budgetVariance}%`,
          subtitle: actualTotal > budgetTotal ? 'Over Budget' : 'Under Budget',
          color: actualTotal > budgetTotal ? 'warning.dark' : 'success.dark',
          bgColor: actualTotal > budgetTotal ? 'warning.light' : 'success.light'
        };
      default:
        return null;
    }
  };

  const chartMetrics = getChartMetrics();

  // Combined loading state
  const isLoading = isLoadingInvoices || isLoadingPayables || isLoadingBudgets || isLoadingExpenses || 
                    isLoadingAnalytics || isLoadingRevenue || isLoadingInventory || isLoadingEmployee ||
                    isLoadingBalanceSheet || isLoadingCashFlow;

  // Check if we have any data or errors
  const hasData = displayedChart !== null;
  const hasErrors = invoiceErrors || payablesErrors || budgetsErrors || expenseErrors || 
                    analyticsErrors || revenueErrors || balanceSheetErrors || cashFlowErrors;

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
            <Alert severity="warning">
              Some data could not be loaded. Please try refreshing the page.
            </Alert>
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
              {/* AR Overdue Card - Always shown, positioned first */}
              {invoiceAging && invoiceAging.aging_summary ? (
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
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5, color: invoiceAging.aging_summary.over_90 > 0 ? 'warning.dark' : 'success.dark' }}>
                    ${((invoiceAging.aging_summary.days_31_60 + invoiceAging.aging_summary.days_61_90 + invoiceAging.aging_summary.over_90) / 1000).toFixed(1)}K
                  </Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', opacity: 0.7, mt: 0.5 }}>
                    {invoiceAging.aging_summary.total > 0 
                      ? `${(((invoiceAging.aging_summary.days_31_60 + invoiceAging.aging_summary.days_61_90 + invoiceAging.aging_summary.over_90) / invoiceAging.aging_summary.total) * 100).toFixed(1)}% of total AR`
                      : 'No AR'}
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
              )}

              {/* Liquidity (Cash) Card - Positioned second */}
              {(cashFlow || balanceSheet) ? (
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
                      inventoryEfficiency.status === 'healthy' ? 'success.light' :
                      inventoryEfficiency.status === 'watch' ? 'warning.light' :
                      inventoryEfficiency.status === 'at_risk' ? 'error.light' :
                      'grey.100',
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
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Inventory Efficiency</span>
                    <Box
                      sx={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor:
                          inventoryEfficiency.status === 'healthy' ? 'success.main' :
                          inventoryEfficiency.status === 'watch' ? 'warning.main' :
                          inventoryEfficiency.status === 'at_risk' ? 'error.main' :
                          'grey.500',
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
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5, color: chartMetrics.color }}>
                    {chartMetrics.value}
                  </Box>
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
                />
              </Box>
            )}
          </Box>
        )}
      </MainCard>

      {/* Inventory Efficiency Drill-Down Dialog */}
      <Dialog
        open={efficiencyDialogOpen}
        onClose={() => setEfficiencyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
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
                      ${inventoryEfficiency.total_inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>COGS (Last 30 Days)</Box>
                    <Box sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      ${inventoryEfficiency.cogs_last_30_days.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Box>
                  </Box>
                </Box>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>SKU</strong></TableCell>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell align="right"><strong>Inventory Value</strong></TableCell>
                      <TableCell align="right"><strong>Qty on Hand</strong></TableCell>
                      <TableCell align="right"><strong>Days Since Last Sale</strong></TableCell>
                      <TableCell align="center"><strong>Suggested Action</strong></TableCell>
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
                          <TableCell align="right">
                            {item.days_since_last_sale !== null ? item.days_since_last_sale : 'Never'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={item.suggested_action}
                              color={
                                item.suggested_action === 'Reorder' ? 'error' :
                                item.suggested_action === 'Discount' ? 'warning' :
                                'default'
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
