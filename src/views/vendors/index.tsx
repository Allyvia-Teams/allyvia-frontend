// views/vendors/index.tsx
// Main Vendors Management Page using AllyviaPaginatedTable

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Tooltip,
  LinearProgress,
  Select,
  FormControl,
  Pagination,
  TextField
} from '@mui/material';
import { AllyviaPaginatedTable, TableColumnConfig } from 'ui-component/common/AllyviaPaginatedTable';
import ConfirmDelete from 'ui-component/common/ConfirmDelete';
import MainCard from 'ui-component/cards/MainCard';
import { useDispatch, useSelector } from 'store';
import { fetchVendors, deleteVendor, setPage, setPageSize, setSearchQuery, setStatusFilter } from 'store/slices/vendors';
import { downloadVendorCsvTemplate } from 'api/vendors.api';
import { openSnackbar } from 'store/slices/snackbar';
import {
  IconFileTypeCsv,
  IconPlus,
  IconRefresh,
  IconDownload,
  IconEye,
  IconEdit,
  IconTrash,
  IconSearch,
  IconX,
  IconTruck
} from '@tabler/icons-react';
import { Vendor } from 'types/vendor';
import { VendorImportModal, VendorModal, VendorDetailsModal } from 'ui-component/vendors';

const VendorsPage: React.FC = () => {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const { loading, items, uploadStatus, uploadProgress, pagination, searchQuery, statusFilter } = useSelector((state) => state.vendors);

  const [isImportOpen, setIsImportOpen] = React.useState(false);

  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [vendorModalOpen, setVendorModalOpen] = React.useState(false);
  const [vendorModalMode, setVendorModalMode] = React.useState<'add' | 'edit'>('add');
  const [selectedVendor, setSelectedVendor] = React.useState<Vendor | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [vendorToDelete, setVendorToDelete] = React.useState<Vendor | null>(null);

  // Debounced search input
  const [searchInput, setSearchInput] = React.useState(searchQuery);

  React.useEffect(() => {
    dispatch(fetchVendors() as any);
  }, [dispatch]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== searchQuery) {
        dispatch(setSearchQuery(searchInput));
        dispatch(fetchVendors({ page: 1, search: searchInput }) as any);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput, searchQuery, dispatch]);

  // Define column configuration for vendors
  const vendorColumns: TableColumnConfig[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 220,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'contact_name',
      headerName: 'Contact',
      width: 160,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.primary">
          {params.value || '—'}
        </Typography>
      )
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 200,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.primary">
          {params.value || '—'}
        </Typography>
      )
    },
    {
      field: 'phone',
      headerName: 'Phone',
      width: 140,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.primary">
          {params.value || '—'}
        </Typography>
      )
    },
    {
      field: 'city',
      headerName: 'City/State',
      width: 160,
      renderCell: (params: any) => {
        const { city, state } = params.row;
        const location = [city, state].filter(Boolean).join(', ');
        return (
          <Typography variant="body2" color="text.primary">
            {location || '—'}
          </Typography>
        );
      }
    },
    {
      field: 'payment_terms',
      headerName: 'Payment Terms',
      width: 140,
      renderCell: (params: any) => (
        <Typography variant="body2" color="text.primary">
          {params.value || '—'}
        </Typography>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params: any) => (
        <Chip
          size="small"
          label={(params.value || 'active').toUpperCase()}
          color={params.value === 'inactive' ? 'error' : 'success'}
          variant="outlined"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      renderCell: (params: any) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="View Details">
            <IconButton size="small" color="primary" onClick={() => handleViewDetails(params.row)}>
              <IconEye size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Vendor">
            <IconButton size="small" color="primary" onClick={() => handleEditVendor(params.row)}>
              <IconEdit size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Vendor">
            <IconButton size="small" color="error" onClick={() => handleDeleteVendor(params.row)}>
              <IconTrash size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  const handleAddVendor = () => {
    setVendorModalMode('add');
    setSelectedVendor(null);
    setVendorModalOpen(true);
  };

  const handleViewDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDetailsModalOpen(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorModalMode('edit');
    setVendorModalOpen(true);
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (vendorToDelete) {
      try {
        await dispatch(deleteVendor({ vendorId: vendorToDelete.id }) as any);
        setDeleteConfirmOpen(false);
        setVendorToDelete(null);
      } catch (error) {
        console.error('Failed to delete vendor:', error);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setVendorToDelete(null);
  };

  const handleRefresh = () => {
    dispatch(fetchVendors() as any);
  };

  const handleDownloadTemplate = async () => {
    if (!currentRole?.company_id) {
      dispatch(
        openSnackbar({
          open: true,
          message: 'Select a company from the header before downloading the template.',
          variant: 'alert',
          alert: { color: 'error' }
        })
      );
      return;
    }
    try {
      await downloadVendorCsvTemplate(currentRole.company_id);
    } catch (error) {
      console.error('Failed to download template:', error);
      dispatch(
        openSnackbar({
          open: true,
          message: 'Failed to download the vendor template.',
          variant: 'alert',
          alert: { color: 'error' }
        })
      );
    }
  };

  const handleStatusFilterChange = (event: any) => {
    const value = event.target.value as string;
    dispatch(setStatusFilter(value));
    dispatch(fetchVendors({ page: 1, status: value }) as any);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    dispatch(setPage(value));
    dispatch(fetchVendors({ page: value }) as any);
  };

  const handlePageSizeChange = (event: any) => {
    const newPageSize = parseInt(event.target.value, 10);
    dispatch(setPageSize(newPageSize));
    dispatch(fetchVendors({ page: 1, pageSize: newPageSize }) as any);
  };

  const isEmpty = !loading && items.length === 0 && !searchQuery && !statusFilter;

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
              Vendor Upload: {uploadProgress}%
            </Typography>
          </Box>
        </Box>
      )}

      <MainCard
        content={false}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h3">Vendors</Typography>
          </Box>
        }
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              startIcon={<IconFileTypeCsv size={16} />}
              onClick={() => setIsImportOpen(true)}
              size="small"
              disabled={loading}
              sx={{ py: 0.5, px: 1.5, fontSize: '0.8125rem', color: 'white' }}
            >
              Import
            </Button>

            <Button
              variant="outlined"
              startIcon={<IconDownload size={16} />}
              onClick={handleDownloadTemplate}
              size="small"
              disabled={loading}
              sx={{ py: 0.5, px: 1.5, fontSize: '0.8125rem' }}
            >
              Download Template
            </Button>

            <Button
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={handleAddVendor}
              size="small"
              disabled={loading}
              sx={{ py: 0.5, px: 1.5, fontSize: '0.8125rem', color: 'white' }}
            >
              Add Vendor
            </Button>
            <IconButton onClick={handleRefresh} size="small" disabled={loading}>
              <IconRefresh />
            </IconButton>
          </Stack>
        }
      >
        <Box sx={{ p: 3 }}>
          {/* Toolbar: Search + Status Filter */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search vendors..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ maxWidth: 320, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={18} />
                  </InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchInput('')}>
                      <IconX size={16} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined
              }}
            />
            <FormControl size="small">
              <Select value={statusFilter} onChange={handleStatusFilterChange} displayEmpty sx={{ minWidth: 140 }}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {isEmpty ? (
            /* Empty state with CTA */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <IconTruck size={48} color="#9e9e9e" />
              <Typography variant="h5" sx={{ mt: 2 }}>
                No vendors yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                Add your first vendor or import them from a CSV or Excel file.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={handleAddVendor} sx={{ color: 'white' }}>
                  Add Vendor
                </Button>
                <Button variant="outlined" startIcon={<IconFileTypeCsv size={16} />} onClick={() => setIsImportOpen(true)}>
                  Import
                </Button>
              </Stack>
            </Box>
          ) : (
            <>
              {/* Main Table Component */}
              <AllyviaPaginatedTable rows={items} columns={vendorColumns} showPagination={false} title="Vendors" height={500} />

              {/* Pagination Controls */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 2 }}>
                <FormControl size="small">
                  <Select value={pagination.pageSize} onChange={handlePageSizeChange} sx={{ minWidth: 120 }}>
                    <MenuItem value={10}>10 per page</MenuItem>
                    <MenuItem value={20}>20 per page</MenuItem>
                    <MenuItem value={50}>50 per page</MenuItem>
                    <MenuItem value={100}>100 per page</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1} -{' '}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} vendors
                  </Typography>
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                    disabled={loading}
                  />
                </Stack>
              </Box>
            </>
          )}
        </Box>
        <VendorImportModal open={isImportOpen} onClose={() => setIsImportOpen(false)} />
      </MainCard>

      {/* Vendor Modals */}
      <VendorDetailsModal open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} vendor={selectedVendor} />

      <VendorModal
        open={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        mode={vendorModalMode}
        vendor={vendorModalMode === 'edit' ? selectedVendor : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDelete
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor?"
        itemName={vendorToDelete?.name}
        loading={loading}
        confirmText="Delete Vendor"
        cancelText="Cancel"
        severity="error"
      />
    </>
  );
};

export default VendorsPage;
