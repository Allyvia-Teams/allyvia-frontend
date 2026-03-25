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
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/create-checkout-session/`, planData);
    return response.data;
  },
  checkSubscription: async (): Promise<SubscriptionStatusPayload> => {
    const response = await axiosServices.get(`${SUBSCRIPTION_BASE_URL}/status/`);
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
