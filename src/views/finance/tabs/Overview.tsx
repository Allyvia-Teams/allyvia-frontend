import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { Search } from '@mui/icons-material';

import MainCard from 'ui-component/cards/MainCard';

import AllyviaStats from 'ui-component/common/AllyviaStats';
import type { KPI, InvoiceRow, Expense, ProfitAndLossSummary, PaymentSummary, CategoryAmount } from 'types/finance';

// Chart imports
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// API imports
import {
  fetchKPIs,
  fetchInvoiceStatistics,
  fetchInvoiceList,
  fetchTopExpenses,
  fetchExpenseSummary,
  fetchExpensesByCategory,
  fetchPaymentSummary,
  fetchAccountSummary,
  fetchProfitAndLossSummary,
  fetchSeries
} from 'api/finance.api';

interface OverviewTabProps {
  startISO: string;
  endISO: string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ startISO, endISO }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for real API data
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [pnlSummary, setPnlSummary] = useState<ProfitAndLossSummary | null>(null);
  const [invoiceStats, setInvoiceStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any>(null);
  const [expenseCategories, setExpenseCategories] = useState<CategoryAmount[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [accountSummary, setAccountSummary] = useState<any>(null);

  // State for expense management filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel - these will return static JSON data
        // Date range now covers January 1 to September 30, 2024
        const [
          kpiData,
          pnlData,
          invoiceStatsData,
          invoicesData,
          expensesData,
          expenseSummaryData,
          expenseCategoriesData,
          paymentSummaryData,
          accountSummaryData,
          seriesData
        ] = await Promise.all([
          fetchKPIs({ startDate: startISO, endDate: endISO }),
          fetchProfitAndLossSummary({ startDate: startISO, endDate: endISO }),
          fetchInvoiceStatistics({ startDate: startISO, endDate: endISO }),
          fetchInvoiceList({ startDate: startISO, endDate: endISO, status: 'all' }),
          fetchTopExpenses({ startDate: startISO, endDate: endISO, limit: 10 }),
          fetchExpenseSummary({ startDate: startISO, endDate: endISO }),
          fetchExpensesByCategory({ startDate: startISO, endDate: endISO }),
          fetchPaymentSummary({ startDate: startISO, endDate: endISO }),
          fetchAccountSummary({ startDate: startISO, endDate: endISO }),
          fetchSeries({ startDate: startISO, endDate: endISO })
        ]);

        // All data now comes from static JSON file
        setKpi(kpiData);
        setPnlSummary(pnlData);
        setInvoiceStats(invoiceStatsData);

        // Ensure invoices is always an array - simplified approach
        const invoicesArray = Array.isArray(invoicesData) ? invoicesData : [];
        setInvoices(invoicesArray);

        // Ensure expenses is always an array - simplified approach
        const expensesArray = Array.isArray(expensesData) ? expensesData : [];
        setExpenses(expensesArray);

        setExpenseSummary(expenseSummaryData);
        setExpenseCategories(Array.isArray(expenseCategoriesData) ? expenseCategoriesData : []);
        setPaymentSummary(paymentSummaryData);
        setAccountSummary(accountSummaryData);
      } catch (err: any) {
        console.error('Failed to fetch overview data:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (startISO && endISO) {
      fetchOverviewData();
    }
  }, [startISO, endISO]);

  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

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

  // Prepare chart data using static JSON data
  const revenueTrendData = [
    { x: 'Jan 2024', revenue: 456250, expenses: 164250, profit: 292000 },
    { x: 'Feb 2024', revenue: 478500, expenses: 172260, profit: 306240 },
    { x: 'Mar 2024', revenue: 501750, expenses: 180630, profit: 321120 },
    { x: 'Apr 2024', revenue: 525000, expenses: 189000, profit: 336000 },
    { x: 'May 2024', revenue: 548250, expenses: 197370, profit: 350880 },
    { x: 'Jun 2024', revenue: 571500, expenses: 205740, profit: 365760 },
    { x: 'Jul 2024', revenue: 594750, expenses: 214110, profit: 380640 },
    { x: 'Aug 2024', revenue: 618000, expenses: 222480, profit: 395520 },
    { x: 'Sep 2024', revenue: 641250, expenses: 230850, profit: 410400 }
  ];

  const expenseCategoryData = Array.isArray(expenseCategories)
    ? expenseCategories.map((item) => ({ x: item.category, y: item.amount }))
    : [];

  const invoiceStatusData = invoiceStats
    ? [
        { x: 'Paid', y: invoiceStats.invoices_by_status?.paid || 0 },
        { x: 'Pending', y: invoiceStats.invoices_by_status?.pending || 0 },
        { x: 'Overdue', y: invoiceStats.invoices_by_status?.overdue || 0 }
      ]
    : [];

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
      {/* Primary KPI Cards - Using AllyviaStats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AllyviaStats
            title="Total Revenue"
            value={pnlSummary ? fmtMoney(pnlSummary.total_income) : fmtMoney(kpi?.totalRevenue ?? 0)}
            theme="default"
            size="medium"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AllyviaStats
            title="Net Income"
            value={pnlSummary ? fmtMoney(pnlSummary.net_income) : fmtMoney(kpi?.netIncome ?? 0)}
            theme="default"
            size="medium"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AllyviaStats
            title="Gross Profit"
            value={pnlSummary ? fmtMoney(pnlSummary.gross_profit) : fmtMoney(kpi?.grossProfit ?? 0)}
            theme="default"
            size="medium"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AllyviaStats
            title="Cash Balance"
            value={accountSummary ? fmtMoney(accountSummary.total_balance || 0) : fmtMoney(kpi?.cashBalance ?? 0)}
            theme="default"
            size="medium"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 - Revenue Trends and Expense Categories */}
      <Box sx={{ mb: 4 }}>
        <MainCard title="Revenue & Profit Trends">
          <Chart
            options={{
              chart: {
                type: 'line',
                height: 380,
                toolbar: {
                  show: true,
                  tools: {
                    download: true,
                    selection: false,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                  }
                }
              },
              colors: ['#2196F3', '#FF9800', '#4CAF50'],
              stroke: {
                curve: 'smooth',
                width: 3
              },
              markers: {
                size: 6,
                hover: {
                  size: 8
                }
              },
              xaxis: {
                categories: revenueTrendData.map((item) => item.x),
                title: {
                  text: 'Period'
                }
              },
              yaxis: {
                title: {
                  text: 'Amount ($)'
                },
                labels: {
                  formatter: (value) => `$${(value / 1000).toFixed(0)}K`
                },
                min: 0,
                forceNiceScale: true
              },
              legend: {
                position: 'top',
                horizontalAlign: 'center',
                fontSize: '14px',
                markers: { size: 10 },
                offsetY: 5
              },
              tooltip: {
                y: {
                  formatter: (value) => `$${value.toLocaleString()}`
                }
              },
              grid: {
                borderColor: '#e0e0e0',
                strokeDashArray: 5
              },
              dataLabels: {
                enabled: false
              }
            }}
            series={[
              {
                name: 'Revenue',
                data: revenueTrendData.map((item) => item.revenue)
              },
              {
                name: 'Expenses',
                data: revenueTrendData.map((item) => item.expenses)
              },
              {
                name: 'Profit',
                data: revenueTrendData.map((item) => item.profit)
              }
            ]}
            type="line"
            height={380}
          />
        </MainCard>
      </Box>

      {/* High-level Stats Between Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AllyviaStats title="Total Invoices" value={invoiceStats ? invoiceStats.total_invoices || 0 : 0} theme="default" size="medium" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AllyviaStats
            title="Total Expenses"
            value={fmtMoney(expenseSummary ? expenseSummary.total_expenses || 0 : 0)}
            theme="default"
            size="medium"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AllyviaStats
            title="Cash Position"
            value={fmtMoney(accountSummary ? accountSummary.total_balance || 0 : 0)}
            theme="default"
            size="medium"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <AllyviaStats
            title="Net Cash Flow"
            value={fmtMoney(paymentSummary ? Number(paymentSummary.total_payments) || 0 : 0)}
            theme="default"
            size="medium"
          />
        </Grid>
      </Grid>

      {/* Charts Row 2 - Invoice Status and Overdue/Pending Lists */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        {/* Left: Invoice Status Donut */}
        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Invoice Status">
            <Chart
              options={{
                ...chartOptions,
                labels: invoiceStatusData.map((item) => item.x),
                plotOptions: { pie: { donut: { size: '60%' } } },
                legend: { position: 'bottom', fontSize: '10px', markers: { size: 6 } },
                tooltip: { y: { formatter: (value) => value.toString() } }
              }}
              series={invoiceStatusData.map((item) => item.y)}
              type="donut"
              height={300}
            />
          </MainCard>
        </Box>

        {/* Right: Overdue and Pending Invoices List */}
        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Overdue & Pending Invoices">
            <Box sx={{ p: 2, maxHeight: 350, overflowY: 'auto' }}>
              {(() => {
                const overdue = Array.isArray(invoices) ? invoices.filter((inv) => inv.status === 'overdue') : [];
                const pending = Array.isArray(invoices) ? invoices.filter((inv) => inv.status === 'pending') : [];
                const combined = [...overdue, ...pending].slice(0, 10);
                if (combined.length === 0)
                  return (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                      No overdue or pending invoices
                    </Typography>
                  );
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
          </MainCard>
        </Box>
      </Box>

      {/* Expense Breakdown by Category */}
      {Array.isArray(expenseCategories) && expenseCategories.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Left: Expense Categories Pie */}
          <Grid size={{ xs: 12, md: 6 }}>
            <MainCard title="Expense Categories Distribution">
              <Chart
                options={{
                  ...chartOptions,
                  labels: expenseCategoryData.map((item) => item.x),
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
                series={expenseCategoryData.map((item) => item.y)}
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

      {/* Expense Management with Advanced Filters */}
      <MainCard title="Expense Management" sx={{ mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Expense Filters
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {Array.isArray(expenseCategories) &&
                  expenseCategories.map((category: any) => (
                    <MenuItem key={category.category} value={category.category}>
                      {category.category}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              placeholder="Min Amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              sx={{ width: 120 }}
            />
            <TextField
              size="small"
              placeholder="Max Amount"
              value={minAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              sx={{ width: 120 }}
            />
          </Box>
        </Box>

        {/* Top Expenses Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses
                .filter((expense) => {
                  const matchesSearch =
                    expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
                  const matchesMinAmount = !minAmount || expense.amount >= Number(minAmount);
                  const matchesMaxAmount = !maxAmount || expense.amount <= Number(maxAmount);
                  return matchesSearch && matchesCategory && matchesMinAmount && matchesMaxAmount;
                })
                .slice(0, 20)
                .map((expense: any, index: number) => (
                  <TableRow key={expense.id || index} hover>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      <Chip label={expense.category} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="error.main" fontWeight="bold">
                        {fmtMoney(expense.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>
                      <Chip label={expense.status || 'Pending'} size="small" color={expense.status === 'paid' ? 'success' : 'warning'} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </MainCard>
    </>
  );
};

export default OverviewTab;
