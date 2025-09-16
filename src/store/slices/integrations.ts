import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  getSquareAuthUrl, 
  processSquareCallback, 
  getSquareConnectionStatus, 
  disconnectSquare,
  fetchSquareCatalog,
  fetchSquareLocations,
  getSquareMappings,
  saveSquareMappings,
  getSquareWebhookEvents
} from 'api/square';
import { 
  SquareConnectionStatus, 
  SquareCatalogItem, 
  SquareLocation, 
  SquareAccountMapping, 
  SquareWebhookEvent,
  SquareWebhookEventList
} from 'types/entities';

interface IntegrationsState {
  square: {
    connectionStatus: SquareConnectionStatus | null;
    catalog: SquareCatalogItem[];
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
      catalog: boolean;
      locations: boolean;
      mappings: boolean;
      webhookEvents: boolean;
      disconnect: boolean;
    };
    error: string | null;
  };
}

const initialState: IntegrationsState = {
  square: {
    connectionStatus: null,
    catalog: [],
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
      catalog: false,
      locations: false,
      mappings: false,
      webhookEvents: false,
      disconnect: false
    },
    error: null
  }
};

// Square Integration Thunks
export const fetchSquareConnectionStatus = createAsyncThunk(
  'integrations/square/fetchConnectionStatus',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await getSquareConnectionStatus(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch connection status');
    }
  }
);

export const processSquareCallback = createAsyncThunk(
  'integrations/square/processCallback',
  async (data: { code: string; state: string; company_id: string }, { rejectWithValue }) => {
    try {
      const response = await processSquareCallback(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process callback');
    }
  }
);

export const disconnectSquare = createAsyncThunk(
  'integrations/square/disconnect',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await disconnectSquare(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to disconnect');
    }
  }
);

export const fetchSquareCatalog = createAsyncThunk(
  'integrations/square/fetchCatalog',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await fetchSquareCatalog(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch catalog');
    }
  }
);

export const fetchSquareLocations = createAsyncThunk(
  'integrations/square/fetchLocations',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await fetchSquareLocations(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch locations');
    }
  }
);

export const fetchSquareMappings = createAsyncThunk(
  'integrations/square/fetchMappings',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await getSquareMappings(companyId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch mappings');
    }
  }
);

export const saveSquareMappings = createAsyncThunk(
  'integrations/square/saveMappings',
  async ({ companyId, mappings }: { companyId: string; mappings: SquareAccountMapping[] }, { rejectWithValue }) => {
    try {
      const response = await saveSquareMappings(companyId, mappings);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save mappings');
    }
  }
);

export const fetchSquareWebhookEvents = createAsyncThunk(
  'integrations/square/fetchWebhookEvents',
  async ({ 
    companyId, 
    status, 
    limit = 20, 
    offset = 0 
  }: { 
    companyId: string; 
    status?: string; 
    limit?: number; 
    offset?: number; 
  }, { rejectWithValue }) => {
    try {
      const response = await getSquareWebhookEvents(companyId, status, limit, offset);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch webhook events');
    }
  }
);

const integrationsSlice = createSlice({
  name: 'integrations',
  initialState,
  reducers: {
    clearSquareError: (state) => {
      state.square.error = null;
    },
    clearSquareData: (state) => {
      state.square.connectionStatus = null;
      state.square.catalog = [];
      state.square.locations = [];
      state.square.mappings = [];
      state.square.webhookEvents = [];
      state.square.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch Square Connection Status
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
      });

    // Process Square Callback
    builder
      .addCase(processSquareCallback.pending, (state) => {
        state.square.loading.connectionStatus = true;
        state.square.error = null;
      })
      .addCase(processSquareCallback.fulfilled, (state, action) => {
        state.square.loading.connectionStatus = false;
        // Refresh connection status after successful callback
      })
      .addCase(processSquareCallback.rejected, (state, action) => {
        state.square.loading.connectionStatus = false;
        state.square.error = action.payload as string;
      });

    // Disconnect Square
    builder
      .addCase(disconnectSquare.pending, (state) => {
        state.square.loading.disconnect = true;
        state.square.error = null;
      })
      .addCase(disconnectSquare.fulfilled, (state, action) => {
        state.square.loading.disconnect = false;
        // Clear all Square data on disconnect
        state.square.connectionStatus = null;
        state.square.catalog = [];
        state.square.locations = [];
        state.square.mappings = [];
        state.square.webhookEvents = [];
      })
      .addCase(disconnectSquare.rejected, (state, action) => {
        state.square.loading.disconnect = false;
        state.square.error = action.payload as string;
      });

    // Fetch Square Catalog
    builder
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
      });

    // Fetch Square Locations
    builder
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
      });

    // Fetch Square Mappings
    builder
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
      });

    // Save Square Mappings
    builder
      .addCase(saveSquareMappings.pending, (state) => {
        state.square.loading.mappings = true;
        state.square.error = null;
      })
      .addCase(saveSquareMappings.fulfilled, (state, action) => {
        state.square.loading.mappings = false;
        // Refresh mappings after successful save
      })
      .addCase(saveSquareMappings.rejected, (state, action) => {
        state.square.loading.mappings = false;
        state.square.error = action.payload as string;
      });

    // Fetch Square Webhook Events
    builder
      .addCase(fetchSquareWebhookEvents.pending, (state) => {
        state.square.loading.webhookEvents = true;
        state.square.error = null;
      })
      .addCase(fetchSquareWebhookEvents.fulfilled, (state, action) => {
        state.square.loading.webhookEvents = false;
        state.square.webhookEvents = action.payload.results;
        state.square.webhookEventsMeta = {
          total: action.payload.total,
          limit: action.payload.limit,
          offset: action.payload.offset
        };
      })
      .addCase(fetchSquareWebhookEvents.rejected, (state, action) => {
        state.square.loading.webhookEvents = false;
        state.square.error = action.payload as string;
      });
  }
});

export const { clearSquareError, clearSquareData } = integrationsSlice.actions;
export default integrationsSlice.reducer;
