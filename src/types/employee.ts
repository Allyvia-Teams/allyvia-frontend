// Employee Types for Employee Management System

export type UserAccountStatus = 'no_account' | 'inactive' | 'email_unverified' | 'email_sent' | 'email_resent' | 'password_changed';

export interface EmployeeListItem {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  title?: string;
  rate?: number;
  status: 'active' | 'inactive';
  is_active: boolean;
  has_kiosk_pin?: boolean;
  has_user_account?: boolean;
  user_account_status?: UserAccountStatus;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string; // Computed field
  email: string;
  phone?: string; // Optional
  title?: string; // Optional
  address?: string; // Optional
  status: 'active' | 'inactive'; // Optional, defaults to 'active'
  is_active: boolean;
  has_kiosk_pin?: boolean;
  has_user_account?: boolean;
  user_account_status?: UserAccountStatus;
  created_at?: string; // Excluded from table display (optional in list)
  updated_at?: string; // Excluded from table display (optional in list)
}

export interface ResendEmailResponse {
  message: string;
  action_taken: 'created_user' | 'resent_email' | 'error';
  status: UserAccountStatus;
}

export interface CreateEmployeeData {
  first_name: string; // REQUIRED
  last_name: string; // REQUIRED
  email: string; // REQUIRED
  phone?: string; // Optional
  title?: string; // Optional
  address?: string; // Optional
  status?: 'active' | 'inactive'; // Optional, defaults to 'active'
  create_user_account?: boolean; // Optional, defaults to false
}

export interface UpdateEmployeeData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

// CSV Import Types
export interface CSVRow {
  first_name: string; // REQUIRED
  last_name: string; // REQUIRED
  email: string; // REQUIRED
  phone?: string; // Optional
  title?: string; // Optional
  address?: string; // Optional
  status?: 'active' | 'inactive'; // Optional, defaults to 'active'
}

export interface ImportResult {
  row: number;
  data: CSVRow;
  success: boolean;
  employee?: Employee;
  error?: string;
}

export interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
}

// Employee Statistics for AllyviaStats
export interface EmployeeStats {
  totalEmployees: number;
  totalTitles: number;
  activeEmployees: number;
  inactiveEmployees: number;
}

// Company Types (use existing from auth slice)
export interface Role {
  id: string;
  company_id: string;
  company_name: string;
  role_type: 'admin' | 'manager' | 'member' | 'viewer';
  role_display: string;
  permissions?: string[];
}
