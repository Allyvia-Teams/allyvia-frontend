import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import ContactlessIcon from '@mui/icons-material/Contactless';
import { useQueryClient } from '@tanstack/react-query';

import { useSelector } from 'store';
import stripeApi from 'api/stripe.api';
import type { CartItem, Payment, POSPaymentMethod, Order } from '../types/pos.types';
import type { CheckoutResult } from '../types/pos.types';
import posApi from '../api/posApi';
import { invalidatePosQueries, useCheckout } from '../hooks/useCheckout';
import { shouldBlockDismissal } from '../checkoutDismissal';
import {
  CardDeclinedError,
  cancelPaymentCollection,
  collectAndProcess,
  connectReader,
  discoverReaders,
  type TerminalReader
} from '../terminal/stripeTerminal';

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// How long the register waits for the backend to confirm a charge the reader
// already reported successful (the payment-status endpoint live-checks Stripe,
// so one round usually suffices; the retries cover transient network blips).
const CONFIRM_ATTEMPTS = 5;
const CONFIRM_DELAY_MS = 1000;

const isValidProductId = (id: unknown) => {
  const s = String(id ?? '');
  // Accept integer IDs (real backend) or UUID format
  return /^\d+$/.test(s) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
};

function errorMessage(err: unknown): string {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  return (
    (typeof data?.error === 'string' ? data.error : null) ||
    (typeof data?.detail === 'string' ? data.detail : null) ||
    (data && typeof data === 'object' ? JSON.stringify(data) : null) ||
    (anyErr instanceof Error && anyErr.message ? anyErr.message : null) ||
    'Checkout failed. Please try again.'
  );
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

  const queryClient = useQueryClient();
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('card');
  const [customerSelection, setCustomerSelection] = useState<CustomerSelection | null>(null);

  // --- Terminal (Stripe card-present) state -------------------------------
  const [discovering, setDiscovering] = useState(false);
  const [readers, setReaders] = useState<TerminalReader[]>([]);
  const [connectingReaderId, setConnectingReaderId] = useState<string | null>(null);
  const [connectedReaderId, setConnectedReaderId] = useState<string | null>(null);
  const [charging, setCharging] = useState(false);
  const [cancellingCharge, setCancellingCharge] = useState(false);
  const cancelRequestedRef = React.useRef(false);
  // The draft sale created server-side before the card is presented. Kept
  // across declined attempts so a retry charges the SAME sale (idempotent
  // PaymentIntent) instead of ringing the order up twice.
  const [draftOrder, setDraftOrder] = useState<CheckoutResult | null>(null);

  const [cashTendered, setCashTendered] = useState<number>(ceilMoney(total));

  const [splitCardAmount, setSplitCardAmount] = useState<number>(normalizeMoney(total));
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

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
    setDiscovering(false);
    setReaders([]);
    setConnectingReaderId(null);
    setConnectedReaderId(null);
    setCharging(false);
    setCancellingCharge(false);
    cancelRequestedRef.current = false;
    setDraftOrder(null);
    setCashTendered(ceilMoney(total));
    setSplitCardAmount(normalizeMoney(total));
    setSplitCashAmount(0);
    setReceiptOpen(false);
    setCheckoutResult(null);
    setCheckoutError(null);
    setCheckoutNotice(null);
    setCustomerSelection(null);
  }, [open, total]);

  const payments = useMemo<Payment[]>(() => {
    if (paymentMethod === 'card') {
      return [
        {
          method: 'card',
          amount: normalizeMoney(total)
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

    // split — the backend re-derives the card leg as (total − cash), so these
    // amounts are declarative; validation happens on both sides.
    return [
      { method: 'card', amount: normalizeMoney(splitCardAmount) },
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

  const usesTerminal = paymentMethod === 'card' || paymentMethod === 'split';
  const cardChargeAmount = paymentMethod === 'split' ? normalizeMoney(splitCardAmount) : normalizeMoney(total);

  const canPay = useMemo(() => {
    if (paymentMethod === 'card') return !!connectedReaderId && !charging;
    if (paymentMethod === 'cash') return isCashValid;
    return isSplitValid && !!connectedReaderId && !charging;
  }, [paymentMethod, connectedReaderId, charging, isCashValid, isSplitValid]);

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

  const validateCart = useCallback((): boolean => {
    const badItem = items.find((it) => !isValidProductId(it.product.id));
    if (badItem) {
      setCheckoutError(`"${badItem.product.name}" has an invalid product ID. Please clear the cart and re-add items from the catalog.`);
      return false;
    }
    return true;
  }, [items]);

  const handleSubmit = () => {
    if (!validateCart()) return;
    setCheckoutError(null);
    mutate(orderPayload);
  };

  // --- Terminal flow -------------------------------------------------------

  const handleConnectReader = useCallback(
    async (reader: TerminalReader) => {
      if (!companyId) return;
      setConnectingReaderId(reader.id);
      setCheckoutError(null);
      try {
        const connected = await connectReader(companyId, reader);
        setConnectedReaderId(connected.id);
      } catch (err) {
        setConnectedReaderId(null);
        setCheckoutError(errorMessage(err));
      } finally {
        setConnectingReaderId(null);
      }
    },
    [companyId]
  );

  const handleDiscoverReaders = useCallback(async () => {
    if (!companyId) {
      setCheckoutError('No store is selected for this register, so card payments are unavailable.');
      return;
    }
    setDiscovering(true);
    setCheckoutError(null);
    try {
      const { readers: found } = await discoverReaders(companyId);
      setReaders(found);
      // One reader on the counter is the common case — connect it without a tap.
      if (found.length === 1) {
        await handleConnectReader(found[0]);
      }
    } catch (err) {
      setCheckoutError(errorMessage(err));
    } finally {
      setDiscovering(false);
    }
  }, [companyId, handleConnectReader]);

  // Reaching the payment step with a card leg starts reader discovery
  // immediately, so the reader is usually connected before the clerk can tap
  // the charge button.
  useEffect(() => {
    if (!open || step !== 1 || !usesTerminal) return;
    if (discovering || readers.length > 0) return;
    handleDiscoverReaders();
  }, [open, step, usesTerminal]);

  const handleCardPayment = async () => {
    if (!validateCart()) return;
    if (!companyId) {
      setCheckoutError('No store is selected for this register, so card payments are unavailable.');
      return;
    }
    setCheckoutError(null);
    setCheckoutNotice(null);
    setCharging(true);
    try {
      // 1. The sale itself, created server-side as a draft. Kept across retry
      //    attempts — resubmitting after a decline must not ring up a second
      //    sale or decrement stock twice.
      let draft = draftOrder;
      if (!draft) {
        draft = await posApi.submitOrder(orderPayload);
        setDraftOrder(draft);
      }

      // 2. The card-present PaymentIntent (idempotent per sale). The amount is
      //    the server-computed card leg from the draft response.
      const amount = draft.cardAmount != null ? Number(draft.cardAmount) : undefined;
      const intent = await stripeApi.createPosPaymentIntent({ companyId, saleId: draft.orderId, amount });

      // 3. Present the card on the reader — unless a replayed intent already
      //    succeeded (double-tap, flaky network), in which case skip to confirm.
      if (intent.status !== 'succeeded') {
        if (!intent.client_secret) {
          throw new Error('Could not start the card payment. Please try again.');
        }
        await collectAndProcess(companyId, intent.client_secret);
      }

      // 4. Confirm the backend finalized the sale (it live-checks Stripe, so
      //    this does not depend on webhook latency).
      let completed = false;
      for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt += 1) {
        const paymentStatus = await stripeApi.getPosPaymentStatus(companyId, draft.orderId);
        if (paymentStatus.sale_status === 'completed') {
          completed = true;
          break;
        }
        if (paymentStatus.failure_message) {
          throw new CardDeclinedError(paymentStatus.failure_message, paymentStatus.failure_code);
        }
        await sleep(CONFIRM_DELAY_MS);
      }
      if (!completed) {
        throw new Error(
          'The card was charged but the sale has not finalized yet. Check Recent Orders in a moment — do not charge the card again.'
        );
      }

      invalidatePosQueries(queryClient);
      setCheckoutResult({ ...draft, status: 'completed' });
      setStep(2);
    } catch (err) {
      if (cancelRequestedRef.current) {
        setCheckoutError(null);
        setCheckoutNotice('Charge canceled. No payment was collected.');
      } else if (err instanceof CardDeclinedError) {
        setCheckoutError(`${err.message} You can present another card on the reader and try again.`);
      } else {
        setCheckoutError(errorMessage(err));
      }
    } finally {
      cancelRequestedRef.current = false;
      setCancellingCharge(false);
      setCharging(false);
    }
  };

  const handleCancelCharge = async () => {
    if (!companyId || !charging || cancellingCharge) return;
    setCancellingCharge(true);
    setCheckoutError(null);
    setCheckoutNotice(null);
    cancelRequestedRef.current = true;
    try {
      await cancelPaymentCollection(companyId);
      // collectPaymentMethod rejects after the SDK accepts cancellation. The
      // main charge handler owns the final transition back to idle.
    } catch (err) {
      // Cancellation can lose a race with card presentation/processing. In
      // that case the active charge remains authoritative and protected.
      cancelRequestedRef.current = false;
      setCheckoutError(errorMessage(err));
      setCancellingCharge(false);
    }
  };

  // Shared by the card and split payment panes: discovery status, the list of
  // readers with connect actions, and the "watch the reader" hint while a
  // collection is in flight.
  const readerPanel = (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
        Card Reader
      </Typography>

      {discovering ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Looking for card readers…
          </Typography>
        </Box>
      ) : null}

      {!discovering && readers.length === 0 ? (
        <Alert
          severity="warning"
          sx={{ mb: 1 }}
          action={
            <Button size="small" onClick={handleDiscoverReaders} sx={{ textTransform: 'none' }}>
              Scan again
            </Button>
          }
        >
          No card readers found. Make sure the reader is powered on and online.
        </Alert>
      ) : null}

      {readers.map((r) => {
        const isConnected = connectedReaderId === r.id;
        const isConnecting = connectingReaderId === r.id;
        return (
          <Box
            key={r.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 0.75,
              p: 1,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <ContactlessIcon fontSize="small" color={isConnected ? 'success' : 'disabled'} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {r.label || r.serial_number || r.id}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {r.device_type || 'Terminal reader'}
                  {r.serial_number ? ` · ${r.serial_number}` : ''}
                </Typography>
              </Box>
            </Box>
            {isConnected ? (
              <Chip label="Connected" color="success" size="small" />
            ) : (
              <Button
                size="small"
                variant="outlined"
                disabled={isConnecting || charging}
                onClick={() => handleConnectReader(r)}
                sx={{ textTransform: 'none' }}
              >
                {isConnecting ? 'Connecting…' : 'Connect'}
              </Button>
            )}
          </Box>
        );
      })}

      {charging ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }} color="text.secondary">
          Follow the prompts on the reader — waiting for the card…
        </Typography>
      ) : null}
    </Box>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={(_event, reason) => {
          // A completed sale must be dismissed through "New Order", which
          // clears the cart; backdrop-click and Escape only closed the dialog
          // (ALL-102). Rule and rationale live in ../checkoutDismissal.
          // A terminal collection in flight blocks dismissal the same way a
          // pending cash submission does.
          if (shouldBlockDismissal(reason, { isPending: isPending || charging || cancellingCharge, step })) return;
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
                  // Once a draft sale exists server-side (a card attempt was
                  // started), the method is locked — switching would strand the
                  // draft and its stock reservation. Finish or retry the card.
                  disabled={!!draftOrder || charging}
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
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {money(cardChargeAmount)} will be collected on the store&apos;s card reader.
                  </Typography>
                  {readerPanel}
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
                    disabled={!!draftOrder || charging}
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
                    disabled={!!draftOrder || charging}
                    error={!isSplitValid}
                    helperText={
                      draftOrder
                        ? 'Amounts are locked while the card payment is in progress.'
                        : !isSplitValid
                          ? `Card + Cash must equal ${money(total)}.`
                          : undefined
                    }
                  />

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Sum: {money(splitSum)}
                  </Typography>

                  {readerPanel}
                </Box>
              ) : null}

              <Divider sx={{ my: 1.75 }} />

              {checkoutError ? (
                <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setCheckoutError(null)}>
                  {checkoutError}
                </Alert>
              ) : null}

              {checkoutNotice ? (
                <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setCheckoutNotice(null)}>
                  {checkoutNotice}
                </Alert>
              ) : null}

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                <Button variant="outlined" onClick={() => setStep(0)} disabled={isPending || charging} sx={{ textTransform: 'none' }}>
                  Back
                </Button>

                {usesTerminal ? (
                  charging ? (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleCancelCharge}
                      disabled={cancellingCharge}
                      startIcon={cancellingCharge ? <CircularProgress size={18} /> : undefined}
                      sx={{ textTransform: 'none' }}
                    >
                      {cancellingCharge ? 'Canceling…' : 'Cancel charge'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleCardPayment}
                      disabled={!canPay}
                      startIcon={<CreditCardIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      {`Charge ${money(cardChargeAmount)} on Reader`}
                    </Button>
                  )
                ) : (
                  <Button variant="contained" onClick={handleSubmit} disabled={!canPay || isPending} sx={{ textTransform: 'none' }}>
                    {isPending ? <CircularProgress size={18} sx={{ color: theme.palette.common.white, mr: 1 }} /> : null}
                    Complete Checkout
                  </Button>
                )}
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
