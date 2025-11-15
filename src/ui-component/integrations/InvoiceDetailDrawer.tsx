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
import { IconX, IconChevronLeft, IconChevronRight, IconCheck, IconMail } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import { QBInvoice } from 'types/qb';

interface InvoiceDetailDrawerProps {
  open: boolean;
  invoiceId: string | null;
  invoices: QBInvoice[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (invoiceId: string) => void;
}

const InvoiceDetailDrawer = ({ open, invoiceId, invoices, currentIndex, companyId, onClose, onNavigate }: InvoiceDetailDrawerProps) => {
  const theme = useTheme();
  const [invoice, setInvoice] = useState<QBInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoiceDetails();
    }
  }, [open, invoiceId]);

  const fetchInvoiceDetails = async () => {
    if (!invoiceId) return;

    setLoading(true);
    setError(null);
    try {
      const invoiceData = invoices.find((inv) => inv.id === invoiceId);
      if (invoiceData) {
        setInvoice(invoiceData);
      } else {
        setError('Invoice not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch invoice details');
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

  const getPaymentStatus = (invoiceItem: QBInvoice) => {
    const today = new Date();
    const dueDate = new Date(invoiceItem.due_date);

    if (invoiceItem.balance === 0) {
      return { label: 'Paid', color: 'success' };
    } else if (dueDate < today) {
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return { label: `Overdue (${daysOverdue} days)`, color: 'error' };
    } else {
      return { label: 'Outstanding', color: 'warning' };
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
                  onNavigate(invoices[currentIndex - 1].id);
                }
              }}
              disabled={currentIndex <= 0 || invoices.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => {
                if (currentIndex < invoices.length - 1) {
                  onNavigate(invoices[currentIndex + 1].id);
                }
              }}
              disabled={currentIndex >= invoices.length - 1 || invoices.length === 0}
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

        {invoice && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                Invoice {invoice.doc_number || 'Unnumbered'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="textSecondary">
                  {invoice.customer_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Invoice Date: {formatDate(invoice.date)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Chip
                  label={getPaymentStatus(invoice).label}
                  size="small"
                  color={getPaymentStatus(invoice).color as any}
                  icon={invoice.balance === 0 ? <IconCheck size={16} /> : undefined}
                />
                {invoice.is_voided && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                    <Chip label="Voided" size="small" color="error" />
                  </>
                )}
                {invoice.emailed_at && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                    <Chip label="Emailed" size="small" color="info" icon={<IconMail size={16} />} />
                  </>
                )}
              </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(invoice.total_amount)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Invoice Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(invoice.balance)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Balance Due
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatCurrency(invoice.total_amount - invoice.balance)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Amount Paid
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatDate(invoice.due_date)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Due Date
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Main Content */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      BILLING INFORMATION
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Customer
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {invoice.customer_name}
                        </Typography>
                      </Box>
                      {invoice.bill_email && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Billing Email
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {invoice.bill_email}
                          </Typography>
                        </Box>
                      )}
                      {invoice.sales_term_ref_name && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Payment Terms
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {invoice.sales_term_ref_name}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Currency
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {invoice.currency}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      PAYMENT DETAILS
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Subtotal
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatCurrency((invoice.total_amount || 0) - (invoice.tax_total_amount || 0) + (invoice.discount_amount || 0))}
                        </Typography>
                      </Box>
                      {invoice.discount_amount && invoice.discount_amount > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Discount
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: theme.palette.success.main }}>
                            -{formatCurrency(invoice.discount_amount)}
                          </Typography>
                        </Box>
                      )}
                      {invoice.tax_total_amount && invoice.tax_total_amount > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Tax
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {formatCurrency(invoice.tax_total_amount)}
                          </Typography>
                        </Box>
                      )}
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Total
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {formatCurrency(invoice.total_amount)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Addresses */}
            {(invoice.bill_addr_line1 || invoice.ship_addr_line1) && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {invoice.bill_addr_line1 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                          BILLING ADDRESS
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="body1">{invoice.bill_addr_line1}</Typography>
                          {(invoice.bill_addr_city || invoice.bill_addr_state || invoice.bill_addr_postal_code) && (
                            <Typography variant="body1">
                              {[invoice.bill_addr_city, invoice.bill_addr_state, invoice.bill_addr_postal_code].filter(Boolean).join(', ')}
                            </Typography>
                          )}
                          {invoice.bill_addr_country && <Typography variant="body1">{invoice.bill_addr_country}</Typography>}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {invoice.ship_addr_line1 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                          SHIPPING ADDRESS
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="body1">{invoice.ship_addr_line1}</Typography>
                          {(invoice.ship_addr_city || invoice.ship_addr_state || invoice.ship_addr_postal_code) && (
                            <Typography variant="body1">
                              {[invoice.ship_addr_city, invoice.ship_addr_state, invoice.ship_addr_postal_code].filter(Boolean).join(', ')}
                            </Typography>
                          )}
                          {invoice.ship_addr_country && <Typography variant="body1">{invoice.ship_addr_country}</Typography>}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Line Items */}
            {invoice.line_items && invoice.line_items.length > 0 && (
              <Grid container sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        LINE ITEMS
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Item</TableCell>
                              <TableCell>Description</TableCell>
                              <TableCell align="right">Quantity</TableCell>
                              <TableCell align="right">Unit Price</TableCell>
                              <TableCell align="right">Amount</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {invoice.line_items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.item_name || '-'}</TableCell>
                                <TableCell>{item.description || '-'}</TableCell>
                                <TableCell align="right">{item.quantity || '-'}</TableCell>
                                <TableCell align="right">{item.unit_price ? formatCurrency(item.unit_price) : '-'}</TableCell>
                                <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
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

            {/* Additional Info */}
            {invoice.allow_online_credit_card && (
              <Grid container sx={{ mb: 3 }}>
                <Grid size={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                        ONLINE PAYMENT OPTIONS
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Credit Card Payments
                          </Typography>
                          <Chip
                            label={invoice.allow_online_credit_card ? 'Enabled' : 'Disabled'}
                            size="small"
                            color={invoice.allow_online_credit_card ? 'success' : 'default'}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            ACH Payments
                          </Typography>
                          <Chip
                            label={invoice.allow_online_ach ? 'Enabled' : 'Disabled'}
                            size="small"
                            color={invoice.allow_online_ach ? 'success' : 'default'}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Footer */}
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 3 }}>
              Last updated in QuickBooks: {formatDateTime(invoice.qb_last_updated_time ?? null)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default InvoiceDetailDrawer;
