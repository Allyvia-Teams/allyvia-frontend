import React, { useMemo } from 'react';
import { Card, CardActionArea, CardMedia, Chip, Typography, Box } from '@mui/material';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';

import type { Product } from '../types/pos.types';

export interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const formattedPrice = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(product.price),
    [product.price]
  );

  const stockChip = useMemo(() => {
    if (product.stock === 0) {
      return <Chip color="error" label="Out of Stock" size="small" variant="outlined" />;
    }
    if (product.stock <= 5) {
      return <Chip color="warning" label={`Low Stock (${product.stock})`} size="small" variant="outlined" />;
    }
    return <Chip color="success" label={`In Stock (${product.stock})`} size="small" variant="outlined" />;
  }, [product.stock]);

  const disabled = product.stock === 0;

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
        onClick={() => onAdd(product)}
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
              height: 84,
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
            {product.imageUrl ? (
              <CardMedia
                component="img"
                image={product.imageUrl}
                alt={product.name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <ImageNotSupportedIcon />
            )}
          </Box>

          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2, mb: 0.5 }}>
            {product.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {formattedPrice}
          </Typography>

          {stockChip}
        </Box>
      </CardActionArea>
    </Card>
  );
}
