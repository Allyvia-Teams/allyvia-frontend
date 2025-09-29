import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import qbApi from 'api/qb';
import {
  getSquareAuthUrl,
  processSquareCallback as processSquareCallbackAPI,
  getSquareConnectionStatus,
  disconnectSquare as disconnectSquareAPI,
  fetchSquareAllData as fetchSquareAllDataAPI,
  fetchSquareCatalog as fetchSquareCatalogAPI,
  fetchSquareLocations as fetchSquareLocationsAPI,
  getSquareMappings,
  saveSquareMappings as saveSquareMappingsAPI,
  getSquareWebhookEvents,
  SquareAllData
} from 'api/square';
import {
  SquareConnectionStatus,
  SquareCatalogItem,
  SquareLocation,
  SquareAccountMapping,
  SquareWebhookEvent,
  SquareWebhookEventList
} from 'types/entities';
import { Company } from 'types/entities';

export interface QuickBooksConnection {
  status: 'connected' | 'disconnected' | 'expired' | 'refreshing';
  companyId: string | null;
  realmId: string | null;
  lastAuth: string | null;
  tokenExpiresIn: number;
  accessTokenValid: boolean;
  refreshTokenValid: boolean;
  hasAccountMappings?: boolean;
}

export interface AccountMapping {
  qbAccountId: string;
  qbAccountName: string;
  qbAccountType: string;
  internalCategory: string;
}

export interface ChartOfAccount {
  id: string;
  name: string;
  type: string;
  subType: string;
  fullyQualifiedName: string;
  active: boolean;
}
export interface Item {
  id: string;
  name: string;
  description: string;
  type: string;
  subType: string;
  unitPrice: number;
  fullyQualifiedName: string;
  active: boolean;
}

export interface WebhookEvent {
  id: string;
  company_name?: string;
  event_type: string;
  operation?: string;
  status: 'received' | 'processing' | 'processed' | 'error' | 'deadletter';
  retry_count: number;
  created_at: string;
  updated_at?: string;
  payload?: any;
}

export interface QBSyncRecord {
  id: string;
  entity_type: string;
  status: string;
  created_count: number;
  updated_count: number;
  deleted_count: number;
  error_count: number;
  started_at: string;
  completed_at: string | null;
  duration?: number;
  error_message?: string;
}

interface IntegrationsState {
  quickbooks: {
    connection: QuickBooksConnection;
    mapping: {
      accounts: ChartOfAccount[];
      mappedCategories: Record<string, string>;
      lastFetched: string | null;
    };
    syncHistory: Array<{
      id: string;
      timestamp: string;
      status: 'success' | 'failed' | 'pending';
      message: string;
      recordsProcessed?: number;
    }>;
    webhooks: {
      events: WebhookEvent[];
      totalCount: number;
      isLoading: boolean;
      error: string | null;
    };
    qbSync: {
      records: QBSyncRecord[];
      isLoading: boolean;
      error: string | null;
    };
    ui: {
      isConnecting: boolean;
      isRefreshing: boolean;
      isFetchingAccounts: boolean;
      error: string | null;
    };
    items: {
      data: any[];
      isLoading: boolean;
      isSyncing: boolean;
      lastSync: string | null;
      syncStatus: {
        timestamp: string;
        created: number;
        updated: number;
      } | null;
      error: string | null;
    };
  };
  square: {
    connectionStatus: SquareConnectionStatus | null;
    catalog: SquareCatalogItem[];
    invoices: any[];
    payments: any[];
    orders: any[];
    customers: any[];
    locations: SquareLocation[];
    mappings: SquareAccountMapping[];
    webhookEvents: SquareWebhookEvent[];
    webhookEventsMeta: {
      total: number;
      limit: number;
      offset: number;
    };
    loading: {
      connectionStatus: boolean;
      allData: boolean;
      catalog: boolean;
      locations: boolean;
      mappings: boolean;
      webhookEvents: boolean;
      disconnect: boolean;
    };
    error: string | null;
    items: {
      data: any[];
      isLoading: boolean;
      isSyncing: boolean;
      lastSync: string | null;
      syncStatus: {
        timestamp: string;
        created: number;
        updated: number;
      } | null;
      error: string | null;
    };
  };
}

