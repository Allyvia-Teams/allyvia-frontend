// src/store/slices/inventory.ts
// Redux slice for inventory management and CSV bulk upload

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { InventoryApi } from '../../api/inventory.api';
import type {
  InventoryItem,
  CsvError,
  InventoryFilters,
  InventorySummary,
  CsvUploadSimpleResponse,
  InventoryTrendSeries,
  InventoryItemsResponse,
  InventoryTrendResponse,
  InventorySyncStatus
} from 'types/inventory';

// ============================================================================
// ASYNC THUNKS
// ============================================================================

export const fetchInventoryItems = createAsyncThunk('inventory/fetchItems', async () => {
  const response = await InventoryApi.getItems();
  return response as InventoryItemsResponse;
});

export const fetchInventorySummary = createAsyncThunk(
  'inventory/fetchSummary',
  async (params?: { start_date?: string; end_date?: string; qb_connected?: string }) => {
    const summary = await InventoryApi.getSummary(params);
    return summary as InventorySummary;
  }
);

export const fetchInventoryTrends = createAsyncThunk(
  'inventory/fetchTrends',
  async (params?: { start_date?: string; end_date?: string; item_ids?: string; qb_connected?: string }) => {
    const trends = await InventoryApi.getTrend(params);
    return trends as InventoryTrendResponse;
  }
);

export const fetchInventoryAlerts = createAsyncThunk(
  'inventory/fetchAlerts',
  async (params?: { start_date?: string; end_date?: string; qb_connected?: string }) => {
    const alerts = await InventoryApi.getAlerts(params);
    return alerts as { lowStock: InventoryItem[]; outOfStock: InventoryItem[] };
  }
);

export const fetchInventorySyncStatus = createAsyncThunk('inventory/fetchSyncStatus', async () => {
  const status = await InventoryApi.getSyncStatus();
  return status as InventorySyncStatus;
});

export const syncToQuickBooks = createAsyncThunk('inventory/syncToQuickBooks', async (_, { dispatch }) => {
  const result = await InventoryApi.syncToQuickBooks();
  // Refresh data after sync
  await Promise.all([
    dispatch(fetchInventoryItems() as any),
    dispatch(fetchInventorySummary() as any),
    dispatch(fetchInventorySyncStatus() as any)
  ]);
  return result;
});

export const uploadCsvFile = createAsyncThunk('inventory/uploadCsv', async (file: File, { dispatch }) => {
  const response = await InventoryApi.uploadCsvV1(file, (progress: number) => {
    dispatch(setUploadProgress(progress));
  });
  // refresh items and summary after upload
  await Promise.all([dispatch(fetchInventoryItems() as any), dispatch(fetchInventorySummary() as any)]);
  return response;
});

// Removed unused functions: pollUploadStatus and validateCsvFile

