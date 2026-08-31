import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Zoom
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import type { CartItem, Payment, POSPaymentMethod, Order } from '../types/pos.types';
import type { CheckoutResult } from '../types/pos.types';
import { useCheckout } from '../hooks/useCheckout';
import { shouldBlockDismissal } from '../checkoutDismissal';

import ReceiptModal from './ReceiptModal';
import CustomerSearchPanel, { type CustomerSelection } from './CustomerSearchPanel';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(n);

export interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onNewOrder: () => void;
  role: 'employee' | 'owner';
  employeeId: string;
  employeeName: string;
  storeName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  discountCode?: string;
}

function normalizeMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function ceilMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.ceil(n * 100) / 100;
}

export default function CheckoutModal({
  open,
  onClose,
  onNewOrder,
  employeeId,
  employeeName,
  storeName,
  items,
  subtotal,
  tax,
  discount,
  total,
  discountCode
}: CheckoutModalProps) {
  const theme = useTheme();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('card');
  const [customerSelection, setCustomerSelection] = useState<CustomerSelection | null>(null);

  const [cardReady, setCardReady] = useState(false);
  const [cashTendered, setCashTendered] = useState<number>(ceilMoney(total));

  const [splitCardAmount, setSplitCardAmount] = useState<number>(normalizeMoney(total));
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { mutate, isPending } = useCheckout({
    onSuccess: (res) => {
      setCheckoutError(null);
      setCheckoutResult(res);
      setStep(2);
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      const msg =
        (typeof data?.error === 'string' ? data.error : null) ||
        (typeof data?.detail === 'string' ? data.detail : null) ||
        (data && typeof data === 'object' ? JSON.stringify(data) : null) ||
        'Checkout failed. Please try again.';
      setCheckoutError(msg);
    }
  });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPaymentMethod('card');
    setCardReady(false);
    setCashTendered(ceilMoney(total));
    setSplitCardAmount(normalizeMoney(total));
    setSplitCashAmount(0);
    setReceiptOpen(false);
    setCheckoutResult(null);
    setCheckoutError(null);
    setCustomerSelection(null);
  }, [open, total]);

  const payments = useMemo<Payment[]>(() => {
    if (paymentMethod === 'card') {
      return [
        {
          method: 'card',
          amount: normalizeMoney(total),
          stripePaymentIntentId: 'pi_mock'
        }
      ];
    }

    if (paymentMethod === 'cash') {
      return [
        {
          method: 'cash',
          amount: normalizeMoney(cashTendered)
        }
      ];
    }

    // split
    return [
      { method: 'card', amount: normalizeMoney(splitCardAmount), stripePaymentIntentId: 'pi_mock' },
      { method: 'cash', amount: normalizeMoney(splitCashAmount) }
    ];
  }, [paymentMethod, cashTendered, splitCardAmount, splitCashAmount, total]);

  const changeOwed = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    const tendered = normalizeMoney(cashTendered);
    return Math.max(0, normalizeMoney(tendered - total));
  }, [paymentMethod, cashTendered, total]);

  const isCashValid = useMemo(() => normalizeMoney(cashTendered) >= normalizeMoney(total), [cashTendered, total]);

  const splitSum = useMemo(() => normalizeMoney(splitCardAmount + splitCashAmount), [splitCardAmount, splitCashAmount]);
  const isSplitValid = useMemo(() => Math.abs(splitSum - normalizeMoney(total)) < 0.005, [splitSum, total]);

  const canPay = useMemo(() => {
    if (paymentMethod === 'card') return cardReady;
    if (paymentMethod === 'cash') return isCashValid;
    return isSplitValid;
  }, [paymentMethod, cardReady, isCashValid, isSplitValid]);

  const orderPayload = useMemo(() => {
    const payload: Omit<Order, 'id' | 'createdAt'> = {
      items,
      subtotal: normalizeMoney(subtotal),
      tax: normalizeMoney(tax),
      discount: normalizeMoney(discount),
      total: normalizeMoney(total),
      paymentMethod,
      payments,
      status: 'completed',
      employeeId
    };
    if (discountCode) {
      payload.discountCode = discountCode;
    }
    if (customerSelection?.type === 'existing') {
      payload.customerId = customerSelection.contact.id;
    } else if (customerSelection?.type === 'new') {
      payload.newContact = customerSelection.info;
    }
    return payload;
  }, [items, subtotal, tax, discount, total, paymentMethod, payments, employeeId, discountCode, customerSelection]);

  const isValidProductId = (id: unknown) => {
    const s = String(id ?? '');
    // Accept integer IDs (real backend) or UUID format
    return /^\d+$/.test(s) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  };

  const handleSubmit = () => {
    const badItem = items.find((it) => !isValidProductId(it.product.id));
    if (badItem) {
      setCheckoutError(`"${badItem.product.name}" has an invalid product ID. Please clear the cart and re-add items from the catalog.`);
      return;
    }
    setCheckoutError(null);
    mutate(orderPayload);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(_event, reason) => {
          // A completed sale must be dismissed through "New Order", which
          // clears the cart; backdrop-click and Escape only closed the dialog
          // (ALL-102). Rule and rationale live in ../checkoutDismissal.
          if (shouldBlockDismissal(reason, { isPending, step })) return;
          onClose();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ px: 3 }}>
          Checkout
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Total due:{' '}
            <Box component="span" sx={{ fontWeight: 800 }}>
              {money(total)}
            </Box>
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3 }}>
          {step !== 2 ? (
            <Stepper activeStep={step} sx={{ mb: 2 }}>
              <Step>
                <StepLabel>Summary</StepLabel>
              </Step>
              <Step>
                <StepLabel>Payment</StepLabel>
              </Step>
              <Step>
                <StepLabel>Success</StepLabel>
              </Step>
            </Stepper>
          ) : null}

          {step === 0 ? (
            <Box>
              <CustomerSearchPanel selection={customerSelection} onSelect={setCustomerSelection} />

              <Divider sx={{ mb: 1.75 }} />

              <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>
                Order Summary
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 240, overflowY: 'auto', pr: 1 }}>
                {items.map((it) => {
                  const lineDiscountPerUnit = it.quantity > 0 ? (it.discountAmount || 0) / it.quantity : 0;
                  const lineSubtotal = it.product.price * it.quantity;
                  const discountedLine = lineSubtotal - (it.discountAmount || 0);
                  return (
                    <Box key={it.product.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={900}
                          sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {it.product.name}{' '}
                          <Typography component="span" variant="caption" color="text.secondary">
                            x{it.quantity}
                          </Typography>
                        </Typography>
                        {lineDiscountPerUnit > 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            Discount applied
                          </Typography>
                        ) : null}
                      </Box>
                      <Typography variant="body2" fontWeight={900}>
                        {money(discountedLine)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <Divider sx={{ my: 1.75 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
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
                  <Typography variant="h6" fontWeight={900} sx={{ color: theme.palette.primary.main }}>
                    {money(total)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1.75 }} />

              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
                  Payment Method
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={paymentMethod}
                  onChange={(_, v) => v && setPaymentMethod(v)}
                  sx={{ '& .MuiToggleButton-root': { textTransform: 'none' } }}
                >
                  <ToggleButton value="card" aria-label="card">
                    <CreditCardIcon fontSize="small" />
                    <Box component="span" sx={{ ml: 1 }}>
                      Card
                    </Box>
                  </ToggleButton>
                  <ToggleButton value="cash" aria-label="cash">
                    <PaymentIcon fontSize="small" />
                    <Box component="span" sx={{ ml: 1 }}>
                      Cash
                    </Box>
                  </ToggleButton>
                  <ToggleButton value="split" aria-label="split">
                    <AccountBalanceWalletIcon fontSize="small" />
                    <Box component="span" sx={{ ml: 1 }}>
                      Split
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', mt: 2 }}>
                <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={() => setStep(1)} sx={{ textTransform: 'none' }}>
                  Continue
                </Button>
              </Box>
            </Box>
          ) : null}

          {step === 1 ? (
            <Box>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>
                Payment Input
              </Typography>

              {paymentMethod === 'card' ? (
                <Box>
                  <TextField
                    fullWidth
                    label="Card details"
                    size="small"
                    placeholder="1234 5678 9012 3456"
                    InputProps={{
                      startAdornment: <CreditCardIcon sx={{ mr: 1 }} />
                    }}
                    sx={{ mb: 2 }}
                    // TODO: integrate Stripe Elements here
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setCardReady(true)}
                    disabled={cardReady || isPending}
                    sx={{ textTransform: 'none' }}
                  >
                    {cardReady ? 'Card Ready' : 'Process Card'}
                  </Button>

                  {cardReady ? (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1.25, fontWeight: 700, color: theme.palette.success.main }}>
                      Card processed successfully (mock).
                    </Typography>
                  ) : null}
                </Box>
              ) : null}

              {paymentMethod === 'cash' ? (
                <Box>
                  <TextField
                    fullWidth
                    label="Amount Tendered"
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    sx={{ mb: 2 }}
                    error={!isCashValid}
                    helperText={!isCashValid ? 'Tendered amount must be at least the total.' : undefined}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={700}>
                      Change
                    </Typography>
                    <Typography variant="body2" fontWeight={900}>
                      {money(changeOwed)}
                    </Typography>
                  </Box>
                </Box>
              ) : null}

              {paymentMethod === 'split' ? (
                <Box>
                  <TextField
                    fullWidth
                    label="Card Amount"
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={splitCardAmount}
                    onChange={(e) => setSplitCardAmount(Number(e.target.value))}
                    sx={{ mb: 1.5 }}
                  />
                  <TextField
                    fullWidth
                    label="Cash Amount"
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={splitCashAmount}
                    onChange={(e) => setSplitCashAmount(Number(e.target.value))}
                    error={!isSplitValid}
                    helperText={!isSplitValid ? `Card + Cash must equal ${money(total)}.` : undefined}
                  />

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Sum: {money(splitSum)}
                  </Typography>
                </Box>
              ) : null}

              <Divider sx={{ my: 1.75 }} />

              {checkoutError ? (
                <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setCheckoutError(null)}>
                  {checkoutError}
                </Alert>
              ) : null}

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                <Button variant="outlined" onClick={() => setStep(0)} disabled={isPending} sx={{ textTransform: 'none' }}>
                  Back
                </Button>

                <Button variant="contained" onClick={handleSubmit} disabled={!canPay || isPending} sx={{ textTransform: 'none' }}>
                  {isPending ? <CircularProgress size={18} sx={{ color: theme.palette.common.white, mr: 1 }} /> : null}
                  Complete Checkout
                </Button>
              </Box>
            </Box>
          ) : null}

          {step === 2 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', pt: 1 }}>
              <Zoom in>
                <Box sx={{ mb: 1.5 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 64, color: theme.palette.success.main }} />
                </Box>
              </Zoom>

              <Typography variant="h6" fontWeight={900} sx={{ mb: 0.5 }}>
                Order Completed
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Receipt #{checkoutResult?.receiptNumber || '—'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setReceiptOpen(true)}
                  sx={{ textTransform: 'none' }}
                  disabled={!checkoutResult}
                >
                  Print Receipt
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    onNewOrder();
                    onClose();
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  New Order
                </Button>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        storeName={storeName}
        employeeName={employeeName}
        orderId={checkoutResult?.orderId || '—'}
        receiptNumber={checkoutResult?.receiptNumber || '—'}
        createdAt={new Date().toISOString()}
        items={items}
        subtotal={subtotal}
        tax={tax}
        discount={discount}
        total={total}
        paymentMethod={paymentMethod}
        payments={payments}
        changeOwed={paymentMethod === 'cash' ? changeOwed : undefined}
        locationName={checkoutResult?.locationName}
      />
    </>
  );
}
