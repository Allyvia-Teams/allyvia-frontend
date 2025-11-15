// views/inventory/index.tsx
// Main Inventory Management Page using AllyviaPaginatedTable

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  LinearProgress,
  Select,
  FormControl,
  Pagination
} from '@mui/material';
import { TableColumnConfig } from 'ui-component/common/AllyviaPaginatedTable';
import ConfirmDelete from 'ui-component/common/ConfirmDelete';
import MainCard from 'ui-component/cards/MainCard';
import { useDispatch, useSelector } from 'store';
import {
  fetchInventoryItems,
  fetchInventorySummary,
  fetchInventoryTrends,
  deleteInventoryItem,
  setPage,
  setPageSize
} from 'store/slices/inventory';
import {
  IconFileTypeCsv,
  IconPlus,
  IconRefresh,
  IconDownload,
  IconEye,
  IconEdit,
  IconTrash,
  IconScan,
  IconDatabase
} from '@tabler/icons-react';
import { downloadInventoryTableCsv } from 'utils/reports/inventory/exportInventoryCsv';
import { downloadInventoryPdf } from 'utils/reports/inventory/inventoryPdfReport';
import { loadLogoAsDataUrl } from 'utils/reports/ReportUtils';
import logoUrl from 'assets/images/allyvia_logo.png';
import {
  InventoryCSVImportModal,
  InventoryStats,
  InventoryTable,
  InventoryModal,
  InventoryDetailsModal,
  BarcodeScannerModal
} from 'ui-component/inventory';

