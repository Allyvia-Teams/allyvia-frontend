import React from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store';
import { fetchInventoryItemsTreeMap } from 'store/slices/analytics';
import { TopItems, LowStock, InventoryTreemap } from 'ui-component/analytics/inventory';
import InventoryTrends from 'ui-component/inventory/widgets/InventoryTrends';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface InventoryAnalyticsProps {
  dateRange: RangeValue;
  isLoading: boolean;
}

const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ dateRange, isLoading }) => {
  const dispatch = useDispatch();
  const {
    summary,
    topItems,
    lowStock,
    inventorySummary: analyticsInventorySummary,
    inventoryCategories,
    inventoryLocations,
    inventoryTypes,
    inventoryAlerts,
    inventoryTrends
  } = useSelector((state: RootState) => state.analytics);

  // Fetch treemap data on mount/date change
  React.useEffect(() => {
    dispatch(fetchInventoryItemsTreeMap(undefined) as any);
  }, [dispatch, dateRange?.start, dateRange?.end]);

  // Inventory KPIs using new analytics data
  const inventoryKpis = [
    {
      title: 'Total Inventory Value',
      value: analyticsInventorySummary?.total_inventory_value || 0,
      currency: analyticsInventorySummary?.currency || 'USD',
      theme: 'default' as const,
      trend: 'neutral' as const
    },
    {
      title: 'Total Cost Value',
      value: (analyticsInventorySummary as any)?.total_cost_value || 0,
      currency: analyticsInventorySummary?.currency || 'USD',
      theme: 'default' as const,
      trend: 'neutral' as const
    },
    {
      title: 'Total Items',
      value: analyticsInventorySummary?.total_items || 0,
      theme: 'default' as const,
      trend: 'neutral' as const
    }
    // {
    //   title: 'Average Profit Margin',
    //   value: analyticsInventorySummary?.average_profit_margin || 0,
    //   theme: 'default' as const,
    //   trend: 'neutral' as const
    // },
    // {
    //   title: 'Low Stock Items',
    //   value: (analyticsInventorySummary as any)?.low_stock_count || 0,
    //   theme: 'alert' as const,
    //   trend: 'down' as const
    // },
    // {
    //   title: 'Out of Stock',
    //   value: (analyticsInventorySummary as any)?.out_of_stock_count || 0,
    //   theme: 'alert' as const,
    //   trend: 'down' as const
    // },
    // {
    //   title: 'Active Items',
    //   value: (analyticsInventorySummary as any)?.active_items ?? (analyticsInventorySummary as any)?.active_items_count ?? 0,
    //   theme: 'success' as const,
    //   trend: 'up' as const
    // },
    // {
    //   title: 'Inactive Items',
    //   value: (analyticsInventorySummary as any)?.inactive_items ?? (analyticsInventorySummary as any)?.inactive_items_count ?? 0,
    //   theme: 'default' as const,
    //   trend: 'neutral' as const
    // },
    // {
    //   title: 'Taxable Items',
    //   value: (analyticsInventorySummary as any)?.taxable_items ?? (analyticsInventorySummary as any)?.taxable_items_count ?? 0,
    //   theme: 'default' as const,
    //   trend: 'neutral' as const
    // },
    // {
    //   title: 'Non‑Taxable Items',
    //   value: (analyticsInventorySummary as any)?.non_taxable_items ?? (analyticsInventorySummary as any)?.non_taxable_items_count ?? 0,
    //   theme: 'default' as const,
    //   trend: 'neutral' as const
    // }
  ];

  return (
    <Grid container spacing={3}>
      {/* Inventory KPIs */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {inventoryKpis.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 2 }} key={index}>
              <AllyviaStats
                title={kpi.title}
                value={
                  kpi.currency
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: kpi.currency
                      }).format(kpi.value || 0)
                    : (kpi.value || 0).toLocaleString()
                }
                theme={kpi.theme}
                size="medium"
              />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Inventory Trends Widget (from consolidated analytics) */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Inventory Distribution by Category
            </Typography>
            <InventoryTrends height={400} />
          </CardContent>
        </Card>
      </Grid>
      {/* Inventory Treemap (Products grouped by Category) */}
      <Grid size={{ xs: 12 }}>
        <InventoryTreemap />
      </Grid>
      {/* Top Items Component */}
      <Grid size={{ xs: 12, md: 6 }}>
        <TopItems />
      </Grid>

      {/* Low Stock Component */}
      <Grid size={{ xs: 12, md: 6 }}>
        <LowStock />
      </Grid>

      {/* Inventory Categories - Compact Table */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Categories Distribution
            </Typography>
            {inventoryCategories && inventoryCategories.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(inventoryCategories || []).map((c) => (
                      <TableRow key={c.category}>
                        <TableCell>{c.category}</TableCell>
                        <TableCell align="right">{(c.item_count || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(c.total_quantity || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">${Number(c.total_value || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="textSecondary">No category data available</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Inventory Locations - Compact Table */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Locations Distribution
            </Typography>
            {inventoryLocations && inventoryLocations.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Location</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(inventoryLocations || []).map((l) => (
                      <TableRow key={l.location}>
                        <TableCell>{l.location}</TableCell>
                        <TableCell align="right">{(l.item_count || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(l.total_quantity || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">${Number(l.total_value || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="textSecondary">No location data available</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Inventory Types - Compact Table */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Item Types Distribution
            </Typography>
            {inventoryTypes && inventoryTypes.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Total Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(inventoryTypes || []).map((t) => (
                      <TableRow key={t.item_type}>
                        <TableCell>{t.item_type}</TableCell>
                        <TableCell align="right">{(t.item_count || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(t.total_quantity || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">${Number(t.total_value || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="textSecondary">No type data available</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Inventory Alerts - Detailed list */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Alerts Summary
            </Typography>
            {inventoryAlerts ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Total: {inventoryAlerts.total_alerts_count || 0}
                </Typography>
                <Tabs value={0} variant="scrollable" scrollButtons="auto">
                  <Tab label={`Low Stock (${inventoryAlerts.low_stock_alerts?.length || 0})`} />
                  <Tab label={`Out of Stock (${inventoryAlerts.out_of_stock_alerts?.length || 0})`} />
                  <Tab label={`High Value (${inventoryAlerts.high_value_alerts?.length || 0})`} />
                  <Tab label={`Zero Price (${inventoryAlerts.zero_price_alerts?.length || 0})`} />
                </Tabs>
                <Box sx={{ mt: 2, maxHeight: 220, overflowY: 'auto' }}>
                  {(inventoryAlerts.low_stock_alerts || []).map((a) => (
                    <Box key={`${a.alert_type}-${a.item_id}`} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">{a.item_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.message}
                      </Typography>
                    </Box>
                  ))}
                  {(!inventoryAlerts.low_stock_alerts || inventoryAlerts.low_stock_alerts.length === 0) && (
                    <Typography variant="caption" color="text.secondary">
                      No low stock alerts
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : (
              <Typography color="textSecondary">No alert data available</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default InventoryAnalytics;
