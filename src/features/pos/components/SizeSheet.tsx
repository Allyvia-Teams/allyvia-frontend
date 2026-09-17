import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import type { CatalogStyle, Product, StyleVariant } from '../types/pos.types';
import { productFromVariant, sizeColourLabel } from '../utils/catalogView';

export interface SizeSheetProps {
  style: CatalogStyle | null;
  open: boolean;
  onClose: () => void;
  onPick: (product: Product) => void;
}

function uniqueColors(variants: StyleVariant[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    const key = v.color || '';
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export default function SizeSheet({ style, open, onClose, onPick }: SizeSheetProps) {
  const colors = useMemo(() => (style ? uniqueColors(style.variants) : []), [style]);
  const [color, setColor] = useState<string | null>(null);

  const activeColor = color ?? colors[0] ?? '';
  const sizes = useMemo(() => {
    if (!style) return [];
    return style.variants.filter((v) => (v.color || '') === activeColor);
  }, [style, activeColor]);

  React.useEffect(() => {
    if (open) setColor(null);
  }, [open, style?.id]);

  if (!style) return null;

  const money = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const pick = (variant: StyleVariant) => {
    if (variant.stock <= 0) return;
    onPick(productFromVariant(style, variant));
    onClose();
  };

  // Single-variant styles skip the sheet — caller should add directly, but
  // if we land here anyway, one tap still works.
  if (style.variants.length === 1) {
    const only = style.variants[0];
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          {style.name}
          <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {sizeColourLabel(only) || only.sku || 'One size'}
            </Typography>
            <Button variant="contained" disabled={only.stock <= 0} onClick={() => pick(only)}>
              {only.stock <= 0 ? 'Out of stock' : `Add · ${money(Number(only.price))}`}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {style.name}
        <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pb: 1 }}>
          {colors.length > 1 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Colour
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={activeColor}
                onChange={(_e, next) => next !== null && setColor(next)}
              >
                {colors.map((c) => (
                  <ToggleButton key={c || '__blank'} value={c}>
                    {c || '—'}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Size
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {sizes.map((variant) => {
                const disabled = variant.stock <= 0;
                return (
                  <Button
                    key={variant.id}
                    variant="outlined"
                    disabled={disabled}
                    onClick={() => pick(variant)}
                    sx={{ minWidth: 72, flexDirection: 'column', py: 1 }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {variant.size || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {disabled ? 'Out' : `${variant.stock} · ${money(Number(variant.price))}`}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
          </Box>

          {sizes.length === 0 && (
            <Chip label="No sizes for this colour" size="small" variant="outlined" />
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
