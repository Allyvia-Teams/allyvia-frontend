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
  phone?: string;
  title?: string;
  address?: string;
  status: 'active' | 'inactive';
  company: string; // Company UUID
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
};

export type Shift = {
  id: string;
  company: string; // Company UUID
  employee: string; // Employee UUID
  employee_name?: string; // Computed field for display
  title?: string;
  starts_at: string; // ISO datetime string
  ends_at: string; // ISO datetime string
  metadata?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
};

export type CreateShiftRequest = {
  employee: string; // Employee UUID
  company: string; // Company UUID
  starts_at: string; // ISO datetime string
  ends_at: string; // ISO datetime string
  title?: string;
  metadata?: any;
  notes?: string;
};

export type UpdateShiftRequest = {
  title?: string;
  starts_at?: string; // ISO datetime string
  ends_at?: string; // ISO datetime string
  metadata?: any;
  notes?: string;
};

export type ShiftFilters = {
  start?: string; // ISO date string
  end?: string; // ISO date string
  employee_id?: string; // Employee UUID
};

export type MyShiftsFilters = {
  start?: string; // ISO date string
  end?: string; // ISO date string
};
