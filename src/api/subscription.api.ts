import axiosServices from 'utils/axios';

const SUBSCRIPTION_BASE_URL = 'subscription';

export interface PlanData {
  billing_cycle: string;
  plan_name: string;
  price_id: string;
  trial_period_days: number;
}

export interface SubscriptionStatusPayload {
  status: 'Active' | 'Inactive';
  display_status?: 'Active' | 'Trialing' | 'Past Due' | 'Canceled';
  message?: string;
  subscription_id?: string;
  subscription_status?: string;
  subscription_plan?: string;
  plan_key?: string;
  price?: number;
  billing_interval?: 'monthly' | 'yearly';
  renewal_date?: number;
  cancel_at?: number;
  cancel_at_period_end?: boolean;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  trial_end_date?: string | null;
  subscription_cancel_at?: string | null;
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
