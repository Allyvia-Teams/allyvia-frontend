import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import inventoryApi from 'api/inventory';

export interface Item {
  id: number;
  qb_item_id: string;
  name: string;
  category: string;
  sku: string | null;
  description: string;
  quantity_on_hand: number;
  unit_price: string;
  item_type: string;
  status: string;
  is_active: boolean;
  sync_status: string;
  last_synced: string;
}

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
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  items: [],
  pagination: null,
  loading: false,
  error: null
};

export const fetchItemsFromInventory = createAsyncThunk('inventory/fetchItems', async (companyId: string, { rejectWithValue }) => {
  try {
    const data = await inventoryApi.getInventoryItems(companyId);
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch inventory items');
  }
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
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItemsFromInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItemsFromInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchItemsFromInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { updateItemList } = inventorySlice.actions;
export default inventorySlice.reducer;
