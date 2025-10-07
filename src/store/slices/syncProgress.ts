import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import qbApi from 'api/qb';

interface SyncStatus {
  status: 'in_progress' | 'completed' | 'pending' | 'timeout' | 'queued';
  started_at?: string;
  completed_at?: string;
  processed?: number;
  total?: number;
  count?: number;
  last_synced?: string;
}

interface SyncStatuses {
  [entity: string]: SyncStatus;
}

interface SyncProgressState {
  statuses: SyncStatuses;
  isAnySyncing: boolean;
  currentEntity: string | null;
  loading: boolean;
  error: string | null;
  isWaitingForOverviewData: boolean;
  completedCount: number;
  totalEntities: number;
}

const initialState: SyncProgressState = {
  statuses: {},
  isAnySyncing: false,
  currentEntity: null,
  loading: false,
  error: null,
  isWaitingForOverviewData: false,
  completedCount: 0,
  totalEntities: 10
};

export const fetchAllSyncStatus = createAsyncThunk('syncProgress/fetchAll', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.getAllSyncStatus(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data || 'Failed to fetch sync status');
  }
});

const syncProgressSlice = createSlice({
  name: 'syncProgress',
  initialState,
  reducers: {
    clearSyncProgress: (state) => {
      state.statuses = {};
      state.isAnySyncing = false;
      state.currentEntity = null;
      state.isWaitingForOverviewData = false;
      state.completedCount = 0;
      state.totalEntities = 10;
    },
    initializeSyncFromCallback: (state, action: { payload: string[] }) => {
      const entities = action.payload;
      const now = new Date().toISOString();

      entities.forEach((entity) => {
        state.statuses[entity] = {
          status: 'queued',
          started_at: now,
          processed: 0,
          count: 0
        };
      });

      state.isAnySyncing = true;
      state.currentEntity = entities[0] || null;
    },
    setWaitingForOverviewData: (state, action: { payload: boolean }) => {
      state.isWaitingForOverviewData = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllSyncStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllSyncStatus.fulfilled, (state, action) => {
        state.loading = false;

        const backendStatuses = action.payload;

        Object.entries(backendStatuses).forEach(([entity, backendStatus]: [string, any]) => {
          if (state.statuses[entity]?.status === 'queued' && backendStatus.status === 'pending') {
            return;
          }
          state.statuses[entity] = backendStatus;
        });

        const activeSyncs = Object.entries(state.statuses).filter(
          ([_, status]) => status.status === 'in_progress' || status.status === 'queued'
        );

        const completedSyncs = Object.entries(state.statuses).filter(([_, status]) => status.status === 'completed');

        state.isAnySyncing = activeSyncs.length > 0;
        state.currentEntity = activeSyncs[0]?.[0] || null;
        state.completedCount = completedSyncs.length;
        state.totalEntities = 10;
      })
      .addCase(fetchAllSyncStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearSyncProgress, initializeSyncFromCallback, setWaitingForOverviewData } = syncProgressSlice.actions;
export default syncProgressSlice.reducer;
