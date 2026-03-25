import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import subscriptionAPI, { SubscriptionStatusPayload } from 'api/subscription.api';

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

export interface InactiveSubscriptionResponse {
  status: 'Inactive';
  message?: string;
  subscription_plan?: string;
  plan_key?: string;
}

export interface ActiveSubscriptionResponse extends SubscriptionStatusPayload {
  status: 'Active' | 'Inactive';
  subscription_id: string;
  subscription_plan: string;
  plan_key?: string;
  display_status?: 'Active' | 'Trialing' | 'Past Due' | 'Canceled';
  price?: number;
  billing_interval?: 'monthly' | 'yearly';
  renewal_date?: number;
  cancel_at?: number;
  cancel_at_period_end?: boolean;
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

export const cancelSubscription = createAsyncThunk('subscription/cancelSubscription', async () => {
  const response = await subscriptionAPI.cancelSubscription();
  return response as { success: boolean; message?: string; cancel_at?: number };
});

export const upgradeSubscription = createAsyncThunk(
  'subscription/upgradeSubscription',
  async (args: { plan_key: string; billing_cycle?: string }) => {
    const response = await subscriptionAPI.upgradeSubscription(args.plan_key, args.billing_cycle);
    return response as { success: boolean; checkout_url?: string; session_id?: string };
  }
);

export const downgradeSubscription = createAsyncThunk(
  'subscription/downgradeSubscription',
  async (plan_key: string) => {
    const response = await subscriptionAPI.downgradeSubscription(plan_key);
    return response as { success: boolean; message?: string; effective_date?: number };
  }
);

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
        if (action.payload && 'subscription_id' in action.payload && action.payload.subscription_id) {
          state.subscriptionData = action.payload as ActiveSubscriptionResponse;
        } else {
          state.subscriptionData = action.payload as InactiveSubscriptionResponse;
        }
        state.error = null;
      })
      .addCase(checkSubscription.rejected, (state, action) => {
        state.checkingSubscription = false;
        state.error = action.error.message || 'Failed to check subscription status';
        state.subscriptionStatus = null;
        state.subscriptionData = null;
      })
      .addCase(cancelSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload?.success && state.subscriptionData) {
          state.subscriptionData.cancel_at_period_end = true;
          state.subscriptionData.cancel_at = action.payload.cancel_at;
          state.subscriptionData.display_status = 'Active';
        }
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to cancel subscription';
      })
      .addCase(upgradeSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(upgradeSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload?.checkout_url) {
          state.checkoutUrl = action.payload.checkout_url;
          state.sessionId = action.payload.session_id ?? null;
        }
      })
      .addCase(upgradeSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to start upgrade';
      })
      .addCase(downgradeSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(downgradeSubscription.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(downgradeSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to schedule downgrade';
      });
  }
});

export const { clearError, setLoading, clearCheckoutData, clearSubscriptionData } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
