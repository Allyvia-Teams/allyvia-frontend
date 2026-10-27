import React, { useMemo } from 'react';
import { Card, CardActionArea, CardMedia, Chip, Typography, Box } from '@mui/material';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';

import type { CatalogStyle } from '../types/pos.types';

export interface ProductCardProps {
  style: CatalogStyle;
  onSelect: (style: CatalogStyle) => void;
}

export default function ProductCard({ style, onSelect }: ProductCardProps) {
  const formattedPrice = useMemo(() => {
    const money = (n: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(n);
    const lo = Number(style.price);
    const hi = style.priceMax != null ? Number(style.priceMax) : null;
    if (hi != null && hi !== lo) {
      return `${money(lo)} – ${money(hi)}`;
    }
    return money(lo);
  }, [style.price, style.priceMax]);

  const stockChip = useMemo(() => {
    if (style.stock === 0) {
      return <Chip color="error" label="Out of Stock" size="small" variant="outlined" />;
    }
    if (style.stock <= 5) {
      return <Chip color="warning" label={`Low Stock (${style.stock})`} size="small" variant="outlined" />;
    }
    return <Chip color="success" label={`In Stock (${style.stock})`} size="small" variant="outlined" />;
  }, [style.stock]);

  const sizeHint = useMemo(() => {
    const sizes = [...new Set(style.variants.map((v) => v.size).filter(Boolean))];
    if (sizes.length === 0) return null;
    if (sizes.length <= 4) return sizes.join(' · ');
    return `${sizes.slice(0, 3).join(' · ')} +${sizes.length - 3}`;
  }, [style.variants]);

  const disabled = style.stock === 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        boxShadow: 'none',
        borderColor: 'divider',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        '&:hover': disabled
          ? undefined
          : {
              borderColor: 'primary.main',
              transform: 'translateY(-1px)'
            }
      }}
    >
      <CardActionArea
        onClick={() => onSelect(style)}
        disabled={disabled}
        sx={{
          height: '100%',
          opacity: disabled ? 0.65 : 1
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <Box
            sx={{
              width: '100%',
              // Square, and the photo is CONTAINED: the server letterboxes every
              // photo to a square with transparent margins, so nothing crops the
              // garment.
              aspectRatio: '1 / 1',
              borderRadius: 1,
              overflow: 'hidden',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary'
            }}
          >
            {style.imageUrl ? (
              <CardMedia
                component="img"
                image={style.imageUrl}
                alt={style.name}
                loading="lazy"
                decoding="async"
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <ImageNotSupportedIcon />
            )}
          </Box>

          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, mb: 0.5 }}>
            {style.name}
          </Typography>

          {sizeHint && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {sizeHint}
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {formattedPrice}
          </Typography>

          {stockChip}
        </Box>
      </CardActionArea>
    </Card>
  );
}
