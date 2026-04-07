import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, IconButton, TextField, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import type { POSOrderDiscount as POSDiscountState } from '../hooks/usePOSCart';
import type { CartItem } from '../types/pos.types';
import ConfirmActionDialog from 'ui-component/common/ConfirmActionDialog';

import OrderLineItem from './OrderLineItem';
import CheckoutModal from './CheckoutModal';

export interface OrderCartProps {
  role: 'employee' | 'owner';
  employeeId: string;
  employeeName: string;
  storeName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
  discountState: POSDiscountState | null;
  onApplyDiscount: (discount: POSDiscountState | null) => void;
  onClearCart: () => void;
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateUnitPrice: (productId: string, price: number) => void;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(n);

function mapEmployeeDiscountCode(code: string): { type: 'flat' | 'percent'; amount: number } | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  // Mock-only mapping. TODO: validate this via backend manager-code/coupon endpoint.
  if (normalized === 'SAVE10') return { type: 'percent', amount: 10 };
  if (normalized === 'TAKE5') return { type: 'flat', amount: 5 };
  if (normalized === 'OFF20') return { type: 'percent', amount: 20 };
  return null;
}

export default function OrderCart({
  role,
  employeeId,
  employeeName,
  storeName,
  items,
  subtotal,
  tax,
  discount,
  total,
  itemCount,
  discountState,
  onApplyDiscount,
  onClearCart,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateUnitPrice
}: OrderCartProps) {
  const theme = useTheme();

  const [applyOpen, setApplyOpen] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [ownerType, setOwnerType] = useState<'flat' | 'percent'>(discountState?.type || 'flat');
  const [ownerAmount, setOwnerAmount] = useState<number>(discountState?.amount || 0);
  const [error, setError] = useState<string | null>(null);

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const canCharge = total > 0 && items.length > 0;

  const onApply = () => {
    setError(null);

    if (role === 'employee') {
      const mapped = mapEmployeeDiscountCode(employeeCode);
      if (!mapped) {
        setError('Enter a valid manager code or coupon (e.g. SAVE10, TAKE5).');
        return;
      }
      onApplyDiscount({ code: employeeCode.trim().toUpperCase(), amount: mapped.amount, type: mapped.type });
      setApplyOpen(false);
      return;
    }

    const amount = Number(ownerAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid discount amount.');
      return;
    }
    onApplyDiscount({ amount, type: ownerType, code: undefined });
    setApplyOpen(false);
  };

  const lineItems = useMemo(() => items, [items]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.1 }}>
              Current Order
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Item count: {itemCount}
            </Typography>
          </Box>

          <Chip
            color={itemCount > 0 ? 'primary' : 'default'}
            variant="outlined"
            label={itemCount > 0 ? 'Ready' : 'Empty'}
            sx={{ fontWeight: 700 }}
          />
        </Box>
      </Box>

      {/* Lines */}
      <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
        {lineItems.length === 0 ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
            <ReceiptLongIcon color="action" fontSize="large" />
            <Typography variant="body2" fontWeight={700}>
              No items added yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Scan or tap products on the left to start.
            </Typography>
          </Box>
        ) : (
          <Box>
            {lineItems.map((it) => (
              <OrderLineItem
                key={it.product.id}
                item={it}
                role={role}
                onChangeQuantity={(q) => onUpdateQuantity(it.product.id, q)}
                onRemove={() => onRemoveItem(it.product.id)}
                onChangeUnitPrice={(price) => onUpdateUnitPrice(it.product.id, price)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Discount + totals */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Subtotal
          </Typography>
          <Typography variant="body2" fontWeight={800}>
            {money(subtotal)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Tax
          </Typography>
          <Typography variant="body2" fontWeight={800}>
            {money(tax)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Discount
          </Typography>
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ color: discount > 0 ? theme.palette.success.main : theme.palette.text.primary }}
          >
            -{money(discount)}
          </Typography>
        </Box>

        {/* Inline discount entry */}
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Button
              variant={applyOpen ? 'contained' : 'outlined'}
              size="small"
              onClick={() => {
                setApplyOpen((v) => !v);
                setError(null);
              }}
              startIcon={<ReceiptLongIcon fontSize="small" />}
              sx={{ textTransform: 'none' }}
              disabled={items.length === 0}
            >
              Apply Discount
            </Button>

            <IconButton
              onClick={() => setClearConfirmOpen(true)}
              size="small"
              disabled={items.length === 0}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>

          {applyOpen ? (
            <Box sx={{ mt: 1.25 }}>
              {role === 'employee' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    label="Manager Code or Coupon"
                    size="small"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="e.g. SAVE10"
                    error={Boolean(error)}
                  />
                  {error ? (
                    <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>
                      {error}
                    </Typography>
                  ) : null}
                  <Button variant="contained" size="small" onClick={onApply} sx={{ textTransform: 'none', mt: 0.25 }}>
                    Apply
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setApplyOpen(false);
                      setEmployeeCode('');
                      setError(null);
                      onApplyDiscount(null);
                    }}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                  >
                    Remove Discount
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <ToggleButtonGroup
                    size="small"
                    value={ownerType}
                    exclusive
                    onChange={(_, next) => next && setOwnerType(next)}
                    sx={{ '& .MuiToggleButton-root': { textTransform: 'none' } }}
                  >
                    <ToggleButton value="flat">Flat</ToggleButton>
                    <ToggleButton value="percent">Percent</ToggleButton>
                  </ToggleButtonGroup>

                  <TextField
                    label="Discount Amount"
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={Number.isFinite(ownerAmount) ? ownerAmount : 0}
                    onChange={(e) => setOwnerAmount(Number(e.target.value))}
                    error={Boolean(error)}
                  />

                  {error ? (
                    <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>
                      {error}
                    </Typography>
                  ) : null}

                  <Button variant="contained" size="small" onClick={onApply} sx={{ textTransform: 'none', mt: 0.25 }}>
                    Apply
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setApplyOpen(false);
                      setError(null);
                      onApplyDiscount(null);
                    }}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                  >
                    Remove Discount
                  </Button>
                </Box>
              )}
            </Box>
          ) : null}
        </Box>

        {/* Total */}
        <Box
          sx={{
            mt: 1.75,
            borderRadius: 2,
            bgcolor: theme.palette.primary.main,
            color: theme.palette.common.white,
            p: 1.25
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Typography variant="body2" fontWeight={900}>
              Total
            </Typography>
            <Typography variant="h6" fontWeight={900}>
              {money(total)}
            </Typography>
          </Box>
        </Box>

        {/* Checkout */}
        <Box sx={{ mt: 1.5 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!canCharge}
            sx={{
              borderRadius: 2,
              textTransform: 'none'
            }}
            onClick={() => setCheckoutOpen(true)}
          >
            Charge {money(total)}
          </Button>
        </Box>
      </Box>

      <ConfirmActionDialog
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={() => {
          setClearConfirmOpen(false);
          onClearCart();
          onApplyDiscount(null);
          setEmployeeCode('');
          setOwnerAmount(0);
        }}
        title="Clear Order"
        message="Are you sure you want to clear the current order?"
        confirmLabel="Clear"
        cancelLabel="Cancel"
        variant="warning"
      />

      <CheckoutModal
        open={checkoutOpen}
        role={role}
        employeeId={employeeId}
        employeeName={employeeName}
        storeName={storeName}
        items={items}
        subtotal={subtotal}
        tax={tax}
        discount={discount}
        total={total}
        onClose={() => setCheckoutOpen(false)}
        onNewOrder={() => {
          setCheckoutOpen(false);
          onClearCart();
          onApplyDiscount(null);
          setEmployeeCode('');
          setOwnerAmount(0);
          setApplyOpen(false);
        }}
      />
    </Box>
  );
}
