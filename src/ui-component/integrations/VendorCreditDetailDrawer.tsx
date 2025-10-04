import { useEffect, useState } from 'react';
import { Drawer, Box, Typography, IconButton, Grid, Card, CardContent, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import { IconX, IconChevronLeft, IconChevronRight, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';

interface VendorCreditDetailDrawerProps {
  open: boolean;
  vendorcreditId: string | null;
  vendorcredits: any[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (vendorcreditId: string) => void;
}

const VendorCreditDetailDrawer = ({
  open,
  vendorcreditId,
  vendorcredits,
  currentIndex,
  companyId,
  onClose,
  onNavigate
}: VendorCreditDetailDrawerProps) => {
  const theme = useTheme();
  const [vendorcredit, setVendorcredit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && vendorcreditId) {
      fetchVendorCreditDetails();
    }
  }, [open, vendorcreditId]);

  const fetchVendorCreditDetails = async () => {
    if (!vendorcreditId) return;

    setLoading(true);
    setError(null);
    try {
      const vendorcreditData = vendorcredits.find((vc) => vc.id === vendorcreditId);
      if (vendorcreditData) {
        setVendorcredit(vendorcreditData);
      } else {
        setError('Vendor credit not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch vendor credit details');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'success';
      case 'applied':
        return 'info';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getAgeStatus = (ageDays: number) => {
    if (ageDays < 30) return { label: 'Recent', color: 'success' };
    if (ageDays < 60) return { label: 'Normal', color: 'info' };
    if (ageDays < 90) return { label: 'Expiring Soon', color: 'warning' };
    return { label: 'Overdue', color: 'error' };
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
                  onNavigate(vendorcredits[currentIndex - 1].id);
                }
              }}
              disabled={currentIndex <= 0 || vendorcredits.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => {
                if (currentIndex < vendorcredits.length - 1) {
                  onNavigate(vendorcredits[currentIndex + 1].id);
                }
              }}
              disabled={currentIndex >= vendorcredits.length - 1 || vendorcredits.length === 0}
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

        {vendorcredit && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                {vendorcredit.vendor_ref_name || 'Vendor Credit'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="textSecondary">
                  Credit #{vendorcredit.doc_number || 'N/A'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  ID: {vendorcredit.id}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Chip
                  label={vendorcredit.status?.toUpperCase() || 'UNKNOWN'}
                  size="small"
                  color={getStatusColor(vendorcredit.status)}
                  icon={vendorcredit.status === 'open' ? <IconCheck size={16} /> : undefined}
                />
                {vendorcredit.is_expiring_soon && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                    <Chip icon={<IconAlertTriangle size={16} />} label="Expiring Soon" size="small" color="warning" />
                  </>
                )}
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(vendorcredit.total_amount)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Amount
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(vendorcredit.balance)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Available Balance
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {vendorcredit.age_days} days
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Age
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {vendorcredit.currency_ref || 'USD'}
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
                      CREDIT INFORMATION
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Transaction Date
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatDate(vendorcredit.txn_date)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Applied Amount
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatCurrency((vendorcredit.total_amount || 0) - (vendorcredit.balance || 0))}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Status
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {getAgeStatus(vendorcredit.age_days).label}
                        </Typography>
                      </Box>
                      {vendorcredit.exchange_rate && vendorcredit.exchange_rate !== 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Exchange Rate
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {vendorcredit.exchange_rate}
                          </Typography>
                        </Box>
                      )}
                      {vendorcredit.ap_account_ref_name && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            AP Account
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {vendorcredit.ap_account_ref_name}
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
                      VENDOR INFORMATION
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Vendor ID
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vendorcredit.vendor_ref_id}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Vendor Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {vendorcredit.vendor_ref_name}
                        </Typography>
                      </Box>
                      {vendorcredit.vendor_address_line1 && (
                        <Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                            Address
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {vendorcredit.vendor_address_line1}
                            {vendorcredit.vendor_address_city && (
                              <>
                                <br />
                                {vendorcredit.vendor_address_city}
                              </>
                            )}
                            {vendorcredit.vendor_address_state && `, ${vendorcredit.vendor_address_state}`}
                            {vendorcredit.vendor_address_postal_code && ` ${vendorcredit.vendor_address_postal_code}`}
                            {vendorcredit.vendor_address_country && (
                              <>
                                <br />
                                {vendorcredit.vendor_address_country}
                              </>
                            )}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {vendorcredit.private_note && (
              <Grid container sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        NOTES
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {vendorcredit.private_note}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              Last updated in QuickBooks: {formatDateTime(vendorcredit.qb_last_updated_time)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default VendorCreditDetailDrawer;
