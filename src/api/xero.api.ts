import axiosServices from 'utils/axios';

const XERO_BASE_URL = '/xero';

export interface XeroAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface XeroTenantOption {
  tenant_id: string;
  tenant_name: string;
  tenant_type: string;
}

export interface XeroConnectionStatus {
  is_connected: boolean;
  company_id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  access_token_valid: boolean;
  refresh_token_valid: boolean;
  connected_at: string | null;
  environment?: string | null;
}

// Xero's callback either finalizes immediately (one authorized organisation)
// or hands back a tenant list to choose from (design §4.1) -- these are two
// distinct shapes, not optional fields on one type, so a caller cannot
// forget to check which one it got.
export interface XeroCallbackAutoSelectedResult {
  success: true;
  message: string;
  auto_selected: true;
  tenant: XeroTenantOption;
}

export interface XeroCallbackNeedsSelectionResult {
  success: true;
  message: string;
  auto_selected: false;
  selection_token: string;
  tenants: XeroTenantOption[];
}

export interface XeroCallbackFailureResult {
  success: false;
  message: string;
}

export type XeroCallbackResult = XeroCallbackAutoSelectedResult | XeroCallbackNeedsSelectionResult | XeroCallbackFailureResult;

const xeroApi = {
  getAuthUrl: async (companyId: string): Promise<XeroAuthUrlResponse> => {
    const response = await axiosServices.get(`${XERO_BASE_URL}/redirect/`, {
      params: { company_id: companyId }
    });
    return response.data;
  },

  processCallback: async (code: string, state: string, companyId: string): Promise<XeroCallbackResult> => {
    const response = await axiosServices.post(`${XERO_BASE_URL}/callback/`, {
      code,
      state,
      company_id: companyId
    });
    return response.data;
  },

  confirmTenant: async (companyId: string, selectionToken: string, tenantId: string): Promise<XeroCallbackResult> => {
    const response = await axiosServices.post(`${XERO_BASE_URL}/callback/`, {
      company_id: companyId,
      selection_token: selectionToken,
      tenant_id: tenantId
    });
    return response.data;
  },

  getConnectionStatus: async (companyId: string): Promise<XeroConnectionStatus> => {
    const response = await axiosServices.get(`${XERO_BASE_URL}/status/${companyId}/`);
    return response.data;
  },

  refreshToken: async (companyId: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosServices.post(`${XERO_BASE_URL}/refresh/`, {
      company_id: companyId
    });
    return response.data;
  },

  revokeConnection: async (companyId: string): Promise<{ success: boolean; message: string }> => {
    const response = await axiosServices.post(`${XERO_BASE_URL}/revoke/`, {
      company_id: companyId
    });
    return response.data;
  }
};

export default xeroApi;
