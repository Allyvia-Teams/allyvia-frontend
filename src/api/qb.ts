import axiosServices from 'utils/axios';
import { QBItemSuggestionsResponse, QBItemsListResponse, QBItemsListParams, QBItemSuggestionsParams, QBItemDetail } from 'types/qb';

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

  fetchItems: async (companyId: string): Promise<any> => {
    const response = await axiosServices.post(`inventory/sync/qb/`, {
      company_id: companyId
    });
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
  },

  getWebhookEvents: async (companyId: string, params?: { status?: string; limit?: number; offset?: number }): Promise<any> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/webhooks/events/`, {
      params: { company_id: companyId, ...params }
    });
    return response.data;
  },

  getWebhookEventDetail: async (eventId: string): Promise<any> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/webhooks/events/${eventId}/`);
    return response.data;
  },

  retryWebhookEvent: async (eventId: string): Promise<any> => {
    const response = await axiosServices.post(`${QB_BASE_URL}/webhooks/retry/${eventId}/`);
    return response.data;
  },

  getSyncHistory: async (companyId: string, params?: { entity_type?: string; limit?: number }): Promise<any> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/sync/history/`, {
      params: { company_id: companyId, ...params }
    });
    return response.data;
  },

  triggerItemSync: async (companyId: string): Promise<any> => {
    const response = await axiosServices.post(`${QB_BASE_URL}/items/sync/`, {
      company_id: companyId
    });
    return response.data;
  },

  getItemsList: async (companyId: string, params?: { page?: number; page_size?: number }): Promise<any> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/items/list/`, {
      params: { company_id: companyId, ...params }
    });
    return response.data;
  },

  getItemSyncStatus: async (companyId: string): Promise<any> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/items/status/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  fetchItemDetail: async (companyId: string, itemId: string): Promise<QBItemDetail> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/items/${itemId}/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  getItemSuggestions: async (params: QBItemSuggestionsParams): Promise<QBItemSuggestionsResponse> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/items/suggestions/`, {
      params
    });
    return response.data;
  },

  getItemsPaginated: async (params: QBItemsListParams): Promise<QBItemsListResponse> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/items/paginated/`, {
      params
    });
    return response.data;
  },

  getItemsStats: async (
    companyId: string
  ): Promise<{
    total_items: number;
    services_count: number;
    inventory_count: number;
    non_inventory_count: number;
  }> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/items/stats/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  getOverviewData: async (companyId: string): Promise<any> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/overview/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  getAllSyncStatus: async (companyId: string): Promise<any> => {
    const response = await axiosServices.get(`${QB_BASE_URL}/sync-status/all/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  triggerAllEntitiesSync: async (companyId: string): Promise<any> => {
    const response = await axiosServices.post(`${QB_BASE_URL}/sync-all/`, {
      company_id: companyId
    });
    return response.data;
  }
};

export default qbApi;
