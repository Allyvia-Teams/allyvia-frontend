import React, { useEffect, useMemo, useState } from 'react';
import { Box, TextField, Skeleton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import type { POSCategory, Product } from '../types/pos.types';
import CategoryFilter from './CategoryFilter';
import ProductCard from './ProductCard';

export interface ProductCatalogProps {
  products: Product[];
  loading: boolean;
  categories: POSCategory[];
  activeCategoryId: string;
  onCategoryChange: (id: string) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductCatalog({
  products,
  loading,
  categories,
  activeCategoryId,
  onCategoryChange,
  onAddToCart
}: ProductCatalogProps) {
  const theme = useTheme();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [debouncedSearch, products]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 1.5 }}>
        <TextField
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or SKU"
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: theme.palette.background.paper
            }
          }}
        />
      </Box>

      <CategoryFilter categories={categories} activeCategoryId={activeCategoryId} onChange={onCategoryChange} />

      <Box sx={{ mt: 1.5 }}>
        {loading ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
              gap: 2
            }}
          >
            {Array.from({ length: 8 }).map((_, idx) => (
              <Box key={idx}>
                <Skeleton variant="rectangular" height={188} sx={{ borderRadius: 2 }} />
              </Box>
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                No results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try clearing search or selecting another category.
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
              gap: 2
            }}
          >
            {filtered.map((product) => (
              <Box key={product.id}>
                <ProductCard product={product} onAdd={onAddToCart} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
