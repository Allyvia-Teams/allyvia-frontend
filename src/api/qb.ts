import axiosServices from 'utils/axios';

const QB_BASE_URL = '/quickbooks';

export interface QBAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface QBConnectionStatus {
  is_connected: boolean;
  company_id: string;
  realm_id: string | null;
  access_token_valid: boolean;
  refresh_token_valid: boolean;
  connected_at: string | null;
  last_auth?: string | null; // Deprecated - use connected_at
  token_expires_in?: number;
  has_account_mappings?: boolean;
}

export interface QBCallbackRequest {
  code: string;
  realm_id: string;
  state: string;
  company_id: string;
}

const qbApi = {
  getAuthUrl: async (companyId: string): Promise<QBAuthUrlResponse> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/redirect/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  processCallback: async (code: string, realmId: string, state: string, companyId: string): Promise<any> => {
    const response = await axiosServices.post(`${QB_BASE_URL}/callback/`, {
      code,
      realm_id: realmId,
      state,
      company_id: companyId
    });
    return response.data;
  },

  getConnectionStatus: async (companyId: string): Promise<QBConnectionStatus> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/status/${companyId}/`);
    return response.data;
  },

  refreshToken: async (companyId: string): Promise<any> => {
    const response = await axiosServices.post(`${QB_BASE_URL}/refresh/`, {
      company_id: companyId
    });
    return response.data;
  },

  revokeConnection: async (companyId: string): Promise<any> => {
    const response = await axiosServices.post(`${QB_BASE_URL}/revoke/`, {
      company_id: companyId
    });
    return response.data;
  },

  fetchChartOfAccounts: async (companyId: string): Promise<any> => {
    const response = await axiosServices.get(`/company/${companyId}/qb/accounts/`);
    return response.data;
  },

  getAccountMappings: async (companyId: string): Promise<any> => {
    const response = await axiosServices.get(`/company/${companyId}/qb/account-mappings/`);
    return response.data;
  },

  updateAccountMappings: async (companyId: string, mappings: Record<string, string>): Promise<any> => {
    const response = await axiosServices.put(`/company/${companyId}/qb/account-mappings/`, {
      mappings
    });
    return response.data;
  }
};

export default qbApi;
