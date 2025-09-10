// views/inventory/index.tsx
// Main Inventory Management Page using AllyviaPaginatedTable

import React from 'react';
import { Box, Typography, Chip, Stack, Button, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { Sync as SyncIcon, Error as ErrorIcon, Schedule as PendingIcon, Settings as ManualIcon } from '@mui/icons-material';
import { TableColumnConfig } from 'ui-component/common/AllyviaPaginatedTable';
import MainCard from 'ui-component/cards/MainCard';
import { useDispatch, useSelector } from 'store';
import { fetchInventoryItems, fetchInventorySummary, fetchInventoryTrends } from 'store/slices/inventory';
import { IconFileTypeCsv, IconPlus, IconRefresh, IconDownload } from '@tabler/icons-react';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { today, getLocalTimeZone } from '@internationalized/date';
import { downloadInventoryTableCsv, downloadInventorySummaryCsv } from 'utils/reports/inventory/exportInventoryCsv';
import { exportInventoryPdf } from 'utils/reports/inventory/exportInventoryReport';
import { InventoryCSVImportModal, InventoryStatsSection, InventoryTableSection, InventoryAlertsPanel } from 'ui-component/inventory';
import InventoryTrendWidget from 'ui-component/inventory/InventoryTrendWidget';
import QuickBooksConnectionDialog from 'ui-component/inventory/QuickBooksConnectionDialog';
// using CSS grid for layout to avoid Grid type issues
// using Redux-backed items; fallback mock is removed for production

const InventoryPage: React.FC = () => {
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.inventory.loading);
  const items = useSelector((state) => state.inventory.items);
  const summary = useSelector((state) => state.inventory.summary);
  const trends = useSelector((state) => state.inventory.trends);
  const qbConnection = useSelector((state) => state.integrations.quickbooks.connection);

  // Debug logging
  console.log('Inventory Redux State:', {
    loading,
    itemsCount: items?.length || 0,
    summary,
    trends
  });

  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [showQBDialog, setShowQBDialog] = React.useState(false);

  // export menu state
  const [exportAnchorEl, setExportAnchorEl] = React.useState<null | HTMLElement>(null);
  const exportMenuOpen = Boolean(exportAnchorEl);

  // date range for filtering summary and trends - default to last 30 days
  const [dateRange, setDateRange] = React.useState<RangeValue>(() => {
    const todayDate = today(getLocalTimeZone());
    return {
      start: todayDate.subtract({ days: 30 }),
      end: todayDate
    };
  });

  // Check if QuickBooks is connected
  const isQuickBooksConnected = qbConnection?.status === 'connected' && qbConnection?.accessTokenValid;

  // Create qb_connected flag for API calls
  const qbFlags = React.useMemo(
    () => ({
      qb_connected: isQuickBooksConnected ? 'true' : 'false'
    }),
    [isQuickBooksConnected]
  );

  console.log('isQuickBooksConnected', isQuickBooksConnected);
  React.useEffect(() => {
    // Fetch initial data with qb_connected flag
    dispatch(fetchInventoryItems() as any);

    // Fetch time-based data if QuickBooks is connected and date range is set
    if (isQuickBooksConnected && dateRange.start && dateRange.end) {
      dispatch(
        fetchInventorySummary({
          start_date: dateRange.start.toString(),
          end_date: dateRange.end.toString(),
          ...qbFlags
        }) as any
      );
      dispatch(
        fetchInventoryTrends({
          start_date: dateRange.start.toString(),
          end_date: dateRange.end.toString(),
          ...qbFlags
        }) as any
      );
    } else {
      // Fetch without date range (local data) with qb_connected flag
      dispatch(fetchInventorySummary(qbFlags) as any);
      dispatch(fetchInventoryTrends(qbFlags) as any);
    }
  }, [dispatch, dateRange.start, dateRange.end, isQuickBooksConnected, qbFlags]);

  const handleOpenExport = (e: React.MouseEvent<HTMLElement>) => setExportAnchorEl(e.currentTarget);
  const handleCloseExport = () => setExportAnchorEl(null);
  const handleExportCsv = () => {
    downloadInventoryTableCsv(`inventory_${new Date().toISOString().slice(0, 10)}.csv`, items);
    handleCloseExport();
  };
  const handleExportSummary = () => {
    downloadInventorySummaryCsv(`inventory_summary_${new Date().toISOString().slice(0, 10)}.csv`, { items });
    handleCloseExport();
  };
  const handleExportPdf = async () => {
    await exportInventoryPdf({ title: 'Inventory Report', items });
    handleCloseExport();
  };

  // Define column configuration for inventory items
  const inventoryColumns: TableColumnConfig[] = [
    {
      field: 'name',
      headerName: 'Product Name',
      width: 200, // Ensure enough space for product names
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'sku',
      headerName: 'SKU',
      width: 120, // Fixed width for SKU codes
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="bold" color="text.primary">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 200,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.secondary">
          {params.value || '—'}
        </Typography>
      )
    },
    {
      field: 'unit_price',
      headerName: 'Unit Price',
      type: 'number',
      width: 120, // Fixed width for currency
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="bold" color="text.primary">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(params.value)}
        </Typography>
      )
    },
    {
      field: 'cost_price',
      headerName: 'Cost Price',
      type: 'number',
      width: 120, // Fixed width for currency
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="bold" color="text.primary">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(params.value)}
        </Typography>
      )
    },
    {
      field: 'quantity_on_hand',
      headerName: 'Quantity',
      type: 'number',
      width: 100, // Fixed width for numbers
      renderCell: (params: any) => {
        const quantity = params.value;
        const reorderPoint = params.row.reorder_point || 0;

        const getQuantityColor = (qty: number, reorder: number) => {
          if (qty === 0) return 'error.main';
          if (qty <= reorder) return '#E65100'; // Dark orange - more readable than yellow
          return 'text.primary';
        };

        return (
          <Typography variant="body2" fontWeight="bold" color={getQuantityColor(quantity, reorderPoint)}>
            {quantity}
          </Typography>
        );
      }
    },
    {
      field: 'barcode',
      headerName: 'Barcode',
      width: 140,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.primary">
          {params.value || '—'}
        </Typography>
      )
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 160,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.primary">
          {params.value || '—'}
        </Typography>
      )
    },
    {
      field: 'reorder_point',
      headerName: 'Reorder Point',
      type: 'number',
      width: 140,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.primary">
          {params.value ?? '—'}
        </Typography>
      )
    }
  ];

  // filterFields managed inside InventoryTableSection

  // Stats computed in InventoryStatsSection

  // Handlers: Import/Export/Add/Refresh
  // Import handled in modal

  // CSV handled via export menu helpers

  const handleAddItem = () => {
    // Placeholder: open add item flow (modal/form) - to be implemented

    alert('Add Item flow coming soon.');
  };

  const handleRefresh = () => {
    dispatch(fetchInventoryItems() as any);
    dispatch(fetchInventorySyncStatus() as any);

    if (isQuickBooksConnected && dateRange.start && dateRange.end) {
      dispatch(
        fetchInventorySummary({
          start_date: dateRange.start.toString(),
          end_date: dateRange.end.toString(),
          ...qbFlags
        }) as any
      );
      dispatch(
        fetchInventoryTrends({
          start_date: dateRange.start.toString(),
          end_date: dateRange.end.toString(),
          ...qbFlags
        }) as any
      );
    } else {
      dispatch(fetchInventorySummary(qbFlags) as any);
      dispatch(fetchInventoryTrends(qbFlags) as any);
    }
  };

  const handleDateChange = (range: RangeValue | null) => {
    if (range && range.start && range.end) {
      // Check if QuickBooks is connected before allowing date range selection
      if (!isQuickBooksConnected) {
        setShowQBDialog(true);
        return;
      }
      setDateRange(range);
    }
  };

  return (
    <>
      <MainCard
        content={false}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h3">Inventory Management</Typography>
          </Box>
        }
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ mr: 1 }}>
              <AllyviaDateRangePicker value={dateRange} onChange={handleDateChange} />
            </Box>

            {/* Sync Status Indicator */}
            {/* {syncStatus && !isQuickBooksConnected && syncStatus.unsynced_items > 0 && (
              <Tooltip title={`${syncStatus.unsynced_items} items need sync to QuickBooks`}>
                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={handleSyncToQuickBooks}
                  size="small"
                  disabled={loading}
                  color="warning"
                >
                  Sync ({syncStatus.unsynced_items})
                </Button>
              </Tooltip>
            )} */}

            <Button
              variant="contained"
              startIcon={<IconFileTypeCsv size={16} />}
              onClick={() => setIsImportOpen(true)}
              size="small"
              disabled={loading}
              sx={{ py: 0.5, px: 1.5, fontSize: '0.8125rem', color: 'white' }}
            >
              Import CSV
            </Button>

            <Button
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={handleAddItem}
              size="small"
              disabled={loading}
              sx={{ py: 0.5, px: 1.5, fontSize: '0.8125rem', color: 'white' }}
            >
              Add Item
            </Button>
            <Tooltip title="Export">
              <IconButton
                size="small"
                onClick={handleOpenExport}
                sx={{
                  bgcolor: 'common.main',
                  color: 'primary.white',
                  border: '1px solid',
                  borderColor: 'primary.light',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                <IconDownload size={18} />
              </IconButton>
            </Tooltip>
            <IconButton onClick={handleRefresh} size="small" disabled={loading}>
              <IconRefresh />
            </IconButton>
          </Stack>
        }
      >
        <Box sx={{ p: 3 }}>
          {/* Top Stats */}
          <InventoryStatsSection />

          {/* Main Table Component */}
          <InventoryTableSection rows={items} columns={inventoryColumns} />
          {/* (Exports and Alerts moved outside MainCard) */}
        </Box>
        <InventoryCSVImportModal open={isImportOpen} onClose={() => setIsImportOpen(false)} />
      </MainCard>
      <Menu
        anchorEl={exportAnchorEl}
        open={exportMenuOpen}
        onClose={handleCloseExport}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleExportCsv}>Download CSV</MenuItem>
        <MenuItem onClick={handleExportSummary}>Download Summary CSV</MenuItem>
        <MenuItem onClick={handleExportPdf}>Download PDF Report</MenuItem>
      </Menu>

      {/* QuickBooks Connection Dialog */}
      <QuickBooksConnectionDialog
        open={showQBDialog}
        onClose={() => setShowQBDialog(false)}
        title="QuickBooks Connection Required"
        message="To use date range filtering and access time-based inventory trends, you need to connect your QuickBooks account."
      />

      {/* Below table: Trends (2/3) + Alerts (1/3) as separate MainCards */}
      <Box sx={{ pt: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 0.8fr' },
            gap: 2,
            mb: 2
          }}
        >
          <Box>
            <MainCard content={false} title="Trends" sx={{ height: 540 }}>
              <Box sx={{ p: 2 }}>
                <InventoryTrendWidget
                  height={500}
                  startDate={isQuickBooksConnected ? dateRange.start?.toString() : undefined}
                  endDate={isQuickBooksConnected ? dateRange.end?.toString() : undefined}
                />
              </Box>
            </MainCard>
          </Box>
          <Box>
            <MainCard content={false} title="Alerts" sx={{ height: 540 }}>
              <Box sx={{ p: 2, height: '100%' }}>
                <InventoryAlertsPanel />
              </Box>
            </MainCard>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default InventoryPage;
