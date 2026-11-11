import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, TextField, Button } from '@mui/material';
import { IconShoppingCart, IconTag } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import HistoryIcon from '@mui/icons-material/History';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

import ProductCatalog from './components/ProductCatalog';
import OrderCart from './components/OrderCart';
import RecentOrdersDrawer from './components/RecentOrdersDrawer';
import SizeSheet from './components/SizeSheet';

import { useCategories, useProductsInfinite } from './hooks/usePOSProducts';
import { usePOSCart } from './hooks/usePOSCart';
import { effectiveCategory, productFromVariant } from './utils/catalogView';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import CameraScanDialog, { isCameraScanSupported } from './components/CameraScanDialog';
import type { CatalogStyle, Product } from './types/pos.types';
import { PageHeader, Panel } from 'ui-component/frame';
import posApi from './api/posApi';

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
  const [sizeSheetStyle, setSizeSheetStyle] = useState<CatalogStyle | null>(null);

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
   *
   * Goes through posApi.lookupBarcode (GET /pos/products/?barcode=), not
   * /api/items/lookup, which is not a registered merchant route.
   */
  const lookupCode = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      try {
        const hit = await posApi.lookupBarcode(code);
        if (!hit) {
          enqueueSnackbar(`Unknown barcode: ${code}`, { variant: 'error', autoHideDuration: 2500 });
          return;
        }
        addLookupResult(hit.product);
        enqueueSnackbar(hit.retired ? `Retired barcode: ${code}. Label is out of date.` : 'Item added to cart', {
          variant: hit.retired ? 'warning' : 'success',
          autoHideDuration: 2500
        });
      } catch {
        enqueueSnackbar('Barcode lookup failed', { variant: 'error', autoHideDuration: 2500 });
      } finally {
        setManualCode('');
        scanFieldRef.current?.focus();
      }
    },
    [addLookupResult, enqueueSnackbar]
  );

  const handleSelectStyle = (style: CatalogStyle) => {
    if (style.variants.length === 1) {
      const only = style.variants[0];
      if (only.stock <= 0) {
        enqueueSnackbar('Out of stock', { variant: 'warning' });
        return;
      }
      addLookupResult(productFromVariant(style, only));
      return;
    }
    setSizeSheetStyle(style);
  };

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

  const scanRow = (
    // pt leaves room for the outlined label, which floats above the input's border.
    <Box
      sx={{
        px: '14px',
        pt: '14px',
        pb: '12px',
        flexShrink: 0,
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'grey.100'
      }}
    >
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
  );

  const itemCount = cart.derived.itemCount;

  return (
    <Box
      sx={{
        // The page is exactly the viewport's content area tall, never taller: the app
        // header (76) + content padding (2 x 20) + footer (44) = 160. It used to ask for
        // height: 100% of a parent with only a min-height, so it grew to the catalogue's
        // full height, the window scrolled, and the cart stretched off-screen with it.
        // Below md the two panels stack and the page scrolls normally.
        ...(tillMode
          ? {
              // ALL-108: till mode lifts the POS out of the app chrome entirely.
              position: 'fixed',
              inset: 0,
              zIndex: theme.zIndex.drawer + 2,
              p: '20px',
              height: '100vh'
            }
          : { height: { xs: 'auto', md: 'calc(100vh - 160px)' } }),
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <PageHeader
        title="POS"
        subtitle={`${storeName} · ${employeeName} · ${formatClock(now)}`}
        right={
          <>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setTillMode((v) => !v)}
              startIcon={tillMode ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            >
              {tillMode ? 'Leave till mode' : 'Till mode'}
            </Button>
            <Button variant="outlined" size="small" onClick={() => setDrawerOpen(true)} startIcon={<HistoryIcon fontSize="small" />}>
              Recent orders
            </Button>
            <Button component={RouterLink} to="/pos/refunds" variant="outlined" size="small">
              Refunds
            </Button>
          </>
        }
      />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(340px, 400px)' },
          gridTemplateRows: { xs: 'auto', md: 'minmax(0, 1fr)' }
        }}
      >
        <Box sx={{ minWidth: 0, minHeight: 0, height: { xs: '70vh', md: 'auto' } }}>
          <Panel fill title="Products" icon={<IconTag size={17} />}>
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
              onSelectStyle={handleSelectStyle}
            />
          </Panel>
        </Box>

        <Box sx={{ minWidth: 0, minHeight: 0, height: { xs: '80vh', md: 'auto' } }}>
          <Panel
            fill
            title="Current order"
            icon={<IconShoppingCart size={17} />}
            note={itemCount === 0 ? 'Empty' : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          >
            {scanRow}
            <OrderCart
              embedded
              role={role}
              employeeId={employeeId}
              employeeName={employeeName}
              storeName={storeName}
              items={cart.items}
              subtotal={cart.derived.subtotal}
              tax={cart.derived.tax}
              discount={cart.derived.discount}
              total={cart.derived.total}
              itemCount={itemCount}
              discountState={cart.discount}
              onApplyDiscount={cart.applyDiscount}
              onClearCart={cart.clearCart}
              onRemoveItem={(productId) => cart.removeItem(productId)}
              onUpdateQuantity={(productId, quantity) => cart.updateQuantity(productId, quantity)}
              onUpdateUnitPrice={(productId, price) => cart.setItemUnitPrice(productId, price)}
              onRepriceItems={cart.repriceItems}
              highlightedProductId={highlighted}
            />
          </Panel>
        </Box>
      </Box>

      <SizeSheet
        style={sizeSheetStyle}
        open={Boolean(sizeSheetStyle)}
        onClose={() => setSizeSheetStyle(null)}
        onPick={(product) => addLookupResult(product)}
      />

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
