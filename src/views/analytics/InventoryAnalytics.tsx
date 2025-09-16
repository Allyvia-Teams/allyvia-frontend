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
  MenuItem,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Inventory,
  ShoppingCart,
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
  Star,
  Warning,
  CheckCircle,
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

interface InventoryAnalyticsProps {
  dateRange?: RangeValue;
  isLoading?: boolean;
  selectedChartType?: 'line' | 'area' | 'bar';
}

export const InventoryAnalytics = ({ dateRange, isLoading, selectedChartType = 'line' }: InventoryAnalyticsProps) => {
  const analyticsWidgetsSm = {
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock inventory data
  const mockInventoryData = {
    total_items: 1250,
    total_value: 450000,
    low_stock_items: 45,
    out_of_stock_items: 12,
    average_item_value: 360,
    inventory_turnover_rate: 4.2,
    items_by_category: [
      { category: 'Electronics', count: 320, value: 180000, avg_value: 562 },
      { category: 'Office Supplies', count: 450, value: 90000, avg_value: 200 },
      { category: 'Furniture', count: 180, value: 120000, avg_value: 667 },
      { category: 'Software', count: 200, value: 40000, avg_value: 200 },
      { category: 'Books', count: 100, value: 20000, avg_value: 200 }
    ],
    items_by_location: [
      { location: 'Warehouse A', count: 600, value: 250000 },
      { location: 'Warehouse B', count: 400, value: 150000 },
      { location: 'Office Storage', count: 250, value: 50000 }
    ],
    items_by_status: [
      { status: 'In Stock', count: 1100, value: 400000 },
      { status: 'Low Stock', count: 100, value: 35000 },
      { status: 'Out of Stock', count: 50, value: 15000 }
    ],
    inventory_list: [
      { id: 1, name: 'Laptop Dell XPS 13', category: 'Electronics', location: 'Warehouse A', status: 'In Stock', quantity: 25, value: 1200, last_updated: '2024-01-15' },
      { id: 2, name: 'Office Chair Ergonomic', category: 'Furniture', location: 'Warehouse B', status: 'Low Stock', quantity: 3, value: 350, last_updated: '2024-01-14' },
      { id: 3, name: 'Printer HP LaserJet', category: 'Electronics', location: 'Warehouse A', status: 'In Stock', quantity: 15, value: 450, last_updated: '2024-01-13' },
      { id: 4, name: 'Notebooks (Pack of 10)', category: 'Office Supplies', location: 'Office Storage', status: 'In Stock', quantity: 50, value: 25, last_updated: '2024-01-12' },
      { id: 5, name: 'Adobe Creative Suite', category: 'Software', location: 'Warehouse A', status: 'Out of Stock', quantity: 0, value: 500, last_updated: '2024-01-11' },
      { id: 6, name: 'Standing Desk', category: 'Furniture', location: 'Warehouse B', status: 'In Stock', quantity: 8, value: 800, last_updated: '2024-01-10' },
      { id: 7, name: 'Wireless Mouse', category: 'Electronics', location: 'Office Storage', status: 'Low Stock', quantity: 5, value: 30, last_updated: '2024-01-09' },
      { id: 8, name: 'Project Management Book', category: 'Books', location: 'Office Storage', status: 'In Stock', quantity: 12, value: 45, last_updated: '2024-01-08' }
    ],
    inventory_trend: [
      { month: 'Jan', total_items: 1200, total_value: 430000, new_items: 50, sold_items: 30 },
      { month: 'Feb', total_items: 1220, total_value: 435000, new_items: 45, sold_items: 25 },
      { month: 'Mar', total_items: 1240, total_value: 440000, new_items: 40, sold_items: 20 },
      { month: 'Apr', total_items: 1250, total_value: 445000, new_items: 35, sold_items: 25 },
      { month: 'May', total_items: 1260, total_value: 448000, new_items: 30, sold_items: 20 },
      { month: 'Jun', total_items: 1270, total_value: 450000, new_items: 25, sold_items: 20 },
      { month: 'Jul', total_items: 1250, total_value: 450000, new_items: 20, sold_items: 40 }
    ],
    top_selling_items: [
      { name: 'Laptop Dell XPS 13', category: 'Electronics', units_sold: 15, revenue: 18000 },
      { name: 'Office Chair Ergonomic', category: 'Furniture', units_sold: 12, revenue: 4200 },
      { name: 'Printer HP LaserJet', category: 'Electronics', units_sold: 8, revenue: 3600 },
      { name: 'Adobe Creative Suite', category: 'Software', units_sold: 6, revenue: 3000 },
      { name: 'Standing Desk', category: 'Furniture', units_sold: 5, revenue: 4000 }
    ],
    low_stock_alerts: [
      { item: 'Office Chair Ergonomic', current_stock: 3, reorder_point: 5, days_until_stockout: 7 },
      { item: 'Wireless Mouse', current_stock: 5, reorder_point: 10, days_until_stockout: 14 },
      { item: 'Adobe Creative Suite', current_stock: 0, reorder_point: 2, days_until_stockout: 0 },
      { item: 'Project Management Book', current_stock: 12, reorder_point: 15, days_until_stockout: 30 }
    ]
  };

  const inventory = mockInventoryData;

  // Filter inventory based on search and filters
  const filteredInventory = useMemo(() => {
    let filtered = inventory.inventory_list;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(item => item.location === selectedLocation);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }
    
    return filtered;
  }, [inventory.inventory_list, searchTerm, selectedCategory, selectedLocation, selectedStatus]);

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

  // Category distribution data
  const categoryData = inventory.items_by_category.map((cat) => ({
    x: cat.category,
    y: cat.count,
  }));

  // Location distribution data
  const locationData = inventory.items_by_location.map((loc) => ({
    x: loc.location,
    y: loc.count,
  }));

  // Status distribution data
  const statusData = inventory.items_by_status.map((status) => ({
    x: status.status,
    y: status.count,
  }));

  // Inventory trend data
  const inventoryTrendData = inventory.inventory_trend.map((item) => ({
    x: item.month,
    total_items: item.total_items,
    total_value: item.total_value,
    new_items: item.new_items,
    sold_items: item.sold_items,
  }));

  return (
    <Box sx={{ p: 3 }}>
      {/* Key Inventory Metrics */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Key Inventory Metrics
      </Typography>
      <Grid container spacing={gridSpacing} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={inventory.total_items.toLocaleString()} title="Total Items" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={`$${inventory.total_value.toLocaleString()}`} title="Total Value" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={inventory.low_stock_items} title="Low Stock Items" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard {...analyticsWidgetsSm} value={inventory.inventory_turnover_rate} title="Turnover Rate" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 600px', minWidth: 600 }}>
          <MainCard title="Inventory Trend">
            <Chart
              options={{
                ...chartOptions,
                xaxis: {
                  categories: inventoryTrendData.map((item) => item.x),
                },
              }}
              series={[
                { name: 'Total Items', data: inventoryTrendData.map((item) => item.total_items) },
                { name: 'Total Value', data: inventoryTrendData.map((item) => item.total_value / 1000) },
                { name: 'New Items', data: inventoryTrendData.map((item) => item.new_items) },
                { name: 'Sold Items', data: inventoryTrendData.map((item) => item.sold_items) },
              ]}
              type={selectedChartType}
              height={300}
            />
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Category Distribution">
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
              series={categoryData.map((item) => item.y)}
              type="pie"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Charts Row 2 */}
      <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
          <MainCard title="Location Distribution">
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
              series={locationData.map((item) => item.y)}
              type="donut"
              height={300}
            />
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <MainCard title="Stock Status">
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
              series={statusData.map((item) => item.y)}
              type="donut"
              height={300}
            />
          </MainCard>
        </Box>
      </Box>

      {/* Inventory Management with Filters */}
      <MainCard title="Inventory Management" sx={{ mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Inventory Filters
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              placeholder="Search inventory..."
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

            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedLocation('all');
                setSelectedStatus('all');
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
                <TableCell>Item</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell align="center">Last Updated</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <LocationOn fontSize="small" color="action" />
                      {item.location}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      size="small"
                      color={
                        item.status === 'In Stock' ? 'success' :
                        item.status === 'Low Stock' ? 'warning' : 'error'
                      }
                      icon={
                        item.status === 'In Stock' ? <CheckCircle /> :
                        item.status === 'Low Stock' ? <Warning /> : <Warning />
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {item.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      ${item.value.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {format(new Date(item.last_updated), 'MMM dd, yyyy')}
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

      {/* Alerts and Top Items */}
      <Box display="flex" flexWrap="wrap" gap={3}>
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Low Stock Alerts">
            <List>
              {inventory.low_stock_alerts.map((alert, index) => (
                <ListItem key={index} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alert.current_stock === 0 ? 'error.light' : 'warning.light' }}>
                      <Warning />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={alert.item}
                    secondary={`Current: ${alert.current_stock} | Reorder: ${alert.reorder_point}`}
                  />
                  <Typography variant="body2" color="error.main">
                    {alert.days_until_stockout === 0 ? 'Out of Stock' : `${alert.days_until_stockout} days`}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </MainCard>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <MainCard title="Top Selling Items">
            <List>
              {inventory.top_selling_items.map((item, index) => (
                <ListItem key={index} divider>
                  <ListItemAvatar>
                    <Avatar>
                      <ShoppingCart />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.name}
                    secondary={`${item.units_sold} units sold`}
                  />
                  <Typography variant="h6" color="success.main">
                    ${item.revenue.toLocaleString()}
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