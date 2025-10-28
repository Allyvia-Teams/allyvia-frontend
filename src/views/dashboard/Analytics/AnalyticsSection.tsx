import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// material-ui
import Grid from '@mui/material/Grid';
import { Box, CircularProgress } from '@mui/material';

// Redux
import { AppDispatch, RootState } from 'store';
import { fetchInvoiceAging, fetchBudgetByCategoryAsync, fetchPayablesByDueDateAsync } from 'store/slices/finance';

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

export const AnalyticsSection = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux selectors
  const invoiceAging = useSelector((state: RootState) => state.finance.invoiceAging);
  const payablesByDueDate = useSelector((state: RootState) => state.finance.payablesByDueDate);
  const budgetsByCategory = useSelector((state: RootState) => state.finance.budgetsByCategory);

  // Loading states
  const isLoadingInvoices = useSelector((state: RootState) => state.finance.loading.invoices);
  const isLoadingPayables = useSelector((state: RootState) => state.finance.loading.payables);
  const isLoadingBudgets = useSelector((state: RootState) => state.finance.loading.budgets);

  // Error states
  const invoiceErrors = useSelector((state: RootState) => state.finance.errors.invoices);
  const payablesErrors = useSelector((state: RootState) => state.finance.errors.payables);
  const budgetsErrors = useSelector((state: RootState) => state.finance.errors.budgets);

  const [displayedCharts, setDisplayedCharts] = useState<ChartData[]>([]);
  const [chartDataReady, setChartDataReady] = useState(false);

  // DEBUG: Log Redux state on mount and updates
  useEffect(() => {
    console.log('=== REDUX STATE ===');
    console.log('invoiceAging:', invoiceAging);
    console.log('payablesByDueDate:', payablesByDueDate);
    console.log('budgetsByCategory:', budgetsByCategory);
    console.log('Loading - Invoices:', isLoadingInvoices, 'Payables:', isLoadingPayables, 'Budgets:', isLoadingBudgets);
    console.log('Errors - Invoices:', invoiceErrors, 'Payables:', payablesErrors, 'Budgets:', budgetsErrors);
  }, [invoiceAging, payablesByDueDate, budgetsByCategory, isLoadingInvoices, isLoadingPayables, isLoadingBudgets]);

  // Fetch data on component mount
  useEffect(() => {
    console.log('AnalyticsSection mounted, dispatching thunks...');

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    console.log('Date range:', startDate, 'to', endDate);

    // Dispatch the THREE main thunks
    const action1 = dispatch(fetchInvoiceAging());
    const action2 = dispatch(fetchPayablesByDueDateAsync({ startDate, endDate }));
    const action3 = dispatch(fetchBudgetByCategoryAsync({ startDate, endDate }));

    console.log('Thunks dispatched:', action1, action2, action3);

    return () => {
      console.log('AnalyticsSection unmounting');
    };
  }, [dispatch]);

  // Mock data for fallback
  const mockCharts: ChartData[] = [
    {
      name: 'Accounts Receivable Aging',
      data: [45000, 28000, 15000, 8000],
      xAxis: ['0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
      chartType: 'column',
      description: 'Outstanding invoices by age bracket'
    },
    {
      name: 'Accounts Payable Summary',
      data: [32000, 18000, 12000, 5000],
      xAxis: ['Due This Week', 'Next Week', 'This Month', 'Overdue'],
      chartType: 'column',
      description: 'Upcoming payment obligations'
    },
    {
      name: 'Budget vs Actual',
      data: [25000, 28000, 15000, 16000, 12000, 10000],
      secondarySeries: [22000, 30000, 14000, 18000, 11000, 9500],
      xAxis: ['Salaries', 'Marketing', 'Operations', 'Utilities', 'Supplies', 'Other'],
      chartType: 'column',
      description: 'Planned budgets vs actual spending by category'
    }
  ];

  // Build chart data from Redux state
  useEffect(() => {
    console.log('Building charts from Redux data...');

    const charts: ChartData[] = [];

    // 1. Accounts Receivable Aging Chart
    if (invoiceAging && invoiceAging.length > 0) {
      console.log('✓ Building AR Aging chart with', invoiceAging.length, 'buckets');
      const agingBuckets = invoiceAging.map((bucket) => bucket.bucket);
      const agingAmounts = invoiceAging.map((bucket) => bucket.amount);

      charts.push({
        name: 'Accounts Receivable Aging',
        data: agingAmounts,
        xAxis: agingBuckets,
        chartType: 'column',
        description: 'Outstanding invoices by age bracket'
      });
    } else {
      console.log('✗ No invoiceAging data, using mock');
      charts.push(mockCharts[0]);
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
    } else {
      console.log('✗ No payablesByDueDate data, using mock');
      charts.push(mockCharts[1]);
    }

    // 3. Budget vs Actual Chart
    if (budgetsByCategory && budgetsByCategory.length > 0) {
      console.log('✓ Building Budget vs Actual chart with', budgetsByCategory.length, 'categories');
      const categories = budgetsByCategory.map((cat) => cat.category);
      const budgetAmounts = budgetsByCategory.map((cat) => cat.amount);

      // For demo, generate "Actual" amounts as 85-105% of budget
      const actualAmounts = budgetAmounts.map((budget) => budget * (0.85 + Math.random() * 0.2));

      charts.push({
        name: 'Budget vs Actual',
        data: budgetAmounts,
        secondarySeries: actualAmounts,
        xAxis: categories,
        chartType: 'column',
        description: 'Planned budgets vs actual spending by category'
      });
    } else {
      console.log('✗ No budgetsByCategory data, using mock');
      charts.push(mockCharts[2]);
    }

    console.log('Charts built:', charts.length, 'total');
    setDisplayedCharts(charts.slice(0, 3));
    setChartDataReady(true);
  }, [invoiceAging, payablesByDueDate, budgetsByCategory]);

  const getTotal = (chartData: ChartData): number => {
    return chartData.data.reduce((sum, val) => sum + val, 0);
  };

  const displayChart = (position: number) => {
    return function (name: string) {
      const selectedChart = displayedCharts.find((chart) => chart.name === name);
      if (selectedChart) {
        setDisplayedCharts((prevCharts) => {
          const newCharts = [...prevCharts];
          newCharts.splice(position, 1, selectedChart);
          return newCharts;
        });
      }
    };
  };

  // Calculate key metrics for AR Aging
  const arTotal = displayedCharts[0]?.data.reduce((sum, val) => sum + val, 0) || 0;
  const arOverdue = displayedCharts[0]?.data.slice(1).reduce((sum, val) => sum + val, 0) || 0;
  const arOverduePercent = arTotal > 0 ? ((arOverdue / arTotal) * 100).toFixed(1) : '0';

  // Calculate key metrics for AP Summary
  const apTotal = displayedCharts[1]?.data.reduce((sum, val) => sum + val, 0) || 0;
  const apDueThisWeek = displayedCharts[1]?.data[0] || 0;

  // Calculate key metrics for Budget vs Actual
  const budgetTotal = displayedCharts[2]?.data.reduce((sum, val) => sum + val, 0) || 0;
  const actualTotal = displayedCharts[2]?.secondarySeries?.reduce((sum, val) => sum + val, 0) || 0;
  const budgetVariance = budgetTotal > 0 ? (((actualTotal - budgetTotal) / budgetTotal) * 100).toFixed(1) : '0';

  // Combined loading state
  const isLoading = isLoadingInvoices || isLoadingPayables || isLoadingBudgets;

  return (
    <Grid size={12}>
      <MainCard title="Analytics">
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: '200px' }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && (
          <Box display="flex" flexDirection="column" justifyContent="space-between" gap={4}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={2} mb={2}>
              {/* AR Overdue Summary */}
              <Box
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: arOverdue > 0 ? '#fff3cd' : '#d4edda'
                }}
              >
                <Box sx={{ fontSize: '0.875rem', color: '#666' }}>AR Overdue</Box>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5, color: arOverdue > 0 ? '#856404' : '#155724' }}>
                  ${(arOverdue / 1000).toFixed(1)}K
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: '#999', mt: 0.5 }}>{arOverduePercent}% of total AR</Box>
              </Box>

              {/* AP Due Summary */}
              <Box
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa'
                }}
              >
                <Box sx={{ fontSize: '0.875rem', color: '#666' }}>AP Due This Period</Box>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5 }}>${(apDueThisWeek / 1000).toFixed(1)}K</Box>
                <Box sx={{ fontSize: '0.75rem', color: '#999', mt: 0.5 }}>of ${(apTotal / 1000).toFixed(1)}K total</Box>
              </Box>

              {/* Budget vs Actual Summary */}
              <Box
                sx={{
                  p: 2,
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: actualTotal > budgetTotal ? '#fff3cd' : '#d4edda'
                }}
              >
                <Box sx={{ fontSize: '0.875rem', color: '#666' }}>Budget Variance</Box>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5, color: actualTotal > budgetTotal ? '#856404' : '#155724' }}>
                  {budgetVariance}%
                </Box>
                <Box sx={{ fontSize: '0.75rem', color: '#666', mt: 0.5 }}>{actualTotal > budgetTotal ? 'Over Budget' : 'Under Budget'}</Box>
              </Box>
            </Box>

            {/* Charts Grid */}
            <Box display="flex" alignItems="center" gap={4} flexDirection={{ xs: 'column', md: 'row' }} flexWrap="wrap">
              {chartDataReady &&
                displayedCharts.map((chart, index) => (
                  <Box
                    key={index}
                    display="flex"
                    flexDirection="column"
                    gap={1}
                    width={{
                      xs: '100%',
                      md:
                        displayedCharts.length === 3
                          ? 'calc(33.333% - 22px)'
                          : `calc(${100 / displayedCharts.length}% - ${(4 * (displayedCharts.length - 1)) / displayedCharts.length}px)`
                    }}
                  >
                    <AnalyticsChart
                      isLoading={isLoading}
                      subtitle={chart.name}
                      headline={`$${getTotal(chart).toLocaleString()}`}
                      series={
                        chart.secondarySeries
                          ? [
                              { name: 'Budget', data: chart.data },
                              { name: 'Actual', data: chart.secondarySeries }
                            ]
                          : [{ name: chart.name, data: chart.data }]
                      }
                      xAxis={chart.xAxis}
                      headerButton={<ChartSelectDropdown options={displayedCharts.map((c) => c.name)} handleSelect={displayChart(index)} />}
                      showChartTypeButtons={true}
                    />
                  </Box>
                ))}
            </Box>
          </Box>
        )}
      </MainCard>
    </Grid>
  );
};
