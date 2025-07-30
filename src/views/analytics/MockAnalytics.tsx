import { useState } from 'react';
import { format } from 'utils/dateUtils';

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
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Business,
  AttachMoney,
  Assessment,
  Phone,
  Email,
  Schedule,
  Receipt,
  AccountBalance,
  ShowChart,
} from '@mui/icons-material';

// third party
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';

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

export const MockAnalytics = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  // Mock CRM data
  const mockCRMData = {
    total_contacts: 1247,
    total_leads: 89,
    total_opportunities: 45,
    total_activities: 234,
    leads_by_status: {
      new: 25,
      contacted: 18,
      qualified: 15,
      proposal: 12,
      negotiation: 8,
      closed_won: 11
    },
    leads_conversion_rate: 12.4,
    opportunities_by_stage: {
      prospecting: 8,
      qualification: 12,
      proposal: 10,
      negotiation: 8,
      closed_won: 7
    },
    total_pipeline_value: 1250000,
    weighted_pipeline_value: 875000,
    overdue_activities: 12,
    activities_by_type: {
      call: 45,
      email: 78,
      meeting: 23,
      follow_up: 34,
      demo: 15,
      proposal: 12,
      other: 27
    },
    recent_contacts: [
      { id: 1, first_name: 'John', last_name: 'Smith', email: 'john@example.com', company: 'Tech Corp', created_at: '2024-01-15' },
      { id: 2, first_name: 'Sarah', last_name: 'Johnson', email: 'sarah@example.com', company: 'Marketing Inc', created_at: '2024-01-14' },
      { id: 3, first_name: 'Mike', last_name: 'Davis', email: 'mike@example.com', company: 'Sales Co', created_at: '2024-01-13' },
      { id: 4, first_name: 'Lisa', last_name: 'Wilson', email: 'lisa@example.com', company: 'Consulting LLC', created_at: '2024-01-12' },
      { id: 5, first_name: 'David', last_name: 'Brown', email: 'david@example.com', company: 'Startup XYZ', created_at: '2024-01-11' }
    ],
    upcoming_activities: [
      { id: 1, subject: 'Follow up call', activity_type: 'call', due_date: '2024-01-16', priority: 'high', contact__first_name: 'John', contact__last_name: 'Smith' },
      { id: 2, subject: 'Product demo', activity_type: 'demo', due_date: '2024-01-17', priority: 'medium', contact__first_name: 'Sarah', contact__last_name: 'Johnson' },
      { id: 3, subject: 'Contract review', activity_type: 'meeting', due_date: '2024-01-18', priority: 'high', contact__first_name: 'Mike', contact__last_name: 'Davis' },
      { id: 4, subject: 'Proposal sent', activity_type: 'proposal', due_date: '2024-01-19', priority: 'medium', contact__first_name: 'Lisa', contact__last_name: 'Wilson' },
      { id: 5, subject: 'Discovery call', activity_type: 'call', due_date: '2024-01-20', priority: 'low', contact__first_name: 'David', contact__last_name: 'Brown' }
    ]
  };

  // Mock financial data
  const mockFinancialData = {
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
    ],
    expenses_by_category: [
      { category: 'Marketing', amount: 250000, percentage: 28.6 },
      { category: 'Operations', amount: 200000, percentage: 22.9 },
      { category: 'Technology', amount: 180000, percentage: 20.6 },
      { category: 'Sales', amount: 150000, percentage: 17.1 },
      { category: 'Administration', amount: 95000, percentage: 10.8 }
    ]
  };

  const crm = mockCRMData;
  const financial = mockFinancialData;

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

  // Lead conversion funnel data
  const leadConversionData = [
    { stage: 'NEW', count: 25 },
    { stage: 'CONTACTED', count: 18 },
    { stage: 'QUALIFIED', count: 15 },
    { stage: 'PROPOSAL', count: 12 },
    { stage: 'NEGOTIATION', count: 8 },
    { stage: 'CLOSED WON', count: 11 }
  ];

  // Activity type distribution
  const activityTypeData = [
    { x: 'CALL', y: 45 },
    { x: 'EMAIL', y: 78 },
    { x: 'MEETING', y: 23 },
    { x: 'FOLLOW UP', y: 34 },
    { x: 'DEMO', y: 15 },
    { x: 'PROPOSAL', y: 12 },
    { x: 'OTHER', y: 27 }
  ];

  // Revenue trend data
  const revenueTrendData = financial.profit_trend.map((item) => ({
    x: format(new Date(item.date), 'MMM dd'),
    revenue: item.revenue,
    expenses: item.expenses,
    profit: item.profit,
  }));

  // Expense category data
  const expenseCategoryData = financial.expenses_by_category.map((item) => ({
    x: item.category,
    y: item.amount,
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with filters */}
      <MainCard sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Analytics Dashboard</Typography>
          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={selectedTimeframe}
                label="Timeframe"
                onChange={(e) => setSelectedTimeframe(e.target.value)}
              >
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="month">This month</MenuItem>
                <MenuItem value="quarter">This quarter</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </MainCard>

      {/* CRM Metrics */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        CRM Metrics
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <MetricCard
            title="Total Contacts"
            value={crm.total_contacts.toLocaleString()}
            icon={<People />}
            color="primary"
            subtitle="All contacts in system"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <MetricCard
            title="Active Leads"
            value={crm.total_leads.toLocaleString()}
            icon={<Business />}
            color="secondary"
            subtitle="Leads in pipeline"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <MetricCard
            title="Pipeline Value"
            value={`$${crm.total_pipeline_value.toLocaleString()}`}
            icon={<AttachMoney />}
            color="success"
            subtitle="Total opportunity value"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <MetricCard
            title="Conversion Rate"
            value={`${crm.leads_conversion_rate}%`}
            icon={<Assessment />}
            color="info"
            subtitle="Lead to customer rate"
          />
        </Box>
      </Box>

      {/* Financial Metrics */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Financial Metrics
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <MetricCard
            title="Total Revenue"
            value={`$${financial.total_revenue.toLocaleString()}`}
            icon={<TrendingUp />}
            color="success"
            subtitle="Gross revenue"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <MetricCard
            title="Net Income"
            value={`$${financial.net_income.toLocaleString()}`}
            icon={<AttachMoney />}
            color="primary"
            subtitle="After expenses"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <MetricCard
            title="Gross Profit"
            value={`$${financial.gross_profit.toLocaleString()}`}
            icon={<AccountBalance />}
            color="info"
            subtitle="Revenue - COGS"
          />
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <MetricCard
            title="Gross Margin"
            value={`${financial.gross_margin_percentage}%`}
            icon={<Assessment />}
            color="secondary"
            subtitle="Profit margin"
          />
        </Box>
      </Box>

      {/* Charts Row 1 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Lead Conversion Funnel">
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Stage</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Conversion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leadConversionData.map((row, index) => {
                    const conversionRate = index === 0 ? 100 : 
                      ((row.count / leadConversionData[0].count) * 100).toFixed(1);
                    return (
                      <TableRow key={row.stage}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={row.stage} 
                              size="small" 
                              color={index === leadConversionData.length - 1 ? 'success' : 'default'}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">{conversionRate}%</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={parseFloat(conversionRate.toString())} 
                              sx={{ width: 60, height: 6 }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Activity Distribution">
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
              series={activityTypeData.map((item) => item.y)}
              type="donut"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Charts Row 2 */}
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
              type="line"
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

      {/* Recent Activity */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Recent Contacts">
            <List>
              {crm.recent_contacts?.slice(0, 5).map((contact) => (
                <ListItem key={contact.id} divider>
                  <ListItemAvatar>
                    <Avatar>
                      {contact.first_name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${contact.first_name} ${contact.last_name}`}
                    secondary={contact.company || contact.email}
                  />
                  <Chip
                    label="lead"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </ListItem>
              ))}
            </List>
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Upcoming Activities">
            <List>
              {crm.upcoming_activities?.slice(0, 5).map((activity) => (
                <ListItem key={activity.id} divider>
                  <ListItemAvatar>
                    <Avatar>
                      {activity.activity_type === 'call' ? <Phone /> : 
                       activity.activity_type === 'email' ? <Email /> : 
                       activity.activity_type === 'meeting' ? <Schedule /> : <Business />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.subject}
                    secondary={`${activity.contact__first_name} ${activity.contact__last_name} - ${format(new Date(activity.due_date), 'MMM dd, yyyy')}`}
                  />
                  <Chip
                    label={activity.priority}
                    size="small"
                    color={activity.priority === 'high' ? 'error' : activity.priority === 'medium' ? 'warning' : 'default'}
                  />
                </ListItem>
              ))}
            </List>
          </MainCard>
        </Box>
      </Box>
    </Box>
  );
}; 