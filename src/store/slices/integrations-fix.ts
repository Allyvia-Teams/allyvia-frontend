// Add this new thunk to integrations.ts

// Fetch existing account mappings from backend on page load
export const fetchAccountMappingsFromBackend = createAsyncThunk(
  'integrations/fetchAccountMappingsFromBackend',
  async (companyId: string) => {
    try {
      const mappings = await qbApi.getAccountMappings(companyId);
      return {
        mappings: mappings,
        hasMappings: mappings && mappings.length > 0
      };
    } catch (error) {
      // If 404 or no mappings, that's ok - means we need to fetch from QB
      return {
        mappings: [],
        hasMappings: false
      };
    }
  }
);

// Add to your reducers:
extraReducers: (builder) => {
  // ... existing reducers ...

  // Handle fetching existing mappings from backend
  builder
    .addCase(fetchAccountMappingsFromBackend.pending, (state) => {
      state.quickbooks.ui.isLoadingMappings = true;
    })
    .addCase(fetchAccountMappingsFromBackend.fulfilled, (state, action) => {
      state.quickbooks.ui.isLoadingMappings = false;
      if (action.payload.hasMappings) {
        // Mappings exist in backend
        state.quickbooks.mapping.accounts = action.payload.mappings;
        state.quickbooks.mapping.lastFetched = new Date().toISOString();
        state.quickbooks.mapping.hasSavedMappings = true;

        // Convert to the format expected by the component
        const mappedCategories: Record<string, string> = {};
        action.payload.mappings.forEach((mapping: any) => {
          mappedCategories[mapping.qb_account_id] = mapping.internal_category;
        });
        state.quickbooks.mapping.mappedCategories = mappedCategories;
      } else {
        // No mappings yet - user needs to fetch from QB
        state.quickbooks.mapping.hasSavedMappings = false;
      }
    })
    .addCase(fetchAccountMappingsFromBackend.rejected, (state) => {
      state.quickbooks.ui.isLoadingMappings = false;
      state.quickbooks.mapping.hasSavedMappings = false;
    });
};
