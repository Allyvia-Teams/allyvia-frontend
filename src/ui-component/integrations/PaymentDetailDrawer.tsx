import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Grid,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconCreditCard,
  IconCash,
  IconCheck as IconCheckPayment,
  IconBuildingBank,
  IconCheck
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { useTheme } from '@mui/material/styles';

interface PaymentDetailDrawerProps {
  open: boolean;
  paymentId: string | null;
  payments: any[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (paymentId: string) => void;
}

const PaymentDetailDrawer: React.FC<PaymentDetailDrawerProps> = ({
  open,
  paymentId,
  payments,
  currentIndex,
  companyId,
  onClose,
  onNavigate
}) => {
  const theme = useTheme();
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId, open]);

  const fetchPaymentDetails = async () => {
    if (!paymentId) return;

    setLoading(true);
    setError(null);
    try {
      const paymentData = payments.find((p) => p.id === paymentId);
      if (paymentData) {
        setPaymentDetails(paymentData);
      } else {
        setError('Payment not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch payment details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0 && payments[currentIndex - 1]) {
      onNavigate(payments[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < payments.length - 1 && payments[currentIndex + 1]) {
      onNavigate(payments[currentIndex + 1].id);
    }
  };

  const getPaymentMethodIcon = (method: string | undefined) => {
    const methodName = method?.toLowerCase() || '';
    if (methodName.includes('cash')) {
      return <IconCash size={20} />;
    } else if (methodName.includes('check')) {
      return <IconCheckPayment size={20} />;
    } else if (methodName.includes('card') || methodName.includes('credit')) {
      return <IconCreditCard size={20} />;
    } else if (methodName.includes('eft') || methodName.includes('transfer') || methodName.includes('bank')) {
      return <IconBuildingBank size={20} />;
    } else {
      return <IconCreditCard size={20} />;
    }
  };

  const getAppliedStatusColor = () => {
    if (!paymentDetails) return 'default';
    return paymentDetails.unapplied_amount > 0 ? 'warning' : 'success';
  };

  const getAppliedStatusLabel = () => {
    if (!paymentDetails) return '';
    return paymentDetails.unapplied_amount > 0 ? 'Has Unapplied' : 'Fully Applied';
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
              onClick={handlePrevious}
              disabled={currentIndex === 0 || payments.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <Typography variant="body2" color="textSecondary">
              {currentIndex + 1} of {payments.length}
            </Typography>
            <IconButton
              onClick={handleNext}
              disabled={currentIndex >= payments.length - 1 || payments.length === 0}
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

        {paymentDetails && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                {paymentDetails.reference_number || `REF-${paymentDetails.qb_id}`}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="textSecondary">
                  {paymentDetails.customer_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {format(new Date(paymentDetails.payment_date), 'MMM dd, yyyy')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Chip
                  label={getAppliedStatusLabel()}
                  size="small"
                  color={getAppliedStatusColor()}
                  icon={paymentDetails.unapplied_amount === 0 ? <IconCheck size={16} /> : undefined}
                />
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500, color: 'primary.main' }}>
                      $
                      {parseFloat(paymentDetails.amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
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
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 500,
                        color: paymentDetails.unapplied_amount > 0 ? 'warning.main' : 'text.primary'
                      }}
                    >
                      $
                      {parseFloat(paymentDetails.unapplied_amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Unapplied Amount
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {getPaymentMethodIcon(paymentDetails.payment_method_name || paymentDetails.payment_method)}
                      <Typography variant="h5" sx={{ fontWeight: 500 }}>
                        {paymentDetails.payment_method_name || paymentDetails.payment_method || 'Check'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Payment Method
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 500 }}>
                      {paymentDetails.ar_account_ref_name || 'Accounts Receivable'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Deposit Account
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Customer Information
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="textSecondary">
                      Customer Name
                    </Typography>
                    <Typography variant="body1">{paymentDetails.customer_name}</Typography>
                  </Grid>
                  {paymentDetails.customer_ref_id && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" color="textSecondary">
                        Customer ID
                      </Typography>
                      <Typography variant="body1">{paymentDetails.customer_ref_id}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Payment Details
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="textSecondary">
                      Payment Date
                    </Typography>
                    <Typography variant="body1">{format(new Date(paymentDetails.payment_date), 'MMM dd, yyyy')}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="textSecondary">
                      Payment Method
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPaymentMethodIcon(paymentDetails.payment_method_name || paymentDetails.payment_method)}
                      <Typography variant="body1">
                        {paymentDetails.payment_method_name || paymentDetails.payment_method || 'Check'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="textSecondary">
                      Total Amount
                    </Typography>
                    <Typography variant="body1">
                      $
                      {parseFloat(paymentDetails.amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="textSecondary">
                      Unapplied Amount
                    </Typography>
                    <Typography variant="body1">
                      $
                      {parseFloat(paymentDetails.unapplied_amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Typography>
                  </Grid>
                  {paymentDetails.deposit_to_account_ref_id && (
                    <Grid size={12}>
                      <Typography variant="caption" color="textSecondary">
                        Deposit Account
                      </Typography>
                      <Typography variant="body1">{paymentDetails.ar_account_ref_name || 'Accounts Receivable'}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {paymentDetails.line_items && paymentDetails.line_items.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Applied Invoices
                </Typography>
                <Card sx={{ mb: 3 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Transaction ID</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentDetails.line_items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.txn_type || 'Invoice'}</TableCell>
                            <TableCell>{item.txn_id || item.invoice_ref_id || `INV-${index + 1}`}</TableCell>
                            <TableCell align="right">
                              $
                              {parseFloat(item.amount).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </>
            )}

            {paymentDetails.private_note && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Private Notes
                </Typography>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      {paymentDetails.private_note}
                    </Typography>
                  </CardContent>
                </Card>
              </>
            )}

            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Sync Information
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="textSecondary">
                      Sync Status
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={paymentDetails.sync_status || 'synced'}
                        color={paymentDetails.sync_status === 'synced' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="textSecondary">
                      Currency
                    </Typography>
                    <Typography variant="body1">{paymentDetails.currency_ref || 'USD'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Last updated in QuickBooks:{' '}
                {paymentDetails.qb_last_updated_time
                  ? format(new Date(paymentDetails.qb_last_updated_time), 'MMM dd, yyyy HH:mm:ss')
                  : 'Not synced'}
              </Typography>
            </Box>
          </Box>
        )}

        {!paymentDetails && !loading && !error && <Typography>No payment details available</Typography>}
      </Box>
    </Drawer>
  );
};

export default PaymentDetailDrawer;
