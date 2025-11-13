import axiosServices from 'utils/axios';
import type {
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  SubscriptionStatusResponse,
  CancelSubscriptionResponse,
  UpdateSubscriptionRequest,
  UpdateSubscriptionResponse,
  TestSubscribeResponse
} from 'types/subscription';

// ==============================|| SUBSCRIPTION API ||============================== //

export const subscriptionAPI = {
  /**
   * Create Stripe Checkout Session
   * POST /api/v1/subscription/create-checkout-session/
   */
  createCheckoutSession: async (data: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> => {
    const response = await axiosServices.post('/subscription/create-checkout-session/', data);
    return response.data;
  },

  /**
   * Get Subscription Status
   * GET /api/v1/subscription/status/
   */
  getSubscriptionStatus: async (): Promise<SubscriptionStatusResponse> => {
    const response = await axiosServices.get('/subscription/status/');
    return response.data;
  },

  /**
   * Cancel Subscription
   * POST /api/v1/subscription/cancel/
   */
  cancelSubscription: async (): Promise<CancelSubscriptionResponse> => {
    const response = await axiosServices.post('/subscription/cancel/');
    return response.data;
  },

  /**
   * Update Subscription
   * POST /api/v1/subscription/update/
   */
  updateSubscription: async (data: UpdateSubscriptionRequest): Promise<UpdateSubscriptionResponse> => {
    const response = await axiosServices.post('/subscription/update/', data);
    return response.data;
  },

  /**
   * Test Subscribe (Development Only)
   * GET /api/v1/subscription/test/
   */
  testSubscribe: async (): Promise<TestSubscribeResponse> => {
    const response = await axiosServices.get('/subscription/test/');
    return response.data;
  }
};