const initialState: IntegrationsState = {
  quickbooks: {
    connection: {
      status: 'disconnected',
      companyId: null,
      realmId: null,
      lastAuth: null,
      tokenExpiresIn: 0,
      accessTokenValid: false,
      refreshTokenValid: false
    },
    mapping: {
      accounts: [],
      mappedCategories: {},
      lastFetched: null
    },
    syncHistory: [],
    webhooks: {
      events: [],
      totalCount: 0,
      isLoading: false,
      error: null
    },
    qbSync: {
      records: [],
      isLoading: false,
      error: null
    },
    ui: {
      isConnecting: false,
      isRefreshing: false,
      isFetchingAccounts: false,
      error: null
    },
    items: {
      data: [],
      isLoading: false,
      isSyncing: false,
      lastSync: null,
      syncStatus: null,
      error: null
    }
  },
  square: {
    connectionStatus: null,
    catalog: [],
    invoices: [],
    payments: [],
    orders: [],
    customers: [],
    locations: [],
    mappings: [],
    webhookEvents: [],
    webhookEventsMeta: {
      total: 0,
      limit: 20,
      offset: 0
    },
    loading: {
      connectionStatus: false,
      allData: false,
      catalog: false,
      locations: false,
      mappings: false,
      webhookEvents: false,
      disconnect: false
    },
    error: null,
    items: {
      data: [],
      isLoading: false,
      isSyncing: false,
      lastSync: null,
      syncStatus: null,
      error: null
    }
  }
};

// QuickBooks async thunks
export const initiateQBConnection = createAsyncThunk('integrations/qb/connect', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.getAuthUrl(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to get authorization URL');
  }
});

export const processQBCallback = createAsyncThunk(
  'integrations/qb/callback',
  async (params: { code: string; realmId: string; state: string; companyId: string }, { rejectWithValue }) => {
    try {
      const response = await qbApi.processCallback(params.code, params.realmId, params.state, params.companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process callback');
    }
  }
);

export const fetchQBConnectionStatus = createAsyncThunk('integrations/qb/status', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.getConnectionStatus(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch connection status');
  }
});

export const refreshQBToken = createAsyncThunk('integrations/qb/refresh', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.refreshToken(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to refresh token');
  }
});

export const revokeQBConnection = createAsyncThunk('integrations/qb/revoke', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.revokeConnection(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to revoke connection');
  }
});

export const fetchChartOfAccounts = createAsyncThunk('integrations/qb/fetchAccounts', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.fetchChartOfAccounts(companyId);

    const accounts: ChartOfAccount[] = response.accounts.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      subType: acc.subType || '',
      fullyQualifiedName: acc.fullyQualifiedName,
      active: acc.active
    }));

    return { accounts, mappings: response.mappings || {} };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch Chart of Accounts');
  }
});

export const fetchItems = createAsyncThunk('integrations/qb/fetchItems', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.fetchItems(companyId);
    const items: Item[] = response.Items.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      subType: item.subType || '',
      fullyQualifiedName: item.fullyQualifiedName,
      active: item.active
    }));

    return { items };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch Items');
  }
});

export const saveAccountMappingsToBackend = createAsyncThunk(
  'integrations/qb/saveAccountMappings',
  async ({ companyId, mappings }: { companyId: string; mappings: Record<string, string> }, { rejectWithValue }) => {
    try {
      await qbApi.updateAccountMappings(companyId, mappings);
      return mappings;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to save account mappings');
    }
  }
);

export const fetchWebhookEvents = createAsyncThunk(
  'integrations/qb/fetchWebhookEvents',
  async (
    { companyId, params }: { companyId: string; params?: { status?: string; limit?: number; offset?: number } },
    { rejectWithValue }
  ) => {
    try {
      const response = await qbApi.getWebhookEvents(companyId, params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch webhook events');
    }
  }
);

export const retryWebhookEvent = createAsyncThunk('integrations/qb/retryWebhookEvent', async (eventId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.retryWebhookEvent(eventId);
    return { eventId, ...response };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to retry webhook event');
  }
});

export const fetchQBSyncHistory = createAsyncThunk(
  'integrations/qb/fetchSyncHistory',
  async ({ companyId, params }: { companyId: string; params?: { entity_type?: string; limit?: number } }, { rejectWithValue }) => {
    try {
      const response = await qbApi.getSyncHistory(companyId, params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch sync history');
    }
  }
);

export const triggerItemSync = createAsyncThunk('integrations/qb/triggerItemSync', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.triggerItemSync(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to trigger item sync');
  }
});

