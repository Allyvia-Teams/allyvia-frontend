import axiosServices from 'utils/axios';

const SQUARE_BASE_URL = '/square';

export interface SquareAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface SquareConnectionStatus {
  connected: boolean;
  merchant_id: string | null;
  location_id: string | null;
  token_valid: boolean;
  connected_at: string | null;
  expires_at: string | null;
  environment: 'sandbox' | 'production' | null;
}

export interface SquareCallbackRequest {
  code: string;
  state: string;
  company_id: string;
}

const squareApi = {
  getAuthUrl: async (companyId: string): Promise<SquareAuthUrlResponse> => {
    const response = await axiosServices.get(`${SQUARE_BASE_URL}/redirect/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  processCallback: async (code: string, state: string, companyId: string): Promise<any> => {
    const response = await axiosServices.post(`${SQUARE_BASE_URL}/callback/`, {
      code,
      state,
      company_id: companyId
    });
    return response.data;
  },

  getConnectionStatus: async (companyId: string): Promise<SquareConnectionStatus> => {
    const response = await axiosServices.get(`${SQUARE_BASE_URL}/status/${companyId}/`);
    return response.data;
  },

  revokeConnection: async (companyId: string): Promise<any> => {
    const response = await axiosServices.post(`${SQUARE_BASE_URL}/disconnect/`, {
      company_id: companyId
    });
    return response.data;
  }
};

export default squareApi;
