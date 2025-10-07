import { useEffect, useState } from 'react';
import { Drawer, Box, Typography, IconButton, Grid, Card, CardContent, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import { IconX, IconChevronLeft, IconChevronRight, IconCheck } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';

interface VendorDetailDrawerProps {
  open: boolean;
  vendorId: string | null;
  vendors: any[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (vendorId: string) => void;
}

const VendorDetailDrawer = ({ open, vendorId, vendors, currentIndex, companyId, onClose, onNavigate }: VendorDetailDrawerProps) => {
  const theme = useTheme();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && vendorId) {
      fetchVendorDetails();
    }
  }, [open, vendorId]);

  const fetchVendorDetails = async () => {
    if (!vendorId) return;

    setLoading(true);
    setError(null);
    try {
      const vendorData = vendors.find((v) => v.id === vendorId);
      if (vendorData) {
        setVendor(vendorData);
      } else {
        setError('Vendor not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch vendor details');
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
    if (balance > 0) return { label: 'We Owe', color: 'warning' };
    if (balance < 0) return { label: 'Owes Us', color: 'info' };
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
                  onNavigate(vendors[currentIndex - 1].id);
                }
              }}
              disabled={currentIndex <= 0 || vendors.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => {
                if (currentIndex < vendors.length - 1) {
                  onNavigate(vendors[currentIndex + 1].id);
                }
              }}
              disabled={currentIndex >= vendors.length - 1 || vendors.length === 0}
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

        {vendor && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                {vendor.display_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {vendor.company_name && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      {vendor.company_name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                  </>
                )}
                <Typography variant="body2" color="textSecondary">
                  ID: {vendor.qb_id}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Chip
                  label={vendor.active ? 'Active' : 'Inactive'}
                  size="small"
                  color={getStatusColor(vendor.active)}
                  icon={vendor.active ? <IconCheck size={16} /> : undefined}
                />
                {vendor.vendor_1099 && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                    <Chip label="1099 Vendor" size="small" color="primary" />
                  </>
                )}
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(vendor.balance)}
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
                      {getBalanceStatus(vendor.balance).label}
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
                      {vendor.vendor_1099 ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      1099 Vendor
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {vendor.currency_ref || 'USD'}
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
                      {(vendor.given_name || vendor.family_name) && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Contact Name
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {[vendor.given_name, vendor.middle_name, vendor.family_name].filter(Boolean).join(' ') || '-'}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Email
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vendor.primary_email || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Phone
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vendor.primary_phone || '-'}
                        </Typography>
                      </Box>
                      {vendor.mobile_phone && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Mobile
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {vendor.mobile_phone}
                          </Typography>
                        </Box>
                      )}
                      {vendor.fax && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Fax
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {vendor.fax}
                          </Typography>
                        </Box>
                      )}
                      {vendor.tax_identifier && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Tax ID
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {vendor.tax_identifier}
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
                      {vendor.billing_address_line1 && (
                        <Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                            Address
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {vendor.billing_address_line1}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          City
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vendor.billing_address_city || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          State
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vendor.billing_address_state || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Postal Code
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vendor.billing_address_postal_code || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Country
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vendor.billing_address_country || '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {(vendor.print_on_check_name || vendor.acct_num || vendor.bill_rate) && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        VENDOR DETAILS
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        {vendor.print_on_check_name && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="textSecondary">
                                Print on Check Name
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {vendor.print_on_check_name}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {vendor.acct_num && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="textSecondary">
                                Account Number
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {vendor.acct_num}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                        {vendor.bill_rate && (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="textSecondary">
                                Bill Rate
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {formatCurrency(vendor.bill_rate)}
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {vendor.notes && (
              <Grid container sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        NOTES
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {vendor.notes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              Last updated in QuickBooks: {formatDateTime(vendor.qb_last_updated_time)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default VendorDetailDrawer;
