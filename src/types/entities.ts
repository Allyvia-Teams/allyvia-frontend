export type Company = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_connected_to_quickbooks: boolean;
  is_qb_access_token_valid: boolean;
  is_qb_refresh_token_valid: boolean;
  qb_last_auth: string | null;
  qb_realm_id: string | null;
  // Square integration fields
  is_connected_to_square: boolean;
  square_connected_at: string | null;
  square_last_auth: string | null;
};

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

export enum RoleTypes {
  'ADMIN' = 'admin',
  'MEMBER' = 'member',
  'MANAGER' = 'manager',
  'VIEWER' = 'viewer'
}

// Returns an array of all the roles available to the current user
export type RoleBase = {
  id: string;
  company_id: string;
  company_name: string;
  role_type: `${RoleTypes}`;
  role_display: 'string';
};

// The response object from /role/{id}
export type RoleById = RoleBase & {
  created_at: string;
  updated_at: string;
  user: string; // user_id
  company: string; // company_id
  user_email: string; // user_email
};

export type CompanyRole = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role_type: `${RoleTypes}`;
  role_display: string;
  created_at: string;
};

export type QBAuthCallbackBody = { code: string; realm_id: string; state: string; company_id: string };

// Square Integration Types
export interface SquareConnectionStatus {
  is_connected: boolean;
  merchant_id: string;
  access_token_valid: boolean;
  refresh_token_valid: boolean;
  connected_at: string | null;
  has_account_mappings: boolean;
}

export interface SquareCatalogItem {
  id: string;
  name: string;
  type: string;
  description: string;
  active: boolean;
  sku?: string;
  unit_price?: number;
  quantity_on_hand?: number;
  category_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SquareLocation {
  id: string;
  name: string;
  address: any;
  timezone: string;
  capabilities: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SquareAccountMapping {
  id: string;
  square_account_id: string;
  square_account_name: string;
  internal_category: string;
  created_at: string;
  updated_at: string;
}

export interface SquareWebhookEvent {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  updated_at: string;
}

export interface SquareWebhookEventList {
  results: SquareWebhookEvent[];
  total: number;
  limit: number;
  offset: number;
}
