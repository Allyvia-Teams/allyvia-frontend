import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { subscriptionAPI } from 'api/subscription.api';
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  SubscriptionStatusResponse,
  UpdateSubscriptionRequest
} from 'types/subscription';

// ==============================|| SUBSCRIPTION TYPES ||============================== //

interface SubscriptionState {
  // Status
  status: SubscriptionStatusResponse | null;
  statusLoading: boolean;
  statusError: string | null;

  // Checkout Session
  checkoutSession: CreateCheckoutSessionResponse | null;
  checkoutLoading: boolean;
  checkoutError: string | null;

  // Cancel Subscription
  cancelLoading: boolean;
  cancelError: string | null;
  cancelSuccess: boolean;

  // Update Subscription
  updateLoading: boolean;
  updateError: string | null;
  updateSuccess: boolean;
}

const initialState: SubscriptionState = {
  status: null,
  statusLoading: false,
  statusError: null,
  checkoutSession: null,
  checkoutLoading: false,
  checkoutError: null,
  cancelLoading: false,
  cancelError: null,
  cancelSuccess: false,
  updateLoading: false,
  updateError: null,
  updateSuccess: false
};

// ==============================|| ASYNC THUNKS ||============================== //

/**
 * Fetch Subscription Status
 * GET /api/v1/subscription/status/
 */
export const fetchSubscriptionStatus = createAsyncThunk('subscription/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    const response = await subscriptionAPI.getSubscriptionStatus();
    return response;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to fetch subscription status';
    return rejectWithValue(errorMessage);
  }
});

/**
 * Create Checkout Session
 * POST /api/v1/subscription/create-checkout-session/
 */
