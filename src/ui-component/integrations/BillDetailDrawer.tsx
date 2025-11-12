import { useEffect, useState } from 'react';
import { Drawer, Box, Typography, IconButton, Grid, Card, CardContent, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import { IconX, IconChevronLeft, IconChevronRight, IconCheck } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';

interface BillDetailDrawerProps {
  open: boolean;
  billId: string | null;
  bills: any[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (billId: string) => void;
}

const BillDetailDrawer = ({ open, billId, bills, currentIndex, companyId, onClose, onNavigate }: BillDetailDrawerProps) => {
  const theme = useTheme();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && billId) {
      fetchBillDetails();
    }
  }, [open, billId]);

  const fetchBillDetails = async () => {
    if (!billId) return;

    setLoading(true);
    setError(null);
    try {
      const billData = bills.find((b) => b.id === billId);
      if (billData) {
        setBill(billData);
      } else {
        setError('Bill not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch bill details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '-';
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

  const calculateStatus = (billItem: any) => {
    if (!billItem) return 'unknown';
    if (parseFloat(billItem.balance) === 0) return 'Paid';
    if (billItem.due_date && new Date(billItem.due_date) < new Date()) return 'Overdue';
    return 'Unpaid';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'unpaid':
        return 'warning';
      default:
        return 'default';
    }
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
                  onNavigate(bills[currentIndex - 1].id);
                }
              }}
              disabled={currentIndex <= 0 || bills.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => {
                if (currentIndex < bills.length - 1) {
                  onNavigate(bills[currentIndex + 1].id);
                }
              }}
              disabled={currentIndex >= bills.length - 1 || bills.length === 0}
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

        {bill && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                {bill.vendor_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {bill.doc_number && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      Bill #: {bill.doc_number}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                  </>
                )}
                <Typography variant="body2" color="textSecondary">
                  Due: {formatDate(bill.due_date)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Chip
                  label={calculateStatus(bill)}
                  size="small"
                  color={getStatusColor(calculateStatus(bill))}
                  icon={calculateStatus(bill) === 'Paid' ? <IconCheck size={16} /> : undefined}
                />
              </Box>
            </Box>

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2, px: 2.5 }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(bill.amount)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Amount
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2, px: 2.5 }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(bill.balance)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Balance Due
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2, px: 2.5 }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatDate(bill.bill_date)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Bill Date
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2, px: 2.5 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 500,
                        color:
                          bill.due_date && new Date(bill.due_date) < new Date() && parseFloat(bill.balance) > 0
                            ? theme.palette.error.main
                            : 'inherit'
                      }}
                    >
                      {formatDate(bill.due_date)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Due Date
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent sx={{ py: 2, px: 2.5 }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                      PAYMENT INFORMATION
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {bill.sales_term_ref_name && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Terms
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {bill.sales_term_ref_name}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Currency
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {bill.currency_ref || 'USD'}
                        </Typography>
                      </Box>
                      {bill.exchange_rate && bill.exchange_rate !== '1.000000' && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Exchange Rate
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {bill.exchange_rate}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="textSecondary">
                          Sync Status
                        </Typography>
                        <Chip
                          label={bill.sync_status || 'Unknown'}
                          size="small"
                          color={bill.sync_status === 'synced' ? 'success' : 'warning'}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent sx={{ py: 2, px: 2.5 }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                      VENDOR DETAILS
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Vendor ID
                        </Typography>
                        <Typography variant="body1">{bill.vendor_ref_id || '-'}</Typography>
                      </Box>
                      {(bill.vendor_addr_line1 || bill.vendor_addr_city) && (
                        <Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                            Address
                          </Typography>
                          <Typography variant="body1">
                            {bill.vendor_addr_line1 && (
                              <>
                                {bill.vendor_addr_line1}
                                <br />
                              </>
                            )}
                            {bill.vendor_addr_city && `${bill.vendor_addr_city}, `}
                            {bill.vendor_addr_state} {bill.vendor_addr_postal_code}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {bill.line_items && bill.line_items.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ py: 2, px: 2.5 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                    LINE ITEMS
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  {bill.line_items.map((item: any, index: number) => (
                    <Box
                      key={index}
                      sx={{ mb: 1.5, pb: 1.5, borderBottom: index < bill.line_items.length - 1 ? 1 : 0, borderColor: 'divider' }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="textSecondary">
                          {item.description || `Line Item ${index + 1}`}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatCurrency(item.amount)}
                        </Typography>
                      </Box>
                      {item.account_name && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          Account: {item.account_name}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}

            {(bill.memo || bill.private_note) && (
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ py: 2, px: 2.5 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                    NOTES
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  {bill.memo && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        Memo:
                      </Typography>
                      <Typography variant="body1">{bill.memo}</Typography>
                    </Box>
                  )}
                  {bill.private_note && (
                    <Box>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                        Private Note:
                      </Typography>
                      <Typography variant="body1">{bill.private_note}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ py: 2, px: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                  ACCOUNTING
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {bill.ap_account_ref_name && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        AP Account:
                      </Typography>
                      <Typography variant="body1">{bill.ap_account_ref_name}</Typography>
                    </Box>
                  )}
                  {bill.tax_total_amount && parseFloat(bill.tax_total_amount) > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Tax Amount:
                      </Typography>
                      <Typography variant="body1">{formatCurrency(bill.tax_total_amount)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">
                      QuickBooks ID:
                    </Typography>
                    <Typography variant="body1">{bill.qb_id}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              Last updated in QuickBooks: {formatDateTime(bill.qb_last_updated_time || bill.last_synced_at)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default BillDetailDrawer;
