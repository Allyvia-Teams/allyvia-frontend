import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getSummary,
  getTrends,
  createItem,
  updateItem,
  deleteItem,
  getItemDetails,
  getItemByBarcode as apiGetItemByBarcode,
  uploadCsvV1,
  downloadCsvTemplateV1,
  getInventoryItems
} from 'api/inventory.api';
import { InventoryItem, InventorySummary, InventoryTrend } from 'types/inventory';

// Use InventoryItem directly from types/inventory.ts
export type Item = InventoryItem & {
  // Additional properties from the original system
  qb_item_id?: string;
  sync_status?: string;
  last_synced?: string;
};

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface InventoryResponse {
  items: Item[];
  pagination: PaginationInfo;
}

interface InventoryState {
  items: Item[];
  pagination: PaginationInfo;
  loading: boolean;
  error: string | null;
  summary: InventorySummary | null;
  trends: InventoryTrend | null;
  itemDetails: InventoryItem | null;
  uploadProgress: number;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadResult: any | null;
}

const initialState: InventoryState = {
  items: [],
  pagination: {
    current_page: 1,
    total_pages: 0,
    total_items: 0,
    page_size: 20,
    has_next: false,
    has_previous: false
  },
  loading: false,
  error: null,
  summary: null,
  trends: null,
  itemDetails: null,
  uploadProgress: 0,
  uploadStatus: 'idle',
  uploadResult: null
};

// Legacy thunk removed - using enhanced thunks only

// Backend caps page_size at 100; load every page so the table can paginate client-side.
const INVENTORY_FETCH_PAGE_SIZE = 100;

export const fetchInventoryItems = createAsyncThunk('inventory/fetchItems', async (_: void, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const selectedCompanyId = currentRole?.company_id;

  if (!selectedCompanyId) {
    throw new Error('No company selected');
  }

  let page = 1;
  let allItems: Awaited<ReturnType<typeof getInventoryItems>>['items'] = [];
  let totalItems = 0;

  while (true) {
    const response = await getInventoryItems(selectedCompanyId, page, INVENTORY_FETCH_PAGE_SIZE);
    allItems = allItems.concat(response.items);
    totalItems = response.pagination.total_items;

    if (!response.pagination.has_next || response.items.length === 0) {
      break;
    }
    page += 1;
  }

  return {
    items: allItems,
    pagination: {
      current_page: 1,
      total_pages: 1,
      total_items: totalItems,
      page_size: allItems.length || INVENTORY_FETCH_PAGE_SIZE,
      has_next: false,
      has_previous: false
    }
  };
});

export const fetchInventorySummary = createAsyncThunk('inventory/fetchSummary', async () => {
  const response = await getSummary();
  return response;
});