export const fetchItemsList = createAsyncThunk('integrations/qb/fetchItemsList', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await qbApi.getItemsList(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch items list');
  }
});

export const fetchItemSyncStatus = createAsyncThunk(
  'integrations/qb/fetchItemSyncStatus',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await qbApi.getItemSyncStatus(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch item sync status');
    }
  }
);

// Square async thunks
export const fetchSquareAuthUrl = createAsyncThunk('integrations/square/fetchAuthUrl', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await getSquareAuthUrl(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to get Square auth URL');
  }
});

export const processSquareCallback = createAsyncThunk(
  'integrations/square/processCallback',
  async (params: { code: string; state: string; companyId: string }, { rejectWithValue }) => {
    try {
      const response = await processSquareCallbackAPI({ code: params.code, state: params.state, company_id: params.companyId });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process Square callback');
    }
  }
);

export const fetchSquareConnectionStatus = createAsyncThunk(
  'integrations/square/fetchConnectionStatus',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await getSquareConnectionStatus(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch Square connection status');
    }
  }
);

export const disconnectSquare = createAsyncThunk('integrations/square/disconnect', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await disconnectSquareAPI(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to disconnect Square');
  }
});

export const fetchSquareAllData = createAsyncThunk('integrations/square/fetchAllData', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await fetchSquareAllDataAPI(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch all Square data');
  }
});

export const fetchSquareCatalog = createAsyncThunk('integrations/square/fetchCatalog', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await fetchSquareCatalogAPI(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch Square catalog');
  }
});

export const fetchSquareLocations = createAsyncThunk(
  'integrations/square/fetchLocations',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await fetchSquareLocationsAPI(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch Square locations');
    }
  }
);

export const fetchSquareMappings = createAsyncThunk('integrations/square/fetchMappings', async (companyId: string, { rejectWithValue }) => {
  try {
    const response = await getSquareMappings(companyId);
    return response;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch Square mappings');
  }
});

export const saveSquareMappings = createAsyncThunk(
  'integrations/square/saveMappings',
  async ({ companyId, mappings }: { companyId: string; mappings: SquareAccountMapping[] }, { rejectWithValue }) => {
    try {
      const response = await saveSquareMappingsAPI(companyId, mappings);
      return mappings; // Return the mappings instead of response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save Square mappings');
    }
  }
);

export const fetchSquareWebhookEvents = createAsyncThunk(
  'integrations/square/fetchWebhookEvents',
  async (
    { companyId, status, limit, offset }: { companyId: string; status?: string; limit?: number; offset?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await getSquareWebhookEvents(companyId, status, limit, offset);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch Square webhook events');
    }
  }
);

