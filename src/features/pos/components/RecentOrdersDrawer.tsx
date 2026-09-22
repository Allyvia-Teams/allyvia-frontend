import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import type { Order, POSPaymentMethod } from '../types/pos.types';
import { useRecentOrders } from '../hooks/usePOSProducts';
import { buildRecentOrdersView } from '../utils/recentOrdersView';
import { refundEligibility } from '../utils/refundView';
import RefundDialog from './RefundDialog';

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
  const { data, isLoading, isError, refetch } = useRecentOrders();

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // The order whose refund dialog is open. The drawer keeps its Refund button
  // but no longer owns the dialog: RefundDialog is shared with the Refunds
  // page so the till and the returns lookup open the same one (ALL-71).
  const [refunding, setRefunding] = useState<Order | null>(null);

  // A failed fetch must never render as "no orders yet" — that is what sends
  // a clerk back to ring the same sale twice. See buildRecentOrdersView.
  const view = buildRecentOrdersView({ items: data?.items || [], isLoading, isError });
  const summaryRows = view.orders;

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

      {view.status === 'loading' ? (
        <Typography variant="body2" color="text.secondary">
          Loading recent orders...
        </Typography>
      ) : view.status === 'error' ? (
        <Box>
          <Typography variant="body2" color="error" sx={{ fontWeight: 700, mb: 0.5 }}>
            {view.errorLabel}
          </Typography>
          <Button size="small" variant="outlined" onClick={() => refetch()}>
            Retry
          </Button>
        </Box>
      ) : view.status === 'empty' ? (
        <Typography variant="body2" color="text.secondary">
          {view.emptyLabel}
        </Typography>
      ) : (
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {isError && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" color="error">
                This list may be out of date — the refresh failed.
              </Typography>
              <Button size="small" onClick={() => refetch()}>
                Retry
              </Button>
            </Box>
          )}
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
                            {it.product.name}
                            {[it.product.size, it.product.color].filter(Boolean).length
                              ? ` · ${[it.product.size, it.product.color].filter(Boolean).join(' · ')}`
                              : it.product.sku
                                ? ` · ${it.product.sku}`
                                : ''}{' '}
                            x{it.quantity}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 900 }}>
                            ${(it.product.price * it.quantity - it.discountAmount).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {(() => {
                      const eligibility = refundEligibility(order);
                      return (
                        /* A disabled button still needs to say why, or the
                           clerk reads it as the system being broken. */
                        <Tooltip title={eligibility.canRefund ? '' : eligibility.reason}>
                          <span>
                            <Button
                              variant="outlined"
                              size="small"
                              sx={{ mt: 1 }}
                              disabled={!eligibility.canRefund}
                              onClick={() => setRefunding(order)}
                            >
                              Refund
                            </Button>
                          </span>
                        </Tooltip>
                      );
                    })()}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </List>
      )}

      <RefundDialog open={refunding !== null} order={refunding} onClose={() => setRefunding(null)} />
    </Drawer>
  );
}
