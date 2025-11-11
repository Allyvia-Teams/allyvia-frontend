import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { LocalFireDepartment, TrendingDown, CheckCircle, TrendingUp, Remove, InfoOutlined } from '@mui/icons-material';
import AllyviaFilterSelect from 'ui-component/common/AllyviaFilterSelect';
import AllyviaChip from 'ui-component/common/AllyviaChip';
import { ForecastDay } from 'types/analytics';

interface NextWeekForecastTableProps {
  forecast: ForecastDay[];
  meta?: {
    total_days_available?: number;
    forecast_method?: string;
  };
  overallConfidence?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: string;
  selectedValue: string;
}

function TabPanel({ children, value, selectedValue }: TabPanelProps) {
  return <div hidden={value !== selectedValue}>{value === selectedValue && children}</div>;
}

export default function NextWeekForecastTable({ forecast, meta, overallConfidence }: NextWeekForecastTableProps) {
  const [selectedDay, setSelectedDay] = useState<string>(forecast[0]?.date || '');
  const [itemFilter, setItemFilter] = useState<string>('forecast');

  if (!forecast || forecast.length === 0) return null;

  const itemFilterOptions = [
    { value: 'forecast', label: 'Forecasted Items' },
    { value: 'all', label: 'All Items' }
  ];

  const handleItemFilterChange = (event: SelectChangeEvent) => {
    setItemFilter(event.target.value);
  };

  const getConfidenceTooltip = () => {
    const daysOfData = meta?.total_days_available || 0;
    const confidence = overallConfidence || 50;
    const method = meta?.forecast_method || 'simple';

    if (method === 'holt_winters') {
      return `Based on ${daysOfData} days of historical data, our Holt-Winters forecasting model predicts this outcome with ${confidence}% confidence. High-quality seasonal patterns detected.`;
    }
    return `Based on ${daysOfData} days of historical data, our weighted seasonal model predicts this outcome with ${confidence}% confidence. Accuracy improves with 30+ days of data.`;
  };

  const getFilteredItems = (items?: any[]) => {
    if (!items) return [];
    if (itemFilter === 'all') return items;
    return items.filter((item) => item.quantity > 0);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedDay(newValue);
  };

  const selectedForecast = forecast.find((f) => f.date === selectedDay) || forecast[0];

  const getActionText = (inventoryItems: any[]) => {
    const needsStocking = inventoryItems.some((item) => item.stock_needed > 0);

    if (needsStocking) {
      return {
        text: 'Stock up',
        color: 'error' as const,
        icon: <LocalFireDepartment fontSize="small" />
      };
    }
    return {
      text: 'Plenty of stock',
      color: 'success' as const,
      icon: <CheckCircle fontSize="small" />
    };
  };

  const totalExpected = forecast.reduce((sum, f) => sum + f.expected_units, 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderGrowth = (growth: number | null) => {
    if (growth === null) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
          <Remove fontSize="small" />
          <Typography variant="body2">N/A</Typography>
        </Box>
      );
    }

    const isPositive = growth > 0;
    const color = isPositive ? 'success.main' : growth < 0 ? 'error.main' : 'text.secondary';
    const Icon = isPositive ? TrendingUp : growth < 0 ? TrendingDown : Remove;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color }}>
        <Icon fontSize="small" />
        <Typography variant="body2">
          {isPositive ? '+' : ''}
          {growth.toFixed(1)}%
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" component="span">
            Next Week Forecast
          </Typography>
          <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
            (Click a day to see what to stock)
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Show:
          </Typography>
          <AllyviaFilterSelect height={32} width={160} value={itemFilter} onChange={handleItemFilterChange} options={itemFilterOptions} />
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={selectedDay}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minWidth: { xs: 100, sm: 120 },
              textTransform: 'none',
              flex: 1
            }
          }}
        >
          {forecast.map((day) => (
            <Tab
              key={day.date}
              value={day.date}
              label={
                <Box textAlign="center">
                  <Typography variant="body2" fontWeight="medium">
                    {day.day}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(day.date)}
                  </Typography>
                  <Typography variant="caption" display="block" color="primary">
                    {Math.round(day.expected_units)} items
                  </Typography>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {forecast.map((day) => (
        <TabPanel key={day.date} value={day.date} selectedValue={selectedDay}>
          {(() => {
            const inventoryItems = getFilteredItems(
              day.inventory_items || day.item_breakdown?.filter((i) => i.item_type !== 'Service') || []
            );
            const serviceItems = getFilteredItems(day.service_items || day.item_breakdown?.filter((i) => i.item_type === 'Service') || []);
            const action = getActionText(inventoryItems);

            return (
              <>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', mb: 1.5 }}>
                  <AllyviaChip icon={action.icon} label={action.text} color={action.color} />
                  <AllyviaChip
                    icon={<InfoOutlined fontSize="small" />}
                    label={`Confidence: ${overallConfidence?.toFixed(0) || 50}%`}
                    variant="outlined"
                    color="primary"
                    tooltipTitle={getConfidenceTooltip()}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Inventory Products
                  </Typography>
                  {inventoryItems.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell align="center">Current Stock</TableCell>
                            <TableCell align="center">Forecast</TableCell>
                            <TableCell align="center">Stock Needed</TableCell>
                            <TableCell align="center">vs Last Week</TableCell>
                            <TableCell align="center">vs Last Month</TableCell>
                            <TableCell align="center">vs All Time</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {inventoryItems.map((item, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>{item.item_name}</TableCell>
                              <TableCell align="center">{item.current_stock} units</TableCell>
                              <TableCell align="center">
                                <strong>{item.quantity} units</strong>
                              </TableCell>
                              <TableCell align="center">
                                {item.stock_needed > 0 ? (
                                  <Typography color="error" fontWeight="medium">
                                    +{item.stock_needed}
                                  </Typography>
                                ) : (
                                  <Typography color="success.main">Sufficient</Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">{renderGrowth(item.growth_vs_last_week)}</TableCell>
                              <TableCell align="center">{renderGrowth(item.growth_vs_last_month)}</TableCell>
                              <TableCell align="center">{renderGrowth(item.growth_vs_all_time)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {itemFilter === 'all'
                          ? 'No inventory items for this day.'
                          : 'No inventory items with forecast for this day. Switch to "All Items" to see all items.'}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box>
                  <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Service Demand
                  </Typography>
                  {serviceItems.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Service</TableCell>
                            <TableCell align="center">Forecast</TableCell>
                            <TableCell align="center">vs Last Week</TableCell>
                            <TableCell align="center">vs Last Month</TableCell>
                            <TableCell align="center">vs All Time</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {serviceItems.map((item, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell>{item.item_name}</TableCell>
                              <TableCell align="center">
                                <strong>{item.quantity} jobs</strong>
                              </TableCell>
                              <TableCell align="center">{renderGrowth(item.growth_vs_last_week)}</TableCell>
                              <TableCell align="center">{renderGrowth(item.growth_vs_last_month)}</TableCell>
                              <TableCell align="center">{renderGrowth(item.growth_vs_all_time)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        No services in forecast
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            );
          })()}
        </TabPanel>
      ))}

      <Box sx={{ mt: 2, py: 1, px: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
        <Typography variant="body2" fontWeight="medium">
          Total week forecast: ~{Math.round(totalExpected)} items
        </Typography>
      </Box>
    </Box>
  );
}
