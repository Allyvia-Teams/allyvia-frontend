export type Company = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_connected_to_quickbooks: boolean;
  is_qb_access_token_valid: boolean;
  qb_last_auth: string;
  qb_realm_id: string;
};

export type QBAuthCallbackBody = { code: string; realm_id: string; state: string; company_id: string };
