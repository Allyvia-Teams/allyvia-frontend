import axiosServices from 'utils/axios';

const SUBSCRIPTION_BASE_URL = 'subscription';

const subscriptionAPI = {
  createCheckoutSession: async () => {
    const response = await axiosServices.post(`${SUBSCRIPTION_BASE_URL}/create-checkout-session`);
    return response.data;
  }
};

export default subscriptionAPI;
