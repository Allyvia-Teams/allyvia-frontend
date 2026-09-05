import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, Tooltip, Typography, Divider, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import axiosServices from 'utils/axios';
import { useTheme } from '@mui/material/styles';
import HistoryIcon from '@mui/icons-material/History';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

import ProductCatalog from './components/ProductCatalog';
import OrderCart from './components/OrderCart';
import RecentOrdersDrawer from './components/RecentOrdersDrawer';

import { useCategories, useProductsInfinite } from './hooks/usePOSProducts';
import { usePOSCart } from './hooks/usePOSCart';
import { effectiveCategory } from './utils/catalogView';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import CameraScanDialog, { isCameraScanSupported } from './components/CameraScanDialog';
import type { Product } from './types/pos.types';

import { useSelector } from 'store';

export interface POSPageProps {
  role: 'employee' | 'owner';
}

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ALL-108: till mode. The POS runs inside the app chrome, and on a counter
// tablet the sidebar and header eat the width the cart needs. Remembered per
// device, because a till stays a till.
const TILL_MODE_KEY = 'allyvia_pos_till_mode_v1';

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
  const [cameraOpen, setCameraOpen] = useState(false);
  const scanFieldRef = useRef<HTMLInputElement>(null);
  const cameraSupported = useMemo(() => isCameraScanSupported(), []);

  const addLookupResult = useCallback(
    (product: Product) => {
      cart.addItem(product);
      setHighlighted(product.id);
      window.setTimeout(() => setHighlighted(null), 700);
    },
    // cart.addItem is a stable dispatch wrapper, so this closes over nothing
    // that changes between renders.

    []
  );

  useBarcodeScanner(addLookupResult, (message, variant) => enqueueSnackbar(message, { variant, autoHideDuration: 2500 }));

  /**
   * One lookup for all three ways a code arrives — wedge, typed, camera — so
   * they cannot drift apart. Always clears the field and puts focus back on
   * it: a scanner that types into whatever has focus needs somewhere
   * predictable to type, and the next scan is usually a second away.
   */
  const lookupCode = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      try {
        const response = await axiosServices.get('/api/items/lookup', { params: { code } });
        addLookupResult(response.data.item?.product || response.data.item || response.data);
        enqueueSnackbar(response.data.retired ? `Retired barcode: ${code}. Label is out of date.` : 'Item added to cart', {
          variant: response.data.retired ? 'warning' : 'success',
          autoHideDuration: 2500
        });
      } catch (error: any) {
        enqueueSnackbar(error?.response?.status === 404 ? `Unknown barcode: ${code}` : 'Barcode lookup failed', {
          variant: 'error',
          autoHideDuration: 2500
        });
      } finally {
        setManualCode('');
        scanFieldRef.current?.focus();
      }
    },
    [addLookupResult, enqueueSnackbar]
  );

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const [tillMode, setTillMode] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(TILL_MODE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(TILL_MODE_KEY, tillMode ? '1' : '0');
    } catch {
      // A till with storage blocked simply forgets the preference.
    }
  }, [tillMode]);

  // The scan field is where a wedge scanner should be typing. Claim the focus
  // when the till opens, and again whenever till mode is toggled.
  useEffect(() => {
    const t = window.setTimeout(() => scanFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [tillMode]);

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
        <Box sx={{ px: 1, pb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            label="Scan or enter barcode"
            value={manualCode}
            inputRef={scanFieldRef}
            data-barcode-scan-field="true"
            autoFocus
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void lookupCode(manualCode);
              }
            }}
          />
          {/* Offered only where the platform can honour it: Safari has no
              BarcodeDetector, and a camera button that fails when pressed is
              worse than no button. A wedge scanner works everywhere. */}
          {cameraSupported ? (
            <Tooltip title="Scan with camera">
              <IconButton onClick={() => setCameraOpen(true)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <PhotoCameraIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
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
        // ALL-108: till mode lifts the POS out of the app chrome entirely
        // rather than fighting it for width. Everything inside is unchanged —
        // the sidebar and header are simply no longer on screen.
        ...(tillMode
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: theme.zIndex.drawer + 2,
              height: '100vh',
              minHeight: '100vh'
            }
          : { height: '100%', minHeight: 'calc(100vh - 160px)' }),
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

          <Tooltip title={tillMode ? 'Leave till mode' : 'Full-screen till mode'}>
            <IconButton
              size="small"
              onClick={() => setTillMode((v) => !v)}
              sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', mr: 1 }}
            >
              {tillMode ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

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

      <CameraScanDialog
        open={cameraOpen}
        onClose={() => {
          setCameraOpen(false);
          scanFieldRef.current?.focus();
        }}
        onDetected={(code) => void lookupCode(code)}
      />
    </Box>
  );
}
