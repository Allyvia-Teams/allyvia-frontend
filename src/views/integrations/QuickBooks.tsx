import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'store';
import { Grid, Box, Typography, Button, Tab, Tabs, Alert, FormControl, Select, MenuItem, CircularProgress } from '@mui/material';
import { IconRefresh, IconUnlink, IconPlugConnected, IconChartBar } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import AccountMapper from 'ui-component/integrations/AccountMapper';
import SyncHistory from 'ui-component/integrations/SyncHistory';
import {
  AllyviaPaginatedTable,
  TableColumnConfig,
  AllyviaFilterSelect,
  AllyviaFilterButton,
  AllyviaFilterDatePicker,
  RangeValue
} from 'ui-component/common';
import { parseDate } from '@internationalized/date';
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
import { useTheme } from '@mui/material/styles';
import { fetchInvoiceList, fetchPaymentDetails, fetchExpenseSummary } from 'api/finance.api';

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

const toISO = (dv?: any) => {
  if (!dv) return undefined;
  const y = String(dv.year).padStart(4, '0');
  const m = String(dv.month).padStart(2, '0');
  const d = String(dv.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function QuickBooksIntegration() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [tabValue, setTabValue] = useState(0);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [dataView, setDataView] = useState('overview');
  const [invoicesData, setInvoicesData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [dateRange, setDateRange] = useState<RangeValue | null>({
    start: parseDate(thirtyDaysAgo.toISOString().split('T')[0]),
    end: parseDate(today.toISOString().split('T')[0])
  });
  const [invoiceStatus, setInvoiceStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

  const { quickbooks } = useSelector((state) => state.integrations);
  const { currentRole } = useSelector((state) => state.auth);

  const companyId = currentRole?.company_id || null;
  const isAdmin = currentRole?.role_type === 'admin';

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

  const isConnected =
    quickbooks.connection.status === 'connected' ||
    quickbooks.connection.status === 'refreshing' ||
    quickbooks.connection.status === 'expired'; // Still connected, just needs refresh
  const isExpired = quickbooks.connection.status === 'expired';
  const isRefreshing = quickbooks.ui.isRefreshing;
  const isRefreshTokenValid = quickbooks.connection.refreshTokenValid;

  const handleApplyFilters = async () => {
    if (!isConnected || dataView === 'overview' || !dateRange) {
      return;
    }

    setLoadingData(true);
    setDataError(null);

    const startDate = toISO(dateRange.start);
    const endDate = toISO(dateRange.end);

    if (!startDate || !endDate) {
      setDataError('Please select a valid date range');
      setLoadingData(false);
      return;
    }

    try {
      switch (dataView) {
        case 'invoices':
          const invoices = await fetchInvoiceList({
            startDate,
            endDate,
            status: invoiceStatus
          });
          setInvoicesData(invoices || []);
          break;
        case 'payments':
          const payments = await fetchPaymentDetails({ startDate, endDate });
          setPaymentsData(payments || []);
          break;
        case 'expenses':
          const expenses = await fetchExpenseSummary({ startDate, endDate });
          setExpensesData(expenses);
          break;
      }
    } catch (error: any) {
      console.error(`Failed to fetch ${dataView} data:`, error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      setDataError(`Failed to load ${dataView} data: ${errorMessage}`);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isConnected && dataView !== 'overview' && dateRange) {
      handleApplyFilters();
    }
  }, [dataView]);

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

  const invoiceColumns: TableColumnConfig[] = [
    { field: 'invoice_number', headerName: 'Invoice #', width: 120 },
    { field: 'customer_name', headerName: 'Customer', width: 200 },
    { field: 'invoice_date', headerName: 'Date', width: 120 },
    {
      field: 'total_amount',
      headerName: 'Amount',
      width: 130,
      valueFormatter: (params) => `$${parseFloat(params.value || 0).toFixed(2)}`
    },
    { field: 'status', headerName: 'Status', width: 120 },
    {
      field: 'balance',
      headerName: 'Balance',
      width: 130,
      valueFormatter: (params) => `$${parseFloat(params.value || 0).toFixed(2)}`
    }
  ];

  const paymentColumns: TableColumnConfig[] = [
    { field: 'payment_date', headerName: 'Date', width: 120 },
    { field: 'customer_name', headerName: 'Customer', width: 200 },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 130,
      valueFormatter: (params) => `$${parseFloat(params.value || 0).toFixed(2)}`
    },
    { field: 'payment_method', headerName: 'Method', width: 150 },
    { field: 'reference_number', headerName: 'Reference', width: 150 }
  ];

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
          <Button size="small" onClick={() => window.history.back()} sx={{ color: 'text.secondary' }}>
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
                  {dataView !== 'overview' && (
                    <Box
                      sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <AllyviaFilterDatePicker height={40} value={dateRange} onChange={(value) => setDateRange(value)} />
                      {dataView === 'invoices' && (
                        <AllyviaFilterSelect
                          height={40}
                          width={200}
                          value={invoiceStatus}
                          onChange={(e) => setInvoiceStatus(e.target.value as 'all' | 'paid' | 'unpaid')}
                          options={[
                            { value: 'all', label: 'Status: All Invoices' },
                            { value: 'paid', label: 'Status: Paid' },
                            { value: 'unpaid', label: 'Status: Unpaid' }
                          ]}
                          placeholder="Status"
                          borderWidth={1}
                        />
                      )}
                      <AllyviaFilterButton
                        height={40}
                        onClick={handleApplyFilters}
                        disabled={loadingData || !dateRange}
                        label="Apply Filters"
                        variant="outlined"
                      />
                    </Box>
                  )}
                  {dataView === 'overview' ? (
                    <Box sx={{ py: 4 }}>
                      <Box sx={{ pb: 3, textAlign: 'center' }}>
                        <Grid container spacing={3} justifyContent="center">
                          <Grid size={{ xs: 4, sm: 4, md: 2 }}>
                            <Typography variant="h2" color="primary" sx={{ fontWeight: 300 }}>
                              {isRefreshing ? '-' : invoicesData.length}
                            </Typography>
                            <Typography variant="body1" color="textSecondary">
                              Invoices synced
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 4, sm: 4, md: 2 }}>
                            <Typography variant="h2" color="primary" sx={{ fontWeight: 300 }}>
                              {isRefreshing ? '-' : paymentsData.length}
                            </Typography>
                            <Typography variant="body1" color="textSecondary">
                              Payments synced
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 4, sm: 4, md: 2 }}>
                            <Typography variant="h2" color="primary" sx={{ fontWeight: 300 }}>
                              {isRefreshing ? '-' : expensesData?.expense_categories?.length || 0}
                            </Typography>
                            <Typography variant="body1" color="textSecondary">
                              Expense categories
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                      <Typography variant="body2" color="textSecondary" align="center" sx={{ pt: 2 }}>
                        Select a data type from the dropdown above to view detailed information
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      {loadingData ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : dataError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {dataError}
                        </Alert>
                      ) : (
                        <>
                          {dataView === 'invoices' && (
                            <Box>
                              <Typography variant="h6" gutterBottom>
                                Invoices ({invoicesData.length})
                              </Typography>
                              {invoicesData.length > 0 ? (
                                <AllyviaPaginatedTable
                                  rows={invoicesData.map((inv, idx) => ({ id: idx, ...inv }))}
                                  columns={invoiceColumns}
                                  height={400}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    p: 3,
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    border: `1px solid ${theme.palette.divider}`,
                                    textAlign: 'center'
                                  }}
                                >
                                  <Typography variant="body1" color="textSecondary">
                                    No invoices found for the selected period
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}

                          {dataView === 'payments' && (
                            <Box>
                              <Typography variant="h6" gutterBottom>
                                Payments ({paymentsData.length})
                              </Typography>
                              {paymentsData.length > 0 ? (
                                <AllyviaPaginatedTable
                                  rows={paymentsData.map((pay, idx) => ({ id: idx, ...pay }))}
                                  columns={paymentColumns}
                                  height={400}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    p: 3,
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    border: `1px solid ${theme.palette.divider}`,
                                    textAlign: 'center'
                                  }}
                                >
                                  <Typography variant="body1" color="textSecondary">
                                    No payments found for the selected period
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}

                          {dataView === 'expenses' && (
                            <Box>
                              <Typography variant="h6" gutterBottom>
                                Expense Summary
                              </Typography>
                              {expensesData ? (
                                <Box
                                  sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}
                                >
                                  <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                      <Typography variant="subtitle2" color="textSecondary">
                                        Total Expenses
                                      </Typography>
                                      <Typography variant="h4" color="primary">
                                        ${parseFloat(expensesData.total_expenses || 0).toFixed(2)}
                                      </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                      <Typography variant="subtitle2" color="textSecondary">
                                        Period
                                      </Typography>
                                      <Typography variant="body1">{expensesData.period || 'Last 30 days'}</Typography>
                                    </Grid>
                                  </Grid>
                                  {expensesData.expense_categories && expensesData.expense_categories.length > 0 && (
                                    <Box sx={{ mt: 3 }}>
                                      <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>
                                        Expense Categories
                                      </Typography>
                                      {expensesData.expense_categories.map((cat: any, idx: number) => (
                                        <Box
                                          key={idx}
                                          sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            py: 1,
                                            borderBottom:
                                              idx < expensesData.expense_categories.length - 1
                                                ? `1px solid ${theme.palette.divider}`
                                                : 'none'
                                          }}
                                        >
                                          <Typography variant="body2">{cat.category || cat.name}</Typography>
                                          <Typography variant="body2" fontWeight="medium">
                                            ${parseFloat(cat.amount || 0).toFixed(2)}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              ) : (
                                <Box
                                  sx={{
                                    p: 3,
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    border: `1px solid ${theme.palette.divider}`,
                                    textAlign: 'center'
                                  }}
                                >
                                  <Typography variant="body1" color="textSecondary">
                                    No expense data found for the selected period
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                        </>
                      )}
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
