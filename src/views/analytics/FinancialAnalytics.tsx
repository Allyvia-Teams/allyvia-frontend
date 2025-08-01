import { useState, useMemo } from 'react';
import { format } from 'utils/dateUtils';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';

// material-ui
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Divider,
  Grid,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  Assessment,
  AccountBalance,
  ShowChart,
  PieChart,
  MoreVert,
  Visibility,
  VisibilityOff,
  Search,
  FilterList,
  DateRange,
  Business,
  Category,
} from '@mui/icons-material';

// third party
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

const MetricCard = ({ title, value, change, icon, color = 'primary', subtitle }: MetricCardProps) => (
  <Card sx={{ height: '100%', mb: 2 }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary" mt={1}>
              {subtitle}
            </Typography>
          )}
          {change !== undefined && (
            <Box display="flex" alignItems="center" mt={1}>
              {change >= 0 ? (
                <TrendingUp color="success" fontSize="small" />
              ) : (
                <TrendingDown color="error" fontSize="small" />
              )}
              <Typography
                variant="body2"
                color={change >= 0 ? 'success.main' : 'error.main'}
                ml={0.5}
              >
                {Math.abs(change)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

interface FinancialAnalyticsProps {
  dateRange?: RangeValue;
  isLoading?: boolean;
  selectedChartType?: 'line' | 'area' | 'bar';
}

export const FinancialAnalytics = ({ dateRange, isLoading, selectedChartType = 'line' }: FinancialAnalyticsProps) => {
  const analyticsWidgetsSm = {
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Mock financial data
  const mockFinancialData = {
    profits: {
      total_revenue: 1250000,
      total_expenses: 875000,
      net_income: 375000,
      gross_profit: 500000,
      gross_margin_percentage: 40.0,
      profit_trend: [
        { date: '2024-01-01', revenue: 85000, expenses: 65000, profit: 20000 },
        { date: '2024-01-02', revenue: 92000, expenses: 68000, profit: 24000 },
        { date: '2024-01-03', revenue: 78000, expenses: 62000, profit: 16000 },
        { date: '2024-01-04', revenue: 105000, expenses: 72000, profit: 33000 },
        { date: '2024-01-05', revenue: 95000, expenses: 70000, profit: 25000 },
        { date: '2024-01-06', revenue: 88000, expenses: 65000, profit: 23000 },
        { date: '2024-01-07', revenue: 102000, expenses: 75000, profit: 27000 }
      ]
    },
    expenses: {
      total_expenses: 875000,
      average_expense: 12500,
      expenses_by_category: [
        { category: 'Marketing', amount: 250000, percentage: 28.6 },
        { category: 'Operations', amount: 200000, percentage: 22.9 },
        { category: 'Technology', amount: 180000, percentage: 20.6 },
        { category: 'Sales', amount: 150000, percentage: 17.1 },
        { category: 'Administration', amount: 95000, percentage: 10.8 }
      ],
      top_expenses: [
        { description: 'Digital Marketing Campaign', amount: 45000, date: '2024-01-15', category: 'Marketing' },
        { description: 'Software Licenses', amount: 32000, date: '2024-01-14', category: 'Technology' },
        { description: 'Office Rent', amount: 28000, date: '2024-01-13', category: 'Operations' },
        { description: 'Sales Training', amount: 25000, date: '2024-01-12', category: 'Sales' },
        { description: 'Legal Services', amount: 22000, date: '2024-01-11', category: 'Administration' },
        { description: 'Social Media Ads', amount: 18000, date: '2024-01-10', category: 'Marketing' },
        { description: 'Cloud Services', amount: 15000, date: '2024-01-09', category: 'Technology' },
        { description: 'Utilities', amount: 12000, date: '2024-01-08', category: 'Operations' }
      ]
    },
    invoices: {
      total_invoices: 156,
      total_amount: 1250000,
      paid_amount: 980000,
      outstanding_amount: 270000,
      average_invoice_value: 8012,
      invoices_by_status: {
        paid: 98,
        pending: 35,
        overdue: 23
      },
      top_customers: [
        { customer: 'Tech Corp', total_amount: 125000, invoice_count: 8 },
        { customer: 'Marketing Inc', total_amount: 98000, invoice_count: 6 },
        { customer: 'Sales Co', total_amount: 75000, invoice_count: 5 },
        { customer: 'Consulting LLC', total_amount: 62000, invoice_count: 4 },
        { customer: 'Startup XYZ', total_amount: 48000, invoice_count: 3 }
      ]
    },
    cash_flow: {
      operating_cash_flow: 420000,
      investing_cash_flow: -150000,
      financing_cash_flow: -50000,
      net_cash_flow: 220000,
      cash_flow_trend: [
        { month: 'Jan', operating: 35000, investing: -12000, financing: -5000 },
        { month: 'Feb', operating: 38000, investing: -15000, financing: -3000 },
        { month: 'Mar', operating: 42000, investing: -18000, financing: -8000 },
        { month: 'Apr', operating: 45000, investing: -20000, financing: -6000 },
        { month: 'May', operating: 48000, investing: -22000, financing: -4000 },
        { month: 'Jun', operating: 52000, investing: -25000, financing: -7000 }
      ]
    }
  };

  const profits = mockFinancialData.profits;
  const expenses = mockFinancialData.expenses;
  const invoices = mockFinancialData.invoices;
  const cashFlow = mockFinancialData.cash_flow;

  // Filter expenses based on search and filters
  const filteredExpenses = useMemo(() => {
    let filtered = expenses.top_expenses;
    
    if (searchTerm) {
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }
    
    if (minAmount) {
      filtered = filtered.filter(expense => expense.amount >= parseFloat(minAmount));
    }
    
    if (maxAmount) {
      filtered = filtered.filter(expense => expense.amount <= parseFloat(maxAmount));
    }
    
    return filtered;
  }, [expenses.top_expenses, searchTerm, selectedCategory, minAmount, maxAmount]);

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    grid: { show: true },
    colors: ['#2196F3', '#FF9800', '#4CAF50', '#F44336', '#9C27B0'],
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
  };

  // Revenue trend data
  const revenueTrendData = profits.profit_trend.map((item) => ({
    x: format(new Date(item.date), 'MMM dd'),
    revenue: item.revenue,
    expenses: item.expenses,
    profit: item.profit,
  }));

  // Expense category data
  const expenseCategoryData = expenses.expenses_by_category.map((item) => ({
    x: item.category,
    y: item.amount,
  }));

  // Cash flow data
  const cashFlowData = cashFlow.cash_flow_trend.map((item) => ({
    x: item.month,
    operating: item.operating,
    investing: item.investing,
    financing: item.financing,
  }));

  // Invoice status data
  const invoiceStatusData = [
    { x: 'Paid', y: invoices.invoices_by_status.paid },
    { x: 'Pending', y: invoices.invoices_by_status.pending },
    { x: 'Overdue', y: invoices.invoices_by_status.overdue },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Key Financial Metrics */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Key Financial Metrics
      </Typography>
      <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`$${profits.total_revenue.toLocaleString()}`} title="Total Revenue" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`$${profits.net_income.toLocaleString()}`} title="Net Income" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`$${profits.gross_profit.toLocaleString()}`} title="Gross Profit" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`${profits.gross_margin_percentage}%`} title="Gross Margin" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 600px', minWidth: 600 }}>
          <MainCard title="Revenue Trend">
            <Chart
              options={{
                ...chartOptions,
                xaxis: {
                  categories: revenueTrendData.map((item) => item.x),
                },
              }}
              series={[
                { name: 'Revenue', data: revenueTrendData.map((item) => item.revenue) },
                { name: 'Expenses', data: revenueTrendData.map((item) => item.expenses) },
                { name: 'Profit', data: revenueTrendData.map((item) => item.profit) },
              ]}
              type={selectedChartType}
              height={300}
            />
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Expense Categories">
            <Chart
              options={{
                ...chartOptions,
                plotOptions: {
                  pie: {
                    donut: {
                      size: '60%',
                    },
                  },
                },
              }}
              series={expenseCategoryData.map((item) => item.y)}
              type="pie"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Charts Row 2 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
          <MainCard title="Cash Flow Analysis">
            <Chart
              options={{
                ...chartOptions,
                xaxis: {
                  categories: cashFlowData.map((item) => item.x),
                },
              }}
              series={[
                { name: 'Operating', data: cashFlowData.map((item) => item.operating) },
                { name: 'Investing', data: cashFlowData.map((item) => item.investing) },
                { name: 'Financing', data: cashFlowData.map((item) => item.financing) },
              ]}
              type="bar"
              height={300}
            />
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Invoice Status">
            <Chart
              options={{
                ...chartOptions,
                plotOptions: {
                  pie: {
                    donut: {
                      size: '60%',
                    },
                  },
                },
              }}
              series={invoiceStatusData.map((item) => item.y)}
              type="donut"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Expense Management with Filters */}
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
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
                <MenuItem value="Technology">Technology</MenuItem>
                <MenuItem value="Sales">Sales</MenuItem>
                <MenuItem value="Administration">Administration</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              placeholder="Min Amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              type="number"
              sx={{ width: 120 }}
            />
            <TextField
              size="small"
              placeholder="Max Amount"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              type="number"
              sx={{ width: 120 }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setMinAmount('');
                setMaxAmount('');
              }}
            >
              Clear Filters
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.description}>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={expense.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      ${expense.amount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {format(new Date(expense.date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small">
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </MainCard>

      {/* Invoice Summary */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Top Customers">
            <List>
              {invoices.top_customers.map((customer, index) => (
                <ListItem key={customer.customer} divider>
                  <ListItemAvatar>
                    <Avatar>
                      <Business />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={customer.customer}
                    secondary={`${customer.invoice_count} invoices`}
                  />
                  <Typography variant="h6" color="primary">
                    ${customer.total_amount.toLocaleString()}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Invoice Summary">
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Total Invoices</Typography>
                <Typography variant="h6">{invoices.total_invoices}</Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Total Amount</Typography>
                <Typography variant="h6" color="success.main">
                  ${invoices.total_amount.toLocaleString()}
                </Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Paid Amount</Typography>
                <Typography variant="h6" color="primary">
                  ${invoices.paid_amount.toLocaleString()}
                </Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Outstanding</Typography>
                <Typography variant="h6" color="warning.main">
                  ${invoices.outstanding_amount.toLocaleString()}
                </Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Average Invoice</Typography>
                <Typography variant="h6">
                  ${invoices.average_invoice_value.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </MainCard>
        </Box>
      </Box>
    </Box>
  );
}; 