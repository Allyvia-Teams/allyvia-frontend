import React from 'react';
import { Typography, Box, List, ListItem, ListItemText, ListItemIcon, Chip, Alert, Tabs, Tab } from '@mui/material';
import { Warning, Error, Info, Inventory } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const InventoryAlertsPanel: React.FC = () => {
  const { inventoryAlerts, lowStock, loading } = useSelector((state: RootState) => state.analytics);
  const [selectedView, setSelectedView] = React.useState<'lowStock' | 'out_of_stock'>('lowStock');

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'lowStock' | 'out_of_stock') => {
    setSelectedView(newValue);
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getFilteredAlerts = () => {
    if (!inventoryAlerts) return [];

    switch (selectedView) {
      case 'out_of_stock':
        return inventoryAlerts.out_of_stock_alerts || [];
      default:
        return inventoryAlerts.low_stock_alerts || [];
    }
  };

  const getLowStockStatus = (onHand: number, reorderPoint: number) => {
    if (onHand <= 0) return { status: 'Out of Stock', color: 'error' as const, severity: 'critical' as const };
    if (onHand <= reorderPoint) return { status: 'Critical', color: 'error' as const, severity: 'critical' as const };
    return { status: 'Low', color: 'warning' as const, severity: 'warning' as const };
  };

  const formatCurrency = (amount: number | string) => {
    const n = Number(amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(n);
  };

  if (loading) {
    return (
      <MainCard title="Inventory Alerts & Stock">
        <Skeleton variant="rectangular" height={400} />
      </MainCard>
    );
  }

  return (
    <MainCard>
      <Tabs value={selectedView} onChange={handleTabChange} variant="fullWidth">
        <Tab icon={<Warning />} label="Low" value="lowStock" iconPosition="start" />
        <Tab icon={<Error />} label="Out" value="out_of_stock" iconPosition="start" />
      </Tabs>
      {selectedView === 'lowStock' ? (
        // Low Stock View
        !lowStock || lowStock.length === 0 ? (
          <AllyviaEmpty
            isEmpty={true}
            isLoading={false}
            type="chart"
            title="No Low Stock Items"
            description="All items are well-stocked"
            height={400}
          />
        ) : (
          <Box>
            {/* Low Stock List */}
            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              <List dense>
                {lowStock.slice(0, 20).map((item, index) => {
                  const stockStatus = getLowStockStatus(item.on_hand, item.reorder_point);
                  return (
                    <ListItem key={`${item.item_id}-${index}`} sx={{ px: 0, borderBottom: '1px solid #e0e0e0' }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            {item.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              ID: {item.item_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              On Hand: {item.on_hand.toLocaleString()} | Reorder Point: {item.reorder_point.toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
                {lowStock.length > 20 && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                          ... and {lowStock.length - 20} more items
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          </Box>
        )
      ) : // Alerts View
      !inventoryAlerts || (inventoryAlerts.total_alerts_count || 0) === 0 ? (
        <AllyviaEmpty
          isEmpty={true}
          isLoading={false}
          type="chart"
          title="No Alerts"
          description="No inventory alerts at this time"
          height={400}
        />
      ) : (
        <Box>
          {/* Alerts List */}
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            <List dense>
              {getFilteredAlerts().map((alert, index) => (
                <ListItem key={`${alert.alert_type}-${alert.item_id}-${index}`} sx={{ px: 0, borderBottom: '1px solid #e0e0e0' }}>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {alert.item_name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {alert.message}
                        </Typography>
                        {alert.current_value && (
                          <Typography variant="caption" color="text.secondary">
                            Current: {formatCurrency(alert.current_value)}
                            {alert.threshold_value && ` | Threshold: ${formatCurrency(alert.threshold_value)}`}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {getFilteredAlerts().length === 0 && (
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No alerts found
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          </Box>
        </Box>
      )}
    </MainCard>
  );
};

export default InventoryAlertsPanel;
