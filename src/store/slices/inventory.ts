import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { InventoryApi } from 'api/inventory.api';
import {
  InventoryItem,
  InventorySummary,
  InventoryTrend,
  InventoryCreateResponse,
  InventoryUpdateResponse,
  InventoryDeleteResponse
} from 'types/inventory';

interface InventoryState {
  loading: boolean;
  items: InventoryItem[];
  summary: InventorySummary | null;
  trends: InventoryTrend | null;
  alerts: {
    low_stock: InventoryItem[];
    out_of_stock: InventoryItem[];
  };
  itemDetails: InventoryItem | null;
  error: string | null;
  uploadProgress: number;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadResult: any | null;
}

const initialState: InventoryState = {
  loading: false,
  items: [],
  summary: null,
  trends: null,
  alerts: {
    low_stock: [],
    out_of_stock: []
  },
  itemDetails: null,
  error: null,
  uploadProgress: 0,
  uploadStatus: 'idle',
  uploadResult: null
};

// Async Thunks
export const fetchInventoryItems = createAsyncThunk('inventory/fetchItems', async () => {
  const response = await InventoryApi.getItems();
  return response;
});

export const fetchInventorySummary = createAsyncThunk('inventory/fetchSummary', async () => {
  const response = await InventoryApi.getSummary();
  return response;
});

export const fetchInventoryTrends = createAsyncThunk('inventory/fetchTrends', async () => {
  const response = await InventoryApi.getTrends();
  return response;
});

export const createInventoryItem = createAsyncThunk(
  'inventory/createItem',
  async (itemData: Partial<InventoryItem>, { getState, dispatch }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id;

    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    const response = await InventoryApi.createItem(itemData, selectedCompanyId);

    // Refresh all inventory data after successful creation
    await Promise.all([
      dispatch(fetchInventoryItems() as any),
      dispatch(fetchInventorySummary() as any),
      dispatch(fetchInventoryTrends() as any)
    ]);

    return response;
  }
);

export const updateInventoryItem = createAsyncThunk(
  'inventory/updateItem',
  async ({ itemId, itemData }: { itemId: string; itemData: Partial<InventoryItem> }, { getState, dispatch }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id;

    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    const response = await InventoryApi.updateItem(itemId, itemData, selectedCompanyId);

    // Refresh all inventory data after successful update
    await Promise.all([
      dispatch(fetchInventoryItems() as any),
      dispatch(fetchInventorySummary() as any),
      dispatch(fetchInventoryTrends() as any)
    ]);

    return response;
  }
);

export const deleteInventoryItem = createAsyncThunk(
  'inventory/deleteItem',
  async ({ itemId, useQuickBooks = true }: { itemId: string; useQuickBooks?: boolean }, { getState, dispatch }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id;

    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    const response = await InventoryApi.deleteItem(itemId, selectedCompanyId, useQuickBooks);

    // Refresh all inventory data after successful deletion
    await Promise.all([
      dispatch(fetchInventoryItems() as any),
      dispatch(fetchInventorySummary() as any),
      dispatch(fetchInventoryTrends() as any)
    ]);

    return { ...response, itemId };
  }
);

export const fetchInventoryItemDetails = createAsyncThunk('inventory/fetchItemDetails', async (itemId: string, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const selectedCompanyId = currentRole?.company_id;

  if (!selectedCompanyId) {
    throw new Error('No company selected');
  }

  const response = await InventoryApi.getItemDetails(itemId, selectedCompanyId);
  return response;
});

export const uploadCsvFile = createAsyncThunk('inventory/uploadCsv', async (file: File, { dispatch }) => {
  const response = await InventoryApi.uploadCsvV1(file, (progress: number) => {
    dispatch(setUploadProgress(progress));
  });
  // refresh items, summary, and trends after upload
  await Promise.all([
    dispatch(fetchInventoryItems() as any),
    dispatch(fetchInventorySummary() as any),
    dispatch(fetchInventoryTrends() as any)
  ]);
  return response;
});

export const downloadCsvTemplate = createAsyncThunk('inventory/downloadTemplate', async () => {
  const blob = await InventoryApi.downloadCsvTemplateV1();
  return blob;
});

export const getItemByBarcode = createAsyncThunk('inventory/getItemByBarcode', async (barcode: string, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const selectedCompanyId = currentRole?.company_id;

  if (!selectedCompanyId) {
    throw new Error('No company selected');
  }

  const response = await InventoryApi.getItemByBarcode(barcode, selectedCompanyId);
  return response;
});

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    resetUpload: (state) => {
      state.uploadProgress = 0;
      state.uploadStatus = 'idle';
      state.uploadResult = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch Items
    builder
      .addCase(fetchInventoryItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.error = null;
      })
      .addCase(fetchInventoryItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory items';
      });

    // Fetch Summary
    builder
      .addCase(fetchInventorySummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
        state.error = null;
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory summary';
      });

    // Fetch Trends
    builder
      .addCase(fetchInventoryTrends.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryTrends.fulfilled, (state, action) => {
        state.loading = false;
        state.trends = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryTrends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory trends';
      });

    // Create Item
    builder
      .addCase(createInventoryItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        // Data will be refreshed by the fetchInventoryItems call in the thunk
        state.error = null;
      })
      .addCase(createInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create inventory item';
      });

    // Update Item
    builder
      .addCase(updateInventoryItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        // Data will be refreshed by the fetchInventoryItems call in the thunk
        state.error = null;
      })
      .addCase(updateInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update inventory item';
      });

    // Delete Item
    builder
      .addCase(deleteInventoryItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        // Data will be refreshed by the fetchInventoryItems call in the thunk
        state.error = null;
      })
      .addCase(deleteInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete inventory item';
      });

    // Upload CSV
    builder
      .addCase(uploadCsvFile.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadCsvFile.fulfilled, (state, action) => {
        state.uploadStatus = 'success';
        state.uploadResult = action.payload;
        state.error = null;
      })
      .addCase(uploadCsvFile.rejected, (state, action) => {
        state.uploadStatus = 'error';
        state.error = action.error.message || 'Failed to upload CSV file';
      });

    // Download Template
    builder
      .addCase(downloadCsvTemplate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(downloadCsvTemplate.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(downloadCsvTemplate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to download CSV template';
      });

    // Get Item by Barcode
    builder
      .addCase(getItemByBarcode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getItemByBarcode.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(getItemByBarcode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to lookup item by barcode';
      });

    // Fetch Item Details
    builder
      .addCase(fetchInventoryItemDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryItemDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.itemDetails = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryItemDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch item details';
      });
  }
});

export const { setUploadProgress, resetUpload, clearError } = inventorySlice.actions;
export default inventorySlice.reducer;
