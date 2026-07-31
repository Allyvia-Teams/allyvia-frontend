import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { Box, Typography, Button, Tab, Tabs, Alert, SelectChangeEvent, Chip, Divider, Tooltip, Switch } from '@mui/material';
import { IconRefresh, IconUnlink } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import AccountMapper from 'ui-component/integrations/AccountMapper';
import SyncHistory from 'ui-component/integrations/SyncHistory';
import ItemsDataView from 'ui-component/integrations/ItemsDataView';
import BillsDataView from 'ui-component/integrations/BillsDataView';
import BillPaymentsDataView from 'ui-component/integrations/BillPaymentsDataView';
import CustomersDataView from 'ui-component/integrations/CustomersDataView';
import VendorsDataView from 'ui-component/integrations/VendorsDataView';
import VendorCreditsDataView from 'ui-component/integrations/VendorCreditsDataView';
import InvoicesDataView from 'ui-component/integrations/InvoicesDataView';
import PurchasesDataView from 'ui-component/integrations/PurchasesDataView';
import AccountsDataView from 'ui-component/integrations/AccountsDataView';
import PaymentsDataView from 'ui-component/integrations/PaymentsDataView';
import QuickBooksOverview from 'ui-component/quickbooks/overview/QuickBooksOverview';
import { useSyncProgress } from 'hooks/useSyncProgress';
import { initializeSyncFromCallback, setWaitingForOverviewData } from 'store/slices/syncProgress';
import { AllyviaFilterSelect } from 'ui-component/common';
import ImportJobProgress from 'ui-component/integrations/ImportJobProgress';
import {
  fetchQBConnectionStatus,
  refreshQBToken,
  revokeQBConnection,
  initiateQBConnection,
  fetchChartOfAccounts,
  fetchItems,
  loadAccountMapping,
  addSyncHistoryEntry,
  setMappingsLoaded,
  triggerAllEntitiesSync,
  fetchQBImportStatus,
  triggerQBImport
} from 'store/slices/integrations';
import qbApi from 'api/qb';
import { setCompanyId, setQBUrlAndState } from 'utils/authStorage';
import { useTheme } from '@mui/material/styles';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`tab-panel-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function QuickBooksIntegration() {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tabValue, setTabValue] = useState(0);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [dataView, setDataView] = useState('overview');
  const [webhooksEnabled, setWebhooksEnabled] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const { quickbooks } = useSelector((state) => state.integrations);
  const { currentRole } = useSelector((state) => state.auth);

  const companyId = currentRole?.company_id || null;

  const isConnected =
    quickbooks.connection.status === 'connected' ||
    quickbooks.connection.status === 'refreshing' ||
    quickbooks.connection.status === 'expired';

  const { isAnySyncing, completedCount, totalEntities } = useSyncProgress(companyId);

  useEffect(() => {
    dispatch(loadAccountMapping());
  }, [dispatch]);

  useEffect(() => {
    if (currentRole && companyId) {
      dispatch(fetchQBConnectionStatus(companyId)).then(async (action: any) => {
        // Auto-refresh if token is expired but refresh token is still valid
        // Check if connected to QB but access token is invalid
        const isTokenExpired = action.payload?.is_connected && !action.payload?.access_token_valid;
        const isRefreshTokenValid = action.payload?.refresh_token_valid;

        if (isTokenExpired && isRefreshTokenValid) {
          console.log('QuickBooks access token expired, auto-refreshing...');
          try {
            const refreshResult = await dispatch(refreshQBToken(companyId));
            if (refreshResult.meta.requestStatus === 'fulfilled') {
              console.log('Token refreshed successfully');
              // Re-fetch status after refresh to update UI
              await dispatch(fetchQBConnectionStatus(companyId));
            }
          } catch (error) {
            console.error('Auto-refresh failed:', error);
          }
        } else if (isTokenExpired && !isRefreshTokenValid) {
          console.log('Both QuickBooks tokens expired, reconnection required');
          // Don't attempt refresh as it will fail - user needs to reconnect
        }

        // If we know mappings exist, load them
        if (action.payload?.has_account_mappings) {
          qbApi
            .getAccountMappings(companyId)
            .then((mappings) => {
              if (mappings && mappings.length > 0) {
                dispatch(setMappingsLoaded(mappings));
              }
            })
            .catch(() => {
              // Handle error silently
            });
        }
      });
      setCompanyId(companyId);
    }
  }, [dispatch, currentRole, companyId]);

  useEffect(() => {
    if (companyId && isConnected) {
      dispatch(fetchQBImportStatus(companyId));
    }
  }, [dispatch, companyId, isConnected]);

  useEffect(() => {
    if (companyId && isConnected) {
      qbApi.getIntegrationSettings(companyId).then((s) => setWebhooksEnabled(s.webhooks_enabled));
    }
  }, [companyId, isConnected]);

  const handleWebhookToggle = async (enabled: boolean) => {
    if (!companyId) return;
    setWebhookLoading(true);
    try {
      await qbApi.updateIntegrationSettings(companyId, enabled);
      setWebhooksEnabled(enabled);
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!companyId) return;

    try {
      const result = await dispatch(initiateQBConnection(companyId)).unwrap();
      setQBUrlAndState(result.auth_url, result.state);

      const callbackUrl = import.meta.env.VITE_APP_QB_CALLBACK_URL;
      const targetUrl = new URL(result.auth_url);
      targetUrl.searchParams.set('redirect_uri', callbackUrl);

      window.location.href = targetUrl.toString();
    } catch (error) {
      console.error('Failed to initiate connection:', error);
    }
  };

  const handleAccounts = async () => {
    if (!companyId) return;
    try {
      // Always sync accounts when user clicks Sync Now
      await dispatch(fetchChartOfAccounts(companyId));
      dispatch(
        addSyncHistoryEntry({
          status: 'success',
          message: 'Accounts synchronized successfully'
        })
      );
    } catch {
      dispatch(
        addSyncHistoryEntry({
          status: 'failed',
          message: 'Failed to sync accounts'
        })
      );
    }
  };

  const handleItems = async () => {
    if (!companyId) return;
    try {
      // Inventory Sync
      await dispatch(fetchItems(companyId));
      dispatch(
        addSyncHistoryEntry({
          status: 'success',
          message: 'Items synchronized successfully'
        })
      );
    } catch {
      dispatch(
        addSyncHistoryEntry({
          status: 'failed',
          message: 'Failed to sync items'
        })
      );
    }
  };

  const handleRefresh = async () => {
    try {
      if (!companyId) return;

      await dispatch(refreshQBToken(companyId));

      handleAccounts();
      handleItems();

      const syncResult = await dispatch(triggerAllEntitiesSync(companyId)).unwrap();

      if (syncResult.syncs_initiated) {
        dispatch(initializeSyncFromCallback(syncResult.entities_queued));
        dispatch(setWaitingForOverviewData(true));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDisconnect = async () => {
    if (!companyId || !confirmDisconnect) return;

    try {
      const result = await dispatch(revokeQBConnection(companyId));
      // If revoke was successful, update UI
      if (revokeQBConnection.fulfilled.match(result)) {
        dispatch(
          addSyncHistoryEntry({
            status: 'success',
            message: 'QuickBooks disconnected'
          })
        );
        // Refresh connection status to ensure UI is updated
        await dispatch(fetchQBConnectionStatus(companyId));
      } else {
        // Even if revoke failed, try to refresh status in case tokens were cleared
        await dispatch(fetchQBConnectionStatus(companyId));
        dispatch(
          addSyncHistoryEntry({
            status: 'failed',
            message: 'Disconnect attempted. Please refresh the page to verify connection status.'
          })
        );
      }
    } catch {
      // If there's an error, still try to refresh status
      await dispatch(fetchQBConnectionStatus(companyId));
      dispatch(
        addSyncHistoryEntry({
          status: 'failed',
          message: 'Failed to disconnect. Please try again or refresh the page.'
        })
      );
    } finally {
      setConfirmDisconnect(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // When switching to Chart of Accounts tab, auto-fetch accounts if not loaded
    // Only fetch if connected to QuickBooks
    if (newValue === 1 && companyId && isConnected) {
      if (quickbooks.mapping.accounts.length === 0) {
        // Auto-fetch accounts from DB (includes internal categories)
        dispatch(fetchChartOfAccounts(companyId));
      }
    }
  };

  const isExpired = quickbooks.connection.status === 'expired';
  const isRefreshTokenValid = quickbooks.connection.refreshTokenValid;

  const formatLastSync = (lastAuth: string | null) => {
    if (!lastAuth) return 'Never';
    const date = new Date(lastAuth);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!currentRole) {
    return (
      <MainCard title="QuickBooks Integration">
        <Alert severity="warning">Please login to use QuickBooks integration.</Alert>
      </MainCard>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <MainCard
        title="QuickBooks Integration"
        secondary={
          <Button size="small" onClick={() => navigate('/integrations?hub=true')} sx={{ color: 'text.secondary' }}>
            Back to Integrations
          </Button>
        }
      >
        <Box>
          {/* Header Section with Company Info and Actions */}
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
                  <Typography variant="h4">QuickBooks Online</Typography>
                </Box>
                <Typography variant="body2" color={isExpired ? 'warning.main' : 'textSecondary'} sx={{ mt: 1 }}>
                  {isConnected
                    ? isExpired
                      ? 'Token Expired - Refresh Required'
                      : `Connected: ${formatLastSync(quickbooks.connection.lastAuth)}`
                    : 'Not Connected'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!isConnected ? (
                  <AnimateButton>
                    <Button variant="contained" color="primary" onClick={handleConnect} disabled={quickbooks.ui.isConnecting}>
                      Connect to QuickBooks
                    </Button>
                  </AnimateButton>
                ) : (
                  <>
                    {!confirmDisconnect ? (
                      <AnimateButton>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<IconUnlink />}
                          onClick={() => setConfirmDisconnect(true)}
                          disabled={quickbooks.ui.isRefreshing}
                        >
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

          {isConnected && companyId && (
            <>
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  p: 2,
                  mb: 3,
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h5">Allyvia Data Import</Typography>
                  <Chip label="One-time" size="small" color="default" />
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  One-time import · Pulls all historical QuickBooks data into Allyvia
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Pull all historical QuickBooks data into Allyvia. Safe to re-run - never overwrites existing records.
                </Typography>
                <AnimateButton>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => dispatch(triggerQBImport(companyId))}
                    disabled={
                      quickbooks.importJobLoading ||
                      quickbooks.importJob?.status === 'pending' ||
                      quickbooks.importJob?.status === 'running'
                    }
                  >
                    {quickbooks.importJob?.status === 'pending' || quickbooks.importJob?.status === 'running'
                      ? 'Importing...'
                      : 'Import to Allyvia'}
                  </Button>
                </AnimateButton>
                <ImportJobProgress source="quickbooks" companyId={companyId} />
                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2">Automatic Sync</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Receive real-time updates via QuickBooks webhooks
                    </Typography>
                  </Box>
                  <Switch
                    checked={webhooksEnabled}
                    onChange={(e) => handleWebhookToggle(e.target.checked)}
                    disabled={webhookLoading || !isConnected}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  p: 2,
                  mb: 3,
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h5">Continuous Sync</Typography>
                  <Chip label="Live" size="small" color="success" />
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Keep Allyvia updated as new QuickBooks data comes in. Click Sync Now to pull the latest changes immediately.
                </Typography>
                <AnimateButton>
                  <Tooltip title="Continuously sync your latest QuickBooks data into Allyvia">
                    <span>
                      <Button
                        variant="outlined"
                        startIcon={<IconRefresh style={{ animation: isAnySyncing ? 'spin 1s linear infinite' : 'none' }} />}
                        onClick={handleRefresh}
                        disabled={isAnySyncing}
                      >
                        {isAnySyncing ? `Syncing ${completedCount}/${totalEntities}` : 'Sync Now'}
                      </Button>
                    </span>
                  </Tooltip>
                </AnimateButton>
              </Box>
            </>
          )}

          {isExpired && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={isRefreshTokenValid ? handleRefresh : handleConnect}>
                  {isRefreshTokenValid ? 'Refresh Now' : 'Reconnect'}
                </Button>
              }
            >
              {isRefreshTokenValid
                ? 'Your QuickBooks connection has expired. Please refresh your token to continue syncing data.'
                : 'Your QuickBooks connection has expired and requires reconnection. Please reconnect to QuickBooks.'}
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
                <Tab label="Chart of Accounts" disabled={!isConnected} />
                <Tab label="Sync History" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              {isConnected ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4">
                      {dataView === 'overview'
                        ? 'Select a data type from the dropdown to view detailed information'
                        : `${dataView.charAt(0).toUpperCase() + dataView.slice(1)} Details`}
                    </Typography>
                    <AllyviaFilterSelect
                      value={dataView}
                      onChange={(e: SelectChangeEvent) => setDataView(e.target.value)}
                      height={40}
                      width={150}
                      placeholder="Overview"
                      options={[
                        { value: 'overview', label: 'Overview' },
                        { value: 'accounts', label: 'Accounts' },
                        { value: 'bills', label: 'Bills' },
                        { value: 'billpayments', label: 'Bill Payments' },
                        { value: 'customers', label: 'Customers' },
                        { value: 'vendors', label: 'Vendors' },
                        { value: 'vendorcredits', label: 'Vendor Credits' },
                        { value: 'invoices', label: 'Invoices' },
                        { value: 'items', label: 'Items' },
                        { value: 'payments', label: 'Payments' },
                        { value: 'purchases', label: 'Purchases' }
                      ]}
                    />
                  </Box>
                  {dataView === 'overview' ? (
                    <Box sx={{ py: 2 }}>
                      <QuickBooksOverview onEntityClick={setDataView} />
                    </Box>
                  ) : dataView === 'accounts' ? (
                    <AccountsDataView companyId={companyId || ''} />
                  ) : dataView === 'items' ? (
                    <ItemsDataView companyId={companyId || ''} />
                  ) : dataView === 'bills' ? (
                    <BillsDataView companyId={companyId || ''} />
                  ) : dataView === 'billpayments' ? (
                    <BillPaymentsDataView companyId={companyId || ''} />
                  ) : dataView === 'customers' ? (
                    <CustomersDataView companyId={companyId || ''} />
                  ) : dataView === 'vendors' ? (
                    <VendorsDataView companyId={companyId || ''} />
                  ) : dataView === 'vendorcredits' ? (
                    <VendorCreditsDataView companyId={companyId || ''} />
                  ) : dataView === 'invoices' ? (
                    <InvoicesDataView companyId={companyId || ''} />
                  ) : dataView === 'purchases' ? (
                    <PurchasesDataView companyId={companyId || ''} />
                  ) : dataView === 'payments' ? (
                    <PaymentsDataView companyId={companyId || ''} />
                  ) : (
                    <Box>
                      <Box
                        sx={{
                          p: 3,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          border: `1px solid ${theme.palette.divider}`,
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                          No {dataView} data available
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {dataView === 'invoices' && 'Invoice details will appear here once synced from QuickBooks'}
                          {dataView === 'payments' && 'Payment records will appear here once synced from QuickBooks'}
                          {dataView === 'expenses' && 'Expense entries will appear here once synced from QuickBooks'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="info">Connect to QuickBooks to view connection details and sync status.</Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <AccountMapper isConnected={isConnected} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <SyncHistory source="quickbooks" companyId={companyId || ''} />
            </TabPanel>
          </Box>
        </Box>
      </MainCard>
    </>
  );
}
