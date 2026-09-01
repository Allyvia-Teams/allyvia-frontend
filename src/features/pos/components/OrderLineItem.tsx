import React, { useMemo } from 'react';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTheme } from '@mui/material/styles';

import type { CartItem } from '../types/pos.types';

export interface OrderLineItemProps {
  item: CartItem;
  role: 'employee' | 'owner';
  onChangeQuantity: (nextQuantity: number) => void;
  onRemove: () => void;
  onChangeUnitPrice?: (nextUnitPrice: number) => void;
  highlighted?: boolean;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(n);

export default function OrderLineItem({ item, role, onChangeQuantity, onRemove, onChangeUnitPrice, highlighted = false }: OrderLineItemProps) {
  const theme = useTheme();

  const discountPerUnit = useMemo(
    () => (item.quantity > 0 ? (item.discountAmount || 0) / item.quantity : 0),
    [item.discountAmount, item.quantity]
  );
  const originalUnit = item.product.price;
  const discountedUnit = Math.max(0, originalUnit - discountPerUnit);

  const lineTotal = useMemo(() => {
    const discountedLineSubtotal = discountedUnit * item.quantity;
    return discountedLineSubtotal;
  }, [discountedUnit, item.quantity]);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider'
        , backgroundColor: highlighted ? 'success.light' : 'transparent', transition: 'background-color 200ms ease'
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {item.product.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.product.sku}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <IconButton
            size="small"
            onClick={() => onChangeQuantity(Math.max(0, item.quantity - 1))}
            disabled={item.quantity <= 1}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>

          <Typography variant="body2" fontWeight={700} sx={{ minWidth: 28, textAlign: 'center' }}>
            {item.quantity}
          </Typography>

          <IconButton size="small" onClick={() => onChangeQuantity(item.quantity + 1)} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          {role === 'owner' ? (
            <Box>
              <TextField
                size="small"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={Number(item.product.price.toFixed(2))}
                onChange={(e) => onChangeUnitPrice?.(Number(e.target.value))}
                sx={{ width: 120 }}
              />
              {discountPerUnit > 0 ? (
                <Box sx={{ mt: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', textDecoration: 'line-through', display: 'block', lineHeight: 1.1 }}
                  >
                    {money(originalUnit)}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.primary', display: 'block', lineHeight: 1.1 }}>
                    {money(discountedUnit)}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          ) : (
            <Box>
              {discountPerUnit > 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                  {money(originalUnit)}
                </Typography>
              ) : null}
              <Typography variant="body2" fontWeight={800} sx={{ color: 'text.primary' }}>
                {money(discountedUnit)}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
        <Typography variant="body2" fontWeight={900}>
          {money(lineTotal)}
        </Typography>
        <IconButton aria-label="remove line item" size="small" onClick={onRemove} sx={{ color: theme.palette.error.main }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
