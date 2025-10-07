import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import subscriptionAPI from 'api/subscription.api';

export interface PlanData {
  billing_cycle: string;
  plan_name: string;
  price_id: string;
  trial_period_days: number;
}

export interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
}

// Define the subscription status response interfaces
export interface InactiveSubscriptionResponse {
  status: 'Inactive';
  message: string;
}

export interface ActiveSubscriptionResponse {
  status: 'Active' | 'Inactive';
  subscription_id: string;
  subscription_status: string;
  subscription_plan: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  trial_end_date: string | null;
  subscription_cancel_at: string | null;
}

export type SubscriptionStatusResponse = InactiveSubscriptionResponse | ActiveSubscriptionResponse;

interface SubscriptionState {
  loading: boolean;
  error: string | null;
  checkoutUrl: string | null;
  sessionId: string | null;
  // Add subscription status fields
  subscriptionStatus: 'Active' | 'Inactive' | null;
  subscriptionData: ActiveSubscriptionResponse | null;
  checkingSubscription: boolean;
}

const initialState: SubscriptionState = {
  loading: false,
  error: null,
  checkoutUrl: null,
  sessionId: null,
  subscriptionStatus: null,
  subscriptionData: null,
  checkingSubscription: false
};

export const createCheckoutSession = createAsyncThunk('subscription/createCheckoutSession', async (planData: PlanData) => {
  const response = await subscriptionAPI.createCheckoutSession(planData);
  return response as CheckoutResponse;
});

export const checkSubscription = createAsyncThunk('subscription/checkSubscription', async () => {
  const response = await subscriptionAPI.checkSubscription();
  return response as SubscriptionStatusResponse;
});

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearCheckoutData: (state) => {
      state.checkoutUrl = null;
      state.sessionId = null;
    },
    clearSubscriptionData: (state) => {
      state.subscriptionStatus = null;
      state.subscriptionData = null;
    }
  },
  extraReducers: (builder) => {
    // Create Checkout Session
    builder
      .addCase(createCheckoutSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCheckoutSession.fulfilled, (state, action) => {
        state.loading = false;
        state.checkoutUrl = action.payload.checkout_url;
        state.sessionId = action.payload.session_id;
        state.error = null;
      })
      .addCase(createCheckoutSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create checkout session';
      })
      // Check Subscription Status
      .addCase(checkSubscription.pending, (state) => {
        state.checkingSubscription = true;
        state.error = null;
      })
      .addCase(checkSubscription.fulfilled, (state, action) => {
        state.checkingSubscription = false;
        state.subscriptionStatus = action.payload.status;

        // If it's an active subscription response with additional data
        if (action.payload.status === 'Active' && 'subscription_id' in action.payload) {
          state.subscriptionData = action.payload as ActiveSubscriptionResponse;
        } else {
          state.subscriptionData = null;
        }

        state.error = null;
      })
      .addCase(checkSubscription.rejected, (state, action) => {
        state.checkingSubscription = false;
        state.error = action.error.message || 'Failed to check subscription status';
        state.subscriptionStatus = null;
        state.subscriptionData = null;
      });
  }
});

export const { clearError, setLoading, clearCheckoutData, clearSubscriptionData } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
