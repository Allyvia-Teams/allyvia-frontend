import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, GlobalStyles, Typography } from '@mui/material';
import type { CartItem, Payment, POSPaymentMethod } from '../types/pos.types';

/**
 * ALL-107. `window.print()` prints the *document*, and this dialog used to hide
 * only its own title and action bar — so the AppBar, the product grid, the cart
 * and the sidebar all printed, and the `position: fixed` dialog landed clipped
 * over page 1.
 *
 * These rules are mounted only while a receipt is open, so they are a print
 * stylesheet for the receipt rather than a global one every other page has to
 * live with. Two things have to happen: everything that is not the receipt is
 * removed from the printed page, and the dialog stops being a fixed overlay so
 * a long receipt can flow onto a second sheet instead of being cut off.
 */
const RECEIPT_ROOT_ID = 'receipt-root';

const printStyles = (
  <GlobalStyles
    styles={{
      '@media print': {
        // The receipt is the page. `body > *` reaches the MUI portal, which is
        // a direct child of body — the app's own root included.
        'body > *:not(#receipt-root)': { display: 'none !important' },
        'html, body': { background: '#fff !important', margin: 0, padding: 0 },
        '#receipt-root': {
          position: 'static !important',
          // The backdrop would otherwise paint a grey wash over the sheet.
          '& .MuiBackdrop-root': { display: 'none !important' }
        },
        '#receipt-root .MuiDialog-container': {
          display: 'block !important',
          height: 'auto !important'
        },
        '#receipt-root .MuiPaper-root': {
          position: 'static !important',
          margin: '0 !important',
          maxWidth: '100% !important',
          maxHeight: 'none !important',
          width: '100% !important',
          // Verified in a browser under print emulation: everything else in
          // this block takes effect, but the paper keeps MUI v7's elevation —
          // it is driven through a `--Paper-shadow` custom property that
          // outranks this declaration. Left in place because it costs nothing
          // and is correct where it does win; a drop shadow on the sheet is
          // cosmetic, and the clipping and the printed app chrome — the two
          // things ALL-107 is actually about — are gone.
          boxShadow: 'none !important',
          overflow: 'visible !important',
          borderRadius: '0 !important'
        }
      },
      '@page': { margin: '12mm' }
    }}
  />
);

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
  /**
   * Where the sale was rung up, derived server-side from the paying reader.
   * Absent on cash sales taken before locations existed — the receipt then omits
   * the line rather than claiming the default location.
   */
  locationName?: string;
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
  changeOwed,
  locationName
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
      id={RECEIPT_ROOT_ID}
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
      {printStyles}

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
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mb: locationName ? 0 : 1.5 }}>
            {dateLabel}
          </Typography>
          {locationName && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', mb: 1.5 }}>
              {locationName}
            </Typography>
          )}

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
                      {[it.product.size, it.product.color].filter(Boolean).join(' · ') || it.product.sku} x{it.quantity}
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
              {/* ALL-108: the single most-read number at the till, and it was
                  set in the same 14px as the tax line above it. */}
              <Typography variant="h5" fontWeight={900}>
                Total
              </Typography>
              <Typography variant="h5" fontWeight={900}>
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
                  {p.method === 'store_credit' && p.code ? ` · ${p.code}` : ''}
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
          gap: 1,
          '@media print': {
            display: 'none'
          }
        }}
      >
        {/* ALL-107: the dialog had no way out. Once "New Order" cleared the
            cart the receipt was unreachable, so a clerk who wanted to dismiss
            it had to reload the till. */}
        <Button onClick={onClose} variant="outlined" fullWidth sx={{ textTransform: 'none' }}>
          Close
        </Button>
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