export const downloadCsvTemplate = createAsyncThunk('inventory/downloadTemplate', async () => {
  const blob = await InventoryApi.downloadCsvTemplateV1();
  return blob;
});

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface InventoryState {
  // Core data
  items: InventoryItem[];
  total: number;
  summary?: InventorySummary;
  trends: InventoryTrendResponse | null;
  alerts: {
    lowStock: InventoryItem[];
    outOfStock: InventoryItem[];
  };
  syncStatus?: InventorySyncStatus;

  // Table state (grouped related properties)
  table: {
    page: number;
    page_size: number;
    filters: InventoryFilters;
    searchTerm: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    columnFilters: Record<string, any>;
  };

  // Loading states
  loading: boolean;
  error: string | null;

  // Individual API loading states
  loadingStates: {
    items: boolean;
    summary: boolean;
    trends: boolean;
    alerts: boolean;
    syncStatus: boolean;
  };

  // Upload state
  upload: {
    inProgress: boolean;
    progress: number;
    lastResult?: CsvUploadSimpleResponse;
    error?: string | null;
  };

  // Validation state
  validation: {
    isValid: boolean;
    errors: CsvError[];
  };

  // General errors
  errors: string[];
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: InventoryState = {
  // Core data
  items: [],
  total: 0,
  trends: null,
  alerts: {
    lowStock: [],
    outOfStock: []
  },
  syncStatus: undefined,

  // Table state (grouped related properties)
  table: {
    page: 0,
    page_size: 25,
    filters: {
      search: '',
      status: '',
      item_type: '',
      page: 1,
      page_size: 25
    },
    searchTerm: '',
    sortBy: '',
    sortOrder: 'asc',
    columnFilters: {}
  },

  // Loading states
  loading: false,
  error: null,

  // Individual API loading states
  loadingStates: {
    items: false,
    summary: false,
    trends: false,
    alerts: false,
    syncStatus: false
  },

  // Upload state
  upload: {
    inProgress: false,
    progress: 0,
    lastResult: undefined,
    error: null
  },

  // Validation state
  validation: {
    isValid: false,
    errors: []
  },

  // General errors
  errors: []
};

// ============================================================================
// SLICE
// ============================================================================

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.upload.progress = action.payload;
    },
    resetUpload: (state) => {
      state.upload = initialState.upload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.table.page = action.payload;
      state.table.filters.page = action.payload + 1; // Convert to 1-based for API
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.table.page_size = action.payload;
      state.table.filters.page_size = action.payload;
    },
    setFilters: (state, action: PayloadAction<InventoryFilters>) => {
      state.table.filters = { ...state.table.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.table.filters = initialState.table.filters;
      state.table.searchTerm = '';
      state.table.sortBy = '';
      state.table.sortOrder = 'asc';
      state.table.columnFilters = {};
    },
    clearErrors: (state) => {
      state.errors = initialState.errors;
    },
    clearValidation: (state) => {
      state.validation = initialState.validation;
    },
    clearData: (state) => {
      state.items = initialState.items;
      state.total = initialState.total;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.table.searchTerm = action.payload;
      state.table.filters.search = action.payload;
      state.table.page = 0; // Reset to first page when searching
      state.table.filters.page = 1;
    },
    setSorting: (state, action: PayloadAction<{ field: string; order: 'asc' | 'desc' }>) => {
      state.table.sortBy = action.payload.field;
      state.table.sortOrder = action.payload.order;
    },
    setColumnFilter: (state, action: PayloadAction<{ field: string; value: any }>) => {
      state.table.columnFilters[action.payload.field] = action.payload.value;
      // Update filters for API
      if (action.payload.field === 'status') {
        state.table.filters.status = action.payload.value;
      } else if (action.payload.field === 'item_type') {
        state.table.filters.item_type = action.payload.value;
      }
    },
    clearColumnFilter: (state, action: PayloadAction<string>) => {
      delete state.table.columnFilters[action.payload];
      // Clear from filters
      if (action.payload === 'status') {
        state.table.filters.status = '';
      } else if (action.payload === 'item_type') {
        state.table.filters.item_type = '';
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch inventory items (new API returns response with items and sync status)
    builder
      .addCase(fetchInventoryItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryItems.fulfilled, (state, action) => {
        state.loading = false;
        // Handle both Axios response and direct data
        const response = (action.payload as any).data || action.payload;
        console.log('fetchInventoryItems.fulfilled - Response:', response);
        state.items = response.items || [];
        state.total = response.items?.length || 0;
        state.syncStatus = response.sync_status;
        console.log('Updated state.items:', state.items.length);
      })
      .addCase(fetchInventoryItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory items';
      });

    // Fetch inventory summary
    builder
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        // Handle both Axios response and direct data
        const summary = (action.payload as any).data || action.payload;
        console.log('fetchInventorySummary.fulfilled - Response:', summary);
        state.summary = summary as InventorySummary;
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch inventory summary';
      });

    // Fetch inventory trends (new API returns hybrid response)
    builder
      .addCase(fetchInventoryTrends.fulfilled, (state, action) => {
        // Handle both Axios response and direct data
        const trends = (action.payload as any).data || action.payload;
        console.log('fetchInventoryTrends.fulfilled - Response:', trends);
        state.trends = trends as InventoryTrendResponse;
      })
      .addCase(fetchInventoryTrends.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch inventory trends';
      });

    // Fetch inventory alerts
    builder
      .addCase(fetchInventoryAlerts.fulfilled, (state, action) => {
        // Handle both Axios response and direct data
        const alerts = (action.payload as any).data || action.payload;
        state.alerts = alerts as { lowStock: InventoryItem[]; outOfStock: InventoryItem[] };
      })
      .addCase(fetchInventoryAlerts.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch inventory alerts';
      });

    // Fetch inventory sync status
    builder
      .addCase(fetchInventorySyncStatus.fulfilled, (state, action) => {
        // Handle both Axios response and direct data
        const syncStatus = (action.payload as any).data || action.payload;
        state.syncStatus = syncStatus as InventorySyncStatus;
      })
      .addCase(fetchInventorySyncStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch sync status';
      });

    // Sync to QuickBooks
    builder
      .addCase(syncToQuickBooks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncToQuickBooks.fulfilled, (state) => {
        state.loading = false;
        // Data will be refreshed by the thunk
      })
      .addCase(syncToQuickBooks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to sync to QuickBooks';
      });

    // Upload CSV file
    builder
      .addCase(uploadCsvFile.pending, (state) => {
        state.upload.inProgress = true;
        state.upload.progress = 0;
        state.upload.error = null;
        state.upload.lastResult = undefined;
      })
      .addCase(uploadCsvFile.fulfilled, (state, action) => {
        state.upload.inProgress = false;
        state.upload.lastResult = action.payload as CsvUploadSimpleResponse;
      })
      .addCase(uploadCsvFile.rejected, (state, action) => {
        state.upload.inProgress = false;
        state.upload.error = action.error.message || 'Upload failed';
      });

    // Remove poll upload status (v1 upload is synchronous)

    // Download CSV template
    builder.addCase(downloadCsvTemplate.rejected, (state, action) => {
      state.errors.push(action.error.message || 'Template download failed');
    });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  setUploadProgress,
  resetUpload,
  setPage,
  setPageSize,
  setFilters,
  clearFilters,
  clearErrors,
  clearValidation,
  clearData,
  setSearchTerm,
  setSorting,
  setColumnFilter,
  clearColumnFilter
} = inventorySlice.actions;

export default inventorySlice.reducer;
