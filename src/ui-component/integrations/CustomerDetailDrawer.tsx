import { useEffect, useState } from 'react';
import { Drawer, Box, Typography, IconButton, Grid, Card, CardContent, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import { IconX, IconChevronLeft, IconChevronRight, IconCheck } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';

interface CustomerDetailDrawerProps {
  open: boolean;
  customerId: string | null;
  customers: any[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (customerId: string) => void;
}

const CustomerDetailDrawer = ({ open, customerId, customers, currentIndex, companyId, onClose, onNavigate }: CustomerDetailDrawerProps) => {
  const theme = useTheme();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && customerId) {
      fetchCustomerDetails();
    }
  }, [open, customerId]);

  const fetchCustomerDetails = async () => {
    if (!customerId) return;

    setLoading(true);
    setError(null);
    try {
      const customerData = customers.find((c) => c.id === customerId);
      if (customerData) {
        setCustomer(customerData);
      } else {
        setError('Customer not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch customer details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(String(amount)).toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusColor = (active: boolean) => {
    return active ? 'success' : 'default';
  };

  const getBalanceStatus = (balance: number) => {
    if (balance > 0) return { label: 'Has Balance', color: 'warning' };
    if (balance < 0) return { label: 'Credit', color: 'info' };
    return { label: 'Zero Balance', color: 'success' };
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
                  onNavigate(customers[currentIndex - 1].id);
                }
              }}
              disabled={currentIndex <= 0 || customers.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => {
                if (currentIndex < customers.length - 1) {
                  onNavigate(customers[currentIndex + 1].id);
                }
              }}
              disabled={currentIndex >= customers.length - 1 || customers.length === 0}
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

        {customer && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                {customer.display_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {customer.company_name && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      {customer.company_name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                  </>
                )}
                <Typography variant="body2" color="textSecondary">
                  ID: {customer.qb_id}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Chip
                  label={customer.active ? 'Active' : 'Inactive'}
                  size="small"
                  color={getStatusColor(customer.active)}
                  icon={customer.active ? <IconCheck size={16} /> : undefined}
                />
                {customer.is_merged && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                    <Chip label="Merged" size="small" color="info" />
                  </>
                )}
                {customer.is_project && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                    <Chip label="Project" size="small" color="secondary" />
                  </>
                )}
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(customer.balance)}
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
                      {getBalanceStatus(parseFloat(customer.balance || '0')).label}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Balance Status
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {customer.taxable ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Taxable
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {customer.currency_ref || 'USD'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Currency
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      CONTACT INFORMATION
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {(customer.given_name || customer.family_name) && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Contact Name
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {[customer.given_name, customer.middle_name, customer.family_name].filter(Boolean).join(' ') || '-'}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Email
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {customer.primary_email || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Phone
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {customer.primary_phone || '-'}
                        </Typography>
                      </Box>
                      {customer.mobile_phone && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Mobile
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {customer.mobile_phone}
                          </Typography>
                        </Box>
                      )}
                      {customer.primary_tax_identifier && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Tax ID
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {customer.primary_tax_identifier}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      BILLING ADDRESS
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {customer.billing_address_line1 && (
                        <Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                            Address
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {customer.billing_address_line1}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          City
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {customer.billing_address_city || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          State
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {customer.billing_address_state || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Postal Code
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {customer.billing_address_postal_code || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Country
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {customer.billing_address_country || '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {customer.notes && (
              <Grid container sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        NOTES
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {customer.notes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              Last updated in QuickBooks: {formatDateTime(customer.qb_last_updated_time)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default CustomerDetailDrawer;