export const fetchInventoryTrends = createAsyncThunk('inventory/fetchTrends', async () => {
  const response = await getTrends();
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

    const response = await createItem(itemData, selectedCompanyId);

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

    const response = await updateItem(itemId, itemData, selectedCompanyId);

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
  async ({ itemId }: { itemId: string }, { getState, dispatch }) => {
    const state = getState() as any;
    const currentRole = state.auth?.currentRole;
    const selectedCompanyId = currentRole?.company_id;

    if (!selectedCompanyId) {
      throw new Error('No company selected');
    }

    const response = await deleteItem(itemId, selectedCompanyId);

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

  const response = await getItemDetails(itemId, selectedCompanyId);
  return response;
});

export const uploadCsvFile = createAsyncThunk('inventory/uploadCsv', async (file: File, { dispatch, rejectWithValue }) => {
  try {
    const response = await uploadCsvV1(file, (progress: number) => {
      dispatch(setUploadProgress(progress));
    });
    // refresh items, summary, and trends after upload
    await Promise.all([
      dispatch(fetchInventoryItems() as any),
      dispatch(fetchInventorySummary() as any),
      dispatch(fetchInventoryTrends() as any)
    ]);
    return response;
  } catch (error: any) {
    // Extract error details from response
    const errorData = error.response?.data || { error: error.message || 'Failed to upload CSV file' };
    return rejectWithValue(errorData);
  }
});

export const downloadCsvTemplate = createAsyncThunk('inventory/downloadTemplate', async () => {
  const blob = await downloadCsvTemplateV1();
  return blob;
});

export const getItemByBarcode = createAsyncThunk('inventory/getItemByBarcode', async (barcode: string, { getState }) => {
  const state = getState() as any;
  const currentRole = state.auth?.currentRole;
  const selectedCompanyId = currentRole?.company_id;

  if (!selectedCompanyId) {
    throw new Error('No company selected');
  }

  const response = await apiGetItemByBarcode(barcode, selectedCompanyId);
  return response;
});

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    updateItemList: (state, action: PayloadAction<Item[]>) => {
      state.items = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
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
      state.pagination.current_page = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pagination.page_size = action.payload;
      state.pagination.current_page = 1;
    }
  },
  extraReducers: (builder) => {
    // Legacy fetchItemsFromInventory reducers removed

    // Enhanced fetchInventoryItems
    builder
      .addCase(fetchInventoryItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryItems.fulfilled, (state, action) => {
        state.loading = false;
        // Map LegacyInventoryItem to Item by converting types and adding missing properties
        state.items = action.payload.items.map((legacyItem): Item => {
          const unitPrice = parseFloat(legacyItem.unit_price || '0');
          const costPrice = parseFloat(legacyItem.cost_price || '0');
          const value = legacyItem.quantity_on_hand * unitPrice;

          return {
            id: String(legacyItem.id),
            name: legacyItem.name,
            sku: legacyItem.sku,
            description: legacyItem.description,
            quantity_on_hand: legacyItem.quantity_on_hand,
            unit_price: unitPrice,
            value: value,
            category: legacyItem.category || null,
            item_type: legacyItem.item_type as 'Inventory' | 'NonInventory' | 'Service' | undefined,
            status: legacyItem.status as 'active' | 'inactive' | 'discontinued' | undefined,
            is_active: legacyItem.is_active,
            // Additional properties from legacy system
            qb_item_id: legacyItem.qb_item_id,
            sync_status: legacyItem.sync_status,
            last_synced: legacyItem.last_synced,
            // Additional fields from backend - these were previously missing
            reorder_point: legacyItem.reorder_point,
            max_stock_level: legacyItem.max_stock_level,
            barcode: legacyItem.barcode,
            cost_price: costPrice,
            is_taxable: legacyItem.is_taxable,
            weight: legacyItem.weight ? parseFloat(legacyItem.weight) : null,
            dimensions_length: legacyItem.dimensions_length ? parseFloat(legacyItem.dimensions_length) : null,
            dimensions_width: legacyItem.dimensions_width ? parseFloat(legacyItem.dimensions_width) : null,
            dimensions_height: legacyItem.dimensions_height ? parseFloat(legacyItem.dimensions_height) : null,
            location: legacyItem.location,
            bin_location: legacyItem.bin_location
          };
        });
        state.pagination = action.payload.pagination;
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
        const errorPayload = action.payload as any;
        // Store error details in uploadResult so StepImportResult can display them
        state.uploadResult = errorPayload || {
          error: action.error.message || 'Failed to upload CSV file',
          errors: [],
          csvData: []
        };
        state.error = errorPayload?.error || errorPayload?.details || action.error.message || 'Failed to upload CSV file';
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
        state.itemDetails = {
          ...action.payload,
          id: String(action.payload.id || '')
        };
        state.error = null;
      })
      .addCase(fetchInventoryItemDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch item details';
      });
  }
});

export const { updateItemList, clearError, setLoading, setUploadProgress, resetUpload, setPage, setPageSize } = inventorySlice.actions;
export default inventorySlice.reducer;
