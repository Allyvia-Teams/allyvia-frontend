import axiosServices from 'utils/axios';

const SUBSCRIPTION_BASE_URL = 'subscription';

export interface PlanData {
  priceId: string;
  planName: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface SubscriptionStatusPayload {
  planName: string;
  priceId: string;
  interval: 'monthly' | 'annual';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

const subscriptionAPI = {
  createCheckoutSession: async (planData: PlanData) => {
    const priceId = String(planData.priceId ?? '').trim();
    const planName = String(planData.planName ?? '').trim();
    if (!priceId) {
      throw new Error('Price ID is missing. Check Stripe price configuration or rebuild with valid VITE_STRIPE_PRICE_* variables.');
    }
    // Send camelCase + snake_case and explicit JSON so proxies/parsers never drop the field; undefined extras are omitted by axios JSON transform.
    const body: Record<string, string> = {
      priceId,
      price_id: priceId,
      planName,
      plan_name: planName
    };
    if (planData.successUrl) {
      body.successUrl = planData.successUrl;
      body.success_url = planData.successUrl;
    }
    if (planData.cancelUrl) {
      body.cancelUrl = planData.cancelUrl;
      body.cancel_url = planData.cancelUrl;
    }
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/create-checkout-session/`, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },
  checkSubscription: async (): Promise<SubscriptionStatusPayload> => {
    // Mock mode has no subscription backend — report an active plan so the
    // app is reachable behind the AuthGuard's subscription gate.
    if (import.meta.env.VITE_USE_MOCK_API === 'true') {
      return {
        planName: 'Pro Plan',
        priceId: 'mock_price_pro',
        interval: 'monthly',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEnd: null
      };
    }
    const response = await axiosServices.get(`${SUBSCRIPTION_BASE_URL}/status/`);
    return response.data;
  },
  /**
   * Reconcile the user from Stripe Checkout (same as webhook) using session_id from the success URL.
   * Call this on /checkout/success when polling status alone is not enough (e.g. delayed webhooks).
   */
  verifyCheckoutSession: async (sessionId: string): Promise<SubscriptionStatusPayload> => {
    const response = await axiosServices.post(
      `${SUBSCRIPTION_BASE_URL}/verify-checkout-session/`,
      { sessionId, session_id: sessionId },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  },
  cancelSubscription: async () => {
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/cancel/`);
    return response.data;
  },
  reactivateSubscription: async () => {
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/reactivate/`);
    return response.data;
  },
  changePlan: async (newPriceId: string) => {
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/change-plan/`, { newPriceId });
    return response.data;
  },
  upgradeSubscription: async (plan_key: string, billing_cycle?: string) => {
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/upgrade/`, {
      plan_key,
      billing_cycle: billing_cycle ?? '12'
    });
    return response.data;
  },
  downgradeSubscription: async (plan_key: string) => {
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/downgrade/`, { plan_key });
    return response.data;
  }
};

export default {
  ...subscriptionAPI
};
