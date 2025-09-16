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

// Employee Shift Types
export type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  is_active: boolean;
};

export type Shift = {
  id: string;
  employee: string; // Employee UUID
  employee_name: string;
  starts_at: string; // ISO datetime string
  ends_at: string; // ISO datetime string
  date: string; // ISO date string (YYYY-MM-DD)
  title?: string;
  metadata?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  company_id: string;
};

export type CreateShiftRequest = {
  employee: string; // Employee UUID
  starts_at: string; // ISO datetime string
  ends_at: string; // ISO datetime string
  title?: string;
  metadata?: any;
  notes?: string;
};

export type UpdateShiftRequest = {
  employee?: string; // Employee UUID
  starts_at?: string;
  ends_at?: string;
  title?: string;
  metadata?: any;
  notes?: string;
};

export type ShiftFilters = {
  start?: string; // ISO date string
  end?: string; // ISO date string
  employee_id?: string;
};

export type MyShiftsFilters = {
  start?: string; // ISO date string
  end?: string; // ISO date string
};
