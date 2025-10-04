import axiosServices from 'utils/axios';

const SUBSCRIPTION_BASE_URL = 'subscription';

export interface PlanData {
  billing_cycle: string;
  plan_name: string;
  price_id: string;
  trial_period_days: number;
}
const subscriptionAPI = {
  createCheckoutSession: async (planData: PlanData) => {
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/create-checkout-session/`, planData);
    return response.data;
  },
  checkSubscription: async () => {
    const response = await axiosServices.get(`${SUBSCRIPTION_BASE_URL}/status/`);
    return response.data;
  }
};

export default {
  ...subscriptionAPI
};
