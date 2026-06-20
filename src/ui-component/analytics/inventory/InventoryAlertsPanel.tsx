import React from 'react';
import { Typography, Box, List, ListItem, ListItemText, Tabs, Tab } from '@mui/material';
import { Warning, Error } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const InventoryAlertsPanel: React.FC = () => {
  const { inventoryAlerts, lowStock, loading } = useSelector((state: RootState) => state.analytics);
  const [selectedView, setSelectedView] = React.useState<'lowStock' | 'out_of_stock'>('lowStock');

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'lowStock' | 'out_of_stock') => {
    setSelectedView(newValue);
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

  const formatCurrency = (amount: number | string) => {
    const n = Number(amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(n);
  };

  return (
    <MainCard>
      <Tabs value={selectedView} onChange={handleTabChange} variant="fullWidth">
        <Tab icon={<Warning />} label="Low" value="lowStock" iconPosition="start" />
        <Tab icon={<Error />} label="Out" value="out_of_stock" iconPosition="start" />
      </Tabs>
      {selectedView === 'lowStock' ? (
        // Low Stock View
        <AllyviaEmpty isLoading={loading} isEmpty={!lowStock || lowStock.length === 0} type="chart" height={400}>
          {!lowStock || lowStock.length === 0 ? null : (
            <Box>
              {/* Low Stock List */}
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                <List dense>
                  {lowStock.slice(0, 20).map((item, index) => {
                    return (
                      <ListItem key={`${item.item_id}-${index}`} sx={{ px: 0, borderBottom: 1, borderColor: 'divider' }}>
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
          )}
        </AllyviaEmpty>
      ) : (
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={!inventoryAlerts || (inventoryAlerts.total_alerts_count || 0) === 0}
          type="chart"
          height={400}
        >
          {!inventoryAlerts || (inventoryAlerts.total_alerts_count || 0) === 0 ? null : (
            <Box>
              {/* Alerts List */}
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                <List dense>
                  {getFilteredAlerts().map((alert, index) => (
                    <ListItem key={`${alert.alert_type}-${alert.item_id}-${index}`} sx={{ px: 0, borderBottom: 1, borderColor: 'divider' }}>
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
        </AllyviaEmpty>
      )}
    </MainCard>
  );
};

export default InventoryAlertsPanel;
