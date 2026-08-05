// views/inventory/PurchaseOrders.tsx
//
// The purchase-order list: status, supplier, destination, value, and how much of
// each order has actually arrived.
//
// The status filter is built by purchasing.ts rather than handed to axios as an
// array: `?status=` is repeatable and read with getlist(), and axios's default
// serialiser would send `status[]=draft`, which that call silently ignores — the
// filter would appear to do nothing while returning every order.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { IconPlus, IconRefresh } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { PurchaseOrder, listPurchaseOrders } from 'api/inventoryPurchasing.api';

import {
  PO_STATUSES,
  PoStatus,
  describePurchasingError,
  formatMoney,
  poStatusColor,
  poStatusLabel,
  purchaseOrderListQuery,
  receiptProgress
} from './purchasing';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<PoStatus[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await listPurchaseOrders(purchaseOrderListQuery({ statuses })));
      setError(null);
    } catch (err) {
      setError(describePurchasingError(err));
    } finally {
      setLoading(false);
    }
  }, [statuses]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = (status: PoStatus) =>
    setStatuses((current) => (current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status]));

  return (
    <MainCard
      title="Purchase orders"
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {loading && <CircularProgress size={18} />}
          <Tooltip title="Reload">
            <IconButton size="small" onClick={load}>
              <IconRefresh size={18} />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            startIcon={<IconPlus size={16} />}
            onClick={() => navigate('/inventory/purchase-orders/new')}
          >
            New order
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {PO_STATUSES.map((status) => (
            <Chip
              key={status}
              size="small"
              label={poStatusLabel(status)}
              color={statuses.includes(status) ? poStatusColor(status) : 'default'}
              variant={statuses.includes(status) ? 'filled' : 'outlined'}
              onClick={() => toggleStatus(status)}
            />
          ))}
          <Box flexGrow={1} />
          {statuses.length > 0 && (
            <Button size="small" onClick={() => setStatuses([])}>
              Clear filters
            </Button>
          )}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>PO</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Expected</TableCell>
                <TableCell align="right">Goods</TableCell>
                <TableCell align="right">Landed pool</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Received</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Typography variant="body2" color="text.secondary">
                      No purchase orders match these filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {orders.map((order) => {
                const progress = receiptProgress(order.lines);
                return (
                  <TableRow
                    key={order.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/inventory/purchase-orders/${order.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2">{order.po_number}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={poStatusColor(order.status)} label={poStatusLabel(order.status)} />
                    </TableCell>
                    <TableCell>{order.supplier_name}</TableCell>
                    <TableCell>{order.destination_name}</TableCell>
                    <TableCell>{order.expected_at ?? '—'}</TableCell>
                    <TableCell align="right">{formatMoney(order.goods_value)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Freight, duty and other fees. Spread over the ordered value of the lines, not the received value.">
                        <span>{formatMoney(order.landed_cost_pool)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{formatMoney(order.total_value)}</TableCell>
                    <TableCell align="right">
                      {progress.received}/{progress.ordered}
                      {progress.percent !== null && progress.percent > 0 && progress.percent < 100 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({progress.percent}%)
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </MainCard>
  );
}
