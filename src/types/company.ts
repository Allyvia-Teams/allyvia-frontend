export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_connected_to_quickbooks: boolean;
  is_qb_access_token_valid?: boolean;
  is_qb_refresh_token_valid?: boolean;
  qb_realm_id: string | null;
  qb_last_auth?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
