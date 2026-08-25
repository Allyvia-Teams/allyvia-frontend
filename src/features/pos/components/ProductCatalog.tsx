import React, { useMemo } from 'react';
import { Box, Button, TextField, Skeleton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import type { ProductsResponse } from '../api/posApi';
import type { POSCategory, Product } from '../types/pos.types';
import { buildCatalogView } from '../utils/catalogView';
import CategoryFilter from './CategoryFilter';
import ProductCard from './ProductCard';

export interface ProductCatalogProps {
  /** Server pages, newest appended. The grid renders them flattened. */
  pages: ProductsResponse[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  categories: POSCategory[];
  activeCategoryId: string;
  /** Live input value; `debouncedSearch` is the term the results actually reflect. */
  searchValue: string;
  debouncedSearch: string;
  onSearchChange: (next: string) => void;
  onCategoryChange: (id: string) => void;
  onLoadMore: () => void;
  loadingMore: boolean;
  onAddToCart: (product: Product) => void;
}

export default function ProductCatalog({
  pages,
  loading,
  isError,
  onRetry,
  categories,
  activeCategoryId,
  searchValue,
  debouncedSearch,
  onSearchChange,
  onCategoryChange,
  onLoadMore,
  loadingMore,
  onAddToCart
}: ProductCatalogProps) {
  const theme = useTheme();

  // Searching queries the server across every category — see buildCatalogView.
  const view = useMemo(
    () => buildCatalogView({ pages, isError, isLoading: loading, search: debouncedSearch }),
    [pages, isError, loading, debouncedSearch]
  );

  const gridColumns = { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 1.5 }}>
        <TextField
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
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

      {(view.countLabel || view.hintLabel) && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', mt: 1, flexWrap: 'wrap' }}>
          {view.countLabel && (
            <Typography variant="body2" color="text.secondary">
              {view.countLabel}
            </Typography>
          )}
          {view.hintLabel && (
            <Typography variant="body2" color="text.secondary">
              · {view.hintLabel}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ mt: 1.5 }}>
        {view.status === 'loading' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 2 }}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <Box key={idx}>
                <Skeleton variant="rectangular" height={188} sx={{ borderRadius: 2 }} />
              </Box>
            ))}
          </Box>
        ) : view.status === 'error' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Couldn&apos;t load products
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                The till could not reach the catalogue. Nothing is missing from your stock.
              </Typography>
              <Button size="small" variant="outlined" onClick={onRetry}>
                Retry
              </Button>
            </Box>
          </Box>
        ) : view.status === 'empty' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {view.emptyLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Every category was searched. Check the spelling, or scan the tag.
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 2 }}>
              {view.products.map((product) => (
                <Box key={product.id}>
                  <ProductCard product={product} onAdd={onAddToCart} />
                </Box>
              ))}
            </Box>

            {view.showLoadMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button size="small" variant="outlined" onClick={onLoadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : view.loadMoreLabel}
                </Button>
              </Box>
            )}

            {isError && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Couldn&apos;t load more products.
                </Typography>
                <Button size="small" onClick={onRetry}>
                  Retry
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