const InventoryPage: React.FC = () => {
  const dispatch = useDispatch();
  const { loading, items, summary, uploadStatus, uploadProgress, pagination } = useSelector((state) => state.inventory);

  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = React.useState(false);

  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = React.useState(false);
  const [inventoryModalMode, setInventoryModalMode] = React.useState<'add' | 'edit'>('add');
  const [selectedItem, setSelectedItem] = React.useState<any>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<any>(null);
  // export menu state
  const [exportAnchorEl, setExportAnchorEl] = React.useState<null | HTMLElement>(null);
  const exportMenuOpen = Boolean(exportAnchorEl);

  React.useEffect(() => {
    // New API: no params required for summary
    dispatch(fetchInventoryItems() as any);
    dispatch(fetchInventorySummary() as any);
  }, [dispatch]);

  const handleOpenExport = (e: React.MouseEvent<HTMLElement>) => setExportAnchorEl(e.currentTarget);
  const handleCloseExport = () => setExportAnchorEl(null);
  const handleExportCsv = () => {
    downloadInventoryTableCsv(`inventory_${new Date().toISOString().slice(0, 10)}.csv`, items);
    handleCloseExport();
  };
  const handleExportPdf = async () => {
    try {
      const title = 'Inventory Report';
      const subtitle = `Generated on ${new Date().toLocaleDateString()}`;
      const logoDataUrl = await loadLogoAsDataUrl(logoUrl as unknown as string).catch(() => undefined);

      const totalItems = summary?.unique_items ?? summary?.total_items ?? items.length;
      const totalQoh = summary?.total_quantity_on_hand ?? items.reduce((a, b) => a + (b.quantity_on_hand || 0), 0);
      const lowStock =
        summary?.low_stock ??
        items.filter(
          (i) => i.item_type === 'Inventory' && (i.quantity_on_hand || 0) > 0 && (i.quantity_on_hand || 0) <= (i.reorder_point || 0)
        ).length;
      const outOfStock =
        summary?.out_of_stock ?? items.filter((i) => i.item_type === 'Inventory' && (i.quantity_on_hand || 0) === 0).length;
      const totalValue = summary?.inventory_value ?? items.reduce((a, b) => a + (b.unit_price || 0) * (b.quantity_on_hand || 0), 0);

      const kpis = [
        { label: 'Unique Items', value: totalItems },
        { label: 'Total QOH', value: totalQoh },
        { label: 'Low Stock', value: lowStock },
        { label: 'Out of Stock', value: outOfStock },
        {
          label: 'Inventory Value',
          value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(totalValue) || 0)
        },
        {
          label: 'Average Item Price',
          value: ((Number(totalValue) || 0) / (Number(totalQoh) || 1)).toFixed(2)
        }
      ];

      // Generate categories data from current inventory items
      const categoryMap = new Map<string, { total_quantity: number; total_value: number }>();

      items.forEach((item) => {
        if (item.item_type === 'Inventory' && item.category) {
          const category = item.category;
          const quantity = item.quantity_on_hand || 0;
          const value = (item.unit_price || 0) * quantity;

          if (categoryMap.has(category)) {
            const existing = categoryMap.get(category)!;
            existing.total_quantity += quantity;
            existing.total_value += value;
          } else {
            categoryMap.set(category, { total_quantity: quantity, total_value: value });
          }
        }
      });

      const totalCategoryValue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.total_value, 0);

      const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        total_quantity: data.total_quantity,
        total_value: data.total_value,
        percentage: totalCategoryValue > 0 ? (data.total_value / totalCategoryValue) * 100 : 0
      }));

      const alerts = items
        .filter(
          (i) =>
            i.item_type === 'Inventory' &&
            ((i.quantity_on_hand || 0) === 0 || ((i.reorder_point ?? -1) >= 0 && (i.quantity_on_hand || 0) <= (i.reorder_point ?? -1)))
        )
        .map((i) => ({ name: i.name, sku: i.sku ?? '', qty: i.quantity_on_hand || 0, reorder_point: i.reorder_point ?? undefined }));

      await downloadInventoryPdf({ title, subtitle, kpis, categories, alerts, logoDataUrl });
    } finally {
      handleCloseExport();
    }
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
    // Quantity only shows for Inventory items
    {
      field: 'quantity_on_hand',
      headerName: 'Quantity',
      type: 'number',
      width: 100,
      renderCell: (params: any) => {
        const itemType = params.row.item_type;
        const quantity = params.value;
        const reorderPoint = params.row.reorder_point || 0;

        // Service and NonInventory items don't have quantity
        if (itemType === 'Service' || itemType === 'NonInventory') {
          return (
            <Typography variant="body2" color="text.secondary">
              N/A
            </Typography>
          );
        }

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
    // Reorder point only shows for Inventory items
    {
      field: 'reorder_point',
      headerName: 'Reorder Point',
      type: 'number',
      width: 140,
      renderCell: (params: any) => {
        const itemType = params.row.item_type;

        // Service and NonInventory items don't have reorder point
        if (itemType === 'Service' || itemType === 'NonInventory') {
          return (
            <Typography variant="body2" color="text.secondary">
              N/A
            </Typography>
          );
        }

        return (
          <Typography variant="body2" color="text.primary">
            {params.value ?? '—'}
          </Typography>
        );
      }
    },
    {
      field: 'max_stock_level',
      headerName: 'Max Stock',
      type: 'number',
      width: 120,
      renderCell: (params: any) => {
        const itemType = params.row.item_type;

        // Service and NonInventory items don't have max stock level
        if (itemType === 'Service' || itemType === 'NonInventory') {
          return (
            <Typography variant="body2" color="text.secondary">
              N/A
            </Typography>
          );
        }

        return (
          <Typography variant="body2" color="text.primary">
            {params.value ?? '—'}
          </Typography>
        );
      }
    },
    {
      field: 'item_type',
      headerName: 'Type',
      width: 120,
      renderCell: (params: any) => {
        const getTypeColor = (type: string) => {
          switch (type) {
            case 'Inventory':
              return 'primary.main';
            case 'NonInventory':
              return 'secondary.main';
            case 'Service':
              return 'info.main';
            default:
              return 'text.primary';
          }
        };
        return (
          <Typography variant="body2" fontWeight="medium" color={getTypeColor(params.value)}>
            {params.value || '—'}
          </Typography>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: any) => {
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'active':
              return 'success.main';
            case 'inactive':
              return 'warning.main';
            case 'discontinued':
              return 'error.main';
            default:
              return 'text.primary';
          }
        };
        return (
          <Typography variant="body2" fontWeight="medium" color={getStatusColor(params.value)}>
            {params.value || '—'}
          </Typography>
        );
      }
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 140,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.primary">
          {params.value || '—'}
        </Typography>
      )
    },
    // Weight only shows for Inventory and NonInventory items
    {
      field: 'weight',
      headerName: 'Weight',
      type: 'number',
      width: 100,
      renderCell: (params: any) => {
        const itemType = params.row.item_type;

        // Service items don't have weight
        if (itemType === 'Service') {
          return (
            <Typography variant="body2" color="text.secondary">
              N/A
            </Typography>
          );
        }

        return (
          <Typography variant="body2" color="text.primary">
            {params.value ? `${params.value} lbs` : '—'}
          </Typography>
        );
      }
    },
    // Dimensions only show for Inventory and NonInventory items
    {
      field: 'dimensions',
      headerName: 'Dimensions (L×W×H)',
      width: 190,
      renderCell: (params: any) => {
        const itemType = params.row.item_type;

        // Service items don't have dimensions
        if (itemType === 'Service') {
          return (
            <Typography variant="body2" color="text.secondary">
              N/A
            </Typography>
          );
        }

        const { dimensions_length, dimensions_width, dimensions_height } = params.row;
        if (dimensions_length && dimensions_width && dimensions_height) {
          return (
            <Typography variant="body2" color="text.primary">
              {dimensions_length}" × {dimensions_width}" × {dimensions_height}"
            </Typography>
          );
        }
        return (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      renderCell: (params: any) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="View Details">
            <IconButton size="small" color="primary" onClick={() => handleViewDetails(params.row)}>
              <IconEye size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Item">
            <IconButton size="small" color="primary" onClick={() => handleEditItem(params.row)}>
              <IconEdit size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Item">
            <IconButton size="small" color="error" onClick={() => handleDeleteItem(params.row)}>
              <IconTrash size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  // filterFields managed inside InventoryTableSection

  // Stats computed in InventoryStatsSection

  // Handlers: Import/Export/Add/Refresh
  // Import handled in modal

  // CSV handled via export menu helpers

  const handleAddItem = () => {
    setInventoryModalMode('add');
    setInventoryModalOpen(true);
  };

  const handleViewDetails = (item: any) => {
    setSelectedItem(item);
    setDetailsModalOpen(true);
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setInventoryModalMode('edit');
    setInventoryModalOpen(true);
  };

  const handleDeleteItem = (item: any) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        await dispatch(deleteInventoryItem({ itemId: itemToDelete.id }) as any);
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleRefresh = () => {
    dispatch(fetchInventoryItems() as any);
    dispatch(fetchInventorySummary() as any);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    dispatch(setPage(value));
    dispatch(fetchInventoryItems({ page: value }) as any);
  };

  const handlePageSizeChange = (event: any) => {
    const newPageSize = parseInt(event.target.value, 10);
    dispatch(setPageSize(newPageSize));
    dispatch(fetchInventoryItems({ page: 1, pageSize: newPageSize }) as any);
  };

  return (
    <>
      {/* Global Upload Progress Bar */}
      {uploadStatus === 'uploading' && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{
              height: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                boxShadow: '0 2px 4px rgba(25, 118, 210, 0.3)'
              }
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'primary.main',
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
              }}
            >
              CSV Upload: {uploadProgress}%
            </Typography>
          </Box>
        </Box>
      )}

      <MainCard
        content={false}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h3">Inventory Management</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <Tooltip title="Local Database">
                <IconDatabase size={20} color="#666" />
              </Tooltip>
            </Box>
          </Box>
        }
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Date range moved into InventoryDetailsModal */}

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
              startIcon={<IconScan size={16} />}
              onClick={() => setBarcodeScannerOpen(true)}
              size="small"
              disabled={loading}
              sx={{ py: 0.5, px: 1.5, fontSize: '0.8125rem', color: 'white' }}
            >
              Scan
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
          <InventoryStats />

          {/* Main Table Component */}
          <InventoryTable rows={items} columns={inventoryColumns} />

          {/* Pagination Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 2 }}>
            <FormControl size="small">
              <Select value={pagination.page_size} onChange={handlePageSizeChange} sx={{ minWidth: 120 }}>
                <MenuItem value={10}>10 per page</MenuItem>
                <MenuItem value={20}>20 per page</MenuItem>
                <MenuItem value={50}>50 per page</MenuItem>
                <MenuItem value={100}>100 per page</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Showing {pagination.total_items === 0 ? 0 : (pagination.current_page - 1) * pagination.page_size + 1} -{' '}
                {Math.min(pagination.current_page * pagination.page_size, pagination.total_items)} of {pagination.total_items} items
              </Typography>
              <Pagination
                count={pagination.total_pages}
                page={pagination.current_page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
                disabled={loading}
              />
            </Stack>
          </Box>
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
        <MenuItem onClick={handleExportPdf}>Download PDF Report</MenuItem>
      </Menu>

      {/* Inventory Modals */}
      <InventoryDetailsModal open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} item={selectedItem} />

      <InventoryModal
        open={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        mode={inventoryModalMode}
        item={inventoryModalMode === 'edit' ? selectedItem : undefined}
      />

      <BarcodeScannerModal open={barcodeScannerOpen} onClose={() => setBarcodeScannerOpen(false)} />

      {/* Delete Confirmation Dialog */}
      <ConfirmDelete
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Inventory Item"
        message="Are you sure you want to delete this inventory item? This action cannot be undone."
        itemName={itemToDelete?.name}
        loading={loading}
        confirmText="Delete Item"
        cancelText="Cancel"
        severity="error"
      />
    </>
  );
};

export default InventoryPage;
