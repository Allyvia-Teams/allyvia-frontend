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
import { IconX, IconChevronLeft, IconChevronRight, IconCheck } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import { QBPurchase, QBPurchaseLine } from 'types/qb';

interface PurchaseDetailDrawerProps {
  open: boolean;
  purchaseId: string | null;
  purchases: QBPurchase[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (purchaseId: string) => void;
}

const PurchaseDetailDrawer = ({ open, purchaseId, purchases, currentIndex, companyId, onClose, onNavigate }: PurchaseDetailDrawerProps) => {
  const theme = useTheme();
  const [purchase, setPurchase] = useState<QBPurchase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && purchaseId) {
      fetchPurchaseDetails();
    }
  }, [open, purchaseId]);

  const fetchPurchaseDetails = async () => {
    if (!purchaseId) return;

    setLoading(true);
    setError(null);
    try {
      const purchaseData = purchases.find((p) => p.id === purchaseId);
      if (purchaseData) {
        setPurchase(purchaseData);
      } else {
        setError('Purchase not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch purchase details');
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

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'Cash':
        return 'success';
      case 'Check':
        return 'info';
      case 'CreditCard':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusChip = (purchase: QBPurchase) => {
    if (purchase.is_voided) {
      return <Chip label="Voided" color="error" size="small" />;
    }
    if (purchase.credit) {
      return <Chip label="Credit" color="info" size="small" />;
    }
    return <Chip label="Paid" color="success" size="small" />;
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
                  onNavigate(purchases[currentIndex - 1].id);
                }
              }}
              disabled={currentIndex <= 0 || purchases.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => {
                if (currentIndex < purchases.length - 1) {
                  onNavigate(purchases[currentIndex + 1].id);
                }
              }}
              disabled={currentIndex >= purchases.length - 1 || purchases.length === 0}
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

        {purchase && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                Purchase {purchase.qb_id}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {getStatusChip(purchase)}
                <Chip label={purchase.payment_type} color={getPaymentTypeColor(purchase.payment_type)} size="small" />
                {purchase.entity_type && <Chip label={purchase.entity_type} variant="outlined" size="small" />}
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  ID: {purchase.qb_id}
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      PAYMENT DETAILS
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Payment Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {purchase.payment_type}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Total Amount
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatCurrency(purchase.amount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Purchase Date
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatDate(purchase.purchase_date)}
                        </Typography>
                      </Box>
                      {purchase.account_name && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Account
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {purchase.account_name}
                          </Typography>
                        </Box>
                      )}
                      {purchase.account_ref_id && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Account ID
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {purchase.account_ref_id}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Currency
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {purchase.currency_ref || 'USD'}
                        </Typography>
                      </Box>
                      {purchase.exchange_rate && purchase.exchange_rate !== 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Exchange Rate
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {purchase.exchange_rate}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {purchase.entity_name && (
                <Grid size={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        {purchase.entity_type === 'Vendor' ? 'VENDOR' : 'CUSTOMER'}
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Name
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {purchase.entity_name}
                          </Typography>
                        </Box>
                        {purchase.entity_ref_id && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="textSecondary">
                              Reference ID
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {purchase.entity_ref_id}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            {purchase.line_items && purchase.line_items.length > 0 && (
              <Grid container sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        LINE ITEMS
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <TableContainer component={Paper} elevation={0}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Description</TableCell>
                              <TableCell>Account/Item</TableCell>
                              <TableCell align="right">Quantity</TableCell>
                              <TableCell align="right">Unit Price</TableCell>
                              <TableCell align="right">Amount</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {purchase.line_items.map((line: QBPurchaseLine) => (
                              <TableRow key={line.id}>
                                <TableCell>{line.description || '-'}</TableCell>
                                <TableCell>{line.account_name || line.item_name || '-'}</TableCell>
                                <TableCell align="right">{line.quantity || '-'}</TableCell>
                                <TableCell align="right">{line.unit_price ? formatCurrency(line.unit_price) : '-'}</TableCell>
                                <TableCell align="right">{formatCurrency(line.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {(purchase.memo || purchase.private_note) && (
              <Grid container sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        NOTES
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      {purchase.memo && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            Memo
                          </Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {purchase.memo}
                          </Typography>
                        </Box>
                      )}
                      {purchase.private_note && (
                        <Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            Private Note
                          </Typography>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {purchase.private_note}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              Last updated in QuickBooks: {formatDateTime(purchase.qb_last_updated_time ?? null)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default PurchaseDetailDrawer;
