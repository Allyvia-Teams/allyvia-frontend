import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { qbEntityConfigs, EntityType } from 'config/qbEntities';
import { QBEntityAPI } from 'api/qbEntityFactory';
import qbApi from 'api/qb';

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface EntityState {
  items: any[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  filters: Record<string, any>;
  lastSynced: string | null;
}

export interface OverviewState {
  data: any | null;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

type QBEntitiesState = {
  [K in EntityType]: EntityState;
} & {
  overview: OverviewState;
} & {
  [key: string]: EntityState | OverviewState;
};

const createInitialEntityState = (): EntityState => ({
  items: [],
  pagination: null,
  loading: false,
  error: null,
  filters: {},
  lastSynced: null
});

const initialState: QBEntitiesState = {
  ...Object.keys(qbEntityConfigs).reduce((acc, key) => {
    acc[key] = createInitialEntityState();
    return acc;
  }, {} as any),
  overview: {
    data: null,
    loading: false,
    error: null,
    lastFetched: null
  }
};

export const createFetchThunk = (entityType: EntityType) => {
  const config = qbEntityConfigs[entityType];
  return createAsyncThunk(
    `qbEntities/fetch${config.name}`,
    async (params: { companyId: string; filters?: Record<string, any>; page?: number; pageSize?: number }, { rejectWithValue }) => {
      try {
        const api = QBEntityAPI.create(config);
        const data = await api.getAll(params.companyId, {
          ...params.filters,
          page: params.page || 1,
          page_size: params.pageSize || 20
        });
        return { entityType, data };
      } catch (error: any) {
        return rejectWithValue({
          entityType,
          error: error.response?.data?.error || error.message || `Failed to fetch ${config.name.toLowerCase()}s`
        });
      }
    }
  );
};

export const createSyncThunk = (entityType: EntityType) => {
  const config = qbEntityConfigs[entityType];
  return createAsyncThunk(`qbEntities/sync${config.name}`, async (companyId: string, { rejectWithValue }) => {
    try {
      const api = QBEntityAPI.create(config);
      const result = await api.sync(companyId);
      return { entityType, result };
    } catch (error: any) {
      return rejectWithValue({
        entityType,
        error: error.response?.data?.error || error.message || `Failed to sync ${config.name.toLowerCase()}s`
      });
    }
  });
};

export const fetchOverview = createAsyncThunk('qbEntities/fetchOverview', async (companyId: string, { rejectWithValue }) => {
  try {
    const data = await qbApi.getOverviewData(companyId);
    return data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch overview data');
  }
});

const fetchThunks = Object.keys(qbEntityConfigs).reduce(
  (acc, key) => {
    acc[key] = createFetchThunk(key as EntityType);
    return acc;
  },
  {} as Record<string, ReturnType<typeof createFetchThunk>>
);

const syncThunks = Object.keys(qbEntityConfigs).reduce(
  (acc, key) => {
    acc[key] = createSyncThunk(key as EntityType);
    return acc;
  },
  {} as Record<string, ReturnType<typeof createSyncThunk>>
);

const qbEntitiesSlice = createSlice({
  name: 'qbEntities',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<{ entity: string; items: any[] }>) => {
      (state[action.payload.entity] as EntityState).items = action.payload.items;
    },
    setPagination: (state, action: PayloadAction<{ entity: string; pagination: PaginationInfo }>) => {
      (state[action.payload.entity] as EntityState).pagination = action.payload.pagination;
    },
    setLoading: (state, action: PayloadAction<{ entity: string; loading: boolean }>) => {
      (state[action.payload.entity] as EntityState).loading = action.payload.loading;
    },
    setError: (state, action: PayloadAction<{ entity: string; error: string | null }>) => {
      (state[action.payload.entity] as EntityState).error = action.payload.error;
    },
    setFilters: (state, action: PayloadAction<{ entity: string; filters: Record<string, any> }>) => {
      (state[action.payload.entity] as EntityState).filters = action.payload.filters;
    },
    clearEntity: (state, action: PayloadAction<string>) => {
      state[action.payload] = createInitialEntityState();
    },
    updateItem: (state, action: PayloadAction<{ entity: string; id: string; updates: any }>) => {
      const entityState = state[action.payload.entity] as EntityState;
      const index = entityState.items.findIndex((item: any) => item.id === action.payload.id);
      if (index !== -1) {
        entityState.items[index] = { ...entityState.items[index], ...action.payload.updates };
      }
    },
    removeItem: (state, action: PayloadAction<{ entity: string; id: string }>) => {
      const entityState = state[action.payload.entity] as EntityState;
      entityState.items = entityState.items.filter((item: any) => item.id !== action.payload.id);
      if (entityState.pagination) {
        entityState.pagination.total_items -= 1;
      }
    },
    setOverviewData: (state, action: PayloadAction<any>) => {
      state.overview.data = action.payload;
      state.overview.lastFetched = new Date().toISOString();
    },
    setOverviewLoading: (state, action: PayloadAction<boolean>) => {
      state.overview.loading = action.payload;
    },
    setOverviewError: (state, action: PayloadAction<string | null>) => {
      state.overview.error = action.payload;
    },
    clearOverview: (state) => {
      state.overview = {
        data: null,
        loading: false,
        error: null,
        lastFetched: null
      };
    }
  },
  extraReducers: (builder) => {
    Object.entries(fetchThunks).forEach(([entityType, thunk]) => {
      builder
        .addCase(thunk.pending, (state) => {
          (state[entityType] as EntityState).loading = true;
          (state[entityType] as EntityState).error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          const { data } = action.payload as { entityType: string; data: any };
          (state[entityType] as EntityState).loading = false;
          (state[entityType] as EntityState).items = data.items || [];
          (state[entityType] as EntityState).pagination = data.pagination || null;
          (state[entityType] as EntityState).error = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          const payload = action.payload as { entityType: string; error: string };
          (state[entityType] as EntityState).loading = false;
          (state[entityType] as EntityState).error = payload.error;
        });
    });

    Object.entries(syncThunks).forEach(([entityType, thunk]) => {
      builder
        .addCase(thunk.pending, (state) => {
          (state[entityType] as EntityState).loading = true;
          (state[entityType] as EntityState).error = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          (state[entityType] as EntityState).loading = false;
          (state[entityType] as EntityState).lastSynced = new Date().toISOString();
          (state[entityType] as EntityState).error = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          const payload = action.payload as { entityType: string; error: string };
          (state[entityType] as EntityState).loading = false;
          (state[entityType] as EntityState).error = payload.error;
        });
    });

    // Add overview thunk cases
    builder
      .addCase(fetchOverview.pending, (state) => {
        state.overview.loading = true;
        state.overview.error = null;
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.overview.loading = false;
        state.overview.data = action.payload;
        state.overview.lastFetched = new Date().toISOString();
        state.overview.error = null;
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        state.overview.loading = false;
        state.overview.error = action.payload as string;
      });
  }
});

export const {
  setItems,
  setPagination,
  setLoading,
  setError,
  setFilters,
  clearEntity,
  updateItem,
  removeItem,
  setOverviewData,
  setOverviewLoading,
  setOverviewError,
  clearOverview
} = qbEntitiesSlice.actions;

export { fetchThunks, syncThunks };

export default qbEntitiesSlice.reducer;
