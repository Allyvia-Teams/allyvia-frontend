import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'store';
import { Grid, Box, Typography, Button, Tab, Tabs, Alert, FormControl, Select, MenuItem } from '@mui/material';
import { IconRefresh, IconUnlink, IconPlugConnected, IconChartBar } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import AccountMapper from 'ui-component/integrations/AccountMapper';
import SyncHistory from 'ui-component/integrations/SyncHistory';
import { gridSpacing } from 'store/constant';
import {
  fetchQBConnectionStatus,
  refreshQBToken,
  revokeQBConnection,
  initiateQBConnection,
  updateConnectionFromCompany,
  fetchChartOfAccounts,
  loadAccountMapping,
  addSyncHistoryEntry,
  setMappingsLoaded
} from 'store/slices/integrations';
import qbApi from 'api/qb';
import { setCompanyId, setQBUrlAndState } from 'utils/authStorage';
import { fetchCompanies } from 'store/slices/company';
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
  const dispatch = useDispatch();
  const [tabValue, setTabValue] = useState(0);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [dataView, setDataView] = useState('overview');

  const { quickbooks } = useSelector((state) => state.integrations);
  const { companies, isLoading } = useSelector((state) => state.company);

  const firstCompany = companies.length > 0 ? companies[0] : null;
  const companyId = firstCompany?.id || null;

  useEffect(() => {
    dispatch(fetchCompanies());
    dispatch(loadAccountMapping());
  }, [dispatch]);

  useEffect(() => {
    if (firstCompany && companyId) {
      dispatch(fetchQBConnectionStatus(companyId)).then((action: any) => {
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
      dispatch(updateConnectionFromCompany(firstCompany));
      setCompanyId(companyId);
    }
  }, [dispatch, firstCompany, companyId]);

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

  const handleRefresh = async () => {
    if (!companyId) return;

    try {
      // Refresh token if needed
      await dispatch(refreshQBToken(companyId));

      // Always sync accounts when user clicks Sync Now
      await dispatch(fetchChartOfAccounts(companyId));

      dispatch(
        addSyncHistoryEntry({
          status: 'success',
          message: 'Accounts synchronized successfully'
        })
      );
    } catch (error) {
      dispatch(
        addSyncHistoryEntry({
          status: 'failed',
          message: 'Failed to sync accounts'
        })
      );
    }
  };

  const handleDisconnect = async () => {
    if (!companyId || !confirmDisconnect) return;

    await dispatch(revokeQBConnection(companyId));
    dispatch(
      addSyncHistoryEntry({
        status: 'success',
        message: 'QuickBooks disconnected'
      })
    );
    setConfirmDisconnect(false);
  };

  const handleSyncAccounts = async () => {
    if (!companyId) return;
    await dispatch(fetchChartOfAccounts(companyId));
    dispatch(
      addSyncHistoryEntry({
        status: 'success',
        message: 'Chart of Accounts synced',
        recordsProcessed: quickbooks.mapping.accounts.length
      })
    );
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // When switching to Chart of Accounts tab, load mappings if they exist
    if (newValue === 1 && quickbooks.connection.hasAccountMappings && !quickbooks.mapping.accounts.length) {
      if (companyId) {
        // Load the existing mappings from backend
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
    }
  };

  const isConnected = quickbooks.connection.status === 'connected' || quickbooks.connection.status === 'refreshing';
  const isExpired = quickbooks.connection.status === 'expired';
  const isRefreshing = quickbooks.ui.isRefreshing;

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

  if (!isLoading && companies.length === 0) {
    return (
      <MainCard title="QuickBooks Integration">
        <Alert
          severity="warning"
          action={
            <Button size="small" onClick={() => (window.location.href = '/companies')}>
              Go to Companies
            </Button>
          }
        >
          You need to have a company set up to use QuickBooks integration.
        </Alert>
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
          <Button size="small" startIcon={<IconPlugConnected />} onClick={() => window.history.back()} sx={{ color: 'text.secondary' }}>
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
                    {firstCompany?.name || 'Company'}
                  </Typography>
                  <Typography variant="h4">·</Typography>
                  <Typography variant="h4">QuickBooks Online</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {isConnected ? `Connected: ${formatLastSync(quickbooks.connection.lastAuth)}` : 'Not Connected'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!isConnected ? (
                  <AnimateButton>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<IconPlugConnected />}
                      onClick={handleConnect}
                      disabled={quickbooks.ui.isConnecting}
                    >
                      Connect to QuickBooks
                    </Button>
                  </AnimateButton>
                ) : (
                  <>
                    <AnimateButton>
                      <Button
                        variant="outlined"
                        startIcon={
                          <IconRefresh
                            style={{
                              animation: quickbooks.ui.isRefreshing ? 'spin 1s linear infinite' : 'none'
                            }}
                          />
                        }
                        onClick={handleRefresh}
                        disabled={quickbooks.ui.isRefreshing}
                      >
                        {quickbooks.ui.isRefreshing ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </AnimateButton>
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

          {isExpired && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={handleRefresh}>
                  Refresh Now
                </Button>
              }
            >
              Your QuickBooks connection has expired. Please refresh your token to continue syncing data.
            </Alert>
          )}

          {/* Stats Section */}
          {isConnected && (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Grid container spacing={3} justifyContent="center">
                <Grid item xs={4} sm={4} md={2}>
                  <Typography variant="h2" color="primary" sx={{ fontWeight: 300 }}>
                    {isRefreshing ? '-' : '0'}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Invoices synced
                  </Typography>
                </Grid>
                <Grid item xs={4} sm={4} md={2}>
                  <Typography variant="h2" color="primary" sx={{ fontWeight: 300 }}>
                    {isRefreshing ? '-' : '0'}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Payments synced
                  </Typography>
                </Grid>
                <Grid item xs={4} sm={4} md={2}>
                  <Typography variant="h2" color="primary" sx={{ fontWeight: 300 }}>
                    {isRefreshing ? '-' : '0'}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Expenses synced
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Tabs and Content */}
          <Box>
            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Connection" />
                <Tab label="Chart of Accounts" disabled={!isConnected} />
                <Tab label="Sync History" />
              </Tabs>
              {tabValue === 0 && isConnected && (
                <FormControl
                  size="small"
                  sx={{
                    minWidth: 120,
                    mr: 2,
                    '& .MuiOutlinedInput-root': {
                      border: 'none',
                      '& fieldset': {
                        border: 'none'
                      }
                    },
                    '& .MuiSelect-select': {
                      py: 1,
                      px: 2,
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }
                  }}
                >
                  <Select value={dataView} onChange={(e) => setDataView(e.target.value)} displayEmpty>
                    <MenuItem value="overview">Overview</MenuItem>
                    <MenuItem value="invoices">Invoices</MenuItem>
                    <MenuItem value="payments">Payments</MenuItem>
                    <MenuItem value="expenses">Expenses</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            <TabPanel value={tabValue} index={0}>
              {isConnected ? (
                <Box>
                  {dataView === 'overview' ? (
                    <Box sx={{ py: 4 }}>
                      <Typography variant="body2" color="textSecondary" align="center">
                        Select a data type from the dropdown above to view detailed information
                      </Typography>
                      <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="textSecondary" align="center">
                          Real-time sync data will be available after BE-006 webhook implementation is complete
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                        {dataView} Details
                      </Typography>
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
              <AccountMapper />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <SyncHistory />
            </TabPanel>
          </Box>
        </Box>
      </MainCard>
    </>
  );
}
