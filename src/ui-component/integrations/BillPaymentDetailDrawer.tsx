import { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconBan,
  IconCreditCard,
  IconBuildingBank,
  IconCash,
  IconFileCheck
} from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';

interface BillPaymentDetailDrawerProps {
  open: boolean;
  paymentId: string | null;
  payments: any[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (paymentId: string) => void;
}

const BillPaymentDetailDrawer = ({
  open,
  paymentId,
  payments,
  currentIndex,
  companyId,
  onClose,
  onNavigate
}: BillPaymentDetailDrawerProps) => {
  const theme = useTheme();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && paymentId) {
      fetchPaymentDetails();
    }
  }, [open, paymentId]);

  const fetchPaymentDetails = async () => {
    if (!paymentId) return;

    setLoading(true);
    setError(null);
    try {
      const paymentData = payments.find((p) => p.id === paymentId);
      if (paymentData) {
        setPayment(paymentData);
      } else {
        setError('Bill payment not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch payment details');
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

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'Check':
        return <IconFileCheck size={20} />;
      case 'CreditCard':
        return <IconCreditCard size={20} />;
      case 'Cash':
        return <IconCash size={20} />;
      case 'ACHTransfer':
      case 'Bank Transfer':
        return <IconBuildingBank size={20} />;
      default:
        return null;
    }
  };

  const getPaymentStatus = (paymentItem: any) => {
    if (paymentItem?.is_voided) {
      return { label: 'Voided', color: 'error', icon: <IconBan size={16} /> };
    }
    if (paymentItem?.payment_type === 'Check' && paymentItem?.check_payment_print_status === 'NeedToPrint') {
      return { label: 'Pending Print', color: 'warning' };
    }
    return { label: 'Completed', color: 'success', icon: <IconCheck size={16} /> };
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
                  onNavigate(payments[currentIndex - 1].id);
                }
              }}
              disabled={currentIndex <= 0 || payments.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => {
                if (currentIndex < payments.length - 1) {
                  onNavigate(payments[currentIndex + 1].id);
                }
              }}
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

        {payment && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                Bill Payment {payment.doc_number || payment.qb_id}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="textSecondary">
                  {payment.vendor_ref_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatDate(payment.payment_date)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                {getPaymentTypeIcon(payment.payment_type) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getPaymentTypeIcon(payment.payment_type)}
                    <Typography variant="body2" color="textSecondary">
                      {payment.payment_type}
                    </Typography>
                  </Box>
                )}
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Chip
                  label={getPaymentStatus(payment).label}
                  size="small"
                  color={getPaymentStatus(payment).color as any}
                  icon={getPaymentStatus(payment).icon}
                />
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(payment.total_amount)}
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
                      {payment.payment_type}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Payment Method
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {payment.line_items?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Bills Paid
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {payment.currency_ref || 'USD'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Currency
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
                Payment Details
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                      Vendor
                    </Typography>
                    <Typography variant="body1">{payment.vendor_ref_name || '-'}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                      Payment Date
                    </Typography>
                    <Typography variant="body1">{formatDate(payment.payment_date)}</Typography>
                  </Box>
                  {payment.payment_type === 'Check' && (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                          Check Number
                        </Typography>
                        <Typography variant="body1">{payment.check_payment_check_number || '-'}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                          Print Status
                        </Typography>
                        <Typography variant="body1">{payment.check_payment_print_status || '-'}</Typography>
                      </Box>
                    </>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  {(payment.bank_account_ref_name || payment.check_payment_bank_account_ref_id) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        Bank Account
                      </Typography>
                      <Typography variant="body1">
                        {payment.bank_account_ref_name || 'Account #' + payment.check_payment_bank_account_ref_id}
                      </Typography>
                    </Box>
                  )}
                  {payment.credit_card_account_ref_name && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        Credit Card Account
                      </Typography>
                      <Typography variant="body1">{payment.credit_card_account_ref_name}</Typography>
                    </Box>
                  )}
                  {payment.private_note && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        Private Note
                      </Typography>
                      <Typography variant="body1">{payment.private_note}</Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>

            {payment.line_items && payment.line_items.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
                  Bills Being Paid
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Bill Reference</TableCell>
                        <TableCell>Bill Name</TableCell>
                        <TableCell align="right">Amount Applied</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payment.line_items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.bill_ref_id}</TableCell>
                          <TableCell>{item.bill_ref_name || '-'}</TableCell>
                          <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="textSecondary">
                QuickBooks Last Updated: {formatDateTime(payment.qb_last_updated_time)}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default BillPaymentDetailDrawer;
