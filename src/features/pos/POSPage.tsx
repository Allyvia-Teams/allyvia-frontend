import React, { useEffect, useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Divider, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import axiosServices from 'utils/axios';
import { useTheme } from '@mui/material/styles';
import HistoryIcon from '@mui/icons-material/History';

import ProductCatalog from './components/ProductCatalog';
import OrderCart from './components/OrderCart';
import RecentOrdersDrawer from './components/RecentOrdersDrawer';

import { useCategories, useProductsInfinite } from './hooks/usePOSProducts';
import { usePOSCart } from './hooks/usePOSCart';
import { effectiveCategory } from './utils/catalogView';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import type { Product } from './types/pos.types';

import { useSelector } from 'store';

export interface POSPageProps {
  role: 'employee' | 'owner';
}

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function POSPage({ role }: POSPageProps) {
  const theme = useTheme();

  const { currentRole, user } = useSelector((s) => s.auth);
  const storeName = currentRole?.company_name || 'Store';
  const employeeName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Employee';
  const employeeId = user?.id || 'employee_unknown';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the TERM, not the fetch: the query key below is derived from
  // debouncedSearch, so a keystroke never costs a request or a cache entry.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  const selectedCategoryForApi = effectiveCategory(activeCategoryId, debouncedSearch);
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
    fetchNextPage,
    isFetchingNextPage
  } = useProductsInfinite({ category: selectedCategoryForApi, search: debouncedSearch });

  const cart = usePOSCart();
  const { enqueueSnackbar } = useSnackbar();
  const [manualCode, setManualCode] = useState('');
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const addLookupResult = (product: Product, retired: boolean) => {
    cart.addItem(product);
    setHighlighted(product.id);
    window.setTimeout(() => setHighlighted(null), 700);
  };
  useBarcodeScanner(addLookupResult, (message, variant) => enqueueSnackbar(message, { variant, autoHideDuration: 2500 }));
  const manualLookup = async () => {
    const code = manualCode.trim();
    if (!code) return;
    try {
      const response = await axiosServices.get('/api/items/lookup', { params: { code } });
      addLookupResult(response.data.item?.product || response.data.item || response.data, Boolean(response.data.retired));
      enqueueSnackbar(response.data.retired ? `Retired barcode: ${code}. Label is out of date.` : 'Item added to cart', {
        variant: response.data.retired ? 'warning' : 'success'
      });
      setManualCode('');
    } catch (error: any) {
      enqueueSnackbar(error?.response?.status === 404 ? `Unknown barcode: ${code}` : 'Barcode lookup failed', { variant: 'error' });
    }
  };

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const content = (
    <Box sx={{ display: 'flex', gap: 2, p: 2, pt: 0, height: '100%', minHeight: 0 }}>
      <Box sx={{ flex: 0.6, minWidth: 0, overflow: 'hidden' }}>
        <ProductCatalog
          pages={productsData?.pages ?? []}
          loading={productsLoading || categoriesLoading}
          isError={productsError}
          onRetry={() => refetchProducts()}
          categories={categories}
          activeCategoryId={activeCategoryId}
          searchValue={searchInput}
          debouncedSearch={debouncedSearch}
          onSearchChange={setSearchInput}
          onCategoryChange={(id) => {
            // Picking a chip is an explicit return to browsing.
            setSearchInput('');
            setDebouncedSearch('');
            setActiveCategoryId(id);
          }}
          onLoadMore={() => fetchNextPage()}
          loadingMore={isFetchingNextPage}
          onAddToCart={(p) => cart.addItem(p)}
        />
      </Box>

      <Box sx={{ flex: 0.4, minWidth: 360, overflow: 'hidden' }}>
        <Box sx={{ px: 1, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Enter barcode manually"
            value={manualCode}
            data-barcode-scan-field="true"
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void manualLookup();
              }
            }}
          />
        </Box>
        <OrderCart
          role={role}
          employeeId={employeeId}
          employeeName={employeeName}
          storeName={storeName}
          items={cart.items}
          subtotal={cart.derived.subtotal}
          tax={cart.derived.tax}
          discount={cart.derived.discount}
          total={cart.derived.total}
          itemCount={cart.derived.itemCount}
          discountState={cart.discount}
          onApplyDiscount={cart.applyDiscount}
          onClearCart={cart.clearCart}
          onRemoveItem={(productId) => cart.removeItem(productId)}
          onUpdateQuantity={(productId, quantity) => cart.updateQuantity(productId, quantity)}
          onUpdateUnitPrice={(productId, price) => cart.setItemUnitPrice(productId, price)}
          highlightedProductId={highlighted}
        />
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: theme.palette.background.default
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Toolbar sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.1 }}>
              POS
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {storeName}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              Logged in as
            </Typography>
            <Typography variant="body2" fontWeight={800}>
              {employeeName}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Typography variant="caption" color="text.secondary" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
            {formatClock(now)}
          </Typography>

          <IconButton
            size="small"
            onClick={() => setDrawerOpen(true)}
            sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
          >
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{content}</Box>

      <RecentOrdersDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
