import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import qbApi from 'api/qb';

export interface SyncStatus {
  status: 'in_progress' | 'completed' | 'pending' | 'timeout' | 'queued';
  started_at?: string;
  completed_at?: string;
  processed?: number;
  total?: number | null;
  count?: number;
  last_synced?: string;
}

export interface SyncStatuses {
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
  totalEntities: 0
};

// How long a locally queued entity outlasts a server that has not picked it up.
// Matches the backend, which times out an in-progress sync after 30 minutes, so
// a sync that never starts cannot leave the header spinning for good.
const QUEUED_GRACE_MS = 30 * 60 * 1000;

/**
 * Whether a locally queued entity should survive this server reading. The
 * server says `pending` until the worker starts the entity, and `completed`
 * with the previous run's time when the entity has synced before; neither
 * means this sync has run yet.
 */
const keepQueued = (local: SyncStatus | undefined, server: SyncStatus, now: number): boolean => {
  if (local?.status !== 'queued') return false;
  const queuedAt = local.started_at ? new Date(local.started_at).getTime() : NaN;
  if (Number.isNaN(queuedAt) || now - queuedAt > QUEUED_GRACE_MS) return false;
  if (server.status === 'pending') return true;
  if (server.status === 'completed') {
    const completedAt = server.completed_at ? new Date(server.completed_at).getTime() : NaN;
    return Number.isNaN(completedAt) || completedAt < queuedAt;
  }
  return false;
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
      state.totalEntities = 0;
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
      state.totalEntities = Object.keys(state.statuses).length;
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

        const backendStatuses = action.payload as SyncStatuses;
        const now = Date.now();

        Object.entries(backendStatuses).forEach(([entity, backendStatus]) => {
          if (keepQueued(state.statuses[entity], backendStatus, now)) return;
          state.statuses[entity] = backendStatus;
        });

        const activeSyncs = Object.entries(state.statuses).filter(
          ([_, status]) => status.status === 'in_progress' || status.status === 'queued'
        );

        const completedSyncs = Object.entries(state.statuses).filter(([_, status]) => status.status === 'completed');

        state.isAnySyncing = activeSyncs.length > 0;
        state.currentEntity = activeSyncs[0]?.[0] || null;
        state.completedCount = completedSyncs.length;
        // One per entity the backend reports, so a new entity is counted without a frontend change.
        state.totalEntities = Object.keys(state.statuses).length;
      })
      .addCase(fetchAllSyncStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearSyncProgress, initializeSyncFromCallback, setWaitingForOverviewData } = syncProgressSlice.actions;
export default syncProgressSlice.reducer;
