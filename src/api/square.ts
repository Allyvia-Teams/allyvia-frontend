import axiosServices from 'utils/axios';
import { fetcher } from 'utils/axios';

// Square API client functions mirroring QuickBooks patterns

export interface SquareAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface SquareCallbackRequest {
  code: string;
  state: string;
  company_id: string;
}

export interface SquareConnectionStatus {
  is_connected: boolean;
  company_id: string;
  merchant_id: string;
  access_token_valid: boolean;
  refresh_token_valid: boolean;
  connected_at: string | null;
  token_expires_in: number | null;
  has_account_mappings: boolean;
}

export interface SquareCatalogItem {
  id: string;
  name: string;
  type: string; // 'CATEGORY' or 'ITEM'
  description: string;
  active: boolean;
}

export interface SquareLocation {
  id: string;
  name: string;
  address: any;
  timezone: string;
  capabilities: string[];
}

export interface AccountMapping {
  id: string;
  external_account_id: string;
  external_account_name: string;
  external_type: string;
  internal_category: string;
}

export interface SquareWebhookEvent {
  id: string;
  company_name: string;
  event_type: string;
  operation: string;
  status: string;
  retry_count: number;
  created_at: string;
}

export interface SquareWebhookEventList {
  total: number;
  limit: number;
  offset: number;
  results: SquareWebhookEvent[];
}

// Square API functions
export const getSquareAuthUrl = async (companyId: string): Promise<SquareAuthUrlResponse> => {
  return fetcher(`/integrations/square/auth-url/?company_id=${companyId}`);
};

export const processSquareCallback = async (data: SquareCallbackRequest): Promise<{ success: boolean; message: string }> => {
  return axiosServices.post('/integrations/square/callback/', data);
};

export const getSquareConnectionStatus = async (companyId: string): Promise<SquareConnectionStatus> => {
  return fetcher(`/integrations/square/status/${companyId}/`);
};

export const disconnectSquare = async (companyId: string): Promise<{ success: boolean; message: string }> => {
  return axiosServices.post('/integrations/square/disconnect/', { company_id: companyId });
};

export interface SquareAllData {
  catalog: SquareCatalogItem[];
  invoices: any[];
  payments: any[];
  orders: any[];
  customers: any[];
}

export const fetchSquareAllData = async (companyId: string): Promise<SquareAllData> => {
  const response = await fetcher(`/integrations/square/all-data/?company_id=${companyId}`);
  return response;
};

export const fetchSquareCatalog = async (companyId: string): Promise<SquareCatalogItem[]> => {
  const response = await fetcher(`/integrations/square/catalog/?company_id=${companyId}`);
  return response;
};

export const fetchSquareLocations = async (companyId: string): Promise<SquareLocation[]> => {
  const response = await fetcher(`/integrations/square/locations/?company_id=${companyId}`);
  return response;
};

export const getSquareMappings = async (companyId: string): Promise<AccountMapping[]> => {
  const response = await fetcher(`/integrations/square/mappings/?company_id=${companyId}`);
  return response;
};

export const saveSquareMappings = async (companyId: string, mappings: AccountMapping[]): Promise<{ success: boolean; message: string }> => {
  return axiosServices.post('/integrations/square/mappings/', {
    company_id: companyId,
    mappings: mappings
  });
};

export const getSquareWebhookEvents = async (
  companyId: string,
  status?: string,
  limit: number = 20,
  offset: number = 0
): Promise<SquareWebhookEventList> => {
  const params = new URLSearchParams({
    company_id: companyId,
    limit: limit.toString(),
    offset: offset.toString()
  });

  if (status) {
    params.append('status', status);
  }

  return fetcher(`/integrations/square/webhooks/events/?${params.toString()}`);
};

// Enhanced API functions for comprehensive Square data
export const fetchSquarePayments = async (companyId: string, limit: number = 100, cursor?: string): Promise<any> => {
  const params = new URLSearchParams({
    company_id: companyId,
    limit: limit.toString()
  });

  if (cursor) {
    params.append('cursor', cursor);
  }

  return fetcher(`/integrations/square/payments/?${params.toString()}`);
};

export const fetchSquareCustomers = async (companyId: string, limit: number = 100, cursor?: string): Promise<any> => {
  const params = new URLSearchParams({
    company_id: companyId,
    limit: limit.toString()
  });

  if (cursor) {
    params.append('cursor', cursor);
  }

  return fetcher(`/integrations/square/customers/?${params.toString()}`);
};

export const fetchSquareOrders = async (companyId: string, limit: number = 100, cursor?: string): Promise<any> => {
  const params = new URLSearchParams({
    company_id: companyId,
    limit: limit.toString()
  });

  if (cursor) {
    params.append('cursor', cursor);
  }

  return fetcher(`/integrations/square/orders/?${params.toString()}`);
};

export const fetchSquareStaff = async (companyId: string): Promise<any> => {
  return fetcher(`/integrations/square/staff/?company_id=${companyId}`);
};

export const fetchSquareReports = async (companyId: string, reportType: string = 'daily'): Promise<any> => {
  return fetcher(`/integrations/square/reports/?company_id=${companyId}&report_type=${reportType}`);
};
