import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { gridSpacing } from 'store/constant';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import MainCard from 'ui-component/cards/MainCard';
import posApi from 'features/pos/api/posApi';
import type { Order } from 'features/pos/types/pos.types';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const PaymentChip: React.FC<{ method: Order['paymentMethod'] }> = ({ method }) => {
  if (method === 'cash') {
    return <Chip label="CASH" size="small" sx={{ bgcolor: 'success.light', color: 'success.dark', fontWeight: 600 }} />;
  }
  if (method === 'card') {
    return <Chip label="CARD" size="small" sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 600 }} />;
  }
  return <Chip label="SPLIT" size="small" sx={{ bgcolor: 'warning.light', color: 'warning.dark', fontWeight: 600 }} />;
};

const POSSalesTab: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['pos-recent-orders'],
    queryFn: () => posApi.fetchRecentOrders()
  });

  const orders: Order[] = data?.items ?? [];
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const cashSales = orders.filter((o) => o.paymentMethod === 'cash').length;
  const cardSales = orders.filter((o) => o.paymentMethod === 'card').length;

  const kpis = [
    { title: 'Recent Sales', value: orders.length, theme: 'default' as const },
    { title: 'Total Revenue', value: fmtMoney(totalRevenue), theme: 'success' as const },
    { title: 'Cash Sales', value: cashSales, theme: 'default' as const },
    { title: 'Card Sales', value: cardSales, theme: 'default' as const }
  ];

  return (
    <>
      <Grid container spacing={gridSpacing}>
        {kpis.map((kpi, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={isLoading} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12 }}>
            <MainCard title="POS Sales (Recent 10)">
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : orders.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No sales recorded yet.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Receipt #</TableCell>
                        <TableCell>Payment Method</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(order.transactionDate ?? order.createdAt)}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{order.receiptNumber ?? '—'}</TableCell>
                          <TableCell>
                            <PaymentChip method={order.paymentMethod} />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" noWrap title={order.items.map((item) => item.product.name).join(', ')}>
                              {order.items.map((item) => item.product.name).join(', ') || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {fmtMoney(order.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </MainCard>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default POSSalesTab;