const integrationsSlice = createSlice({
  name: 'integrations',
  initialState,
  reducers: {
    updateConnectionFromCompany: (state, action: PayloadAction<Company>) => {
      const company = action.payload;
      state.quickbooks.connection = {
        status: company.is_connected_to_quickbooks ? (company.is_qb_access_token_valid ? 'connected' : 'expired') : 'disconnected',
        companyId: company.id,
        realmId: company.qb_realm_id,
        lastAuth: company.qb_last_auth,
        tokenExpiresIn: 0,
        accessTokenValid: company.is_qb_access_token_valid,
        refreshTokenValid: company.is_qb_refresh_token_valid
      };
    },
    saveAccountMapping: (state, action: PayloadAction<Record<string, string>>) => {
      state.quickbooks.mapping.mappedCategories = action.payload;
      localStorage.setItem('qb_account_mapping', JSON.stringify(action.payload));
    },
    loadAccountMapping: (state) => {
      const savedMapping = localStorage.getItem('qb_account_mapping');
      if (savedMapping) {
        state.quickbooks.mapping.mappedCategories = JSON.parse(savedMapping);
      }
    },
    setMappingsLoaded: (state, action: PayloadAction<any[]>) => {
      // If mappings exist, set them and mark as fetched
      if (action.payload && action.payload.length > 0) {
        // Convert AccountMapping objects to the format expected by AccountMapper
        const accounts = action.payload.map((mapping: any) => ({
          id: mapping.qb_account_id,
          name: mapping.qb_account_name,
          fullyQualifiedName: mapping.qb_fully_qualified_name || mapping.qb_account_name,
          type: mapping.qb_account_type,
          subType: mapping.qb_account_subtype || '',
          active: mapping.qb_active !== false
        }));

        state.quickbooks.mapping.accounts = accounts;
        state.quickbooks.mapping.lastFetched = new Date().toISOString();

        // Convert to mapped categories format
        const mappedCategories: Record<string, string> = {};
        action.payload.forEach((mapping: any) => {
          mappedCategories[mapping.qb_account_id] = mapping.internal_category;
        });
        state.quickbooks.mapping.mappedCategories = mappedCategories;
      }
    },
    addSyncHistoryEntry: (
      state,
      action: PayloadAction<{ status: 'success' | 'failed' | 'pending'; message: string; recordsProcessed?: number }>
    ) => {
      state.quickbooks.syncHistory.unshift({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...action.payload
      });
      if (state.quickbooks.syncHistory.length > 10) {
        state.quickbooks.syncHistory = state.quickbooks.syncHistory.slice(0, 10);
      }
    },
    clearError: (state) => {
      state.quickbooks.ui.error = null;
      state.square.error = null;
    },
    clearSquareError: (state) => {
      state.square.error = null;
    }
  },
  extraReducers: (builder) => {
    // QuickBooks reducers
    builder
      .addCase(initiateQBConnection.pending, (state) => {
        state.quickbooks.ui.isConnecting = true;
        state.quickbooks.ui.error = null;
      })
      .addCase(initiateQBConnection.fulfilled, (state) => {
        state.quickbooks.ui.isConnecting = false;
      })
      .addCase(initiateQBConnection.rejected, (state, action) => {
        state.quickbooks.ui.isConnecting = false;
        state.quickbooks.ui.error = action.payload as string;
      })
      .addCase(processQBCallback.pending, (state) => {
        state.quickbooks.ui.isConnecting = true;
        state.quickbooks.ui.error = null;
      })
      .addCase(processQBCallback.fulfilled, (state) => {
        state.quickbooks.ui.isConnecting = false;
        state.quickbooks.connection.status = 'connected';
      })
      .addCase(processQBCallback.rejected, (state, action) => {
        state.quickbooks.ui.isConnecting = false;
        state.quickbooks.ui.error = action.payload as string;
      })
      .addCase(fetchQBConnectionStatus.fulfilled, (state, action) => {
        const status = action.payload;
        state.quickbooks.connection = {
          status: status.is_connected ? (status.access_token_valid ? 'connected' : 'expired') : 'disconnected',
          companyId: status.company_id,
          realmId: status.realm_id,
          lastAuth: status.connected_at || status.last_auth || null, // Use connected_at, fallback to last_auth
          tokenExpiresIn: status.token_expires_in || 0,
          accessTokenValid: status.access_token_valid,
          refreshTokenValid: status.refresh_token_valid,
          hasAccountMappings: status.has_account_mappings
        };
      })
      .addCase(refreshQBToken.pending, (state) => {
        state.quickbooks.ui.isRefreshing = true;
        state.quickbooks.connection.status = 'refreshing';
      })
      .addCase(refreshQBToken.fulfilled, (state) => {
        state.quickbooks.ui.isRefreshing = false;
        state.quickbooks.connection.status = 'connected';
        state.quickbooks.connection.accessTokenValid = true;
      })
      .addCase(refreshQBToken.rejected, (state, action) => {
        state.quickbooks.ui.isRefreshing = false;
        state.quickbooks.connection.status = 'expired';
        state.quickbooks.ui.error = action.payload as string;
      })
      .addCase(revokeQBConnection.fulfilled, (state) => {
        state.quickbooks.connection = {
          status: 'disconnected',
          companyId: null,
          realmId: null,
          lastAuth: null,
          tokenExpiresIn: 0,
          accessTokenValid: false,
          refreshTokenValid: false
        };
        state.quickbooks.mapping.mappedCategories = {};
        localStorage.removeItem('qb_account_mapping');
      })
      .addCase(fetchChartOfAccounts.pending, (state) => {
        state.quickbooks.ui.isFetchingAccounts = true;
      })
      .addCase(fetchChartOfAccounts.fulfilled, (state, action) => {
        state.quickbooks.ui.isFetchingAccounts = false;
        state.quickbooks.mapping.accounts = action.payload.accounts;
        state.quickbooks.mapping.mappedCategories = action.payload.mappings;
        state.quickbooks.mapping.lastFetched = new Date().toISOString();
        // After fetching accounts, we now have mappings
        state.quickbooks.connection.hasAccountMappings = true;
      })
      .addCase(fetchChartOfAccounts.rejected, (state, action) => {
        state.quickbooks.ui.isFetchingAccounts = false;
        state.quickbooks.ui.error = action.payload as string;
      })
      .addCase(saveAccountMappingsToBackend.fulfilled, (state, action) => {
        state.quickbooks.mapping.mappedCategories = action.payload;
      })
      .addCase(saveAccountMappingsToBackend.rejected, (state, action) => {
        state.quickbooks.ui.error = action.payload as string;
      })
      .addCase(fetchWebhookEvents.pending, (state) => {
        state.quickbooks.webhooks.isLoading = true;
        state.quickbooks.webhooks.error = null;
      })
      .addCase(fetchWebhookEvents.fulfilled, (state, action) => {
        state.quickbooks.webhooks.isLoading = false;
        state.quickbooks.webhooks.events = action.payload.results || [];
        state.quickbooks.webhooks.totalCount = action.payload.total || 0;
      })
      .addCase(fetchWebhookEvents.rejected, (state, action) => {
        state.quickbooks.webhooks.isLoading = false;
        state.quickbooks.webhooks.error = action.payload as string;
      })
      .addCase(retryWebhookEvent.fulfilled, (state, action) => {
        const eventId = action.payload.eventId;
        const eventIndex = state.quickbooks.webhooks.events.findIndex((e) => e.id === eventId);
        if (eventIndex !== -1) {
          state.quickbooks.webhooks.events[eventIndex].status = 'received';
          state.quickbooks.webhooks.events[eventIndex].retry_count += 1;
        }
      })
      .addCase(retryWebhookEvent.rejected, (state, action) => {
        state.quickbooks.webhooks.error = action.payload as string;
      })
      .addCase(fetchQBSyncHistory.pending, (state) => {
        state.quickbooks.qbSync.isLoading = true;
        state.quickbooks.qbSync.error = null;
      })
      .addCase(fetchQBSyncHistory.fulfilled, (state, action) => {
        state.quickbooks.qbSync.isLoading = false;
        state.quickbooks.qbSync.records = action.payload;
      })
      .addCase(fetchQBSyncHistory.rejected, (state, action) => {
        state.quickbooks.qbSync.isLoading = false;
        state.quickbooks.qbSync.error = action.payload as string;
      })
      .addCase(triggerItemSync.pending, (state) => {
        state.quickbooks.items.isSyncing = true;
        state.quickbooks.items.error = null;
      })
      .addCase(triggerItemSync.fulfilled, (state, action) => {
        state.quickbooks.items.isSyncing = false;
        state.quickbooks.items.lastSync = new Date().toISOString();
        if (action.payload.sync_status) {
          state.quickbooks.items.syncStatus = {
            timestamp: new Date().toLocaleString(),
            created: action.payload.sync_status.created || 0,
            updated: action.payload.sync_status.updated || 0
          };
        }
      })
      .addCase(triggerItemSync.rejected, (state, action) => {
        state.quickbooks.items.isSyncing = false;
        state.quickbooks.items.error = action.payload as string;
      })
      .addCase(fetchItemsList.pending, (state) => {
        state.quickbooks.items.isLoading = true;
        state.quickbooks.items.error = null;
      })
      .addCase(fetchItemsList.fulfilled, (state, action) => {
        state.quickbooks.items.isLoading = false;
        state.quickbooks.items.data = action.payload.items || [];
      })
      .addCase(fetchItemsList.rejected, (state, action) => {
        state.quickbooks.items.isLoading = false;
        state.quickbooks.items.error = action.payload as string;
      })
      .addCase(fetchItemSyncStatus.fulfilled, (state, action) => {
        if (action.payload.status) {
          state.quickbooks.items.syncStatus = action.payload.status;
        }
      });

    // Square reducers
    builder
      .addCase(fetchSquareConnectionStatus.pending, (state) => {
        state.square.loading.connectionStatus = true;
        state.square.error = null;
      })
      .addCase(fetchSquareConnectionStatus.fulfilled, (state, action) => {
        state.square.loading.connectionStatus = false;
        state.square.connectionStatus = action.payload;
      })
      .addCase(fetchSquareConnectionStatus.rejected, (state, action) => {
        state.square.loading.connectionStatus = false;
        state.square.error = action.payload as string;
      })
      .addCase(disconnectSquare.pending, (state) => {
        state.square.loading.disconnect = true;
        state.square.error = null;
      })
      .addCase(disconnectSquare.fulfilled, (state) => {
        state.square.loading.disconnect = false;
        state.square.connectionStatus = null;
        state.square.catalog = [];
        state.square.invoices = [];
        state.square.payments = [];
        state.square.orders = [];
        state.square.customers = [];
        state.square.locations = [];
        state.square.mappings = [];
        state.square.webhookEvents = [];
      })
      .addCase(disconnectSquare.rejected, (state, action) => {
        state.square.loading.disconnect = false;
        state.square.error = action.payload as string;
      })
      .addCase(fetchSquareAllData.pending, (state) => {
        state.square.loading.allData = true;
        state.square.error = null;
      })
      .addCase(fetchSquareAllData.fulfilled, (state, action) => {
        state.square.loading.allData = false;
        state.square.catalog = action.payload.catalog;
        state.square.invoices = action.payload.invoices;
        state.square.payments = action.payload.payments;
        state.square.orders = action.payload.orders;
        state.square.customers = action.payload.customers;
      })
      .addCase(fetchSquareAllData.rejected, (state, action) => {
        state.square.loading.allData = false;
        state.square.error = action.payload as string;
      })
      .addCase(fetchSquareCatalog.pending, (state) => {
        state.square.loading.catalog = true;
        state.square.error = null;
      })
      .addCase(fetchSquareCatalog.fulfilled, (state, action) => {
        state.square.loading.catalog = false;
        state.square.catalog = action.payload;
      })
      .addCase(fetchSquareCatalog.rejected, (state, action) => {
        state.square.loading.catalog = false;
        state.square.error = action.payload as string;
      })
      .addCase(fetchSquareLocations.pending, (state) => {
        state.square.loading.locations = true;
        state.square.error = null;
      })
      .addCase(fetchSquareLocations.fulfilled, (state, action) => {
        state.square.loading.locations = false;
        state.square.locations = action.payload;
      })
      .addCase(fetchSquareLocations.rejected, (state, action) => {
        state.square.loading.locations = false;
        state.square.error = action.payload as string;
      })
      .addCase(fetchSquareMappings.pending, (state) => {
        state.square.loading.mappings = true;
        state.square.error = null;
      })
      .addCase(fetchSquareMappings.fulfilled, (state, action) => {
        state.square.loading.mappings = false;
        state.square.mappings = action.payload;
      })
      .addCase(fetchSquareMappings.rejected, (state, action) => {
        state.square.loading.mappings = false;
        state.square.error = action.payload as string;
      })
      .addCase(saveSquareMappings.fulfilled, (state, action) => {
        state.square.mappings = action.payload;
      })
      .addCase(saveSquareMappings.rejected, (state, action) => {
        state.square.error = action.payload as string;
      })
      .addCase(fetchSquareWebhookEvents.pending, (state) => {
        state.square.loading.webhookEvents = true;
        state.square.error = null;
      })
      .addCase(fetchSquareWebhookEvents.fulfilled, (state, action) => {
        state.square.loading.webhookEvents = false;
        state.square.webhookEvents = action.payload.results || [];
        state.square.webhookEventsMeta = {
          total: action.payload.total || 0,
          limit: action.payload.limit || 20,
          offset: action.payload.offset || 0
        };
      })
      .addCase(fetchSquareWebhookEvents.rejected, (state, action) => {
        state.square.loading.webhookEvents = false;
        state.square.error = action.payload as string;
      });
  }
});

export const {
  updateConnectionFromCompany,
  saveAccountMapping,
  loadAccountMapping,
  setMappingsLoaded,
  addSyncHistoryEntry,
  clearError,
  clearSquareError
} = integrationsSlice.actions;

export default integrationsSlice.reducer;
