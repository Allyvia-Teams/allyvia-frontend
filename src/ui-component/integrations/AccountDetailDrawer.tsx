import { useEffect, useState } from 'react';
import { Drawer, Box, Typography, IconButton, Grid, Card, CardContent, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import { IconX, IconChevronLeft, IconChevronRight, IconCheck, IconCurrencyDollar, IconFolder } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';

interface AccountDetailDrawerProps {
  open: boolean;
  accountId: string | null;
  accounts: any[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (accountId: string) => void;
}

const AccountDetailDrawer = ({ open, accountId, accounts, currentIndex, companyId, onClose, onNavigate }: AccountDetailDrawerProps) => {
  const theme = useTheme();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && accountId) {
      fetchAccountDetails();
    }
  }, [open, accountId]);

  const fetchAccountDetails = async () => {
    if (!accountId) return;

    setLoading(true);
    setError(null);
    try {
      const accountData = accounts.find((a) => a.id === accountId);
      if (accountData) {
        setAccount(accountData);
      } else {
        setError('Account not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch account details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '$0.00';
    const num = parseFloat(String(amount));
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusColor = (active: boolean) => {
    return active ? 'success' : 'default';
  };

  const getClassificationColor = (classification: string) => {
    const colors: Record<string, any> = {
      Asset: 'info',
      Liability: 'warning',
      Equity: 'secondary',
      Revenue: 'success',
      Expense: 'error'
    };
    return colors[classification] || 'default';
  };

  const getAccountTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'Accounts Receivable': 'Money Customers Owe',
      'Accounts Payable': 'Money You Owe',
      'Other Current Asset': 'Short-term Assets',
      'Other Current Liability': 'Short-term Debts',
      'Long Term Liability': 'Long-term Debts',
      'Cost of Goods Sold': 'Cost of Sales',
      'Other Income': 'Additional Income',
      'Other Expense': 'Additional Expenses',
      'Fixed Asset': 'Property & Equipment',
      'Credit Card': 'Credit Card',
      Bank: 'Bank Account'
    };
    return typeMap[type] || type;
  };

  const getBalanceStatus = (balance: number) => {
    if (balance > 0) return { label: 'Positive', color: 'success' };
    if (balance < 0) return { label: 'Negative', color: 'error' };
    return { label: 'Zero', color: 'default' };
  };

  return (
    <Drawer
      anchor="top"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: theme.palette.background.default
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <IconButton onClick={onClose} sx={{ color: theme.palette.text.secondary }}>
            <IconX />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => {
                if (currentIndex > 0) {
                  onNavigate(accounts[currentIndex - 1].id);
                }
              }}
              disabled={currentIndex <= 0 || accounts.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <Typography variant="body2" color="textSecondary">
              {currentIndex + 1} of {accounts.length}
            </Typography>
            <IconButton
              onClick={() => {
                if (currentIndex < accounts.length - 1) {
                  onNavigate(accounts[currentIndex + 1].id);
                }
              }}
              disabled={currentIndex >= accounts.length - 1 || accounts.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronRight />
            </IconButton>
          </Box>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {account && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                {account.fully_qualified_name || account.name}
              </Typography>
              {account.name && account.name !== account.fully_qualified_name && (
                <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 0.5 }}>
                  {account.name}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {account.acct_num && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      Account #{account.acct_num}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                  </>
                )}
                <Chip
                  label={account.active ? 'Active' : 'Inactive'}
                  size="small"
                  color={getStatusColor(account.active)}
                  icon={account.active ? <IconCheck size={16} /> : undefined}
                />
                {account.sub_account && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                    <Chip label="Sub-Account" size="small" color="info" icon={<IconFolder size={16} />} />
                  </>
                )}
                {account.is_merged && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                    <Chip label="Merged" size="small" color="warning" />
                  </>
                )}
              </Box>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(account.current_balance)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Current Balance
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {getAccountTypeDisplay(account.account_type)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Account Type
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Chip
                      label={account.classification || 'Not Set'}
                      color={getClassificationColor(account.classification)}
                      sx={{ fontSize: '1rem', height: 32 }}
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      Classification
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Chip
                      label={getBalanceStatus(parseFloat(account.current_balance || '0')).label}
                      color={getBalanceStatus(parseFloat(account.current_balance || '0')).color as any}
                      sx={{ fontSize: '1rem', height: 32 }}
                      icon={<IconCurrencyDollar size={18} />}
                    />
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      Balance Status
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Detail Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* Account Information */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      ACCOUNT INFORMATION
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Account Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {account.acct_num || 'Not Assigned'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Account Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {account.account_type}
                        </Typography>
                      </Box>
                      {account.account_sub_type && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Sub-Type
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {account.account_sub_type}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Currency
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {account.currency_ref || 'USD'}
                        </Typography>
                      </Box>
                      {account.parent_ref_name && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Parent Account
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {account.parent_ref_name}
                          </Typography>
                        </Box>
                      )}
                      {account.tax_code_ref_name && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Tax Code
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {account.tax_code_ref_name}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Balance Details */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      BALANCE DETAILS
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Current Balance
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            color: parseFloat(account.current_balance || '0') < 0 ? theme.palette.error.main : 'inherit'
                          }}
                        >
                          {formatCurrency(account.current_balance)}
                        </Typography>
                      </Box>
                      {account.current_balance_with_sub_accounts !== account.current_balance && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Balance with Sub-Accounts
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 500,
                              color: parseFloat(account.current_balance_with_sub_accounts || '0') < 0 ? theme.palette.error.main : 'inherit'
                            }}
                          >
                            {formatCurrency(account.current_balance_with_sub_accounts)}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Classification
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {account.classification || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Status
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {account.active ? 'Active' : 'Inactive'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Description Section */}
            {account.description && (
              <Grid container sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        DESCRIPTION
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {account.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* QuickBooks Last Updated */}
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              Last updated in QuickBooks: {formatDateTime(account.qb_last_updated_time)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default AccountDetailDrawer;
