import React, { useMemo, useState } from 'react';
import { Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Typography, Collapse, Button } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import type { POSPaymentMethod } from '../types/pos.types';
import { useRecentOrders } from '../hooks/usePOSProducts';

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

function methodChipColor(method: POSPaymentMethod) {
  if (method === 'card') return 'primary';
  if (method === 'cash') return 'success';
  return 'secondary';
}

export interface RecentOrdersDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function RecentOrdersDrawer({ open, onClose }: RecentOrdersDrawerProps) {
  const { data, isLoading } = useRecentOrders();

  const orders = data?.items || [];
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const summaryRows = useMemo(() => {
    return orders.map((o) => {
      const itemCount = o.items.reduce((sum, it) => sum + it.quantity, 0);
      return { ...o, itemCount };
    });
  }, [orders]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 350, borderLeft: '1px solid', borderColor: 'divider', p: 2 }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AccessTimeIcon color="primary" />
        <Typography variant="h6" fontWeight={900}>
          Recent Orders
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading recent orders...
        </Typography>
      ) : orders.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No orders yet in this session.
        </Typography>
      ) : (
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {summaryRows.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <Box key={order.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <ListItemButton
                  onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                  sx={{ py: 1.25, px: 2 }}
                >
                  <Box sx={{ flex: 1 }}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight={900}>
                          #{order.id}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(order.createdAt)} · {order.items.length} lines · {order.items.reduce((s, it) => s + it.quantity, 0)}{' '}
                          items
                          {/* Omitted, not defaulted, when the sale predates locations. */}
                          {order.locationName ? ` · ${order.locationName}` : ''}
                        </Typography>
                      }
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, pr: 0.5 }}>
                    <Chip size="small" label={`$${order.total.toFixed(2)}`} color="default" variant="outlined" />
                    <Chip size="small" label={order.paymentMethod.toUpperCase()} color={methodChipColor(order.paymentMethod)} />
                    <IconButton size="small" onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}>
                      <ExpandMoreIcon
                        sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}
                        fontSize="small"
                      />
                    </IconButton>
                  </Box>
                </ListItemButton>

                <Collapse in={isExpanded} timeout={200}>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 1 }}>
                      Line items
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {order.items.map((it) => (
                        <Box key={it.product.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            {it.product.sku} x{it.quantity}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 900 }}>
                            ${(it.product.price * it.quantity - it.discountAmount).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={() => {
                        // TODO: hook up refund flow
                        console.log('Refund placeholder', order.id);
                      }}
                    >
                      Refund
                    </Button>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </List>
      )}
    </Drawer>
  );
}
