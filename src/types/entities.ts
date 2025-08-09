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
