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
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Work,
  Assessment,
  Schedule,
  AttachMoney,
  ShowChart,
  PieChart,
  MoreVert,
  Search,
  FilterList,
  DateRange,
  Business,
  Category,
  LocationOn,
  School,
  Star
} from '@mui/icons-material';

// third party
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';
import { COLORS } from '../../styles/colors';

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
              {change >= 0 ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
              <Typography variant="body2" color={change >= 0 ? 'success.main' : 'error.main'} ml={0.5}>
                {Math.abs(change)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

interface EmployeeAnalyticsProps {
  dateRange?: RangeValue;
  isLoading?: boolean;
  selectedChartType?: 'line' | 'area' | 'bar';
}

export const EmployeeAnalytics = ({ dateRange, isLoading, selectedChartType = 'line' }: EmployeeAnalyticsProps) => {
  const analyticsWidgetsSm = {
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedExperience, setSelectedExperience] = useState('all');

  // Mock employee data
  const mockEmployeeData = {
    total_employees: 45,
    active_employees: 42,
    new_hires: 8,
    turnover_rate: 5.2,
    average_salary: 75000,
    total_salary_expense: 3150000,
    employees_by_department: [
      { department: 'Engineering', count: 15, avg_salary: 85000 },
      { department: 'Sales', count: 12, avg_salary: 65000 },
      { department: 'Marketing', count: 8, avg_salary: 70000 },
      { department: 'Operations', count: 6, avg_salary: 60000 },
      { department: 'HR', count: 4, avg_salary: 55000 }
    ],
    employees_by_location: [
      { location: 'San Francisco', count: 20, avg_salary: 90000 },
      { location: 'New York', count: 12, avg_salary: 85000 },
      { location: 'Remote', count: 13, avg_salary: 65000 }
    ],
    employees_by_experience: [
      { level: 'Junior (0-2 years)', count: 12, avg_salary: 55000 },
      { level: 'Mid-level (3-5 years)', count: 18, avg_salary: 75000 },
      { level: 'Senior (6-10 years)', count: 10, avg_salary: 95000 },
      { level: 'Lead (10+ years)', count: 5, avg_salary: 120000 }
    ],
    performance_metrics: {
      average_performance_score: 4.2,
      high_performers: 12,
      average_performers: 25,
      low_performers: 5
    },
    employee_list: [
      {
        id: 1,
        name: 'John Smith',
        department: 'Engineering',
        location: 'San Francisco',
        experience: 'Senior (6-10 years)',
        salary: 95000,
        performance: 4.5,
        hire_date: '2022-03-15'
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        department: 'Sales',
        location: 'New York',
        experience: 'Mid-level (3-5 years)',
        salary: 70000,
        performance: 4.2,
        hire_date: '2023-01-10'
      },
      {
        id: 3,
        name: 'Mike Davis',
        department: 'Marketing',
        location: 'Remote',
        experience: 'Junior (0-2 years)',
        salary: 60000,
        performance: 3.8,
        hire_date: '2023-06-20'
      },
      {
        id: 4,
        name: 'Lisa Wilson',
        department: 'Engineering',
        location: 'San Francisco',
        experience: 'Lead (10+ years)',
        salary: 125000,
        performance: 4.8,
        hire_date: '2021-09-05'
      },
      {
        id: 5,
        name: 'David Brown',
        department: 'Operations',
        location: 'New York',
        experience: 'Mid-level (3-5 years)',
        salary: 65000,
        performance: 4.0,
        hire_date: '2022-11-12'
      },
      {
        id: 6,
        name: 'Emma Taylor',
        department: 'Sales',
        location: 'Remote',
        experience: 'Senior (6-10 years)',
        salary: 85000,
        performance: 4.3,
        hire_date: '2022-05-18'
      },
      {
        id: 7,
        name: 'Alex Chen',
        department: 'Engineering',
        location: 'San Francisco',
        experience: 'Mid-level (3-5 years)',
        salary: 80000,
        performance: 4.1,
        hire_date: '2023-02-28'
      },
      {
        id: 8,
        name: 'Maria Garcia',
        department: 'HR',
        location: 'New York',
        experience: 'Junior (0-2 years)',
        salary: 55000,
        performance: 3.9,
        hire_date: '2023-08-15'
      }
    ],
    salary_trend: [
      { month: 'Jan', avg_salary: 72000, total_expense: 3024000 },
      { month: 'Feb', avg_salary: 72500, total_expense: 3045000 },
      { month: 'Mar', avg_salary: 73000, total_expense: 3066000 },
      { month: 'Apr', avg_salary: 73500, total_expense: 3087000 },
      { month: 'May', avg_salary: 74000, total_expense: 3108000 },
      { month: 'Jun', avg_salary: 74500, total_expense: 3129000 },
      { month: 'Jul', avg_salary: 75000, total_expense: 3150000 }
    ],
    hiring_trend: [
      { month: 'Jan', new_hires: 2, departures: 1 },
      { month: 'Feb', new_hires: 1, departures: 0 },
      { month: 'Mar', new_hires: 3, departures: 1 },
      { month: 'Apr', new_hires: 0, departures: 2 },
      { month: 'May', new_hires: 2, departures: 0 },
      { month: 'Jun', new_hires: 0, departures: 1 },
      { month: 'Jul', new_hires: 0, departures: 0 }
    ]
  };

  const employees = mockEmployeeData;

  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    let filtered = employees.employee_list;

    if (searchTerm) {
      filtered = filtered.filter(
        (employee) =>
          employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter((employee) => employee.department === selectedDepartment);
    }

    if (selectedLocation !== 'all') {
      filtered = filtered.filter((employee) => employee.location === selectedLocation);
    }

    if (selectedExperience !== 'all') {
      filtered = filtered.filter((employee) => employee.experience === selectedExperience);
    }

    return filtered;
  }, [employees.employee_list, searchTerm, selectedDepartment, selectedLocation, selectedExperience]);

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    dataLabels: { enabled: false },
    grid: { show: true },
    colors: [COLORS.primaryBlue, COLORS.orange500, COLORS.lightGreen500, COLORS.red500, COLORS.deepPurple900],
    legend: {
      position: 'top',
      horizontalAlign: 'right'
    }
  };

  // Department distribution data
  const departmentData = employees.employees_by_department.map((dept) => ({
    x: dept.department,
    y: dept.count
  }));

  // Location distribution data
  const locationData = employees.employees_by_location.map((loc) => ({
    x: loc.location,
    y: loc.count
  }));

  // Experience level data
  const experienceData = employees.employees_by_experience.map((exp) => ({
    x: exp.level,
    y: exp.count
  }));

  // Salary trend data
  const salaryTrendData = employees.salary_trend.map((item) => ({
    x: item.month,
    avg_salary: item.avg_salary,
    total_expense: item.total_expense
  }));

  // Hiring trend data
  const hiringTrendData = employees.hiring_trend.map((item) => ({
    x: item.month,
    new_hires: item.new_hires,
    departures: item.departures
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Key Employee Metrics */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Key Employee Metrics
      </Typography>
      <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={employees.total_employees} title="Total Employees" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`$${employees.average_salary.toLocaleString()}`} title="Average Salary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`${employees.turnover_rate}%`} title="Turnover Rate" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            {...analyticsWidgetsSm}
            value={employees.performance_metrics.average_performance_score}
            title="Performance Score"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 600px', minWidth: 600 }}>
          <MainCard title="Salary Trend">
            <Chart
              options={{
                ...chartOptions,
                xaxis: {
                  categories: salaryTrendData.map((item) => item.x)
                }
              }}
              series={[
                { name: 'Average Salary', data: salaryTrendData.map((item) => item.avg_salary) },
                { name: 'Total Expense', data: salaryTrendData.map((item) => item.total_expense / 1000) }
              ]}
              type={selectedChartType}
              height={300}
            />
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Department Distribution">
            <Chart
              options={{
                ...chartOptions,
                plotOptions: {
                  pie: {
                    donut: {
                      size: '60%'
                    }
                  }
                }
              }}
              series={departmentData.map((item) => item.y)}
              type="pie"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Charts Row 2 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
          <MainCard title="Hiring Trend">
            <Chart
              options={{
                ...chartOptions,
                xaxis: {
                  categories: hiringTrendData.map((item) => item.x)
                }
              }}
              series={[
                { name: 'New Hires', data: hiringTrendData.map((item) => item.new_hires) },
                { name: 'Departures', data: hiringTrendData.map((item) => item.departures) }
              ]}
              type="bar"
              height={300}
            />
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Experience Levels">
            <Chart
              options={{
                ...chartOptions,
                plotOptions: {
                  pie: {
                    donut: {
                      size: '60%'
                    }
                  }
                }
              }}
              series={experienceData.map((item) => item.y)}
              type="donut"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Employee Management with Filters */}
      <MainCard title="Employee Management" sx={{ mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Employee Filters
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setSelectedLocation('all');
                setSelectedExperience('all');
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
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Experience</TableCell>
                <TableCell align="right">Salary</TableCell>
                <TableCell align="center">Performance</TableCell>
                <TableCell align="center">Hire Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32 }}>{employee.name.charAt(0)}</Avatar>
                      <Typography variant="body2" fontWeight="medium">
                        {employee.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={employee.department} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <LocationOn fontSize="small" color="action" />
                      {employee.location}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {employee.experience}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      ${employee.salary.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Star fontSize="small" color="warning" />
                      <Typography variant="body2">{employee.performance}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">{format(new Date(employee.hire_date), 'MMM dd, yyyy')}</TableCell>
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

      {/* Performance Summary */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Performance Distribution">
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">High Performers</Typography>
                <Typography variant="h6" color="success.main">
                  {employees.performance_metrics.high_performers}
                </Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Average Performers</Typography>
                <Typography variant="h6" color="primary">
                  {employees.performance_metrics.average_performers}
                </Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Low Performers</Typography>
                <Typography variant="h6" color="warning.main">
                  {employees.performance_metrics.low_performers}
                </Typography>
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body1">Average Score</Typography>
                <Typography variant="h6">{employees.performance_metrics.average_performance_score}/5.0</Typography>
              </Box>
            </Box>
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Location Distribution">
            <List>
              {employees.employees_by_location.map((location, index) => (
                <ListItem key={location.location} divider>
                  <ListItemAvatar>
                    <Avatar>
                      <LocationOn />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={location.location} secondary={`${location.count} employees`} />
                  <Typography variant="h6" color="primary">
                    ${location.avg_salary.toLocaleString()}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </MainCard>
        </Box>
      </Box>
    </Box>
  );
};
