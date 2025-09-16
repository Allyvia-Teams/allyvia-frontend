import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import { 
  fetchSquareConnectionStatus, 
  disconnectSquare,
  fetchSquareCatalog,
  fetchSquareLocations,
  fetchSquareMappings,
  saveSquareMappings,
  fetchSquareWebhookEvents,
  clearSquareError
} from 'store/slices/integrations';
import { RootState } from 'store';
import { getSquareAuthUrl } from 'api/square';
import { getCompanyId } from 'utils/authStorage';
import SquareIcon from '@mui/icons-material/Square';
import AccountMapper from 'ui-component/integrations/AccountMapper';
import SyncHistory from 'ui-component/integrations/SyncHistory';
import CompanySelector from 'ui-component/integrations/CompanySelector';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`square-tabpanel-${index}`}
      aria-labelledby={`square-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `square-tab-${index}`,
    'aria-controls': `square-tabpanel-${index}`,
  };
}

const SquareIntegration: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const { 
    connectionStatus, 
    catalog, 
    locations, 
    mappings, 
    webhookEvents,
    webhookEventsMeta,
    loading, 
    error 
  } = useSelector((state: RootState) => state.integrations.square);

  const currentCompanyId = companyId || selectedCompanyId || getCompanyId();

  useEffect(() => {
    if (currentCompanyId) {
      dispatch(fetchSquareConnectionStatus(currentCompanyId));
    }
  }, [dispatch, currentCompanyId]);

  const handleCompanySelected = (companyId: string) => {
    setSelectedCompanyId(companyId);
    // Reset tab to connection tab when company changes
    setTabValue(0);
  };

  useEffect(() => {
    if (error) {
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => {
        dispatch(clearSquareError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Load data when switching to specific tabs
    if (currentCompanyId) {
      switch (newValue) {
        case 1: // Mappings tab
          dispatch(fetchSquareMappings(currentCompanyId));
          dispatch(fetchSquareCatalog(currentCompanyId));
          break;
        case 2: // Sync History tab
          dispatch(fetchSquareWebhookEvents({ companyId: currentCompanyId }));
          break;
        default:
          break;
      }
    }
  };

  const handleConnect = async () => {
    if (!currentCompanyId) {
      console.error('Missing company_id');
      return;
    }

    setIsConnecting(true);
    try {
      const { auth_url } = await getSquareAuthUrl(currentCompanyId);
      window.location.href = auth_url;
    } catch (err) {
      console.error('Error fetching Square URL', err);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentCompanyId) return;
    
    if (window.confirm('Are you sure you want to disconnect Square? This will remove all mappings and sync data.')) {
      dispatch(disconnectSquare(currentCompanyId));
    }
  };

  const handleSaveMappings = async (newMappings: any[]) => {
    if (!currentCompanyId) return;
    
    dispatch(saveSquareMappings({ 
      companyId: currentCompanyId, 
      mappings: newMappings 
    }));
  };

  const getConnectionStatusChip = () => {
    if (!connectionStatus) return <Chip label="Unknown" color="default" />;
    
    if (connectionStatus.is_connected && connectionStatus.access_token_valid) {
      return <Chip label="Connected" color="success" />;
    } else if (connectionStatus.is_connected && !connectionStatus.access_token_valid) {
      return <Chip label="Token Expired" color="warning" />;
    } else {
      return <Chip label="Disconnected" color="error" />;
    }
  };

  if (!currentCompanyId) {
    return (
      <MainCard title="Square Integration">
        <CompanySelector onCompanySelected={handleCompanySelected} />
      </MainCard>
    );
  }

  return (
    <MainCard title="Square Integration">
      <Grid container spacing={gridSpacing}>
        {/* Connection Status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <SquareIcon sx={{ fontSize: 40, color: '#00C851' }} />
                  <Box>
                    <Typography variant="h6">Square Payment Processing</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {connectionStatus?.merchant_id || 'Not connected'}
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  {getConnectionStatusChip()}
                  {connectionStatus?.is_connected ? (
                    <Button 
                      variant="outlined" 
                      color="error" 
                      onClick={handleDisconnect}
                      disabled={loading.disconnect}
                    >
                      {loading.disconnect ? <CircularProgress size={20} /> : 'Disconnect'}
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleConnect}
                      disabled={isConnecting}
                    >
                      {isConnecting ? <CircularProgress size={20} /> : 'Connect'}
                    </Button>
                  )}
                </Box>
              </Box>
              
              {connectionStatus?.is_connected && (
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">
                    Connected: {connectionStatus.connected_at ? new Date(connectionStatus.connected_at).toLocaleDateString() : 'Unknown'}
                    {connectionStatus.token_expires_in && (
                      <span> • Token expires in {Math.floor(connectionStatus.token_expires_in / 3600)} hours</span>
                    )}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Error Alert */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => dispatch(clearSquareError())}>
              {error}
            </Alert>
          </Grid>
        )}

        {/* Tabs */}
        {connectionStatus?.is_connected && (
          <Grid item xs={12}>
            <Card>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="Square integration tabs">
                  <Tab label="Connection" {...a11yProps(0)} />
                  <Tab label="Mappings" {...a11yProps(1)} />
                  <Tab label="Sync History" {...a11yProps(2)} />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={gridSpacing}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Connection Details</Typography>
                    <Box>
                      <Typography variant="body2"><strong>Merchant ID:</strong> {connectionStatus.merchant_id}</Typography>
                      <Typography variant="body2"><strong>Access Token:</strong> {connectionStatus.access_token_valid ? 'Valid' : 'Invalid'}</Typography>
                      <Typography variant="body2"><strong>Refresh Token:</strong> {connectionStatus.refresh_token_valid ? 'Valid' : 'Invalid'}</Typography>
                      <Typography variant="body2"><strong>Account Mappings:</strong> {connectionStatus.has_account_mappings ? 'Configured' : 'Not configured'}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Button 
                        variant="outlined" 
                        onClick={() => dispatch(fetchSquareCatalog(currentCompanyId))}
                        disabled={loading.catalog}
                      >
                        {loading.catalog ? <CircularProgress size={20} /> : 'Refresh Catalog'}
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={() => dispatch(fetchSquareLocations(currentCompanyId))}
                        disabled={loading.locations}
                      >
                        {loading.locations ? <CircularProgress size={20} /> : 'Refresh Locations'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <AccountMapper
                  provider="square"
                  catalog={catalog}
                  locations={locations}
                  mappings={mappings}
                  loading={loading.mappings || loading.catalog}
                  onSave={handleSaveMappings}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <SyncHistory
                  provider="square"
                  events={webhookEvents}
                  meta={webhookEventsMeta}
                  loading={loading.webhookEvents}
                  onRefresh={() => dispatch(fetchSquareWebhookEvents({ companyId: currentCompanyId }))}
                />
              </TabPanel>
            </Card>
          </Grid>
        )}
      </Grid>
    </MainCard>
  );
};

export default SquareIntegration;
