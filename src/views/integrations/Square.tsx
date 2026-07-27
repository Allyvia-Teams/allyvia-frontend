import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { Box, Typography, Button, Alert, CircularProgress, Switch, Tab, Tabs } from '@mui/material';
import { IconUnlink } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import ImportJobProgress from 'ui-component/integrations/ImportJobProgress';
import SyncHistory from 'ui-component/integrations/SyncHistory';
import DataMapping from 'ui-component/integrations/DataMapping';
import squareApi from 'api/square';
import {
  fetchSquareConnectionStatus,
  revokeSquareConnection,
  initiateSquareConnection,
  fetchSquareImportStatus,
  triggerSquareImport
} from 'store/slices/integrations';
import { useTheme } from '@mui/material/styles';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`square-tab-panel-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SquareIntegration() {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tabValue, setTabValue] = useState(0);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [webhooksEnabled, setWebhooksEnabled] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const { square } = useSelector((state) => state.integrations);
  const { currentRole } = useSelector((state) => state.auth);

  const companyId = currentRole?.company_id || null;
  const isConnected = square.connection.status === 'connected' || square.connection.status === 'expired';
  const isExpired = square.connection.status === 'expired';

  useEffect(() => {
    if (currentRole && companyId) {
      dispatch(fetchSquareConnectionStatus(companyId));
    }
  }, [dispatch, currentRole, companyId]);

  useEffect(() => {
    if (companyId && isConnected) {
      dispatch(fetchSquareImportStatus(companyId));
    }
  }, [dispatch, companyId, isConnected]);

  useEffect(() => {
    if (companyId && isConnected) {
      squareApi.getIntegrationSettings(companyId).then((s) => setWebhooksEnabled(s.webhooks_enabled));
    }
  }, [companyId, isConnected]);

  const handleWebhookToggle = async (enabled: boolean) => {
    if (!companyId) return;
    setWebhookLoading(true);
    try {
      await squareApi.updateIntegrationSettings(companyId, enabled);
      setWebhooksEnabled(enabled);
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!companyId) return;

    try {
      const result = await dispatch(initiateSquareConnection(companyId)).unwrap();

      window.location.href = result.auth_url;
    } catch (error) {
      console.error('Failed to initiate Square connection:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!companyId || !confirmDisconnect) return;

    await dispatch(revokeSquareConnection(companyId));
    setConfirmDisconnect(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!currentRole) {
    return (
      <MainCard title="Square Integration">
        <Alert severity="warning">Please login to use Square integration.</Alert>
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Square Integration"
      secondary={
        <Button size="small" onClick={() => navigate('/integrations?hub=true')} sx={{ color: 'text.secondary' }}>
          Back to Integrations
        </Button>
      }
    >
      <Box>
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 2,
            mb: 3,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {currentRole?.company_name || 'Company'}
                </Typography>
                <Typography variant="h4">·</Typography>
                <Typography variant="h4">Square</Typography>
              </Box>
              <Typography variant="body2" color={isExpired ? 'warning.main' : 'textSecondary'} sx={{ mt: 1 }}>
                {isConnected
                  ? isExpired
                    ? 'Token Expired - Reconnection Required'
                    : `Connected: ${formatDateTime(square.connection.connectedAt)}`
                  : 'Not Connected'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!isConnected ? (
                <AnimateButton>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleConnect}
                    disabled={square.ui.isConnecting}
                    startIcon={square.ui.isConnecting ? <CircularProgress size={20} color="inherit" /> : undefined}
                  >
                    {square.ui.isConnecting ? 'Connecting...' : 'Connect to Square'}
                  </Button>
                </AnimateButton>
              ) : (
                <>
                  {!confirmDisconnect ? (
                    <AnimateButton>
                      <Button variant="outlined" color="error" startIcon={<IconUnlink />} onClick={() => setConfirmDisconnect(true)}>
                        Disconnect
                      </Button>
                    </AnimateButton>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="error">
                        Are you sure?
                      </Typography>
                      <Button size="small" color="error" onClick={handleDisconnect}>
                        Yes
                      </Button>
                      <Button size="small" onClick={() => setConfirmDisconnect(false)}>
                        Cancel
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Box>
        </Box>

        {isExpired && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleConnect}>
                Reconnect
              </Button>
            }
          >
            Your Square connection has expired. Please reconnect to Square to continue using the integration.
          </Alert>
        )}

        {/* Tabs and Content */}
        <Box>
          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Connection" />
              <Tab label="Allyvia Data Import" disabled={!isConnected} />
              <Tab label="Data Mapping" disabled={!isConnected} />
              <Tab label="Sync History" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {isConnected ? (
              <Alert severity="success">
                Connected to Square{square.connection.merchantId ? ` (Merchant ${square.connection.merchantId})` : ''}. Use the Allyvia Data
                Import tab to import your data and the Sync History tab to review activity.
              </Alert>
            ) : (
              <Alert severity="info">
                Connect to Square to access your inventory, orders, payments, and customer data. Square provides real-time synchronization
                of your point-of-sale information.
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {isConnected && companyId ? (
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  p: 2,
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Typography variant="h5" sx={{ mb: 1 }}>
                  Allyvia Data Import
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Import your Square catalog, customers, and orders into Allyvia. Your data is never overwritten — re-running adds new
                  records only.
                </Typography>
                <AnimateButton>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => dispatch(triggerSquareImport(companyId))}
                    disabled={square.importJobLoading || square.importJob?.status === 'pending' || square.importJob?.status === 'running'}
                  >
                    {square.importJob?.status === 'pending' || square.importJob?.status === 'running'
                      ? 'Importing...'
                      : 'Import to Allyvia'}
                  </Button>
                </AnimateButton>
                <ImportJobProgress source="square" companyId={companyId} />
                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2">Automatic Sync</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Receive real-time updates via Square webhooks
                    </Typography>
                  </Box>
                  <Switch
                    checked={webhooksEnabled}
                    onChange={(e) => handleWebhookToggle(e.target.checked)}
                    disabled={webhookLoading || !isConnected}
                  />
                </Box>
              </Box>
            ) : (
              <Alert severity="info">Connect to Square to import your data into Allyvia.</Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {isConnected && companyId ? (
              <DataMapping source="square" companyId={companyId} />
            ) : (
              <Alert severity="info">Connect to Square to configure data mapping.</Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <SyncHistory source="square" companyId={companyId || ''} />
          </TabPanel>
        </Box>
      </Box>
    </MainCard>
  );
}