export const createCheckoutSession = createAsyncThunk(
  'subscription/createCheckoutSession',
  async (data: CreateCheckoutSessionRequest, { rejectWithValue }) => {
    try {
      const response = await subscriptionAPI.createCheckoutSession(data);
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to create checkout session';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Cancel Subscription
 * POST /api/v1/subscription/cancel/
 */
export const cancelSubscription = createAsyncThunk('subscription/cancel', async (_, { rejectWithValue, dispatch }) => {
  try {
    const response = await subscriptionAPI.cancelSubscription();
    // Refresh status after cancellation
    dispatch(fetchSubscriptionStatus());
    return response;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to cancel subscription';
    return rejectWithValue(errorMessage);
  }
});

/**
 * Update Subscription
 * POST /api/v1/subscription/update/
 */
export const updateSubscription = createAsyncThunk(
  'subscription/update',
  async (data: UpdateSubscriptionRequest, { rejectWithValue, dispatch }) => {
    try {
      const response = await subscriptionAPI.updateSubscription(data);
      // Refresh status after update
      dispatch(fetchSubscriptionStatus());
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to update subscription';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Test Subscribe (Development Only)
 * GET /api/v1/subscription/test/
 */
export const testSubscribe = createAsyncThunk('subscription/testSubscribe', async (_, { rejectWithValue, dispatch }) => {
  try {
    const response = await subscriptionAPI.testSubscribe();
    // Refresh status after test subscription
    dispatch(fetchSubscriptionStatus());
    return response;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to test subscribe';
    return rejectWithValue(errorMessage);
  }
});

// ==============================|| SUBSCRIPTION SLICE ||============================== //

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearCheckoutSession: (state) => {
      state.checkoutSession = null;
      state.checkoutError = null;
    },
    clearCancelSuccess: (state) => {
      state.cancelSuccess = false;
      state.cancelError = null;
    },
    clearUpdateSuccess: (state) => {
      state.updateSuccess = false;
      state.updateError = null;
    },
    /**
     * Update subscription status from permissions response
     * Used to sync subscription status with permissions API response
     * Note: company no longer includes available_modules (fetched separately via /api/v1/role/available-modules/)
     */
    updateSubscriptionStatusFromPermissions: (
      state,
      action: PayloadAction<{
        company: {
          id: string;
          name: string;
          subscription_id?: string | null;
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | null;
          subscription_plan?: string | null;
          trial_end_date?: string | null;
        };
      }>
    ) => {
      if (action.payload.company) {
        const company = action.payload.company;

        // If subscription status doesn't exist, create it from company data
        if (!state.status) {
          // Create subscription status object from company data
          const hasSubscription = company.subscription_id && company.subscription_status;
          const isActive = company.subscription_status === 'active' || company.subscription_status === 'trialing';

          state.status = {
            status: hasSubscription && isActive ? 'Active' : 'Inactive',
            subscription_id: company.subscription_id || null,
            subscription_status: company.subscription_status || null,
            subscription_plan: company.subscription_plan || null,
            trial_end_date: company.trial_end_date || null,
            company_id: company.id
          };
          console.log('[updateSubscriptionStatusFromPermissions] Created subscription status from company data:', state.status);
        } else {
          // Update existing subscription status with company data
          state.status = {
            ...state.status,
            subscription_id: company.subscription_id || state.status.subscription_id,
            subscription_status: company.subscription_status || state.status.subscription_status,
            subscription_plan: company.subscription_plan || state.status.subscription_plan,
            trial_end_date: company.trial_end_date || state.status.trial_end_date,
            status: company.subscription_status === 'active' || company.subscription_status === 'trialing' ? 'Active' : 'Inactive',
            company_id: company.id || state.status.company_id
          };
          console.log('[updateSubscriptionStatusFromPermissions] Updated subscription status from company data:', state.status);
        }
      }
    },
    resetSubscriptionState: (state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    // Fetch Status
    builder
      .addCase(fetchSubscriptionStatus.pending, (state) => {
        state.statusLoading = true;
        state.statusError = null;
      })
      .addCase(fetchSubscriptionStatus.fulfilled, (state, action: PayloadAction<SubscriptionStatusResponse>) => {
        state.statusLoading = false;
        state.status = action.payload;
        state.statusError = null;
      })
      .addCase(fetchSubscriptionStatus.rejected, (state, action) => {
        state.statusLoading = false;
        state.statusError = (action.payload as string) || 'Failed to fetch subscription status';
      });

    // Create Checkout Session
    builder
      .addCase(createCheckoutSession.pending, (state) => {
        state.checkoutLoading = true;
        state.checkoutError = null;
      })
      .addCase(createCheckoutSession.fulfilled, (state, action: PayloadAction<CreateCheckoutSessionResponse>) => {
        state.checkoutLoading = false;
        state.checkoutSession = action.payload;
        state.checkoutError = null;
      })
      .addCase(createCheckoutSession.rejected, (state, action) => {
        state.checkoutLoading = false;
        state.checkoutError = (action.payload as string) || 'Failed to create checkout session';
      });

    // Cancel Subscription
    builder
      .addCase(cancelSubscription.pending, (state) => {
        state.cancelLoading = true;
        state.cancelError = null;
        state.cancelSuccess = false;
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        state.cancelLoading = false;
        state.cancelSuccess = true;
        state.cancelError = null;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.cancelLoading = false;
        state.cancelError = (action.payload as string) || 'Failed to cancel subscription';
        state.cancelSuccess = false;
      });

    // Update Subscription
    builder
      .addCase(updateSubscription.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
        state.updateSuccess = false;
      })
      .addCase(updateSubscription.fulfilled, (state) => {
        state.updateLoading = false;
        state.updateSuccess = true;
        state.updateError = null;
      })
      .addCase(updateSubscription.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = (action.payload as string) || 'Failed to update subscription';
        state.updateSuccess = false;
      });

    // Test Subscribe
    builder.addCase(testSubscribe.pending, (state) => {
      state.statusLoading = true;
      state.statusError = null;
    });
    // Test subscribe doesn't need separate state, it just triggers status refresh
  }
});

export const {
  clearCheckoutSession,
  clearCancelSuccess,
  clearUpdateSuccess,
  updateSubscriptionStatusFromPermissions,
  resetSubscriptionState
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
