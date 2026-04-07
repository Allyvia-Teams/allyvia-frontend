import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Typography } from '@mui/material';
import type { CartItem, Payment, POSPaymentMethod } from '../types/pos.types';

export interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  storeName: string;
  employeeName: string;
  orderId: string;
  receiptNumber: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: POSPaymentMethod;
  payments: Payment[];
  changeOwed?: number;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(n);

export default function ReceiptModal({
  open,
  onClose,
  storeName,
  employeeName,
  orderId,
  receiptNumber,
  createdAt,
  items,
  subtotal,
  tax,
  discount,
  total,
  paymentMethod,
  payments,
  changeOwed
}: ReceiptModalProps) {
  const created = new Date(createdAt);
  const dateLabel = created.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          '@media print': {
            boxShadow: 'none',
            border: 'none'
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          fontWeight: 900,
          '@media print': {
            display: 'none'
          }
        }}
      >
        Allyvia POS
      </DialogTitle>

      <DialogContent
        sx={{
          p: 2.5,
          '@media print': {
            py: 0
          }
        }}
      >
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 700, mb: 0.5 }}>
            Receipt #{receiptNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mb: 1.5 }}>
            {dateLabel}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Order:{' '}
              <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {orderId}
              </Box>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Employee:{' '}
              <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {employeeName}
              </Box>
            </Typography>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {items.map((it) => {
              const discountPerUnit = it.quantity > 0 ? (it.discountAmount || 0) / it.quantity : 0;
              const unitToShow = Math.max(0, it.product.price - discountPerUnit);
              return (
                <Box key={it.product.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {it.product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {it.product.sku} x{it.quantity}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={900}>
                    {money(unitToShow * it.quantity)}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Subtotal
              </Typography>
              <Typography variant="body2" fontWeight={900}>
                {money(subtotal)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Tax
              </Typography>
              <Typography variant="body2" fontWeight={900}>
                {money(tax)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Discount
              </Typography>
              <Typography variant="body2" fontWeight={900}>
                -{money(discount)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={900}>
                Total
              </Typography>
              <Typography variant="body2" fontWeight={900}>
                {money(total)}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography variant="body2" fontWeight={900}>
              Payment
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Method: {paymentMethod.toUpperCase()}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {payments.map((p, idx) => (
                <Typography key={`${p.method}-${idx}`} variant="caption" color="text.secondary">
                  {p.method.toUpperCase()}: {money(p.amount)}
                </Typography>
              ))}
            </Box>
            {paymentMethod === 'cash' && changeOwed !== undefined && changeOwed > 0 ? (
              <Typography variant="caption" color="text.secondary">
                Change: {money(changeOwed)}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2.5,
          '@media print': {
            display: 'none'
          }
        }}
      >
        <Button
          onClick={() => {
            window.print();
          }}
          variant="contained"
          fullWidth
          sx={{ textTransform: 'none' }}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}
