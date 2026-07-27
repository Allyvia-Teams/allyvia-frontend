import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getVendors as apiGetVendors,
  createVendor as apiCreateVendor,
  updateVendor as apiUpdateVendor,
  deleteVendor as apiDeleteVendor,
  uploadVendorCsv as apiUploadVendorCsv
} from 'api/vendors.api';
import { Vendor, VendorUploadResult } from 'types/vendor';

interface VendorsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface VendorsState {
  items: Vendor[];
  pagination: VendorsPagination;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: string; // '' | 'active' | 'inactive'
  uploadProgress: number;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadResult: VendorUploadResult | null;
  selectedVendor: Vendor | null;
}

const initialState: VendorsState = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  },
  loading: false,
  error: null,
  searchQuery: '',
  statusFilter: '',
  uploadProgress: 0,
  uploadStatus: 'idle',
  uploadResult: null,
  selectedVendor: null
};

export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (params: { page?: number; pageSize?: number; search?: string; status?: string } | undefined, { getState }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id;

    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    const currentPage = params?.page ?? state.vendors.pagination.page;
    const currentPageSize = params?.pageSize ?? state.vendors.pagination.pageSize;
    const search = params?.search ?? state.vendors.searchQuery;
    const status = params?.status ?? state.vendors.statusFilter;

    const response = await apiGetVendors(selectedCompanyId, currentPage, currentPageSize, search || undefined, status || undefined);
    return response;
  }
);

export const createVendor = createAsyncThunk('vendors/createVendor', async (vendorData: Partial<Vendor>, { getState, dispatch }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const selectedCompanyId = currentRole?.company_id;

  if (!selectedCompanyId) {
    throw new Error('No company selected');
  }

  const response = await apiCreateVendor(vendorData, selectedCompanyId);

  // Refresh vendor list after successful creation
  await dispatch(fetchVendors() as any);

  return response;
});

export const updateVendor = createAsyncThunk(
  'vendors/updateVendor',
  async ({ vendorId, vendorData }: { vendorId: number | string; vendorData: Partial<Vendor> }, { getState, dispatch }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id;

    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    const response = await apiUpdateVendor(vendorId, vendorData, selectedCompanyId);

    // Refresh vendor list after successful update
    await dispatch(fetchVendors() as any);

    return response;
  }
);

export const deleteVendor = createAsyncThunk(
  'vendors/deleteVendor',
  async ({ vendorId }: { vendorId: number | string }, { getState, dispatch }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id;

    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    const response = await apiDeleteVendor(vendorId, selectedCompanyId);

    // Refresh vendor list after successful deletion
    await dispatch(fetchVendors() as any);

    return { ...response, vendorId };
  }
);

export const uploadVendorCsv = createAsyncThunk('vendors/uploadCsv', async (file: File, { getState, dispatch, rejectWithValue }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const selectedCompanyId = currentRole?.company_id;

  if (!selectedCompanyId) {
    return rejectWithValue({ error: 'No company selected', details: 'Select a company from the header before importing vendors.' });
  }

  try {
    const response = await apiUploadVendorCsv(file, selectedCompanyId, (progress: number) => {
      dispatch(setUploadProgress(progress));
    });
    // Refresh vendor list after upload
    await dispatch(fetchVendors() as any);
    return response;
  } catch (error: any) {
    // Extract error details from response
    const errorData = error.response?.data || { error: error.message || 'Failed to upload CSV file' };
    return rejectWithValue(errorData);
  }
});

const vendorsSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    resetUpload: (state) => {
      state.uploadProgress = 0;
      state.uploadStatus = 'idle';
      state.uploadResult = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pagination.pageSize = action.payload;
      state.pagination.page = 1;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.pagination.page = 1;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload;
      state.pagination.page = 1;
    },
    setSelectedVendor: (state, action: PayloadAction<Vendor | null>) => {
      state.selectedVendor = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Fetch Vendors
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = {
          page: action.payload.pagination.current_page,
          pageSize: action.payload.pagination.page_size,
          total: action.payload.pagination.total_items,
          totalPages: action.payload.pagination.total_pages
        };
        state.error = null;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch vendors';
      });

    // Create Vendor
    builder
      .addCase(createVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVendor.fulfilled, (state) => {
        state.loading = false;
        // Data is refreshed by the fetchVendors call in the thunk
        state.error = null;
      })
      .addCase(createVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create vendor';
      });

    // Update Vendor
    builder
      .addCase(updateVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVendor.fulfilled, (state) => {
        state.loading = false;
        // Data is refreshed by the fetchVendors call in the thunk
        state.error = null;
      })
      .addCase(updateVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update vendor';
      });

    // Delete Vendor
    builder
      .addCase(deleteVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVendor.fulfilled, (state) => {
        state.loading = false;
        // Data is refreshed by the fetchVendors call in the thunk
        state.error = null;
      })
      .addCase(deleteVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete vendor';
      });

    // Upload CSV
    builder
      .addCase(uploadVendorCsv.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadVendorCsv.fulfilled, (state, action) => {
        state.uploadStatus = 'success';
        state.uploadResult = action.payload;
        state.error = null;
      })
      .addCase(uploadVendorCsv.rejected, (state, action) => {
        state.uploadStatus = 'error';
        const errorPayload = action.payload as any;
        // Store error details in uploadResult so StepImportResult can display them
        state.uploadResult = errorPayload || {
          error: action.error.message || 'Failed to upload CSV file',
          errors: [],
          csvData: []
        };
        state.error = errorPayload?.error || errorPayload?.details || action.error.message || 'Failed to upload CSV file';
      });
  }
});

export const { clearError, setUploadProgress, resetUpload, setPage, setPageSize, setSearchQuery, setStatusFilter, setSelectedVendor } =
  vendorsSlice.actions;
export default vendorsSlice.reducer;
