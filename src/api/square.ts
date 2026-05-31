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

export interface ImportJobStatus {
  source: string;
  status: 'pending' | 'running' | 'complete' | 'completed' | 'failed' | null;
  pct_complete: number;
  completed_entities: number;
  total_entities: number;
  error_message: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface EntityMapping {
  key: string;
  label: string;
  destination: string;
  enabled: boolean;
  count: number;
}

export interface EntityMappingsResponse {
  source: string;
  entities: EntityMapping[];
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
  },

  getImportStatus: async (companyId: string): Promise<ImportJobStatus> => {
    const response = await axiosServices.get(`/company/${companyId}/import-status/`, {
      params: { source: 'square' }
    });
    return response.data;
  },

  triggerImport: async (companyId: string): Promise<ImportJobStatus> => {
    const response = await axiosServices.post(`/company/${companyId}/import-status/trigger/`, {
      source: 'square'
    });
    return response.data;
  },

  getIntegrationSettings: async (companyId: string) => {
    const response = await axiosServices.get(`/company/${companyId}/integration-settings/`, {
      params: { source: 'square' }
    });
    return response.data as { source: string; webhooks_enabled: boolean };
  },

  updateIntegrationSettings: async (companyId: string, webhooksEnabled: boolean) => {
    const response = await axiosServices.patch(`/company/${companyId}/integration-settings/`, {
      source: 'square',
      webhooks_enabled: webhooksEnabled
    });
    return response.data as { source: string; webhooks_enabled: boolean };
  },

  getSyncHistory: async (companyId: string) => {
    const response = await axiosServices.get(`${SQUARE_BASE_URL}/sync-history/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  getEntityMappings: async (companyId: string) => {
    const response = await axiosServices.get(`/company/${companyId}/entity-mappings/`, {
      params: { source: 'square' }
    });
    return response.data;
  },

  updateEntityMappings: async (companyId: string, mappings: Record<string, boolean>) => {
    const response = await axiosServices.patch(`/company/${companyId}/entity-mappings/`, {
      source: 'square',
      entity_mappings: mappings
    });
    return response.data;
  }
};

export default squareApi;
